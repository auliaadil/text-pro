import React, { ReactNode, useState } from 'react';
import { Share2 } from 'lucide-react';
import { ToolType } from '../types';
import ShareConfirmDialog from './ShareConfirmDialog';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

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
                onClick={() => setShowConfirmDialog(true)}
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

      {showConfirmDialog && canShare && (
        <ShareConfirmDialog
          tool={shareToolType!}
          state={shareState!}
          onClose={() => setShowConfirmDialog(false)}
        />
      )}
    </>
  );
};

export default ToolLayout;
