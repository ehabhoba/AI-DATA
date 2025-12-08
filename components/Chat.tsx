import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Loader2, Sparkles, Search } from 'lucide-react';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input);
      setInput('');
    }
  };

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Header */}
      <div className="p-4 border-b border-gray-100 bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-sm">
        <h2 className="flex items-center gap-2 font-bold text-lg">
          <Sparkles className="w-5 h-5" />
          مساعد الذكاء الاصطناعي
        </h2>
        <p className="text-emerald-100 text-xs mt-1">
          اطلب إنشاء جداول، البحث في الويب، أو تحليل البيانات
        </p>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
        {messages.length === 0 && (
          <div className="text-center text-gray-400 mt-10 space-y-4">
            <div className="bg-white p-4 rounded-full w-16 h-16 mx-auto flex items-center justify-center shadow-sm">
                <Search className="w-8 h-8 text-emerald-500" />
            </div>
            <p>كيف يمكنني مساعدتك في ملف الإكسيل اليوم؟</p>
            <div className="flex flex-col gap-2 text-sm">
               <button onClick={() => onSendMessage("أنشئ لي نظام محاسبي بسيط")} className="bg-white border hover:bg-emerald-50 p-2 rounded text-emerald-700 transition">
                  "أنشئ لي نظام محاسبي بسيط"
               </button>
               <button onClick={() => onSendMessage("ابحث عن أسعار الذهب اليوم وضعها في الجدول")} className="bg-white border hover:bg-emerald-50 p-2 rounded text-emerald-700 transition">
                  "ابحث عن أسعار الذهب وضعها في الجدول"
               </button>
            </div>
          </div>
        )}
        
        {messages.map((msg, idx) => (
          <div
            key={idx}
            className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[85%] rounded-2xl p-3 shadow-sm whitespace-pre-wrap ${
                msg.role === 'user'
                  ? 'bg-emerald-600 text-white rounded-br-none'
                  : 'bg-white text-gray-800 border border-gray-200 rounded-bl-none'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-white p-3 rounded-2xl rounded-bl-none border border-gray-200 shadow-sm flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              <span className="text-gray-500 text-sm">جاري المعالجة...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-100 bg-white">
        <div className="relative flex items-center">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="اكتب طلبك هنا..."
            disabled={isLoading}
            className="w-full pl-12 pr-4 py-3 bg-gray-100 border-transparent focus:bg-white border focus:border-emerald-500 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-200 transition-all"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute left-2 p-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </form>
    </div>
  );
};

export default Chat;
