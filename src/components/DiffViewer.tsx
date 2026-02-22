
import React, { useState, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import * as Diff from 'diff';
import ToolLayout from './ToolLayout';
import { FileDiff, Columns, ArrowLeft, AlignJustify, Type, AlignLeft, Trash2 } from 'lucide-react';

type DiffMode = 'lines' | 'words' | 'chars';

const DiffViewer: React.FC = () => {
  const [textA, setTextA] = usePersistedState('tp:diff:textA', '', true);
  const [textB, setTextB] = usePersistedState('tp:diff:textB', '', true);
  const [showDiff, setShowDiff] = useState(false);
  const [mode, setMode] = usePersistedState<DiffMode>('tp:diff:mode', 'lines');

  const diffResult = useMemo(() => {
    if (!showDiff) return [];

    switch (mode) {
      case 'chars':
        return Diff.diffChars(textA, textB);
      case 'words':
        return Diff.diffWordsWithSpace(textA, textB);
      case 'lines':
      default:
        return Diff.diffLines(textA, textB);
    }
  }, [textA, textB, showDiff, mode]);

  const renderContent = () => {
    if (mode === 'lines') {
      let lineIndex = 1;
      return (
        <div className="flex-1 overflow-auto p-4 font-mono text-sm bg-white dark:bg-slate-900">
          {diffResult.map((part, index) => {
            const lines = part.value.split('\n');
            if (lines[lines.length - 1] === '') lines.pop();

            return lines.map((line, lineIdx) => {
              const currentLineNumber = part.removed ? null : (part.added ? null : lineIndex++);
              return (
                <div
                  key={`${index}-${lineIdx}`}
                  className={`flex items-start gap-4 px-2 py-0.5 ${part.added ? 'bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300' :
                    part.removed ? 'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-300' :
                      'text-slate-600 dark:text-slate-400'
                    }`}
                >
                  <span className="w-8 select-none text-slate-300 dark:text-slate-600 text-right text-xs pt-0.5">
                    {currentLineNumber || ''}
                  </span>
                  <span className="w-4 select-none opacity-50 font-bold">
                    {part.added ? '+' : part.removed ? '-' : ' '}
                  </span>
                  <span className="whitespace-pre-wrap break-all">{line}</span>
                </div>
              );
            });
          })}
        </div>
      );
    }

    // Inline rendering for Words and Chars
    return (
      <div className="flex-1 overflow-auto p-8 font-mono text-sm bg-white dark:bg-slate-900 leading-relaxed whitespace-pre-wrap">
        {diffResult.map((part, index) => (
          <span
            key={index}
            className={`${part.added ? 'bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 border-b-2 border-green-300 dark:border-green-700 decoration-clone py-0.5' :
              part.removed ? 'bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through decoration-red-300 dark:decoration-red-700 decoration-clone py-0.5 opacity-60' :
                'text-slate-700 dark:text-slate-300'
              }`}
          >
            {part.value}
          </span>
        ))}
      </div>
    );
  };

  return (
    <ToolLayout
      description="Compare two text sources to identify additions, removals, and changes with varying levels of granularity."
      actions={
        showDiff ? (
          <button
            onClick={() => setShowDiff(false)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft size={16} /> Back to Edit
          </button>
        ) : (
          <>
            <button
              onClick={() => setShowDiff(true)}
              disabled={!textA && !textB}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDiff size={16} /> Compare
            </button>
            <button
              onClick={() => { setTextA(''); setTextB(''); setShowDiff(false); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        )
      }
    >
      {!showDiff ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-6 flex-1 min-h-0 overflow-y-auto">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">Original Text (A)</label>
            <textarea
              value={textA}
              onChange={(e) => setTextA(e.target.value)}
              className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
              placeholder="Paste original text here..."
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-widest px-1">New Text (B)</label>
            <textarea
              value={textB}
              onChange={(e) => setTextB(e.target.value)}
              className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
              placeholder="Paste modified text here..."
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div className="p-3 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-4">
            {/* Legend */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="w-3 h-3 bg-red-100 dark:bg-red-900/50 border border-red-200 dark:border-red-800 rounded"></div> Removed
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400 font-medium">
                <div className="w-3 h-3 bg-green-100 dark:bg-green-900/50 border border-green-200 dark:border-green-800 rounded"></div> Added
              </div>
            </div>

            {/* Mode Selector */}
            <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
              <button
                onClick={() => setMode('lines')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'lines'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <AlignJustify size={14} /> Lines
              </button>
              <button
                onClick={() => setMode('words')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'words'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <AlignLeft size={14} /> Words
              </button>
              <button
                onClick={() => setMode('chars')}
                className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'chars'
                  ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                  }`}
              >
                <Type size={14} /> Chars
              </button>
            </div>
          </div>

          {renderContent()}
        </div>
      )}
    </ToolLayout>
  );
};

export default DiffViewer;
