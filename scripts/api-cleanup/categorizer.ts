import path from 'path';
import { ScannedFile } from './scanner';

export type RouteCategory = 'core' | 'experimental' | 'test' | 'phase-specific' | 'unknown';
export type RoutePriority = 'critical' | 'high' | 'medium' | 'low';

export interface CategorizedFile extends ScannedFile {
  category: RouteCategory;
  priority: RoutePriority;
  isBackup: boolean;
  backupPath?: string;
  reason: string;
}

export interface CategorizationManifest {
  timestamp: string;
  totalFiles: number;
  categorization: {
    core: number;
    experimental: number;
    test: number;
    'phase-specific': number;
    unknown: number;
  };
  prioritization: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  files: CategorizedFile[];
}

export class ApiCategorizer {
  private manifest: CategorizationManifest;

  constructor() {
    this.manifest = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      categorization: {
        core: 0,
        experimental: 0,
        test: 0,
        'phase-specific': 0,
        unknown: 0,
      },
      prioritization: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
      },
      files: [],
    };
  }

  /**
   * Determine if a file is a backup/disabled file
   */
  private isBackupFile(filePath: string): boolean {
    return filePath.includes('.disabled') || filePath.includes('_disabled');
  }

  /**
   * Get the corresponding active file for a backup
   */
  private getActiveFilePath(backupPath: string): string {
    return backupPath.replace(/\.disabled|_disabled/g, '');
  }

  /**
   * Categorize a file based on its path
   */
  private categorizeFile(filePath: string): { category: RouteCategory; reason: string } {
    const normalizedPath = filePath.replace(/\\/g, '/');

    // Check for test files
    if (normalizedPath.includes('/test') || normalizedPath.includes('/__tests__')) {
      return { category: 'test', reason: 'Located in test directory' };
    }

    // Check for phase-specific files (phase1, phase2, etc.)
    if (/phase\d+/i.test(normalizedPath)) {
      return { category: 'phase-specific', reason: 'Phase-specific route' };
    }

    // Check for experimental files
    if (
      normalizedPath.includes('/experimental') ||
      normalizedPath.includes('/beta') ||
      normalizedPath.includes('/alpha')
    ) {
      return { category: 'experimental', reason: 'Located in experimental directory' };
    }

    // Core routes - common API endpoints
    const corePatterns = [
      '/cases',
      '/evidence',
      '/search',
      '/auth',
      '/users',
      '/documents',
      '/analysis',
      '/health',
    ];

    for (const pattern of corePatterns) {
      if (normalizedPath.includes(pattern)) {
        return { category: 'core', reason: `Core route: ${pattern}` };
      }
    }

    return { category: 'unknown', reason: 'Could not determine category' };
  }

  /**
   * Calculate priority based on category and error severity
   */
  private calculatePriority(
    category: RouteCategory,
    errorSeverity: string,
    errorCount: number
  ): RoutePriority {
    // Core routes with errors are critical
    if (category === 'core' && (errorSeverity === 'critical' || errorSeverity === 'high')) {
      return 'critical';
    }

    // Core routes are always high priority
    if (category === 'core') {
      return 'high';
    }

    // Experimental/test routes with errors are medium
    if ((category === 'experimental' || category === 'test') && errorCount > 0) {
      return 'medium';
    }

    // Everything else is low priority
    return 'low';
  }

  /**
   * Categorize a scanned file
   */
  categorizeScannedFile(scannedFile: ScannedFile): CategorizedFile {
    const isBackup = this.isBackupFile(scannedFile.path);
    const { category, reason } = this.categorizeFile(scannedFile.path);
    const priority = this.calculatePriority(category, scannedFile.severity, scannedFile.errorCount);

    const categorized: CategorizedFile = {
      ...scannedFile,
      category,
      priority,
      isBackup,
      backupPath: isBackup ? this.getActiveFilePath(scannedFile.path) : undefined,
      reason,
    };

    return categorized;
  }

  /**
   * Categorize all scanned files
   */
  categorizeFiles(scannedFiles: ScannedFile[]): CategorizationManifest {
    this.manifest.totalFiles = scannedFiles.length;

    for (const scannedFile of scannedFiles) {
      const categorized = this.categorizeScannedFile(scannedFile);
      this.manifest.files.push(categorized);

      // Update counts
      this.manifest.categorization[categorized.category]++;
      this.manifest.prioritization[categorized.priority]++;
    }

    return this.manifest;
  }

  /**
   * Get the categorization manifest
   */
  getManifest(): CategorizationManifest {
    return this.manifest;
  }

  /**
   * Get files by category
   */
  getFilesByCategory(category: RouteCategory): CategorizedFile[] {
    return this.manifest.files.filter((f) => f.category === category);
  }

  /**
   * Get files by priority
   */
  getFilesByPriority(priority: RoutePriority): CategorizedFile[] {
    return this.manifest.files.filter((f) => f.priority === priority);
  }

  /**
   * Get backup files
   */
  getBackupFiles(): CategorizedFile[] {
    return this.manifest.files.filter((f) => f.isBackup);
  }

  /**
   * Get critical files (core routes with errors)
   */
  getCriticalFiles(): CategorizedFile[] {
    return this.manifest.files.filter((f) => f.priority === 'critical' && f.hasErrors);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    byCategory: Record<RouteCategory, number>;
    byPriority: Record<RoutePriority, number>;
    backupCount: number;
    criticalCount: number;
  } {
    return {
      total: this.manifest.totalFiles,
      byCategory: this.manifest.categorization,
      byPriority: this.manifest.prioritization,
      backupCount: this.getBackupFiles().length,
      criticalCount: this.getCriticalFiles().length,
    };
  }
}
