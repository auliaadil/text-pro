
import React, { useState } from 'react';
import ToolLayout from './ToolLayout';
import { Scissors, Copy, ChevronDown } from 'lucide-react';
import Toast from './Toast';

const TextSplitter: React.FC = () => {
  const [text, setText] = useState('');
  const [delimiter, setDelimiter] = useState('\n');
  const [customDelimiter, setCustomDelimiter] = useState('');
  const [results, setResults] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);

  const splitModes = [
    { label: 'New Line', value: '\n' },
    { label: 'Comma (,)', value: ',' },
    { label: 'Space', value: ' ' },
    { label: 'Pipe (|)', value: '|' },
    { label: 'Custom', value: 'custom' },
  ];

  const handleSplit = () => {
    const activeDelimiter = delimiter === 'custom' ? customDelimiter : delimiter;
    if (!activeDelimiter) return;
    const parts = text.split(activeDelimiter).filter(p => p.trim() !== '');
    setResults(parts);
  };

  const copyChunk = (content: string) => {
    navigator.clipboard.writeText(content);
    setShowToast(true);
  };

  return (
    <>
      <ToolLayout
        description="Split large text blocks into smaller parts using custom delimiters."
        actions={
          <button 
            onClick={handleSplit}
            className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
          >
            <Scissors size={16} /> Split Text
          </button>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          <div className="p-6 space-y-4">
            <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Input Text</label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              className="w-full h-80 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
              placeholder="Enter text to split..."
            />
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Split By</label>
              <div className="flex flex-wrap gap-2">
                {splitModes.map(mode => (
                  <button
                    key={mode.label}
                    onClick={() => setDelimiter(mode.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-all border ${
                      delimiter === mode.value 
                      ? 'bg-blue-600 border-blue-600 text-white shadow-md' 
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600'
                    }`}
                  >
                    {mode.label}
                  </button>
                ))}
              </div>
              {delimiter === 'custom' && (
                <input 
                  type="text"
                  placeholder="Enter custom delimiter..."
                  value={customDelimiter}
                  onChange={(e) => setCustomDelimiter(e.target.value)}
                  className="mt-2 w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all focus:outline-none"
                />
              )}
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-slate-900 overflow-y-auto max-h-[35rem]">
            <div className="flex items-center justify-between mb-4">
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest">Results ({results.length})</label>
              {results.length > 0 && (
                <button onClick={() => setResults([])} className="text-xs text-slate-400 hover:text-red-500">Clear all</button>
              )}
            </div>
            <div className="space-y-3">
              {results.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-slate-400">
                  <Scissors size={40} className="mb-4 opacity-20" />
                  <p className="text-sm italic">Click 'Split Text' to see results</p>
                </div>
              ) : (
                results.map((result, idx) => (
                  <div key={idx} className="group relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm">
                    <span className="absolute -top-2 -left-2 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 rounded-full flex items-center justify-center shadow-sm">
                      {idx + 1}
                    </span>
                    <div className="text-sm text-slate-700 dark:text-slate-300 font-mono break-all pr-8">
                      {result}
                    </div>
                    <button 
                      onClick={() => copyChunk(result)}
                      className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                      title="Copy this chunk"
                    >
                      <Copy size={14} />
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </ToolLayout>
      <Toast message="Chunk copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default TextSplitter;
