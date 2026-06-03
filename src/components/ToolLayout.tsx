import React, { ReactNode, useState } from 'react';
import { Share2 } from 'lucide-react';
import { ToolType } from '../types';
import { buildShareUrl } from '../services/shareService';
import Toast from './Toast';
import ShareErrorDialog from './ShareErrorDialog';

interface ToolLayoutProps {
  children: ReactNode;
  actions?: ReactNode;
  description?: string;
  shareToolType?: ToolType;
  shareState?: Record<string, string>;
}

const ToolLayout: React.FC<ToolLayoutProps> = ({
  children,
  actions,
  description,
  shareToolType,
  shareState,
}) => {
  const [showCopiedToast, setShowCopiedToast] = useState(false);
  const [showTooLargeDialog, setShowTooLargeDialog] = useState(false);
  const [shareFallbackUrl, setShareFallbackUrl] = useState<string | null>(null);

  const handleShare = async () => {
    if (!shareToolType || !shareState) return;

    const url = buildShareUrl(shareToolType, shareState);

    if (url.length > 8000) {
      setShowTooLargeDialog(true);
      return;
    }

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
      } catch {
        // both methods failed
      }
    }

    if (copied) {
      setShowCopiedToast(true);
    } else {
      setShareFallbackUrl(url);
    }
  };

  const canShare = shareToolType !== undefined && shareState !== undefined;

  return (
    <>
      <div className="flex flex-col h-full animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 shrink-0">
          {description && (
            <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>
          )}
          <div className="flex items-center gap-2">
            {actions}
            {canShare && (
              <button
                onClick={handleShare}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
              >
                <Share2 size={16} /> Share
              </button>
            )}
          </div>
        </div>
        <div className="flex-1 min-h-0 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors flex flex-col">
          {children}
        </div>
      </div>

      <Toast
        message="Link copied!"
        isVisible={showCopiedToast}
        onClose={() => setShowCopiedToast(false)}
      />

      {showTooLargeDialog && (
        <ShareErrorDialog
          message="Your content is too large to share via URL. Try reducing the input size."
          onClose={() => setShowTooLargeDialog(false)}
        />
      )}

      {shareFallbackUrl && (
        <ShareErrorDialog
          message={`Could not copy automatically. Copy this link manually:\n\n${shareFallbackUrl}`}
          onClose={() => setShareFallbackUrl(null)}
        />
      )}
    </>
  );
};

export default ToolLayout;
