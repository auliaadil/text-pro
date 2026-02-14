
import React, { useState, useEffect } from 'react';
import { usePersistedState } from './hooks/usePersistedState';
import {
  Hash,
  Scissors,
  Type,
  FileDiff,
  Code,
  FileCode,
  Eye,
  Sparkles,
  Menu,
  X,
  ChevronLeft,
  ChevronRight,
  Moon,
  Sun
} from 'lucide-react';
import { ToolType } from './types';
import TextCounter from './components/TextCounter';
import TextSplitter from './components/TextSplitter';
import TextReformatter from './components/TextReformatter';
import DiffViewer from './components/DiffViewer';
import JsonFormatter from './components/JsonFormatter';
import HtmlFormatter from './components/HtmlFormatter';
import MarkdownViewer from './components/MarkdownViewer';
import AiAssistant from './components/AiAssistant';

const App: React.FC = () => {
  const [activeTool, setActiveTool] = usePersistedState<ToolType>('tp:activeTool', ToolType.COUNTER);
  const [isCollapsed, setIsCollapsed] = usePersistedState('tp:sidebarCollapsed', false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = usePersistedState('tp:darkMode', false);

  const [isScrollingAllowed, setIsScrollingAllowed] = useState(!isCollapsed);

  useEffect(() => {
    if (isCollapsed) {
      setIsScrollingAllowed(false);
    } else {
      const timer = setTimeout(() => setIsScrollingAllowed(true), 300);
      return () => clearTimeout(timer);
    }
  }, [isCollapsed]);

  // Initialize dark mode
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

  // Close mobile menu on resize if screen becomes large
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) {
        setIsMobileOpen(false);
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const tools = [
    { id: ToolType.COUNTER, name: 'Text Counter', icon: <Hash size={20} /> },
    { id: ToolType.SPLITTER, name: 'Text Splitter', icon: <Scissors size={20} /> },
    { id: ToolType.REFORMATTER, name: 'Reformatter', icon: <Type size={20} /> },
    { id: ToolType.DIFF, name: 'Diff Viewer', icon: <FileDiff size={20} /> },
    { id: ToolType.JSON, name: 'JSON Formatter', icon: <Code size={20} /> },
    { id: ToolType.HTML, name: 'HTML Formatter', icon: <FileCode size={20} /> },
    { id: ToolType.MARKDOWN, name: 'MD Viewer', icon: <Eye size={20} /> },
    { id: ToolType.AI_ASSISTANT, name: 'AI Assistant', icon: <Sparkles size={20} />, primary: true },
  ];

  const renderTool = () => {
    switch (activeTool) {
      case ToolType.COUNTER: return <TextCounter />;
      case ToolType.SPLITTER: return <TextSplitter />;
      case ToolType.REFORMATTER: return <TextReformatter />;
      case ToolType.DIFF: return <DiffViewer />;
      case ToolType.JSON: return <JsonFormatter />;
      case ToolType.HTML: return <HtmlFormatter />;
      case ToolType.MARKDOWN: return <MarkdownViewer />;
      case ToolType.AI_ASSISTANT: return <AiAssistant />;
      default: return <TextCounter />;
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden font-sans text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Mobile Overlay */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-30 lg:hidden backdrop-blur-sm"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed lg:relative z-40 h-full bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 ease-in-out flex flex-col
        ${isMobileOpen ? 'translate-x-0 w-64' : '-translate-x-full lg:translate-x-0'}
        ${isCollapsed ? 'lg:w-20' : 'lg:w-64'}
      `}>
        {/* Toggle Button (Desktop Only) */}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="hidden lg:flex absolute -right-3 top-9 w-6 h-6 bg-blue-600 text-white rounded-full items-center justify-center shadow-lg hover:bg-blue-700 transition-transform hover:scale-110 z-50 border-2 border-white dark:border-slate-900"
        >
          {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
        </button>

        {/* Sidebar Header */}
        <div className={`
          flex items-center h-20 px-4 transition-all duration-300 border-b border-transparent
          ${isCollapsed ? 'justify-center' : 'justify-start gap-3'}
        `}>
          <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40">
            <span className="font-bold text-lg">TP</span>
          </div>
          <div className={`flex flex-col overflow-hidden transition-all duration-300 ${isCollapsed ? 'w-0 opacity-0' : 'w-auto opacity-100'}`}>
            <span className="font-bold text-slate-800 dark:text-white whitespace-nowrap">TextPro</span>
            <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider whitespace-nowrap">Text Suite</span>
          </div>
        </div>



        {/* Navigation */}
        <nav className={`flex-1 px-3 py-4 space-y-2 scrollbar-hide ${!isCollapsed && isScrollingAllowed ? 'overflow-y-auto' : 'overflow-hidden'}`}>
          {tools.map((tool) => (
            <button
              key={tool.id}
              onClick={() => {
                setActiveTool(tool.id);
                setIsMobileOpen(false);
              }}
              className={`
                relative group w-full flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-200
                ${activeTool === tool.id
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200 dark:shadow-none'
                  : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'}
                ${isCollapsed ? 'justify-center' : ''}
              `}
            >
              <div className="flex-shrink-0 relative">
                {tool.icon}
                {tool.primary && activeTool !== tool.id && (
                  <span className="absolute top-0 right-0 w-2 h-2 bg-red-400 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </div>

              <span className={`text-sm font-medium whitespace-nowrap transition-all duration-300 ${isCollapsed ? 'hidden w-0' : 'block'}`}>
                {tool.name}
              </span>

              {/* Tooltip for collapsed mode */}
              {isCollapsed && (
                <div className="absolute left-full top-1/2 -translate-y-1/2 ml-3 px-2 py-1 bg-slate-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
                  {tool.name}
                </div>
              )}
            </button>
          ))}
        </nav>

        {/* Footer Actions */}
        <div className="p-3 mt-auto border-t border-slate-50 dark:border-slate-800 space-y-1">
          <div
            className={`
               flex items-center gap-3 px-3 py-3 rounded-xl bg-slate-50 dark:bg-slate-950 transition-colors
               ${isCollapsed ? 'justify-center bg-transparent' : 'justify-between'}
             `}
            onClick={() => setIsDarkMode(!isDarkMode)}
            role="button"
          >
            <div className={`flex items-center gap-3 ${isCollapsed ? 'hidden' : 'flex'}`}>
              {isDarkMode ? <Moon size={18} className="text-indigo-400" /> : <Sun size={18} className="text-orange-500" />}
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Dark Mode</span>
            </div>

            {isCollapsed ? (
              <button className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                {isDarkMode ? <Moon size={20} className="text-indigo-400" /> : <Sun size={20} />}
              </button>
            ) : (
              <div className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${isDarkMode ? 'bg-indigo-600' : 'bg-slate-200'}`}>
                <div className={`absolute top-1 w-3 h-3 bg-white rounded-full shadow-sm transition-all duration-300 ${isDarkMode ? 'left-6' : 'left-1'}`}></div>
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Mobile Header Toggle */}
        <div className="lg:hidden absolute top-4 left-4 z-20">
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2.5 bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700 active:scale-95 transition-transform"
          >
            {isMobileOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        <header className="h-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-6 lg:px-8 pl-20 lg:pl-8 sticky top-0 z-10">
          <div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-white">
              {tools.find(t => t.id === activeTool)?.name}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 hidden sm:block">Manage and transform your text efficiently</p>
          </div>
        </header>

        <section className="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth">
          <div className="max-w-6xl mx-auto h-full">
            {renderTool()}
          </div>
        </section>
      </main>
    </div>
  );
};

export default App;
