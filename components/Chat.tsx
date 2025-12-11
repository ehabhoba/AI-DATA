import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Loader2, Sparkles, Search, Image as ImageIcon, X, Paperclip } from 'lucide-react';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string, image?: string) => void;
  isLoading: boolean;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      onSendMessage(input, selectedImage || undefined);
      setInput('');
      setSelectedImage(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-5 h-5" />
          المساعد الذكي
        </h2>
        <p className="text-emerald-100 text-xs mt-1">
          خبير إصلاح البيانات، Shopify، والبحث الذكي
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10 space-y-4">
            <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center shadow-sm">
                <Search className="w-8 h-8 text-emerald-500" />
            </div>
            <p className="text-sm font-medium text-gray-600">كيف يمكنني مساعدتك في بياناتك؟</p>
            <div className="flex flex-col gap-2 text-xs">
               <button onClick={() => onSendMessage("افحص الملف وأصلح الأخطاء والبيانات المفقودة", undefined)} className="bg-white border hover:bg-emerald-50 p-2 rounded text-emerald-700 transition text-right">
                  "افحص الملف وأصلح البيانات المفقودة"
               </button>
               <button onClick={() => onSendMessage("تأكد من توافق الأعمدة مع Shopify وصححها", undefined)} className="bg-white border hover:bg-emerald-50 p-2 rounded text-emerald-700 transition text-right">
                  "تصحيح الملف لـ Shopify"
               </button>
               <button onClick={() => fileInputRef.current?.click()} className="bg-white border hover:bg-emerald-50 p-2 rounded text-emerald-700 transition text-right flex items-center justify-end gap-2">
                  <ImageIcon size={14} />
                  "استخراج بيانات من صورة فاتورة/منتج"
               </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              {msg.image && (
                <img src={msg.image} alt="User upload" className="max-w-full rounded-lg mb-2 border border-white/20" style={{maxHeight: '200px'}} />
              )}
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-gray-500 text-sm">جاري الفحص والمعالجة...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-3 border-t border-gray-100 bg-white">
        
        {/* Image Preview */}
        {selectedImage && (
          <div className="relative inline-block mb-2">
            <img src={selectedImage} alt="Preview" className="h-16 rounded-lg border border-gray-200" />
            <button 
              onClick={() => setSelectedImage(null)}
              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-0.5 shadow-md hover:bg-red-600"
            >
              <X size={12} />
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input 
            type="file" 
            ref={fileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleImageSelect}
          />
          
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-2 text-gray-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors"
            title="رفع صورة (منتج، فاتورة)"
          >
            <Paperclip size={20} />
          </button>

          <div className="relative flex-1">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="اكتب طلبك... (مثلاً: أصلح التواريخ)"
              disabled={isLoading}
              className="w-full px-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all text-sm"
            />
          </div>
          
          <button
            type="submit"
            disabled={(!input.trim() && !selectedImage) || isLoading}
            className="p-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md shadow-emerald-200"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;