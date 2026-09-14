import React from 'react';
import { Badge } from '../ui/Badge';

export type GovernanceBannerMode =
  | 'snapshot'
  | 'drift'
  | 'default'
  | 'info'
  | 'warning'
  | 'error';

export interface GovernanceBannerMetadataItem {
  label: string;
  value: React.ReactNode;
}

export interface GovernanceBannerProps {
  title: string;
  description?: React.ReactNode;
  mode?: GovernanceBannerMode;
  statusBadge?: React.ReactNode;
  metadata?: GovernanceBannerMetadataItem[];
  actions?: React.ReactNode;
  className?: string;
}

const modeContainerClasses: Record<GovernanceBannerMode, string> = {
  snapshot:
    'bg-[var(--color-cert-snapshot-bg,rgba(88,28,135,0.6))] text-purple-100 border border-purple-700/80 border-solid shadow-lg shadow-purple-950/30',
  drift:
    'bg-[var(--color-drift-live-bg,rgba(12,74,110,0.6))] text-sky-100 border border-sky-700/80 border-dashed shadow-lg shadow-sky-950/30',
  default:
    'bg-slate-900 text-slate-100 border border-slate-800 border-solid shadow-md',
  info:
    'bg-sky-950/40 text-sky-100 border border-sky-700/60 border-solid shadow-md',
  warning:
    'bg-amber-950/40 text-amber-100 border border-amber-700/60 border-solid shadow-md',
  error:
    'bg-red-950/40 text-red-100 border border-red-800/60 border-solid shadow-md',
};

export const GovernanceBanner: React.FC<GovernanceBannerProps> = ({
  title,
  description,
  mode = 'default',
  statusBadge,
  metadata,
  actions,
  className = '',
}) => {
  return (
    <section
      className={`p-4 sm:p-5 md:p-6 rounded-xl transition-colors ${modeContainerClasses[mode]} ${className}`}
      aria-label={title}
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Main Header Content */}
        <div className="flex-1 min-w-0 space-y-2">
          {/* Title Row with Mode Indicators & Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            {mode === 'snapshot' && (
              <Badge variant="historical" size="sm" showIndicator={false} className="font-mono font-bold shrink-0">
                T_cert
              </Badge>
            )}
            {mode === 'drift' && (
              <Badge variant="drift" size="sm" showIndicator={false} className="font-mono font-bold shrink-0">
                T_now
              </Badge>
            )}
            <h2 className="text-base sm:text-lg md:text-xl font-bold tracking-tight text-white m-0 break-words">
              {title}
            </h2>
            {statusBadge && <div className="inline-flex items-center shrink-0">{statusBadge}</div>}
          </div>

          {/* Description */}
          {description && (
            <div className="text-xs sm:text-sm text-slate-300 break-words leading-relaxed">
              {description}
            </div>
          )}

          {/* Metadata Grid / List */}
          {metadata && metadata.length > 0 && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 pt-1 text-xs text-slate-300">
              {metadata.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && (
                    <span className="hidden sm:inline text-slate-600" aria-hidden="true">
                      {'\u2022'}
                    </span>
                  )}
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="text-slate-400 font-medium whitespace-nowrap">{item.label}:</span>
                    <span className="font-mono text-slate-200 truncate">{item.value}</span>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>

        {/* Actions Button Group */}
        {actions && (
          <div className="flex flex-wrap items-center gap-2.5 shrink-0 self-start lg:self-center">
            {actions}
          </div>
        )}
      </div>
    </section>
  );
};
