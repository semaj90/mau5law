import fs from 'fs';
import path from 'path';
import { grepSearch } from '../api-cleanup/search-utils';
import { ScannedFile } from './scanner';

export interface DisableLog {
  timestamp: string;
  totalFiles: number;
  disabledFiles: number;
  failedDisables: number;
  brokenImports: number;
  disables: DisableEntry[];
  importUpdates: ImportUpdate[];
}

export interface DisableEntry {
  filePath: string;
  disabledPath: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
}

export interface ImportUpdate {
  filePath: string;
  status: 'success' | 'failed';
  importsRemoved: number;
  reason?: string;
}

export class FileDisabler {
  private log: DisableLog;
  private codebaseRoot: string;

  constructor(codebaseRoot: string = 'sveltekit-frontend/src') {
    this.codebaseRoot = codebaseRoot;
    this.log = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      disabledFiles: 0,
      failedDisables: 0,
      brokenImports: 0,
      disables: [],
      importUpdates: [],
    };
  }

  /**
   * Find all files that import from a given file
   */
  private findImportingFiles(targetPath: string): string[] {
    const importingFiles: string[] = [];
    const normalizedTarget = targetPath.replace(/\\/g, '/');

    try {
      // Search for imports of this file
      const pattern = `from\\s+['\"].*${normalizedTarget.replace(/\//g, '\\/')}['\"]`;
      // This would use actual grep in production
      // For now, we'll return empty array as a placeholder
      return importingFiles;
    } catch (error) {
      console.warn(`Error finding imports for ${targetPath}:`, error);
      return importingFiles;
    }
  }

  /**
   * Remove imports from a file
   */
  private removeImportsFromFile(filePath: string, targetPath: string): ImportUpdate {
    const update: ImportUpdate = {
      filePath,
      status: 'skipped',
      importsRemoved: 0,
    };

    try {
      if (!fs.existsSync(filePath)) {
        update.status = 'failed';
        update.reason = 'File does not exist';
        return update;
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      const originalContent = content;
      let importsRemoved = 0;

      // Remove imports from the target file
      const lines = content.split('\n');
      const filteredLines = lines.filter((line) => {
        if (line.includes('import') && line.includes(targetPath)) {
          importsRemoved++;
          return false;
        }
        return true;
      });

      if (importsRemoved > 0) {
        content = filteredLines.join('\n');
        fs.writeFileSync(filePath, content, 'utf-8');
        update.status = 'success';
        update.importsRemoved = importsRemoved;
      } else {
        update.status = 'skipped';
        update.reason = 'No imports found';
      }

      return update;
    } catch (error) {
      update.status = 'failed';
      update.reason = `Error: ${(error as Error).message}`;
      return update;
    }
  }

  /**
   * Disable a single file
   */
  private disableFile(filePath: string): DisableEntry {
    const entry: DisableEntry = {
      filePath,
      disabledPath: `${filePath}.disabled`,
      status: 'skipped',
    };

    try {
      if (!fs.existsSync(filePath)) {
        entry.status = 'failed';
        entry.reason = 'File does not exist';
        return entry;
      }

      // Rename file to .disabled
      const disabledPath = `${filePath}.disabled`;

      if (fs.existsSync(disabledPath)) {
        entry.status = 'failed';
        entry.reason = 'Disabled file already exists';
        return entry;
      }

      fs.renameSync(filePath, disabledPath);
      entry.status = 'success';
      entry.disabledPath = disabledPath;

      return entry;
    } catch (error) {
      entry.status = 'failed';
      entry.reason = `Error: ${(error as Error).message}`;
      return entry;
    }
  }

  /**
   * Disable all unfixable files
   */
  disableUnfixableFiles(unfixableFiles: ScannedFile[]): DisableLog {
    this.log.totalFiles = unfixableFiles.length;

    for (const file of unfixableFiles) {
      // Disable the file
      const disableEntry = this.disableFile(file.path);
      this.log.disables.push(disableEntry);

      if (disableEntry.status === 'success') {
        this.log.disabledFiles++;

        // Find and update all files that import from this file
        const importingFiles = this.findImportingFiles(file.path);

        for (const importingFile of importingFiles) {
          const importUpdate = this.removeImportsFromFile(importingFile, file.path);
          this.log.importUpdates.push(importUpdate);

          if (importUpdate.status === 'failed') {
            this.log.brokenImports++;
          }
        }
      } else if (disableEntry.status === 'failed') {
        this.log.failedDisables++;
      }
    }

    return this.log;
  }

  /**
   * Get the disable log
   */
  getLog(): DisableLog {
    return this.log;
  }

  /**
   * Get successfully disabled files
   */
  getSuccessfulDisables(): DisableEntry[] {
    return this.log.disables.filter((d) => d.status === 'success');
  }

  /**
   * Get failed disables
   */
  getFailedDisables(): DisableEntry[] {
    return this.log.disables.filter((d) => d.status === 'failed');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    disabled: number;
    failed: number;
    skipped: number;
    importsUpdated: number;
    brokenImports: number;
    successRate: number;
  } {
    const total = this.log.disables.length;
    const disabled = this.log.disabledFiles;
    const failed = this.log.failedDisables;
    const skipped = total - disabled - failed;
    const importsUpdated = this.log.importUpdates.filter((u) => u.status === 'success').length;
    const successRate = total > 0 ? (disabled / total) * 100 : 0;

    return {
      total,
      disabled,
      failed,
      skipped,
      importsUpdated,
      brokenImports: this.log.brokenImports,
      successRate,
    };
  }
}
