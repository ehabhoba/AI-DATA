import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// GLOBAL ERROR HANDLER FOR "WHITE SCREEN" ISSUES
// Catches errors that happen before React even starts (like import errors or process is not defined)
window.addEventListener('error', (event) => {
    const root = document.getElementById('root');
    if (root && root.innerHTML === '') {
        root.innerHTML = `
            <div style="font-family: sans-serif; padding: 20px; text-align: center; direction: rtl; color: #333;">
                <h1 style="color: #ef4444;">عذراً، حدث خطأ جسيم في تحميل التطبيق</h1>
                <p>يرجى التأكد من إعداد مفاتيح API بشكل صحيح.</p>
                <div style="background: #f1f1f1; padding: 10px; border-radius: 5px; text-align: left; direction: ltr; margin: 20px 0; overflow: auto; font-family: monospace;">
                    ${event.message} <br/> ${event.filename} : ${event.lineno}
                </div>
                <button onclick="location.reload()" style="background: #10b981; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">إعادة التحميل</button>
            </div>
        `;
    }
});

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple Error Boundary to catch runtime errors (like missing API keys or process is not defined)
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-6" dir="rtl">
          <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md border border-red-100">
            <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-red-600" />
            </div>
            <h1 className="text-xl font-bold text-gray-800 mb-2">عذراً، حدث خطأ غير متوقع</h1>
            <p className="text-gray-600 mb-6 text-sm leading-relaxed">
              يبدو أن هناك مشكلة في تشغيل التطبيق. قد يكون السبب نقص في إعدادات البيئة (API Key) أو خطأ تقني.
            </p>
            <div className="bg-gray-900 text-left text-xs text-red-300 p-4 rounded-lg overflow-auto mb-6 max-h-32 font-mono" dir="ltr">
              {this.state.error?.toString()}
            </div>
            <button 
              onClick={() => window.location.reload()} 
              className="px-6 py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold text-sm w-full"
            >
              إعادة تحميل الصفحة
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
      <Analytics />
    </ErrorBoundary>
  </React.StrictMode>
);