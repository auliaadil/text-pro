
# TextPro - Ultimate Text Manipulation Studio

TextPro is a powerful, modern web application designed for developers, writers, and data handlers. It provides a comprehensive suite of text manipulation tools in a single, responsive interface featuring dark mode and offline PWA capabilities.

## Features

### 🛠️ Core Tools
- **Text Counter**: Real-time analytics for words, characters, lines, sentences, paragraphs, and reading time.
- **Text Splitter**: Break down text by newlines, commas, spaces, pipes, or custom delimiters.
- **Reformatter**: extensive string transformations including:
  - Case conversion (Upper, Lower, Title, Camel, Snake, Kebab)
  - Whitespace cleaning
  - Line sorting (A-Z)
  - Text reversing
- **Diff Viewer**: Compare two text sources with high precision. Supports Line-by-Line, Word-by-Word, and Character-by-Character diffing modes.
- **JSON Formatter**: Validate, beautify, and minify JSON with error detection.
- **HTML Formatter**: Clean, indent, or minify HTML structure.
- **Markdown Viewer**: Live split-pane editor for GitHub-flavored markdown.

### 🤖 AI Power
- **AI Assistant**: Integrated with Google's Gemini AI to perform complex natural language tasks:
  - Summarization
  - Grammar correction
  - Translation
  - Tone adjustment
  - Data extraction

## Tech Stack

- **Framework**: React 19 (via ES Modules)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **Architecture**: Client-side SPA with PWA support (Service Worker & Manifest)

## Installation & Usage

This project is built using modern ES Modules and imports dependencies directly via CDN (`esm.sh`), eliminating the need for complex bundlers like Webpack or Vite for basic execution.

1. **Clone the repository**
2. **Serve the directory**: Use any static file server (e.g., `serve`, `http-server`, or VS Code Live Server).
3. **Environment**:
   - To use the AI Assistant, a Google Gemini API Key is required.
   - The application looks for `process.env.API_KEY` when initializing the Gemini Service.

## PWA Support

TextPro is installable as a Progressive Web App (PWA).
- Works offline (assets cached via Service Worker).
- Installable on mobile and desktop.
- Theme-aware status bar.

## License

MIT
