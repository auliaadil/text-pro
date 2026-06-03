# Diff Viewer Split View Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a side-by-side Split layout toggle to the Diff Viewer result view, showing Original (A) and New (B) in aligned parallel columns with sync scroll.

**Architecture:** All changes are confined to `src/components/DiffViewer.tsx`. A pure `buildSplitRows` helper converts the existing `diffLines` output into aligned `SplitRow` pairs (null = placeholder). `viewLayout` state controls which rendering path `renderContent()` takes. Two refs enable synchronized scrolling between panels.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `diff` npm package (already installed)

---

## File Map

| File | Action |
|---|---|
| `src/components/DiffViewer.tsx` | Modify — all changes |

---

## Task 1: Add SplitRow type and buildSplitRows helper

**Files:**
- Modify: `src/components/DiffViewer.tsx`

The `buildSplitRows` function is a pure data transformation — no UI, no side effects. Adding it first lets us reason about the core logic in isolation before wiring up the UI.

- [ ] **Step 1: Add SplitRow type and buildSplitRows after the existing DiffMode type**

Open `src/components/DiffViewer.tsx`. Find this line (line 9):
```ts
type DiffMode = 'lines' | 'words' | 'chars';
```

Insert the following immediately after it:
```ts
type ViewLayout = 'unified' | 'split';

type SplitRow = {
  left:  { text: string; lineNum: number } | null;
  right: { text: string; lineNum: number } | null;
};

function buildSplitRows(diffResult: Diff.Change[]): SplitRow[] {
  const rows: SplitRow[] = [];
  let leftNum = 1;
  let rightNum = 1;

  for (const part of diffResult) {
    const lines = part.value.split('\n');
    if (lines[lines.length - 1] === '') lines.pop();

    if (part.removed) {
      for (const text of lines) {
        rows.push({ left: { text, lineNum: leftNum++ }, right: null });
      }
    } else if (part.added) {
      for (const text of lines) {
        rows.push({ left: null, right: { text, lineNum: rightNum++ } });
      }
    } else {
      for (const text of lines) {
        rows.push({
          left:  { text, lineNum: leftNum++ },
          right: { text, lineNum: rightNum++ },
        });
      }
    }
  }

  return rows;
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/DiffViewer.tsx
git commit -m "feat: add SplitRow type and buildSplitRows helper to DiffViewer"
```

---

## Task 2: Add viewLayout state, scroll refs, and scroll handlers

**Files:**
- Modify: `src/components/DiffViewer.tsx`

- [ ] **Step 1: Add viewLayout persisted state and three refs**

Find this block inside the `DiffViewer` component (around line 24):
```ts
  const [mode, setMode] = usePersistedState<DiffMode>('tp:diff:mode', 'lines');
```

Insert the following immediately after that line:
```ts
  const [viewLayout, setViewLayout] = usePersistedState<ViewLayout>('tp:diff:viewLayout', 'unified');

  const leftPanelRef = useRef<HTMLDivElement>(null);
  const rightPanelRef = useRef<HTMLDivElement>(null);
  const isSyncing = useRef(false);
```

- [ ] **Step 2: Add useRef to the React import**

Find the React import at the top of the file:
```ts
import React, { useState, useMemo, useEffect } from 'react';
```

Replace with:
```ts
import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
```

- [ ] **Step 3: Add a safety effect to enforce mode='lines' when viewLayout='split' on load**

Find the existing `useEffect` that applies `initialState` (around line 19):
```ts
  useEffect(() => {
    if (initialState?.left !== undefined) setTextA(initialState.left);
    if (initialState?.right !== undefined) setTextB(initialState.right);
  }, []);
```

Insert the following new effect immediately after it:
```ts
  useEffect(() => {
    if (viewLayout === 'split' && mode !== 'lines') setMode('lines');
  }, [viewLayout]);
```

- [ ] **Step 4: Add scroll handler functions**

Find the `diffResult` useMemo block (around line 26):
```ts
  const diffResult = useMemo(() => {
```

