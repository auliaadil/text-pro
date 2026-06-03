# Diff Viewer — Side-by-Side Split View

**Date:** 2026-06-03  
**Status:** Approved

## Overview

Add a **Split** layout toggle to the Diff Viewer result view. When active, the diff is displayed as two parallel columns (Original A on the left, New B on the right) with rows aligned using empty placeholders so unchanged lines always face each other. Both panels scroll in sync. The existing Unified view is preserved and remains the default.

## Architecture

All changes are self-contained inside `src/components/DiffViewer.tsx`. No new files are needed.

**New state:**
- `viewLayout: 'unified' | 'split'` — persisted via `usePersistedState('tp:diff:viewLayout', 'unified')`
- `leftPanelRef` and `rightPanelRef` — `useRef<HTMLDivElement>` for sync scrolling
- `isSyncing` — `useRef<boolean>` to prevent scroll feedback loops

**New pure helper function** `buildSplitRows(diffResult: Diff.Change[]): SplitRow[]` defined inside the file (not exported):

```ts
type SplitRow = {
  left:  { text: string; lineNum: number } | null;
  right: { text: string; lineNum: number } | null;
};
```

Processing rules per diff part:
- `removed` → one `SplitRow` per line: `left = { text, lineNum }`, `right = null`
- `added` → one row per line: `left = null`, `right = { text, lineNum }`
- unchanged → one row per line: both sides filled, independent line number counters

Two counters `leftNum` and `rightNum` increment only when the respective side has content. Placeholders (null) do not increment either counter.

**Mode constraint:** Words and Chars diff modes are not meaningful for a split layout. When `viewLayout === 'split'`, the Words and Chars buttons are disabled (greyed out) and `mode` is forced to `'lines'` if it was set to something else when the user switches to Split.

## UI Layout

### Toolbar (result view header)

The toolbar has two control groups, right-aligned:

1. **Layout toggle** (new) — `Unified | Split` pill selector, sits to the LEFT of the existing mode selector
2. **Mode selector** (existing) — `Lines | Words | Chars`; Words and Chars are `disabled` + reduced opacity when Split is active

### Split panel

```
┌─────────────────────────┬─────────────────────────┐
│ ORIGINAL (A)            │ NEW (B)                  │
├─────────────────────────┼─────────────────────────┤
│ 1 │ function greet() {  │ 1 │ function greet(n) { │  ← removed / added
│ 2 │ return 'hi';        │ 2 │ return 'hi ' + n;   │  ← removed / added
│   │ ░░░░░░░░░░░░░░░░░   │ 3 │   // new comment    │  ← placeholder left
│ 3 │ }                   │ 4 │ }                   │  ← unchanged
└─────────────────────────┴─────────────────────────┘
```

- Column headers: "Original (A)" / "New (B)" in small uppercase labels
- Removed lines: red background (`bg-red-50 dark:bg-red-900/20`), red text, on left side
- Added lines: green background (`bg-green-50 dark:bg-green-900/20`), green text, on right side
- Placeholder rows: subtle grey background (`bg-slate-50 dark:bg-slate-900/50`), no text, non-selectable
- Unchanged lines: default text colour, same content on both sides
- Line numbers: independent per side, left-aligned in a fixed-width gutter
- Each panel: `overflow-x: auto` for long lines; `overflow-y: hidden` (outer container handles vertical scroll)

### Sync scroll

```ts
const handleLeftScroll = (e: React.UIEvent<HTMLDivElement>) => {
  if (isSyncing.current) return;
  isSyncing.current = true;
  if (rightPanelRef.current) rightPanelRef.current.scrollTop = e.currentTarget.scrollTop;
  isSyncing.current = false;
};
// mirror for right panel
```

## Data Flow

1. User clicks Compare → `showDiff = true`
2. `diffResult` computed via `Diff.diffLines(textA, textB)` (existing)
3. When `viewLayout === 'split'`: `buildSplitRows(diffResult)` computes `SplitRow[]`
4. `renderContent()` branches on `viewLayout` — split path renders the two-column grid, unified path unchanged

## Edge Cases

| Scenario | Behaviour |
|---|---|
| Texts are identical | Existing "Text is identical" empty state — same for both layouts |
| Words/Chars active, user switches to Split | `mode` auto-resets to `'lines'`; Words/Chars buttons disabled |
| User switches back to Unified | `mode` restored to last Unified selection; Words/Chars re-enabled |
| Very long lines | Each panel scrolls independently on X axis |
| Empty text on one side | All lines on the populated side appear as removed or added; empty side shows all placeholders |

## Testing

Manual testing covers all critical paths:

- Switch to Split → two columns appear with "Original (A)" / "New (B)" labels
- Removed-only change → left has red row, right shows placeholder
- Added-only change → right has green row, left shows placeholder
- Mixed change (some removed, some added) → rows align correctly, unchanged lines face each other
- Scroll left panel → right panel moves in sync; scroll right panel → left moves in sync
- Switch back to Unified → existing view restored unchanged
- Words/Chars mode disabled when Split active; switching to Unified re-enables them
- `viewLayout` persists across page reload
- Share URL with Split active → recipient sees Split view (viewLayout is persisted, not in share state)
