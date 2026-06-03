# CI/CD Tag-Triggered Deployment & Version Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deploy to Vercel automatically when a `v*` tag is pushed, and surface the tag version in the About page and sidebar.

**Architecture:** `VITE_APP_VERSION` is injected as a shell env var during `vercel build` in CI; Vite exposes it to the app as `import.meta.env.VITE_APP_VERSION`. The GitHub Actions workflow triggers on `v*` tag push, builds via the Vercel CLI (which produces `.vercel/output/`), deploys the prebuilt artifact to production, then creates a GitHub Release.

**Tech Stack:** GitHub Actions, Vercel CLI (`vercel` npm package), Vite env vars (`VITE_` prefix), React 19, TypeScript.

---

## File Map

| File | Status | Responsibility |
|---|---|---|
| `src/vite-env.d.ts` | **Create** | TypeScript types for `import.meta.env.VITE_APP_VERSION` |
| `src/components/AboutPage.tsx` | **Modify** | Replace hardcoded `v1.0.0` with dynamic version |
| `src/App.tsx` | **Modify** | Add version label below Save Session toggle in sidebar footer |
| `.github/workflows/deploy.yml` | **Create** | Tag-triggered GitHub Actions deploy workflow |

---

### Task 1: Add TypeScript env var type declaration

**Files:**
- Create: `src/vite-env.d.ts`

No test suite exists in this project. Verification is via TypeScript compilation (`npm run build`).

- [ ] **Step 1: Create `src/vite-env.d.ts`**

```ts
/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_APP_VERSION?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
```

- [ ] **Step 2: Verify TypeScript accepts the type**

```bash
npx tsc --noEmit
```

Expected: no errors. If `tsconfig.json` already references `vite/client`, the `ImportMeta` block may produce a duplicate identifier error — in that case, remove the `interface ImportMeta` block and keep only `ImportMetaEnv`.

- [ ] **Step 3: Commit**

```bash
git add src/vite-env.d.ts
git commit -m "feat: add VITE_APP_VERSION type declaration"
```

---

### Task 2: Replace hardcoded version in About page

**Files:**
- Modify: `src/components/AboutPage.tsx` (line 86)

- [ ] **Step 1: Open `src/components/AboutPage.tsx` and locate the hardcoded badge**

Find this block (around line 84–91):

```tsx
<div className="flex items-center justify-center gap-3 pt-2">
    <span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
        v1.0.0
    </span>
```

- [ ] **Step 2: Replace the hardcoded string with the dynamic value**

Change `v1.0.0` to:

```tsx
{import.meta.env.VITE_APP_VERSION ?? 'dev'}
```

The full updated badge:

```tsx
<span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
    {import.meta.env.VITE_APP_VERSION ?? 'dev'}
</span>
```

- [ ] **Step 3: Verify the build compiles cleanly**

```bash
npm run build
```

Expected: no TypeScript errors, `dist/` produced. Locally the badge will show `dev`.

- [ ] **Step 4: Commit**

```bash
git add src/components/AboutPage.tsx
git commit -m "feat: show dynamic app version on About page"
```

---

### Task 3: Add version label to sidebar footer

**Files:**
- Modify: `src/App.tsx`

The sidebar footer (`<div className="p-3 mt-auto border-t ...">`) currently contains three children in order: About button, Dark Mode toggle, Save Session toggle. We add a fourth child — a version label — after the Save Session toggle.

- [ ] **Step 1: Open `src/App.tsx` and locate the end of the Save Session toggle block**

Find the closing `</div>` of the Save Session toggle (the block that starts around line 221 with `<div className={\`flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50...`}`). It ends just before the closing `</div>` of the parent footer `<div className="p-3 mt-auto border-t ...">`.

- [ ] **Step 2: Add the version label after the Save Session toggle's closing `</div>`**

Insert this block immediately before the footer's closing `</div>`:

```tsx
{!isCollapsed && (
  <div className="px-3 pb-1">
    <span className="text-[10px] text-slate-400">
      {import.meta.env.VITE_APP_VERSION ?? 'dev'}
    </span>
  </div>
)}
```

The full footer section after the change should look like:

```tsx
{/* Footer Actions */}
<div className="p-3 mt-auto border-t border-slate-50 dark:border-slate-800 space-y-1">
  {/* About button — unchanged */}
  ...
  {/* Dark Mode toggle — unchanged */}
  ...
  {/* Save Session toggle — unchanged */}
  ...
  {/* Version label */}
  {!isCollapsed && (
    <div className="px-3 pb-1">
      <span className="text-[10px] text-slate-400">
        {import.meta.env.VITE_APP_VERSION ?? 'dev'}
      </span>
    </div>
  )}
