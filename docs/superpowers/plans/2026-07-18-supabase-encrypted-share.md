# Supabase Encrypted Share — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the LZ-string URL-hash share system with a Supabase-backed, client-side AES-GCM encrypted share where the decryption key travels in the URL fragment.

**Architecture:** The sender generates an AES-GCM key in the browser, encrypts the tool payload, stores only the ciphertext in Supabase, and embeds the base64 key in the URL fragment (`/s/<uuid>#<key>`). The receiver fetches the ciphertext, reads the key from the fragment (never sent to the server), and decrypts locally. Crypto lives in `cryptoService.ts`; Supabase I/O lives in `shareService.ts`.

**Tech Stack:** React 19, TypeScript, Vite, `@supabase/supabase-js`, Web Crypto API (`window.crypto.subtle`), Tailwind CSS, React Router v7

## Global Constraints

- No new npm dependencies beyond `@supabase/supabase-js`
- `lz-string` is removed after this feature is complete
- All crypto uses `window.crypto.subtle` — no third-party crypto libraries
- Supabase client reads `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`
- Share links expire after exactly 7 days; expiry is set by the client as `new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()`
- This project has no test framework. Verification steps use the dev server (`npm run dev`, port 3000) instead of unit tests.

---

## File Map

| Status | Path | Responsibility |
|--------|------|----------------|
| Create | `src/services/supabaseClient.ts` | Singleton Supabase client |
| Create | `src/services/cryptoService.ts` | AES-GCM key gen, encrypt, decrypt |
| Rewrite | `src/services/shareService.ts` | `createShare`, `resolveShare` (old exports removed) |
| Update | `src/types.ts` | Add `'not-found'` error reason to `ShareResult` |
| Create | `src/components/ShareConfirmDialog.tsx` | Confirmation modal; calls `createShare`, copies URL |
| Create | `src/components/ShareResolver.tsx` | Route component for `/s/:id`; calls `resolveShare` |
| Update | `src/components/ToolLayout.tsx` | Open `ShareConfirmDialog` instead of building URL |
| Update | `src/App.tsx` | Add `/s/:id` route, remove `parseShareHash` effect |

---

## Task 1: Install Supabase SDK + Create DB Table

**Files:**
- Modify: `package.json` (via npm install)
- Create: SQL to run in Supabase dashboard (instructions below)
- Modify: `.env.local`

**Interfaces:**
- Produces: `@supabase/supabase-js` available as a dependency; `shares` table exists in Supabase with RLS enabled

- [ ] **Step 1: Install the Supabase JS client**

```bash
cd /Users/mekari/Documents/personal-projects/text-pro
npm install @supabase/supabase-js
```

Expected output: `added N packages` with no errors.

- [ ] **Step 2: Add env vars to `.env.local`**

Open `.env.local` and append (replace with your real values from Supabase → Project Settings → API):

```
VITE_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

- [ ] **Step 3: Create the `shares` table in Supabase**

Go to your Supabase project → SQL Editor → New query. Paste and run:

```sql
create table public.shares (
  id         uuid        primary key default gen_random_uuid(),
  ciphertext text        not null,
  iv         text        not null,
  created_at timestamptz default now(),
  expires_at timestamptz not null
);

alter table public.shares enable row level security;

-- Anyone can create a share
create policy "anon insert"
  on public.shares for insert
  to anon
  with check (true);

-- Anyone can read non-expired shares
create policy "anon select non-expired"
  on public.shares for select
  to anon
  using (expires_at > now());
```

Expected: "Success. No rows returned."

- [ ] **Step 4: Verify table + RLS in Supabase**

In the Supabase Table Editor, confirm the `shares` table exists with columns `id`, `ciphertext`, `iv`, `created_at`, `expires_at`. In Authentication → Policies, confirm two policies appear on `shares`.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json
git commit -m "feat: install @supabase/supabase-js"
```

---

## Task 2: `src/services/supabaseClient.ts`

**Files:**
- Create: `src/services/supabaseClient.ts`

