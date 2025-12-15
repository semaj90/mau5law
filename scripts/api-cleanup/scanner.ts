import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

export interface FileError {
  type: 'syntax' | 'import' | 'type' | 'unknown';
  message: string;
  line?: number;
}

export interface ScannedFile {
  path: string;
  relativePath: string;
  hasErrors: boolean;
  errors: FileError[];
  errorCount: number;
  severity: 'critical' | 'high' | 'medium' | 'low' | 'none';
}

export interface ScanManifest {
  timestamp: string;
  totalFiles: number;
  filesWithErrors: number;
  errorSummary: {
    syntax: number;
    import: number;
    type: number;
    unknown: number;
  };
  files: ScannedFile[];
}

export class ApiScanner {
  private apiDir: string;
  private manifest: ScanManifest;

  constructor(apiDir: string = 'sveltekit-frontend/src/routes/api') {
    this.apiDir = apiDir;
    this.manifest = {
      timestamp: new Date().toISOString(),
      totalFiles: 0,
      filesWithErrors: 0,
      errorSummary: {
        syntax: 0,
        import: 0,
        type: 0,
        unknown: 0,
      },
      files: [],
    };
  }

  /**
   * Recursively find all +server.ts files in the API directory
   */
  private findServerFiles(dir: string): string[] {
    const files: string[] = [];

    if (!fs.existsSync(dir)) {
      console.warn(`Directory not found: ${dir}`);
      return files;
    }

    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        files.push(...this.findServerFiles(fullPath));
      } else if (entry.name === '+server.ts') {
        files.push(fullPath);
      }
    }

    return files;
  }

  /**
   * Detect errors in a TypeScript file
   */
  private detectErrors(filePath: string): FileError[] {
    const errors: FileError[] = [];

    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for malformed imports (missing 'from' keyword)
      const malformedImportRegex = /import\s+\{[^}]*\}\s+['"][^'"]*['"]/g;
      const malformedImports = content.match(malformedImportRegex) || [];

      for (const imp of malformedImports) {
        if (!imp.includes('from')) {
          errors.push({
            type: 'import',
            message: `Malformed import: ${imp}`,
          });
        }
      }

      // Check for missing semicolons at end of statements
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();

        // Skip empty lines, comments, and lines that don't need semicolons
        if (
          !line ||
          line.startsWith('//') ||
          line.startsWith('*') ||
          line.startsWith('/*') ||
          line.endsWith('{') ||
          line.endsWith('}') ||
          line.endsWith(',') ||
          line.endsWith(';')
        ) {
          continue;
        }

        // Check for variable declarations without semicolons
        if (
          (line.startsWith('const ') ||
            line.startsWith('let ') ||
            line.startsWith('var ') ||
            line.startsWith('export const ')) &&
          line.includes('=')
        ) {
          errors.push({
            type: 'syntax',
            message: `Missing semicolon: ${line}`,
            line: i + 1,
          });
        }
      }

      // Check for unmatched braces
      const openBraces = (content.match(/{/g) || []).length;
      const closeBraces = (content.match(/}/g) || []).length;
      if (openBraces !== closeBraces) {
        errors.push({
          type: 'syntax',
          message: `Unmatched braces: ${openBraces} open, ${closeBraces} close`,
        });
      }
    } catch (e) {
      errors.push({
        type: 'unknown',
        message: `Error reading file: ${(e as Error).message}`,
      });
    }

    return errors;
  }

  /**
   * Determine severity based on error count and types
   */
  private calculateSeverity(errors: FileError[]): 'critical' | 'high' | 'medium' | 'low' | 'none' {
    if (errors.length === 0) return 'none';
    if (errors.length > 5) return 'critical';
    if (errors.some((e) => e.type === 'import')) return 'high';
    if (errors.some((e) => e.type === 'syntax')) return 'high';
    if (errors.some((e) => e.type === 'type')) return 'medium';
    return 'low';
  }

  /**
   * Scan all API route files
   */
  scan(): ScanManifest {
    const serverFiles = this.findServerFiles(this.apiDir);
    this.manifest.totalFiles = serverFiles.length;

    for (const filePath of serverFiles) {
      const relativePath = path.relative(process.cwd(), filePath);
      const errors = this.detectErrors(filePath);
      const hasErrors = errors.length > 0;

      if (hasErrors) {
        this.manifest.filesWithErrors++;
      }

      const scannedFile: ScannedFile = {
        path: filePath,
        relativePath,
        hasErrors,
        errors,
        errorCount: errors.length,
        severity: this.calculateSeverity(errors),
      };

      this.manifest.files.push(scannedFile);

      // Update error summary
      for (const error of errors) {
        this.manifest.errorSummary[error.type]++;
      }
    }

    return this.manifest;
  }

  /**
   * Get the scan manifest
   */
  getManifest(): ScanManifest {
    return this.manifest;
  }

  /**
   * Save manifest to file
   */
  saveManifest(outputPath: string): void {
    fs.writeFileSync(outputPath, JSON.stringify(this.manifest, null, 2));
    console.log(`Manifest saved to ${outputPath}`);
  }

  /**
   * Get files by severity
   */
  getFilesBySeverity(severity: string): ScannedFile[] {
    return this.manifest.files.filter((f) => f.severity === severity);
  }

  /**
   * Get summary statistics
   */
  getSummary(): {
    total: number;
    withErrors: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
  } {
    return {
      total: this.manifest.totalFiles,
      withErrors: this.manifest.filesWithErrors,
      critical: this.manifest.files.filter((f) => f.severity === 'critical').length,
      high: this.manifest.files.filter((f) => f.severity === 'high').length,
      medium: this.manifest.files.filter((f) => f.severity === 'medium').length,
      low: this.manifest.files.filter((f) => f.severity === 'low').length,
    };
  }
}
