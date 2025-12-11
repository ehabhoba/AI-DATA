import React, { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, Menu, X, Link as LinkIcon, Globe, Database, Table, CloudUpload, CheckCircle, AlertCircle, Search, Replace, Sparkles, BrainCircuit, FileCode, ShieldCheck, ShieldAlert, Wand2 } from 'lucide-react';
import Spreadsheet from './components/Spreadsheet';
import Chat from './components/Chat';
import DatabaseView from './components/DatabaseView';
import { SheetData, Message, OperationType, Cell, ViewMode } from './types';
import { readExcelFile, exportExcelFile, exportTsvFile, generateEmptySheet, fetchCsvFromUrl } from './services/excelService';
import { sendMessageToGemini } from './services/geminiService';
import { sheetToJson } from './services/databaseService';

const App: React.FC = () => {
  const [sheetData, setSheetData] = useState<SheetData>(generateEmptySheet(20, 10));
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [urlInput, setUrlInput] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('spreadsheet');
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<number | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  
  // New: Google Policy Mode State
  const [policyMode, setPolicyMode] = useState(false);

  // Find and Replace State
  const [showFindReplace, setShowFindReplace] = useState(false);
  const [findText, setFindText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [currentMatch, setCurrentMatch] = useState<{r: number, c: number} | null>(null);

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
        text: 'مرحباً! أنا "إكسيل AI برو" - خبيرك الشامل.\n\n✨ **جديد: ميزة الإكمال التلقائي!**\nيمكنني الآن البحث عن منتجاتك في الإنترنت وتعبئة الخانات الفارغة (الوصف، الأسعار، الصور، الباركود) ببيانات حقيقية.\n\nاضغط على زر العصا السحرية (إكمال تلقائي) لتجربتها!',
        timestamp: Date.now()
      }
    ]);
  }, []);

  // 2. Save to LocalStorage whenever data changes (Auto-save locally)
  useEffect(() => {
    if (sheetData && sheetData.length > 0) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem('excel_ai_local_data', JSON.stringify(sheetData));
      }, 1000); // Debounce save
      return () => clearTimeout(timeoutId);
    }
  }, [sheetData]);

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
      addMessage('model', 'تم نشر البيانات بنجاح! الـ API جاهز.');
    } catch (error) {
      console.error("Cloud Save Error:", error);
      addMessage('model', 'فشل في نشر البيانات. تأكد من إعداد قاعدة البيانات.', true);
    } finally {
      setIsSaving(false);
    }
  };

  const processFile = async (file: File) => {
    try {
      const data = await readExcelFile(file);
      setSheetData(data);
      addMessage('model', `تم تحميل "${file.name}".`);
      
      // Auto-trigger AI analysis
      setTimeout(() => {
          handleSendMessage(`تم تحميل الملف (${file.name}). قم بتحليله واستخراج البيانات الهامة. هل يصلح لـ Shopify أو Google Merchant؟`, undefined);
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
      setSheetData(data);
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

  const handleNewSheet = () => {
    if (window.confirm("هل أنت متأكد؟ سيتم مسح البيانات الحالية.")) {
      setSheetData(generateEmptySheet(20, 10));
      localStorage.removeItem('excel_ai_local_data'); 
      addMessage('model', 'تم إنشاء ورقة عمل جديدة فارغة.');
    }
  };

  const handleSmartAnalysis = () => {
    handleSendMessage("قم بإجراء فحص شامل للملف. استخرج البيانات المفقودة، تحقق من الامتثال لسياسات جوجل وشوبيفاي، واقترح التحسينات.", undefined);
  };

  const handleAutoComplete = () => {
    handleSendMessage("قم بعملية (الإكمال التلقائي الذكي): اقرأ أسماء المنتجات الموجودة، وابحث في الإنترنت عن مواصفاتها الحقيقية (الوصف، الوزن، الباركود، السعر). املأ الخانات الفارغة ببيانات حقيقية 100% فقط.", undefined);
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
    setSheetData(newData);
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
  };

  const addMessage = (role: 'user' | 'model', text: string, isError: boolean = false, image?: string) => {
    setMessages(prev => [...prev, { role, text, isError, image, timestamp: Date.now() }]);
  };

  const handleSendMessage = async (text: string, image?: string) => {
    addMessage('user', text, false, image);
    setIsLoading(true);

    try {
      // Pass policyMode to the service
      const response = await sendMessageToGemini(text, sheetData, policyMode, image);
      
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
        });
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

  return (
    <div 
      className="flex h-screen w-full overflow-hidden bg-gray-100 font-sans relative" 
      dir="rtl"
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      
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

               <button 
                onClick={handleAutoComplete}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-teal-400 to-emerald-500 text-white rounded-lg hover:shadow-lg hover:shadow-teal-200 transition-all font-bold text-sm"
                title="إكمال تلقائي للبيانات"
              >
                  <Wand2 size={16} />
                  إكمال تلقائي
              </button>

              <button 
                onClick={handleSmartAnalysis}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-purple-500 to-indigo-600 text-white rounded-lg hover:shadow-lg hover:shadow-purple-200 transition-all font-bold text-sm"
              >
                  <BrainCircuit size={16} />
                  تحليل ذكي
              </button>
              
              <button
                onClick={handlePublishToCloud}
                disabled={isSaving}
                className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-bold text-sm transition-all shadow-sm border
                  ${lastSaved ? 'bg-green-50 text-green-700 border-green-200' : 'bg-white text-gray-700 hover:bg-gray-50 border-gray-200'}
                  ${isSaving ? 'opacity-70 cursor-wait' : ''}
                `}
              >
                {isSaving ? <CloudUpload className="animate-pulse w-4 h-4" /> : lastSaved ? <CheckCircle className="w-4 h-4" /> : <Database className="w-4 h-4" />}
                {isSaving ? 'نشر' : 'حفظ سحابي'}
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
            <button onClick={handleNewSheet} className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="جديد"><Plus size={20} /></button>
            <button onClick={() => setShowUrlInput(true)} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="استيراد رابط"><LinkIcon size={20} /></button>
            <label htmlFor="file-upload" className="cursor-pointer p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="رفع"><Upload size={20} /></label>
            <div className="flex bg-gray-50 rounded-lg border border-gray-200">
                <button onClick={handleExport} className="p-2 text-green-700 hover:bg-green-100 rounded-r-lg border-l" title="تصدير Excel"><Download size={20} /></button>
                <button onClick={handleExportTsv} className="p-2 text-blue-700 hover:bg-blue-100 rounded-l-lg" title="تصدير TSV"><FileCode size={20} /></button>
            </div>
          </div>
        </header>

        {showUrlInput && (
          <div className="bg-white border-b border-purple-100 p-4 animate-in slide-in-from-top-2">
            <div className="flex gap-2 max-w-2xl mx-auto">
              <input type="text" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="أدخل رابط CSV أو TSV..." className="flex-1 p-2 border border-gray-300 rounded-lg outline-none" />
              <button onClick={handleUrlImport} disabled={isLoading} className="bg-purple-600 text-white px-4 py-2 rounded-lg">استيراد</button>
              <button onClick={() => setShowUrlInput(false)} className="text-gray-500"><X size={20} /></button>
            </div>
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
                                <button onClick={() => handleSendMessage("أنشئ ملف منتجات Shopify تجريبي", undefined)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                                    <FileSpreadsheet size={18} />
                                    قالب Shopify
                                </button>
                                <button onClick={() => handleSendMessage("أنشئ Google Merchant Feed لمنتجات إلكترونية", undefined)} className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium text-sm">
                                    <Globe size={18} />
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