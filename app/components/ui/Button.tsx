"use client";

import React from "react";
import { cn } from "../../utils/cn";

export type ButtonState = "idle" | "armed" | "active" | "disabled" | "cooling-down";

export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  state?: ButtonState;
  size?: ButtonSize;
  variant?: "default" | "energy" | "navigation" | "targeting" | "danger";
  children: React.ReactNode;
  className?: string;
  showPulse?: boolean; // For armed/active states
}

const sizeClasses = {
  sm: "h-8 px-3 text-sm",
  md: "h-10 px-4 text-base",
  lg: "h-12 px-6 text-lg",
};

// State styles using inline styles for color tokens
const getStateStyles = (state: ButtonState) => {
  switch (state) {
    case "idle":
      return {
        backgroundColor: "var(--color-steel)",
        borderColor: "var(--color-gunmetal)",
        color: "var(--color-text-primary)",
      };
    case "armed":
      return {
        backgroundColor: "var(--color-steel)",
        borderColor: "var(--color-amber)",
        color: "var(--color-amber)",
      };
    case "active":
      return {
        backgroundColor: "var(--color-steel)",
        borderColor: "var(--color-phosphor-green)",
        color: "var(--color-phosphor-green)",
      };
    case "disabled":
      return {
        backgroundColor: "var(--color-slate)",
        borderColor: "var(--color-gunmetal)",
        color: "var(--color-text-muted)",
        cursor: "not-allowed",
      };
    case "cooling-down":
      return {
        backgroundColor: "var(--color-steel)",
        borderColor: "var(--color-amber)",
        color: "var(--color-amber)",
      };
  }
};

const getVariantStyles = (variant: string, state: ButtonState) => {
  if (variant === "default" || state === "idle" || state === "disabled") {
    return {};
  }

  switch (variant) {
    case "energy":
      return {
        borderColor: "var(--color-amber)",
        color: "var(--color-amber)",
      };
    case "navigation":
      return {
        borderColor: "var(--color-cyan)",
        color: "var(--color-cyan)",
      };
    case "targeting":
      return {
        borderColor: "var(--color-phosphor-green)",
        color: "var(--color-phosphor-green)",
      };
    case "danger":
      return {
        borderColor: "var(--color-warning-red)",
        color: "var(--color-warning-red)",
      };
    default:
      return {};
  }
};

export function Button({
  state = "idle",
  size = "md",
  variant = "default",
  children,
  className,
  showPulse = false,
  disabled,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || state === "disabled";
  const effectiveState = isDisabled ? "disabled" : state;

  // Get base state styles
  const baseStyles = getStateStyles(effectiveState);
  const variantStyles =
    variant !== "default" && (state === "armed" || state === "active")
      ? getVariantStyles(variant, state)
      : {};

  // Combine styles
  const buttonStyles = {
    ...baseStyles,
    ...variantStyles,
    borderRadius: 0, // Square corners
    fontFamily: "var(--font-rajdhani), 'Arial Black', sans-serif",
    borderWidth: "2px",
    borderStyle: "solid",
  };

  // Add pulse animation for armed/active states when requested
  const pulseClass =
    showPulse && (state === "armed" || state === "active")
      ? state === "armed"
        ? "pulse-weapon-primed"
        : "pulse-target-lock"
      : "";

  // Add glow for active targeting state
  const glowClass =
    state === "active" && (variant === "targeting" || variant === "default")
      ? "glow-targeting"
      : "";

  return (
    <button
      type="button"
      disabled={isDisabled}
      className={cn(
        // Base styles
        "font-semibold uppercase tracking-wider",
        "transition-colors duration-150",
        "focus:outline-none",
        // Size
        sizeClasses[size],
        // Pulse animation
        pulseClass,
        // Glow effect
        glowClass,
        // Custom classes
        className
      )}
      style={buttonStyles}
      {...props}
    >
      {children}
    </button>
  );
}
