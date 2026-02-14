
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
- **About Page**: Project information, credits, and quick links.

### 🤖 AI Power
- **AI Assistant**: Integrated with Google's Gemini AI to perform complex natural language tasks:
  - Summarization
  - Grammar correction
  - Translation
  - Tone adjustment
  - Data extraction

### 💾 Local Persistence
- **Session Saving**: All tool inputs, settings, and active states (like Dark Mode) are automatically saved to `localStorage`.
- **Privacy Focused**: Your data never leaves your browser (except when using AI features, which go to Google's API).

## Tech Stack

- **Framework**: React 19 (via ES Modules)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Icons**: Lucide React
- **AI Engine**: Google GenAI SDK (`@google/genai`)
- **Build Tool**: Vite
- **Architecture**: Client-side SPA with PWA support (Service Worker & Manifest)
- **Deployment**: Vercel

## Installation & Usage

This project uses **Vite** for a fast development experience and efficient production builds.

1. **Clone the repository**
   ```bash
   git clone https://github.com/AuliaAdil/text-pro.git
   cd text-pro
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development Server**
   ```bash
   npm run dev
   ```

4. **Build for Production**
   ```bash
   npm run build
   ```

5. **Environment Configuration**:
   - Create a `.env.local` file in the root directory.
   - Add your Google Gemini API Key:
     ```
     GEMINI_API_KEY=your_api_key_here
     ```
     *(Required for AI Assistant functionality)*

## PWA Support

TextPro is installable as a Progressive Web App (PWA).
- Works offline (assets cached via Service Worker).
- Installable on mobile and desktop.
- Theme-aware status bar.

## License

MIT
