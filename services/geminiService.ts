import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

// Helper to format sheet data for context
const formatSheetContext = (data: SheetData): string => {
  const MAX_ROWS = 60; // Increased context size
  // Map complex Cell objects to simple values for the AI context to save tokens
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
  imageBase64?: string
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
    5. **Structure Engineering**: You can ADD_COL, DELETE_COL, ADD_ROW, SET_DATA.

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
          "data": [[...]] // For SET_DATA or ADD_ROW (bulk)
        }
      ]
    }

    Current Sheet Context:
    ${sheetContext}
  `;

  const maxRetries = 3;

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

      // Use gemini-2.5-flash for speed and efficiency
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash', 
        contents: [
          { role: 'user', parts: parts }
        ],
        config: {
          systemInstruction: systemInstruction,
          tools: [{ googleSearch: {} }], 
          temperature: 0.2, // Lower temperature for more deterministic JSON
          // Disable safety settings to prevent "No response" on commercial content
          safetySettings: [
            { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
            { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
          ]
        }
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
      
      // Check for 429 (Too Many Requests) or 503 (Service Unavailable)
      if (error.status === 429 || error.status === 503 || error.message?.includes('429')) {
        const delay = 1000 * Math.pow(2, attempt);
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // If it's a 400 or 403 (Invalid Key), break immediately
      if (error.status === 400 || error.status === 403) {
        return {
          message: `خطأ في مفتاح API: ${error.message}. يرجى التحقق من صحة المفتاح في ملف .env`,
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