import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

// Helper to format sheet data for context
const formatSheetContext = (data: SheetData): string => {
  const MAX_ROWS = 60; // Limit context rows to save tokens/latency
  // Map complex Cell objects to simple values for the AI context
  const simpleData = data.slice(0, MAX_ROWS).map(row => 
    row?.map(cell => cell?.value)
  );
  
  const rowCount = data.length;
  const colCount = data[0]?.length || 0;
  
  // Try to identify headers specifically
  const headers = simpleData[0] || [];
  
  return JSON.stringify({
    summary: `Total Rows: ${rowCount}, Total Columns: ${colCount}`,
    headers: headers,
    preview: simpleData
  });
};

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  // Remove markdown code blocks if present (```json ... ```)
  let clean = text.replace(/```json\n?|```/g, '').trim();
  // Find the first '{' and last '}' to handle any preamble/postscript text
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
};

export const sendMessageToGemini = async (
  prompt: string,
  currentSheetData: SheetData,
  isPolicyMode: boolean = false,
  imageBase64?: string,
  isDeepThink: boolean = false
): Promise<AIResponse> => {
  
  // Initialize AI client lazily inside the function to prevent top-level crashes
  // The API key must be configured in your environment variables (e.g., .env) as API_KEY
  // Vite replaces process.env.API_KEY with the actual string value during build
  const apiKey = process.env.API_KEY;

  if (!apiKey) {
    return {
      message: "⚠️ خطأ: مفتاح API غير موجود. يرجى التأكد من إضافة 'API_KEY' في إعدادات البيئة (Environment Variables) في Vercel.",
      operations: []
    };
  }

  // Safely initialize the client
  let ai;
  try {
      ai = new GoogleGenAI({ apiKey });
  } catch (e) {
      console.error("Failed to initialize GoogleGenAI", e);
      return {
          message: "خطأ في تهيئة خدمة الذكاء الاصطناعي. يرجى مراجعة وحدة التحكم (Console).",
          operations: []
      }
  }

  const sheetContext = formatSheetContext(currentSheetData);

  const systemInstruction = `
    You are "ExcelAI Pro", a specialized AI for managing Product Feeds (Shopify, Google Merchant).
    
    CRITICAL INSTRUCTION: You MUST return valid JSON only. Do not add markdown formatting.
    
    Your Capabilities:
    1. **Data Cleaning & Formatting**: Fix capitalization, remove whitespace, standardizing formats.
    2. **Shopify & Google Compliance**: Ensure data meets strict policy requirements (GTIN, Price, Descriptions).
    3. **Auto-Correction**: Fix spelling, grammar, and encoding errors in Arabic and English.
    4. **Translation**: Translate Title/Description while KEEPING technical IDs (SKU, Handle) unchanged.
    5. **Structure Engineering**: You can ADD_COL (with optional 'data' array to fill it), DELETE_COL, ADD_ROW, SET_DATA.

    Policy Mode: ${isPolicyMode ? "STRICT (Remove promotional text, check caps)" : "STANDARD"}

    Response Schema (JSON):
    {
      "message": "Brief summary of changes (Arabic/English based on user language).",
      "operations": [
        {
          "type": "SET_CELL" | "ADD_ROW" | "DELETE_ROW" | "ADD_COL" | "DELETE_COL" | "SET_DATA",
          "row": number, 
          "col": number, 
          "value": any,
          "data": [[...]] // For SET_DATA, ADD_ROW, or ADD_COL (bulk column values in array of arrays format)
        }
      ]
    }

    Current Sheet Context:
    ${sheetContext}
  `;

  const maxRetries = 2;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const parts: any[] = [];
      
      // Add image if present
      if (imageBase64) {
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        parts.push({
          inlineData: {
            mimeType: 'image/jpeg', 
            data: base64Data
          }
        });
        parts.push({ text: "Analyze this image and extract data into the spreadsheet structure." });
      }

      parts.push({ text: `User Request: ${prompt}` });

      // Build Config
      const config: any = {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }], 
        temperature: 0.2, // Lower temperature for more deterministic JSON
        safetySettings: [
          { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        ]
      };

      // Add thinking config if deep thinking is enabled
      // Note: thinkingConfig is only supported on specific models like gemini-2.5-flash-thinking (if available) or as a parameter on 2.5 series
      if (isDeepThink) {
         // Using thinking budget for complex reasoning
         config.thinkingConfig = { thinkingBudget: 4096 }; 
      }

      // Use gemini-2.5-flash for speed and efficiency
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [
          { role: 'user', parts: parts }
        ],
        config: config
      });

      const responseText = response.text;
      
      if (!responseText) {
        throw new Error("Received empty response from AI.");
      }

      // Extract Grounding Metadata (Sources)
      const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
      let searchSources = "";
      if (groundingChunks) {
          const uniqueUrls = new Set(
            groundingChunks
              .map(c => c.web?.uri)
              .filter(u => u)
          );
          if (uniqueUrls.size > 0) {
             searchSources = `\n\n🔍 المصادر:\n` + Array.from(uniqueUrls).map(u => `- ${u}`).join("\n");
          }
      }

      let parsedResponse: AIResponse;
      try {
        const cleanedJson = cleanJsonResponse(responseText);
        parsedResponse = JSON.parse(cleanedJson) as AIResponse;
      } catch (e) {
        console.warn("JSON Parse Retry", e);
        // Fallback if AI didn't return JSON
        parsedResponse = {
          message: responseText,
          operations: []
        };
      }

      if (searchSources) {
        parsedResponse.message += searchSources;
      }

      return parsedResponse;

    } catch (error: any) {
      console.error(`Gemini Attempt ${attempt + 1} Failed:`, error);
      
      let errorMsg = error.message || '';
      const stringifiedError = JSON.stringify(error);

      // Attempt to parse JSON error message if embedded in the response body
      if (errorMsg.includes('{')) {
          try {
             // Try to extract JSON object from string
             const jsonPart = errorMsg.substring(errorMsg.indexOf('{'));
             const parsedObj = JSON.parse(jsonPart);
             if (parsedObj.error?.message) errorMsg = parsedObj.error.message;
          } catch(e) {
            // ignore parsing error
          }
      }

      // Check for Leaked Key specific error
      if (
        errorMsg.includes('leaked') || 
        errorMsg.includes('API key was reported as leaked') || 
        stringifiedError.includes('leaked') ||
        error.status === 403 // Permission denied usually means invalid or leaked key in this context
      ) {
          return {
              message: "⛔ **تنبيه أمني عاجل: مفتاح API مسرب أو غير صالح**\n\nلقد اكتشفت Google أن مفتاح API المستخدم قد تم تسريبه أو حظره.\n\n**كيفية الحل:**\n1. اذهب إلى [Google AI Studio](https://aistudio.google.com/).\n2. قم بإنشاء مفتاح API جديد.\n3. استبدل المفتاح القديم في ملف `.env` (أو إعدادات Vercel).\n4. أعد تشغيل التطبيق.",
              operations: []
          };
      }
      
      // Check for 429 (Too Many Requests) or 503 (Service Unavailable)
      if (error.status === 429 || error.status === 503 || errorMsg.includes('429')) {
        const delay = 1000 * Math.pow(2, attempt);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a 400 (Bad Request)
      if (error.status === 400 || errorMsg.includes('API key not valid')) {
        return {
          message: `خطأ في الطلب أو مفتاح API: ${errorMsg}. يرجى التحقق من السجلات.`,
          operations: []
        };
      }
    }
  }

  return {
    message: "عذراً، لم نتمكن من الاتصال بالذكاء الاصطناعي بعد عدة محاولات. يرجى المحاولة لاحقاً.",
    operations: []
  };
};