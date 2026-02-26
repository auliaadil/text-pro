
import React, { useState } from 'react';
import { Trash2, Printer } from 'lucide-react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';

const MarkdownViewer: React.FC = () => {
  const [md, setMd] = usePersistedState('tp:markdown:content', '# Hello World\n\nStart typing **markdown** here to see it rendered live.\n\n### Features\n- Live Preview\n- Side by side editing\n- Clean rendering', true);
  const [viewMode, setViewMode] = usePersistedState<'both' | 'edit' | 'preview'>('tp:markdown:viewMode', 'both');

  const renderMarkdown = (text: string) => {
    // 1. Extract PRE blocks (Code blocks)
    const codeBlocks: string[] = [];
    let processedText = text.replace(/```([a-z0-9]*)\n([\s\S]*?)```/gim, (match, _lang, code) => {
      codeBlocks.push(code);
      return `\n\n__CODE_BLOCK_${codeBlocks.length - 1}__\n\n`;
    });

    // 2. Extract Inline Code
    const inlineCodes: string[] = [];
    processedText = processedText.replace(/`([^`\n]+)`/gim, (match, code) => {
      inlineCodes.push(code);
      return `__INLINE_CODE_${inlineCodes.length - 1}__`;
    });

    // 3. Inline Formatting (bold, italic, links, images)
    processedText = processedText
      .replace(/\*\*(.*?)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' class='max-w-full rounded-lg my-3 shadow-sm' />")
      .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' class='text-blue-600 dark:text-blue-400 hover:underline'>$1</a>");

    // 4. Block-level processing (Headers, Lists, Blockquotes, Tables, Paragraphs)
    const blocks = processedText.split(/\n\n+/);
    processedText = blocks.map(block => {
      const trimmed = block.trim();
      if (!trimmed) return '';

      // Is it a Code Block Placeholder?
      if (trimmed.startsWith('__CODE_BLOCK_')) {
        return trimmed;
      }

      // Is it a Heading?
      if (trimmed.startsWith('# ')) return trimmed.replace(/^# (.*)/gm, '<h1 class="text-3xl font-bold mt-6 mb-4 text-slate-900 dark:text-white">$1</h1>');
      if (trimmed.startsWith('## ')) return trimmed.replace(/^## (.*)/gm, '<h2 class="text-2xl font-bold mt-5 mb-3 text-slate-800 dark:text-slate-100">$1</h2>');
      if (trimmed.startsWith('### ')) return trimmed.replace(/^### (.*)/gm, '<h3 class="text-xl font-bold mt-4 mb-2 text-slate-800 dark:text-slate-100">$1</h3>');

      // Is it a Blockquote?
      if (trimmed.startsWith('> ')) {
        return trimmed.replace(/^> (.*)/gm, '<blockquote class="border-l-4 border-slate-300 dark:border-slate-600 pl-4 italic my-3 text-slate-600 dark:text-slate-400">$1</blockquote>');
      }

      // Is it a List?
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
        const listItems = trimmed.split('\n').map(line => line.replace(/^[-*]\s+(.*)/, '<li class="ml-5 list-disc my-1">$1</li>')).join('');
        return `<ul class="my-3 text-slate-800 dark:text-slate-200">${listItems}</ul>`;
      }

      // Is it a Table?
      if (trimmed.startsWith('|') && trimmed.includes('|-')) {
        const lines = trimmed.split('\n');
        let html = '<div class="overflow-x-auto my-5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm"><table class="w-full text-left border-collapse text-sm">';
        lines.forEach((line, i) => {
          if (line.includes('|-')) return;
          const cells = line.split('|').filter((c, idx, arr) => {
            if ((idx === 0 || idx === arr.length - 1) && c.trim() === '') return false;
            return true;
          });

          if (i === 0) {
            html += '<thead class="bg-slate-50 dark:bg-slate-900/80"><tr>';
            cells.forEach((cell, ci) => {
              const borderCls = ci === 0 ? '' : 'border-l border-slate-200 dark:border-slate-800';
              html += `<th class="px-4 py-3 font-semibold text-slate-800 dark:text-slate-200 ${borderCls}">${cell.trim()}</th>`;
            });
            html += '</tr></thead><tbody class="divide-y divide-slate-200 dark:divide-slate-800">';
          } else {
            html += `<tr class="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors bg-white dark:bg-slate-950">`;
            cells.forEach((cell, ci) => {
              const borderCls = ci === 0 ? '' : 'border-l border-slate-200 dark:border-slate-800';
              html += `<td class="px-4 py-3 text-slate-700 dark:text-slate-300 ${borderCls} leading-relaxed">${cell.trim()}</td>`;
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
    processedText = processedText.replace(/__INLINE_CODE_(\d+)__/g, (match, index) => {
      const escaped = inlineCodes[Number(index)].replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      return `<code class="bg-slate-100 dark:bg-slate-800 text-pink-600 dark:text-pink-400 px-1.5 py-0.5 rounded text-sm font-mono border border-slate-200 dark:border-slate-700 shadow-sm">${escaped}</code>`;
    });

    // 6. Restore Code Blocks with syntax highlight heuristics
    processedText = processedText.replace(/__CODE_BLOCK_(\d+)__/g, (match, index) => {
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
