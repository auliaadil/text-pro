// src/components/ShareResolver.tsx
import React, { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { resolveShare } from '../services/shareService';
import { ToolType } from '../types';

interface ShareResolverProps {
  onResolved: (tool: ToolType, state: Record<string, string>) => void;
  onError: (message: string) => void;
}

const ShareResolver: React.FC<ShareResolverProps> = ({ onResolved, onError }) => {
  const { id } = useParams<{ id: string }>();
  const hasRun = useRef(false);

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
          onResolved(result.data.tool, result.data.state);
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

  return (
    <div className="flex items-center justify-center h-full">
      <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 size={20} className="animate-spin" />
        <span className="text-sm">Loading shared content…</span>
      </div>
    </div>
  );
};

export default ShareResolver;
