import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, Menu, X, Link as LinkIcon, Globe, Database, Table, Cloud, CheckCircle, AlertCircle, Search, Replace, Sparkles, BrainCircuit, FileCode, ShieldCheck, ShieldAlert, Wand2, Languages, Activity, ShoppingBag, LayoutTemplate, Save, RotateCcw, RotateCw, Bold, Italic, AlignLeft, AlignCenter, AlignRight, PaintBucket, Type, Tags, Zap } from 'lucide-react';
import Spreadsheet from './components/Spreadsheet';
import Chat from './components/Chat';
import DatabaseView from './components/DatabaseView';
import HealthDashboard from './components/HealthDashboard';
import { SheetData, Message, OperationType, Cell, ViewMode, FlashFillSuggestion } from './types';
import { readExcelFile, exportExcelFile, exportTsvFile, generateEmptySheet, getShopifyTemplate, getGoogleMerchantTemplate, fetchCsvFromUrl } from './services/excelService';
import { sendMessageToGemini } from './services/geminiService';
import { sheetToJson } from './services/databaseService';
import { detectFlashFillPattern } from './services/flashFillService';

const App: React.FC = () => {
  // Main Data State
  const [sheetData, setSheetData] = useState<SheetData>(generateEmptySheet(20, 10));
  
  // Undo/Redo History State
  const [past, setPast] = useState<SheetData[]>([]);
  const [future, setFuture] = useState<SheetData[]>([]);

  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // Selection State
  const [selectedCell, setSelectedCell] = useState<{r: number, c: number} | null>(null);

  // Auto-save UI state
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  // New: Template Menu
  const [showTemplateMenu, setShowTemplateMenu] = useState(false);

  // New: Google Policy Mode State
  const [policyMode, setPolicyMode] = useState(false);

  // New: Language Menu State
  const [showLangMenu, setShowLangMenu] = useState(false);

  // New: Health Dashboard State
  const [showHealthDashboard, setShowHealthDashboard] = useState(false);

  // Find and Replace State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState<{r: number, c: number} | null>(null);

  // Flash Fill State
  const [flashFillSuggestion, setFlashFillSuggestion] = useState<FlashFillSuggestion | null>(null);

  // Ref for auto-save to access latest data inside setInterval
  const sheetDataRef = useRef(sheetData);

  // Sync ref with state
  useEffect(() => {
    sheetDataRef.current = sheetData;
  }, [sheetData]);

  // --- Undo/Redo Logic ---
  const saveToHistory = (newData: SheetData) => {
    setPast(prev => {
      const newPast = [...prev, sheetData];
      if (newPast.length > 50) newPast.shift(); // Limit history to 50 steps
      return newPast;
    });
    setFuture([]); // Clear redo stack on new change
    setSheetData(newData);
  };

  const handleUndo = useCallback(() => {
    if (past.length === 0) return;
    const previous = past[past.length - 1];
    const newPast = past.slice(0, past.length - 1);
    
    setFuture(prev => [sheetData, ...prev]);
    setPast(newPast);
    setSheetData(previous);
  }, [past, sheetData]);

  const handleRedo = useCallback(() => {
    if (future.length === 0) return;
    const next = future[0];
    const newFuture = future.slice(1);

    setPast(prev => [...prev, sheetData]);
    setFuture(newFuture);
    setSheetData(next);
  }, [future, sheetData]);

  // Keyboard Shortcuts for Undo/Redo
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          handleRedo();
        } else {
          handleUndo();
        }
      } else if ((e.metaKey || e.ctrlKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  // --- Formatting Logic ---
  const handleFormat = (styleKey: string, value: any) => {
    if (!selectedCell) {
        alert("يرجى تحديد خلية أولاً.");
        return;
    }

    const { r, c } = selectedCell;
    const newData = [...sheetData];
    
    // Ensure cell exists
    if (!newData[r]) newData[r] = [];
    const currentRow = newData[r];
    // Pad if necessary
    while (currentRow.length <= c) currentRow.push({ value: "", style: {} });
    
    const cell = currentRow[c] || { value: "", style: {} };
    const currentStyle = cell.style || {};

    // Toggle logic for boolean values
    let newValue = value;
    if (styleKey === 'bold') newValue = !currentStyle.bold;
    if (styleKey === 'italic') newValue = !currentStyle.italic;

    const newStyle = { ...currentStyle, [styleKey]: newValue };

    currentRow[c] = { ...cell, style: newStyle };
    
    saveToHistory(newData);
  };

  // 1. Load from LocalStorage on startup (Browser Persistence)
  useEffect(() => {
    const savedData = localStorage.getItem('excel_ai_local_data');
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setSheetData(parsed);
        }
      } catch (e) {
        console.error("Failed to load local data", e);
      }
    }

    setMessages([
      {
        role: 'model',
        text: 'مرحباً! أنا "إكسيل AI برو" - خبيرك الشامل.\n\n🛍️ **جديد: تنسيق Shopify الفوري!**\nاضغط على زر "تنسيق Shopify" في الأعلى لتحويل ملفك بالكامل إلى الصيغة القياسية لمتجر شوبيفاي، مع تعيين الأعمدة وتوليد الـ Handles تلقائياً.',
        timestamp: Date.now()
      }
    ]);
  }, []);

  // 2. Auto-save to LocalStorage every 10 seconds
  useEffect(() => {
    const intervalId = setInterval(() => {
      const currentData = sheetDataRef.current;
      if (currentData && currentData.length > 0) {
        localStorage.setItem('excel_ai_local_data', JSON.stringify(currentData));
        
        // Trigger UI indicator
        setIsAutoSaving(true);
        setTimeout(() => setIsAutoSaving(false), 2000);
      }
    }, 10000); // 10 seconds

    return () => clearInterval(intervalId);
  }, []);

  // Helper to check if sheet is effectively empty
  const isSheetEmpty = () => {
    return !sheetData.some(row => row && row.some(cell => cell && cell.value !== '' && cell.value !== null));
  };

  // 3. Publish to Cloud (Vercel KV) Function
  const handlePublishToCloud = async () => {
    setIsSaving(true);
    try {
      const jsonData = sheetToJson(sheetData);
      
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) throw new Error('Failed to save to cloud');

      setLastSaved(Date.now());
      addMessage('model', 'تم نشر البيانات بنجاح! الـ API جاهز لاستقبال الطلبات.');
    } catch (error) {
      console.error("Cloud Save Error:", error);
      addMessage('model', '⚠️ فشل في النشر. هل قمت بربط قاعدة البيانات (Vercel KV) بالمشروع؟', true);
    } finally {
      setIsSaving(false);
    }
  };

  const processFile = async (file: File) => {
    try {
      const data = await readExcelFile(file);
      // Use saveToHistory instead of setSheetData directly to allow undoing import
      saveToHistory(data);
      addMessage('model', `تم تحميل "${file.name}".`);
      
      // Auto-trigger AI analysis
      setTimeout(() => {
          handleSendMessage(`تم تحميل الملف (${file.name}). قم بتحليله، اكتشف اللغة، واستخرج البيانات الهامة. هل يحتاج لترجمة أو إصلاح؟`, undefined);
      }, 800);

    } catch (error) {
      console.error("File upload error", error);
      addMessage('model', 'حدث خطأ أثناء قراءة الملف.', true);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) await processFile(file);
  };

  const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const handleDragLeave = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(false); };
  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file && (file.name.match(/\.(xlsx|xls|csv|tsv|txt)$/i))) {
       await processFile(file);
    } else {
       alert("يرجى رفع ملف إكسيل، CSV أو TSV.");
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);
    setShowUrlInput(false);
    try {
      const data = await fetchCsvFromUrl(urlInput);
      saveToHistory(data);
      addMessage('model', 'تم استيراد البيانات من الرابط بنجاح!');
    } catch (error) {
      console.error(error);
      addMessage('model', 'فشل في استيراد الرابط.', true);
    } finally {
      setIsLoading(false);
      setUrlInput('');
    }
  };

  const handleExport = () => {
    exportExcelFile(sheetData, 'SmartExcel_Shopify.xlsx');
    addMessage('model', 'تم تحميل الملف (Excel) بنجاح!');
  };

  const handleExportTsv = () => {
    exportTsvFile(sheetData, 'SmartExcel_Export.tsv');
    addMessage('model', 'تم تحميل الملف (TSV) بنجاح!');
  }

  // --- Template Handlers ---
  const applyTemplate = (type: 'blank' | 'shopify' | 'google') => {
    let newData: SheetData;
    let msg = "";
    
    switch(type) {
      case 'shopify':
        newData = getShopifyTemplate();
        msg = "تم إنشاء قالب Shopify قياسي.";
        break;
      case 'google':
        newData = getGoogleMerchantTemplate();
        msg = "تم إنشاء قالب Google Merchant Center.";
        break;
      default:
        newData = generateEmptySheet(20, 10);
        msg = "تم إنشاء ورقة عمل فارغة.";
    }
    
    saveToHistory(newData);
    localStorage.removeItem('excel_ai_local_data');
    addMessage('model', msg);
    setShowTemplateMenu(false);
  }

  const handleSmartAnalysis = () => {
    handleSendMessage("قم بإجراء فحص شامل للملف. استخرج البيانات المفقودة، تحقق من الامتثال لسياسات جوجل وشوبيفاي، واقترح التحسينات.", undefined);
  };

  const handleAutoComplete = () => {
    handleSendMessage("قم بعملية (الإكمال التلقائي الذكي): اقرأ أسماء المنتجات الموجودة، وابحث في الإنترنت عن مواصفاتها الحقيقية (الوصف، الوزن، الباركود، السعر). املأ الخانات الفارغة ببيانات حقيقية 100% فقط.", undefined);
  };

  const handleAutoCategorize = () => {
    handleSendMessage(`Analyze the product titles in the sheet and attempt to automatically categorize them into the 'Type' column (e.g., 'Shirt', 'Pants', 'Accessory', 'Electronics') based on common patterns found in the 'Title'.
    1. If the 'Type' column doesn't exist, create it (ADD_COL). **IMPORTANT: Use the 'data' property in the ADD_COL operation to populate the entire column efficiently.**
    2. Populate the column based on the Title.
    3. If a category is ambiguous, mark it as "Review".`, undefined, true);
  };

  const handleShopifyFormat = () => {
    handleSendMessage(`قم بإعادة تنسيق الملف بالكامل ليطابق نموذج منتجات Shopify (CSV) القياسي. 
    1. أعد بناء الجدول (SET_DATA) باستخدام العناوين الرسمية: Handle, Title, Body (HTML), Vendor, Type, Tags, Published, Option1 Name, Option1 Value, Variant SKU, Variant Grams, Variant Inventory Qty, Variant Price, Image Src.
    2. انقل البيانات الموجودة إلى العمود المناسب (مثلاً انقل عمود "السعر" أو "Cost" إلى "Variant Price").
    3. أنشئ Handle (kebab-case) من اسم المنتج تلقائياً.
    4. تأكد من أن Published = TRUE.
    5. اترك الحقول غير الموجودة فارغة.`, undefined);
  };

  const handleTranslate = (target: 'ar' | 'en') => {
    const lang = target === 'ar' ? 'العربية' : 'الإنجليزية';
    handleSendMessage(`قم بترجمة محتوى الملف إلى اللغة ${lang}. \nمهم جداً: حافظ على المصطلحات التقنية (مثل Handle, SKU, Tags) باللغة الإنجليزية لضمان عمل الملف على Shopify/Google. ترجم فقط العناوين والأوصاف والنصوص التسويقية.`, undefined);
    setShowLangMenu(false);
  };

  const handleFixLanguage = () => {
    handleSendMessage(`قم بفحص النصوص في الملف. صحح جميع الأخطاء الإملائية والنحوية. أصلح أي نصوص تالفة (Encoding issues). وحد تنسيق الجمل.`, undefined);
    setShowLangMenu(false);
  }

  // --- New: Handler for Health Dashboard Fixes ---
  const handleHealthFix = (issueType: string) => {
    setShowHealthDashboard(false); // Close dashboard to show chat progress
    
    let prompt = "";
    switch (issueType) {
      case 'missing_prices':
        prompt = "لقد اكتشفت أن هناك منتجات بدون أسعار. قم بتقدير أسعار منطقية بناءً على نوع المنتج واسمه، أو ضع سعراً افتراضياً (مثلاً 0.00) مع تمييزه باللون الأحمر للمراجعة.";
        break;
      case 'missing_images':
        prompt = "هناك منتجات تفتقر للصور. استخدم البحث (Google Search) للعثور على روابط صور حقيقية لهذه المنتجات وأضفها في عمود Image Src. إذا لم تجد، اتركها فارغة.";
        break;
      case 'seo_issues':
        prompt = "توجد مشاكل في طول عناوين المنتجات (SEO). قم بإعادة صياغة العناوين الطويلة جداً لتكون أقل من 150 حرفاً وأكثر جاذبية، وتأكد من أن العناوين القصيرة جداً غنية بالكلمات المفتاحية.";
        break;
      case 'all':
        prompt = "قم بإجراء عملية 'إصلاح شامل' للملف:\n1. املأ الأسعار المفقودة بتقديرات منطقية.\n2. ابحث عن روابط صور للمنتجات التي بلا صور.\n3. حسن عناوين المنتجات لـ SEO.\n4. تأكد من صحة التنسيق العام.";
        break;
      default:
        return;
    }
    
    handleSendMessage(prompt, undefined);
  };

  // Row & Column Operations (Full Freedom)
  const handleDeleteRow = (rowIndex: number) => {
    const newData = [...sheetData];
    newData.splice(rowIndex, 1);
    saveToHistory(newData);
  };

  const handleAddRow = (rowIndex: number) => {
    const newData = [...sheetData];
    const colCount = newData[0]?.length || 10;
    const newRow = Array(colCount).fill(null).map(() => ({ value: "", style: {} }));
    newData.splice(rowIndex + 1, 0, newRow);
    saveToHistory(newData);
  };

  const handleDeleteCol = (colIndex: number) => {
    if (sheetData.length === 0) return;
    const newData = sheetData.map(row => {
        const newRow = [...row];
        newRow.splice(colIndex, 1);
        return newRow;
    });
    saveToHistory(newData);
  };

  const handleAddCol = (colIndex: number) => {
    if (sheetData.length === 0) return;
    const newData = sheetData.map(row => {
        const newRow = [...row];
        newRow.splice(colIndex, 0, { value: "", style: {} });
        return newRow;
    });
    saveToHistory(newData);
  };

  // --- Find and Replace Logic ---
  const findNext = () => {
    if (!findText) return;
    let startRow = 0; let startCol = 0;
    if (currentMatch) { startCol = currentMatch.c + 1; startRow = currentMatch.r; }
    let found = false;
    
    // Safety check for loop
    const safeData = sheetData || [];

    for (let r = startRow; r < safeData.length; r++) {
      const row = safeData[r];
      if (!row) continue; // Skip undefined rows
      const cInit = (r === startRow) ? startCol : 0;
      for (let c = cInit; c < row.length; c++) {
        // Safe access
        const cell = row[c];
        const cellValue = String(cell?.value || '');
        if (cellValue.toLowerCase().includes(findText.toLowerCase())) {
          setCurrentMatch({ r, c }); found = true; return;
        }
      }
    }
    if (!found) {
      // Wrap around
      for (let r = 0; r <= startRow; r++) {
         const row = safeData[r];
         if (!row) continue;
         const cMax = (r === startRow) ? startCol : row.length;
         for (let c = 0; c < cMax; c++) {
            const cell = row[c];
            const cellValue = String(cell?.value || '');
            if (cellValue.toLowerCase().includes(findText.toLowerCase())) {
              setCurrentMatch({ r, c }); found = true; return;
            }
         }
      }
    }
    if (!found) { alert("لم يتم العثور على نتائج."); setCurrentMatch(null); }
  };

  const replace = () => {
    if (currentMatch && sheetData[currentMatch.r] && sheetData[currentMatch.r][currentMatch.c]) {
      const cell = sheetData[currentMatch.r][currentMatch.c];
      const cellValue = String(cell?.value || '');
      const newValue = cellValue.replace(new RegExp(findText, 'i'), replaceText);
      handleCellEdit(currentMatch.r, currentMatch.c, newValue);
      findNext();
    } else { findNext(); }
  };

  const replaceAll = () => {
    if (!findText) return;
    let count = 0;
    const newData = sheetData.map((row) => 
      (row || []).map((cell) => {
        // Handle null/undefined cells
        if (!cell) return { value: '', style: {} };
        const cellValue = String(cell.value || '');
        if (cellValue.toLowerCase().includes(findText.toLowerCase())) {
           const newValue = cellValue.split(new RegExp(findText, 'i')).join(replaceText);
           count++;
           return { ...cell, value: isNaN(Number(newValue)) ? newValue : Number(newValue) };
        }
        return cell;
      })
    );
    saveToHistory(newData);
    alert(`تم استبدال ${count} حقول.`);
    setCurrentMatch(null);
  };
  // --- End Find and Replace Logic ---

  const handleCellEdit = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...sheetData];
    if (!newData[rowIndex]) newData[rowIndex] = [];
    newData[rowIndex] = [...newData[rowIndex]];
    while (newData[rowIndex].length <= colIndex) newData[rowIndex].push({ value: "", style: {} });

    let typedValue: string | number = value;
    const isNumeric = !isNaN(Number(value)) && value.trim() !== '';
    const isIntermediateState = value.endsWith('.') || (value.includes('.') && value.endsWith('0')) || (value.startsWith('0') && value.length > 1 && !value.startsWith('0.'));

    if (isNumeric && !isIntermediateState) typedValue = Number(value);
    
    // Ensure cell object exists before spreading
    const currentCell = newData[rowIndex][colIndex] || { value: "", style: {} };

    newData[rowIndex][colIndex] = {
      ...currentCell,
      value: typedValue
    };
    setSheetData(newData);
    
    // Clear previous suggestion on edit
    setFlashFillSuggestion(null);

    // --- FLASH FILL TRIGGER ---
    // Only check if value has length (user actually typed something)
    if (String(typedValue).length > 1) {
       // Debounce slightly or just run async
       setTimeout(() => {
          const suggestion = detectFlashFillPattern(newData, rowIndex, colIndex, String(typedValue));
          if (suggestion) {
              setFlashFillSuggestion(suggestion);
          }
       }, 300);
    }
  };
  
  // Apply Flash Fill Updates
  const applyFlashFill = () => {
      if (!flashFillSuggestion) return;
      
      const newData = [...sheetData];
      let count = 0;
      
      flashFillSuggestion.updates.forEach(update => {
          const { r, c, value } = update;
          // Ensure dimensions
          if (!newData[r]) newData[r] = [];
          while (newData[r].length <= c) newData[r].push({ value: "", style: {} });
          
          newData[r][c] = { ...newData[r][c], value: value };
          count++;
      });
      
      saveToHistory(newData);
      setFlashFillSuggestion(null);
      addMessage('model', `✨ تم تطبيق "تعبئة سحرية" على ${count} خلايا بنجاح!`);
  };

  const addMessage = (role: 'user' | 'model', text: string, isError: boolean = false, image?: string) => {
    setMessages(prev => [...prev, { role, text, isError, image, timestamp: Date.now() }]);
  };

  const handleSendMessage = async (text: string, image?: string, isDeepThink?: boolean) => {
    addMessage('user', text, false, image);
    setIsLoading(true);
    setFlashFillSuggestion(null); // Clear tooltips when chatting

    try {
      // Pass policyMode and DeepThink to the service
      const response = await sendMessageToGemini(text, sheetData, policyMode, image, isDeepThink);
      
      // Save current state before AI modification
      // Deep copy to ensure history integrity
      const stateBeforeAI = JSON.parse(JSON.stringify(sheetData));
      
      // Deep Copy with safety checks for null/undefined rows and cells
      let newData: SheetData = sheetData.map(row => 
        (row || []).map(cell => {
          if (!cell) return { value: "", style: {} };
          return { ...cell, style: { ...(cell.style || {}) } };
        })
      );

      if (response.operations && response.operations.length > 0) {
        response.operations.forEach(op => {
          const ensureDimensions = (r: number, c: number) => {
            while (newData.length <= r) {
              const cols = Math.max(newData[0]?.length || 10, c + 1);
              const emptyRow: Cell[] = Array(cols).fill(null).map(() => ({ value: "", style: {} }));
              newData.push(emptyRow);
            }
            if (!newData[r]) {
                const cols = Math.max(newData[0]?.length || 10, c + 1);
                newData[r] = Array(cols).fill(null).map(() => ({ value: "", style: {} }));
            }
            while (newData[r].length <= c) newData[r].push({ value: "", style: {} });
          };

          if (op.type === OperationType.SET_DATA && op.data) {
             newData = op.data.map(row => (row || []).map(val => ({ value: val, style: {} })));
          } 
          else if (op.type === OperationType.SET_CELL || op.type === OperationType.FORMAT_CELL) {
            if (op.row !== undefined && op.col !== undefined) {
              ensureDimensions(op.row, op.col);
              const cell = newData[op.row][op.col];
              if (cell) {
                if (op.type === OperationType.SET_CELL && op.value !== undefined) cell.value = op.value;
                if (op.style) cell.style = { ...cell.style, ...op.style };
              }
            }
          } 
          else if (op.type === OperationType.ADD_ROW && op.data) {
             if (Array.isArray(op.data)) {
                op.data.forEach(rowData => {
                   if (Array.isArray(rowData)) {
                      const newRow: Cell[] = rowData.map(val => ({ value: val, style: {} }));
                      newData.push(newRow);
                   }
                });
             }
          }
          // New: Handle AI Column Operations
          else if (op.type === OperationType.ADD_COL && op.col !== undefined) {
             newData = newData.map((row, rowIndex) => {
                const newRow = [...row];
                let val: string | number | boolean | null = "";
                
                // Support bulk data for the new column
                if (op.data && op.data[rowIndex]) {
                    val = op.data[rowIndex][0]; // Assuming [[val], [val]] format from AI
                } else if (op.value !== undefined) {
                    val = op.value; // Default value fallback
                }

                newRow.splice(op.col!, 0, { value: val, style: {} });
                return newRow;
             });
          }
          else if (op.type === OperationType.DELETE_COL && op.col !== undefined) {
             newData = newData.map(row => {
                const newRow = [...row];
                if (newRow.length > op.col!) {
                   newRow.splice(op.col!, 1);
                }
                return newRow;
             });
          }
          else if (op.type === OperationType.DELETE_ROW && op.row !== undefined) {
              if (newData.length > op.row) newData.splice(op.row, 1);
          }
        });
        
        // Push the OLD state to history before updating to NEW state
        setPast(prev => [...prev, stateBeforeAI]);
        setFuture([]); // Clear redo stack
        setSheetData(newData);
      }

      addMessage('model', response.message);

    } catch (error) {
      console.error(error);
      addMessage('model', 'حدث خطأ غير متوقع في الاتصال بالذكاء الاصطناعي.', true);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper to get selected cell style
  const getSelectedCellStyle = () => {
    if (!selectedCell) return {};
    const { r, c } = selectedCell;
    const cell = sheetData[r]?.[c];
    return cell?.style || {};
  };
  const activeStyle = getSelectedCellStyle();

  return (
    <div 
      className="flex h-screen w-full overflow-hidden bg-gray-100 font-sans relative" 
      dir="rtl"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
      {/* Auto-save Toast Indicator */}
      {isAutoSaving && (
        <div className="fixed bottom-4 left-4 z-50 bg-gray-800/90 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 text-sm font-medium animate-in slide-in-from-bottom-5 fade-in">
          <Save size={16} className="text-emerald-400" />
          تم الحفظ تلقائياً...
        </div>
      )}

      {/* Flash Fill Suggestion Toast */}
      {flashFillSuggestion && (
        <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 bg-white border border-emerald-200 shadow-2xl p-4 rounded-xl z-50 animate-in slide-in-from-bottom-4 flex items-center gap-4 max-w-md w-full mx-4">
            <div className="bg-emerald-100 p-3 rounded-full text-emerald-600 shrink-0 animate-pulse">
                <Zap size={24} fill="currentColor" />
            </div>
            <div className="flex-1">
                <h4 className="font-bold text-gray-800 text-sm flex items-center gap-2">
                   تعبئة سحرية (Flash Fill)
                </h4>
                <p className="text-sm text-emerald-700 font-medium mt-0.5">{flashFillSuggestion.name}</p>
                <p className="text-xs text-gray-400 mt-1">
                    سيتم ملء <strong>{flashFillSuggestion.updates.length}</strong> خلية تلقائياً.
                </p>
            </div>
            <div className="flex gap-2 border-r border-gray-100 pr-4 mr-2 shrink-0">
                <button 
                  onClick={applyFlashFill} 
                  className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700 transition shadow-sm hover:shadow-md"
                >
                    تطبيق
                </button>
                <button 
                  onClick={() => setFlashFillSuggestion(null)} 
                  className="bg-gray-50 text-gray-500 px-3 py-2 rounded-lg text-sm hover:bg-gray-100 hover:text-gray-700 transition"
                >
                    تجاهل
                </button>
            </div>
        </div>
      )}

      {/* Drag Overlay */}
      {isDragging && (
        <div className="absolute inset-0 z-50 bg-emerald-500/20 backdrop-blur-sm border-4 border-emerald-500 border-dashed m-4 rounded-xl flex items-center justify-center pointer-events-none">
            <div className="bg-white p-8 rounded-2xl shadow-2xl text-center transform scale-110 transition-transform">
                <BrainCircuit className="w-20 h-20 text-emerald-600 mx-auto mb-4 animate-bounce" />
                <h3 className="text-2xl font-bold text-gray-800">أفلت الملف هنا</h3>
                <p className="text-emerald-600 mt-2">وسأقوم بتحليله وإصلاحه تلقائياً</p>
            </div>
        </div>
      )}

      {/* Health Dashboard Overlay */}
      {showHealthDashboard && (
        <HealthDashboard 
          data={sheetData} 
          onClose={() => setShowHealthDashboard(false)} 
          onFix={handleHealthFix}
        />
      )}

      {/* Mobile Sidebar Toggle */}
      <button 
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-emerald-600 text-white rounded-full shadow-lg"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Sidebar / Chat Area */}
      <div 
        className={`${
          isSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        } fixed inset-y-0 right-0 z-40 w-full md:w-96 bg-white shadow-2xl transition-transform duration-300 ease-in-out lg:relative lg:transform-none lg:shadow-none border-l border-gray-200 flex flex-col`}
      >
        <Chat 
          messages={messages} 
          onSendMessage={handleSendMessage} 
          isLoading={isLoading} 
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* Toolbar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between shadow-sm z-30 flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white shadow-emerald-200 shadow-lg">
              <FileSpreadsheet size={24} />
            </div>
            <div>
              <h1 className="font-bold text-gray-800 text-lg leading-tight">ExcelAI Pro</h1>
              <span className="text-xs text-emerald-600 font-medium bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                Shopify & Google Expert
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
              {/* Undo / Redo Buttons */}
              <div className="flex bg-gray-50 rounded-lg border border-gray-200 mx-2">
                 <button 
                    onClick={handleUndo} 
                    disabled={past.length === 0}
                    className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-r-lg border-l disabled:opacity-30 disabled:cursor-not-allowed transition" 
                    title="تراجع (Ctrl+Z)"
                 >
                    <RotateCcw size={18} />
                 </button>
                 <button 
                    onClick={handleRedo} 
                    disabled={future.length === 0}
                    className="p-1.5 text-gray-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-l-lg disabled:opacity-30 disabled:cursor-not-allowed transition" 
                    title="إعادة (Ctrl+Y)"
                 >
                    <RotateCw size={18} />
                 </button>
              </div>

              {/* Policy Toggle */}
              <button 
                onClick={() => setPolicyMode(!policyMode)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border transition-all text-sm font-bold ${
                    policyMode 
                    ? 'bg-blue-50 border-blue-200 text-blue-700 shadow-sm' 
                    : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
                title={policyMode ? "سياسات جوجل: مفعلة" : "سياسات جوجل: معطلة"}
              >
                {policyMode ? <ShieldCheck size={16} /> : <ShieldAlert size={16} />}
                <span className="hidden md:inline">سياسات Google</span>
              </button>

              {/* Health Dashboard Button */}
              <button 
                onClick={() => setShowHealthDashboard(true)}
                className="flex items-center gap-2 px-3 py-1.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg hover:bg-rose-100 transition-all font-bold text-sm"
                title="فحص صحة البيانات"
              >
                  <Activity size={16} className="animate-pulse" />
                  تحليل الجودة
              </button>

              {/* Languages Menu */}
              <div className="relative">
                <button 
                  onClick={() => setShowLangMenu(!showLangMenu)}
                  className="flex items-center gap-2 px-3 py-1.5 bg-white border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-all font-bold text-sm"
                  title="الترجمة وإصلاح اللغة"
                >
                    <Languages size={16} />
                    اللغات
                </button>
                {showLangMenu && (
                  <div className="absolute top-full left-0 mt-2 w-48 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                    <button onClick={() => handleTranslate('ar')} className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2 border-b">
                      <span>🇸🇦</span> ترجمة للعربية
                    </button>
                    <button onClick={() => handleTranslate('en')} className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2 border-b">
                      <span>🇺🇸</span> ترجمة للإنجليزية
                    </button>
                    <button onClick={handleFixLanguage} className="w-full text-right px-4 py-2 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2">
                      <span>✨</span> تصحيح إملائي ونحوي
                    </button>
                  </div>
                )}
              </div>

              {/* Shopify Format Button */}
               <button 
                onClick={handleShopifyFormat}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:shadow-lg hover:shadow-green-200 transition-all font-bold text-sm"
                title="تنسيق Shopify"
              >
                  <ShoppingBag size={16} />
                  Shopify Format
              </button>

               <button 
                onClick={handleAutoCategorize}
                className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-orange-400 to-red-500 text-white rounded-lg hover:shadow-lg hover:shadow-orange-200 transition-all font-bold text-sm"
                title="تصنيف المنتجات تلقائياً"
              >
                  <Tags size={16} />
                  Auto Type
              </button>

               <button 
                onClick={handleAutoComplete}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-400 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-teal-200 transition-all font-bold text-sm"
                title="إكمال تلقائي للبيانات"
              >
                  <Wand2 size={16} />
              </button>
              
              <button
                onClick={handlePublishToCloud}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all shadow-sm border
                  ${lastSaved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}
                  ${isSaving ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {isSaving ? <Cloud className="animate-pulse w-4 h-4" /> : lastSaved ? <CheckCircle className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                {isSaving ? 'نشر' : 'سحابي'}
              </button>
          </div>

          <div className="flex items-center bg-gray-100 rounded-lg p-1 mx-2">
            <button
              onClick={() => setViewMode('spreadsheet')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'spreadsheet' 
                  ? 'bg-white shadow-sm text-emerald-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Table size={16} />
            </button>
            <button
              onClick={() => setViewMode('database')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
                viewMode === 'database' 
                  ? 'bg-white shadow-sm text-purple-600' 
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Database size={16} />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setShowFindReplace(!showFindReplace)} className={`p-2 rounded-lg transition-colors ${showFindReplace ? 'bg-yellow-100 text-yellow-700' : 'text-gray-600 hover:bg-gray-100'}`} title="بحث"><Search size={20} /></button>
            <div className="h-6 w-px bg-gray-300 mx-1"></div>
            <input type="file" accept=".xlsx, .xls, .csv, .tsv" id="file-upload" className="hidden" onChange={handleFileUpload} />
            
            {/* New Button with Dropdown Logic */}
            <div className="relative">
                <button onClick={() => setShowTemplateMenu(!showTemplateMenu)} className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="جديد / قوالب"><Plus size={20} /></button>
                {showTemplateMenu && (
                    <div className="absolute top-full left-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-gray-100 overflow-hidden z-50 animate-in fade-in zoom-in-95">
                        <button onClick={() => applyTemplate('blank')} className="w-full text-right px-4 py-3 text-sm hover:bg-gray-50 text-gray-700 flex items-center gap-2 border-b">
                          <FileSpreadsheet size={16} className="text-gray-400" /> ورقة فارغة
                        </button>
                        <button onClick={() => applyTemplate('shopify')} className="w-full text-right px-4 py-3 text-sm hover:bg-green-50 text-green-700 flex items-center gap-2 border-b font-medium">
                          <ShoppingBag size={16} className="text-green-600" /> قالب Shopify
                        </button>
                        <button onClick={() => applyTemplate('google')} className="w-full text-right px-4 py-3 text-sm hover:bg-blue-50 text-blue-700 flex items-center gap-2 font-medium">
                          <Globe size={16} className="text-blue-600" /> قالب Google Merchant
                        </button>
                    </div>
                )}
            </div>
            
            <button onClick={() => setShowUrlInput(true)} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="استيراد رابط"><LinkIcon size={20} /></button>
            <label htmlFor="file-upload" className="cursor-pointer p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="رفع"><Upload size={20} /></label>
            <div className="flex bg-gray-50 rounded-lg border border-gray-200">
                <button onClick={handleExport} className="p-2 text-green-700 hover:bg-green-100 rounded-r-lg border-l" title="تصدير Excel"><Download size={20} /></button>
                <button onClick={handleExportTsv} className="p-2 text-blue-700 hover:bg-blue-100 rounded-l-lg" title="تصدير TSV"><FileCode size={20} /></button>
            </div>
          </div>
        </header>

        {/* Formatting Toolbar - Only visible in Spreadsheet mode */}
        {viewMode === 'spreadsheet' && (
          <div className="bg-gray-50 border-b border-gray-200 px-6 py-2 flex items-center gap-2 overflow-x-auto shadow-inner">
             <div className="flex bg-white rounded-md border border-gray-300 shadow-sm">
                 <button 
                   onClick={() => handleFormat('bold', true)} 
                   className={`p-1.5 hover:bg-gray-100 rounded-r-md ${activeStyle.bold ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`} 
                   title="عريض"
                 >
                   <Bold size={16} />
                 </button>
                 <button 
                   onClick={() => handleFormat('italic', true)} 
                   className={`p-1.5 hover:bg-gray-100 border-r border-gray-200 rounded-l-md ${activeStyle.italic ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                   title="مائل"
                 >
                   <Italic size={16} />
                 </button>
             </div>

             <div className="h-4 w-px bg-gray-300 mx-1"></div>

             <div className="flex bg-white rounded-md border border-gray-300 shadow-sm">
                 <button 
                   onClick={() => handleFormat('align', 'right')} 
                   className={`p-1.5 hover:bg-gray-100 rounded-r-md ${activeStyle.align === 'right' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                 >
                   <AlignRight size={16} />
                 </button>
                 <button 
                   onClick={() => handleFormat('align', 'center')} 
                   className={`p-1.5 hover:bg-gray-100 border-r border-l border-gray-200 ${activeStyle.align === 'center' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                 >
                   <AlignCenter size={16} />
                 </button>
                 <button 
                   onClick={() => handleFormat('align', 'left')} 
                   className={`p-1.5 hover:bg-gray-100 rounded-l-md ${activeStyle.align === 'left' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'}`}
                 >
                   <AlignLeft size={16} />
                 </button>
             </div>

             <div className="h-4 w-px bg-gray-300 mx-1"></div>
             
             <div className="flex items-center gap-2">
                 <div className="relative group">
                     <button className="p-1.5 hover:bg-white rounded-md text-gray-600 border border-transparent hover:border-gray-300 flex items-center gap-1" title="لون الخلفية">
                        <PaintBucket size={16} />
                        <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: activeStyle.backgroundColor || '#ffffff' }}></div>
                     </button>
                     <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-50 hidden group-hover:grid grid-cols-5 gap-1 w-32">
                        {['#ffffff', '#fecaca', '#fde68a', '#d9f99d', '#bfdbfe', '#e9d5ff'].map(color => (
                          <button 
                            key={color} 
                            className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform" 
                            style={{backgroundColor: color}}
                            onClick={() => handleFormat('backgroundColor', color)}
                          />
                        ))}
                        <button onClick={() => handleFormat('backgroundColor', undefined)} className="col-span-5 text-xs text-red-500 hover:underline pt-1">مسح</button>
                     </div>
                 </div>

                 <div className="relative group">
                     <button className="p-1.5 hover:bg-white rounded-md text-gray-600 border border-transparent hover:border-gray-300 flex items-center gap-1" title="لون النص">
                        <Type size={16} />
                        <div className="w-4 h-4 rounded border border-gray-200" style={{ backgroundColor: activeStyle.color || '#000000' }}></div>
                     </button>
                     <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg p-2 z-50 hidden group-hover:grid grid-cols-5 gap-1 w-32">
                        {['#000000', '#ef4444', '#d97706', '#16a34a', '#2563eb', '#9333ea'].map(color => (
                          <button 
                            key={color} 
                            className="w-5 h-5 rounded border border-gray-200 hover:scale-110 transition-transform" 
                            style={{backgroundColor: color}}
                            onClick={() => handleFormat('color', color)}
                          />
                        ))}
                        <button onClick={() => handleFormat('color', undefined)} className="col-span-5 text-xs text-red-500 hover:underline pt-1">مسح</button>
                     </div>
                 </div>
             </div>

             <div className="flex-1"></div>
             {selectedCell ? (
               <span className="text-xs text-gray-500 font-mono">
                 Cell: {String.fromCharCode(65 + selectedCell.c)}{selectedCell.r + 1}
               </span>
             ) : (
               <span className="text-xs text-gray-400">حدد خلية للتنسيق</span>
             )}
          </div>
        )}

        <main className="flex-1 overflow-hidden relative">
           {/* Find and Replace Popover */}
           {showFindReplace && (
               <div className="absolute top-4 left-4 z-50 bg-white p-4 rounded-xl shadow-2xl border border-gray-200 w-80 animate-in fade-in zoom-in-95" dir="rtl">
                   <div className="flex justify-between items-center mb-3">
                       <h3 className="font-bold text-gray-700 flex items-center gap-2"><Search size={16} /> بحث واستبدال</h3>
                       <button onClick={() => setShowFindReplace(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                   </div>
                   <div className="space-y-3">
                       <input type="text" value={findText} onChange={(e) => setFindText(e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="بحث عن..." autoFocus />
                       <input type="text" value={replaceText} onChange={(e) => setReplaceText(e.target.value)} className="w-full p-2 border rounded-md text-sm" placeholder="استبدال بـ..." />
                       <div className="flex gap-2 pt-2 border-t mt-2">
                           <button onClick={findNext} className="flex-1 bg-gray-100 text-xs font-bold py-1.5 rounded">بحث</button>
                           <button onClick={replace} className="flex-1 bg-yellow-100 text-yellow-800 text-xs font-bold py-1.5 rounded">استبدال</button>
                           <button onClick={replaceAll} className="flex-1 bg-yellow-500 text-white text-xs font-bold py-1.5 rounded">الكل</button>
                       </div>
                   </div>
               </div>
           )}

           {viewMode === 'spreadsheet' ? (
             isSheetEmpty() ? (
                <div className="h-full flex flex-col items-center justify-center bg-gray-50 text-center p-6">
                    <div className="bg-white p-10 rounded-3xl shadow-xl max-w-lg w-full border border-gray-100 relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-400 to-teal-500"></div>
                        <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Sparkles className="w-10 h-10 text-emerald-600" />
                        </div>
                        <h2 className="text-3xl font-bold text-gray-800 mb-2">إكسيل AI للمتاجر</h2>
                        <p className="text-gray-500 mb-8 leading-relaxed">
                            أداة الذكاء الاصطناعي لإدارة ملفات <strong>Shopify</strong> و <strong>Google Ads</strong>.<br/>
                            دعم كامل لإصلاح البيانات، التحليل، والامتثال للسياسات.
                        </p>
                        <div className="space-y-3">
                            <label className="flex items-center justify-center gap-3 w-full p-4 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 cursor-pointer transition-all shadow-lg shadow-emerald-200 group">
                                <Upload className="w-6 h-6 group-hover:scale-110 transition-transform" />
                                <span className="font-bold text-lg">رفع ملف منتجات</span>
                                <input type="file" accept=".xlsx, .xls, .csv, .tsv" className="hidden" onChange={handleFileUpload} />
                            </label>
                            <div className="grid grid-cols-2 gap-3">
                                <button onClick={() => applyTemplate('shopify')} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                                    <ShoppingBag size={18} className="text-green-600" />
                                    قالب Shopify
                                </button>
                                <button onClick={() => applyTemplate('google')} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                                    <Globe size={18} className="text-blue-600" />
                                    Google Feed
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
             ) : (
                <Spreadsheet 
                    data={sheetData} 
                    onCellChange={handleCellEdit} 
                    highlightedCell={currentMatch}
                    onDeleteRow={handleDeleteRow}
                    onAddRow={handleAddRow}
                    onAddCol={handleAddCol}
                    onDeleteCol={handleDeleteCol}
                    selectedCell={selectedCell}
                    onSelect={(r, c) => setSelectedCell({ r, c })}
                    readOnly={isLoading}
                />
             )
           ) : (
             <DatabaseView data={sheetData} />
           )}
        </main>
      </div>
    </div>
  );
};

export default App;
