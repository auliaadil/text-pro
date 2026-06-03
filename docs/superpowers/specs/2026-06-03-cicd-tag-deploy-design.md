---
name: cicd-tag-deploy-design
description: CI/CD pipeline via GitHub Actions that deploys to Vercel on git tag push, with tag version displayed in the About page and sidebar
metadata:
  type: project
---

# CI/CD Tag-Triggered Deployment & Version Display

## Overview

When a `v*` tag is pushed to the GitHub remote, a GitHub Actions workflow builds the app (injecting the tag as the app version) and deploys it to the existing Vercel project. The version string is also surfaced in the About page and the sidebar footer.

## Scope

- New file: `.github/workflows/deploy.yml`
- Modified: `src/components/AboutPage.tsx`
- Modified: `src/App.tsx`
- No changes to `vite.config.ts` or `package.json`

---

## 1. Version Injection

### Mechanism

Vite natively exposes env vars prefixed with `VITE_` as `import.meta.env.VITE_*` at build time. No `define` changes are needed in `vite.config.ts`.

The version is set by passing `VITE_APP_VERSION` as a shell env var before the build step runs.

### Fallback

`import.meta.env.VITE_APP_VERSION ?? 'dev'`

In local development (where the var is not set) the UI shows `dev`. In production it shows the tag name (e.g. `v1.2.3`).

---

## 2. About Page (`src/components/AboutPage.tsx`)

Replace the hardcoded badge string `v1.0.0` (line 86) with the dynamic value:

```tsx
{import.meta.env.VITE_APP_VERSION ?? 'dev'}
```

No other changes to the About page.

---

## 3. Sidebar Version Label (`src/App.tsx`)

Add a version label immediately below the Save Session toggle block, inside the existing "Footer Actions" `<div>`. It is only rendered when the sidebar is expanded.

Style: `text-[10px] text-slate-400 px-3 pb-1` — matches the existing sub-label style used in the Save Session block.

Behaviour in collapsed mode: hidden entirely (consistent with other label text that disappears when `isCollapsed` is true).

```tsx
{!isCollapsed && (
  <div className="px-3 pb-1">
    <span className="text-[10px] text-slate-400">
      {import.meta.env.VITE_APP_VERSION ?? 'dev'}
    </span>
  </div>
)}
```

---

## 4. GitHub Actions Workflow (`.github/workflows/deploy.yml`)

### Trigger

```yaml
on:
  push:
    tags:
      - 'v*'
```

Only tag pushes matching `v*` trigger the workflow. Regular branch pushes are unaffected.

### Job: `deploy` (runs on `ubuntu-latest`)

| Step | Action / Command | Notes |
|---|---|---|
| Checkout | `actions/checkout@v4` | Full history not required |
| Setup Node | `actions/setup-node@v4`, Node 20, npm cache | |
| Install deps | `npm ci` | Clean install from lockfile |
| Build | `npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}` | Env vars: `VITE_APP_VERSION`, `GEMINI_API_KEY` |
| Deploy | `npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}` | Reads `.vercel/project.json` for org/project IDs |
| Release | `softprops/action-gh-release@v2` with `generate_release_notes: true` | Creates a GitHub Release from the tag |

### Why `vercel build` + `vercel deploy --prebuilt`

`vercel build` produces a `.vercel/output/` directory in Vercel's canonical build-output format. `vercel deploy --prebuilt` uploads that artifact directly. This lets us inject env vars (including `VITE_APP_VERSION`) into the build from the CI shell without touching the Vercel dashboard's env var config.

### Required GitHub Secrets

| Secret | Description |
|---|---|
| `VERCEL_TOKEN` | Personal Vercel access token (Settings → Tokens) |
| `GEMINI_API_KEY` | Google Gemini API key for the AI feature build |

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are **not** needed as secrets because `.vercel/project.json` is committed to the repo and the CLI reads it automatically.

---

## 5. Relationship to Existing Vercel Git Integration

Vercel's automatic Git integration triggers on **branch** pushes (e.g. `main`), not on tag pushes. Pushing a `v*` tag will not trigger a duplicate Vercel auto-deploy — the two systems are independent.

If in future the project disables Vercel's auto-deploy from Git entirely, only tagged releases will reach production, which is the intended end state.

---

## 6. TypeScript Env Var Typing

Add a `vite-env.d.ts` declaration so `import.meta.env.VITE_APP_VERSION` is typed as `string | undefined`:

```ts
/// <reference types="vite/client" />
interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}
```

Check whether `src/vite-env.d.ts` already exists; if so, add the property to the existing interface rather than creating a duplicate file.

---

## Out of Scope

- Disabling Vercel's branch-based auto-deploy (opt-in future step)
- Semantic versioning enforcement (tags are free-form `v*`)
- Running tests in CI (no test suite exists yet)
- Caching the Vercel CLI between runs
