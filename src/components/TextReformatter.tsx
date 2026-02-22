
import React, { useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Wand2, ArrowRightLeft, ArrowDown, Trash2 } from 'lucide-react';
import Toast from './Toast';

const TextReformatter: React.FC = () => {
  const [input, setInput] = usePersistedState('tp:reformatter:input', '', true);
  const [output, setOutput] = usePersistedState('tp:reformatter:output', '', true);
  const [showToast, setShowToast] = useState(false);

  const formatters = [
    { name: 'UPPERCASE', fn: (s: string) => s.toUpperCase() },
    { name: 'lowercase', fn: (s: string) => s.toLowerCase() },
    { name: 'Title Case', fn: (s: string) => s.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()) },
    { name: 'Sentence case', fn: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
    { name: 'camelCase', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, chr) => chr.toUpperCase()) },
    { name: 'snake_case', fn: (s: string) => s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('_') || s },
    { name: 'kebab-case', fn: (s: string) => s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('-') || s },
    { name: 'Remove Extra Spaces', fn: (s: string) => s.replace(/\s+/g, ' ').trim() },
    { name: 'Remove Empty Lines', fn: (s: string) => s.split('\n').filter(line => line.trim() !== '').join('\n') },
    { name: 'Sort Lines (A-Z)', fn: (s: string) => s.split('\n').sort().join('\n') },
    { name: 'Reverse Text', fn: (s: string) => s.split('').reverse().join('') },
  ];

  const applyFormat = (formatter: (s: string) => string) => {
    setOutput(formatter(input));
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(output);
    setShowToast(true);
  };

  return (
    <>
      <ToolLayout
        description="Instantly change the format of your text with standard conventions and cleaning utilities."
        actions={
          <>
            <button
              onClick={handleCopy}
              disabled={!output}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Copy size={16} /> Copy Result
            </button>
            <button
              onClick={() => { setInput(''); setOutput(''); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        }
      >
        <div className="flex flex-col lg:flex-row flex-1 min-h-0 overflow-y-auto divide-y lg:divide-y-0 lg:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="flex-1 flex flex-col gap-4 p-6">
            <div className="flex-1 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Original Text</label>
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
                placeholder="Type or paste text here..."
              />
            </div>

            <div className="flex justify-center lg:hidden text-slate-300">
              <ArrowDown size={20} />
            </div>

            <div className="flex-1 flex flex-col gap-2">
              <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1 text-blue-600 dark:text-blue-400">Formatted Result</label>
              <textarea
                value={output}
                readOnly
                className="w-full flex-1 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-blue-300/50 resize-none transition-all focus:outline-none"
                placeholder="Result will appear here..."
              />
            </div>
          </div>

          <div className="w-full lg:w-72 space-y-4 p-6">
            <div className="flex items-center gap-2 text-slate-400">
              <Wand2 size={16} />
              <span className="text-xs font-bold uppercase tracking-widest">Transformations</span>
            </div>
            <div className="space-y-2 overflow-y-auto max-h-[35rem] pr-1">
              {formatters.map(f => (
                <button
                  key={f.name}
                  onClick={() => applyFormat(f.fn)}
                  className="w-full px-4 py-3 text-left text-sm text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 transition-all shadow-sm flex items-center justify-between group"
                >
                  {f.name}
                  <ArrowRightLeft size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
          </div>
        </div>
      </ToolLayout>
      <Toast message="Result copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default TextReformatter;
