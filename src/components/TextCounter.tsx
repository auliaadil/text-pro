
import React, { useState, useMemo } from 'react';
import ToolLayout from './ToolLayout';
import { Copy, Trash2, Clock, AlignLeft, Hash } from 'lucide-react';
import Toast from './Toast';

const TextCounter: React.FC = () => {
  const [text, setText] = useState('');
  const [showToast, setShowToast] = useState(false);

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const chars = text.length;
    const lines = text === '' ? 0 : text.split('\n').length;
    const sentences = trimmed === '' ? 0 : trimmed.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n\s*\n/).length;
    const readingTime = Math.ceil(words / 200); // Average 200 wpm

    return { words, chars, lines, sentences, paragraphs, readingTime };
  }, [text]);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setShowToast(true);
  };

  return (
    <>
      <ToolLayout 
        description="Calculate real-time statistics for your text including word count, character count, and estimated reading time."
        actions={
          <>
            <button 
              onClick={handleCopy}
              disabled={!text}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              <Copy size={16} /> Copy
            </button>
            <button 
              onClick={() => setText('')}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        }
      >
        <div className="flex flex-col h-full min-h-[35rem] p-6 gap-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
          />
          
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            <StatBox icon={<AlignLeft size={16} />} label="Words" value={stats.words} />
            <StatBox icon={<Hash size={16} />} label="Characters" value={stats.chars} />
            <StatBox icon={<Hash size={16} />} label="Lines" value={stats.lines} />
            <StatBox icon={<Hash size={16} />} label="Sentences" value={stats.sentences} />
            <StatBox icon={<Hash size={16} />} label="Paragraphs" value={stats.paragraphs} />
            <StatBox icon={<Clock size={16} />} label="Read Time" value={`${stats.readingTime}m`} />
          </div>
        </div>
      </ToolLayout>
      <Toast message="Copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode, label: string, value: string | number }> = ({ icon, label, value }) => (
  <div className="p-4 flex flex-col items-center justify-center gap-1 hover:bg-white dark:hover:bg-slate-900 transition-colors">
    <div className="flex items-center gap-1.5 text-slate-400">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</span>
  </div>
);

export default TextCounter;
