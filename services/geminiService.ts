
import { GoogleGenAI, Modality } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

const RAW_API_KEY = process.env.API_KEY || "";
const API_KEYS = RAW_API_KEY.split(',').filter(k => k && k.trim().length > 0);
let currentKeyIndex = 0;

const getNextKey = () => {
  if (API_KEYS.length <= 1) return API_KEYS[0];
  currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
  return API_KEYS[currentKeyIndex];
};

const getCurrentKey = () => API_KEYS[currentKeyIndex] || "";

// Enhanced context formatting for large datasets
const formatSheetContext = (data: SheetData): string => {
  const rowCount = data.length;
  const colCount = data[0]?.length || 0;
  
  // If data is huge, we send a sample (first 40, last 10) to maintain context without hitting limits
  const sampleRows = rowCount > 60 
    ? [...data.slice(0, 40), ...data.slice(-20)]
    : data;

  const preview = sampleRows.map(row => row?.map(cell => cell?.value));
  
  return JSON.stringify({
    totalRows: rowCount,
    totalCols: colCount,
    headers: data[0]?.map(c => c?.value) || [],
    dataPreview: preview,
    note: "This is a representative sample of a larger dataset. Apply logic to all rows."
  });
};

const cleanJsonResponse = (text: string): string => {
  if (!text) return "{}";
  let clean = text.replace(/```json\n?|```/g, '').trim();
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
  isDeepThink: boolean = false,
  isFast: boolean = false
): Promise<AIResponse> => {
  
  if (API_KEYS.length === 0) {
    return { message: "⚠️ خطأ: مفتاح API مفقود!", operations: [] };
  }

  const sheetContext = formatSheetContext(currentSheetData);
  
  // Model Selection Logic based on user needs
  let modelName = 'gemini-3-flash-preview'; 
  if (isDeepThink) modelName = 'gemini-3-pro-preview';
  else if (isFast) modelName = 'gemini-flash-lite-latest';
  else if (imageBase64 && prompt.match(/(تعديل|إزالة|إضافة|فلتر|تحسين|edit|filter|remove|image)/i)) {
    modelName = 'gemini-2.5-flash-image';
  }

  const systemInstruction = `
    You are "ExcelAI Pro Max", a specialist in high-volume data architecture and product management.
    
    CRITICAL: You are handling professional product lists (e.g., Kemei, HomeGold). 
    - Preserve unique IDs, SKUs, and image URLs.
    - If user asks for image edits (e.g. "Add a retro filter"), use your image processing capabilities.
    - For large datasets, provide operations that can be applied at scale.
    - You MUST return valid JSON.

    Response Schema:
    {
      "message": "Summary of actions in Arabic",
      "operations": [
        {"type": "SET_DATA", "data": [[...]]} // Use this for bulk changes
      ],
      "image": "base64_result_if_image_edit_requested"
    }

    Context:
    ${sheetContext}
  `;

  const maxAttempts = 2;
  let lastError: any = null;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const ai = new GoogleGenAI({ apiKey: getCurrentKey() });
      const parts: any[] = [];
      
      if (imageBase64) {
        const base64Data = imageBase64.split(',')[1] || imageBase64;
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: base64Data } });
      }
      parts.push({ text: prompt });

      const config: any = {
        systemInstruction,
        temperature: isDeepThink ? 0.3 : 0.1,
        tools: modelName.includes('pro') ? [{ googleSearch: {} }] : [],
      };

      if (isDeepThink) {
        // Max thinking budget for complex reasoning as requested
        config.thinkingConfig = { thinkingBudget: 32768 };
      }

      const response = await ai.models.generateContent({
        model: modelName,
        contents: { parts },
        config
      });

      const responseText = response.text || "";
      let editedImage: string | undefined;

      // Check for image output if it was an image-to-image task
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          editedImage = `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
      }

      let parsedResponse: AIResponse;
      try {
        const cleanedJson = cleanJsonResponse(responseText);
        parsedResponse = JSON.parse(cleanedJson) as AIResponse;
      } catch (e) {
        parsedResponse = { message: responseText, operations: [] };
      }

      if (editedImage) parsedResponse.image = editedImage;
      return parsedResponse;

    } catch (error: any) {
      lastError = error;
      if (error.status === 429) getNextKey();
      await new Promise(r => setTimeout(r, 500));
    }
  }

  return { message: `⛔ خطأ فني: ${lastError?.message}`, operations: [] };
};
