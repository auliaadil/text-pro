// src/components/ShareConfirmDialog.tsx
import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ToolType } from '../types';
import { createShare } from '../services/shareService';
import Toast from './Toast';

interface ShareConfirmDialogProps {
  tool: ToolType;
  state: Record<string, string>;
  onClose: () => void;
}

const ShareConfirmDialog: React.FC<ShareConfirmDialogProps> = ({ tool, state, onClose }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [showCopied, setShowCopied] = useState(false);
  const cancelButtonRef = useRef<HTMLButtonElement>(null);
  const copiedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    cancelButtonRef.current?.focus();
  }, []);

  useEffect(() => {
    return () => {
      if (copiedTimerRef.current) clearTimeout(copiedTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isLoading) onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose, isLoading]);

  const handleCreate = async () => {
    setIsLoading(true);
    setError(null);
    setShareUrl(null);
    try {
      const url = await createShare(tool, state);
      let copied = false;
      try {
        await navigator.clipboard.writeText(url);
        copied = true;
      } catch {
        try {
          const el = document.createElement('textarea');
          el.value = url;
          document.body.appendChild(el);
          el.select();
          copied = document.execCommand('copy');
          document.body.removeChild(el);
        } catch { /* both methods failed */ }
      }
      if (copied) {
        setShowCopied(true);
        copiedTimerRef.current = setTimeout(() => {
          setShowCopied(false);
          onClose();
        }, 1500);
      } else {
        setShareUrl(url);
      }
    } catch {
      setError('Failed to create share link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        onClick={() => { if (!isLoading) onClose(); }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="share-confirm-title"
          className="relative bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-in fade-in zoom-in-95 duration-200"
          onClick={e => e.stopPropagation()}
        >
          <button
            aria-label="Close"
            onClick={onClose}
            disabled={isLoading}
            className="absolute top-4 right-4 p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X size={16} />
          </button>

          <h2 id="share-confirm-title" className="text-base font-bold text-slate-900 dark:text-white mb-2">
            Share this content
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-4">
            Anyone with the link can view this content for{' '}
            <strong className="text-slate-700 dark:text-slate-200">7 days</strong>.
            Each time you share, a new unique link is created.
          </p>

          {error && (
            <p className="text-sm text-red-500 dark:text-red-400 mb-4">{error}</p>
          )}

          {shareUrl && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 dark:text-slate-400 mb-1">Copy this link manually:</p>
              <textarea
                readOnly
                value={shareUrl}
                rows={3}
                className="w-full text-xs font-mono bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg p-2 text-slate-700 dark:text-slate-300 resize-none"
                onClick={e => (e.target as HTMLTextAreaElement).select()}
              />
            </div>
          )}

          <div className="flex gap-3 justify-end">
            <button
              ref={cancelButtonRef}
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={isLoading}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-60 rounded-lg transition-colors flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Creating…
                </>
              ) : 'Create Link'}
            </button>
          </div>
        </div>
      </div>

      <Toast
        message="Link copied!"
        isVisible={showCopied}
        onClose={() => setShowCopied(false)}
      />
    </>
  );
};

export default ShareConfirmDialog;
