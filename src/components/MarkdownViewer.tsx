
import React, { useState } from 'react';
import { Trash2, Printer } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';

const DEFAULT_MARKDOWN = `# Markdown syntax guide

## Headers

# This is a Heading h1
## This is a Heading h2
###### This is a Heading h6

## Emphasis

*This text will be italic*  
_This will also be italic_

**This text will be bold**  
__This will also be bold__

_You **can** combine them_

## Lists

### Unordered

* Item 1
* Item 2
* Item 2a
* Item 2b
    * Item 3a
    * Item 3b

### Ordered

1. Item 1
2. Item 2
3. Item 3
    1. Item 3a
    2. Item 3b

## Images

![This is an alt text.](https://play-lh.googleusercontent.com/1-hPxafOxdYpYZEOKzNIkSP43HXCNftVJVttoo4ucl7rsMASXW3Xr6GlXURCubE1tA=w3840-h2160-rw "This is a sample image.")

## Links

You may be using [TextPro Studio](https://textpro-studio.vercel.app/).

## Blockquotes

> Markdown is a lightweight markup language with plain-text-formatting syntax, created in 2004 by John Gruber with Aaron Swartz.
>
>> Markdown is often used to format readme files, for writing messages in online discussion forums, and to create rich text using a plain text editor.

## Tables

| Left columns  | Right columns |
| ------------- |:-------------:|
| left foo      | right foo     |
| left bar      | right bar     |
| left baz      | right baz     |

## Blocks of code

\`\`\`javascript
let message = 'Welcome to TextPro Studio';
alert(message);
\`\`\`

## Inline code

This web site is using \`Custom Markdown Parser\`.`;

