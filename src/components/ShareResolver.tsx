// src/components/ShareResolver.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { resolveShare } from '../services/shareService';
import { ToolType } from '../types';
import TextAnalyzer from './TextAnalyzer';
import TextReformatter from './TextReformatter';
import DiffViewer from './DiffViewer';
import JsonFormatter from './JsonFormatter';
import HtmlFormatter from './HtmlFormatter';
import MarkdownViewer from './MarkdownViewer';
import AiAssistant from './AiAssistant';

interface ShareResolverProps {
  onToolResolved?: (tool: ToolType) => void;
  onError: (message: string) => void;
}

type Resolved = { tool: ToolType; state: Record<string, string> };

const ShareResolver: React.FC<ShareResolverProps> = ({ onToolResolved, onError }) => {
  const { id } = useParams<{ id: string }>();
  const hasRun = useRef(false);
  const [resolved, setResolved] = useState<Resolved | null>(null);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    if (!id) {
      onError('This share link is invalid. The app has loaded normally.');
      return;
    }
    const keyBase64 = window.location.hash.slice(1);
    if (!keyBase64) {
      onError('This share link appears to be broken or incomplete. The app has loaded normally.');
      return;
    }

    resolveShare(id, keyBase64)
      .then(result => {
        if (result.type === 'payload') {
          const tool =
            result.data.tool === ToolType.COUNTER || result.data.tool === ToolType.SPLITTER
              ? ToolType.ANALYZER
              : result.data.tool;
          setResolved({ tool, state: result.data.state });
          onToolResolved?.(tool);
        } else {
          const message =
            result.reason === 'not-found'
              ? 'This share link has expired or does not exist. The app has loaded normally.'
              : result.reason === 'unknown-tool'
              ? "This share link references a tool that doesn't exist. The app has loaded normally."
              : 'This share link appears to be broken or incomplete. The app has loaded normally.';
          onError(message);
        }
      })
      .catch(() => onError('This share link appears to be broken or incomplete. The app has loaded normally.'));
  }, []);

  if (!resolved) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Loading shared content…</span>
        </div>
      </div>
    );
  }

  const { tool, state } = resolved;
  switch (tool) {
    case ToolType.ANALYZER: return <TextAnalyzer key="share" initialState={state} />;
    case ToolType.REFORMATTER: return <TextReformatter key="share" initialState={state} />;
    case ToolType.DIFF: return <DiffViewer key="share" initialState={state} />;
    case ToolType.JSON: return <JsonFormatter key="share" initialState={state} />;
    case ToolType.HTML: return <HtmlFormatter key="share" initialState={state} />;
    case ToolType.MARKDOWN: return <MarkdownViewer key="share" initialState={state} />;
    case ToolType.AI_ASSISTANT: return <AiAssistant key="share" initialState={state} />;
    default: return <TextAnalyzer key="share" />;
  }
};

export default ShareResolver;