Insert the following two handlers immediately BEFORE that useMemo:
```ts
  const handleLeftScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    isSyncing.current = false;
  }, []);

  const handleRightScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isSyncing.current) return;
    isSyncing.current = true;
    if (leftPanelRef.current) leftPanelRef.current.scrollTop = e.currentTarget.scrollTop;
    isSyncing.current = false;
  }, []);

```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/DiffViewer.tsx
git commit -m "feat: add viewLayout state and sync scroll refs to DiffViewer"
```

---

## Task 3: Add layout toggle to toolbar and update mode selector

**Files:**
- Modify: `src/components/DiffViewer.tsx`

- [ ] **Step 1: Replace the toolbar's right-side controls**

Find the Mode Selector section inside the result view toolbar. It looks like this (roughly lines 169–198):
```tsx
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
```

Replace the entire block above with:
```tsx
            <div className="flex items-center gap-2">
              {/* Layout toggle */}
              <div className="flex bg-white dark:bg-slate-900 p-1 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  onClick={() => setViewLayout('unified')}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewLayout === 'unified'
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  <AlignJustify size={14} /> Unified
                </button>
                <button
                  onClick={() => {
                    setViewLayout('split');
                    if (mode !== 'lines') setMode('lines');
                  }}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewLayout === 'split'
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    }`}
                >
                  <Columns size={14} /> Split
                </button>
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
                  disabled={viewLayout === 'split'}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'words'
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    } ${viewLayout === 'split' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <AlignLeft size={14} /> Words
                </button>
                <button
                  onClick={() => setMode('chars')}
                  disabled={viewLayout === 'split'}
                  className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all ${mode === 'chars'
                    ? 'bg-slate-100 dark:bg-slate-800 text-blue-600 dark:text-blue-400'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                    } ${viewLayout === 'split' ? 'opacity-30 cursor-not-allowed' : ''}`}
                >
                  <Type size={14} /> Chars
                </button>
              </div>
            </div>
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test — toolbar renders correctly**

Run `npm run dev`, open http://localhost:3000, go to Diff Viewer, paste text in both sides, click Compare. Verify:
- Unified / Split toggle appears to the left of Lines / Words / Chars
- Clicking Split highlights the Split button
- Words and Chars buttons appear greyed out when Split is active
- Clicking Unified restores Words/Chars to full opacity

- [ ] **Step 4: Commit**

```bash
git add src/components/DiffViewer.tsx
git commit -m "feat: add layout toggle and disable Words/Chars in split mode"
```

---

## Task 4: Implement split view rendering

**Files:**
- Modify: `src/components/DiffViewer.tsx`

- [ ] **Step 1: Add split view rendering inside renderContent()**

Find the `renderContent` function. It currently starts with:
```tsx
  const renderContent = () => {
    if (textA === textB && textA) {
```

After the identical-text early return block (after the closing `);` of that block, before `if (mode === 'lines')`), insert the split rendering branch:

```tsx
    if (viewLayout === 'split') {
      const rows = buildSplitRows(diffResult);
      return (
        <div className="flex flex-col flex-1 min-h-0">
          {/* Column headers */}
          <div className="grid grid-cols-2 shrink-0 border-b border-slate-100 dark:border-slate-800">
            <div className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest border-r border-slate-100 dark:border-slate-800">
              Original (A)
            </div>
            <div className="px-4 py-2 text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
              New (B)
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
                    row.left
                      ? 'bg-red-50 dark:bg-red-900/20'
                      : 'bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <span className="w-8 shrink-0 select-none text-right text-xs pt-0.5 text-slate-300 dark:text-slate-600">
                    {row.left?.lineNum ?? ''}
                  </span>
                  <span
                    className={`whitespace-pre-wrap break-all ${
                      row.left
                        ? 'text-red-700 dark:text-red-300'
                        : 'select-none opacity-0'
                    }`}
                  >
                    {row.left?.text ?? ' '}
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
                    row.right
                      ? 'bg-green-50 dark:bg-green-900/20'
                      : 'bg-slate-50 dark:bg-slate-900/50'
                  }`}
                >
                  <span className="w-8 shrink-0 select-none text-right text-xs pt-0.5 text-slate-300 dark:text-slate-600">
                    {row.right?.lineNum ?? ''}
                  </span>
                  <span
                    className={`whitespace-pre-wrap break-all ${
                      row.right
                        ? 'text-green-700 dark:text-green-300'
                        : 'select-none opacity-0'
                    }`}
                  >
                    {row.right?.text ?? ' '}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      );
    }
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Manual end-to-end test**

Run `npm run dev`, go to Diff Viewer. Test these cases:

**Removed-only:**
- Left: `line one\nline two\nline three`, Right: `line three`
- Click Compare → Split
- Expected: rows 1 and 2 on left have red background, right side shows grey placeholder rows. Row 3 (unchanged) aligns on both sides.

**Added-only:**
- Left: `line one`, Right: `line one\nline two added\nline three added`
- Click Compare → Split
- Expected: left shows one content row + two grey placeholders. Right shows three green rows.

**Mixed:**
- Left: `foo\nbar\nbaz`, Right: `foo\nQUX\nbaz`
- Click Compare → Split
- Expected: `foo` aligns on both sides (unchanged). `bar` on left (red), `QUX` on right (green). `baz` aligns on both sides.

**Sync scroll:**
- Paste 50+ lines on each side with differences, click Compare → Split
- Scroll left panel → right panel moves in sync
- Scroll right panel → left panel moves in sync

**Layout toggle:**
- Click Unified → existing unified view restored exactly as before
- Click Split again → split view re-appears with same diff

**Persistence:**
- Set to Split, reload page, click Compare → Split view is the default

- [ ] **Step 4: Run production build**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/DiffViewer.tsx
git commit -m "feat: implement side-by-side split view with aligned rows and sync scroll"
```
