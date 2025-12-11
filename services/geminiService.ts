import { GoogleGenAI } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

// Initialize Gemini
// API key must be strictly obtained from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to format sheet data for context
const formatSheetContext = (data: SheetData): string => {
  const MAX_ROWS = 40; // Increased context for product lists
  // Map complex Cell objects to simple values for the AI context to save tokens
  const simpleData = data.slice(0, MAX_ROWS).map(row => 
    row.map(cell => cell.value)
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
  currentSheetData: SheetData,
  imageBase64?: string
): Promise<AIResponse> => {
  
  const sheetContext = formatSheetContext(currentSheetData);

  const systemInstruction = `
    أنت "ExcelAI Pro"، خبير عالمي في إدارة بيانات التجارة الإلكترونية، وتحليل ملفات Excel/CSV، وخبير متخصص في **Shopify**.
    
    قدراتك الأساسية:
    1. **مدير Shopify**: تفهم تماماً هيكلية ملفات Shopify (Headers: Handle, Title, Body (HTML), Vendor, Type, Tags, Variant Price, Image Src).
    2. **خبير SEO ومحتوى**: تستطيع كتابة أوصاف منتجات احترافية، تحسين العناوين، وإضافة كلمات مفتاحية.
    3. **محلل نقدي**: عند طلب "تحليل الملف"، قم بنقد البيانات (الأسعار غير المنطقية، الوصف الناقص، الصور المفقودة) واقترح خطة تصحيح.
    4. **التعامل مع الصور**: إذا أرسل المستخدم صورة منتج، استخرج بياناتها (الاسم، السعر المتوقع، الوصف) وضعها في الجدول، أو ابحث عن روابط صور مشابهة.
    5. **باحث إنترنت (Grounding)**: استخدم Google Search للعثور على أسعار المنافسين، روابط صور المنتجات (لخانة Image Src)، وبيانات الموردين.

    قواعد التعامل مع ملفات Shopify:
    - العمود 'Handle' يجب أن يكون kebab-case (مثال: blue-t-shirt).
    - العمود 'Body (HTML)' يقبل تنسيق HTML.
    - عند البحث عن صور، ضع الرابط المباشر للصورة في عمود 'Image Src'.

    قواعد الاستجابة الصارمة (JSON ONLY):
    - ردك يجب أن يكون JSON فقط.
    - الهيكل:
    {
      "message": "نص الرد للمستخدم (بالعربية، احترافي)",
      "operations": [
        {
          "type": "SET_CELL" | "ADD_ROW" | "SET_DATA" | "FORMAT_CELL",
          "row": number,
          "col": number,
          "value": string | number | boolean,
          "style": { "bold": boolean, "color": string, "backgroundColor": string }
          "data": [[value, value], ...]
        }
      ]
    }

    سياق الجدول الحالي:
    ${sheetContext}
  `;

  try {
    const parts: any[] = [];
    
    // Add image if present
    if (imageBase64) {
      // Remove header like "data:image/jpeg;base64," if present
      const base64Data = imageBase64.split(',')[1] || imageBase64;
      parts.push({
        inlineData: {
          mimeType: 'image/jpeg', // Assuming jpeg/png, API handles most standard types
          data: base64Data
        }
      });
      parts.push({ text: "الصورة المرفقة هي جزء من سياق الطلب (منتج، فاتورة، أو مثال)." });
    }

    parts.push({ text: `المستخدم: ${prompt}` });

    // IMPORTANT: responseMimeType: 'application/json' is REMOVED because it conflicts with tools: [{googleSearch: {}}]
    // We rely on the system instruction to force JSON.
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', // Supports multimodal input (images)
      contents: [
        { role: 'user', parts: parts }
      ],
      config: {
        systemInstruction: systemInstruction,
        tools: [{ googleSearch: {} }], 
        temperature: 0.3,
      }
    });

    const responseText = response.text;
    if (!responseText) throw new Error("No response from AI");

    // Extract Grounding Metadata
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
      parsedResponse = {
        message: responseText + "\n(ملاحظة: الرد نصي فقط ولم يتم تنفيذ عمليات تلقائية)",
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