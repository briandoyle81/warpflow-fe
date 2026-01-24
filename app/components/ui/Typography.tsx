"use client";

import React from "react";
import { cn } from "../../utils/cn";

// ============================================
// Heading Component
// ============================================

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  children: React.ReactNode;
  className?: string;
}

const headingSizes = {
  1: "text-3xl",
  2: "text-2xl",
  3: "text-xl",
  4: "text-lg",
  5: "text-base",
  6: "text-sm",
};

export function Heading({
  level = 1,
  children,
  className,
  ...props
}: HeadingProps) {
  const Component = `h${level}` as keyof JSX.IntrinsicElements;

  return (
    <Component
      className={cn(
        "font-rajdhani font-bold uppercase tracking-wider",
        "text-text-primary",
        headingSizes[level],
        className
      )}
      style={{
        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
      }}
      {...props}
    >
      {children}
    </Component>
  );
}

// ============================================
// Label Component (System Labels)
// ============================================

export interface LabelProps extends React.HTMLAttributes<HTMLLabelElement> {
  system?: boolean; // System label style (SYS-01, NAV-02, etc.)
  children: React.ReactNode;
  className?: string;
}

export function Label({
  system = false,
  children,
  className,
  ...props
}: LabelProps) {
  if (system) {
    return (
      <label
        className={cn(
          "system-label",
          "font-jetbrains-mono font-medium uppercase tracking-widest",
          "text-text-secondary",
          "inline-block",
          className
        )}
        style={{
          fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
          fontSize: "12px",
          letterSpacing: "0.1em",
        }}
        {...props}
      >
        {children}
      </label>
    );
  }

  return (
    <label
      className={cn(
        "font-rajdhani font-semibold uppercase tracking-wide",
        "text-text-primary",
        className
      )}
      style={{
        fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
      }}
      {...props}
    >
      {children}
    </label>
  );
}

// ============================================
// Stat Component (Numbers, Stats)
// ============================================

export interface StatProps extends React.HTMLAttributes<HTMLSpanElement> {
  value: string | number;
  unit?: string;
  className?: string;
}

export function Stat({ value, unit, className, ...props }: StatProps) {
  return (
    <span
      className={cn(
        "font-jetbrains-mono font-normal",
        "text-text-primary",
        className
      )}
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
      }}
      {...props}
    >
      {value}
      {unit && <span className="text-text-secondary ml-1">{unit}</span>}
    </span>
  );
}

// ============================================
// Log Component (Tactical Logs)
// ============================================

export interface LogProps extends React.HTMLAttributes<HTMLDivElement> {
  timestamp?: boolean;
  children: React.ReactNode;
  className?: string;
}

export function Log({ timestamp = false, children, className, ...props }: LogProps) {
  const now = timestamp
    ? new Date().toLocaleTimeString("en-US", {
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      })
    : null;

  return (
    <div
      className={cn(
        "font-jetbrains-mono font-normal text-sm",
        "text-text-secondary",
        className
      )}
      style={{
        fontFamily: "var(--font-jetbrains-mono), 'Courier New', monospace",
      }}
      {...props}
    >
      {timestamp && (
        <span className="text-text-muted mr-2">[{now}]</span>
      )}
      {children}
    </div>
  );
}
