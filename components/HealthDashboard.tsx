import React from 'react';
import { SheetData } from '../types';
import { AlertTriangle, CheckCircle, XCircle, BarChart3, ImageOff, DollarSign, FileText } from 'lucide-react';

interface HealthDashboardProps {
  data: SheetData;
  onClose: () => void;
}

const HealthDashboard: React.FC<HealthDashboardProps> = ({ data, onClose }) => {
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
    let seoIssues = 0; // Titles too long (>150 chars for Google)

    rows.forEach(row => {
      // Check Price
      if (priceIdx === -1 || !row[priceIdx]?.value) missingPrices++;
      
      // Check Image
      if (imageIdx === -1 || !row[imageIdx]?.value) missingImages++;
      
      // Check Description
      if (descIdx === -1 || !row[descIdx]?.value) missingDescriptions++;

      // Check SEO (Google requires title < 150 chars, recommended < 70)
      if (titleIdx !== -1) {
        const title = String(row[titleIdx]?.value || '');
        if (title.length > 150 || title.length < 5) seoIssues++;
      }
    });

    // Calculate Score
    const totalChecks = totalProducts * 4; // 4 metrics per product
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl overflow-hidden animate-in fade-in zoom-in-95">
        {/* Header */}
        <div className="bg-gradient-to-l from-blue-600 to-indigo-700 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-lg">
              <BarChart3 className="w-8 h-8 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">تقرير جودة البيانات</h2>
              <p className="text-blue-100 text-sm">تحليل مدى توافق الملف مع Shopify و Google Merchant</p>
            </div>
          </div>
          <button onClick={onClose} className="bg-white/10 hover:bg-white/20 p-2 rounded-full transition">
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        {/* Body */}
        <div className="p-8">
          
          {/* Main Score */}
          <div className="flex flex-col md:flex-row gap-8 items-center justify-center mb-10">
             <div className="relative w-40 h-40 flex items-center justify-center">
                <svg className="w-full h-full" viewBox="0 0 36 36">
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#e2e8f0" strokeWidth="3" />
                  <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={stats.score > 80 ? "#10b981" : stats.score > 50 ? "#f59e0b" : "#ef4444"} strokeWidth="3" strokeDasharray={`${stats.score}, 100`} className="animate-[spin_1s_ease-out_reverse]" />
                </svg>
                <div className="absolute flex flex-col items-center">
                  <span className="text-4xl font-bold text-gray-800">{stats.score}%</span>
                  <span className="text-xs text-gray-500 font-medium uppercase">الجودة</span>
                </div>
             </div>
             
             <div className="flex-1 w-full grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-red-50 border border-red-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="bg-red-100 p-3 rounded-full text-red-600"><DollarSign size={20} /></div>
                   <div>
                      <p className="text-sm text-gray-500">منتجات بدون سعر</p>
                      <h4 className="text-xl font-bold text-gray-800">{stats.missingPrices}</h4>
                   </div>
                </div>
                <div className="bg-orange-50 border border-orange-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="bg-orange-100 p-3 rounded-full text-orange-600"><ImageOff size={20} /></div>
                   <div>
                      <p className="text-sm text-gray-500">بدون صور</p>
                      <h4 className="text-xl font-bold text-gray-800">{stats.missingImages}</h4>
                   </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="bg-yellow-100 p-3 rounded-full text-yellow-600"><AlertTriangle size={20} /></div>
                   <div>
                      <p className="text-sm text-gray-500">مشاكل SEO (العناوين)</p>
                      <h4 className="text-xl font-bold text-gray-800">{stats.seoIssues}</h4>
                   </div>
                </div>
                <div className="bg-blue-50 border border-blue-100 p-4 rounded-xl flex items-center gap-4">
                   <div className="bg-blue-100 p-3 rounded-full text-blue-600"><FileText size={20} /></div>
                   <div>
                      <p className="text-sm text-gray-500">إجمالي المنتجات</p>
                      <h4 className="text-xl font-bold text-gray-800">{stats.totalProducts}</h4>
                   </div>
                </div>
             </div>
          </div>

          {/* Recommendations */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <h3 className="font-bold text-gray-700 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" />
              التوصيات والخطوات التالية
            </h3>
            <ul className="space-y-3">
               {!stats.hasPriceCol && (
                 <li className="flex items-start gap-2 text-sm text-red-600 bg-red-50 p-2 rounded">
                   <XCircle size={16} className="mt-0.5" /> 
                   لم يتم العثور على عمود "Price". يرجى تسمية العمود بوضوح أو استخدام الذكاء الاصطناعي لإضافته.
                 </li>
               )}
               {stats.missingImages > 0 && (
                 <li className="flex items-start gap-2 text-sm text-gray-700">
                   <span className="text-orange-500">•</span>
                   استخدم ميزة "الإكمال التلقائي" للبحث عن روابط صور للمنتجات المفقودة.
                 </li>
               )}
               {stats.seoIssues > 0 && (
                 <li className="flex items-start gap-2 text-sm text-gray-700">
                   <span className="text-yellow-500">•</span>
                   بعض العناوين طويلة جداً وقد يتم رفضها في Google Ads. اطلب من المساعد "تحسين عناوين المنتجات".
                 </li>
               )}
               {stats.score === 100 && (
                 <li className="flex items-start gap-2 text-sm text-emerald-700 font-bold">
                   <CheckCircle size={16} className="mt-0.5" />
                   الملف يبدو ممتازاً! يمكنك تصديره الآن إلى Shopify أو Google Merchant Center.
                 </li>
               )}
            </ul>
          </div>

        </div>
        
        <div className="bg-gray-50 p-4 border-t flex justify-end">
           <button onClick={onClose} className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition">
             حسناً، فهمت
           </button>
        </div>
      </div>
    </div>
  );
};

export default HealthDashboard;