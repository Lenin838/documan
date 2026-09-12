export interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "error" | "danger" | "info" | "neutral";
  size?: "sm" | "md";
  className?: string;
}

export function Badge({
  children,
  variant = "neutral",
  size = "md",
  className = "",
}: BadgeProps) {
  const normalizedVariant = variant === "danger" ? "error" : variant;

  const variantClasses = {
    success:
      "bg-emerald-950/60 text-emerald-300 border-emerald-800/80",
    warning:
      "bg-amber-950/60 text-amber-300 border-amber-800/80",
    error:
      "bg-red-950/60 text-red-300 border-red-800/80",
    info: "bg-sky-950/60 text-sky-300 border-sky-800/80",
    neutral:
      "bg-slate-800/80 text-slate-300 border-slate-700/80",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs font-semibold",
    md: "px-2.5 py-1 text-xs font-semibold",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border ${variantClasses[normalizedVariant]} ${sizeClasses[size]} ${className}`}
    >
      {children}
    </span>
  );
}
