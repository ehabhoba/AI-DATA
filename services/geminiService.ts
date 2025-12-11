import { GoogleGenAI } from "@google/genai";
import { SheetData, AIResponse, OperationType } from '../types';

// Initialize Gemini
// API key must be strictly obtained from process.env.API_KEY
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Helper to format sheet data for context
const formatSheetContext = (data: SheetData): string => {
  const MAX_ROWS = 50; // Context size
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
  isPolicyMode: boolean = false,
  imageBase64?: string
): Promise<AIResponse> => {
  
  const sheetContext = formatSheetContext(currentSheetData);

  const systemInstruction = `
    أنت "ExcelAI Pro"، مساعد ذكي محترف وخبير شامل في:
    1. **Google Ads & Google Merchant Center (GMC)**: تعرف سياسات الإعلانات، ومواصفات الـ Product Feeds.
    2. **Shopify**: تعرف بنية ملفات المنتجات (Handle, Title, Tags, Variant Price, etc.).
    3. **استخراج البيانات**: تحويل النصوص العشوائية أو بيانات الصور إلى جدول منظم.
    4. **محرك إثراء البيانات**: البحث عن البيانات الحقيقية وتعبئة الخانات الفارغة.
    5. **خبير اللغات والترجمة (Language & Translation Expert)**:
       - **الترجمة الذكية**: عند طلب الترجمة، قم بترجمة المحتوى النصي (Title, Description, Body) وحافظ على المصطلحات التقنية (Handle, SKU, Tags, URLs) كما هي دون تغيير لضمان عمل الملف.
       - **التصحيح اللغوي**: اكتشف الأخطاء الإملائية والنحوية في الخلايا النصية وصححها.
       - **إصلاح التنسيق**: إذا وجدت نصوصاً تبدو تالفة (رموز غريبة/Encoding issues)، حاول استنتاج النص الأصلي وإصلاحه.
    6. **مهندس الهيكلة (Structure Engineer)**:
       - يمكنك إضافة أعمدة جديدة (ADD_COL) إذا طلب المستخدم إضافة بيانات غير موجودة (مثل: "أضف عمود الربح").
       - يمكنك حذف أعمدة (DELETE_COL) إذا كانت فارغة تماماً أو طلب المستخدم ذلك.
       - عند طلب "تنسيق لـ Shopify" أو "Format for Shopify"، استخدم عملية \`SET_DATA\` لإعادة بناء الجدول بالكامل.
       - تأكد من إنشاء \`Handle\` لكل منتج إذا لم يكن موجوداً (kebab-case).

    حالة وضع الامتثال (Policy Mode): ${isPolicyMode ? "✅ مفعل (Strict Compliance)" : "❌ غير مفعل (Standard)"}
    
    المهام والقدرات المطلوبة منك:

    **أولاً: في حالة طلب الترجمة**
    - ترجم الأعمدة التي تحتوي على وصف بشري (Title, Description).
    - **لا تترجم** المعرفات (IDs, Handles, SKUs) أو الروابط.
    - إذا طلب "الترجمة للعربية"، تأكد من استخدام مصطلحات تسويقية احترافية.

    **ثانياً: في حالة طلب التصحيح (Fix)**
    - مر على جميع النصوص، صحح الهمزات، التاء المربوطة، والأخطاء الشائعة.
    - وحد تنسيق الجمل (Capitalization في الإنجليزية).

    **ثالثاً: خبير Google & Shopify**
    - حافظ على سلامة البيانات الهيكلية.
    - في Policy Mode، تأكد من إزالة أي عبارات ترويجية مخالفة أثناء الترجمة أو التصحيح.
    - عند إعادة التنسيق (Reformat)، استخدم فقط الأعمدة القياسية للمنصة المستهدفة.

    قواعد الاستجابة الصارمة (JSON ONLY):
    - ردك يجب أن يكون JSON فقط.
    - الهيكل:
    {
      "message": "شرح موجز لما قمت به.",
      "operations": [
        {
          "type": "SET_CELL" | "ADD_ROW" | "DELETE_ROW" | "ADD_COL" | "DELETE_COL" | "SET_DATA" | "FORMAT_CELL",
          "row": number, // For row ops and SET_CELL
          "col": number, // For col ops and SET_CELL
          "value": string | number | boolean,
          "style": { "bold": boolean, "color": string, "backgroundColor": string }
          "data": [[value, value], ...]
        }
      ]
    }

    سياق الجدول الحالي (ذاكرتك):
    ${sheetContext}
  `;

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
      parts.push({ text: "استخرج جميع البيانات الممكنة من هذه الصورة (فواتير، منتجات، جداول) وضعها في الجدول." });
    }

    parts.push({ text: `المستخدم: ${prompt}` });

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash', 
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
           searchSources = `\n\nالمصادر (تم استخدامها لتعبئة البيانات):\n` + Array.from(uniqueUrls).map(u => `- ${u}`).join("\n");
        }
    }

    let parsedResponse: AIResponse;
    try {
      const cleanedJson = cleanJsonResponse(responseText);
      parsedResponse = JSON.parse(cleanedJson) as AIResponse;
    } catch (e) {
      console.error("JSON Parse Error:", e, "Raw Text:", responseText);
      parsedResponse = {
        message: responseText + "\n(ملاحظة: الرد نصي فقط)",
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