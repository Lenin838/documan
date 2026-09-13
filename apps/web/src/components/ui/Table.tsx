import React from "react";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm bg-white dark:bg-slate-900/90">
      <table
        className={`w-full text-left text-sm text-slate-700 dark:text-slate-300 ${className}`}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 dark:bg-slate-800/80 text-xs uppercase tracking-wider font-semibold text-slate-700 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900/50">
      {children}
    </tbody>
  );
}

export function TableRow({
  children,
  className = "",
  onClick,
}: {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const isClickable = Boolean(onClick);

  return (
    <tr
      onClick={onClick}
      tabIndex={isClickable ? 0 : undefined}
      onKeyDown={
        isClickable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
      className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/60 transition-colors ${
        isClickable
          ? "cursor-pointer focus:outline-none focus-visible:bg-slate-100 dark:focus-visible:bg-slate-800/90 focus-visible:ring-2 focus-visible:ring-indigo-500"
          : ""
      } ${className}`}
    >
      {children}
    </tr>
  );
}

export function TableHead({
  children,
  className = "",
  sortable,
  sortDirection,
  onSort,
}: {
  children?: React.ReactNode;
  className?: string;
  sortable?: boolean;
  sortDirection?: "asc" | "desc" | null;
  onSort?: () => void;
}) {
  return (
    <th
      scope="col"
      onClick={sortable ? onSort : undefined}
      tabIndex={sortable ? 0 : undefined}
      onKeyDown={
        sortable
          ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSort?.();
              }
            }
          : undefined
      }
      aria-sort={
        sortable && sortDirection
          ? sortDirection === "asc"
            ? "ascending"
            : "descending"
          : undefined
      }
      className={`px-4 py-3.5 font-semibold text-slate-700 dark:text-slate-300 ${
        sortable
          ? "cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 rounded"
          : ""
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {sortable && sortDirection && (
          <span
            className="text-indigo-600 dark:text-indigo-400 font-bold"
            aria-hidden="true"
          >
            {sortDirection === "asc" ? "↑" : "↓"}
          </span>
        )}
      </div>
    </th>
  );
}

export function TableCell({
  children,
  className = "",
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={`px-4 py-3.5 whitespace-nowrap text-slate-700 dark:text-slate-300 ${className}`}>
      {children}
    </td>
  );
}
