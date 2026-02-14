
import React, { useState } from 'react';
import { usePersistedState } from '../hooks/usePersistedState';
import ToolLayout from './ToolLayout';

const MarkdownViewer: React.FC = () => {
  const [md, setMd] = usePersistedState('tp:markdown:content', '# Hello World\n\nStart typing **markdown** here to see it rendered live.\n\n### Features\n- Live Preview\n- Side by side editing\n- Clean rendering');
  const [viewMode, setViewMode] = usePersistedState<'both' | 'edit' | 'preview'>('tp:markdown:viewMode', 'both');

  const renderMarkdown = (text: string) => {
    return text
      // Headers with very tight margins and smaller text sizes for compactness
      .replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mb-2">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="text-xl font-bold mt-3 mb-1">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="text-lg font-bold mt-2 mb-1">$1</h3>')

      // Blockquotes with minimal vertical spacing
      .replace(/^\> (.*$)/gim, '<blockquote class="border-l-4 border-slate-300 pl-4 italic my-1 text-slate-600 dark:text-slate-400">$1</blockquote>')

      // Formatting
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/^\- (.*$)/gim, '<li class="ml-4 list-disc">$1</li>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, "<img alt='$1' src='$2' class='max-w-full rounded-lg my-2' />")
      .replace(/\[(.*?)\]\((.*?)\)/gim, "<a href='$2' class='text-blue-600 hover:underline'>$1</a>")

      // Tighter line breaks
      .replace(/\n/gim, '<br />');
  };

  return (
    <ToolLayout
      description="Write and preview GitHub-flavored markdown in a side-by-side view."
      actions={
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
      }
    >
      <div className="flex h-[40rem] p-6 gap-6">
        {(viewMode === 'edit' || viewMode === 'both') && (
          <textarea
            value={md}
            onChange={(e) => setMd(e.target.value)}
            className="flex-1 h-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none leading-normal"
            placeholder="Write your markdown..."
          />
        )}
        {(viewMode === 'preview' || viewMode === 'both') && (
          <div className="flex-1 h-full p-6 overflow-y-auto bg-slate-50/50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 rounded-xl max-w-none text-slate-900 dark:text-slate-200 leading-tight text-sm">
            <div
              className="markdown-preview"
              dangerouslySetInnerHTML={{ __html: renderMarkdown(md) }}
            />
          </div>
        )}
      </div>
    </ToolLayout>
  );
};

export default MarkdownViewer;
