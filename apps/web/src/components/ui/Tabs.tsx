import React from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  return (
    <div className={`border-b border-gray-200 dark:border-gray-700 ${className}`}>
      <nav
        className="-mb-px flex space-x-6 overflow-x-auto"
        aria-label="Tabs"
        role="tablist"
      >
        {tabs.map((tab) => {
          const isActive = tab.id === activeTab;
          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              onClick={() => onChange(tab.id)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-colors flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ${
                isActive
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-500 dark:text-indigo-400"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300"
              }`}
            >
              {tab.icon}
              {tab.label}
              {tab.count !== undefined && (
                <span
                  className={`ml-1.5 py-0.5 px-2 text-xs rounded-full font-semibold ${
                    isActive
                      ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/50 dark:text-indigo-300"
                      : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                  }`}
                >
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
