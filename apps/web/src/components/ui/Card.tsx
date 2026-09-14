import React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`bg-[#191f31] border border-[#1e293b] rounded overflow-hidden text-slate-100 shadow-sm transition-colors ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardHeader({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`px-6 py-4 border-b border-[#1e293b] bg-[#191f31] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function CardBody({ children, className = "", ...props }: CardProps) {
  return (
    <div className={`p-6 ${className}`} {...props}>
      {children}
    </div>
  );
}

export function CardFooter({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`px-6 py-4 bg-[#191f31] border-t border-[#1e293b] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}
