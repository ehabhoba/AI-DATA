import React, { useState } from 'react';
import { SheetData } from '../types';
import { AlertTriangle, CheckCircle, XCircle, BarChart3, ImageOff, DollarSign, FileText, Wand2, Globe, Wrench } from 'lucide-react';

interface HealthDashboardProps {
  data: SheetData;
  onClose: () => void;
  onFix: (issueType: 'missing_prices' | 'missing_images' | 'seo_issues' | 'all') => void;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ data, onClose, onFix }) => {
  const [lang, setLang] = useState<'ar' | 'en'>('ar');

  const translations = {
    ar: {
      title: "تقرير جودة البيانات",
      subtitle: "تحليل التوافق مع Shopify و Google Merchant",
      quality: "جودة البيانات",
      products: "إجمالي المنتجات",
      missingPrices: "بدون سعر",
      missingImages: "بدون صور",
      seoIssues: "مشاكل SEO",
      fix: "إصلاح تلقائي",
      fixAll: "إصلاح شامل لكافة الأخطاء",
      recommendations: "التوصيات والخطوات التالية",
      recPrice: "لم يتم العثور على عمود السعر. يرجى إضافته.",
      recImg: "استخدم البحث الذكي للعثور على صور المنتجات.",
      recSeo: "العناوين طويلة جداً، قم بتحسينها لتوافق جوجل.",
      perfect: "الملف ممتاز وجاهز للتصدير!",
      close: "إغلاق",
      switchLang: "English",
      missingPriceDesc: "منتجات تفتقر للسعر",
      missingImgDesc: "منتجات تفتقر للصور",
      seoDesc: "عناوين غير محسنة"
    },
    en: {
      title: "Data Quality Report",
      subtitle: "Compatibility Analysis for Shopify & Google Merchant",
      quality: "Data Quality",
      products: "Total Products",
      missingPrices: "Missing Prices",
      missingImages: "Missing Images",
      seoIssues: "SEO Issues",
      fix: "Auto Fix",
      fixAll: "Fix All Issues Automatically",
      recommendations: "Recommendations & Next Steps",
      recPrice: "Price column not found. Please add it.",
      recImg: "Use Smart Search to find product images.",
      recSeo: "Titles are too long/short. Optimize for Google.",
      perfect: "File looks great! Ready for export.",
      close: "Close",
      switchLang: "عربي",
      missingPriceDesc: "Products without price",
      missingImgDesc: "Products without images",
      seoDesc: "Unoptimized titles"
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
            <div className="bg-white/10 p-3 rounded-xl backdrop-blur-md">
              <BarChart3 className="w-8 h-8 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-2xl font-bold font-sans">{t.title}</h2>
              <p className="text-slate-300 text-sm flex items-center gap-2">
                <CheckCircle size={14} className="text-emerald-400" />
                {t.subtitle}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
             <button 
               onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
               className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition text-sm font-medium"
             >
                <Globe size={16} />
                {t.switchLang}
             </button>
             <button onClick={onClose} className="bg-white/10 hover:bg-red-500/80 p-2 rounded-full transition duration-300">
               <XCircle className="w-6 h-6" />
             </button>
          </div>
        </div>

        {/* Body - Scrollable */}
        <div className="p-8 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-10">
             
             {/* Score Circle */}
             <div className="lg:col-span-1 flex flex-col items-center justify-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
                <div className="relative w-48 h-48 flex items-center justify-center mb-4">
                   <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#f1f5f9" strokeWidth="3" />
                     <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={stats.score > 80 ? "#10b981" : stats.score > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${stats.score}, 100`} className="animate-[spin_1.5s_ease-out_reverse]" />
                   </svg>
                   <div className="absolute flex flex-col items-center">
                     <span className={`text-5xl font-bold ${stats.score > 80 ? "text-emerald-500" : stats.score > 50 ? "text-amber-500" : "text-red-500"}`}>{stats.score}%</span>
                     <span className="text-sm text-gray-400 font-medium uppercase mt-1">{t.quality}</span>
                   </div>
                </div>
                
                {stats.score < 100 && (
                    <button 
                        onClick={() => onFix('all')}
                        className="w-full mt-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 px-4 rounded-xl shadow-lg shadow-emerald-200 hover:shadow-xl transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-bold animate-pulse"
                    >
                        <Wand2 size={20} />
                        {t.fixAll}
                    </button>
                )}
             </div>

             {/* Stats Grid */}
             <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Metric Card: Prices */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-4 mb-2">
                      <div className="bg-red-50 p-3 rounded-full text-red-600"><DollarSign size={20} /></div>
                      <div>
                         <p className="text-sm text-gray-500">{t.missingPrices}</p>
                         <h4 className="text-2xl font-bold text-gray-800">{stats.missingPrices}</h4>
                      </div>
                   </div>
                   {stats.missingPrices > 0 && (
                       <button onClick={() => onFix('missing_prices')} className="mt-2 text-xs bg-red-50 text-red-700 py-1.5 px-3 rounded-lg hover:bg-red-100 transition flex items-center justify-center gap-1 font-bold">
                           <Wrench size={12} /> {t.fix}
                       </button>
                   )}
                </div>

                {/* Metric Card: Images */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-4 mb-2">
                      <div className="bg-orange-50 p-3 rounded-full text-orange-600"><ImageOff size={20} /></div>
                      <div>
                         <p className="text-sm text-gray-500">{t.missingImages}</p>
                         <h4 className="text-2xl font-bold text-gray-800">{stats.missingImages}</h4>
                      </div>
                   </div>
                    {stats.missingImages > 0 && (
                       <button onClick={() => onFix('missing_images')} className="mt-2 text-xs bg-orange-50 text-orange-700 py-1.5 px-3 rounded-lg hover:bg-orange-100 transition flex items-center justify-center gap-1 font-bold">
                           <Wand2 size={12} /> {t.fix}
                       </button>
                   )}
                </div>

                {/* Metric Card: SEO */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex flex-col justify-between">
                   <div className="flex items-center gap-4 mb-2">
                      <div className="bg-yellow-50 p-3 rounded-full text-yellow-600"><AlertTriangle size={20} /></div>
                      <div>
                         <p className="text-sm text-gray-500">{t.seoIssues}</p>
                         <h4 className="text-2xl font-bold text-gray-800">{stats.seoIssues}</h4>
                      </div>
                   </div>
                   {stats.seoIssues > 0 && (
                       <button onClick={() => onFix('seo_issues')} className="mt-2 text-xs bg-yellow-50 text-yellow-700 py-1.5 px-3 rounded-lg hover:bg-yellow-100 transition flex items-center justify-center gap-1 font-bold">
                           <Wand2 size={12} /> {t.fix}
                       </button>
                   )}
                </div>

                {/* Metric Card: Total */}
                <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm flex items-center gap-4">
                   <div className="bg-blue-50 p-3 rounded-full text-blue-600"><FileText size={20} /></div>
                   <div>
                      <p className="text-sm text-gray-500">{t.products}</p>
                      <h4 className="text-2xl font-bold text-gray-800">{stats.totalProducts}</h4>
                   </div>
                </div>

             </div>
          </div>

          {/* Recommendations List */}
          <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-lg">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              {t.recommendations}
            </h3>
            <ul className="space-y-3">
               {!stats.hasPriceCol && (
                 <li className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-3 rounded-lg">
                   <XCircle size={16} className="mt-0.5 shrink-0" /> 
                   {t.recPrice}
                 </li>
               )}
               {stats.missingImages > 0 && (
                 <li className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                   <span className="text-orange-500 font-bold">•</span>
                   {t.recImg}
                 </li>
               )}
               {stats.seoIssues > 0 && (
                 <li className="flex items-start gap-2 text-sm text-gray-700 bg-gray-50 p-3 rounded-lg">
                   <span className="text-yellow-500 font-bold">•</span>
                   {t.recSeo}
                 </li>
               )}
               {stats.score === 100 && (
                 <li className="flex items-start gap-2 text-sm text-emerald-700 font-bold bg-emerald-50 p-3 rounded-lg">
                   <CheckCircle size={16} className="mt-0.5 shrink-0" />
                   {t.perfect}
                 </li>
               )}
            </ul>
          </div>
        </div>
        
        {/* Footer */}
        <div className="bg-gray-50 p-4 border-t flex justify-end shrink-0">
           <button onClick={onClose} className="px-8 py-2.5 bg-slate-800 text-white rounded-lg hover:bg-slate-900 transition font-medium shadow-md">
             {t.close}
           </button>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;