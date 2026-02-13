
import React, { ReactNode } from 'react';

interface ToolLayoutProps {
  children: ReactNode;
  actions?: ReactNode;
  description?: string;
}

const ToolLayout: React.FC<ToolLayoutProps> = ({ children, actions, description }) => {
  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        {description && (
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-2xl">{description}</p>
        )}
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>
      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
        {children}
      </div>
    </div>
  );
};

export default ToolLayout;
