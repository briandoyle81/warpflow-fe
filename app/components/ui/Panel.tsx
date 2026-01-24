"use client";

import React from "react";
import { cn } from "../../utils/cn";

export type PanelVariant = "default" | "command" | "status" | "tactical";

export interface PanelProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: PanelVariant;
  elevated?: boolean;
  systemLabel?: string; // e.g., "SYS-01", "NAV-02", "WPN-03"
  showNotches?: boolean; // Corner notches for military hardware look
  showFilmGrain?: boolean; // Film grain overlay
  showScanline?: boolean; // CRT scanline overlay
  children: React.ReactNode;
  className?: string;
}

const getVariantBg = (variant: PanelVariant, elevated: boolean) => {
  if (elevated) return "var(--color-steel)";
  
  switch (variant) {
    case "default":
      return "var(--color-slate)";
    case "command":
      return "var(--color-steel)";
    case "status":
      return "var(--color-slate)";
    case "tactical":
      return "var(--color-near-black)";
  }
};

export function Panel({
  variant = "default",
  elevated = false,
  systemLabel,
  showNotches = false,
  showFilmGrain = false,
  showScanline = false,
  children,
  className,
  ...props
}: PanelProps) {
  const bgColor = getVariantBg(variant, elevated);

  return (
    <div
      className={cn(
        // Base panel styles
        "border border-solid",
        // Overlays
        showScanline && "scanline-overlay",
        showFilmGrain && "film-grain",
        // Custom classes
        className
      )}
      style={{
        backgroundColor: bgColor,
        borderColor: "var(--color-gunmetal)",
        borderTopColor: "var(--color-steel)",
        borderLeftColor: "var(--color-steel)",
        borderRadius: 0, // Square corners
        clipPath: showNotches
          ? "polygon(4px 0%, 100% 0%, 100% calc(100% - 4px), calc(100% - 4px) 100%, 0% 100%, 0% 4px)"
          : undefined,
        position: "relative",
      }}
      {...props}
    >
      {/* System Label */}
      {systemLabel && (
        <div
          className="system-label absolute top-0 left-0 px-2"
          style={{
            transform: "translateY(-50%) translateX(8px)",
            backgroundColor: "var(--color-near-black)",
          }}
        >
          {systemLabel}
        </div>
      )}

      {/* Content */}
      <div className="relative z-0">{children}</div>
    </div>
  );
}
