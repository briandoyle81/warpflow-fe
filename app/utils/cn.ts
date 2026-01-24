import { type ClassValue, clsx } from "clsx";

/**
 * Utility function to merge CSS classes
 * Uses clsx for conditional class names
 */
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}
