# Supabase Encrypted Share — Design Spec

**Date:** 2026-07-18  
**Status:** Approved

## Overview

Replace the current LZ-string URL-hash share system with a Supabase-backed encrypted share. The sender encrypts the payload client-side before storing it; the decryption key travels in the URL fragment and never reaches Supabase. The result is a short, zero-knowledge share URL with a 7-day TTL.

---

## Data Model

### Supabase table: `shares`

```sql
id         uuid        PRIMARY KEY DEFAULT gen_random_uuid()
ciphertext text        NOT NULL   -- base64-encoded AES-GCM ciphertext
iv         text        NOT NULL   -- base64-encoded 12-byte IV
created_at timestamptz DEFAULT now()
expires_at timestamptz NOT NULL   -- set by client to now() + 7 days
```

### Row-level security

| Operation | Policy |
|-----------|--------|
| INSERT    | Allowed for `anon` role (anyone can create a share) |
| SELECT    | Allowed for `anon` role where `expires_at > now()` |
| UPDATE    | Denied |
| DELETE    | Denied |

Expired rows are invisible to clients via the RLS filter. A `pg_cron` job can be added later for physical cleanup; it is not required for correctness.

---

## Crypto Layer — `src/services/cryptoService.ts`

Pure crypto module; no Supabase imports. All operations use `window.crypto.subtle`.

| Export | Signature | Notes |
|--------|-----------|-------|
| `generateKey` | `() => Promise<CryptoKey>` | AES-GCM 256-bit, extractable |
| `exportKey` | `(key: CryptoKey) => Promise<string>` | Base64; goes in URL fragment |
| `importKey` | `(base64: string) => Promise<CryptoKey>` | Inverse of exportKey |
| `encrypt` | `(key, plaintext: string) => Promise<{ ciphertext: string; iv: string }>` | Both values base64 |
| `decrypt` | `(key, ciphertext: string, iv: string) => Promise<string>` | Returns plaintext |

No new npm dependencies.

---

## Supabase Client — `src/services/supabaseClient.ts`

Singleton `@supabase/supabase-js` client. Reads from env vars:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Both must be added to `.env.local` and to the Vercel project environment.

---

## Service Layer — `src/services/shareService.ts`

Existing `encode`, `buildShareUrl`, and `parseShareHash` are removed. New exports:

### `createShare(tool: ToolType, state: Record<string, string>): Promise<string>`

1. Serialize payload to JSON: `{ tool, state }`
2. Call `generateKey()`, then `encrypt(key, json)` → `{ ciphertext, iv }`
3. Insert `{ ciphertext, iv, expires_at: now + 7 days }` into Supabase `shares`
4. Call `exportKey(key)` → `keyBase64`
5. Return `${origin}/s/${row.id}#${keyBase64}`

Throws on Supabase error; caller handles it via `ShareErrorDialog`.

### `resolveShare(id: string, keyBase64: string): Promise<ShareResult>`

1. Fetch row from `shares` where `id = $1` (RLS filters expired rows)
2. If no row: return `{ type: 'error', reason: 'not-found' }`
3. Call `importKey(keyBase64)`, then `decrypt(key, ciphertext, iv)`
4. Parse JSON, validate `tool` and `state` fields
5. Return `{ type: 'payload', data: { tool, state } }` or `{ type: 'error', reason: 'corrupt' }`

`ShareResult` type gains a new `'not-found'` error reason.

---

## URL Structure

```
https://textpro.app/s/<uuid>#<base64key>
```

- `/s/<uuid>` — new React Router route
- `#<base64key>` — URL fragment; never sent to Supabase by the browser
- Old `/#share=<lz>` URLs are removed (no backwards-compat shim)

---

## New Component — `src/components/ShareConfirmDialog.tsx`

Modal shown when the user clicks **Share** in `ToolLayout`. Props:

```ts
interface ShareConfirmDialogProps {
  tool: ToolType;
  state: Record<string, string>;
  onClose: () => void;
}
```

Content:

- Heading: "Share this content"
- Body: "Anyone with the link can view this content for **7 days**. Each time you share, a new unique link is created."
- Buttons: **Cancel** (calls `onClose`) | **Create Link** (async, shows spinner)

On "Create Link": the dialog itself calls `createShare(tool, state)`, copies the returned URL to clipboard, calls `onClose`, and shows "Link copied!" toast.  
On failure: shows an inline error message inside the dialog (does not dismiss automatically).

---

## Modified Files

### `src/components/ToolLayout.tsx`

- `handleShare` becomes `async`
- Clicking Share opens `ShareConfirmDialog` instead of calling `buildShareUrl` directly
- "Too large" URL guard removed (no URL length limit with Supabase)
- Clipboard fallback (`ShareErrorDialog`) retained for clipboard-write failures

### `src/App.tsx`

- New route: `<Route path="/s/:id" element={<ShareResolver />} />`
- `parseShareHash` `useEffect` removed
- `ShareResolver` lives in `src/components/ShareResolver.tsx`; reads `:id` from params and `window.location.hash` for the key, calls `resolveShare`, then navigates to the tool route on success or sets `shareErrorMessage` on failure

---

## Environment Variables

| Variable | Where |
|----------|-------|
| `VITE_SUPABASE_URL` | `.env.local`, Vercel project settings |
| `VITE_SUPABASE_ANON_KEY` | `.env.local`, Vercel project settings |

---

## New npm Dependency

```
@supabase/supabase-js
```

---

## Error States

| Scenario | Behaviour |
|----------|-----------|
| Supabase write fails | Inline error shown inside `ShareConfirmDialog` (dialog stays open) |
| Link expired (SELECT returns no row) | `ShareErrorDialog`: "This link has expired." |
| Key wrong / ciphertext corrupt | `ShareErrorDialog`: "This link appears to be broken." |
| Unknown tool in payload | `ShareErrorDialog`: "This link references a tool that doesn't exist." |
| Clipboard write fails | `ShareErrorDialog` with manual-copy URL fallback |

---

## Out of Scope

- Rate limiting (no Edge Function)
- Manual share deletion
- Passphrase-protected shares
- Backwards compatibility with old `/#share=` URLs
