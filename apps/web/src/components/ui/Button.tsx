import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "success"
    | "warning"
    | "ghost";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  disabled,
  className = "",
  type = "button",
  ...props
}: ButtonProps) {
  const baseClasses =
    "inline-flex items-center justify-center font-medium font-sans rounded transition-all duration-150 active:scale-[0.98] focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c1324] disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none disabled:transform-none shadow-sm";

  const variantClasses = {
    primary:
      "bg-sky-400 hover:bg-sky-300 active:bg-sky-500 text-slate-950 font-semibold border border-sky-300/50 shadow-sm",
    secondary:
      "bg-[#191f31] hover:bg-[#23293c] active:bg-slate-800 text-slate-200 border border-[#1e293b] hover:border-slate-700",
    outline:
      "border border-[#1e293b] bg-[#191f31]/80 text-slate-200 hover:bg-[#23293c] hover:text-white hover:border-slate-700",
    danger:
      "bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white border border-rose-500/50 shadow-sm",
    success:
      "bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white border border-emerald-500/50 shadow-sm",
    warning:
      "bg-amber-600 hover:bg-amber-500 active:bg-amber-700 text-white border border-amber-500/50 shadow-sm",
    ghost:
      "text-slate-400 hover:bg-[#191f31] hover:text-slate-200 border border-transparent shadow-none",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs gap-1.5 min-h-[30px]",
    md: "px-4 py-2 text-sm gap-2 min-h-[38px]",
    lg: "px-5 py-2.5 text-base gap-2.5 min-h-[44px]",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      aria-busy={isLoading || undefined}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-0.5 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          aria-hidden="true"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          />
        </svg>
      )}
      {children}
    </button>
  );
}