</div>
```

- [ ] **Step 3: Verify the build compiles cleanly**

```bash
npm run build
```

Expected: no errors.

- [ ] **Step 4: Start the dev server and manually verify the sidebar label**

```bash
npm run dev
```

Open `http://localhost:3000`. In the expanded sidebar, below the Save Session toggle, you should see the text `dev` in a small, muted style. Collapse the sidebar — the label should disappear. Expand it — the label reappears.

- [ ] **Step 5: Commit**

```bash
git add src/App.tsx
git commit -m "feat: show app version in sidebar footer"
```

---

### Task 4: Create the GitHub Actions deploy workflow

**Files:**
- Create: `.github/workflows/deploy.yml`

- [ ] **Step 1: Create the `.github/workflows/` directory and the workflow file**

```bash
mkdir -p .github/workflows
```

Create `.github/workflows/deploy.yml` with the following content:

```yaml
name: Deploy to Vercel

on:
  push:
    tags:
      - 'v*'

jobs:
  deploy:
    name: Build & Deploy
    runs-on: ubuntu-latest
    permissions:
      contents: write  # required by softprops/action-gh-release to create releases

    steps:
      - name: Checkout
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build via Vercel CLI
        run: npx vercel build --prod --token=${{ secrets.VERCEL_TOKEN }}
        env:
          VITE_APP_VERSION: ${{ github.ref_name }}
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}

      - name: Deploy prebuilt output
        run: npx vercel deploy --prebuilt --prod --token=${{ secrets.VERCEL_TOKEN }}

      - name: Create GitHub Release
        uses: softprops/action-gh-release@v2
        with:
          generate_release_notes: true
```

**Why this works:**
- `vercel build --prod` reads `.vercel/project.json` (already committed) to find the org/project IDs. It runs `npm run build` internally, which Vite executes with the env vars present in the shell — so `VITE_APP_VERSION` is baked into the bundle.
- `vercel deploy --prebuilt --prod` uploads the `.vercel/output/` artifact to the Vercel CDN without re-building.
- `softprops/action-gh-release@v2` creates a GitHub Release for the pushed tag and auto-generates release notes from commit messages since the previous tag.

- [ ] **Step 2: Add the required GitHub Secrets**

In the GitHub repo → **Settings → Secrets and variables → Actions → New repository secret**, add:

| Name | Value |
|---|---|
| `VERCEL_TOKEN` | A Vercel personal access token — create at vercel.com → Settings → Tokens → Create |
| `GEMINI_API_KEY` | Your Google Gemini API key (same value as in your local `.env.local`) |

`VERCEL_ORG_ID` and `VERCEL_PROJECT_ID` are **not** needed — the CLI reads them from `.vercel/project.json`.

- [ ] **Step 3: Commit the workflow**

```bash
git add .github/workflows/deploy.yml
git commit -m "ci: add tag-triggered Vercel deploy workflow"
```

---

### Task 5: End-to-end verification

- [ ] **Step 1: Push the branch to remote**

```bash
git push origin main
```

- [ ] **Step 2: Tag the commit and push the tag**

```bash
git tag v1.0.1
git push origin v1.0.1
```

- [ ] **Step 3: Verify the GitHub Actions run**

Open the GitHub repo → **Actions** tab. A workflow named "Deploy to Vercel" should appear, triggered by the `v1.0.1` tag. Watch all steps complete green.

- [ ] **Step 4: Verify the Vercel deployment**

Open the Vercel dashboard for the `text-pro` project. A new production deployment should be listed with a timestamp matching the tag push. Visit the live URL and open the About page — the version badge should show `v1.0.1`, not `dev`.

- [ ] **Step 5: Verify the sidebar version label**

On the live URL, open the sidebar (expanded state). Below the Save Session toggle, confirm the `v1.0.1` label is visible. Collapse the sidebar — confirm the label disappears.

- [ ] **Step 6: Verify the GitHub Release**

Open the GitHub repo → **Releases**. A release named `v1.0.1` should exist with auto-generated release notes.
