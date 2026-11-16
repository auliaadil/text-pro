
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import * as Diff from 'diff';
import ToolLayout from './ToolLayout';
import { FileDiff, Columns, ArrowLeft, ArrowLeftRight, AlignJustify, Type, AlignLeft, Trash2, Plus, X } from 'lucide-react';
import { ToolType } from '../types';

type DiffMode = 'lines' | 'words' | 'chars';

type ViewLayout = 'unified' | 'split';

type SplitRow = {
  type: 'unchanged' | 'changed' | 'removed' | 'added';
  left:  { text: string; lineNum: number } | null;
  right: { text: string; lineNum: number } | null;
};

function buildSplitRows(diffResult: Diff.Change[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let leftNum = 1;
  let rightNum = 1;
  let i = 0;

  const splitLines = (value: string): string[] => {
    const lines = value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();
    return lines;
  };

  while (i < diffResult.length) {
    const part = diffResult[i];

    if (!part.removed && !part.added) {
      // Unchanged — emit one row per line with both sides filled
      for (const text of splitLines(part.value)) {
        rows.push({ type: 'unchanged', left: { text, lineNum: leftNum++ }, right: { text, lineNum: rightNum++ } });
      }
      i++;
    } else {
      // Collect all consecutive removed + added lines as a paired block
      const removedLines: string[] = [];
      const addedLines: string[] = [];
      while (i < diffResult.length && (diffResult[i].removed || diffResult[i].added)) {
        if (diffResult[i].removed) {
          removedLines.push(...splitLines(diffResult[i].value));
        } else {
          addedLines.push(...splitLines(diffResult[i].value));
        }
        i++;
      }
      // Pair lines: min(N,M) paired rows, then placeholders for the longer side
      const count = Math.max(removedLines.length, addedLines.length);
      for (let j = 0; j < count; j++) {
        const hasLeft = j < removedLines.length;
        const hasRight = j < addedLines.length;
        rows.push({
          type: hasLeft && hasRight ? 'changed' : hasLeft ? 'removed' : 'added',
          left:  hasLeft  ? { text: removedLines[j], lineNum: leftNum++ }  : null,
          right: hasRight ? { text: addedLines[j],   lineNum: rightNum++ } : null,
        });
      }
    }
  }

  return rows;
}

type Board = { id: string; label: string; text: string };

const newId = () => Math.random().toString(36).slice(2, 10);

const boardLetter = (index: number): string => {
  let n = index;
  let out = '';
  do {
    out = String.fromCharCode(65 + (n % 26)) + out;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return out;
};

const boardName = (board: Board, index: number) => board.label.trim() || `Source ${boardLetter(index)}`;

/** Pull text from the old two-board storage keys so existing sessions aren't lost. */
function readLegacyBoards(): Board[] {
  const read = (key: string): string => {
    try {
      const raw = sessionStorage.getItem(key) ?? localStorage.getItem(key);
      const val = raw !== null ? JSON.parse(raw) : '';
      return typeof val === 'string' ? val : '';
    } catch {
      return '';
    }
  };
  return [
    { id: newId(), label: '', text: read('tp:diff:textA') },
    { id: newId(), label: '', text: read('tp:diff:textB') },
  ];
}

/** Parse boards from shared state. Supports the new `boards` JSON field and legacy `left`/`right`. */
function boardsFromShareState(state: Record<string, string>): Board[] | null {
  if (state.boards !== undefined) {
    try {
      const parsed = JSON.parse(state.boards);
      if (!Array.isArray(parsed) || parsed.length < 2) return null;
      const boards = parsed.map((b: unknown) => {
        const obj = (b && typeof b === 'object' ? b : {}) as Record<string, unknown>;
        return {
          id: newId(),
          label: typeof obj.label === 'string' ? obj.label : '',
          text: typeof obj.text === 'string' ? obj.text : '',
        };
      });
      return boards;
    } catch {
      return null;
    }
  }
  if (state.left !== undefined || state.right !== undefined) {
    return [
      { id: newId(), label: '', text: state.left ?? '' },
      { id: newId(), label: '', text: state.right ?? '' },
    ];
  }
  return null;
}

const isValidBoards = (value: unknown): value is Board[] =>
  Array.isArray(value) &&
  value.length >= 2 &&
  value.every(b => b && typeof b.id === 'string' && typeof b.label === 'string' && typeof b.text === 'string');

const toggleBtn = (active: boolean, disabled = false) =>
  `flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${active
    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
  } ${disabled ? 'opacity-30 cursor-not-allowed' : ''}`;

const countLines = (value: string) => {
  const lines = value.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  return lines.length;
};

interface DiffViewerProps {
  initialState?: Record<string, string>;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ initialState }) => {
  const [storedBoards, setBoards] = usePersistedState<Board[]>('tp:diff:boards', [], true);
  const boards = useMemo(
    () => (isValidBoards(storedBoards) ? storedBoards : readLegacyBoards()),
    [storedBoards]
  );
  const [showDiff, setShowDiff] = useState(false);
  const [mode, setMode] = usePersistedState<DiffMode>('tp:diff:mode', 'lines');
  const [viewLayout, setViewLayout] = usePersistedState<ViewLayout>('tp:diff:viewLayout', 'unified');
  const [baseId, setBaseId] = useState<string | null>(null);
  const [targetId, setTargetId] = useState<string | null>(null);

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);

  useEffect(() => {
    if (!initialState) {
      // Persist migrated legacy boards so they get stable ids.
      if (!isValidBoards(storedBoards)) setBoards(boards);
      return;
    }
    const shared = boardsFromShareState(initialState);
    if (shared) {
      setBoards(shared);
      const baseIdx = Number(initialState.base);
      const targetIdx = Number(initialState.target);
      if (Number.isInteger(baseIdx) && shared[baseIdx]) setBaseId(shared[baseIdx].id);
      if (Number.isInteger(targetIdx) && shared[targetIdx]) setTargetId(shared[targetIdx].id);
    }
    if (initialState.showDiff === 'true') setShowDiff(true);
  }, []);

  useEffect(() => {
    if (viewLayout === 'split' && mode !== 'lines') setMode('lines');
  }, [viewLayout]);

  // Resolve base/target, falling back to sensible defaults when unset or removed.
  const baseIndex = Math.max(0, boards.findIndex(b => b.id === baseId));
  const base = boards[baseIndex];
  let targetIndex = boards.findIndex(b => b.id === targetId);
  if (targetIndex === -1 || targetIndex === baseIndex) targetIndex = baseIndex === 0 ? 1 : 0;
  const target = boards[targetIndex];
  const textA = base.text;
  const textB = target.text;
  const baseName = boardName(base, baseIndex);
  const targetName = boardName(target, targetIndex);

  const updateBoard = (id: string, patch: Partial<Board>) =>
    setBoards(boards.map(b => (b.id === id ? { ...b, ...patch } : b)));

  const addBoard = () => setBoards([...boards, { id: newId(), label: '', text: '' }]);

  const removeBoard = (id: string) => {
    if (boards.length <= 2) return;
    setBoards(boards.filter(b => b.id !== id));
  };

  const clearAll = () => {
    setBoards([
      { id: newId(), label: '', text: '' },
      { id: newId(), label: '', text: '' },
    ]);
    setBaseId(null);
    setTargetId(null);
    setShowDiff(false);
  };

  const handleBaseChange = (id: string) => {
    if (id === target.id) setTargetId(base.id);
    setBaseId(id);
  };

  const swapBaseAndTarget = () => {
    setBaseId(target.id);
    setTargetId(base.id);
  };

  // Per-board line stats against the base, for the target tabs.
  const boardStats = useMemo(() => {
    if (!showDiff) return {} as Record<string, { added: number; removed: number; identical: boolean }>;
    const stats: Record<string, { added: number; removed: number; identical: boolean }> = {};
    boards.forEach(b => {
      if (b.id === base.id) return;
      if (b.text === base.text) {
        stats[b.id] = { added: 0, removed: 0, identical: true };
        return;
      }
      let added = 0;
      let removed = 0;
      for (const part of Diff.diffLines(base.text, b.text)) {
        if (part.added) added += countLines(part.value);
        else if (part.removed) removed += countLines(part.value);
      }
      stats[b.id] = { added, removed, identical: false };
    });
    return stats;
  }, [boards, base.id, base.text, showDiff]);

  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

  const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    requestAnimationFrame(() => { isSyncing.current = false; });
  }, []);

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
    if (textA === textB && textA) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 bg-white dark:bg-slate-900 text-center">
          <FileDiff size={48} className="mx-auto opacity-20 text-slate-400 mb-4" />
          <h3 className="text-lg font-medium text-slate-600 dark:text-slate-300">Text is identical</h3>
          <p className="text-sm text-slate-400 mt-1">No differences were found between {baseName} and {targetName}.</p>
        </div>
      );
    }

    if (viewLayout === 'split') {
      const rows = buildSplitRows(diffResult);
      return (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Column headers */}
          <div className="grid grid-cols-2 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800 truncate">
              {baseName}
            </div>
            <div className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest truncate">
              {targetName}
            </div>
          </div>
          {/* Two scrollable panels */}
          <div className="grid grid-cols-2 flex-1 min-h-0">
            {/* Left panel — Original */}
            <div
              ref={leftPanelRef}
              onScroll={handleLeftScroll}
              className="overflow-auto font-mono text-sm bg-white dark:bg-slate-900 border-r border-slate-100 dark:border-slate-800"
            >
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-0.5 min-w-0 ${
                    row.type === 'removed' || row.type === 'changed'
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-transparent'
                  }`}
                >
                  <span className="w-8 shrink-0 select-none text-right text-xs pt-0.5 text-slate-300 dark:text-slate-600">
                    {row.left?.lineNum ?? ''}
                  </span>
                  <span
                    className={`whitespace-pre overflow-x-hidden ${
                      row.type === 'removed' || row.type === 'changed'
                        ? 'text-red-700 dark:text-red-300'
                        : row.type === 'unchanged'
                        ? 'text-slate-600 dark:text-slate-400'
                        : 'select-none opacity-0'
                    }`}
                  >
                    {row.left?.text ?? ' '}
                  </span>
                </div>
              ))}
            </div>
            {/* Right panel — New */}
            <div
              ref={rightPanelRef}
              onScroll={handleRightScroll}
              className="overflow-auto font-mono text-sm bg-white dark:bg-slate-900"
            >
              {rows.map((row, i) => (
                <div
                  key={i}
                  className={`flex items-start gap-2 px-2 py-0.5 min-w-0 ${
                    row.type === 'added' || row.type === 'changed'
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-transparent'
                  }`}
                >
                  <span className="w-8 shrink-0 select-none text-right text-xs pt-0.5 text-slate-300 dark:text-slate-600">
                    {row.right?.lineNum ?? ''}
                  </span>
                  <span
                    className={`whitespace-pre overflow-x-hidden ${
                      row.type === 'added' || row.type === 'changed'
                        ? 'text-green-700 dark:text-green-300'
                        : row.type === 'unchanged'
                        ? 'text-slate-600 dark:text-slate-400'
                        : 'select-none opacity-0'
                    }`}
                  >
                    {row.right?.text ?? ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }

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

  const hasAnyText = boards.some(b => b.text);
  const compact = boards.length <= 2;

  return (
    <ToolLayout
      description="Compare any number of text sources. Pick a base and see additions, removals, and changes in every other source against it."
      shareToolType={ToolType.DIFF}
      shareState={{
        boards: JSON.stringify(boards.map(b => ({ label: b.label, text: b.text }))),
        base: String(baseIndex),
        target: String(targetIndex),
        ...(showDiff && { showDiff: 'true' }),
      }}
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
              disabled={!hasAnyText}
              className="flex items-center gap-2 px-6 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FileDiff size={16} /> Compare
            </button>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </>
        )
      }
    >
      {!showDiff ? (
        <div
          className={`grid grid-cols-1 md:grid-cols-2 ${compact ? '' : 'xl:grid-cols-3'} gap-6 p-6 flex-1 min-h-0 overflow-y-auto ${compact ? 'md:auto-rows-fr' : 'content-start'}`}
        >
          {boards.map((board, index) => (
            <div key={board.id} className={`flex flex-col gap-2 ${compact ? 'min-h-[220px]' : 'h-72'}`}>
              <div className="flex items-center gap-2 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-widest shrink-0">
                  {boardLetter(index)}
                </span>
                <input
                  value={board.label}
                  onChange={(e) => updateBoard(board.id, { label: e.target.value })}
                  placeholder={`Source ${boardLetter(index)}`}
                  aria-label={`Name for source ${boardLetter(index)}`}
                  className="flex-1 min-w-0 bg-transparent text-xs font-semibold text-slate-600 dark:text-slate-300 placeholder-slate-400 border-b border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus:border-blue-500 focus:outline-none py-0.5"
                />
                {index === baseIndex && (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-1.5 py-0.5 rounded">
                    Base
                  </span>
                )}
                {boards.length > 2 && (
                  <button
                    onClick={() => removeBoard(board.id)}
                    title="Remove source"
                    aria-label={`Remove ${boardName(board, index)}`}
                    className="p-1 text-slate-400 hover:text-red-500 dark:hover:text-red-400 rounded transition-colors"
                  >
                    <X size={14} />
                  </button>
                )}
              </div>
              <textarea
                value={board.text}
                onChange={(e) => updateBoard(board.id, { text: e.target.value })}
                className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
                placeholder={index === 0 ? 'Paste original text here...' : 'Paste text to compare here...'}
              />
            </div>
          ))}
          <button
            onClick={addBoard}
            className={`flex flex-col items-center justify-center gap-2 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:border-blue-300 dark:hover:border-blue-800 hover:bg-blue-50/50 dark:hover:bg-blue-900/10 transition-colors ${compact ? 'min-h-[120px] md:col-span-2 md:min-h-0 md:py-4 md:flex-row' : 'h-72'}`}
          >
            <Plus size={20} />
            <span className="text-sm font-medium">Add source</span>
          </button>
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Source picker */}
          <div className="px-3 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex flex-col md:flex-row md:items-center gap-3">
            <div className="flex items-center gap-2 shrink-0">
              <label htmlFor="diff-base" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Base</label>
              <select
                id="diff-base"
                value={base.id}
                onChange={(e) => handleBaseChange(e.target.value)}
                className="max-w-[180px] text-xs font-medium bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-800 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {boards.map((b, i) => (
                  <option key={b.id} value={b.id}>{boardName(b, i)}</option>
                ))}
              </select>
              <button
                onClick={swapBaseAndTarget}
                title="Swap base and compared source"
                aria-label="Swap base and compared source"
                className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg transition-colors"
              >
                <ArrowLeftRight size={14} />
              </button>
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">vs</span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto min-w-0 pb-1 md:pb-0">
              {boards.map((b, i) => {
                if (i === baseIndex) return null;
                const stat = boardStats[b.id];
                const active = i === targetIndex;
                return (
                  <button
                    key={b.id}
                    onClick={() => setTargetId(b.id)}
                    className={`flex items-center gap-2 shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg border transition-all ${active
                      ? 'bg-white dark:bg-slate-900 border-blue-500 text-blue-600 dark:text-blue-400 shadow-sm'
                      : 'bg-white/60 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                  >
                    <span className="max-w-[140px] truncate">{boardName(b, i)}</span>
                    {stat && (stat.identical ? (
                      <span className="text-[10px] text-slate-400">identical</span>
                    ) : (
                      <span className="flex items-center gap-1 font-mono text-[10px]">
                        <span className="text-green-600 dark:text-green-400">+{stat.added}</span>
                        <span className="text-red-600 dark:text-red-400">−{stat.removed}</span>
                      </span>
                    ))}
                  </button>
                );
              })}
            </div>
          </div>

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

            <div className="flex items-center gap-2">
              {/* Layout toggle */}
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => setViewLayout('unified')} className={toggleBtn(viewLayout === 'unified')}>
                  <AlignJustify size={14} /> Unified
                </button>
                <button
                  onClick={() => {
                    setViewLayout('split');
                    if (mode !== 'lines') setMode('lines');
                  }}
                  className={toggleBtn(viewLayout === 'split')}
                >
                  <Columns size={14} /> Split
                </button>
              </div>

              {/* Mode Selector */}
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <button onClick={() => setMode('lines')} className={toggleBtn(mode === 'lines')}>
                  <AlignJustify size={14} /> Lines
                </button>
                <button
                  onClick={() => setMode('words')}
                  disabled={viewLayout === 'split'}
                  className={toggleBtn(mode === 'words', viewLayout === 'split')}
                >
                  <AlignLeft size={14} /> Words
                </button>
                <button
                  onClick={() => setMode('chars')}
                  disabled={viewLayout === 'split'}
                  className={toggleBtn(mode === 'chars', viewLayout === 'split')}
                >
                  <Type size={14} /> Chars
                </button>
              </div>
            </div>
          </div>

          {renderContent()}
        </div>
      )}
    </ToolLayout>
  );
};

export default DiffViewer;
