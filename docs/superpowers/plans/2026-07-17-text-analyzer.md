# Text Analyzer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge Text Counter and Text Splitter into a single "Text Analyzer" tool with a shared textarea, Stats tab, and Split tab — with an improved Character delimiter picker.

**Architecture:** A new `TextAnalyzer` component replaces both old components. All delimiter and tab state is persisted via `usePersistedState`. The old `COUNTER` and `SPLITTER` ToolType values are kept in the enum (required for `parseShareHash` backward compat) but are mapped to `/text-analyzer` in `TOOL_PATHS` so old share links still resolve. The sidebar removes the two old entries and adds one new one.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, Lucide React, `usePersistedState` hook, React Router v6

## Global Constraints

- Tailwind class-based dark mode (`dark:` prefix), never inline styles
- All persisted state via `usePersistedState(key, default, isContent?)` — content state passes `true` as third arg
- Icons from `lucide-react` only
- No new dependencies
- Old localStorage keys (`tp:counter:*`, `tp:splitter:*`) are abandoned — no migration
- `COUNTER` and `SPLITTER` must stay in `ToolType` enum (shareService validates against it)

---

### Task 1: Add ANALYZER to ToolType and TOOL_PATHS

**Files:**
- Modify: `src/types.ts`
- Modify: `src/App.tsx` (TOOL_PATHS and PATH_TO_TOOL only — no route or sidebar changes yet)

**Interfaces:**
- Produces: `ToolType.ANALYZER = 'analyzer'` used by Tasks 2 and 3

- [ ] **Step 1: Add ANALYZER to ToolType enum**

Open `src/types.ts` and add `ANALYZER` as the first entry:

```ts
export enum ToolType {
  ANALYZER = 'analyzer',
  COUNTER = 'counter',
  SPLITTER = 'splitter',
  REFORMATTER = 'reformatter',
  DIFF = 'diff',
  JSON = 'json',
  HTML = 'html',
  MARKDOWN = 'markdown',
  AI_ASSISTANT = 'ai_assistant',
  ABOUT = 'about'
}
```

- [ ] **Step 2: Update TOOL_PATHS in App.tsx**

In `src/App.tsx`, replace the `TOOL_PATHS` constant (lines 37–47) with:

```ts
const TOOL_PATHS: Record<ToolType, string> = {
  [ToolType.ANALYZER]: '/text-analyzer',
  [ToolType.COUNTER]: '/text-analyzer',   // backward compat — old share links resolve here
  [ToolType.SPLITTER]: '/text-analyzer',  // backward compat — old share links resolve here
  [ToolType.REFORMATTER]: '/reformatter',
  [ToolType.DIFF]: '/diff-checker',
  [ToolType.JSON]: '/json-formatter',
  [ToolType.HTML]: '/html-formatter',
  [ToolType.MARKDOWN]: '/markdown-viewer',
  [ToolType.AI_ASSISTANT]: '/ai-assistant',
  [ToolType.ABOUT]: '/about',
};
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error|warning" | head -20
```