**Interfaces:**
- Consumes: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` from `import.meta.env`
- Produces: `supabase` — a `SupabaseClient` singleton imported by `shareService.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/services/supabaseClient.ts
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
```

- [ ] **Step 2: Verify it compiles**

```bash
npm run build 2>&1 | head -30
```

Expected: build succeeds with no TypeScript errors related to `supabaseClient.ts`.

- [ ] **Step 3: Commit**

```bash
git add src/services/supabaseClient.ts
git commit -m "feat: add Supabase client singleton"
```

---

## Task 3: `src/services/cryptoService.ts`

**Files:**
- Create: `src/services/cryptoService.ts`

**Interfaces:**
- Consumes: nothing (pure Web Crypto API)
- Produces:
  - `generateKey(): Promise<CryptoKey>`
  - `exportKey(key: CryptoKey): Promise<string>` — base64 string
  - `importKey(base64: string): Promise<CryptoKey>`
  - `encrypt(key: CryptoKey, plaintext: string): Promise<{ ciphertext: string; iv: string }>` — both base64
  - `decrypt(key: CryptoKey, ciphertext: string, iv: string): Promise<string>`

- [ ] **Step 1: Create the file**

```typescript
// src/services/cryptoService.ts
const ALGO = { name: 'AES-GCM', length: 256 } as const;

export async function generateKey(): Promise<CryptoKey> {
  return window.crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
}

export async function exportKey(key: CryptoKey): Promise<string> {
  const raw = await window.crypto.subtle.exportKey('raw', key);
  return btoa(String.fromCharCode(...new Uint8Array(raw)));
}

export async function importKey(base64: string): Promise<CryptoKey> {
  const raw = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
  return window.crypto.subtle.importKey('raw', raw, ALGO, false, ['decrypt']);
}

export async function encrypt(
  key: CryptoKey,
  plaintext: string
): Promise<{ ciphertext: string; iv: string }> {
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const cipherbuf = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return {
    ciphertext: btoa(String.fromCharCode(...new Uint8Array(cipherbuf))),
    iv: btoa(String.fromCharCode(...iv)),
  };
}

export async function decrypt(
  key: CryptoKey,
  ciphertext: string,
  iv: string
): Promise<string> {
  const cipherbuf = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
  const ivbuf = Uint8Array.from(atob(iv), c => c.charCodeAt(0));
  const plainbuf = await window.crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivbuf },
    key,
    cipherbuf
  );
  return new TextDecoder().decode(plainbuf);
}
```

- [ ] **Step 2: Smoke-test round-trip in the browser console**

Start the dev server if not already running:
```bash
npm run dev
```

Open `http://localhost:3000` in Chrome. Open DevTools → Console. Paste:

```javascript
const { generateKey, exportKey, importKey, encrypt, decrypt } = await import('/src/services/cryptoService.ts');
const key = await generateKey();
const b64 = await exportKey(key);
const { ciphertext, iv } = await encrypt(key, 'hello world');
const key2 = await importKey(b64);
const result = await decrypt(key2, ciphertext, iv);
console.assert(result === 'hello world', 'round-trip failed: ' + result);
console.log('round-trip OK:', result);
```

Expected console output: `round-trip OK: hello world`

- [ ] **Step 3: Commit**

```bash
git add src/services/cryptoService.ts
git commit -m "feat: add AES-GCM cryptoService"
```

---

## Task 4: Update `src/types.ts` + Rewrite `src/services/shareService.ts`

**Files:**
- Modify: `src/types.ts` — add `'not-found'` to `ShareResult` error reasons
- Rewrite: `src/services/shareService.ts` — replace all old exports with `createShare` and `resolveShare`

**Interfaces:**
- Consumes: `supabase` from `./supabaseClient`; all five functions from `./cryptoService`; `ToolType`, `SharePayload`, `ShareResult` from `../types`
- Produces:
  - `createShare(tool: ToolType, state: Record<string, string>): Promise<string>` — returns full share URL
  - `resolveShare(id: string, keyBase64: string): Promise<ShareResult>`

- [ ] **Step 1: Update `src/types.ts`**

Open `src/types.ts`. Change the `ShareResult` type from:

```typescript
export type ShareResult =
  | { type: 'none' }
  | { type: 'payload'; data: SharePayload }
  | { type: 'error'; reason: 'corrupt' | 'unknown-tool' };
```

to:

