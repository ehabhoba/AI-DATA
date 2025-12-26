
import React, { useState, useEffect, useRef } from 'react';
import { Upload, Download, FileSpreadsheet, Plus, Menu, X, Database, Search, Sparkles, BrainCircuit, Zap, FileJson, ShoppingBag, ShoppingCart, Save } from 'lucide-react';
import Spreadsheet from './components/Spreadsheet';
import Chat from './components/Chat';
import { SheetData, Message, ViewMode } from './types';
import { readExcelFile, exportExcelFile, exportJsonFile, generateEmptySheet, getShopifyTemplate, getEasyOrderTemplate } from './services/excelService';
import { sendMessageToGemini } from './services/geminiService';

const App: React.FC = () => {
  const [sheetData, setSheetData] = useState<SheetData>(generateEmptySheet(20, 10));
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem('excel_ai_pro_data');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setSheetData(parsed);
      } catch (e) { console.error("Restore failed", e); }
    }
  }, []);

  const autoSave = (data: SheetData) => {
    setIsAutoSaving(true);
    localStorage.setItem('excel_ai_pro_data', JSON.stringify(data));
    setTimeout(() => setIsAutoSaving(false), 1500);
  };

  const handleSendMessage = async (text: string, image?: string, isDeepThink?: boolean, isFast?: boolean) => {
    const userMsg: Message = { role: 'user', text, image, timestamp: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsLoading(true);

    try {
      const response = await sendMessageToGemini(text, sheetData, false, image, isDeepThink, isFast);
      
      if (response.operations?.length > 0) {
        let newData = [...sheetData];
        response.operations.forEach(op => {
          if (op.type === 'SET_DATA' && op.data) {
             newData = op.data.map(row => row.map(val => ({ value: val, style: {} })));
          }
        });
        setSheetData(newData);
        autoSave(newData);
      }

      const modelMsg: Message = { 
        role: 'model', 
        text: response.message, 
        image: response.image, // Supports AI-edited product images
        timestamp: Date.now() 
      };
      setMessages(prev => [...prev, modelMsg]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'model', text: 'عذراً، حدث خطأ في معالجة طلبك.', isError: true, timestamp: Date.now() }]);
    } finally {
      setIsLoading(false);
    }
  };

  const isSheetEmpty = () => !sheetData.some(row => row?.some(cell => cell?.value !== ''));

  return (
    <div className="flex h-screen w-full overflow-hidden bg-slate-100 font-sans" dir="rtl">
      {/* Sidebar / Chat */}
      <div className={`${isSidebarOpen ? 'w-full md:w-[400px]' : 'w-0'} transition-all duration-500 bg-white border-l z-40 overflow-hidden flex flex-col`}>
        <Chat messages={messages} onSendMessage={handleSendMessage} isLoading={isLoading} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shadow-sm z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} className="p-2 hover:bg-slate-100 rounded-xl transition-colors">
              {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
            <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-emerald-100">
                    <FileSpreadsheet size={24} />
                </div>
                <div>
                    <h1 className="font-black text-slate-800 text-lg tracking-tight">ExcelAI Pro <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full mr-2">v4.0 Bulk</span></h1>
                    {isAutoSaving && <span className="text-[10px] text-emerald-500 animate-pulse flex items-center gap-1"><Save size={10} /> تم الحفظ...</span>}
                </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => exportExcelFile(sheetData)} className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-black transition-all shadow-md">
                <Download size={16} /> تصدير Excel
            </button>
            <button onClick={() => exportJsonFile(sheetData)} className="p-2 bg-slate-100 text-purple-600 rounded-xl hover:bg-purple-50 transition-colors" title="Export JSON">
                <FileJson size={20} />
            </button>
            <div className="h-8 w-px bg-slate-200 mx-2 hidden md:block"></div>
            <input type="file" id="bulk-upload" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0];
              if(f) {
                const data = await readExcelFile(f);
                setSheetData(data);
                autoSave(data);
              }
            }} />
            <label htmlFor="bulk-upload" className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl cursor-pointer font-bold text-sm shadow-xl shadow-emerald-100 hover:bg-emerald-700 active:scale-95 transition-all">
                <Upload size={18} /> رفع كميات كبيرة
            </label>
          </div>
        </header>

        <main className="flex-1 overflow-hidden relative bg-slate-50 p-4">
           {isSheetEmpty() ? (
              <div className="h-full flex items-center justify-center animate-in fade-in zoom-in duration-500">
                  <div className="bg-white p-12 rounded-[2.5rem] shadow-2xl max-w-2xl w-full text-center border border-white">
                      <div className="w-24 h-24 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-inner">
                        <Sparkles className="w-12 h-12 animate-pulse" />
                      </div>
                      <h2 className="text-3xl font-black text-slate-800 mb-4">معالج المنتجات الاحترافي</h2>
                      <p className="text-slate-500 mb-10 leading-relaxed">ارفع ملف JSON الضخم الذي تملكه أو ملف Excel، وسأقوم بتنظيمه، تصحيح أسعاره، وتحسين أوصاف منتجاتك باستخدام أحدث تقنيات الذكاء الاصطناعي.</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <button onClick={() => setSheetData(getShopifyTemplate())} className="p-5 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-black transition-all group shadow-xl shadow-slate-200">
                            <ShoppingBag className="group-hover:rotate-12 transition-transform" /> قالب Shopify
                        </button>
                        <button onClick={() => setSheetData(getEasyOrderTemplate())} className="p-5 bg-orange-600 text-white rounded-2xl font-bold flex items-center justify-center gap-3 hover:bg-orange-700 transition-all group shadow-xl shadow-orange-100">
                            <ShoppingCart className="group-hover:rotate-12 transition-transform" /> قالب Easy Order
                        </button>
                      </div>
                  </div>
              </div>
           ) : (
              <div className="h-full bg-white rounded-3xl shadow-xl border border-slate-200 overflow-hidden">
                <Spreadsheet 
                  data={sheetData} 
                  onCellChange={(r, c, v) => {
                    const d = [...sheetData];
                    if(d[r]) {
                      d[r][c] = { value: v, style: {} };
                      setSheetData(d);
                      autoSave(d);
                    }
                  }} 
                />
              </div>
           )}
        </main>
      </div>
    </div>
  );
};

export default App;
