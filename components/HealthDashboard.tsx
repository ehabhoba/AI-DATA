import React, { useState } from 'react';
import { SheetData } from '../types';
import { AlertTriangle, CheckCircle, XCircle, BarChart3, ImageOff, DollarSign, FileText, Wand2, Globe, Wrench, RotateCw, ArrowLeft, LayoutDashboard } from 'lucide-react';

interface HealthDashboardProps {
  data: SheetData;
  onClose: () => void;
  onFix: (issueType: 'missing_prices' | 'missing_images' | 'seo_issues' | 'all') => void;
}

interface MetricCardProps {
  title: string;
  count: number;
  icon: React.ReactNode;
  theme: 'red' | 'orange' | 'yellow' | 'blue';
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: React.ReactNode;
}

const MetricCard: React.FC<MetricCardProps> = ({ 
  title, count, icon, theme, description, actionLabel, onAction, actionIcon 
}) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const themeStyles = {
    red: { bg: 'bg-red-50', text: 'text-red-600', border: 'border-red-100', btn: 'bg-red-600 hover:bg-red-700 shadow-red-200' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-100', btn: 'bg-orange-600 hover:bg-orange-700 shadow-orange-200' },
    yellow: { bg: 'bg-yellow-50', text: 'text-yellow-600', border: 'border-yellow-100', btn: 'bg-yellow-600 hover:bg-yellow-700 shadow-yellow-200' },
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-100', btn: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200' },
  };

  const s = themeStyles[theme];

  return (
    <div 
      className="group h-56 w-full cursor-pointer [perspective:1000px]"
      onClick={() => setIsFlipped(!isFlipped)}
    >
      <div className={`relative h-full w-full transition-all duration-500 [transform-style:preserve-3d] ${isFlipped ? '[transform:rotateY(180deg)]' : ''}`}>
        
        {/* Front Side */}
        <div className={`absolute inset-0 flex flex-col justify-between rounded-3xl border-2 ${s.border} bg-white p-6 shadow-sm [backface-visibility:hidden] hover:shadow-md transition-all`}>
           <div className="flex items-start justify-between">
              <div className={`rounded-2xl p-3.5 ${s.bg} ${s.text} ring-1 ring-inset ring-black/5`}>
                {icon}
              </div>
              <div className="text-gray-300 transition-colors group-hover:text-gray-400">
                <RotateCw size={20} className="transition-transform duration-700 group-hover:rotate-180" />
              </div>
           </div>
           <div>
              <p className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-1">{title}</p>
              <h4 className="text-4xl font-black text-gray-800 tracking-tight">{count}</h4>
           </div>
           {count > 0 && (
              <div className="h-1.5 w-full bg-gray-100 rounded-full overflow-hidden mt-2">
                 <div className={`h-full ${s.bg.replace('bg-', 'bg-').replace('50', '500')} w-1/3 rounded-full`}></div>
              </div>
           )}
        </div>

        {/* Back Side */}
        <div className={`absolute inset-0 flex flex-col items-center justify-center gap-5 rounded-3xl border-2 ${s.border} bg-white p-6 text-center shadow-inner [backface-visibility:hidden] [transform:rotateY(180deg)]`}>
           <p className="text-sm font-medium text-gray-600 leading-relaxed px-2">{description}</p>
           
           {onAction && count > 0 ? (
             <button 
               onClick={(e) => { e.stopPropagation(); onAction(); }}
               className={`flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-bold text-white shadow-lg transition-transform hover:scale-105 active:scale-95 ${s.btn}`}
             >
                {actionIcon} {actionLabel}
             </button>
           ) : (
             <div className={`flex items-center gap-2 font-bold ${s.text} bg-gray-50 px-4 py-2 rounded-xl`}>
                <CheckCircle size={18} />
                <span>نظيفة 100%</span>
             </div>
           )}
        </div>

      </div>
    </div>
  );
};

