import { GoogleGenAI } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

const apiKey = process.env.API_KEY || '';

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey });

// Helper to format sheet data for context
const formatSheetContext = (data: SheetData): string => {
  const MAX_ROWS = 30; // Increased context slightly
  // Map complex Cell objects to simple values for the AI context to save tokens
  const simpleData = data.slice(0, MAX_ROWS).map(row => 
    row.map(cell => cell.value)
  );
  
  const rowCount = data.length;
  const colCount = data[0]?.length || 0;
  
  return JSON.stringify({
    summary: `Total Rows: ${rowCount}, Total Columns: ${colCount}`,
    preview: simpleData
  });
};

const cleanJsonResponse = (text: string): string => {
  // Remove markdown code blocks if present
  let clean = text.replace(/```json\n?|\n?```/g, '').trim();
  // Sometimes models add text before or after, find the first '{' and last '}'
  const firstBrace = clean.indexOf('{');
  const lastBrace = clean.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace !== -1) {
    clean = clean.substring(firstBrace, lastBrace + 1);
  }
  return clean;
};

export const sendMessageToGemini = async (
  prompt: string,
  currentSheetData: SheetData
): Promise<AIResponse> => {
  
  if (!apiKey) {
    return {
      message: "عذراً، لم يتم العثور على مفتاح API. يرجى التأكد من إعداد البيئة بشكل صحيح.",
      operations: []
    };
  }

  const sheetContext = formatSheetContext(currentSheetData);

  const systemInstruction = `
    أنت خبير محترف في Excel، مهندس قواعد بيانات، ومحاسب قانوني ذكي.
    
    المهام المطلوبة منك:
    1. **محاسب ذكي**: إنشاء أنظمة محاسبية (يومية، ميزانية، رواتب) مع التنسيق الاحترافي.
    2. **مهندس بيانات**: هيكلة الجداول لتكون جاهزة كقاعدة بيانات (تحديد الأنواع، تسمية الأعمدة بوضوح).
    3. **باحث إنترنت**: استخدام Google Search لجلب بيانات حقيقية (أسعار، إحصائيات، عناوين) وتعبئتها في الجدول.

    قواعد الاستجابة الصارمة (JSON ONLY):
    - يجب أن يكون ردك بصيغة JSON فقط.
    - لا تضع أي نص خارج كائن JSON.
    - لا تستخدم 'responseMimeType' في تفكيرك، فقط التزم بالهيكل أدناه.

    الهيكل المطلوب لرد JSON:
    {
      "message": "رسالة قصيرة توضح ما تم فعله (بالعربية)",
      "operations": [
        {
          "type": "SET_CELL" | "ADD_ROW" | "SET_DATA" | "FORMAT_CELL",
          "row": number,
          "col": number,
          "value": string | number | boolean,
          "style": { 
             "bold": boolean, 
             "color": string, 
             "backgroundColor": string,
             "align": "left" | "center" | "right" 
          },
          "data": [[value, value], ...] // For SET_DATA or ADD_ROW
        }
      ]
    }

    أمثلة للعمليات:
    - لإنشاء جدول جديد: استخدم SET_DATA مع مصفوفة ثنائية الأبعاد.
    - لتلوين الرأس: استخدم FORMAT_CELL للصف 0 مع backgroundColor مميز.
    - لإضافة بيانات بحث: استخدم ADD_ROW لإضافة النتائج.

    سياق الجدول الحالي:
    ${sheetContext}
  `;

  try {
    // IMPORTANT: responseMimeType: 'application/json' is REMOVED because it conflicts with tools: [{googleSearch: {}}]
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [{ text: `المستخدم: ${prompt}` }] }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }], 
        temperature: 0.3, // Lower temperature for more consistent JSON
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");

    // Extract Grounding (Search) Metadata
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks;
    let searchSources = "";
    if (groundingChunks) {
        const uniqueUrls = new Set(
          groundingChunks
            .map(c => c.web?.uri)
            .filter(u => u)
        );
        if (uniqueUrls.size > 0) {
           searchSources = `\n\nالمصادر:\n` + Array.from(uniqueUrls).map(u => `- ${u}`).join("\n");
        }
    }

    let parsedResponse: AIResponse;
    try {
      const cleanedJson = cleanJsonResponse(responseText);
      parsedResponse = JSON.parse(cleanedJson) as AIResponse;
    } catch (e) {
      console.error("JSON Parse Error:", e, "Raw Text:", responseText);
      // Fallback: Try to construct a valid response from the text if possible, or error out gracefully
      parsedResponse = {
        message: responseText + "\n(ملاحظة: لم يتم تنفيذ العمليات التلقائية بسبب تنسيق الرد)",
        operations: []
      };
    }

    if (searchSources) {
      parsedResponse.message += searchSources;
    }

    return parsedResponse;

  } catch (error) {
    console.error("Gemini API Error:", error);
    return {
      message: "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة مرة أخرى.",
      operations: []
    };
  }
};
