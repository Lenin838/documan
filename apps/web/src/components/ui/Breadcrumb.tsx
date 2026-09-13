import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex mb-4">
      <ol className="flex flex-wrap items-center gap-1.5 text-xs md:text-sm font-medium text-slate-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center gap-1.5">
              {index > 0 && (
                <span className="text-slate-600 select-none mx-0.5" aria-hidden="true">
                  /
                </span>
              )}
              {isLast || !item.href ? (
                <span className="text-slate-100 font-semibold truncate max-w-[200px] sm:max-w-xs">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-indigo-400 transition-colors focus:outline-none focus-visible:ring-1 focus-visible:ring-indigo-500 rounded px-1 -mx-1"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
