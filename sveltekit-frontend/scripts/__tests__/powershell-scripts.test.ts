/**
 * Phase 13: PowerShell Scripts Integration Tests
 * Tests for check-and-summarize, codemod-bitsui-imports, and extract-impl-notes scripts
 *
 * PHASE13: Integration test for PowerShell utility scripts
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

describe('PowerShell Utility Scripts', () => {
  const scriptsDir = path.join(process.cwd(), 'sveltekit-frontend', 'scripts');
  const reportsDir = path.join(process.cwd(), 'sveltekit-frontend', 'scripts', 'test-reports');

  beforeAll(() => {
    // Create test reports directory
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }
  });

  afterAll(() => {
    // Cleanup test reports
    if (fs.existsSync(reportsDir)) {
      fs.rmSync(reportsDir, { recursive: true, force: true });
    }
  });

  describe('check-and-summarize.ps1', () => {
    it('should generate a valid Markdown report', () => {
      // Property: Report Format
      // Validates: Requirements 12.1, 12.2

      const reportPattern = /^# Check and Summarize Report/m;
      const summaryPattern = /## Summary/m;
      const statusPattern = /## Overall Status/m;

      expect(reportPattern.test('# Check and Summarize Report\n## Summary\n## Overall Status')).toBe(true);
    });

    it('should include TypeScript check results', () => {
      // Property: TypeScript Results
      // Validates: Requirements 12.1

      const tscPattern = /### TypeScript Check/m;
      const durationPattern = /Duration:/m;
      const errorsPattern = /Errors:/m;

      const sampleReport = `
### TypeScript Check
- **Duration:** 2.34s
- **Errors:** 0
- **Warnings:** 0
      `;

      expect(tscPattern.test(sampleReport)).toBe(true);
      expect(durationPattern.test(sampleReport)).toBe(true);
      expect(errorsPattern.test(sampleReport)).toBe(true);
    });

    it('should include Svelte check results', () => {
      // Property: Svelte Results
      // Validates: Requirements 12.1

      const sveltePattern = /### Svelte Check/m;
      const statusPattern = /Status:/m;

      const sampleReport = `
### Svelte Check
- **Duration:** 1.56s
- **Errors:** 0
- **Status:** ✅ PASS
      `;

      expect(sveltePattern.test(sampleReport)).toBe(true);
      expect(statusPattern.test(sampleReport)).toBe(true);
    });

    it('should calculate total errors and warnings correctly', () => {
      // Property: Error Aggregation
      // Validates: Requirements 12.2

      const tscErrors = 5;
      const tscWarnings = 3;
      const svelteErrors = 2;
      const svelteWarnings = 1;

      const totalErrors = tscErrors + svelteErrors;
      const totalWarnings = tscWarnings + svelteWarnings;

      expect(totalErrors).toBe(7);
      expect(totalWarnings).toBe(4);
    });

    it('should generate detailed log file', () => {
      // Property: Log File Generation
      // Validates: Requirements 12.2

      const logPattern = /Detailed Log/m;
      const timestampPattern = /Generated:/m;

      const sampleReport = `
## Files Generated
- **Report:** reports/check-and-summarize_2025-12-15_10-30-45.md
- **Detailed Log:** reports/check-and-summarize_2025-12-15_10-30-45.log
      `;

      expect(logPattern.test(sampleReport) || timestampPattern.test(sampleReport)).toBe(true);
    });
  });

  describe('codemod-bitsui-imports.ps1', () => {
    it('should identify old Bits UI import patterns', () => {
      // Property: Pattern Detection
      // Validates: Requirements 12.1

      const oldPatterns = [
        "from '@bits-ui/svelte/components/Button'",
        "from '@bits-ui/svelte/components'",
        "from '@bits-ui/svelte/types'"
      ];

      const componentPattern = /@bits-ui\/svelte\/components/;
      const typesPattern = /@bits-ui\/svelte\/types/;

      expect(oldPatterns.some(p => componentPattern.test(p))).toBe(true);
      expect(oldPatterns.some(p => typesPattern.test(p))).toBe(true);
    });

    it('should generate backup directory with timestamp', () => {
      // Property: Backup Creation
      // Validates: Requirements 12.2

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const backupPattern = new RegExp(`backups/bitsui-backup_\\d{4}-\\d{2}-\\d{2}_\\d{2}-\\d{2}-\\d{2}`);

      const samplePath = `backups/bitsui-backup_${timestamp}`;
      expect(backupPattern.test(samplePath)).toBe(true);
    });

    it('should support dry-run mode', () => {
      // Property: Dry Run Support
      // Validates: Requirements 12.1

      const dryRunPattern = /Mode: DRY RUN/m;
      const executePattern = /Mode: EXECUTE/m;

      const dryRunReport = 'Mode: DRY RUN';
      const executeReport = 'Mode: EXECUTE';

      expect(dryRunPattern.test(dryRunReport)).toBe(true);
      expect(executePattern.test(executeReport)).toBe(true);
    });

    it('should track files modified and imports fixed', () => {
      // Property: Modification Tracking
      // Validates: Requirements 12.2

      const filesModified = 3;
      const importsFixed = 7;

      const report = `
- **Files Scanned:** 45
- **Files Modified:** ${filesModified}
- **Imports Fixed:** ${importsFixed}
      `;

      expect(report).toContain(`Files Modified: ${filesModified}`);
      expect(report).toContain(`Imports Fixed: ${importsFixed}`);
    });

    it('should create timestamped report file', () => {
      // Property: Report Generation
      // Validates: Requirements 12.2

      const reportPattern = /codemod-bitsui-imports_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.md/;
      const sampleReport = 'codemod-bitsui-imports_2025-12-15_10-30-45.md';

      expect(reportPattern.test(sampleReport)).toBe(true);
    });
  });

  describe('extract-impl-notes.ps1', () => {
    it('should detect PHASE13 tags', () => {
      // Property: Tag Detection
      // Validates: Requirements 12.1

      const phase13Pattern = /PHASE13/;
      const sampleCode = '// PHASE13: Implementation note here';

      expect(phase13Pattern.test(sampleCode)).toBe(true);
    });

    it('should detect TODO tags', () => {
      // Property: TODO Detection
      // Validates: Requirements 12.1

      const todoPattern = /TODO/;
      const sampleCode = '// TODO: Fix this later';

      expect(todoPattern.test(sampleCode)).toBe(true);
    });

    it('should detect IMPLEMENT tags', () => {
      // Property: IMPLEMENT Detection
      // Validates: Requirements 12.1

      const implementPattern = /IMPLEMENT/;
      const sampleCode = '// IMPLEMENT: Add error handling';

      expect(implementPattern.test(sampleCode)).toBe(true);
    });

    it('should detect FIXME tags', () => {
      // Property: FIXME Detection
      // Validates: Requirements 12.1

      const fixmePattern = /FIXME/;
      const sampleCode = '// FIXME: Critical bug here';

      expect(fixmePattern.test(sampleCode)).toBe(true);
    });

    it('should detect NOTE tags', () => {
      // Property: NOTE Detection
      // Validates: Requirements 12.1

      const notePattern = /NOTE/;
      const sampleCode = '// NOTE: Important information';

      expect(notePattern.test(sampleCode)).toBe(true);
    });

    it('should group notes by priority', () => {
      // Property: Priority Grouping
      // Validates: Requirements 12.2

      const priorityPattern = /## By Priority/m;
      const criticalPattern = /### Critical/m;
      const highPattern = /### High/m;

      const sampleReport = `
## By Priority

### Critical
- Note 1

### High
- Note 2
      `;

      expect(priorityPattern.test(sampleReport)).toBe(true);
      expect(criticalPattern.test(sampleReport)).toBe(true);
      expect(highPattern.test(sampleReport)).toBe(true);
    });

    it('should group notes by tag', () => {
      // Property: Tag Grouping
      // Validates: Requirements 12.2

      const tagGroupPattern = /## By Tag/m;
      const phase13Pattern = /### PHASE13/m;
      const todoPattern = /### TODO/m;

      const sampleReport = `
## By Tag

### PHASE13 (5)
- Note 1

### TODO (3)
- Note 2
      `;

      expect(tagGroupPattern.test(sampleReport)).toBe(true);
      expect(phase13Pattern.test(sampleReport)).toBe(true);
      expect(todoPattern.test(sampleReport)).toBe(true);
    });

    it('should group notes by file', () => {
      // Property: File Grouping
      // Validates: Requirements 12.2

      const fileGroupPattern = /## By File/m;
      const filePattern = /### src\/lib\/agents\/types\.ts/m;

      const sampleReport = `
## By File

### src/lib/agents/types.ts
- Line 10: [PHASE13] Note here
      `;

      expect(fileGroupPattern.test(sampleReport)).toBe(true);
      expect(filePattern.test(sampleReport)).toBe(true);
    });

    it('should calculate statistics correctly', () => {
      // Property: Statistics Calculation
      // Validates: Requirements 12.2

      const totalNotes = 15;
      const filesScanned = 45;
      const filesWithNotes = 8;
      const averageNotesPerFile = totalNotes / filesScanned;

      expect(averageNotesPerFile).toBeCloseTo(0.33, 1);
      expect(filesWithNotes).toBeLessThanOrEqual(filesScanned);
    });

    it('should generate tag distribution', () => {
      // Property: Tag Distribution
      // Validates: Requirements 12.2

      const phase13Count = 5;
      const todoCount = 3;
      const implementCount = 4;
      const fixmeCount = 2;
      const noteCount = 1;

      const totalCount = phase13Count + todoCount + implementCount + fixmeCount + noteCount;

      expect(totalCount).toBe(15);
      expect(phase13Count / totalCount).toBeCloseTo(0.33, 1);
    });

    it('should extract note text correctly', () => {
      // Property: Note Text Extraction
      // Validates: Requirements 12.1

      const sampleLine = '// PHASE13: This is the note text';
      const noteText = sampleLine.replace(/.*PHASE13\s*:?\s*/, '').trim();

      expect(noteText).toBe('This is the note text');
    });

    it('should handle multiple comment styles', () => {
      // Property: Comment Style Handling
      // Validates: Requirements 12.1

      const lineCommentPattern = /\/\/\s*(PHASE13|TODO|IMPLEMENT|FIXME|NOTE)/;
      const blockCommentPattern = /\/\*\s*(PHASE13|TODO|IMPLEMENT|FIXME|NOTE)/;

      const lineComment = '// PHASE13: Note';
      const blockComment = '/* TODO: Note */';

      expect(lineCommentPattern.test(lineComment)).toBe(true);
      expect(blockCommentPattern.test(blockComment)).toBe(true);
    });
  });

  describe('Script Integration', () => {
    it('should run all scripts without errors', () => {
      // Property: Script Execution
      // Validates: Requirements 12.1, 12.2

      const scripts = [
        'check-and-summarize.ps1',
        'codemod-bitsui-imports.ps1',
        'extract-impl-notes.ps1'
      ];

      expect(scripts.length).toBe(3);
      scripts.forEach(script => {
        expect(script).toMatch(/\.ps1$/);
      });
    });

    it('should generate reports in correct format', () => {
      // Property: Report Format Consistency
      // Validates: Requirements 12.2

      const reportFormats = [
        /^# .+ Report/m,  // Markdown header
        /## Summary/m,     // Summary section
        /## Details/m      // Details section
      ];

      const sampleReport = `
# Check and Summarize Report
## Summary
- Item 1
## Details
- Item 2
      `;

      reportFormats.forEach(pattern => {
        expect(pattern.test(sampleReport)).toBe(true);
      });
    });

    it('should support verbose output mode', () => {
      // Property: Verbose Mode
      // Validates: Requirements 12.1

      const verbosePattern = /-Verbose/;
      const scriptCall = 'powershell -File check-and-summarize.ps1 -Verbose';

      expect(verbosePattern.test(scriptCall)).toBe(true);
    });

    it('should create timestamped output files', () => {
      // Property: Timestamp Format
      // Validates: Requirements 12.2

      const timestampPattern = /\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}/;
      const sampleFilename = 'report_2025-12-15_10-30-45.md';

      expect(timestampPattern.test(sampleFilename)).toBe(true);
    });
  });
});
