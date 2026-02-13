# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

TextPro is a Progressive Web App (PWA) that provides a suite of text manipulation tools. The app is a client-side SPA built with React 19, TypeScript, and Tailwind CSS, featuring dark mode and offline capabilities.

## Common Commands

```bash
# Development
npm run dev           # Start dev server on port 3000, host 0.0.0.0

# Build
npm run build         # Build for production with Vite
npm run preview       # Preview production build
```

## Architecture

### Entry Points
- `index.html` - Main HTML with Tailwind CDN, Google Fonts, Import Map for ESM dependencies
- `src/index.tsx` - React root mounting and Service Worker registration for PWA
- `src/App.tsx` - Main app component with sidebar navigation and tool routing

### Tool System
The app uses a **tool-based architecture** defined in `src/types.ts`:
- `ToolType` enum defines all tool identifiers (COUNTER, SPLITTER, REFORMATTER, DIFF, JSON, HTML, MARKDOWN, AI_ASSISTANT)
- `App.tsx` maintains `activeTool` state and renders the appropriate component
- Tools are self-contained components in `src/components/`

### Component Pattern
All tools use the `ToolLayout` wrapper component:
```tsx
<ToolLayout
  description="Tool description"
  actions={<ActionButtons />}>
  {/* Tool content */}
</ToolLayout>
```

### AI Integration
- `src/services/geminiService.ts` - Singleton service using Google GenAI SDK
- Requires `GEMINI_API_KEY` environment variable (injected via Vite's `define` in `vite.config.ts`)
- The AI Assistant tool uses this service for text transformations

### Environment Variables
Set `GEMINI_API_KEY` in `.env.local` or your environment to enable AI features. Vite injects this as `process.env.API_KEY` at build time.

### Dependencies via Import Map
Dependencies are loaded via `esm.sh` CDN in `index.html` import map, not from node_modules. This includes:
- `react` and `react-dom` (v19.2.3)
- `lucide-react` for icons
- `@google/genai` for AI features
- `diff` for diff viewer functionality

### PWA Features
- Service Worker: `sw.js` (registered in `src/index.tsx`)
- Manifest: `manifest.json`
- Offline-capable with asset caching

### Styling
- Tailwind CSS v4 with class-based dark mode (`dark:` prefix)
- Dark mode toggled via `isDarkMode` state in `App.tsx` adding/removing `dark` class on `<html>`
- Custom scrollbar styles in `index.html`
- Icons from Lucide React

### Path Aliases
`@` maps to `./src` (configured in `vite.config.ts`)
