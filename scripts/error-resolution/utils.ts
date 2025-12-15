/**
 * Utility functions for error resolution
 */

import { randomUUID } from 'crypto';
import type { RawError, CategorizedError, ErrorCategory, ErrorPriority } from './types.js';

/**
 * Generate unique ID
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * Convert RawError to CategorizedError
 */
export function toCategorizedError(
  raw: RawError,
  category: ErrorCategory,
  priority: ErrorPriority,
  pattern?: string
): CategorizedError {
  return {
    ...raw,
    id: generateId(),
    category,
    priority,
    pattern,
  };
}

/**
 * Extract file name from path
 */
export function getFileName(filePath: string): string {
  return filePath.split(/[/\\]/).pop() || filePath;
}

/**
 * Check if error message matches pattern
 */
export function matchesPattern(message: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(message));
}

/**
 * Calculate success rate
 */
export function calculateSuccessRate(resolved: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((resolved / total) * 100);
}

/**
 * Estimate completion time
 */
export function estimateCompletion(
  startTime: Date,
  completed: number,
  total: number
): Date | undefined {
  if (completed === 0 || completed >= total) return undefined;

  const elapsed = Date.now() - startTime.getTime();
  const avgTimePerItem = elapsed / completed;
  const remaining = total - completed;
  const estimatedMs = remaining * avgTimePerItem;

  return new Date(Date.now() + estimatedMs);
}

/**
 * Format duration in human-readable format
 */
export function formatDuration(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Group errors by file
 */
export function groupByFile(errors: CategorizedError[]): Map<string, CategorizedError[]> {
  const grouped = new Map<string, CategorizedError[]>();

  for (const error of errors) {
    const existing = grouped.get(error.file) || [];
    existing.push(error);
    grouped.set(error.file, existing);
  }

  return grouped;
}

/**
 * Sort errors by priority (high -> medium -> low)
 */
export function sortByPriority(errors: CategorizedError[]): CategorizedError[] {
  const priorityOrder: Record<ErrorPriority, number> = {
    high: 0,
    medium: 1,
    low: 2,
  };

  return [...errors].sort((a, b) => {
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
}

/**
 * Deduplicate errors by file + line + message
 */
export function deduplicateErrors(errors: RawError[]): RawError[] {
  const seen = new Set<string>();
  const unique: RawError[] = [];

  for (const error of errors) {
    const key = `${error.file}:${error.line}:${error.message}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(error);
    }
  }

  return unique;
}

/**
 * Check if string is empty or whitespace
 */
export function isEmpty(str: string | null | undefined): boolean {
  return !str || str.trim() === '';
}

/**
 * Truncate string to max length
 */
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.substring(0, maxLength - 3) + '...';
}
