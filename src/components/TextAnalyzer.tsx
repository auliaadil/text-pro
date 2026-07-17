import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Trash2, Clock, AlignLeft, Hash, Scissors } from 'lucide-react';
import Toast from './Toast';
import { ToolType } from '../types';

interface TextAnalyzerProps {
  initialState?: Record<string, string>;
}

const CHAR_OPTIONS = [
  { label: 'Comma', value: ',' },
  { label: 'Space', value: ' ' },
  { label: 'Pipe', value: '|' },
  { label: 'Semicolon', value: ';' },
  { label: 'Tab', value: '\t' },
];

const CHAR_LABELS: Record<string, string> = Object.fromEntries(
  CHAR_OPTIONS.map(o => [o.value, o.label])
);

interface DelimiterPickerProps {
  delimiter: string;
  setDelimiter: (v: string) => void;
  charDelimiter: string;
  setCharDelimiter: (v: string) => void;
  customDelimiter: string;
  setCustomDelimiter: (v: string) => void;
  charLimit: string;
  setCharLimit: (v: string) => void;
}

const DelimiterPicker: React.FC<DelimiterPickerProps> = ({
  delimiter, setDelimiter,
  charDelimiter, setCharDelimiter,
  customDelimiter, setCustomDelimiter,
  charLimit, setCharLimit,
}) => {
  const [showCharPicker, setShowCharPicker] = useState(false);
  const hoverTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setShowCharPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    };
  }, []);

  const handleCharEnter = () => {
    if (hoverTimeout.current) clearTimeout(hoverTimeout.current);
    setShowCharPicker(true);
  };

  const handleCharLeave = () => {
    hoverTimeout.current = setTimeout(() => setShowCharPicker(false), 200);
  };

  const charPillLabel = delimiter === 'character'
    ? `Character · ${charDelimiter === '\t' ? 'Tab' : charDelimiter}`
    : 'Character';

  const pillBase = 'px-3 py-1.5 text-xs font-medium rounded-full transition-all border';
  const pillActive = 'bg-blue-600 border-blue-600 text-white shadow-md';
  const pillInactive = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-slate-300 dark:hover:border-slate-600';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap gap-2 items-center">
        {/* New Line pill */}
        <button
          onClick={() => setDelimiter('\n')}
          className={`${pillBase} ${delimiter === '\n' ? pillActive : pillInactive}`}
        >
          New Line
        </button>

        {/* Character pill with hover popover */}
        <div
          ref={pickerRef}
          className="relative"
          onMouseEnter={handleCharEnter}
          onMouseLeave={handleCharLeave}
        >
          <button
            onClick={() => {
              setDelimiter('character');
              setShowCharPicker(v => !v);
            }}
            className={`${pillBase} ${delimiter === 'character' ? pillActive : pillInactive}`}
          >
            {charPillLabel}
          </button>

          {showCharPicker && (
            <div className="absolute top-full left-0 mt-1.5 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-2 flex flex-col gap-1 min-w-[130px]">
              {CHAR_OPTIONS.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setCharDelimiter(opt.value);
                    setDelimiter('character');
                    setShowCharPicker(false);
                  }}
                  className={`text-left px-3 py-1.5 text-xs rounded-lg transition-colors flex items-center justify-between gap-3 ${
                    delimiter === 'character' && charDelimiter === opt.value
                      ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{opt.label}</span>
                  <span className="font-mono text-slate-400">
                    {opt.value === '\t' ? '⇥' : opt.value === ' ' ? '·' : opt.value}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Char Limit pill */}
        <button
          onClick={() => setDelimiter('char_limit')}
          className={`${pillBase} ${delimiter === 'char_limit' ? pillActive : pillInactive}`}
        >
          Char Limit
        </button>

        {/* Custom pill */}
        <button
          onClick={() => setDelimiter('custom')}
          className={`${pillBase} ${delimiter === 'custom' ? pillActive : pillInactive}`}
        >
          Custom
        </button>
      </div>

      {delimiter === 'char_limit' && (
        <input
          type="number"
          placeholder="Enter character limit..."
          value={charLimit}
          onChange={(e) => setCharLimit(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all focus:outline-none"
        />
      )}

      {delimiter === 'custom' && (
        <input
          type="text"
          placeholder="Enter custom delimiter..."
          value={customDelimiter}
          onChange={(e) => setCustomDelimiter(e.target.value)}
          className="w-full p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all focus:outline-none"
        />
      )}
    </div>
  );
};

const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="p-4 flex flex-col items-center justify-center gap-1 hover:bg-white dark:hover:bg-slate-900 transition-colors">
    <div className="flex items-center gap-1.5 text-slate-400">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</span>
  </div>
);

const TextAnalyzer: React.FC<TextAnalyzerProps> = ({ initialState }) => {
  const [text, setText] = usePersistedState('tp:analyzer:text', '', true);
  const [activeTab, setActiveTab] = usePersistedState<'stats' | 'split'>('tp:analyzer:activeTab', 'stats');
  const [delimiter, setDelimiter] = usePersistedState('tp:analyzer:delimiter', '\n');
  const [charDelimiter, setCharDelimiter] = usePersistedState('tp:analyzer:charDelimiter', ',');
  const [customDelimiter, setCustomDelimiter] = usePersistedState('tp:analyzer:customDelimiter', '');
  const [charLimit, setCharLimit] = usePersistedState('tp:analyzer:charLimit', '');
  const [results, setResults] = useState<string[]>([]);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Copied to clipboard');

  useEffect(() => {
    if (initialState?.text !== undefined) setText(initialState.text);
  }, []);

  const stats = useMemo(() => {
    const trimmed = text.trim();
    const words = trimmed === '' ? 0 : trimmed.split(/\s+/).length;
    const chars = text.length;
    const lines = trimmed === '' ? 0 : text.split('\n').length;
    const sentences = trimmed === '' ? 0 : trimmed.split(/[.!?]+/).filter(Boolean).length;
    const paragraphs = trimmed === '' ? 0 : trimmed.split(/\n\s*\n/).length;
    const readingTime = Math.ceil(words / 200);
    return { words, chars, lines, sentences, paragraphs, readingTime };
  }, [text]);

  const occurrences = useMemo(() => {
    if (!text) return 0;
    if (delimiter === 'char_limit') {
      const limit = parseInt(charLimit);
      return !isNaN(limit) && limit > 0 ? Math.ceil(text.length / limit) : 0;
    }
    const active = delimiter === 'character' ? charDelimiter
      : delimiter === 'custom' ? customDelimiter
      : delimiter;
    if (!active) return 0;
    return text.split(active).filter(p => p.trim() !== '').length;
  }, [text, delimiter, charDelimiter, customDelimiter, charLimit]);

  const occurrenceLabel = useMemo(() => {
    if (delimiter === 'char_limit') return 'Chunks';
    if (delimiter === '\n') return 'Parts';
    if (delimiter === 'character') return 'Parts';
    return 'Parts';
  }, [delimiter, charDelimiter]);

  useEffect(() => {
    setResults([]);
  }, [delimiter, charDelimiter, customDelimiter]);

  const handleSplit = () => {
    if (delimiter === 'char_limit') {
      const limit = parseInt(charLimit);
      if (isNaN(limit) || limit <= 0) return;
      const chunks: string[] = [];
      for (let i = 0; i < text.length; i += limit) chunks.push(text.slice(i, i + limit));
      setResults(chunks);
      return;
    }
    const active = delimiter === 'character' ? charDelimiter
      : delimiter === 'custom' ? customDelimiter
      : delimiter;
    if (!active) return;
    setResults(text.split(active).filter(p => p.trim() !== ''));
  };

  const handleCopy = async (content: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(content);
      setToastMessage(msg);
      setShowToast(true);
    } catch {
      setToastMessage('Failed to copy');
      setShowToast(true);
    }
  };

  const handleClear = () => {
    setText('');
    setResults([]);
    setCustomDelimiter('');
    setCharLimit('');
  };

  const delimiterPickerProps = {
    delimiter, setDelimiter,
    charDelimiter, setCharDelimiter,
    customDelimiter, setCustomDelimiter,
    charLimit, setCharLimit,
  };

  return (
    <>
      <ToolLayout
        description="Count text statistics and split text into chunks using custom delimiters."
        shareToolType={ToolType.ANALYZER}
        shareState={{ text }}
        actions={
          <>
            {activeTab === 'stats' && (
              <button
                onClick={() => handleCopy(text, 'Copied to clipboard')}
                disabled={!text}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                <Copy size={16} /> Copy
              </button>
            )}
            {activeTab === 'split' && (
              <button
                onClick={handleSplit}
                className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm"
              >
                <Scissors size={16} /> Split Text
              </button>
            )}
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        }
      >
        <div className="flex flex-col flex-1 p-6 gap-4 overflow-y-auto min-h-0">
          {/* Shared textarea */}
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste or type your text here..."
            className="w-full min-h-[12rem] p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
          />

          {/* Tab bar */}
          <div className="flex border-b border-slate-200 dark:border-slate-800">
            {(['stats', 'split'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-5 py-2.5 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
                  activeTab === tab
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>

          {/* Stats tab */}
          {activeTab === 'stats' && (
            <div className="flex flex-col gap-4">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
                <StatBox icon={<AlignLeft size={16} />} label="Words" value={stats.words} />
                <StatBox icon={<Hash size={16} />} label="Characters" value={stats.chars} />
                <StatBox icon={<Hash size={16} />} label="Lines" value={stats.lines} />
                <StatBox icon={<Hash size={16} />} label="Sentences" value={stats.sentences} />
                <StatBox icon={<Hash size={16} />} label="Paragraphs" value={stats.paragraphs} />
                <StatBox icon={<Clock size={16} />} label="Read Time" value={stats.readingTime === 0 ? '—' : `${stats.readingTime}m`} />
              </div>

              <div className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-4 flex flex-col gap-3">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Count by</span>
                <DelimiterPicker {...delimiterPickerProps} />
                <div className="flex items-baseline gap-2 pt-1">
                  <span className="text-3xl font-bold text-slate-800 dark:text-slate-100">{occurrences}</span>
                  <span className="text-sm text-slate-400">{occurrenceLabel}</span>
                </div>
              </div>
            </div>
          )}

          {/* Split tab */}
          {activeTab === 'split' && (
            <div className="flex flex-col gap-4">
              <div>
                <span className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Split By</span>
                <DelimiterPicker {...delimiterPickerProps} />
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                    Results ({results.length})
                  </span>
                  {results.length > 0 && (
                    <button
                      onClick={() => setResults([])}
                      className="text-xs text-slate-400 hover:text-red-500 transition-colors"
                    >
                      Clear all
                    </button>
                  )}
                </div>
                <div className="space-y-3">
                  {results.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                      <Scissors size={36} className="mb-3 opacity-20" />
                      <p className="text-sm italic">Click 'Split Text' to see results</p>
                    </div>
                  ) : (
                    results.map((result, idx) => (
                      <div
                        key={idx}
                        className="group relative bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 p-3 rounded-xl hover:border-blue-300 dark:hover:border-blue-700 transition-colors shadow-sm"
                      >
                        <span className="absolute -top-2 -left-2 w-5 h-5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-[10px] font-bold text-slate-500 rounded-full flex items-center justify-center shadow-sm">
                          {idx + 1}
                        </span>
                        <div className="text-sm text-slate-700 dark:text-slate-300 font-mono break-all pr-8">
                          {result}
                        </div>
                        <button
                          onClick={() => handleCopy(result, 'Chunk copied to clipboard')}
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
          )}
        </div>
      </ToolLayout>
      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default TextAnalyzer;