const HealthDashboard: React.FC<HealthDashboardProps> = ({ data, onClose, onFix }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const translations = {
    ar: {
      title: "لوحة التحكم والجودة",
      subtitle: "تحليل شامل لبيانات المنتجات والأخطاء",
      quality: "جودة البيانات",
      products: "المنتجات",
      missingPrices: "الأسعار المفقودة",
      missingImages: "الصور المفقودة",
      seoIssues: "مشاكل العناوين",
      fix: "إصلاح الآن",
      fixAll: "إصلاح شامل",
      recommendations: "التوصيات والخطوات التالية",
      recPrice: "لم يتم العثور على عمود السعر. يرجى إضافته.",
      recImg: "استخدم البحث الذكي للعثور على صور المنتجات.",
      recSeo: "العناوين طويلة جداً، قم بتحسينها لتوافق جوجل.",
      perfect: "الملف ممتاز وجاهز للتصدير!",
      close: "إغلاق اللوحة",
      switchLang: "English",
      missingPriceDesc: "وجدنا منتجات ليس لها سعر. انقر للإصلاح التلقائي بتقدير السعر أو وضع قيمة افتراضية.",
      missingImgDesc: "بعض المنتجات تفتقد للصور. يمكننا البحث عنها في جوجل وإضافتها تلقائياً.",
      seoDesc: "العناوين إما قصيرة جداً أو طويلة جداً، مما يضر بظهورك في نتائج البحث.",
      productsDesc: "إجمالي عدد المنتجات في الملف الحالي."
    },
    en: {
      title: "Data Health Dashboard",
      subtitle: "Comprehensive analysis of product data and errors",
      quality: "Data Score",
      products: "Products",
      missingPrices: "Missing Prices",
      missingImages: "Missing Images",
      seoIssues: "SEO Issues",
      fix: "Fix Now",
      fixAll: "Fix All Issues",
      recommendations: "Recommendations & Next Steps",
      recPrice: "Price column not found. Please add it.",
      recImg: "Use Smart Search to find product images.",
      recSeo: "Titles are too long/short. Optimize for Google.",
      perfect: "File looks great! Ready for export.",
      close: "Close Dashboard",
      switchLang: "عربي",
      missingPriceDesc: "Products found without price. Click to auto-estimate or set default.",
      missingImgDesc: "Some products lack images. We can search Google and add them automatically.",
      seoDesc: "Titles are too short or too long, hurting search visibility.",
      productsDesc: "Total number of products in the current file."
    }
  };

  const t = translations[lang];

  // Logic to analyze data quality
  const analyzeData = () => {
    if (!data || data.length < 2) return null;

    const headers = data[0].map(c => String(c?.value || '').toLowerCase());
    const rows = data.slice(1);
    const totalProducts = rows.length;

    // Helper to find column index
    const getColIndex = (keywords: string[]) => headers.findIndex(h => keywords.some(k => h.includes(k)));

    const titleIdx = getColIndex(['title', 'name', 'اسم', 'عنوان']);
    const priceIdx = getColIndex(['price', 'cost', 'سعر', 'variant price']);
    const imageIdx = getColIndex(['image', 'src', 'photo', 'صورة']);
    const descIdx = getColIndex(['desc', 'body', 'وصف']);

    let missingPrices = 0;
    let missingImages = 0;
    let missingDescriptions = 0;
    let seoIssues = 0;

    rows.forEach(row => {
      if (priceIdx === -1 || !row[priceIdx]?.value) missingPrices++;
      if (imageIdx === -1 || !row[imageIdx]?.value) missingImages++;
      if (descIdx === -1 || !row[descIdx]?.value) missingDescriptions++;
      if (titleIdx !== -1) {
        const title = String(row[titleIdx]?.value || '');
        if (title.length > 150 || title.length < 5) seoIssues++;
      }
    });

    const totalChecks = totalProducts * 4;
    const totalErrors = missingPrices + missingImages + missingDescriptions + seoIssues;
    const score = Math.max(0, Math.round(((totalChecks - totalErrors) / totalChecks) * 100));

    return {
      totalProducts,
      missingPrices,
      missingImages,
      missingDescriptions,
      seoIssues,
      score,
      hasTitleCol: titleIdx !== -1,
      hasPriceCol: priceIdx !== -1
    };
  };

  const stats = analyzeData();

  if (!stats) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
      <div className="bg-gray-50 rounded-[2rem] shadow-2xl w-full max-w-6xl overflow-hidden flex flex-col max-h-[95vh] border border-white/20">
        
        {/* Header */}
        <div className="bg-white px-8 py-6 border-b border-gray-100 flex justify-between items-center shrink-0">
          <div className="flex items-center gap-5">
            <div className="bg-gradient-to-br from-slate-800 to-black p-3.5 rounded-2xl shadow-lg shadow-slate-200">
              <LayoutDashboard className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-black text-gray-800 tracking-tight">{t.title}</h2>
              <p className="text-gray-500 font-medium text-sm mt-0.5 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                {t.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
               className="flex items-center gap-2 px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-all text-sm font-bold"
             >
                <Globe size={18} />
                {t.switchLang}
             </button>
             <button 
               onClick={onClose} 
               className="bg-gray-100 hover:bg-red-50 text-gray-500 hover:text-red-600 p-2.5 rounded-xl transition-colors"
             >
               <XCircle className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
          
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 mb-8">
             
             {/* Score Card */}
             <div className="lg:col-span-4 flex flex-col items-center justify-center bg-white p-8 rounded-[2rem] shadow-sm border-2 border-slate-100 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-slate-50 rounded-full -mr-16 -mt-16 pointer-events-none"></div>
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-slate-50 rounded-full -ml-12 -mb-12 pointer-events-none"></div>
                
                <h3 className="text-lg font-bold text-gray-500 uppercase tracking-widest mb-6 z-10">{t.quality}</h3>
                
                <div className="relative w-56 h-56 flex items-center justify-center mb-8 z-10">
                   {/* Background Circle */}
                   <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="2.5" />
                     {/* Progress Circle */}
                     <path 
                        d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" 
                        fill="none" 
                        stroke={stats.score > 80 ? "#10b981" : stats.score > 50 ? "#f59e0b" : "#ef4444"} 
                        strokeWidth="2.5" 
                        strokeDasharray={`${stats.score}, 100`} 
                        strokeLinecap="round"
                        className="animate-[spin_1.5s_ease-out_reverse]" 
                     />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                     <span className={`text-6xl font-black ${stats.score > 80 ? "text-emerald-500" : stats.score > 50 ? "text-amber-500" : "text-red-500"}`}>{stats.score}</span>
                     <span className="text-gray-400 text-lg font-medium">%</span>
                   </div>
                </div>
                
                {stats.score < 100 ? (
                    <button 
                        onClick={() => onFix('all')}
                        className="w-full z-10 bg-slate-900 text-white py-4 px-6 rounded-2xl shadow-xl shadow-slate-200 hover:shadow-2xl transform hover:-translate-y-1 transition-all flex items-center justify-center gap-3 font-bold text-lg group"
                    >
                        <Wand2 size={22} className="group-hover:rotate-12 transition-transform" />
                        {t.fixAll}
                    </button>
                ) : (
                    <div className="w-full z-10 bg-emerald-50 text-emerald-700 py-4 px-6 rounded-2xl border border-emerald-100 flex items-center justify-center gap-3 font-bold text-lg">
                        <CheckCircle size={24} />
                        {t.perfect}
                    </div>
                )}
             </div>

             {/* Metrics Grid (Flashcards) */}
             <div className="lg:col-span-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <MetricCard 
                  title={t.missingPrices}
                  count={stats.missingPrices}
                  icon={<DollarSign size={24} />}
                  theme="red"
                  description={t.missingPriceDesc}
                  actionLabel={t.fix}
                  actionIcon={<Wrench size={18} />}
                  onAction={() => onFix('missing_prices')}
                />

                <MetricCard 
                  title={t.missingImages}
                  count={stats.missingImages}
                  icon={<ImageOff size={24} />}
                  theme="orange"
                  description={t.missingImgDesc}
                  actionLabel={t.fix}
                  actionIcon={<Wand2 size={18} />}
                  onAction={() => onFix('missing_images')}
                />

                <MetricCard 
                  title={t.seoIssues}
                  count={stats.seoIssues}
                  icon={<AlertTriangle size={24} />}
                  theme="yellow"
                  description={t.seoDesc}
                  actionLabel={t.fix}
                  actionIcon={<Wand2 size={18} />}
                  onAction={() => onFix('seo_issues')}
                />

                <MetricCard 
                  title={t.products}
                  count={stats.totalProducts}
                  icon={<FileText size={24} />}
                  theme="blue"
                  description={t.productsDesc}
                />

             </div>
          </div>

          {/* Recommendations List */}
          {(stats.missingPrices > 0 || stats.missingImages > 0 || stats.seoIssues > 0) && (
            <div className="bg-white rounded-[2rem] p-8 border border-gray-100 shadow-sm">
              <h3 className="font-black text-gray-800 mb-6 flex items-center gap-3 text-xl">
                <div className="bg-emerald-100 p-2 rounded-lg text-emerald-600">
                   <CheckCircle className="w-6 h-6" />
                </div>
                {t.recommendations}
              </h3>
              <div className="grid gap-4">
                {!stats.hasPriceCol && (
                  <div className="flex items-center gap-4 text-sm font-medium text-red-700 bg-red-50 p-4 rounded-2xl border border-red-100">
                    <XCircle size={20} className="shrink-0" /> 
                    {t.recPrice}
                  </div>
                )}
                {stats.missingImages > 0 && (
                  <div className="flex items-center gap-4 text-sm font-medium text-orange-800 bg-orange-50 p-4 rounded-2xl border border-orange-100">
                    <span className="w-5 h-5 flex items-center justify-center bg-orange-200 text-orange-700 rounded-full text-xs font-bold">1</span>
                    {t.recImg}
                  </div>
                )}
                {stats.seoIssues > 0 && (
                  <div className="flex items-center gap-4 text-sm font-medium text-yellow-800 bg-yellow-50 p-4 rounded-2xl border border-yellow-100">
                    <span className="w-5 h-5 flex items-center justify-center bg-yellow-200 text-yellow-700 rounded-full text-xs font-bold">2</span>
                    {t.recSeo}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
        
        {/* Footer */}
        <div className="bg-white p-6 border-t border-gray-100 flex justify-between items-center shrink-0">
           <div className="text-xs text-gray-400 font-medium px-4">
             AI Data Analysis Engine v2.4
           </div>
           <button 
             onClick={onClose} 
             className="px-8 py-3 bg-gray-900 text-white rounded-xl hover:bg-black transition-all font-bold shadow-lg hover:shadow-xl flex items-center gap-2"
           >
             <ArrowLeft size={18} />
             {t.close}
           </button>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;