# Pastebin-Style URL Sharing

**Date:** 2026-06-03  
**Status:** Approved

## Overview

Add a Share button to every tool in TextPro. Clicking it generates a compressed, self-contained URL that encodes the tool type and its current input state. Recipients open the URL and land directly on the correct tool with the content pre-filled and immediately editable. No backend required — all data lives in the URL hash.

## Architecture

The feature is entirely frontend. There is no new backend, no database, and no API calls.

**Payload format:**
```json
{ "tool": "json", "state": { "input": "..." } }
```

The payload is serialized to JSON, compressed with `lz-string`'s `compressToEncodedURIComponent`, and written to the URL hash:
```
https://textpro.app/#share=<compressed>
```

**On page load:** `App.tsx` checks for a `#share=` hash on mount. If found, it decompresses and parses the payload, sets `activeTool`, passes `initialState` to the target tool, then removes the hash from the address bar via `history.replaceState` so re-navigation doesn't re-trigger the load.

**Compression:** `lz-string` library (~5 KB). Achieves 60–80% reduction on JSON/text content, keeping URLs short for typical inputs.

## Components

### `src/services/shareService.ts`
Pure functions, no UI or side effects:
- `encode(tool: ToolType, state: Record<string, string>): string` — serializes payload, compresses, returns URL-safe string
- `buildShareUrl(tool: ToolType, state: Record<string, string>): string` — calls `encode`, assembles full URL with hash
- `parseShareHash(): ShareResult` — reads `window.location.hash`, returns a discriminated union

```ts
interface SharePayload {
  tool: ToolType;
  state: Record<string, string>;
}

type ShareResult =
  | { type: 'none' }                          // no #share= hash present
  | { type: 'payload'; data: SharePayload }   // valid payload
  | { type: 'error'; reason: 'corrupt' | 'unknown-tool' }; // hash present but invalid
```

### `ToolLayout.tsx`
Add a Share button to the existing actions slot. Each tool passes its current state object. On click:
1. Call `buildShareUrl(tool, state)`
2. If URL length > 8000 chars, show the "too large" error dialog — stop here
3. Otherwise copy to clipboard via `navigator.clipboard.writeText()`
4. Show Toast: "Link copied!"

### `App.tsx`
On mount, call `parseShareHash()` and handle each case:
- `type: 'none'` — load app normally, no dialog
- `type: 'payload'` — set `activeTool`, pass `initialState` to the target tool, remove hash from address bar via `history.replaceState`
- `type: 'error'` — show the appropriate error dialog, load app normally

### Per-tool state override
Each tool uses `usePersistedState(key, defaultValue)`. Add an optional `initialOverride` prop to each tool component. When provided (from a share URL), it takes precedence over localStorage on first render only — after that, normal persisted state behaviour resumes.

**Multi-input tools** (e.g., Diff Viewer): the state object includes all fields:
```json
{ "tool": "diff", "state": { "left": "...", "right": "..." } }
```

## User Flows

**Sharing (sender):**
1. User fills in content in any tool
2. Clicks Share button
3. URL is generated and copied to clipboard
4. Toast: "Link copied!"

**Receiving (recipient):**
1. Opens the share URL
2. App decompresses hash, activates the correct tool, pre-fills content
3. Content is immediately editable
4. Recipient can re-share their own edited version at any time

## Error Handling

| Scenario | When | Response |
|---|---|---|
| Corrupt / undecodable hash | Decode (page load) | Dismissable dialog: "This share link appears to be broken or incomplete. The app has loaded normally." |
| Unknown tool in payload | Decode (page load) | Dismissable dialog: "This share link references a tool that doesn't exist. The app has loaded normally." |
| URL too long (> 8000 chars) | Encode (share click) | Dismissable dialog: "Your content is too large to share via URL. Try reducing the input size." Nothing is copied. |
| Clipboard API unavailable | Encode (share click) | Fall back to `document.execCommand('copy')`. If that fails too, show Toast with the URL so user can copy manually. |

All decode error cases load the app in its default state after the dialog is dismissed.

## Testing

Manual testing covers the critical paths (no automated test infrastructure exists in this project):

- Share from each tool type → open URL in new tab → verify correct tool + content loads
- Confirm content is immediately editable after loading a share URL
- Corrupt the hash manually → verify error dialog + app loads normally
- Set `tool` to an unknown value → verify error dialog + app loads normally
- Paste a very large input (> 50 KB) and click Share → verify "too large" dialog, nothing copied
- Share a Diff Viewer with both sides filled → verify both sides load on recipient side

## Dependencies

- `lz-string` — add to `package.json` dependencies
