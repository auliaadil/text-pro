
import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';
import { Copy, Info, AlignLeft, Minimize2, Trash2, AlertCircle, CheckCircle2, ArrowRight } from 'lucide-react';
import Toast from './Toast';

// --- Utilities ---

interface JsonToken {
  type: 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation' | 'whitespace' | 'unknown';
  value: string;
}

function tokenizeJson(text: string): JsonToken[] {
  const tokens: JsonToken[] = [];
  let i = 0;
  while (i < text.length) {
    const ch = text[i];

    // Whitespace (including newlines)
    if (/\s/.test(ch)) {
      let ws = '';
      while (i < text.length && /\s/.test(text[i])) { ws += text[i]; i++; }
      tokens.push({ type: 'whitespace', value: ws });
      continue;
    }

    // Strings (keys or values)
    if (ch === '"') {
      let str = '"';
      i++;
      while (i < text.length && text[i] !== '"') {
        if (text[i] === '\\') { str += text[i]; i++; }
        if (i < text.length) { str += text[i]; i++; }
      }
      if (i < text.length) { str += '"'; i++; }

      // Determine if this string is a key: look ahead for ':'
      let j = i;
      while (j < text.length && /\s/.test(text[j])) { j++; }
      const isKey = j < text.length && text[j] === ':';
      tokens.push({ type: isKey ? 'key' : 'string', value: str });
      continue;
    }

    // Numbers
    if (/[-\d]/.test(ch)) {
      let num = '';
      while (i < text.length && /[-\d.eE+]/.test(text[i])) { num += text[i]; i++; }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Booleans
    if (text.slice(i, i + 4) === 'true') {
      tokens.push({ type: 'boolean', value: 'true' }); i += 4; continue;
    }
    if (text.slice(i, i + 5) === 'false') {
      tokens.push({ type: 'boolean', value: 'false' }); i += 5; continue;
    }

    // Null
    if (text.slice(i, i + 4) === 'null') {
      tokens.push({ type: 'null', value: 'null' }); i += 4; continue;
    }

    // Brackets
    if ('{[}]'.includes(ch)) {
      tokens.push({ type: 'bracket', value: ch }); i++; continue;
    }

    // Punctuation (: ,)
    if (':,'.includes(ch)) {
      tokens.push({ type: 'punctuation', value: ch }); i++; continue;
    }

    // Fallback
    tokens.push({ type: 'unknown', value: ch }); i++;
  }
  return tokens;
}

function renderTokensToHtml(
  tokens: JsonToken[],
  matchedBrackets: [number, number] | null,
  errorLine: number | null
): string {
  const colorMap: Record<string, string> = {
    key: 'text-indigo-600 dark:text-indigo-400',
    string: 'text-emerald-600 dark:text-emerald-400',
    number: 'text-amber-600 dark:text-amber-400',
    boolean: 'text-pink-600 dark:text-pink-400',
    null: 'text-pink-600 dark:text-pink-400',
    bracket: 'text-slate-700 dark:text-slate-300 font-bold',
    punctuation: 'text-slate-500 dark:text-slate-400',
    whitespace: '',
    unknown: 'text-red-500',
  };

  // Pre-compute char offsets where brackets are matched
  const matchedOffsets: Set<number> = new Set();
  if (matchedBrackets !== null) {
    matchedOffsets.add(matchedBrackets[0]);
    matchedOffsets.add(matchedBrackets[1]);
  }

  // Build a per-line structure so we can wrap error lines
  let currentLine = 1;
  let html = '';
  let lineHtml = '';
  let offset = 0;

  const flushLine = (includesNewline: boolean) => {
    if (errorLine !== null && currentLine === errorLine) {
      html += `<span class="bg-red-100 dark:bg-red-900/30 block -mx-4 px-4">${lineHtml}</span>`;
    } else {
      html += lineHtml;
    }
    if (includesNewline) {
      html += '\n';
    }
    lineHtml = '';
    currentLine++;
  };

  for (const token of tokens) {
    if (token.type === 'whitespace') {
      // Split whitespace by newlines to track line boundaries
      const parts = token.value.split('\n');
      for (let pi = 0; pi < parts.length; pi++) {
        if (pi > 0) {
          flushLine(true);
        }
        if (parts[pi]) {
          lineHtml += escapeHtml(parts[pi]);
        }
      }
    } else if (token.type === 'bracket' && matchedOffsets.has(offset)) {
      lineHtml += `<span class="${colorMap[token.type]} bg-blue-200 dark:bg-blue-800/60 rounded px-0.5">${escapeHtml(token.value)}</span>`;
    } else {
      const cls = colorMap[token.type] || '';
      lineHtml += cls ? `<span class="${cls}">${escapeHtml(token.value)}</span>` : escapeHtml(token.value);
    }
    offset += token.value.length;
  }

  // Flush remaining content on the last line
  if (lineHtml) {
    if (errorLine !== null && currentLine === errorLine) {
      html += `<span class="bg-red-100 dark:bg-red-900/30 block -mx-4 px-4">${lineHtml}</span>`;
    } else {
      html += lineHtml;
    }
  }

  return html;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function findMatchingBracket(text: string, pos: number): number | null {
  const open = '{[';
  const close = '}]';
  const ch = text[pos];

  if (open.includes(ch)) {
    // Forward search
    const matchIdx = open.indexOf(ch);
    let depth = 0;
    for (let i = pos; i < text.length; i++) {
      if (text[i] === open[matchIdx]) depth++;
      if (text[i] === close[matchIdx]) depth--;
      if (depth === 0) return i;
    }
  } else if (close.includes(ch)) {
    // Backward search
    const matchIdx = close.indexOf(ch);
    let depth = 0;
    for (let i = pos; i >= 0; i--) {
      if (text[i] === close[matchIdx]) depth++;
      if (text[i] === open[matchIdx]) depth--;
      if (depth === 0) return i;
    }
  }
  return null;
}

function parseErrorPosition(errorMsg: string, text: string): { line: number; col: number } | null {
  // Modern V8 with position info: "... at position X (line Y column Z)"
  const match1 = errorMsg.match(/line (\d+) column (\d+)/i);
  if (match1) return { line: parseInt(match1[1], 10), col: parseInt(match1[2], 10) };

  // V8 format: "at position X"
  const match2 = errorMsg.match(/at position (\d+)/i);
  if (match2) {
    const pos = parseInt(match2[1], 10);
    return { line: getLineFromPosition(text, pos), col: pos };
  }

  // Firefox format: "at line X column Y"
  const match3 = errorMsg.match(/at line (\d+) column (\d+)/i);
  if (match3) return { line: parseInt(match3[1], 10), col: parseInt(match3[2], 10) };

  // Modern V8 without position: 'Unexpected token ']', ..."Bob" },] }" is not valid JSON'
  // Strategy: extract the context snippet from the error, find it in the text, locate the bad token
  const snippetMatch = errorMsg.match(/Unexpected token '?(.)'?,\s*(?:\.\.\.)?"?(.*?)"?\s*is not valid JSON/i);
  if (snippetMatch) {
    const badToken = snippetMatch[1];
    // The snippet shown in the error is the tail of the text, try to find where badToken is
    // by using JSON.parse with progressively more characters
    // Simpler approach: just find positions of the bad token and check which one is problematic
    const positions: number[] = [];
    for (let i = 0; i < text.length; i++) {
      if (text[i] === badToken) positions.push(i);
    }
    // Try each position in reverse (later positions are more likely the error)
    for (let pi = positions.length - 1; pi >= 0; pi--) {
      const pos = positions[pi];
      // Try parsing up to just before this character
      const before = text.substring(0, pos);
      try {
        JSON.parse(before + (badToken === ']' ? ']' : badToken === '}' ? '}' : ''));
      } catch {
        // If the text up to this point already fails, this could be our error position
        return { line: getLineFromPosition(text, pos), col: pos };
      }
    }
    // If none matched via parsing, find the first instance where JSON.parse throws at this char
    for (const pos of positions) {
      try {
        JSON.parse(text);
      } catch {
        return { line: getLineFromPosition(text, pos), col: pos };
      }
    }
  }

  // Absolute fallback: "Unexpected token" without snippet - just try to find it
  const tokenOnly = errorMsg.match(/Unexpected token\s+'?(.)/);
  if (tokenOnly) {
    const badChar = tokenOnly[1];
    // Find all occurrences and return the first one where parsing text up to that point fails
    for (let i = 0; i < text.length; i++) {
      if (text[i] === badChar) {
        const partial = text.substring(0, i + 1);
        try {
          JSON.parse(partial);
        } catch (e: any) {
          // Check if the error is about THIS token specifically
          if (e.message && e.message.includes(badChar)) {
            return { line: getLineFromPosition(text, i), col: i };
          }
        }
      }
    }
  }

  return null;
}

function getLineFromPosition(text: string, position: number): number {
  let line = 1;
  for (let i = 0; i < Math.min(position, text.length); i++) {
    if (text[i] === '\n') line++;
  }
  return line;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  return `${(bytes / 1024).toFixed(1)} KB`;
}

// --- Component ---

const JsonFormatter: React.FC = () => {
  const [json, setJson] = usePersistedState('tp:json:content', '', true);
  const [error, setError] = useState<string | null>(null);
  const [errorLine, setErrorLine] = useState<number | null>(null);
  const [showToast, setShowToast] = useState(false);
  const [cursorPos, setCursorPos] = useState<number | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const overlayRef = useRef<HTMLPreElement>(null);
  const gutterRef = useRef<HTMLDivElement>(null);

  // --- Format & Minify ---
  const formatJson = (indent: number = 2) => {
    try {
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed, null, indent));
      setError(null);
      setErrorLine(null);
    } catch (err: any) {
      setError(err.message);
      const pos = parseErrorPosition(err.message, json);
      if (pos) {
        setErrorLine(pos.line);
        scrollToLine(pos.line);
      }
    }
  };

  const minifyJson = () => {
    try {
      const parsed = JSON.parse(json);
      setJson(JSON.stringify(parsed));
      setError(null);
      setErrorLine(null);
    } catch (err: any) {
      setError(err.message);
      const pos = parseErrorPosition(err.message, json);
      if (pos) {
        setErrorLine(pos.line);
      }
    }
  };

  const checkValidity = () => {
    if (!json.trim()) return;
    try {
      JSON.parse(json);
      setError(null);
      setErrorLine(null);
    } catch (err: any) {
      setError(err.message);
      const pos = parseErrorPosition(err.message, json);
      if (pos) {
        setErrorLine(pos.line);
        scrollToLine(pos.line);
      } else {
        setErrorLine(null);
      }
    }
  };

  const handleCopy = () => {
    if (!json) return;
    navigator.clipboard.writeText(json);
    setShowToast(true);
  };

  // --- Scroll sync ---
  const handleScroll = useCallback(() => {
    if (textareaRef.current && overlayRef.current) {
      overlayRef.current.scrollTop = textareaRef.current.scrollTop;
      overlayRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
    if (textareaRef.current && gutterRef.current) {
      gutterRef.current.scrollTop = textareaRef.current.scrollTop;
    }
  }, []);

  const scrollToLine = (line: number) => {
    if (!textareaRef.current) return;
    const lineHeight = 20; // matches text-sm leading
    const targetScroll = (line - 1) * lineHeight - textareaRef.current.clientHeight / 3;
    textareaRef.current.scrollTop = Math.max(0, targetScroll);
    handleScroll();
  };

  // --- Cursor tracking for bracket matching ---
  const handleCursorChange = useCallback(() => {
    if (textareaRef.current) {
      setCursorPos(textareaRef.current.selectionStart);
    }
  }, []);

  // --- Bracket matching ---
  const matchedBrackets = useMemo((): [number, number] | null => {
    if (cursorPos === null || !json) return null;
    const brackets = '{[}]';

    // Check char at cursor and char before cursor
    for (const pos of [cursorPos, cursorPos - 1]) {
      if (pos >= 0 && pos < json.length && brackets.includes(json[pos])) {
        const match = findMatchingBracket(json, pos);
        if (match !== null) return [Math.min(pos, match), Math.max(pos, match)];
      }
    }
    return null;
  }, [cursorPos, json]);

  // --- Real-time validation ---
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setJson(val);
    // Live validate on change
    if (val.trim()) {
      try {
        JSON.parse(val);
        setError(null);
        setErrorLine(null);
      } catch (err: any) {
        setError(err.message);
        const pos = parseErrorPosition(err.message, val);
        if (pos) {
          setErrorLine(pos.line);
        } else {
          setErrorLine(null);
        }
      }
    } else {
      setError(null);
      setErrorLine(null);
    }
  };

  // --- Tab key support ---
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ta = textareaRef.current;
      if (!ta) return;
      const start = ta.selectionStart;
      const end = ta.selectionEnd;
      const newValue = json.substring(0, start) + '  ' + json.substring(end);
      setJson(newValue);
      // Restore cursor position after React re-render
      requestAnimationFrame(() => {
        ta.selectionStart = ta.selectionEnd = start + 2;
      });
    }
  };

  // --- Computed values ---
  const lineCount = json.split('\n').length;
  const lines = Array.from({ length: lineCount }, (_, i) => i + 1);

  const tokens = useMemo(() => tokenizeJson(json), [json]);
  const highlightedHtml = useMemo(
    () => renderTokensToHtml(tokens, matchedBrackets, errorLine),
    [tokens, matchedBrackets, errorLine]
  );

  const stats = useMemo(() => ({
    lines: lineCount,
    size: formatBytes(new Blob([json]).size),
    isValid: (() => { try { if (!json.trim()) return null; JSON.parse(json); return true; } catch { return false; } })(),
  }), [json]);

  // Sync scroll on content change
  useEffect(() => {
    handleScroll();
  }, [json, handleScroll]);

  return (
    <>
      <ToolLayout
        description="Format, validate, and minify JSON with syntax highlighting, bracket matching, and error detection."
        actions={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => formatJson(2)}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <AlignLeft size={16} /> Beautify
            </button>
            <button
              onClick={minifyJson}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
            >
              <Minimize2 size={16} /> Minify
            </button>
            <button
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy size={16} /> Copy
            </button>
            <button
              onClick={() => { setJson(''); setError(null); setErrorLine(null); }}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
            >
              <Trash2 size={16} /> Clear
            </button>
          </div>
        }
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Editor area */}
          <div className="flex flex-1 min-h-0 overflow-hidden">
            {/* Line numbers gutter */}
            <div
              ref={gutterRef}
              className="shrink-0 overflow-hidden select-none bg-slate-100 dark:bg-slate-950 border-r border-slate-200 dark:border-slate-800 text-right py-4 pr-3 pl-2"
              style={{ width: '3.5rem' }}
            >
              {lines.map((n) => (
                <div
                  key={n}
                  className={`text-xs font-mono leading-5 h-5 flex items-center justify-end ${errorLine === n
                    ? 'text-red-500 font-bold bg-red-100 dark:bg-red-900/40 rounded-sm -mr-3 pr-3 -ml-2 pl-2'
                    : 'text-slate-400 dark:text-slate-600'
                    }`}
                >
                  {errorLine === n && <AlertCircle size={10} className="mr-1 shrink-0" />}
                  {n}
                </div>
              ))}
            </div>

            {/* Code editor (textarea + overlay) */}
            <div className="flex-1 relative min-w-0 overflow-hidden">
              {/* Syntax highlighted overlay */}
              <pre
                ref={overlayRef}
                className="absolute inset-0 p-4 font-mono text-sm leading-5 whitespace-pre-wrap break-all overflow-hidden pointer-events-none m-0"
                aria-hidden="true"
                dangerouslySetInnerHTML={{ __html: highlightedHtml + '\n' }}
              />
              {/* Transparent textarea for input */}
              <textarea
                ref={textareaRef}
                value={json}
                onChange={handleChange}
                onScroll={handleScroll}
                onKeyUp={handleCursorChange}
                onClick={handleCursorChange}
                onKeyDown={handleKeyDown}
                className="absolute inset-0 w-full h-full p-4 font-mono text-sm leading-5 resize-none bg-transparent text-transparent caret-slate-800 dark:caret-slate-200 focus:outline-none selection:bg-blue-200/60 dark:selection:bg-blue-700/40 whitespace-pre-wrap break-all"
                placeholder='{ "paste": "your JSON here" }'
                spellCheck={false}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
              />
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="shrink-0 px-4 py-2.5 bg-red-50 dark:bg-red-900/30 border-t border-red-200 dark:border-red-800 flex items-center gap-3 text-red-700 dark:text-red-200 text-xs animate-in slide-in-from-bottom duration-300">
              <AlertCircle size={14} className="shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="font-bold">Invalid JSON: </span>
                <span className="break-all">{error}</span>
              </div>
              {errorLine && (
                <button
                  onClick={() => scrollToLine(errorLine)}
                  className="shrink-0 flex items-center gap-1 px-2.5 py-1 bg-red-100 dark:bg-red-800/50 hover:bg-red-200 dark:hover:bg-red-800 rounded-md font-semibold transition-colors"
                >
                  Line {errorLine} <ArrowRight size={12} />
                </button>
              )}
            </div>
          )}

          {/* Stats footer */}
          <div className="shrink-0 flex items-center gap-4 px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 text-xs text-slate-500 dark:text-slate-400 font-mono">
            <span>{stats.lines} {stats.lines === 1 ? 'line' : 'lines'}</span>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <span>{stats.size}</span>
            {matchedBrackets && (
              <>
                <span className="text-slate-300 dark:text-slate-700">|</span>
                <span className="text-blue-500 dark:text-blue-400 font-semibold">Bracket matched</span>
              </>
            )}
            <div className="flex-1" />
            {stats.isValid !== null && (
              <button
                onClick={checkValidity}
                className={`flex items-center gap-1 font-semibold hover:opacity-80 transition-opacity ${stats.isValid ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500 dark:text-red-400'}`}
              >
                {stats.isValid ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                {stats.isValid ? 'Valid JSON' : 'Invalid JSON'}
              </button>
            )}
          </div>
        </div>
      </ToolLayout>
      <Toast message="JSON copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default JsonFormatter;
