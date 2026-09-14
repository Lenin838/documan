import React from "react";

interface EmptyStateProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className = "",
}: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center justify-center p-8 text-center bg-[#191f31] border border-dashed border-[#1e293b] rounded-[6px] ${className}`}
    >
      {icon && (
        <div className="mb-4 text-slate-500">{icon}</div>
      )}
      <h3 className="text-base font-semibold text-slate-100">
        {title}
      </h3>
      {description && (
        <p className="mt-1 text-xs text-slate-400 max-w-sm">
          {description}
        </p>
      )}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