```typescript
export type ShareResult =
  | { type: 'none' }
  | { type: 'payload'; data: SharePayload }
  | { type: 'error'; reason: 'corrupt' | 'unknown-tool' | 'not-found' };
```

- [ ] **Step 2: Rewrite `src/services/shareService.ts`**

Replace the entire file contents with:

```typescript
// src/services/shareService.ts
import { supabase } from './supabaseClient';
import { generateKey, exportKey, importKey, encrypt, decrypt } from './cryptoService';
import { ToolType, SharePayload, ShareResult } from '../types';

const SHARE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export async function createShare(
  tool: ToolType,
  state: Record<string, string>
): Promise<string> {
  const payload: SharePayload = { tool, state };
  const key = await generateKey();
  const { ciphertext, iv } = await encrypt(key, JSON.stringify(payload));
  const expires_at = new Date(Date.now() + SHARE_TTL_MS).toISOString();

  const { data, error } = await supabase
    .from('shares')
    .insert({ ciphertext, iv, expires_at })
    .select('id')
    .single();

  if (error || !data) throw new Error(error?.message ?? 'Failed to create share');

  const keyBase64 = await exportKey(key);
  return `${window.location.origin}/s/${data.id}#${keyBase64}`;
}

export async function resolveShare(
  id: string,
  keyBase64: string
): Promise<ShareResult> {
  const { data, error } = await supabase
    .from('shares')
    .select('ciphertext, iv')
    .eq('id', id)
    .single();

  if (error || !data) return { type: 'error', reason: 'not-found' };

  try {
    const key = await importKey(keyBase64);
    const json = await decrypt(key, data.ciphertext, data.iv);
    const parsed = JSON.parse(json) as SharePayload;

    if (!parsed.tool || !Object.values(ToolType).includes(parsed.tool)) {
      return { type: 'error', reason: 'unknown-tool' };
    }
    if (!parsed.state || typeof parsed.state !== 'object' || Array.isArray(parsed.state)) {
      return { type: 'error', reason: 'corrupt' };
    }

    return { type: 'payload', data: parsed };
  } catch {
    return { type: 'error', reason: 'corrupt' };
  }
}
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: build may fail with errors about `buildShareUrl` / `parseShareHash` still being imported in `ToolLayout.tsx` and `App.tsx` — that's fine, those will be fixed in Tasks 7 and 8. There should be no errors originating from `shareService.ts`, `cryptoService.ts`, or `types.ts` themselves.

- [ ] **Step 4: Commit**

```bash
git add src/types.ts src/services/shareService.ts
git commit -m "feat: rewrite shareService with Supabase + crypto, add not-found error reason"
```

---

## Task 5: `src/components/ShareConfirmDialog.tsx`

**Files:**
- Create: `src/components/ShareConfirmDialog.tsx`

**Interfaces:**
- Consumes: `createShare(tool, state)` from `../services/shareService`; `ToolType` from `../types`; `Toast` from `./Toast`
- Props:
  ```typescript
  interface ShareConfirmDialogProps {
    tool: ToolType;
    state: Record<string, string>;
    onClose: () => void;
  }
  ```
- Produces: a modal component that handles the full share creation + clipboard copy flow

- [ ] **Step 1: Create the file**

```tsx
// src/components/ShareConfirmDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ToolType } from '../types';
import { createShare } from '../services/shareService';
import Toast from './Toast';

interface ShareConfirmDialogProps {
  tool: ToolType;
  state: Record<string, string>;
  onClose: () => void;
}

const ShareConfirmDialog: React.FC<ShareConfirmDialogProps> = ({ tool, state, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isLoading]);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    try {
      const url = await createShare(tool, state);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        try {
          const el = document.createElement('textarea');
          el.value = url;
          document.body.appendChild(el);
          el.select();
          copied = document.execCommand('copy');
          document.body.removeChild(el);
        } catch { /* both methods failed */ }
      }
      if (copied) {
        setShowCopied(true);
        setTimeout(() => {
          setShowCopied(false);
          onClose();
        }, 1500);
      } else {
        setShareUrl(url);
      }
    } catch {
      setError('Failed to create share link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => { if (!isLoading) onClose(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-confirm-title"
          className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>

          <h2 id="share-confirm-title" className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Share this content
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Anyone with the link can view this content for{' '}
            <strong className="text-slate-700 dark:text-slate-200">7 days</strong>.
            Each time you share, a new unique link is created.
          </p>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>
          )}

          {shareUrl && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Copy this link manually:</p>
              <textarea
                readOnly
                value={shareUrl}
                rows={3}
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-700 dark:text-slate-300 resize-none"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating…
                </>
              ) : 'Create Link'}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message="Link copied!"
        isVisible={showCopied}
        onClose={() => setShowCopied(false)}
      />
    </>
  );
};

export default ShareConfirmDialog;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "ShareConfirmDialog|error TS"
```

