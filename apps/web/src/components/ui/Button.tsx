import type { ButtonHTMLAttributes } from "react";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "danger" | "success" | "warning" | "ghost";
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
    "inline-flex items-center justify-center font-medium rounded-lg transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm";

  const variantClasses = {
    primary:
      "bg-indigo-600 hover:bg-indigo-500 text-white border border-indigo-500/50 shadow-indigo-900/20",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80",
    outline:
      "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    danger:
      "bg-red-600 hover:bg-red-500 text-white border border-red-500/50 shadow-red-900/20",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white border border-emerald-500/50 shadow-emerald-900/20",
    warning:
      "bg-amber-600 hover:bg-amber-500 text-white border border-amber-500/50 shadow-amber-900/20",
    ghost:
      "text-slate-400 hover:bg-slate-800 hover:text-slate-200 shadow-none",
  };

  const sizeClasses = {
    sm: "px-2.5 py-1 text-xs",
    md: "px-4 py-2 text-sm",
    lg: "px-5 py-2.5 text-base",
  };

  return (
    <button
      type={type}
      disabled={disabled || isLoading}
      className={`${baseClasses} ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}
      {...props}
    >
      {isLoading && (
        <svg
          className="animate-spin -ml-1 mr-2 h-4 w-4 text-current"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
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
