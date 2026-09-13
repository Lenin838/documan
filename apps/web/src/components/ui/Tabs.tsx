import React, { useRef } from "react";

export interface TabItem {
  id: string;
  label: string;
  count?: number;
  icon?: React.ReactNode;
  disabled?: boolean;
}

export interface TabsProps {
  tabs: TabItem[];
  activeTab: string;
  onChange: (id: string) => void;
  className?: string;
}

export function Tabs({ tabs, activeTab, onChange, className = "" }: TabsProps) {
  const tabListRef = useRef<HTMLDivElement>(null);

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    const enabledTabs = tabs.filter((t) => !t.disabled);
    if (enabledTabs.length === 0) return;

    let targetIndex = -1;
    if (e.key === "ArrowRight") {
      e.preventDefault();
      // find next enabled tab
      for (let i = index + 1; i < tabs.length; i++) {
        if (!tabs[i].disabled) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
        // wrap around to first enabled tab
        targetIndex = tabs.findIndex((t) => !t.disabled);
      }
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      // find prev enabled tab
      for (let i = index - 1; i >= 0; i--) {
        if (!tabs[i].disabled) {
          targetIndex = i;
          break;
        }
      }
      if (targetIndex === -1) {
        // wrap around to last enabled tab
        for (let i = tabs.length - 1; i >= 0; i--) {
          if (!tabs[i].disabled) {
            targetIndex = i;
            break;
          }
        }
      }
    } else if (e.key === "Home") {
      e.preventDefault();
      targetIndex = tabs.findIndex((t) => !t.disabled);
    } else if (e.key === "End") {
      e.preventDefault();
      for (let i = tabs.length - 1; i >= 0; i--) {
        if (!tabs[i].disabled) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex !== -1) {
      const targetTab = tabs[targetIndex];
      onChange(targetTab.id);
      const buttonEl = tabListRef.current?.querySelector<HTMLButtonElement>(
        `#tab-${targetTab.id}`
      );
      buttonEl?.focus();
    }
  };

  return (
    <div
      ref={tabListRef}
      className={`border-b border-slate-200 dark:border-slate-800 ${className}`}
    >
      <nav
        className="-mb-px flex space-x-4 md:space-x-6 overflow-x-auto scrollbar-none"
        aria-label="Tabs"
        role="tablist"
      >
        {tabs.map((tab, index) => {
          const isActive = tab.id === activeTab;
          const isDisabled = Boolean(tab.disabled);

          return (
            <button
              key={tab.id}
              role="tab"
              aria-selected={isActive}
              aria-disabled={isDisabled || undefined}
              aria-controls={`panel-${tab.id}`}
              id={`tab-${tab.id}`}
              disabled={isDisabled}
              onClick={() => !isDisabled && onChange(tab.id)}
              onKeyDown={(e) => !isDisabled && handleKeyDown(e, index)}
              tabIndex={isActive ? 0 : -1}
              className={`whitespace-nowrap py-3 px-2 border-b-2 text-sm transition-all flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 dark:focus-visible:ring-offset-slate-950 rounded-t-md ${
                isDisabled
                  ? "border-transparent text-slate-400 dark:text-slate-600 opacity-50 cursor-not-allowed"
                  : isActive
                  ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-300 font-semibold bg-indigo-50/50 dark:bg-indigo-950/30"
                  : "border-transparent text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:border-slate-300 dark:hover:border-slate-700 font-medium"
              }`}
            >
              {tab.icon}
              <span>{tab.label}</span>
              {isActive && (
                <span
                  className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400"
                  aria-hidden="true"
                />
              )}
              {tab.count !== undefined && (
                <span
                  className={`ml-1 py-0.5 px-2 text-xs rounded-full font-semibold ${
                    isActive
                      ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-200"
                      : "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400"
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
