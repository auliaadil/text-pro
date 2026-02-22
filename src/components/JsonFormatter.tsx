
import React, { useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Info, AlignLeft, Minimize2, Trash2 } from 'lucide-react';
import Toast from './Toast';

const JsonFormatter: React.FC = () => {
  const [json, setJson] = usePersistedState('tp:json:content', '');
  const [error, setError] = useState<string | null>(null);
  const [showToast, setShowToast] = useState(false);

  const formatJson = (indent: number = 2) => {
    try {
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed, null, indent));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed));
      setError(null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCopy = () => {
    if (!json) return;
    navigator.clipboard.writeText(json);
    setShowToast(true);
  };

  return (
    <>
      <ToolLayout
        description="Format, validate, and minify your JSON data with ease. Automatic syntax checking included."
        actions={
          <div className="flex gap-2">
            <button
              onClick={() => formatJson(2)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <AlignLeft size={16} /> Beautify
            </button>
            <button
              onClick={minifyJson}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Minimize2 size={16} /> Minify
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy size={16} /> Copy
            </button>
            <button
              onClick={() => { setJson(''); setError(null); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 p-6">
          <div className="flex-1 relative min-h-0">
            <textarea
              value={json}
              onChange={(e) => {
                setJson(e.target.value);
                if (error) setError(null);
              }}
              className={`w-full h-full p-4 border rounded-xl font-mono text-sm resize-none transition-all focus:outline-none ${error
                ? 'bg-red-50 dark:bg-red-900/10 border-red-200 dark:border-red-900 text-red-900 dark:text-red-300 focus:ring-2 focus:ring-red-200'
                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent'
                }`}
              placeholder='{ "paste": "your JSON here" }'
              spellCheck={false}
            />
            {error && (
              <div className="absolute bottom-4 left-4 right-4 p-3 bg-red-100 dark:bg-red-900/90 border border-red-200 dark:border-red-800 rounded-xl flex items-start gap-3 text-red-700 dark:text-red-100 text-xs animate-in slide-in-from-bottom duration-300 shadow-sm">
                <Info size={14} className="mt-0.5" />
                <div>
                  <span className="font-bold">Invalid JSON:</span> {error}
                </div>
              </div>
            )}
          </div>
        </div>
      </ToolLayout>
      <Toast message="JSON copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default JsonFormatter;
