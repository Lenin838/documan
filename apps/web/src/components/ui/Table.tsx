import React from "react";

export function Table({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className="w-full overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
      <table
        className={`w-full text-left text-sm text-gray-600 dark:text-gray-300 ${className}`}
      >
        {children}
      </table>
    </div>
  );
}

export function TableHeader({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-gray-50 dark:bg-gray-800/80 text-xs uppercase font-semibold text-gray-700 dark:text-gray-300 border-b border-gray-200 dark:border-gray-700">
      {children}
    </thead>
  );
}

export function TableBody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
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
  return (
    <tr
      onClick={onClick}
      className={`hover:bg-gray-50/80 dark:hover:bg-gray-700/50 transition-colors ${
        onClick ? "cursor-pointer" : ""
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
      className={`px-4 py-3.5 font-semibold ${
        sortable ? "cursor-pointer select-none hover:text-indigo-600 dark:hover:text-indigo-400" : ""
      } ${className}`}
    >
      <div className="flex items-center gap-1">
        {children}
        {sortable && sortDirection && (
          <span className="text-indigo-600 dark:text-indigo-400">
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
  return <td className={`px-4 py-3.5 whitespace-nowrap ${className}`}>{children}</td>;
}
