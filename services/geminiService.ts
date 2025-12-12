import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

// GLOBAL STATE for Key Rotation
// We parse the comma-separated keys from process.env.API_KEY
const RAW_API_KEY = process.env.API_KEY || "";
const API_KEYS = RAW_API_KEY.split(',').filter(k => k && k.trim().length > 0);
let currentKeyIndex = 0;

const getNextKey = () => {
  if (API_KEYS.length <= 1) return API_KEYS[0];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  console.log(`Rotating API Key to index: ${currentKeyIndex}`);
  return API_KEYS[currentKeyIndex];
};

const getCurrentKey = () => {
  if (API_KEYS.length === 0) return "";
  return API_KEYS[currentKeyIndex];
};

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
  
  if (API_KEYS.length === 0) {
    return {
      message: "⚠️ **خطأ: مفتاح API مفقود!**\n\nيجب إعداد مفتاح API الخاص بـ Google Gemini ليعمل التطبيق.\n\n**للمستخدمين على Vercel:**\n1. اذهب إلى إعدادات المشروع (Settings > Environment Variables).\n2. أضف متغيرات باسم `GEMINI_API_KEY_1`, `GEMINI_API_KEY_2`... إلخ.\n3. ضع قيم المفاتيح.\n4. قم بإعادة نشر المشروع (Redeploy).",
      operations: []
    };
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

  // Key Rotation Loop
  // We try up to (Number of Keys * 2) times to handle transient errors and rotation
  const maxAttempts = Math.max(2, API_KEYS.length * 2);
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const currentApiKey = getCurrentKey();
      const ai = new GoogleGenAI({ apiKey: currentApiKey });

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

      if (isDeepThink) {
         config.thinkingConfig = { thinkingBudget: 4096 }; 
      }

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

      // Success! Process response
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
      lastError = error;
      console.error(`Gemini Attempt ${attempt + 1} Failed (Key Index: ${currentKeyIndex})`, error);
      
      let errorMsg = error.message || '';
      // Parse detailed error if available
      try {
         if (errorMsg.includes('{')) {
             const jsonPart = errorMsg.substring(errorMsg.indexOf('{'));
             const parsedObj = JSON.parse(jsonPart);
             if (parsedObj.error?.message) errorMsg = parsedObj.error.message;
         }
      } catch(e) { /* ignore */ }

      const isLeaked = errorMsg.includes('leaked') || errorMsg.includes('API key was reported as leaked') || error.status === 403;
      const isQuota = error.status === 429 || errorMsg.includes('429');
      
      // If Key is Leaked or Forbidden, ROTATE immediately and retry
      if (isLeaked) {
         console.warn("Key appears leaked or invalid. Rotating...");
         getNextKey();
         continue; 
      }

      // If Quota limit, ROTATE and retry (load balancing)
      if (isQuota) {
         console.warn("Quota exceeded. Rotating...");
         getNextKey();
         // Small delay before retry
         await new Promise(resolve => setTimeout(resolve, 500));
         continue;
      }

      // If other error, wait and retry (standard backoff) but stick to same key unless it's a persistent issue
      if (attempt < maxAttempts - 1) {
         await new Promise(resolve => setTimeout(resolve, 1000));
         continue;
      }
    }
  }

  // If we exhaust all attempts
  return {
    message: `⛔ **فشل الاتصال بجميع المفاتيح**\n\nلقد حاولنا استخدام ${API_KEYS.length} مفاتيح متوفرة ولكن جميعها فشلت. \nآخر خطأ: ${lastError?.message || 'Unknown Error'}`,
    operations: []
  };
};