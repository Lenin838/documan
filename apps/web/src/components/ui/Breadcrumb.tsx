import { Link } from "react-router-dom";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex mb-4">
      <ol className="inline-flex items-center space-x-1 md:space-x-3 text-sm font-medium text-gray-500 dark:text-gray-400">
        {items.map((item, index) => {
          const isLast = index === items.length - 1;
          return (
            <li key={index} className="inline-flex items-center">
              {index > 0 && (
                <span className="mx-2 text-gray-400 dark:text-gray-600">/</span>
              )}
              {isLast || !item.href ? (
                <span className="text-gray-900 dark:text-white font-semibold">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.href}
                  className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
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
