# Pastebin-Style URL Sharing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a Share button to every TextPro tool that generates a compressed, self-contained URL so anyone with the link can open the same content in the correct tool and edit it immediately.

**Architecture:** The payload `{ tool, state }` is JSON-serialized and compressed with `lz-string`, then embedded in the URL hash as `#share=<compressed>`. On page load, `App.tsx` reads the hash, sets the active tool, and passes `initialState` to the active tool component. Each tool applies the override on first mount only.

**Tech Stack:** React 19, TypeScript, Tailwind CSS v4, `lz-string` (new dependency)

---

## File Map

| File | Action | Purpose |
|---|---|---|
| `src/types.ts` | Modify | Add `SharePayload` and `ShareResult` types |
| `src/services/shareService.ts` | **Create** | `encode`, `buildShareUrl`, `parseShareHash` pure functions |
| `src/components/ShareErrorDialog.tsx` | **Create** | Reusable dismissable dialog for share errors |
| `src/components/ToolLayout.tsx` | Modify | Add optional `shareToolType`/`shareState` props + Share button |
| `src/App.tsx` | Modify | Parse share hash on mount; pass `initialState` to tool components |
| `src/components/TextCounter.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/TextSplitter.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/TextReformatter.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/DiffViewer.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/JsonFormatter.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/HtmlFormatter.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/MarkdownViewer.tsx` | Modify | Accept + apply `initialState` prop |
| `src/components/AiAssistant.tsx` | Modify | Accept + apply `initialState` prop |
| `package.json` | Modify | Add `lz-string` dependency |

---

## Task 1: Install lz-string and add shared types

**Files:**
- Modify: `package.json`
- Modify: `src/types.ts`

- [ ] **Step 1: Install lz-string**

```bash
cd /path/to/text-pro
npm install lz-string
```

Expected output: `added 1 package` (lz-string has no sub-dependencies).

- [ ] **Step 2: Verify types are available**

```bash
ls node_modules/lz-string/typings/
```

Expected: `lz-string.d.ts` (types are bundled with the package — no `@types/lz-string` needed).

- [ ] **Step 3: Add SharePayload and ShareResult to src/types.ts**

Open `src/types.ts` and append at the bottom:

```ts
export interface SharePayload {
  tool: ToolType;
  state: Record<string, string>;
}

export type ShareResult =
  | { type: 'none' }
  | { type: 'payload'; data: SharePayload }
  | { type: 'error'; reason: 'corrupt' | 'unknown-tool' };
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json src/types.ts
git commit -m "feat: install lz-string and add SharePayload/ShareResult types"
```

---

## Task 2: Create shareService.ts

**Files:**
- Create: `src/services/shareService.ts`

- [ ] **Step 1: Create the file**

Create `src/services/shareService.ts` with this exact content:

```ts
import LZString from 'lz-string';
import { ToolType, SharePayload, ShareResult } from '../types';

const HASH_PREFIX = 'share=';
const MAX_URL_LENGTH = 8000;

export function encode(tool: ToolType, state: Record<string, string>): string {
  const payload: SharePayload = { tool, state };
  return LZString.compressToEncodedURIComponent(JSON.stringify(payload));
}

export function buildShareUrl(tool: ToolType, state: Record<string, string>): string {
  const compressed = encode(tool, state);
  const base = `${window.location.origin}${window.location.pathname}`;
  return `${base}#${HASH_PREFIX}${compressed}`;
}

