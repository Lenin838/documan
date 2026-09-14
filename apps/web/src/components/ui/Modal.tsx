import React, { useEffect } from "react";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: "sm" | "md" | "lg" | "xl" | "2xl" | "4xl";
}

export function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = "md",
}: ModalProps) {
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && isOpen) {
        onClose();
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: "max-w-sm",
    md: "max-w-md",
    lg: "max-w-lg",
    xl: "max-w-xl",
    "2xl": "max-w-2xl",
    "4xl": "max-w-4xl",
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
        <div
          className="fixed inset-0 bg-[#0c1324]/85 backdrop-blur-xs transition-opacity"
          onClick={onClose}
          aria-hidden="true"
        />
        <div
          className={`relative transform overflow-hidden rounded-[6px] bg-[#191f31] border border-[#1e293b] text-left shadow-2xl transition-all sm:my-8 w-full ${maxWidthClasses[maxWidth]}`}
        >
          {title && (
            <div className="px-6 py-4 border-b border-[#1e293b] flex items-center justify-between">
              <h3
                id="modal-title"
                className="text-lg font-semibold text-slate-50"
              >
                {title}
              </h3>
              <button
                type="button"
                onClick={onClose}
                className="text-slate-400 hover:text-slate-200 p-1 rounded focus:outline-none focus-visible:ring-1 focus-visible:ring-sky-400"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>
          )}
          <div className="px-6 py-5 text-slate-300">
            {children}
          </div>
          {footer && (
            <div className="px-6 py-4 bg-[#151b2d] border-t border-[#1e293b] flex justify-end gap-3">
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
