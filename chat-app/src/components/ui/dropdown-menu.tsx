"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

// --- DropdownMenu ---
interface DropdownMenuProps {
  children: React.ReactNode;
}

export const DropdownMenu: React.FC<DropdownMenuProps> = ({ children }) => {
  return <div className="relative inline-block text-left">{children}</div>;
};

// --- DropdownMenuTrigger ---
interface DropdownMenuTriggerProps {
  children: React.ReactElement<any>;
  asChild?: boolean;
  open?: boolean;
  setOpen?: (val: boolean) => void;
}

export const DropdownMenuTrigger = React.forwardRef<HTMLDivElement, DropdownMenuTriggerProps>(
  ({ children, asChild = false, open, setOpen }, ref) => {
    const handleClick = () => setOpen && setOpen(!open);

    if (asChild) {
      return React.cloneElement(children, { onClick: handleClick });
    }

    return (
      <div ref={ref} className="cursor-pointer" onClick={handleClick}>
        {children}
      </div>
    );
  }
);
DropdownMenuTrigger.displayName = "DropdownMenuTrigger";

// --- DropdownMenuContent ---
interface DropdownMenuContentProps {
  children: React.ReactNode;
  className?: string;
  align?: "start" | "center" | "end";
  setOpen?: (val: boolean) => void;
}

export const DropdownMenuContent: React.FC<DropdownMenuContentProps> = ({
  children,
  className,
  align = "start",
  setOpen,
}) => {
  let alignmentClass = "";
  if (align === "start") alignmentClass = "left-0";
  if (align === "center") alignmentClass = "left-1/2 -translate-x-1/2";
  if (align === "end") alignmentClass = "right-0";

  return (
    <div
      className={cn(
        `absolute mt-2 w-36 bg-white dark:bg-gray-800 border rounded shadow-md z-50 ${alignmentClass}`,
        className
      )}
      onClick={() => setOpen && setOpen(false)} // zatvori meni kad klikneš stavku
    >
      {children}
    </div>
  );
};

// --- DropdownMenuItem ---
interface DropdownMenuItemProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
}

export const DropdownMenuItem: React.FC<DropdownMenuItemProps> = ({ children, onClick, className }) => {
  return (
    <div
      onClick={onClick}
      className={`px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer ${className || ""}`}
    >
      {children}
    </div>
  );
};
