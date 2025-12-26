
import React, { Component, ReactNode, ErrorInfo } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AlertCircle } from 'lucide-react';
import { Analytics } from '@vercel/analytics/react';

// GLOBAL ERROR HANDLER FOR "WHITE SCREEN" ISSUES
// Catches errors that happen before React even starts (like import errors or process is not defined)
window.addEventListener('error', (event) => {
    const root = document.getElementById('root');
    if (root && (!root.innerHTML || root.innerHTML === '')) {
        renderFatalError(event.message, `${event.filename} : ${event.lineno}`);
    }
});

// Catch async promise rejections (like API failures) that bubble up
window.addEventListener('unhandledrejection', (event) => {
    // We generally don't want to crash the whole app for a failed fetch, 
    // but we log it. If it's critical, we might want to show UI.
    console.error("Unhandled Promise Rejection:", event.reason);
});

function renderFatalError(message: string, details: string) {
    const root = document.getElementById('root');
    if (root) {
         root.innerHTML = `
            <div style="font-family: sans-serif; padding: 40px; text-align: center; direction: rtl; color: #333; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background-color: #f9fafb;">
                <div style="background-color: #fee2e2; padding: 16px; border-radius: 50%; margin-bottom: 24px;">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#dc2626" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
                </div>
                <h1 style="color: #111827; font-size: 24px; font-weight: bold; margin-bottom: 12px;">عذراً، حدث خطأ جسيم في تشغيل التطبيق</h1>
                <p style="color: #4b5563; margin-bottom: 24px; max-width: 500px; line-height: 1.5;">
                    غالباً ما يكون هذا بسبب نقص في إعدادات البيئة (API Keys) أو مشكلة في الاتصال بالخادم.
                </p>
                <div style="background: #1f2937; color: #f87171; padding: 16px; border-radius: 8px; text-align: left; direction: ltr; margin-bottom: 24px; overflow: auto; font-family: monospace; width: 100%; max-width: 600px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                    <strong>Error:</strong> ${message} <br/>
                    <small style="color: #9ca3af;">${details}</small>
                </div>
                <button onclick="location.reload()" style="background: #059669; color: white; border: none; padding: 12px 32px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 16px; transition: background 0.2s;">إعادة التحميل</button>
            </div>
        `;
    }
}

interface ErrorBoundaryProps {
  children?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

// Simple Error Boundary to catch runtime errors (like missing API keys or process is not defined)
// Fix: Explicitly declare state and props to resolve TypeScript "does not exist on type ErrorBoundary" errors.
class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  // Adding explicit type declarations for state and props to fix property access errors (Fixes errors on lines 60, 76, 90, 114)
  public state: ErrorBoundaryState;
  public props: ErrorBoundaryProps;

  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null
    };
    this.props = props;
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  render() {
    // Access state via this.state - correctly typed through explicit member declaration
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-50 text-center p-6" dir="rtl">
          <div className="bg-white p-10 rounded-3xl shadow-2xl max-w-lg w-full border border-red-100">
            <div className="bg-red-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm">
              <AlertCircle className="w-10 h-10 text-red-600" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-3">عذراً، توقف التطبيق عن العمل</h1>
            <p className="text-gray-600 mb-8 leading-relaxed">
              حدث خطأ غير متوقع. يرجى التحقق من وحدة التحكم (Console) لمزيد من التفاصيل، أو حاول إعادة تحميل الصفحة.
            </p>
            
            <div className="bg-gray-900 rounded-xl p-4 mb-8 text-left overflow-hidden">
                <div className="text-red-400 font-mono text-xs overflow-auto max-h-32 whitespace-pre-wrap break-all">
                    {this.state.error?.toString() || "Unknown Error"}
                </div>
            </div>

            <div className="flex gap-3">
                <button 
                  onClick={() => window.location.reload()} 
                  className="flex-1 py-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition font-bold shadow-lg shadow-emerald-100"
                >
                  إعادة تشغيل التطبيق
                </button>
                <a 
                   href="/"
                   className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 transition font-bold"
                >
                   الرئيسية
                </a>
            </div>
          </div>
        </div>
      );
    }

    // Access props via this.props - correctly typed through explicit member declaration
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
