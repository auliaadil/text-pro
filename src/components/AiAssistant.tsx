
import React, { useState } from 'react';
import ToolLayout from './ToolLayout';
import { GeminiService } from '../services/geminiService';
import { Sparkles, Send, Copy, Loader2 } from 'lucide-react';
import Toast from './Toast';

const AiAssistant: React.FC = () => {
  const [text, setText] = useState('');
  const [instruction, setInstruction] = useState('Summarize this text in 3 bullet points.');
  const [result, setResult] = useState('');
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);

  const presets = [
    "Summarize this briefly",
    "Rewrite this professionally",
    "Explain this like I'm five",
    "Translate to Spanish",
    "Extract all email addresses",
    "Convert this to a bulleted list",
    "Fix grammar and spelling"
  ];

  const handleProcess = async () => {
    if (!text.trim() || !instruction.trim()) return;
    setLoading(true);
    try {
      const gemini = GeminiService.getInstance();
      const output = await gemini.processSmartText(text, instruction);
      setResult(output);
    } catch (err) {
      setResult("Error processing with Gemini. Please check your API configuration.");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setShowToast(true);
  };

  return (
    <>
      <ToolLayout
        description="Leverage the power of Gemini AI to perform complex text transformations, translations, and analysis."
      >
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[45rem]">
          {/* Input Panel */}
          <div className="lg:col-span-7 p-6 space-y-4 border-r border-slate-100 dark:border-slate-800 flex flex-col">
            <div className="flex-1 space-y-4 flex flex-col">
              <div className="space-y-2 flex-1 flex flex-col">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Input Text</label>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="w-full flex-1 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent font-mono text-sm text-slate-800 dark:text-slate-200 placeholder-slate-400 resize-none transition-all focus:outline-none"
                  placeholder="Enter the source text here..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">Instruction</label>
                <div className="relative">
                  <input
                    type="text"
                    value={instruction}
                    onChange={(e) => setInstruction(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleProcess()}
                    className="w-full pl-4 pr-24 py-3 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-slate-900 dark:text-slate-100 placeholder-slate-400"
                    placeholder="What should I do with this text?"
                  />
                  <button
                    onClick={handleProcess}
                    disabled={loading || !text.trim()}
                    className="absolute right-1.5 top-1.5 bottom-1.5 px-4 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    Go
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2">
                {presets.map(p => (
                  <button
                    key={p}
                    onClick={() => setInstruction(p)}
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-full hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors border border-transparent hover:border-indigo-100 dark:hover:border-indigo-800"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output Panel */}
          <div className="lg:col-span-5 p-6 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col h-full">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
                <Sparkles size={16} />
                <span className="text-xs font-bold uppercase tracking-widest">AI Result</span>
              </div>
              {result && (
                <button 
                  onClick={handleCopy}
                  className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-sm"
                >
                  <Copy size={14} />
                </button>
              )}
            </div>
            
            <div className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 overflow-y-auto shadow-inner relative group">
              {!loading && !result ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-400 opacity-50 space-y-4 text-center">
                  <Sparkles size={48} />
                  <p className="text-sm max-w-xs">Enter some text and an instruction to see the magic happen.</p>
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center h-full space-y-4">
                  <div className="relative">
                    <div className="w-12 h-12 border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600 dark:border-t-indigo-400 rounded-full animate-spin"></div>
                    <Sparkles className="absolute inset-0 m-auto text-indigo-600 dark:text-indigo-400 animate-pulse" size={20} />
                  </div>
                  <p className="text-sm font-medium text-slate-500 animate-pulse">Gemini is thinking...</p>
                </div>
              ) : (
                <div className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed animate-in fade-in duration-500 font-mono">
                  {result}
                </div>
              )}
            </div>
          </div>
        </div>
      </ToolLayout>
      <Toast message="AI result copied to clipboard" isVisible={showToast} onClose={() => setShowToast(false)} />
    </>
  );
};

export default AiAssistant;
