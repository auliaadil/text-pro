# Text Analyzer — Design Spec

**Date:** 2026-07-17  
**Status:** Approved

---

## Overview

Merge the existing **Text Counter** and **Text Splitter** tools into a single tool called **Text Analyzer**. The merged tool has a shared text input and two tabs — **Stats** and **Split** — that switch the panel below the input.

---

## Layout

A single `textarea` sits at the top of the tool, shared across both tabs. Below it, a tab bar switches between **Stats** and **Split** panels. The active tab is persisted so the user returns to where they left off.

---

## Stats Tab

Displays the full stat strip:

| Stat | Description |
|---|---|
| Words | Whitespace-delimited word count |
| Characters | Raw character count |
| Lines | Newline-delimited line count |
| Sentences | Count of `.`, `!`, `?`-terminated segments |
| Paragraphs | Double-newline-delimited paragraph count |
| Read Time | `ceil(words / 200)` minutes |

Below the strip, a **"Count by"** section shows the delimiter picker (same component as the Split tab) and appends an **Occurrences** stat to the strip showing how many times the selected delimiter appears in the text. This is live/reactive — no button press required.

---

## Split Tab

### Delimiter Picker

Four pill buttons replace the current six:

| Pill | Behavior |
|---|---|
| **New Line** | Splits on `\n` |
| **Character** | Hover (or click on mobile) opens a popover with: `,` Comma, ` ` Space, `\|` Pipe, `;` Semicolon, `\t` Tab. Clicking a character selects it and closes the popover. The selected character is shown as a badge on the pill: e.g. `Character · ,` |
| **Char Limit** | Reveals a number input; splits into fixed-size chunks |
| **Custom** | Reveals a text input for an arbitrary delimiter string |

### Results Panel

Identical to the current TextSplitter results panel: numbered chunks, per-chunk copy button, "Clear all" link, empty state with scissors icon.

A **"Split Text"** primary button triggers the split. The results panel appears below the delimiter picker on the same tab.

---

## Navigation & Routing

- Remove **Text Counter** and **Text Splitter** from the sidebar.
- Add **Text Analyzer** with the `ScanText` Lucide icon.
- Route: `/text-analyzer`
- Old routes `/text-counter` and `/text-splitter` redirect to `/text-analyzer`.
- `ToolType` enum: add `ANALYZER = 'analyzer'`; retire `COUNTER` and `SPLITTER`.
- Share links: `ANALYZER` handles both share scenarios. Old `COUNTER`/`SPLITTER` share payloads redirect gracefully to `/text-analyzer` (the `text` state field name is the same in all three tools).

---

## Persisted State

| Key | Type | Purpose |
|---|---|---|
| `tp:analyzer:text` | string | Shared input text |
| `tp:analyzer:activeTab` | `'stats' \| 'split'` | Last active tab |
| `tp:analyzer:delimiter` | string | Selected delimiter mode (`'\n'`, `'character'`, `'char_limit'`, `'custom'`) |
| `tp:analyzer:charDelimiter` | string | Selected character within the Character popover (default: `,`) |
| `tp:analyzer:customDelimiter` | string | Custom delimiter string |
| `tp:analyzer:charLimit` | string | Char limit value (stored as string for input compatibility) |

Old keys (`tp:counter:*`, `tp:splitter:*`) are abandoned — no migration needed.

---

## Files Affected

| File | Change |
|---|---|
| `src/types.ts` | Add `ANALYZER`, retire `COUNTER` and `SPLITTER` |
| `src/App.tsx` | Update `TOOL_PATHS`, `PATH_TO_TOOL`, routes, sidebar tools list, share redirect logic |
| `src/components/TextAnalyzer.tsx` | New file — merged component |
| `src/components/TextCounter.tsx` | Delete |
| `src/components/TextSplitter.tsx` | Delete |

---

## Out of Scope

- No changes to any other tool.
- No migration of old localStorage keys.
- No changes to share link URL format — only the tool type identifier changes.
