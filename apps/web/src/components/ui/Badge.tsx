import React from "react";

export type BadgeVariant =
  | "success"
  | "warning"
  | "error"
  | "danger"
  | "info"
  | "neutral"
  | "historical"
  | "certificate"
  | "snapshot"
  | "drift"
  | "live";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  children: React.ReactNode;
  variant?: BadgeVariant;
  size?: "sm" | "md";
  className?: string;
  icon?: React.ReactNode;
  showIndicator?: boolean;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
  icon,
  showIndicator = true,
  ...props
}: BadgeProps) {
  // Normalize variant aliases
  let normalizedVariant = variant;
  if (variant === "danger") normalizedVariant = "error";
  if (variant === "certificate" || variant === "snapshot") normalizedVariant = "historical";
  if (variant === "live") normalizedVariant = "drift";

  const variantClasses: Record<string, string> = {
    success: "bg-emerald-950/70 text-emerald-300 border-emerald-800/80",
    warning: "bg-amber-950/70 text-amber-300 border-amber-800/80",
    error: "bg-red-950/70 text-red-300 border-red-800/80",
    info: "bg-sky-950/70 text-sky-300 border-sky-800/80",
    neutral: "bg-slate-800/80 text-slate-300 border-slate-700/80",
    historical:
      "bg-[var(--color-cert-snapshot-bg,rgba(88,28,135,0.6))] text-[var(--color-cert-snapshot-text,#c084fc)] border-[var(--color-cert-snapshot-border,rgba(126,34,206,0.8))] shadow-sm shadow-purple-950/50",
    drift:
      "bg-[var(--color-drift-live-bg,rgba(12,74,110,0.6))] text-[var(--color-drift-live-text,#38bdf8)] border-[var(--color-drift-live-border,rgba(3,105,161,0.8))] shadow-sm shadow-sky-950/50",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold gap-1",
    md: "px-2.5 py-1 text-xs font-semibold gap-1.5",
  };

  // Render non-color state indicator glyph if requested
  const renderIndicator = () => {
    if (icon) return icon;
    if (!showIndicator) return null;

    if (normalizedVariant === "historical") {
      return (
        <span
          className="inline-flex items-center justify-center px-1 rounded text-[10px] font-mono leading-none bg-purple-950/90 text-purple-200 border border-purple-600/60"
          aria-label="Frozen Historical Certificate Snapshot"
          title="T_cert: Frozen Historical Certificate Snapshot"
        >
          T_cert
        </span>
      );
    }

    if (normalizedVariant === "drift") {
      return (
        <span
          className="inline-flex items-center justify-center px-1 rounded text-[10px] font-mono leading-none bg-sky-950/90 text-sky-200 border border-sky-600/60"
          aria-label="Live System Compliance Drift"
          title="T_now: Live System Compliance Drift Evaluation"
        >
          T_now
        </span>
      );
    }

    return null;
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border transition-colors ${
        variantClasses[normalizedVariant] || variantClasses.neutral
      } ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {renderIndicator()}
      <span>{children}</span>
    </span>
  );
}
