import fs from 'fs';
import path from 'path';
import { CategorizedFile } from './categorizer';

export interface RecoveryLog {
  timestamp: string;
  totalBackupFiles: number;
  successfulRecoveries: number;
  failedRecoveries: number;
  recoveries: RecoveryEntry[];
}

export interface RecoveryEntry {
  backupPath: string;
  activePath: string;
  status: 'success' | 'failed' | 'skipped';
  reason?: string;
  contentLength?: number;
}

export class DataRecovery {
  private log: RecoveryLog;

  constructor() {
    this.log = {
      timestamp: new Date().toISOString(),
      totalBackupFiles: 0,
      successfulRecoveries: 0,
      failedRecoveries: 0,
      recoveries: [],
    };
  }

  /**
   * Check if a file is valid TypeScript
   */
  private isValidTypeScript(content: string): boolean {
    // Basic validation - check for common syntax issues
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;

    if (openBraces !== closeBraces) {
      return false;
    }

    // Check for at least one export or function
    if (!content.includes('export') && !content.includes('function')) {
      return false;
    }

    return true;
  }

  /**
   * Recover data from a single backup file
   */
  private recoverFromBackup(backupPath: string, activePath: string): RecoveryEntry {
    const entry: RecoveryEntry = {
      backupPath,
      activePath,
      status: 'skipped',
    };

    try {
      // Check if backup file exists
      if (!fs.existsSync(backupPath)) {
        entry.status = 'failed';
        entry.reason = 'Backup file does not exist';
        return entry;
      }

      // Read backup content
      const backupContent = fs.readFileSync(backupPath, 'utf-8');

      // Validate content
      if (!this.isValidTypeScript(backupContent)) {
        entry.status = 'failed';
        entry.reason = 'Backup content is not valid TypeScript';
        return entry;
      }

      // Check if active file exists
      if (fs.existsSync(activePath)) {
        const activeContent = fs.readFileSync(activePath, 'utf-8');

        // If active file is already valid, skip recovery
        if (this.isValidTypeScript(activeContent)) {
          entry.status = 'skipped';
          entry.reason = 'Active file is already valid';
          return entry;
        }
      }

      // Restore backup to active file
      fs.writeFileSync(activePath, backupContent, 'utf-8');

      entry.status = 'success';
      entry.contentLength = backupContent.length;
      return entry;
    } catch (error) {
      entry.status = 'failed';
      entry.reason = `Error: ${(error as Error).message}`;
      return entry;
    }
  }

  /**
   * Recover data from all backup files
   */
  recoverFromBackups(backupFiles: CategorizedFile[]): RecoveryLog {
    this.log.totalBackupFiles = backupFiles.length;

    for (const backupFile of backupFiles) {
      if (!backupFile.isBackup || !backupFile.backupPath) {
        continue;
      }

      const entry = this.recoverFromBackup(backupFile.path, backupFile.backupPath);
      this.log.recoveries.push(entry);

      if (entry.status === 'success') {
        this.log.successfulRecoveries++;
      } else if (entry.status === 'failed') {
        this.log.failedRecoveries++;
      }
    }

    return this.log;
  }

  /**
   * Get the recovery log
   */
  getLog(): RecoveryLog {
    return this.log;
  }

  /**
   * Get successful recoveries
   */
  getSuccessfulRecoveries(): RecoveryEntry[] {
    return this.log.recoveries.filter((r) => r.status === 'success');
  }

  /**
   * Get failed recoveries
   */
  getFailedRecoveries(): RecoveryEntry[] {
    return this.log.recoveries.filter((r) => r.status === 'failed');
  }

  /**
   * Get skipped recoveries
   */
  getSkippedRecoveries(): RecoveryEntry[] {
    return this.log.recoveries.filter((r) => r.status === 'skipped');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    successful: number;
    failed: number;
    skipped: number;
    successRate: number;
  } {
    const total = this.log.recoveries.length;
    const successful = this.log.successfulRecoveries;
    const failed = this.log.failedRecoveries;
    const skipped = total - successful - failed;
    const successRate = total > 0 ? (successful / total) * 100 : 0;

    return {
      total,
      successful,
      failed,
      skipped,
      successRate,
    };
  }
}
