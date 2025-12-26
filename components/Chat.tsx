
import React, { useState, useRef, useEffect } from 'react';
import { Message } from '../types';
import { Send, Loader2, Sparkles, Image as ImageIcon, X, BrainCircuit, User, Bot, Zap, ImagePlus } from 'lucide-react';

interface ChatProps {
  messages: Message[];
  onSendMessage: (text: string, image?: string, isDeepThink?: boolean, isFast?: boolean) => void;
  isLoading: boolean;
}

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, isLoading }) => {
  const [input, setInput] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isDeepThink, setIsDeepThink] = useState(false);
  const [isFast, setIsFast] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  useEffect(() => { scrollToBottom(); }, [messages]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSelectedImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if ((input.trim() || selectedImage) && !isLoading) {
      onSendMessage(input, selectedImage || undefined, isDeepThink, isFast);
      setInput('');
      setSelectedImage(null);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 border-r border-gray-200 shadow-inner">
      <div className="p-4 border-b border-gray-200 bg-white flex items-center justify-between">
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-lg">
                <Sparkles size={20} />
            </div>
            <div>
                <h2 className="font-bold text-gray-800 text-sm">المساعد الذكي Pro</h2>
                <p className="text-gray-500 text-[10px]">Gemini 3 Pro + 2.5 Image</p>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.map((msg, idx) => (
          <div key={idx} className={`flex w-full gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            <div className={`shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${msg.role === 'user' ? 'bg-slate-200' : 'bg-emerald-600 text-white'}`}>
                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
            </div>
            <div className={`flex flex-col max-w-[85%] ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-3 text-sm rounded-2xl shadow-sm leading-relaxed ${msg.role === 'user' ? 'bg-slate-800 text-white rounded-tr-none' : 'bg-white text-gray-800 border rounded-tl-none'}`}>
                    {msg.image && <img src={msg.image} className="rounded-lg mb-2 max-w-full border border-slate-100 shadow-sm" alt="content" />}
                    <div className="whitespace-pre-wrap">{msg.text}</div>
                </div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 bg-white border-t space-y-3">
        {selectedImage && (
          <div className="relative inline-block animate-in slide-in-from-bottom-2">
            <img src={selectedImage} className="h-20 w-20 object-cover rounded-xl border-2 border-emerald-500 shadow-md" alt="preview" />
            <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600"><X size={12} /></button>
          </div>
        )}

        <div className="flex gap-2">
             <button 
                onClick={() => { setIsDeepThink(!isDeepThink); setIsFast(false); }} 
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${isDeepThink ? 'bg-purple-600 text-white border-purple-600 shadow-lg shadow-purple-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                <BrainCircuit size={14} /> التفكير العميق
             </button>
             <button 
                onClick={() => { setIsFast(!isFast); setIsDeepThink(false); }} 
                className={`flex-1 py-2 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1 border transition-all ${isFast ? 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-100' : 'bg-gray-50 text-gray-500 hover:bg-gray-100'}`}
             >
                <Zap size={14} /> الوضع السريع
             </button>
             <button onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-blue-50 text-blue-600 border border-blue-100 rounded-xl text-[10px] font-bold flex items-center gap-1 hover:bg-blue-100">
                <ImagePlus size={14} /> صورة
             </button>
        </div>

        <form onSubmit={handleSubmit} className="flex gap-2">
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden" onChange={handleImageSelect} />
          <input 
            value={input} 
            onChange={(e) => setInput(e.target.value)} 
            placeholder={isDeepThink ? "اسأل سؤالاً تقنياً معقداً..." : "اكتب طلبك هنا..."}
            className="flex-1 px-4 py-3 bg-gray-100 border-none rounded-2xl focus:ring-2 focus:ring-emerald-500 text-sm outline-none transition-all"
          />
          <button type="submit" disabled={isLoading} className="p-3 bg-emerald-600 text-white rounded-2xl hover:bg-emerald-700 transition shadow-lg shadow-emerald-100 disabled:opacity-50">
            {isLoading ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Chat;
