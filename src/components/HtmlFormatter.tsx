
import React, { useState } from 'react';
import ToolLayout from './ToolLayout';
import { Copy, Minimize2, AlignLeft } from 'lucide-react';
import Toast from './Toast';

const HtmlFormatter: React.FC = () => {
  const [input, setInput] = useState('');
  const [toast, setToast] = useState<{msg: string, show: boolean}>({ msg: '', show: false });

  const showToast = (msg: string) => {
    setToast({ msg, show: true });
  };

  const beautify = () => {
    try {
      let tab = '  ';
      let result = '';
      let indent = 0;
      
      const cleanInput = input.replace(/>\s*</g, '><').trim();
      const tokens = cleanInput.split(/(<[^>]+>)/g).filter(s => s.trim().length > 0);
      const voidTags = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr', '!doctype'];

      tokens.forEach(token => {
        let change = 0;
        let isTag = token.startsWith('<');
        let tagName = '';

        if (isTag) {
          if (token.startsWith('</')) {
             change = -1;
          } else if (token.startsWith('<!--')) {
             change = 0;
          } else {
             tagName = token.replace(/[<\/>]/g, '').split(' ')[0].toLowerCase();
             if (!voidTags.includes(tagName) && !token.endsWith('/>')) {
               change = 1;
             }
          }
        }

        if (change === -1) indent = Math.max(0, indent - 1);
        result += tab.repeat(indent) + token + '\n';
        if (change === 1) indent++;
      });

      setInput(result.trim());
      showToast('HTML Beautified!');
    } catch (e) {
      showToast('Error formatting HTML');
    }
  };

  const minify = () => {
    let minified = input.replace(/<!--[\s\S]*?-->/g, "");
    minified = minified.replace(/>\s+</g, '><');
    setInput(minified.trim());
    showToast('HTML Minified!');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(input);
    showToast('HTML copied to clipboard');
  };

  return (
    <>
      <ToolLayout
        description="Format (beautify) HTML to view the tag structure clearly, or minify it to save space."
        actions={
          <div className="flex gap-2">
            <button 
              onClick={beautify}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              <AlignLeft size={16} /> Beautify
            </button>
            <button 
              onClick={minify}
              className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              <Minimize2 size={16} /> Minify
            </button>
            <button 
              onClick={handleCopy}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
            >
              <Copy size={16} /> Copy
            </button>
          </div>
        }
      >
          <div className="flex flex-col h-full min-h-[35rem] p-6 relative">
            <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                className="w-full h-full p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
                placeholder="<div class='container'><h1>Paste HTML here...</h1></div>"
                spellCheck={false}
            />
          </div>
      </ToolLayout>
      <Toast message={toast.msg} isVisible={toast.show} onClose={() => setToast({ ...toast, show: false })} />
    </>
  );
};

export default HtmlFormatter;
