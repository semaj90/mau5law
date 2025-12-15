import fs from 'fs';
import { ScannedFile } from './scanner';

export interface FixOperation {
  type: 'add-semicolon' | 'fix-import' | 'fix-braces' | 'remove-duplicate' | 'other';
  line: number;
  original: string;
  fixed: string;
  description: string;
}

export interface FixLog {
  timestamp: string;
  totalFiles: number;
  filesFixed: number;
  filesFailed: number;
  totalOperations: number;
  fixes: FixEntry[];
}

export interface FixEntry {
  filePath: string;
  status: 'success' | 'failed' | 'skipped';
  operations: FixOperation[];
  reason?: string;
}

export class AutoFixer {
  private log: FixLog;

  constructor() {
    this.log = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      filesFixed: 0,
      filesFailed: 0,
      totalOperations: 0,
      fixes: [],
    };
  }

  /**
   * Add missing semicolons to variable declarations
   */
  private fixMissingSemicolons(content: string): { fixed: string; operations: FixOperation[] } {
    const operations: FixOperation[] = [];
    const lines = content.split('\n');
    let modified = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines, comments, and lines that already end with semicolon
      if (
        !trimmed ||
        trimmed.startsWith('//') ||
        trimmed.startsWith('*') ||
        trimmed.endsWith(';') ||
        trimmed.endsWith('{') ||
        trimmed.endsWith('}') ||
        trimmed.endsWith(',')
      ) {
        continue;
      }

      // Check for variable declarations without semicolons
      if (
        (trimmed.startsWith('const ') ||
          trimmed.startsWith('let ') ||
          trimmed.startsWith('var ') ||
          trimmed.startsWith('export const ')) &&
        trimmed.includes('=')
      ) {
        const fixed = line + ';';
        lines[i] = fixed;
        modified = true;

        operations.push({
          type: 'add-semicolon',
          line: i + 1,
          original: line,
          fixed,
          description: `Added missing semicolon to variable declaration`,
        });
      }
    }

    return {
      fixed: lines.join('\n'),
      operations,
    };
  }

  /**
   * Fix unmatched braces by adding missing closing braces
   */
  private fixUnmatchedBraces(content: string): { fixed: string; operations: FixOperation[] } {
    const operations: FixOperation[] = [];
    const openBraces = (content.match(/{/g) || []).length;
    const closeBraces = (content.match(/}/g) || []).length;

    if (openBraces === closeBraces) {
      return { fixed: content, operations };
    }

    const difference = openBraces - closeBraces;

    if (difference > 0) {
      // Add missing closing braces
      let fixed = content;
      for (let i = 0; i < difference; i++) {
        fixed += '\n}';
      }

      operations.push({
        type: 'fix-braces',
        line: content.split('\n').length,
        original: content,
        fixed,
        description: `Added ${difference} missing closing brace(s)`,
      });

      return { fixed, operations };
    }

    return { fixed: content, operations };
  }

  /**
   * Remove duplicate imports
   */
  private removeDuplicateImports(content: string): { fixed: string; operations: FixOperation[] } {
    const operations: FixOperation[] = [];
    const lines = content.split('\n');
    const importMap = new Map<string, number>();
    const linesToRemove = new Set<number>();

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      if (line.startsWith('import ')) {
        if (importMap.has(line)) {
          linesToRemove.add(i);
          operations.push({
            type: 'remove-duplicate',
            line: i + 1,
            original: line,
            fixed: '',
            description: `Removed duplicate import`,
          });
        } else {
          importMap.set(line, i);
        }
      }
    }

    if (linesToRemove.size > 0) {
      const fixed = lines.filter((_, i) => !linesToRemove.has(i)).join('\n');
      return { fixed, operations };
    }

    return { fixed: content, operations };
  }

  /**
   * Fix a single file
   */
  private fixFile(filePath: string): FixEntry {
    const entry: FixEntry = {
      filePath,
      status: 'skipped',
      operations: [],
    };

    try {
      if (!fs.existsSync(filePath)) {
        entry.status = 'failed';
        entry.reason = 'File does not exist';
        return entry;
      }

      let content = fs.readFileSync(filePath, 'utf-8');
      const allOperations: FixOperation[] = [];

      // Apply fixes in order
      let result = this.fixMissingSemicolons(content);
      allOperations.push(...result.operations);
      content = result.fixed;

      result = this.fixUnmatchedBraces(content);
      allOperations.push(...result.operations);
      content = result.fixed;

      result = this.removeDuplicateImports(content);
      allOperations.push(...result.operations);
      content = result.fixed;

      if (allOperations.length > 0) {
        // Write fixed content back to file
        fs.writeFileSync(filePath, content, 'utf-8');
        entry.status = 'success';
        entry.operations = allOperations;
      } else {
        entry.status = 'skipped';
        entry.reason = 'No fixes needed';
      }

      return entry;
    } catch (error) {
      entry.status = 'failed';
      entry.reason = `Error: ${(error as Error).message}`;
      return entry;
    }
  }

  /**
   * Fix all corrupted files
   */
  fixFiles(scannedFiles: ScannedFile[]): FixLog {
    this.log.totalFiles = scannedFiles.length;

    for (const scannedFile of scannedFiles) {
      // Only fix files with errors
      if (!scannedFile.hasErrors) {
        continue;
      }

      const entry = this.fixFile(scannedFile.path);
      this.log.fixes.push(entry);

      if (entry.status === 'success') {
        this.log.filesFixed++;
        this.log.totalOperations += entry.operations.length;
      } else if (entry.status === 'failed') {
        this.log.filesFailed++;
      }
    }

    return this.log;
  }

  /**
   * Get the fix log
   */
  getLog(): FixLog {
    return this.log;
  }

  /**
   * Get successful fixes
   */
  getSuccessfulFixes(): FixEntry[] {
    return this.log.fixes.filter((f) => f.status === 'success');
  }

  /**
   * Get failed fixes
   */
  getFailedFixes(): FixEntry[] {
    return this.log.fixes.filter((f) => f.status === 'failed');
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    fixed: number;
    failed: number;
    skipped: number;
    totalOperations: number;
    successRate: number;
  } {
    const total = this.log.fixes.length;
    const fixed = this.log.filesFixed;
    const failed = this.log.filesFailed;
    const skipped = total - fixed - failed;
    const successRate = total > 0 ? (fixed / total) * 100 : 0;

    return {
      total,
      fixed,
      failed,
      skipped,
      totalOperations: this.log.totalOperations,
      successRate,
    };
  }
}
