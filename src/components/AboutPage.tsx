
import React from 'react';
import ToolLayout from './ToolLayout';
import {
    Hash,
    Scissors,
    Type,
    FileDiff,
    Code,
    FileCode,
    Eye,
    Sparkles,
    Github,
    Globe,
    Heart,
    Zap,
    Shield,
    Smartphone,
} from 'lucide-react';

const features = [
    {
        icon: <Hash size={20} />,
        name: 'Text Counter',
        description: 'Real-time word, character, line, and reading time statistics.',
    },
    {
        icon: <Scissors size={20} />,
        name: 'Text Splitter',
        description: 'Split text by delimiters, character limit, or custom patterns.',
    },
    {
        icon: <Type size={20} />,
        name: 'Reformatter',
        description: 'Case conversion, whitespace cleaning, sorting, and more.',
    },
    {
        icon: <FileDiff size={20} />,
        name: 'Diff Viewer',
        description: 'Compare texts to find additions, removals, and changes.',
    },
    {
        icon: <Code size={20} />,
        name: 'JSON Formatter',
        description: 'Beautify, minify, and validate JSON with syntax checking.',
    },
    {
        icon: <FileCode size={20} />,
        name: 'HTML Formatter',
        description: 'Format and minify HTML with proper indentation.',
    },
    {
        icon: <Eye size={20} />,
        name: 'Markdown Viewer',
        description: 'Write and preview markdown in a live side-by-side editor.',
    },
    {
        icon: <Sparkles size={20} />,
        name: 'AI Assistant',
        description: 'Gemini-powered text transformations and analysis.',
    },
];

const highlights = [
    { icon: <Zap size={20} />, title: 'Fast & Lightweight', description: 'Built with React and Vite for blazing-fast performance.' },
    { icon: <Shield size={20} />, title: 'Privacy First', description: 'All processing happens in your browser. No data sent to servers.' },
    { icon: <Smartphone size={20} />, title: 'PWA Ready', description: 'Install as a native app on any device for offline use.' },
    { icon: <Heart size={20} />, title: 'Open Source', description: 'Free to use, modify, and contribute to the project.' },
];

const AboutPage: React.FC = () => {
    return (
        <ToolLayout description="Everything you need to know about TextPro Studio.">
            <div className="p-6 lg:p-8 space-y-10 overflow-y-auto h-full">
                {/* Hero */}
                <div className="text-center space-y-4 py-6">
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-200 dark:shadow-blue-900/40 mx-auto">
                        <span className="font-bold text-2xl">TP</span>
                    </div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-white">TextPro Studio</h1>
                    <p className="text-slate-500 dark:text-slate-400 max-w-xl mx-auto leading-relaxed">
                        A powerful, privacy-first text manipulation toolkit built for developers, writers, and anyone who works with text every day.
                    </p>
                    <div className="flex items-center justify-center gap-3 pt-2">
                        <span className="px-3 py-1 text-xs font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-full border border-blue-100 dark:border-blue-800">
                            v1.0.0
                        </span>
                        <span className="px-3 py-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full border border-emerald-100 dark:border-emerald-800">
                            PWA
                        </span>
                    </div>
                </div>

                {/* Highlights */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    {highlights.map((h) => (
                        <div
                            key={h.title}
                            className="p-5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl space-y-2 hover:border-blue-300 dark:hover:border-blue-700 transition-colors"
                        >
                            <div className="text-blue-600 dark:text-blue-400">{h.icon}</div>
                            <h3 className="text-sm font-bold text-slate-800 dark:text-white">{h.title}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">{h.description}</p>
                        </div>
                    ))}
                </div>

                {/* Features Grid */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Included Tools</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {features.map((f) => (
                            <div
                                key={f.name}
                                className="flex items-start gap-4 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl hover:shadow-sm transition-shadow"
                            >
                                <div className="flex-shrink-0 w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400">
                                    {f.icon}
                                </div>
                                <div>
                                    <h3 className="text-sm font-bold text-slate-800 dark:text-white">{f.name}</h3>
                                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{f.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tech Stack */}
                <div className="space-y-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-white">Built With</h2>
                    <div className="flex flex-wrap gap-2">
                        {['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'Lucide Icons', 'Google Gemini'].map((tech) => (
                            <span
                                key={tech}
                                className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg"
                            >
                                {tech}
                            </span>
                        ))}
                    </div>
                </div>

                {/* Links */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4 pb-2">
                    <a
                        href="https://github.com/AuliaAdil/text-pro"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm"
                    >
                        <Github size={16} /> View on GitHub
                    </a>
                    <a
                        href="https://textpro-studio.vercel.app"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 px-5 py-2.5 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors shadow-sm"
                    >
                        <Globe size={16} /> Visit Website
                    </a>
                </div>

                {/* Footer */}
                <div className="text-center text-xs text-slate-400 dark:text-slate-500 pt-4 border-t border-slate-100 dark:border-slate-800">
                    Made with <Heart size={12} className="inline text-red-400 mx-0.5" /> by Aulia Adil &middot; {new Date().getFullYear()}
                </div>
            </div>
        </ToolLayout>
    );
};

export default AboutPage;