export function parseShareHash(): ShareResult {
  const hash = window.location.hash;
  if (!hash.startsWith(`#${HASH_PREFIX}`)) {
    return { type: 'none' };
  }

  const compressed = hash.slice(HASH_PREFIX.length + 1); // +1 for '#'
  try {
    const json = LZString.decompressFromEncodedURIComponent(compressed);
    if (!json) return { type: 'error', reason: 'corrupt' };

    const parsed = JSON.parse(json) as SharePayload;

    if (!parsed.tool || !Object.values(ToolType).includes(parsed.tool)) {
      return { type: 'error', reason: 'unknown-tool' };
    }

    return { type: 'payload', data: parsed };
  } catch {
    return { type: 'error', reason: 'corrupt' };
  }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Quick smoke test in the browser**

Run `npm run dev`, open the browser console and paste:

```js
import('/src/services/shareService.ts').then(m => {
  const url = m.buildShareUrl('json', { input: '{"hello":"world"}' });
  console.log('URL:', url);
  console.log('Length:', url.length);
});
```

Expected: a URL ending in `#share=` followed by a compressed string, significantly shorter than a raw base64 encoding would be.

- [ ] **Step 4: Commit**

```bash
git add src/services/shareService.ts
git commit -m "feat: add shareService with lz-string encode/decode"
```

---

## Task 3: Create ShareErrorDialog component

**Files:**
- Create: `src/components/ShareErrorDialog.tsx`

This is a small, reusable modal used for both encode errors (URL too large) and decode errors (corrupt hash, unknown tool) at the App level.

- [ ] **Step 1: Create the file**

Create `src/components/ShareErrorDialog.tsx`:

```tsx
import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ShareErrorDialogProps {
  message: string;
  onClose: () => void;
}

const ShareErrorDialog: React.FC<ShareErrorDialogProps> = ({ message, onClose }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4 animate-in fade-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X size={16} />
        </button>

        <div className="flex items-start gap-3">
          <div className="shrink-0 w-9 h-9 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center">
            <AlertTriangle size={18} className="text-amber-600 dark:text-amber-400" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-800 dark:text-white text-sm mb-1">Share Error</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">{message}</p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          OK
        </button>
      </div>
    </div>
  );
};

export default ShareErrorDialog;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareErrorDialog.tsx
git commit -m "feat: add ShareErrorDialog component"
```

---

## Task 4: Add Share button to ToolLayout

**Files:**
- Modify: `src/components/ToolLayout.tsx`

`ToolLayout` gets two new optional props. When both are present, it renders a Share button that handles compression, clipboard copy, and the "too large" error dialog internally.

- [ ] **Step 1: Update ToolLayout.tsx**

Replace the entire contents of `src/components/ToolLayout.tsx` with:

```tsx
import React, { ReactNode, useState } from 'react';
import { Share2 } from 'lucide-react';
import { ToolType } from '../types';
import { buildShareUrl } from '../services/shareService';
import Toast from './Toast';
import ShareErrorDialog from './ShareErrorDialog';

interface ToolLayoutProps {
  children: ReactNode;
  actions?: ReactNode;
  description?: string;
  shareToolType?: ToolType;
  shareState?: Record<string, string>;
}

const ToolLayout: React.FC<ToolLayoutProps> = ({
  children,
  actions,
  description,
  shareToolType,
  shareState,
}) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showTooLargeDialog, setShowTooLargeDialog] = useState(false);

  const handleShare = async () => {
    if (!shareToolType || !shareState) return;

    const url = buildShareUrl(shareToolType, shareState);

    if (url.length > 8000) {
      setShowTooLargeDialog(true);
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const el = document.createElement('textarea');
      el.value = url;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
    }

    setShowCopiedToast(true);
  };

  const canShare = shareToolType !== undefined && shareState !== undefined;

  return (
    <>
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>
          )}
          <div className="flex items-center gap-2">
            {actions}
            {canShare && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Share2 size={16} /> Share
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors flex flex-col">
          {children}
        </div>
      </div>

      <Toast
        message="Link copied!"
        isVisible={showCopiedToast}
        onClose={() => setShowCopiedToast(false)}
      />

      {showTooLargeDialog && (
        <ShareErrorDialog
          message="Your content is too large to share via URL. Try reducing the input size."
          onClose={() => setShowTooLargeDialog(false)}
        />
      )}
    </>
  );
};

export default ToolLayout;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Smoke test in browser**

Run `npm run dev`. Open any tool (e.g., JSON Formatter). The Share button should NOT appear yet because no tool passes `shareToolType`/`shareState` yet. Verify the layout looks unchanged.

- [ ] **Step 4: Commit**

```bash
git add src/components/ToolLayout.tsx
git commit -m "feat: add Share button to ToolLayout with clipboard copy and error handling"
```

---

## Task 5: Handle share hash in App.tsx and wire up initialState

**Files:**
- Modify: `src/App.tsx`

App.tsx reads the hash on mount and passes `initialState` down to the active tool component.

- [ ] **Step 1: Add share hash handling and initialState wiring to App.tsx**

At the top of `App.tsx`, add the new import:

```ts
import { parseShareHash } from './services/shareService';
import ShareErrorDialog from './components/ShareErrorDialog';
```

Inside the `App` component, add new state after the existing `useState`/`usePersistedState` declarations:

```tsx
const [shareInitialState, setShareInitialState] = useState<Record<string, string> | undefined>(undefined);
const [shareErrorMessage, setShareErrorMessage] = useState<string | null>(null);
```

Add a new `useEffect` after the existing effects (after the resize handler effect):

```tsx
useEffect(() => {
  const result = parseShareHash();
  if (result.type === 'payload') {
    setActiveTool(result.data.tool);
    setShareInitialState(result.data.state);
    history.replaceState(null, '', window.location.pathname + window.location.search);
  } else if (result.type === 'error') {
    const message = result.reason === 'unknown-tool'
      ? 'This share link references a tool that doesn\'t exist. The app has loaded normally.'
      : 'This share link appears to be broken or incomplete. The app has loaded normally.';
    setShareErrorMessage(message);
  }
}, []);
```

Update `renderTool()` to pass `initialState` to each tool:

```tsx
const renderTool = () => {
  switch (activeTool) {
    case ToolType.COUNTER:    return <TextCounter initialState={shareInitialState} />;
    case ToolType.SPLITTER:   return <TextSplitter initialState={shareInitialState} />;
    case ToolType.REFORMATTER: return <TextReformatter initialState={shareInitialState} />;
    case ToolType.DIFF:       return <DiffViewer initialState={shareInitialState} />;
    case ToolType.JSON:       return <JsonFormatter initialState={shareInitialState} />;
    case ToolType.HTML:       return <HtmlFormatter initialState={shareInitialState} />;
    case ToolType.MARKDOWN:   return <MarkdownViewer initialState={shareInitialState} />;
    case ToolType.AI_ASSISTANT: return <AiAssistant initialState={shareInitialState} />;
    case ToolType.ABOUT:      return <AboutPage />;
    default:                  return <TextCounter />;
  }
};
```

At the bottom of the JSX, just before `<Analytics />`, add the error dialog:

```tsx
{shareErrorMessage && (
  <ShareErrorDialog
    message={shareErrorMessage}
    onClose={() => setShareErrorMessage(null)}
  />
)}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: TypeScript errors for `initialState` prop on each tool component — that's expected and will be fixed in Task 6.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: parse share hash on mount and pass initialState to tool components"
```

---

## Task 6: Add initialState prop to all tool components

Each tool gets an `initialState?: Record<string, string>` prop. On mount, if the override is provided, the matching state setter is called. After the first render, normal `usePersistedState` behaviour takes over.

The state field names to read from `initialState` for each tool are shown in each step below.

---

### Task 6a: TextCounter

**Files:**
- Modify: `src/components/TextCounter.tsx`

- [ ] **Step 1: Add initialState prop**

Add `useEffect` import if not present (it already is in this file). Add the prop type and apply it:

Find this line:
```tsx
const TextCounter: React.FC = () => {
  const [text, setText] = usePersistedState('tp:counter:text', '', true);
```

Replace with:
```tsx
interface TextCounterProps {
  initialState?: Record<string, string>;
}

const TextCounter: React.FC<TextCounterProps> = ({ initialState }) => {
  const [text, setText] = usePersistedState('tp:counter:text', '', true);

  useEffect(() => {
    if (initialState?.text !== undefined) setText(initialState.text);
  }, []);
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

Find the `<ToolLayout` JSX in `TextCounter.tsx` and add the two new props:

```tsx
<ToolLayout
  description="Count characters, words, lines, sentences, paragraphs and estimate reading time."
  shareToolType={ToolType.COUNTER}
  shareState={{ text }}
  actions={...}
>
```

You'll also need to import `ToolType` at the top:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors for TextCounter.

- [ ] **Step 4: Manual test**

Run `npm run dev`. Open Text Counter, type some text, click Share. Verify "Link copied!" toast appears. Open the copied URL in a new tab. Verify Text Counter loads with the same text.

- [ ] **Step 5: Commit**

```bash
git add src/components/TextCounter.tsx
git commit -m "feat: add share support to TextCounter"
```

---

### Task 6b: TextSplitter

**Files:**
- Modify: `src/components/TextSplitter.tsx`

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const TextSplitter: React.FC = () => {
  const [text, setText] = usePersistedState('tp:splitter:text', '');
```

Replace with:
```tsx
interface TextSplitterProps {
  initialState?: Record<string, string>;
}

const TextSplitter: React.FC<TextSplitterProps> = ({ initialState }) => {
  const [text, setText] = usePersistedState('tp:splitter:text', '');

  useEffect(() => {
    if (initialState?.text !== undefined) setText(initialState.text);
  }, []);
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

Find the `<ToolLayout` in `TextSplitter.tsx` and add:

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.SPLITTER}
  shareState={{ text }}
  actions={...}
>
```

Import `ToolType`:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TextSplitter.tsx
git commit -m "feat: add share support to TextSplitter"
```

---

### Task 6c: TextReformatter

**Files:**
- Modify: `src/components/TextReformatter.tsx`

Only `input` is shared — `output` is derived and not worth sharing.

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const TextReformatter: React.FC = () => {
  const [input, setInput] = usePersistedState('tp:reformatter:input', '', true);
```

Replace with:
```tsx
interface TextReformatterProps {
  initialState?: Record<string, string>;
}

const TextReformatter: React.FC<TextReformatterProps> = ({ initialState }) => {
  const [input, setInput] = usePersistedState('tp:reformatter:input', '', true);

  useEffect(() => {
    if (initialState?.input !== undefined) setInput(initialState.input);
  }, []);
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.REFORMATTER}
  shareState={{ input }}
  actions={...}
>
```

Import `ToolType`:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/TextReformatter.tsx
git commit -m "feat: add share support to TextReformatter"
```

---

### Task 6d: DiffViewer

**Files:**
- Modify: `src/components/DiffViewer.tsx`

Both `textA` and `textB` are shared — state field names in the payload are `left` and `right` (matching the spec).

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const DiffViewer: React.FC = () => {
  const [textA, setTextA] = usePersistedState('tp:diff:textA', '', true);
  const [textB, setTextB] = usePersistedState('tp:diff:textB', '', true);
```

Replace with:
```tsx
interface DiffViewerProps {
  initialState?: Record<string, string>;
}

const DiffViewer: React.FC<DiffViewerProps> = ({ initialState }) => {
  const [textA, setTextA] = usePersistedState('tp:diff:textA', '', true);
  const [textB, setTextB] = usePersistedState('tp:diff:textB', '', true);

  useEffect(() => {
    if (initialState?.left !== undefined) setTextA(initialState.left);
    if (initialState?.right !== undefined) setTextB(initialState.right);
  }, []);
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.DIFF}
  shareState={{ left: textA, right: textB }}
  actions={...}
>
```

Import `ToolType` and `useEffect`:
```ts
import React, { useState, useMemo, useEffect } from 'react';
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/DiffViewer.tsx
git commit -m "feat: add share support to DiffViewer"
```

---

### Task 6e: JsonFormatter

**Files:**
- Modify: `src/components/JsonFormatter.tsx`

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const JsonFormatter: React.FC = () => {
  const [json, setJson] = usePersistedState('tp:json:content', '', true);
```

Replace with:
```tsx
interface JsonFormatterProps {
  initialState?: Record<string, string>;
}

const JsonFormatter: React.FC<JsonFormatterProps> = ({ initialState }) => {
  const [json, setJson] = usePersistedState('tp:json:content', '', true);

  useEffect(() => {
    if (initialState?.input !== undefined) setJson(initialState.input);
  }, []);
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

Find the `<ToolLayout` in `JsonFormatter.tsx` and add:

```tsx
<ToolLayout
  description="Format, validate, and minify JSON with syntax highlighting, bracket matching, and error detection."
  shareToolType={ToolType.JSON}
  shareState={{ input: json }}
  actions={...}
>
```

Import `ToolType` and add `useEffect` to the React import:
```ts
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/JsonFormatter.tsx
git commit -m "feat: add share support to JsonFormatter"
```

---

### Task 6f: HtmlFormatter

**Files:**
- Modify: `src/components/HtmlFormatter.tsx`

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const HtmlFormatter: React.FC = () => {
  const [input, setInput] = usePersistedState('tp:html:content', '', true);
```

Replace with:
```tsx
interface HtmlFormatterProps {
  initialState?: Record<string, string>;
}

const HtmlFormatter: React.FC<HtmlFormatterProps> = ({ initialState }) => {
  const [input, setInput] = usePersistedState('tp:html:content', '', true);

  useEffect(() => {
    if (initialState?.input !== undefined) setInput(initialState.input);
  }, []);
```

Add `useEffect` to the React import:
```ts
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.HTML}
  shareState={{ input }}
  actions={...}
>
```

Import `ToolType`:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 4: Commit**

```bash
git add src/components/HtmlFormatter.tsx
git commit -m "feat: add share support to HtmlFormatter"
```

---

### Task 6g: MarkdownViewer

**Files:**
- Modify: `src/components/MarkdownViewer.tsx`

- [ ] **Step 1: Find the component declaration**

The state variable is named `md` with key `tp:markdown:content`. Find:

```tsx
const [md, setMd] = usePersistedState('tp:markdown:content', DEFAULT_MARKDOWN, true);
```

- [ ] **Step 2: Add initialState prop**

Find the component declaration (search for `const MarkdownViewer`) and replace with:

```tsx
interface MarkdownViewerProps {
  initialState?: Record<string, string>;
}

const MarkdownViewer: React.FC<MarkdownViewerProps> = ({ initialState }) => {
  const [md, setMd] = usePersistedState('tp:markdown:content', DEFAULT_MARKDOWN, true);

  useEffect(() => {
    if (initialState?.content !== undefined) setMd(initialState.content);
  }, []);
```

Add `useEffect` to the React import line.

- [ ] **Step 3: Add shareToolType and shareState to the ToolLayout call**

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.MARKDOWN}
  shareState={{ content: md }}
  actions={...}
>
```

Import `ToolType`:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

- [ ] **Step 5: Commit**

```bash
git add src/components/MarkdownViewer.tsx
git commit -m "feat: add share support to MarkdownViewer"
```

---

### Task 6h: AiAssistant

**Files:**
- Modify: `src/components/AiAssistant.tsx`

The AI Assistant is currently disabled (shows a "feature in development" message). We still wire it up so shared links round-trip correctly when it's eventually enabled. Both `text` and `instruction` are included in the share payload.

- [ ] **Step 1: Add initialState prop**

Find:
```tsx
const AiAssistant: React.FC = () => {
  const [text, setText] = usePersistedState('tp:ai:text', '', true);
  const [instruction, setInstruction] = usePersistedState('tp:ai:instruction', 'Summarize this text in 3 bullet points.', true);
```

Replace with:
```tsx
interface AiAssistantProps {
  initialState?: Record<string, string>;
}

const AiAssistant: React.FC<AiAssistantProps> = ({ initialState }) => {
  const [text, setText] = usePersistedState('tp:ai:text', '', true);
  const [instruction, setInstruction] = usePersistedState('tp:ai:instruction', 'Summarize this text in 3 bullet points.', true);

  useEffect(() => {
    if (initialState?.text !== undefined) setText(initialState.text);
    if (initialState?.instruction !== undefined) setInstruction(initialState.instruction);
  }, []);
```

Add `useEffect` to the React import.

- [ ] **Step 2: Add shareToolType and shareState to the ToolLayout call**

```tsx
<ToolLayout
  description="..."
  shareToolType={ToolType.AI_ASSISTANT}
  shareState={{ text, instruction }}
  actions={...}
>
```

Import `ToolType`:
```ts
import { ToolType } from '../types';
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors anywhere in the project.

- [ ] **Step 4: Commit**

```bash
git add src/components/AiAssistant.tsx
git commit -m "feat: add share support to AiAssistant"
```

---

## Task 7: End-to-end manual test

- [ ] **Step 1: Share → receive roundtrip for each tool**

Run `npm run dev`. Test each tool in this order:

1. **JSON Formatter** — paste `{"name":"test","value":42}`, click Share, open URL in new tab → JSON loads correctly
2. **Diff Viewer** — fill both sides, click Share, open URL in new tab → both sides load correctly
3. **Text Counter** — type "Hello world", click Share → loads in new tab
4. **Text Splitter** — paste multi-line text, click Share → loads in new tab
5. **Text Reformatter** — paste input text, click Share → input loads in new tab
6. **HTML Formatter** — paste `<div><p>test</p></div>`, click Share → loads in new tab
7. **Markdown Viewer** — edit the markdown, click Share → loads in new tab

- [ ] **Step 2: Verify content is immediately editable after loading a share URL**

On each shared tab from Step 1, type something into the tool — it should respond normally.

- [ ] **Step 3: Test corrupt URL error dialog**

Manually edit a share URL, change a few characters in the hash, open it. The error dialog "This share link appears to be broken or incomplete. The app has loaded normally." should appear. Dismiss it — app should work normally.

- [ ] **Step 4: Test unknown tool error dialog**

In the browser console, run:
```js
window.location.hash = 'share=' + LZString.compressToEncodedURIComponent(JSON.stringify({ tool: 'nonexistent', state: {} }));
location.reload();
```

Expected: "This share link references a tool that doesn't exist. The app has loaded normally."

- [ ] **Step 5: Test URL too large dialog**

In JSON Formatter, paste the output of this in the browser console:
```js
copy(JSON.stringify(Object.fromEntries(Array.from({length: 500}, (_, i) => [`key${i}`, 'x'.repeat(50)]))))
```

Click Share. Expected: "Your content is too large to share via URL. Try reducing the input size." dialog appears. Nothing is copied to clipboard.

- [ ] **Step 6: Final build check**

```bash
npm run build
```

Expected: build completes with no errors.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "feat: complete pastebin-style URL sharing for all tools"
```