Expected: no errors mentioning `ShareConfirmDialog.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareConfirmDialog.tsx
git commit -m "feat: add ShareConfirmDialog with 7-day expiry notice and spinner"
```

---

## Task 6: `src/components/ShareResolver.tsx`

**Files:**
- Create: `src/components/ShareResolver.tsx`

**Interfaces:**
- Consumes: `resolveShare(id, keyBase64)` from `../services/shareService`; `ToolType`, `ShareResult` from `../types`; `useParams` from `react-router-dom`
- Props:
  ```typescript
  interface ShareResolverProps {
    onResolved: (tool: ToolType, state: Record<string, string>) => void;
    onError: (message: string) => void;
  }
  ```
- Produces: a loading screen component mounted at `/s/:id`; calls `onResolved` or `onError` then lets the parent navigate away

- [ ] **Step 1: Create the file**

```tsx
// src/components/ShareResolver.tsx
import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { resolveShare } from '../services/shareService';
import { ToolType } from '../types';

interface ShareResolverProps {
  onResolved: (tool: ToolType, state: Record<string, string>) => void;
  onError: (message: string) => void;
}

const ShareResolver: React.FC<ShareResolverProps> = ({ onResolved, onError }) => {
  const { id } = useParams<{ id: string }>();

  useEffect(() => {
    if (!id) {
      onError('Invalid share link.');
      return;
    }
    const keyBase64 = window.location.hash.slice(1);
    if (!keyBase64) {
      onError('This share link appears to be broken or incomplete. The app has loaded normally.');
      return;
    }

    resolveShare(id, keyBase64).then(result => {
      if (result.type === 'payload') {
        onResolved(result.data.tool, result.data.state);
      } else {
        const message =
          result.reason === 'not-found'
            ? 'This share link has expired or does not exist. The app has loaded normally.'
            : result.reason === 'unknown-tool'
            ? "This share link references a tool that doesn't exist. The app has loaded normally."
            : 'This share link appears to be broken or incomplete. The app has loaded normally.';
        onError(message);
      }
    });
  }, []);

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading shared content…</span>
      </div>
    </div>
  );
};

export default ShareResolver;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "ShareResolver|error TS"
```

Expected: no errors mentioning `ShareResolver.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/components/ShareResolver.tsx
git commit -m "feat: add ShareResolver route component"
```

---

## Task 7: Update `src/components/ToolLayout.tsx`

**Files:**
- Modify: `src/components/ToolLayout.tsx`

**Interfaces:**
- Consumes: `ShareConfirmDialog` from `./ShareConfirmDialog`
- Removes: all imports and usage of `buildShareUrl`, `Toast`, `ShareErrorDialog` (within this file only), `showCopiedToast`, `showTooLargeDialog`, `shareFallbackUrl` state

- [ ] **Step 1: Rewrite `ToolLayout.tsx`**

Replace the entire file with:

```tsx
// src/components/ToolLayout.tsx
import React, { ReactNode, useState } from 'react';
import { Share2 } from 'lucide-react';
import { ToolType } from '../types';
import ShareConfirmDialog from './ShareConfirmDialog';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
                onClick={() => setShowConfirmDialog(true)}
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

      {showConfirmDialog && canShare && (
        <ShareConfirmDialog
          tool={shareToolType!}
          state={shareState!}
          onClose={() => setShowConfirmDialog(false)}
        />
      )}
    </>
  );
};

export default ToolLayout;
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npm run build 2>&1 | grep -E "ToolLayout|error TS"
```

Expected: no errors from `ToolLayout.tsx`. There may still be an error from `App.tsx` importing `parseShareHash` — that's fixed in Task 8.

