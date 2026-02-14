# AGENTS.md

This file provides context and guidelines for AI agents working on the TextPro repository.

## 🧠 Project Context

TextPro is a **privacy-first, client-side PWA** for text manipulation. It mimics the feel of a native utility app.

### Core Philosophy
1.  **Client-Side Only**: Do not introduce server-side dependencies unless absolutely necessary (e.g., proxying for CORS, though currently not needed).
2.  **Offline First**: The app must function fully offline (except for AI features).
3.  **Visual Consistency**: All tools must share the same layout structure (`ToolLayout`), padding, and design language.
4.  **State Persistence**: User input should never be lost on reload. Use `usePersistedState` hook for all input fields.

## 🛠️ Operational Guidelines

### 1. State Management
- **Transient State**: Use `useState` for things that don't need to survive a reload (toasts, loading spinners, temporary toggles).
- **Persistent State**: Use `usePersistedState` for **ALL** user inputs (text areas, configurations, active modes).
- **Key Naming**: Prefix `localStorage` keys with `tp:` (e.g., `tp:splitter:text`).

### 2. Component Structure
- **ToolLayout**: Every major tool **MUST** be wrapped in `<ToolLayout>`.
- **Icons**: Use `lucide-react`. Imports should be explicit.
- **Padding**: 
  - Outer Section: `p-4 lg:p-8` (handled by `App.tsx`).
  - Inner Tool Content: `p-6` for panels.
  - Split Views: Use `flex` with `divide-x` (desktop) or `divide-y` (mobile) for edge-to-edge dividers.

### 3. Styling (Tailwind CSS)
- **Dark Mode**: Always support `dark:` variants. Test contrast ratios.
- **Colors**: Use `slate` for neutrals, `blue` for primary actions, `indigo` (AI), `red` (destructive).
- **Typography**: `font-sans` (Roboto) for UI, `font-mono` (Fira Code) for editors/code.

### 4. PWA Considerations
- When adding new assets (icons, images), ensure they are placed in `public/` so they are served correctly.
- If modifying `index.html` head, ensure PWA meta tags remain intact.

## 🧪 Verification Steps
After making changes:
1.  **Lint Check**: Ensure no unused imports or type errors.
2.  **Persistence Check**: Reload the page to verify data sticks.
3.  **Responsive Check**: Verify layout on mobile (sidebar collapse, stacked grids) vs desktop.
