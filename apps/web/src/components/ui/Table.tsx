import React from "react";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded border border-[#1e293b] shadow-sm bg-[#191f31]">
      <table
        className={`w-full text-left text-sm text-slate-300 ${className}`}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-[#151b2d] text-xs font-mono uppercase tracking-wider font-semibold text-slate-400 border-b border-[#1e293b]">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-[#1e293b] bg-[#191f31]">
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
      className={`hover:bg-[#1e293b] transition-colors ${
        isClickable
          ? "cursor-pointer focus:outline-none focus-visible:bg-[#23293c] focus-visible:ring-1 focus-visible:ring-sky-400"
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
      className={`px-4 py-2 font-mono font-medium text-slate-300 ${
        sortable
          ? "cursor-pointer select-none hover:text-sky-400 focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400 rounded-[2px]"
          : ""
      } ${className}`}
    >
      <div className="flex items-center gap-1.5">
        {children}
        {sortable && sortDirection && (
          <span
            className="text-sky-400 font-bold"
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
    <td className={`px-4 py-2 whitespace-nowrap text-slate-300 ${className}`}>
      {children}
    </td>
  );
}
