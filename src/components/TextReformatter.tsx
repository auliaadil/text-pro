
import React, { useState, useEffect, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Trash2, ChevronDown, ChevronUp, Settings2 } from 'lucide-react';
import Toast from './Toast';
import { ToolType } from '../types';

interface TextReformatterProps {
  initialState?: Record<string, string>;
}

const TRANSFORM_GROUPS = [
  {
    label: 'Case',
    items: [
      { name: 'UPPERCASE', fn: (s: string) => s.toUpperCase() },
      { name: 'lowercase', fn: (s: string) => s.toLowerCase() },
      { name: 'Title Case', fn: (s: string) => s.replace(/\w\S*/g, (w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) },
      { name: 'Sentence case', fn: (s: string) => s.charAt(0).toUpperCase() + s.slice(1).toLowerCase() },
      { name: 'camelCase', fn: (s: string) => s.toLowerCase().replace(/[^a-zA-Z0-9]+(.)/g, (_, c) => c.toUpperCase()) },
      { name: 'snake_case', fn: (s: string) => s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('_') || s },
      { name: 'kebab-case', fn: (s: string) => s.match(/[A-Z]{2,}(?=[A-Z][a-z]+[0-9]*|\b)|[A-Z]?[a-z]+[0-9]*|[A-Z]|[0-9]+/g)?.map(x => x.toLowerCase()).join('-') || s },
    ],
  },
  {
    label: 'Clean',
    items: [
      { name: 'Trim spaces', fn: (s: string) => s.replace(/\s+/g, ' ').trim() },
      { name: 'Remove blank lines', fn: (s: string) => s.split('\n').filter(l => l.trim() !== '').join('\n') },
    ],
  },
  {
    label: 'Structure',
    items: [
      { name: 'Sort A → Z', fn: (s: string) => s.split('\n').sort().join('\n') },
      { name: 'Reverse text', fn: (s: string) => s.split('').reverse().join('') },
    ],
  },
];

const TextReformatter: React.FC<TextReformatterProps> = ({ initialState }) => {
  const [input, setInput] = usePersistedState('tp:reformatter:input', '', true);
  const [output, setOutput] = usePersistedState('tp:reformatter:output', '', true);
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('Copied to clipboard');
  const [lastApplied, setLastApplied] = useState<string | null>(null);
  const [customOpen, setCustomOpen] = usePersistedState('tp:reformatter:customOpen', false);

  const [findText, setFindText] = usePersistedState('tp:reformatter:findText', '');
  const [replaceText, setReplaceText] = usePersistedState('tp:reformatter:replaceText', '');
  const [prefixText, setPrefixText] = usePersistedState('tp:reformatter:prefixText', '');
  const [suffixText, setSuffixText] = usePersistedState('tp:reformatter:suffixText', '');

  useEffect(() => {
    if (initialState?.input !== undefined) setInput(initialState.input);
  }, []);

  const applyTransform = (name: string, fn: (s: string) => string) => {
    setOutput(fn(input));
    setLastApplied(name);
  };

  const applyFindReplace = () => {
    if (!findText) return;
    setOutput(input.split(findText).join(replaceText));
    setLastApplied('find-replace');
  };

  const applyPrefixSuffix = () => {
    if (!prefixText && !suffixText) return;
    setOutput(input.split('\n').map(line => `${prefixText}${line}${suffixText}`).join('\n'));
    setLastApplied('prefix-suffix');
  };

  const handleCopy = async (text: string, msg: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setToastMessage(msg);
      setShowToast(true);
    } catch {
      setToastMessage('Failed to copy');
      setShowToast(true);
    }
  };

  const handleClear = () => {
    setInput('');
    setOutput('');
    setLastApplied(null);
  };

  const resultLabel = useMemo(() => {
    if (!lastApplied) return 'Result';
    if (lastApplied === 'find-replace') return 'Result · Find & Replace';
    if (lastApplied === 'prefix-suffix') return 'Result · Prefix / Suffix';
    return `Result · ${lastApplied}`;
  }, [lastApplied]);

  const pillBase = 'px-3 py-1.5 text-xs font-medium rounded-full border transition-all';
  const pillActive = 'bg-blue-600 border-blue-600 text-white shadow-sm';
  const pillInactive = 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <>
      <ToolLayout
        description="Transform, clean, and reformat text with built-in tools or your own custom rules."
        shareToolType={ToolType.REFORMATTER}
        shareState={{ input }}
        actions={
          <>
            <button
              onClick={() => handleCopy(output, 'Result copied to clipboard')}
              disabled={!output}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <Copy size={16} /> Copy Result
            </button>
            <button
              onClick={handleClear}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        }
      >
        <div className="flex flex-col flex-1 min-h-0 overflow-y-auto p-4 gap-3">
          {/* Input */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Input</label>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Type or paste text here..."
              className="w-full min-h-[7rem] p-3 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
            />
          </div>

          {/* Transform palette */}
          <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
            {TRANSFORM_GROUPS.map((group) => (
              <div key={group.label} className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{group.label}</span>
                <div className="flex flex-wrap gap-1.5">
                  {group.items.map((item) => (
                    <button
                      key={item.name}
                      onClick={() => applyTransform(item.name, item.fn)}
                      disabled={!input}
                      className={`${pillBase} ${lastApplied === item.name ? pillActive : pillInactive}`}
                    >
                      {item.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Custom transforms accordion */}
          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            <button
              onClick={() => setCustomOpen(v => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
            >
              <span className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <Settings2 size={13} />
                Custom Transform
              </span>
              {customOpen
                ? <ChevronUp size={14} className="text-slate-400" />
                : <ChevronDown size={14} className="text-slate-400" />}
            </button>

            {customOpen && (
              <div className="p-4 flex flex-col gap-4 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
                {/* Find & Replace */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Find & Replace</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Find..."
                      value={findText}
                      onChange={e => setFindText(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Replace with..."
                      value={replaceText}
                      onChange={e => setReplaceText(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
                    />
                    <button
                      onClick={applyFindReplace}
                      disabled={!input || !findText}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>

                {/* Prefix / Suffix */}
                <div className="flex flex-col gap-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Prefix / Suffix each line</span>
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      placeholder="Prefix..."
                      value={prefixText}
                      onChange={e => setPrefixText(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
                    />
                    <input
                      type="text"
                      placeholder="Suffix..."
                      value={suffixText}
                      onChange={e => setSuffixText(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm font-mono bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent focus:outline-none text-slate-800 dark:text-slate-200 placeholder-slate-400 transition-all"
                    />
                    <button
                      onClick={applyPrefixSuffix}
                      disabled={!input || (!prefixText && !suffixText)}
                      className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Output */}
          <div className="flex flex-col gap-1">
            <div className="flex items-center justify-between px-1">
              <label className="text-xs font-bold uppercase tracking-widest text-blue-600 dark:text-blue-400">
                {resultLabel}
              </label>
              {output && (
                <button
                  onClick={() => handleCopy(output, 'Result copied to clipboard')}
                  className="flex items-center gap-1 text-xs text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  <Copy size={12} /> Copy
                </button>
              )}
            </div>
            <textarea
              value={output}
              readOnly
              placeholder="Result will appear here..."
              className="w-full min-h-[6rem] p-3 bg-blue-50/40 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-xl font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-blue-300/50 dark:placeholder-blue-900/50 resize-none focus:outline-none"
            />
          </div>
        </div>
      </ToolLayout>

      <Toast message={toastMessage} isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default TextReformatter;