const MarkdownViewer: React.FC = () => {
  const [md, setMd] = usePersistedState('tp:markdown:content', DEFAULT_MARKDOWN, true);
  const [viewMode, setViewMode] = usePersistedState<'both' | 'edit' | 'preview'>('tp:markdown:viewMode', 'both');

  const renderMarkdown = (text: string) => {
    // 1. Extract PRE blocks (Code blocks)
    const codeBlocks: string[] = [];
    let processedText = text.replace(/```(.*?)\n([\s\S]*?)```/gim, (match, _lang, code) => {
      codeBlocks.push(code);
      return `\n\n@@@CODE_BLOCK_${codeBlocks.length - 1}@@@\n\n`;
    });

    // 2. Extract Inline Code
    const inlineCodes: string[] = [];
    processedText = processedText.replace(/`([^`\n]+)`/gim, (match, code) => {
      inlineCodes.push(code);
      return `@@@INLINE_CODE_${inlineCodes.length - 1}@@@`;
    });

    // 3. Inline Formatting (bold, italic, links, images)

    // Links and Images FIRST to protect their URLs
    processedText = processedText
      .replace(/!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/gim, (match, alt, url, title) => {
        const titleAttr = title ? ` title='${title}'` : '';
        return `<img alt='${alt}' src='${url}'${titleAttr} class='max-w-full rounded-lg my-3 shadow-sm' />`;
      })
      .replace(/\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)/gim, (match, text, url, title) => {
        const titleAttr = title ? ` title='${title}'` : '';
        return `<a href='${url}'${titleAttr} class='text-blue-600 dark:text-blue-400 hover:underline'>${text}</a>`;
      });

    // Emphases
    processedText = processedText
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/__(.*?)__/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/(^|\s)_([^_]+)_(?=$|\s|[.,?!])/gim, '$1<em>$2</em>');

    // 4. Block-level processing
    const blocks = processedText.split(/\n\n+/);
    processedText = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Is it a Code Block Placeholder?
      if (trimmed.startsWith('@@@CODE_BLOCK_')) {
        return trimmed;
      }

      // Is it a Heading?
      if (/^#{1,6} /.test(trimmed)) {
        return trimmed.replace(/^(#{1,6}) (.*)/gm, (match, hashes, content) => {
          const level = hashes.length;
          const sizes = ['text-3xl', 'text-2xl', 'text-xl', 'text-lg', 'text-base', 'text-sm'];
          const margins = ['mt-6 mb-4', 'mt-5 mb-3', 'mt-4 mb-2', 'mt-3 mb-2', 'mt-2 mb-1', 'mt-2 mb-1'];
          return `<h${level} class="${sizes[level - 1]} font-bold ${margins[level - 1]} text-slate-900 dark:text-white">${content}</h${level}>`;
        });
      }

      // Is it a Blockquote (handles basic nesting visual layout without recursive DOM)?
      if (/^>/.test(trimmed)) {
        let bqHtml = trimmed.split('\n').map(l => {
          const match = l.match(/^(>+)\s?(.*)/);
          if (match) {
            const depth = match[1].length;
            const content = match[2];
            const padding = (depth - 1) * 16;
            return `<div style="padding-left: ${padding}px; border-left: ${depth > 1 ? '4px solid #cbd5e1' : 'none'}; margin-left: ${depth > 1 ? '16px' : '0'}">${content}</div>`;
          }
          return l;
        }).join('');
        return `<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-4 py-1 italic my-3 text-slate-600 dark:text-slate-400 bg-slate-50/50 dark:bg-slate-800/20 rounded-r-lg">${bqHtml}</blockquote>`;
      }

      // Is it a List? (Ordered or Unordered, with nesting)
      if (/^(\s*)([-*+]|\d+\.)\s+/.test(trimmed)) {
        const lines = block.split('\n'); // keep leading spaces
        let html = '';
        const stack: { type: 'ul' | 'ol', indent: number }[] = [];
        let inLi = false;

        lines.forEach(line => {
          if (!line.trim()) return;
          const listMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)/);
          if (listMatch) {
            const [, indentStr, marker, content] = listMatch;
            const indent = indentStr.length;
            const type = /^\d/.test(marker) ? 'ol' : 'ul';

            while (stack.length > 0 && stack[stack.length - 1].indent > indent) {
              if (inLi) { html += '</li>'; inLi = false; }
              html += stack.pop()!.type === 'ol' ? '</ol>' : '</ul>';
            }

            if (stack.length === 0 || stack[stack.length - 1].indent < indent) {
              stack.push({ type, indent });
              const listClass = type === 'ol' ? 'list-decimal' : 'list-disc';
              html += `<${type} class="pl-6 ${listClass} my-2 text-slate-800 dark:text-slate-200 space-y-1">`;
            } else if (stack[stack.length - 1].type !== type) {
              if (inLi) { html += '</li>'; inLi = false; }
              html += stack.pop()!.type === 'ol' ? '</ol>' : '</ul>';
              stack.push({ type, indent });
              const listClass = type === 'ol' ? 'list-decimal' : 'list-disc';
              html += `<${type} class="pl-6 ${listClass} my-2 text-slate-800 dark:text-slate-200 space-y-1">`;
            } else {
              if (inLi) { html += '</li>'; inLi = false; }
            }

            html += `<li class="pl-1">${content}`;
            inLi = true;
          } else {
            // Continuation of previous list item
            html += `<br />${line.trim()}`;
          }
        });

        if (inLi) html += '</li>';
        while (stack.length > 0) {
          html += stack.pop()!.type === 'ol' ? '</ol>' : '</ul>';
        }
        return html;
      }

      // Is it a Table?
      if (trimmed.includes('|') && trimmed.match(/\|[-\s:]+\|/)) {
        const lines = trimmed.split('\n');
        let html = '<div class="overflow-x-auto my-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"><table class="w-full text-left border-collapse text-sm">';

        let alignments: string[] = [];

        lines.forEach((line, i) => {
          let cells = line.split('|');
          if (cells.length > 0 && cells[0].trim() === '') cells.shift();
          if (cells.length > 0 && cells[cells.length - 1].trim() === '') cells.pop();

          if (i === 1 && line.match(/\|[-\s:]+\|/)) {
            alignments = cells.map(c => {
              const cell = c.trim();
              const left = cell.startsWith(':');
              const right = cell.endsWith(':');
              if (left && right) return 'text-center';
              if (right) return 'text-right';
              return 'text-left';
            });
            return;
          }

          if (i === 0) {
            html += '<thead class="bg-slate-50 dark:bg-slate-900/80"><tr>';
            cells.forEach((cell, ci) => {
              const borderCls = ci === 0 ? '' : 'border-l border-slate-200 dark:border-slate-800';
              const alignCls = alignments[ci] || 'text-left';
              html += `<th class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 ${borderCls} ${alignCls}">${cell.trim()}</th>`;
            });
            html += '</tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800">';
          } else {
            html += `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-950">`;
            cells.forEach((cell, ci) => {
              const borderCls = ci === 0 ? '' : 'border-l border-slate-200 dark:border-slate-800';
              const alignCls = alignments[ci] || 'text-left';
              html += `<td class="px-4 py-3 text-slate-700 dark:text-slate-300 ${borderCls} ${alignCls} leading-relaxed">${cell.trim()}</td>`;
            });
            html += '</tr>';
          }
        });
        html += '</tbody></table></div>';
        return html;
      }

      // Otherwise, it's a paragraph
      return `<p class="my-3 text-slate-800 dark:text-slate-200 leading-relaxed">${trimmed.replace(/\n/g, '<br />')}</p>`;
    }).join('\n');

    // 5. Restore Inline Code
    processedText = processedText.replace(/@@@INLINE_CODE_(\d+)@@@/g, (match, index) => {
      const escaped = inlineCodes[Number(index)].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200 dark:border-slate-700 shadow-sm">${escaped}</code>`;
    });

    // 6. Restore Code Blocks with syntax highlight heuristics
    processedText = processedText.replace(/@@@CODE_BLOCK_(\d+)@@@/g, (match, index) => {
      const code = codeBlocks[Number(index)] || '';
      const escaped = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

      const highlighted = escaped
        .replace(/(\/\/[^\n]*)/g, '<span class="text-slate-500 dark:text-slate-500 italic">$1</span>') // comments
        .replace(/(['"].*?['"])/g, '<span class="text-emerald-600 dark:text-emerald-400">$1</span>') // strings
        .replace(/\b(class|final|String|List|Map|Color|Brightness|const|var|let|function|return|import|export|if|else|for|while|await|async|void|int|double|bool|dynamic|null|true|false)\b/g, '<span class="text-indigo-600 dark:text-indigo-400 font-semibold">$1</span>')
        .replace(/\b([A-Z][a-zA-Z0-9_]*)\b/g, '<span class="text-amber-600 dark:text-amber-400">$1</span>') // Types/Classes
        .replace(/(\b[a-zA-Z0-9_]+\s*)(?=\()/g, '<span class="text-blue-600 dark:text-blue-400">$1</span>'); // function calls

      return `<div class="my-5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-inner overflow-hidden font-mono text-sm leading-relaxed"><div class="px-5 py-4 overflow-x-auto"><pre><code>${highlighted}</code></pre></div></div>`;
    });

    return processedText;
  };

  const handleExportPdf = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    // Extract all styles and stylesheets from the main document to ensure Tailwind classes work
    const styles = Array.from(document.querySelectorAll('style, link[rel="stylesheet"]'))
      .map(el => el.outerHTML)
      .join('\n');

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Export PDF - Markdown Viewer</title>
          ${styles}
          <style>
            @media print {
              body { 
                background: white !important; 
                color: black !important; 
                -webkit-print-color-adjust: exact; 
                print-color-adjust: exact; 
              }
              .no-print { display: none !important; }
            }
          </style>
        </head>
        <body class="bg-white text-slate-900 p-8 sm:p-12">
          <div class="max-w-4xl mx-auto markdown-preview">
            ${renderMarkdown(md)}
          </div>
          <script>
            // Wait slightly for fonts/styles to apply before printing
            setTimeout(() => {
              window.print();
              window.close();
            }, 300);
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <ToolLayout
      description="Write and preview GitHub-flavored markdown in a side-by-side view."
      actions={
        <>
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
            <button
              onClick={() => setViewMode('edit')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'edit' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Edit
            </button>
            <button
              onClick={() => setViewMode('both')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'both' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Split
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${viewMode === 'preview' ? 'bg-white dark:bg-slate-700 shadow-sm text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}
            >
              Preview
            </button>
          </div>
          <button
            onClick={handleExportPdf}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
          >
            <Printer size={16} /> Export PDF
          </button>
          <button
            onClick={() => setMd('')}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors"
          >
            <Trash2 size={16} /> Clear
          </button>
        </>
      }
    >
      <div className={`flex flex-1 min-h-0 overflow-hidden ${viewMode === 'both' ? 'divide-x divide-slate-100 dark:divide-slate-800' : ''}`}>
        {(viewMode === 'edit' || viewMode === 'both') && (
          <div className="flex-1 p-6">
            <textarea
              value={md}
              onChange={(e) => setMd(e.target.value)}
              className="w-full h-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none leading-normal"
              placeholder="Write your markdown..."
            />
          </div>
        )}
        {(viewMode === 'preview' || viewMode === 'both') && (
          <div className="flex-1 p-6 overflow-y-auto">
            <div className="max-w-none text-slate-900 dark:text-slate-200">
              <div
                className="markdown-preview"
                dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
              />
            </div>
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default MarkdownViewer;