- [ ] **Step 3: Commit**

```bash
git add src/components/ToolLayout.tsx
git commit -m "feat: ToolLayout opens ShareConfirmDialog instead of building URL"
```

---

## Task 8: Update `src/App.tsx` + Remove `lz-string`

**Files:**
- Modify: `src/App.tsx`
- Remove: `lz-string` npm dependency

**Interfaces:**
- Consumes: `ShareResolver` from `./components/ShareResolver`; `ToolType` from `./types`
- Removes: `parseShareHash` import, the `useEffect` that called it, `LZString`
- Produces: `/s/:id` route that resolves shares and navigates to the correct tool

- [ ] **Step 1: Update `src/App.tsx`**

Make these changes to `App.tsx`:

**a) Update imports** — remove `parseShareHash` import, add `ShareResolver`:

```tsx
// Remove this line:
import { parseShareHash } from './services/shareService';

// Add this line (with the other component imports):
import ShareResolver from './components/ShareResolver';
```

**b) Remove the `parseShareHash` useEffect** — delete this entire block from inside the `App` component:

```tsx
useEffect(() => {
  const result = parseShareHash();
  if (result.type === 'payload') {
    setShareInitialState(result.data.state);
    setShareTargetTool(result.data.tool);
    setShareKey(Date.now().toString());
    navigate(TOOL_PATHS[result.data.tool], { replace: true });
  } else if (result.type === 'error') {
    const message = result.reason === 'unknown-tool'
      ? "This share link references a tool that doesn't exist. The app has loaded normally."
      : 'This share link appears to be broken or incomplete. The app has loaded normally.';
    setShareErrorMessage(message);
  }
}, []);
```

**c) Add a `handleShareResolved` callback** inside the `App` component, after the existing state declarations:

```tsx
const handleShareResolved = (tool: ToolType, state: Record<string, string>) => {
  const effectiveTool =
    tool === ToolType.COUNTER || tool === ToolType.SPLITTER ? ToolType.ANALYZER : tool;
  setShareInitialState(state);
  setShareTargetTool(effectiveTool);
  setShareKey(Date.now().toString());
  navigate(TOOL_PATHS[effectiveTool], { replace: true });
};
```

**d) Add the `/s/:id` route** inside the `<Routes>` block, before the catch-all `*` route:

```tsx
<Route
  path="/s/:id"
  element={
    <ShareResolver
      onResolved={handleShareResolved}
      onError={(msg) => {
        setShareErrorMessage(msg);
        navigate('/text-analyzer', { replace: true });
      }}
    />
  }
/>
```

- [ ] **Step 2: Verify full build passes**

```bash
npm run build 2>&1
```

Expected: zero TypeScript errors. Build output in `dist/`.

- [ ] **Step 3: Remove `lz-string`**

```bash
npm uninstall lz-string
```

Expected: `removed 1 package`.

- [ ] **Step 4: Verify build still passes after removal**

```bash
npm run build 2>&1
```

Expected: zero errors. `lz-string` is no longer imported anywhere.

- [ ] **Step 5: End-to-end manual test**

Start the dev server:
```bash
npm run dev
```

Open `http://localhost:3000` in Chrome.

**Share flow:**
1. Go to `/reformatter`, type some text into the input
2. Click **Share** — confirm dialog appears with "7 days" and "new unique link" copy
3. Click **Create Link** — spinner appears briefly, then "Link copied!" toast appears
4. Open a new tab, paste the URL — it should be `http://localhost:3000/s/<uuid>#<key>`
5. The page should show "Loading shared content…" then navigate to `/reformatter` with the same text pre-filled

**Expired / broken link:**
- Manually visit `http://localhost:3000/s/00000000-0000-0000-0000-000000000000#abc` — should show the share error dialog with "expired or does not exist"

**Old URL format:**
- Manually visit `http://localhost:3000/#share=abc123` — should load normally at `/text-analyzer` with no crash (the old handler is gone; the hash is ignored)

- [ ] **Step 6: Commit**

```bash
git add src/App.tsx package.json package-lock.json
git commit -m "feat: wire ShareResolver into App, remove lz-string and parseShareHash"
```
