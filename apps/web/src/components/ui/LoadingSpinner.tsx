
interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  label?: string;
  className?: string;
}

export function LoadingSpinner({
  size = "md",
  label = "Loading...",
  className = "",
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "w-4 h-4 border-2",
    md: "w-8 h-8 border-3",
    lg: "w-12 h-12 border-4",
  };

  return (
    <div
      role="status"
      className={`flex flex-col items-center justify-center gap-3 ${className}`}
    >
      <div
        className={`${sizeClasses[size]} border-indigo-600 border-t-transparent rounded-full animate-spin`}
        aria-hidden="true"
      />
      {label && (
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">
          {label}
        </p>
      )}
      <span className="sr-only">{label}</span>
    </div>
  );
}
