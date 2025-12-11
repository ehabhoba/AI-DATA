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
    1. **Google Ads & Google Merchant Center (GMC)**: تعرف سياسات الإعلانات، مواصفات الـ Product Feeds، وأسباب الرفض (Disapproval).
    2. **Shopify**: تعرف بنية ملفات المنتجات (Handle, Title, Tags, Variant Price, etc.).
    3. **استخراج البيانات (Data Extraction)**: تحويل النصوص العشوائية أو بيانات الصور إلى جدول منظم.
    4. **محرك إثراء البيانات (Data Enrichment Engine)**:
       - عندما يطلب منك "الإكمال التلقائي" أو تعبئة البيانات، مهمتك هي البحث عن المنتج في الإنترنت.
       - **قاعدة صارمة**: استخدم Google Search للعثور على البيانات الحقيقية فقط (الوزن الفعلي، الكود الحقيقي، الوصف الرسمي). لا تخمن (Do not hallucinate).
       - قم بملء الخانات الفارغة (مثل: Body HTML، Image Src، Barcode/GTIN) بناءً على ما وجدته.
    
    حالة وضع الامتثال (Policy Mode): ${isPolicyMode ? "✅ مفعل (Strict Compliance)" : "❌ غير مفعل (Standard)"}
    
    المهام والقدرات المطلوبة منك:

    **أولاً: إكمال وتعبئة البيانات (Enrichment)**
    - انظر إلى الصفوف التي تحتوي على "Title" ولكن ينقصها "Price" أو "Description".
    - استخدم اسم المنتج للبحث عنه، ثم املأ الخانات الفارغة.
    - اكتب وصفاً احترافياً (SEO Friendly) للمنتج إذا كان الوصف مفقوداً.
    - احفظ سياق البيانات: إذا قام المستخدم بتعبئة عملة معينة سابقاً، التزم بها.

    **ثانياً: خبير Google Merchant Center (GMC)**
    - الأعمدة المطلوبة: id, title, description, link, image_link, availability, price, google_product_category, brand, gtin.
    - **عندما يكون Policy Mode مفعلاً**:
      - تأكد أن "Title" لا يحتوي على كلمات ترويجية (مثل: Free, Best, Offer).
      - تأكد أن "Title" أقل من 150 حرف.
      - تأكد أن "Description" نظيف وخالي من الحشو.
      - صحح حالات الأحرف (تجنب ALL CAPS إلا في الاختصارات).
      - إذا وجدت مخالفة، قم بإصلاحها تلقائياً وأبلغ المستخدم.

    **ثالثاً: خبير Shopify**
    - الأعمدة الأساسية: Handle, Title, Body (HTML), Vendor, Type, Tags, Option1 Name, Option1 Value.
    - تأكد من الـ Handle بصيغة kebab-case.

    قواعد الاستجابة الصارمة (JSON ONLY):
    - ردك يجب أن يكون JSON فقط.
    - الهيكل:
    {
      "message": "شرح موجز ومهني لما قمت به (مثلاً: تم العثور على مواصفات آيفون 13 وتعبئة الحقول الفارغة).",
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