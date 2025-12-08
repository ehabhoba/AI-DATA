import React, { useState, useEffect } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, Menu, X, Link as LinkIcon, Globe, Database, Table, CloudUpload, CheckCircle, AlertCircle } from 'lucide-react';
import Spreadsheet from './components/Spreadsheet';
import Chat from './components/Chat';
import DatabaseView from './components/DatabaseView';
import { SheetData, Message, OperationType, Cell, ViewMode } from './types';
import { readExcelFile, exportExcelFile, generateEmptySheet, fetchCsvFromUrl } from './services/excelService';
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
        text: 'مرحباً! أنا "إكسيل AI برو".\nبصفتي مهندس قواعد بيانات، يمكنني:\n- إنشاء جداول بيانات ونظم محاسبية.\n- تحويل بياناتك إلى قاعدة بيانات API.\n- البحث في الإنترنت عن بيانات حقيقية.\n\nجرب أن تقول: "أنشئ جدول للموظفين مع الرواتب" أو "ابحث عن أسعار العملات".',
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

  // 3. Publish to Cloud (Vercel KV) Function
  const handlePublishToCloud = async () => {
    setIsSaving(true);
    try {
      // Convert current sheet to JSON Structure for the API
      const jsonData = sheetToJson(sheetData);
      
      const response = await fetch('/api/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(jsonData),
      });

      if (!response.ok) {
        throw new Error('Failed to save to cloud');
      }

      setLastSaved(Date.now());
      addMessage('model', 'تم نشر البيانات بنجاح! الـ API الخاص بك تم تحديثه الآن بالبيانات الجديدة.');
    } catch (error) {
      console.error("Cloud Save Error:", error);
      addMessage('model', 'فشل في نشر البيانات. تأكد من تفعيل Vercel KV في لوحة التحكم (Storage > Create Database).', true);
    } finally {
      setIsSaving(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      try {
        const data = await readExcelFile(file);
        setSheetData(data);
        addMessage('model', `تم تحميل الملف "${file.name}" بنجاح! يمكنك الآن استعراضه كقاعدة بيانات.`);
      } catch (error) {
        console.error("File upload error", error);
        addMessage('model', 'حدث خطأ أثناء قراءة الملف. يرجى التأكد من أن الملف سليم.', true);
      }
    }
  };

  const handleUrlImport = async () => {
    if (!urlInput.trim()) return;
    setIsLoading(true);
    setShowUrlInput(false);
    try {
      const data = await fetchCsvFromUrl(urlInput);
      setSheetData(data);
      addMessage('model', 'تم استيراد البيانات من الرابط بنجاح! انتقل إلى وضع "قاعدة البيانات" لرؤية الـ API.');
    } catch (error) {
      console.error(error);
      addMessage('model', 'فشل في استيراد الرابط. تأكد أن الرابط عام ومباشر (CSV أو Google Sheet Published as CSV).', true);
    } finally {
      setIsLoading(false);
      setUrlInput('');
    }
  };

  const handleExport = () => {
    exportExcelFile(sheetData, 'SmartExcel_Database.xlsx');
    addMessage('model', 'تم تحميل الملف بنجاح!');
  };

  const handleNewSheet = () => {
    if (window.confirm("هل أنت متأكد؟ سيتم مسح البيانات الحالية.")) {
      setSheetData(generateEmptySheet(20, 10));
      localStorage.removeItem('excel_ai_local_data'); // Clear local storage too
      addMessage('model', 'تم إنشاء ورقة عمل جديدة فارغة.');
    }
  };

  const handleCellEdit = (rowIndex: number, colIndex: number, value: string) => {
    const newData = [...sheetData];
    // Ensure the row exists
    if (!newData[rowIndex]) {
        newData[rowIndex] = [];
    }
    // Create a copy of the row to avoid mutation
    newData[rowIndex] = [...newData[rowIndex]];

    // Ensure the row is long enough
    while (newData[rowIndex].length <= colIndex) {
      newData[rowIndex].push({ value: "", style: {} });
    }

    // Try to auto-detect number type
    let typedValue: string | number = value;
    if (value !== '' && !isNaN(Number(value)) && !value.startsWith('0')) {
       // Avoid converting "01" to 1, but convert "100" to 100
       // If strict preservation is needed, we can keep as string. 
       // For now, enabling math capabilities by converting to number.
       typedValue = Number(value);
    }
    // Restore keeping "0" as number
    if (value === '0') typedValue = 0;

    newData[rowIndex][colIndex] = {
      ...newData[rowIndex][colIndex],
      value: typedValue
    };
    setSheetData(newData);
  };

  const addMessage = (role: 'user' | 'model', text: string, isError: boolean = false) => {
    setMessages(prev => [...prev, { role, text, isError, timestamp: Date.now() }]);
  };

  const handleSendMessage = async (text: string) => {
    addMessage('user', text);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(text, sheetData);
      
      // Execute Operations
      let newData: SheetData = sheetData.map(row => row.map(cell => ({ ...cell, style: { ...cell.style } })));

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
            while (newData[r].length <= c) {
              newData[r].push({ value: "", style: {} });
            }
          };

          if (op.type === OperationType.SET_DATA && op.data) {
             newData = op.data.map(row => row.map(val => ({ value: val, style: {} })));
          } 
          else if (op.type === OperationType.SET_CELL || op.type === OperationType.FORMAT_CELL) {
            if (op.row !== undefined && op.col !== undefined) {
              ensureDimensions(op.row, op.col);
              const cell = newData[op.row][op.col];
              if (op.type === OperationType.SET_CELL && op.value !== undefined) {
                cell.value = op.value;
              }
              if (op.style) {
                cell.style = { ...cell.style, ...op.style };
              }
            }
          } 
          else if (op.type === OperationType.ADD_ROW && op.data) {
             if (Array.isArray(op.data)) {
                op.data.forEach(rowData => {
                   const newRow: Cell[] = rowData.map(val => ({ value: val, style: {} }));
                   newData.push(newRow);
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
    <div className="flex h-screen w-full overflow-hidden bg-gray-100 font-sans" dir="rtl">
      
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
                Database Engine
              </span>
            </div>
          </div>

          {/* Sync Button */}
          <button
            onClick={handlePublishToCloud}
            disabled={isSaving}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm
              ${lastSaved ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-purple-600 text-white hover:bg-purple-700'}
              ${isSaving ? 'opacity-70 cursor-wait' : ''}
            `}
          >
            {isSaving ? <CloudUpload className="animate-pulse w-4 h-4" /> : lastSaved ? <CheckCircle className="w-4 h-4" /> : <Database className="w-4 h-4" />}
            {isSaving ? 'جاري النشر...' : lastSaved ? 'تم التحديث' : 'نشر للـ API'}
          </button>

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
              <span className="hidden sm:inline">الجداول</span>
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
              <span className="hidden sm:inline">قاعدة البيانات</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              id="file-upload"
              className="hidden"
              onChange={handleFileUpload}
            />
            
            <button onClick={handleNewSheet} className="p-2 text-gray-600 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg" title="جديد"><Plus size={20} /></button>
            <button onClick={() => setShowUrlInput(true)} className="p-2 text-gray-600 hover:text-purple-600 hover:bg-purple-50 rounded-lg" title="استيراد رابط"><LinkIcon size={20} /></button>
            <label htmlFor="file-upload" className="cursor-pointer p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg" title="رفع"><Upload size={20} /></label>
            <button onClick={handleExport} className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg" title="تصدير"><Download size={20} /></button>
          </div>
        </header>

        {showUrlInput && (
          <div className="absolute inset-0 bg-black/20 z-50 flex items-start justify-center pt-20 backdrop-blur-sm">
            <div className="bg-white p-6 rounded-xl shadow-2xl w-full max-w-md mx-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="font-bold text-lg flex items-center gap-2">
                  <Globe className="w-5 h-5 text-purple-600" />
                  استيراد من رابط
                </h3>
                <button onClick={() => setShowUrlInput(false)} className="text-gray-400 hover:text-red-500">
                  <X size={20} />
                </button>
              </div>
              <input
                type="text"
                placeholder="https://docs.google.com/.../export?format=csv"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                className="w-full border border-gray-300 rounded-lg p-3 mb-4 focus:ring-2 focus:ring-purple-500 outline-none text-left"
                dir="ltr"
              />
              <div className="flex justify-end gap-2">
                <button onClick={() => setShowUrlInput(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">إلغاء</button>
                <button onClick={handleUrlImport} disabled={isLoading} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">استيراد</button>
              </div>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-hidden bg-gray-100 flex flex-col relative">
          {viewMode === 'spreadsheet' ? (
             <div className="flex-1 p-4 overflow-hidden">
                <Spreadsheet data={sheetData} onCellChange={handleCellEdit} />
             </div>
          ) : (
             <div className="flex-1 overflow-hidden h-full">
                <DatabaseView data={sheetData} />
             </div>
          )}
        </main>
        
        <footer className="bg-white border-t border-gray-200 px-4 py-2 text-xs text-gray-500 flex justify-between items-center">
           <span className="flex items-center gap-1">
             <span className={`w-2 h-2 rounded-full animate-pulse ${viewMode === 'database' ? 'bg-purple-500' : 'bg-green-500'}`}></span>
             {viewMode === 'spreadsheet' ? 'Editor Online' : 'DB Engine Active'}
           </span>
           <span className="font-mono">R: {sheetData.length} | C: {sheetData[0]?.length || 0}</span>
        </footer>

      </div>
    </div>
  );
};

export default App;