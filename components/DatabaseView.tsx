import React, { useState, useEffect } from 'react';
import { SheetData, TableSchema } from '../types';
import { inferSchema, sheetToJson, generateCodeSnippets } from '../services/databaseService';
import { Database, Code, FileJson, Table, Copy, Check, Link, Globe } from 'lucide-react';

interface DatabaseViewProps {
  data: SheetData;
}

const DatabaseView: React.FC<DatabaseViewProps> = ({ data }) => {
  const [activeTab, setActiveTab] = useState<'schema' | 'json' | 'api'>('schema');
  const [copied, setCopied] = useState<string | null>(null);
  
  // Use current window origin if available, otherwise fallback
  const [baseUrl, setBaseUrl] = useState(() => {
    if (typeof window !== 'undefined') return window.location.origin;
    return 'https://your-project.vercel.app';
  });

  const schema = inferSchema(data);
  const jsonData = sheetToJson(data);
  const snippets = generateCodeSnippets(schema, baseUrl);

  useEffect(() => {
    if (typeof window !== 'undefined') {
        setBaseUrl(window.location.origin);
    }
  }, []);

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="flex flex-col h-full bg-gray-50 overflow-hidden" dir="ltr">
      {/* Header */}
      <div className="bg-white border-b px-6 py-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm z-10">
        <div>
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <Database className="w-6 h-6 text-purple-600" />
            Database Engine
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            Table: <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1 rounded">{schema.tableName}</span> • 
            Records: <span className="font-mono font-medium text-gray-700 bg-gray-100 px-1 rounded">{schema.recordCount}</span>
          </p>
        </div>
        <div className="flex bg-gray-100 p-1 rounded-lg self-start md:self-auto">
          <button
            onClick={() => setActiveTab('schema')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'schema' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            Schema
          </button>
          <button
            onClick={() => setActiveTab('json')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'json' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            JSON Data
          </button>
          <button
            onClick={() => setActiveTab('api')}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${activeTab === 'api' ? 'bg-white shadow-sm text-purple-700' : 'text-gray-600 hover:text-gray-900'}`}
          >
            API & Connect
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        
        {/* Schema View */}
        {activeTab === 'schema' && (
          <div className="max-w-4xl mx-auto bg-white rounded-xl shadow-sm border overflow-hidden animate-in fade-in slide-in-from-bottom-4 duration-500">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Column Name</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">API Key</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Data Type</th>
                  <th className="px-6 py-3 text-xs font-bold text-gray-500 uppercase tracking-wider">Example Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {schema.columns.map((col, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 font-medium text-gray-900">{col.name}</td>
                    <td className="px-6 py-4 font-mono text-sm text-purple-600 bg-purple-50 rounded w-fit px-2">{col.key}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border
                        ${col.type === 'Number' ? 'bg-blue-50 text-blue-700 border-blue-200' : 
                          col.type === 'String' ? 'bg-green-50 text-green-700 border-green-200' :
                          col.type === 'Date' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' :
                          'bg-gray-50 text-gray-700 border-gray-200'}`}>
                        {col.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">
                      {String(col.sample || '-')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {schema.columns.length === 0 && (
              <div className="p-12 text-center text-gray-500 flex flex-col items-center gap-3">
                <Table className="w-12 h-12 text-gray-300" />
                <p>No schema detected. Add headers to your first row to generate a schema.</p>
              </div>
            )}
          </div>
        )}

        {/* JSON View */}
        {activeTab === 'json' && (
          <div className="max-w-5xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-semibold text-gray-700 flex items-center gap-2">
                <FileJson className="w-5 h-5 text-gray-500" /> JSON Output
              </h3>
              <button 
                onClick={() => copyToClipboard(JSON.stringify(jsonData, null, 2), 'json')}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-purple-50 text-purple-700 hover:bg-purple-100 font-medium transition-colors"
              >
                {copied === 'json' ? <Check size={16} /> : <Copy size={16} />}
                {copied === 'json' ? 'Copied!' : 'Copy JSON'}
              </button>
            </div>
            <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-6 rounded-xl overflow-auto text-sm font-mono shadow-lg border border-gray-800 h-[600px] selection:bg-purple-500 selection:text-white">
              {JSON.stringify(jsonData, null, 2)}
            </pre>
          </div>
        )}

        {/* API Docs View */}
        {activeTab === 'api' && (
          <div className="max-w-5xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            
            {/* API Configuration */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-purple-100 mb-6">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Globe className="w-5 h-5 text-purple-600" />
                Configuration
              </h3>
              <div className="flex flex-col sm:flex-row gap-4 items-end sm:items-center">
                <div className="flex-1 w-full">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Your Deployment URL (Vercel / Netlify / Local)
                  </label>
                  <div className="relative">
                    <input 
                      type="text" 
                      value={baseUrl}
                      onChange={(e) => setBaseUrl(e.target.value)}
                      placeholder="https://your-project.vercel.app"
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
                    />
                    <Link className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                  </div>
                </div>
                <div className="text-xs text-gray-500 sm:max-w-[250px]">
                  Update this URL to instantly reflect in the code snippets below.
                </div>
              </div>
            </div>

            {/* TypeScript Snippet */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700 flex items-center gap-2">
                  <div className="w-6 h-6 bg-blue-600 text-white rounded flex items-center justify-center text-xs font-bold">TS</div>
                  TypeScript / React
                </span>
                <button 
                   onClick={() => copyToClipboard(snippets.typescript, 'ts')}
                   className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                   title="Copy Code"
                >
                  {copied === 'ts' ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-5 overflow-x-auto text-sm font-mono leading-relaxed">
                {snippets.typescript}
              </pre>
            </div>

            {/* Python Snippet */}
            <div className="bg-white rounded-xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-4 py-3 border-b flex justify-between items-center">
                <span className="font-bold text-gray-700 flex items-center gap-2">
                  <div className="w-6 h-6 bg-yellow-500 text-white rounded flex items-center justify-center text-xs font-bold">Py</div>
                  Python (Pandas)
                </span>
                <button 
                   onClick={() => copyToClipboard(snippets.python, 'py')}
                   className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-600"
                   title="Copy Code"
                >
                  {copied === 'py' ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                </button>
              </div>
              <pre className="bg-[#1e1e1e] text-[#d4d4d4] p-5 overflow-x-auto text-sm font-mono leading-relaxed">
                {snippets.python}
              </pre>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-blue-800 text-sm flex gap-3 items-start">
               <div className="mt-1 min-w-[20px]">💡</div>
               <div>
                  <strong>Pro Tip:</strong> Ensure your hosted application exposes a <code>/api/data</code> endpoint that returns the JSON data. 
                  In this demo version, these snippets are ready to connect to your backend once deployed.
               </div>
            </div>

          </div>
        )}
      </div>
    </div>
  );
};

export default DatabaseView;