/**
 * Core type definitions for Svelte 5 UI Error Resolution
 */

// ============================================================================
// Error Types
// ============================================================================

export interface RawError {
  file: string;
  line: number;
  column: number;
  message: string;
  code: string;
  severity: 'error' | 'warning';
}

export type ErrorCategory = 'transition' | 'runes' | 'typeMismatch' | 'imports';
export type ErrorPriority = 'high' | 'medium' | 'low';

export interface CategorizedError extends RawError {
  id: string;
  category: ErrorCategory;
  priority: ErrorPriority;
  pattern?: string;
}

export interface CategorizedErrors {
  transition: CategorizedError[];
  runes: CategorizedError[];
  typeMismatch: CategorizedError[];
  imports: CategorizedError[];
}

export interface PrioritizedErrors {
  high: CategorizedError[];
  medium: CategorizedError[];
  low: CategorizedError[];
}

// ============================================================================
// Fix Types
// ============================================================================

export interface Fix {
  id: string;
  errorId: string;
  file: string;
  type: ErrorCategory;
  before: string;
  after: string;
  applied: boolean;
  validated: boolean;
  rolledBack: boolean;
  timestamp: Date;
}

export interface FixResult {
  success: boolean;
  file: string;
  errorsBefore: number;
  errorsAfter: number;
  changes: string[];
  fix?: Fix;
}

export interface PatchFile {
  path: string;
  changes: Change[];
  before: string;
  after: string;
}

export interface Change {
  type: 'add' | 'remove' | 'modify';
  line: number;
  content: string;
}

// ============================================================================
// Validation Types
// ============================================================================

export interface ValidationResult {
  passed: boolean;
  errorCount: number;
  errors: RawError[];
  newErrors: RawError[];
  resolvedErrors: RawError[];
}

// ============================================================================
// Progress Tracking Types
// ============================================================================

export interface ProgressMetrics {
  totalErrors: number;
  errorsResolved: number;
  errorsFailed: number;
  successRate: number;
  startTime: Date;
  currentTime: Date;
  estimatedCompletion?: Date;
}

export interface ProgressReport {
  metrics: ProgressMetrics;
  fixesByCategory: Record<ErrorCategory, number>;
  fixesByPriority: Record<ErrorPriority, number>;
  failedFixes: Fix[];
}

// ============================================================================
// Configuration Types
// ============================================================================

export interface ErrorResolutionConfig {
  // Error patterns
  transitionPatterns: RegExp[];
  runesPatterns: RegExp[];
  typeMismatchPatterns: RegExp[];
  importPatterns: RegExp[];

  // Priority thresholds
  highPriorityKeywords: string[];
  mediumPriorityKeywords: string[];

  // Validation settings
  runTypeScriptValidation: boolean;
  runSvelteCheck: boolean;
  maxErrorIncrease: number;

  // Rollback settings
  enableAutoRollback: boolean;
  preserveGitHistory: boolean;

  // Performance settings
  maxConcurrentFixes: number;
  validationTimeout: number;
}

// ============================================================================
// Service Interfaces
// ============================================================================

export interface ErrorScanner {
  scanErrors(): Promise<CategorizedErrors>;
  categorizeError(error: RawError): ErrorCategory;
  prioritizeErrors(errors: CategorizedErrors): PrioritizedErrors;
}

export interface FixApplier {
  applyTransitionFix(file: string, error: CategorizedError): Promise<FixResult>;
  applyRunesFix(file: string, error: CategorizedError): Promise<FixResult>;
  applyTypeFix(file: string, error: CategorizedError): Promise<FixResult>;
  applyImportFix(file: string, error: CategorizedError): Promise<FixResult>;
}

export interface ValidationService {
  validateTypeScript(file: string): Promise<ValidationResult>;
  validateSvelte(file: string): Promise<ValidationResult>;
  compareErrorCounts(before: number, after: number): boolean;
}

export interface RollbackService {
  saveBackup(file: string): Promise<void>;
  rollback(file: string): Promise<void>;
  logFailure(file: string, reason: string): Promise<void>;
}

export interface ProgressTracker {
  trackFix(fix: Fix): void;
  getMetrics(): ProgressMetrics;
  getReport(): ProgressReport;
}