Expected: no type errors (there will be an unused import warning for `TextCounter`/`TextSplitter` after later tasks, but no errors at this stage).

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/App.tsx
git commit -m "feat: add ToolType.ANALYZER and map old types to /text-analyzer"
```

---

### Task 2: Build TextAnalyzer component

**Files:**
- Create: `src/components/TextAnalyzer.tsx`

**Interfaces:**
- Consumes: `ToolType.ANALYZER` from Task 1; `usePersistedState` from `../hooks/usePersistedState`; `ToolLayout`, `Toast` from existing components
- Produces: `TextAnalyzer` default export, `TextAnalyzerProps` interface with `initialState?: Record<string, string>`

- [ ] **Step 1: Create the file with all imports and constants**

Create `src/components/TextAnalyzer.tsx`:

```tsx
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Trash2, Clock, AlignLeft, Hash, Scissors, ScanText } from 'lucide-react';
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
```

- [ ] **Step 2: Add the DelimiterPicker sub-component**

Append to the same file (before `TextAnalyzer`):

```tsx
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
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
```

- [ ] **Step 3: Add the StatBox sub-component**

Append to the same file:

```tsx
const StatBox: React.FC<{ icon: React.ReactNode; label: string; value: string | number }> = ({ icon, label, value }) => (
  <div className="p-4 flex flex-col items-center justify-center gap-1 hover:bg-white dark:hover:bg-slate-900 transition-colors">
    <div className="flex items-center gap-1.5 text-slate-400">
      {icon}
      <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
    </div>
    <span className="text-xl font-bold text-slate-800 dark:text-slate-200">{value}</span>
  </div>
);
```

- [ ] **Step 4: Add the main TextAnalyzer component**

Append to the same file:

```tsx
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
    const lines = text === '' ? 0 : text.split('\n').length;
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
    return text.split(active).length - 1;
  }, [text, delimiter, charDelimiter, customDelimiter, charLimit]);

  const occurrenceLabel = useMemo(() => {
    if (delimiter === 'char_limit') return 'Est. Chunks';
    if (delimiter === '\n') return 'New Lines';
    if (delimiter === 'character') return `${CHAR_LABELS[charDelimiter] ?? charDelimiter}s`;
    return 'Matches';
  }, [delimiter, charDelimiter]);

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

  const handleCopy = (content: string, msg: string) => {
    navigator.clipboard.writeText(content);
    setToastMessage(msg);
    setShowToast(true);
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
                <StatBox icon={<Clock size={16} />} label="Read Time" value={`${stats.readingTime}m`} />
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
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "error TS" | head -20
```

Expected: no TypeScript errors in `TextAnalyzer.tsx`. (Unused import warnings from App.tsx for old components are fine — those get removed in Task 3.)

- [ ] **Step 6: Commit**

```bash
git add src/components/TextAnalyzer.tsx
git commit -m "feat: add TextAnalyzer component with Stats/Split tabs and Character delimiter picker"
```

---

### Task 3: Wire into App.tsx and clean up old files

**Files:**
- Modify: `src/App.tsx` (import, sidebar tools, routes, share redirect logic)
- Delete: `src/components/TextCounter.tsx`
- Delete: `src/components/TextSplitter.tsx`

**Interfaces:**
- Consumes: `TextAnalyzer` default export from Task 2; `ToolType.ANALYZER` from Task 1

- [ ] **Step 1: Update imports in App.tsx**

Replace the two old component imports:
```ts
import TextCounter from './components/TextCounter';
import TextSplitter from './components/TextSplitter';
```

With:
```ts
import TextAnalyzer from './components/TextAnalyzer';
```

Also add `ScanText` to the lucide-react import (replace `Hash, Scissors` with `ScanText` — those icons are no longer used in App.tsx):

Current import line:
```ts
import {
  Hash,
  Scissors,
  Type,
  FileDiff,
  Code,
  FileCode,
  Eye,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Info,
  Database
} from 'lucide-react';
```

Replace with:
```ts
import {
  ScanText,
  Type,
  FileDiff,
  Code,
  FileCode,
  Eye,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun,
  Info,
  Database
} from 'lucide-react';
```

- [ ] **Step 2: Replace sidebar tools array**

Find the `tools` array in App.tsx (around line 115):
```ts
const tools = [
  { id: ToolType.COUNTER, name: 'Text Counter', icon: <Hash size={20} /> },
  { id: ToolType.SPLITTER, name: 'Text Splitter', icon: <Scissors size={20} /> },
  ...
];
```

Replace the first two entries so the array becomes:
```ts
const tools = [
  { id: ToolType.ANALYZER, name: 'Text Analyzer', icon: <ScanText size={20} /> },
  { id: ToolType.REFORMATTER, name: 'Reformatter', icon: <Type size={20} /> },
  { id: ToolType.DIFF, name: 'Diff Checker', icon: <FileDiff size={20} /> },
  { id: ToolType.JSON, name: 'JSON Formatter', icon: <Code size={20} /> },
  { id: ToolType.HTML, name: 'HTML Formatter', icon: <FileCode size={20} /> },
  { id: ToolType.MARKDOWN, name: 'MD Viewer', icon: <Eye size={20} /> },
  { id: ToolType.AI_ASSISTANT, name: 'AI Assistant', icon: <Sparkles size={20} />, primary: true },
];
```

- [ ] **Step 3: Update share initial state helper**

Find the `si` helper (around line 126):
```ts
const si = (tool: ToolType) => tool === shareTargetTool ? shareInitialState : undefined;
```

Replace with (maps old COUNTER/SPLITTER share targets to ANALYZER so `initialState` propagates correctly):
```ts
const effectiveShareTarget = shareTargetTool === ToolType.COUNTER || shareTargetTool === ToolType.SPLITTER
  ? ToolType.ANALYZER
  : shareTargetTool;

const si = (tool: ToolType) => tool === effectiveShareTarget ? shareInitialState : undefined;
```

- [ ] **Step 4: Update the Routes block**

Find the `<Routes>` block in App.tsx and replace it with:

```tsx
<Routes>
  <Route path="/" element={<Navigate to="/text-analyzer" replace />} />
  <Route path="/text-analyzer" element={<TextAnalyzer key={shareKey} initialState={si(ToolType.ANALYZER)} />} />
  <Route path="/text-counter" element={<Navigate to="/text-analyzer" replace />} />
  <Route path="/text-splitter" element={<Navigate to="/text-analyzer" replace />} />
  <Route path="/reformatter" element={<TextReformatter key={shareKey} initialState={si(ToolType.REFORMATTER)} />} />
  <Route path="/diff-checker" element={<DiffViewer key={shareKey} initialState={si(ToolType.DIFF)} />} />
  <Route path="/json-formatter" element={<JsonFormatter key={shareKey} initialState={si(ToolType.JSON)} />} />
  <Route path="/html-formatter" element={<HtmlFormatter key={shareKey} initialState={si(ToolType.HTML)} />} />
  <Route path="/markdown-viewer" element={<MarkdownViewer key={shareKey} initialState={si(ToolType.MARKDOWN)} />} />
  <Route path="/ai-assistant" element={<AiAssistant key={shareKey} initialState={si(ToolType.AI_ASSISTANT)} />} />
  <Route path="/about" element={<AboutPage />} />
  <Route path="*" element={<Navigate to="/text-analyzer" replace />} />
</Routes>
```

- [ ] **Step 5: Delete old component files**

```bash
rm src/components/TextCounter.tsx src/components/TextSplitter.tsx
```

- [ ] **Step 6: Verify full build passes**

```bash
npm run build 2>&1
```

Expected: clean build, no TypeScript errors, no missing module errors.

- [ ] **Step 7: Start dev server and verify in browser**

```bash
npm run dev
```

Open `http://localhost:3000` and confirm:
- Sidebar shows "Text Analyzer" (not "Text Counter" or "Text Splitter")
- Navigating to `/text-counter` and `/text-splitter` redirects to `/text-analyzer`
- Stats tab shows all 6 stat boxes and a "Count by" section with delimiter picker and live occurrences count
- Split tab shows the 4-pill delimiter picker; hovering "Character" reveals the popover with Comma/Space/Pipe/Semicolon/Tab options; selecting one updates the pill label
- Entering text and clicking "Split Text" produces numbered result chunks, each with a copy button
- Clear button wipes the textarea and split results
- Dark mode works on both tabs
- Sharing from the toolbar encodes `tool: 'analyzer'`

- [ ] **Step 8: Commit**

```bash
git add src/App.tsx
git rm src/components/TextCounter.tsx src/components/TextSplitter.tsx
git commit -m "feat: wire TextAnalyzer into App, remove TextCounter and TextSplitter"
```
