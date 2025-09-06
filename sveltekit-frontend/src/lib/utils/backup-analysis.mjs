#!/usr/bin/env node
/**
 * Backup Analysis Script - Identifies which backup files should be restored
 * Analyzes code quality, syntax issues, and implementation completeness
 */

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class BackupAnalyzer {
  constructor() {
    this.results = [];
    this.metrics = {
      totalBackups: 0,
      recommendedRestorations: 0,
      syntaxIssuesFixed: 0,
      featureImprovements: 0
    };
  }

  /**
   * Analyze all backup files and compare with current implementations
   */
  async analyzeAll() {
    console.log('🔍 Starting comprehensive backup analysis...\n');
    
    const backupFiles = await this.findAllBackupFiles();
    this.metrics.totalBackups = backupFiles.length;
    
    console.log(`Found ${backupFiles.length} backup files to analyze\n`);
    
    for (const backupFile of backupFiles) {
      try {
        const analysis = await this.analyzeBackupFile(backupFile);
        if (analysis) {
          this.results.push(analysis);
        }
      } catch (error) {
        console.warn(`⚠️  Error analyzing ${backupFile}: ${error.message}`);
      }
    }
    
    this.generateReport();
    await this.generateRestorationScript();
  }

  /**
   * Find all backup files in the project
   */
  async findAllBackupFiles() {
    const backupFiles = [];
    
    async function scanDirectory(dir) {
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = path.join(dir, entry.name);
          
          if (entry.isDirectory() && !entry.name.startsWith('.') && entry.name !== 'node_modules') {
            await scanDirectory(fullPath);
          } else if (entry.name.includes('.backup')) {
            backupFiles.push(fullPath);
          }
        }
      } catch (error) {
        // Skip inaccessible directories
      }
    }
    
    await scanDirectory('.');
    return backupFiles.sort();
  }

  /**
   * Analyze a single backup file against its current version
   */
  async analyzeBackupFile(backupPath) {
    const currentPath = this.getCurrentFilePath(backupPath);
    
    // Skip if current file doesn't exist
    try {
      await fs.access(currentPath);
    } catch {
      return null;
    }
    
    const [backupContent, currentContent] = await Promise.all([
      fs.readFile(backupPath, 'utf8').catch(() => ''),
      fs.readFile(currentPath, 'utf8').catch(() => '')
    ]);

    const analysis = {
      backupPath,
      currentPath,
      recommendation: 'keep_current',
      reasons: [],
      priority: 0,
      issues: {
        backup: this.analyzeContent(backupContent, backupPath),
        current: this.analyzeContent(currentContent, currentPath)
      }
    };

    // Compare and make recommendation
    this.compareImplementations(analysis, backupContent, currentContent);
    
    return analysis;
  }

  /**
   * Get the current file path from backup path
   */
  getCurrentFilePath(backupPath) {
    return backupPath.replace(/\.backup.*$/, '');
  }

  /**
   * Analyze content for various quality metrics
   */
  analyzeContent(content, filePath) {
    const issues = {
      hasTypeSuppressions: /@ts-nocheck|@ts-ignore/.test(content),
      hasMigrationTasks: /@migration-task/.test(content),
      hasSyntaxErrors: this.detectSyntaxIssues(content, filePath),
      hasIncompleteImplementations: /TODO|FIXME|stub|placeholder/i.test(content),
      hasModernSyntax: this.hasModernSyntax(content, filePath),
      codeQuality: this.assessCodeQuality(content),
      lineCount: content.split('\n').length,
      commentRatio: this.calculateCommentRatio(content)
    };
    
    return issues;
  }

  /**
   * Detect syntax issues specific to file type
   */
  detectSyntaxIssues(content, filePath) {
    const issues = [];
    
    if (filePath.endsWith('.svelte')) {
      // Svelte-specific syntax issues
      if (content.includes('$derived(') && content.includes(';)')) {
        issues.push('malformed_derived_syntax');
      }
      if (content.includes('on:') && content.includes('onclick=')) {
        issues.push('mixed_event_handlers');
      }
      if (/export let \w+/.test(content)) {
        issues.push('old_props_syntax');
      }
      if (content.includes('<script>') && content.includes('<script lang="ts">')) {
        issues.push('duplicate_script_tags');
      }
    }
    
    if (filePath.endsWith('.ts') || filePath.endsWith('.js')) {
      // TypeScript/JavaScript issues
      if (/interface\s+\w+\s*\{[^}]*\{;/.test(content)) {
        issues.push('malformed_interfaces');
      }
      if (content.includes('any') && content.split('any').length > 5) {
        issues.push('excessive_any_usage');
      }
    }
    
    return issues;
  }

  /**
   * Check for modern syntax usage
   */
  hasModernSyntax(content, filePath) {
    if (filePath.endsWith('.svelte')) {
      return {
        usesRunes: /\$state|\$derived|\$effect|\$props/.test(content),
        usesModernProps: /\$props\(\)/.test(content),
        usesModernEvents: /onclick=|onchange=/.test(content) && !content.includes('on:')
      };
    }
    
    return {
      usesAsyncAwait: /async|await/.test(content),
      usesArrowFunctions: /=>/.test(content),
      usesModernImports: /import.*from/.test(content)
    };
  }

  /**
   * Assess overall code quality
   */
  assessCodeQuality(content) {
    let score = 5; // Base score
    
    // Positive indicators
    if (content.includes('interface') || content.includes('type ')) score += 1;
    if (content.includes('async') && content.includes('await')) score += 0.5;
    if (content.includes('try') && content.includes('catch')) score += 0.5;
    if (/\/\*\*[\s\S]*?\*\//.test(content)) score += 1; // JSDoc comments
    
    // Negative indicators  
    if (/@ts-nocheck|@ts-ignore/.test(content)) score -= 2;
    if (/console\.log/.test(content)) score -= 0.5;
    if (/any/g.test(content)) score -= (content.match(/any/g)?.length || 0) * 0.1;
    if (/TODO|FIXME/i.test(content)) score -= 1;
    
    return Math.max(0, Math.min(10, score));
  }

  /**
   * Calculate comment to code ratio
   */
  calculateCommentRatio(content) {
    const lines = content.split('\n');
    const commentLines = lines.filter(line => 
      line.trim().startsWith('//') || 
      line.trim().startsWith('*') || 
      line.trim().startsWith('/*')
    ).length;
    
    return commentLines / Math.max(lines.length, 1);
  }

  /**
   * Compare backup vs current implementation and make recommendation
   */
  compareImplementations(analysis, backupContent, currentContent) {
    const { backup, current } = analysis.issues;
    let score = 0;
    
    // Critical issues that favor backup
    if (current.hasTypeSuppressions && !backup.hasTypeSuppressions) {
      score += 3;
      analysis.reasons.push('Backup removes type suppressions (@ts-nocheck)');
      this.metrics.syntaxIssuesFixed++;
    }
    
    if (current.hasMigrationTasks && !backup.hasMigrationTasks) {
      score += 3;
      analysis.reasons.push('Backup fixes migration task errors');
      this.metrics.syntaxIssuesFixed++;
    }
    
    if (current.hasSyntaxErrors.length > backup.hasSyntaxErrors.length) {
      score += 2;
      analysis.reasons.push(`Backup fixes ${current.hasSyntaxErrors.length - backup.hasSyntaxErrors.length} syntax issues`);
      this.metrics.syntaxIssuesFixed++;
    }
    
    // Code quality improvements
    if (backup.codeQuality > current.codeQuality + 0.5) {
      score += 1;
      analysis.reasons.push(`Better code quality (${backup.codeQuality.toFixed(1)} vs ${current.codeQuality.toFixed(1)})`);
      this.metrics.featureImprovements++;
    }
    
    // Modern syntax adoption
    if (analysis.currentPath.endsWith('.svelte')) {
      if (backup.hasModernSyntax.usesRunes && !current.hasModernSyntax.usesRunes) {
        score += 2;
        analysis.reasons.push('Backup uses modern Svelte 5 runes');
        this.metrics.featureImprovements++;
      }
    }
    
    // Completeness check
    if (current.hasIncompleteImplementations && !backup.hasIncompleteImplementations) {
      score += 2;
      analysis.reasons.push('Backup has more complete implementation');
      this.metrics.featureImprovements++;
    }
    
    // Size considerations (sometimes smaller is better if it removes cruft)
    if (backup.lineCount < current.lineCount * 0.8 && backup.codeQuality >= current.codeQuality) {
      score += 1;
      analysis.reasons.push('Backup is more concise while maintaining quality');
    }
    
    // Make recommendation
    if (score >= 3) {
      analysis.recommendation = 'restore_backup';
      analysis.priority = Math.min(score, 5);
      this.metrics.recommendedRestorations++;
    } else if (score >= 1) {
      analysis.recommendation = 'review_manually';
      analysis.priority = 2;
    }
  }

  /**
   * Generate comprehensive analysis report
   */
  generateReport() {
    console.log('\n📊 BACKUP ANALYSIS REPORT');
    console.log('='.repeat(50));
    console.log(`Total backups analyzed: ${this.metrics.totalBackups}`);
    console.log(`Recommended restorations: ${this.metrics.recommendedRestorations}`);
    console.log(`Syntax issues that can be fixed: ${this.metrics.syntaxIssuesFixed}`);
    console.log(`Feature improvements available: ${this.metrics.featureImprovements}`);
    
    console.log('\n🔥 HIGH PRIORITY RESTORATIONS:');
    const highPriority = this.results
      .filter(r => r.recommendation === 'restore_backup' && r.priority >= 4)
      .sort((a, b) => b.priority - a.priority);
    
    if (highPriority.length === 0) {
      console.log('  None found');
    } else {
      highPriority.forEach(result => {
        console.log(`\n  📁 ${result.currentPath}`);
        console.log(`     Priority: ${result.priority}/5`);
        result.reasons.forEach(reason => console.log(`     • ${reason}`));
      });
    }
    
    console.log('\n⚡ MEDIUM PRIORITY RESTORATIONS:');
    const mediumPriority = this.results
      .filter(r => r.recommendation === 'restore_backup' && r.priority < 4)
      .sort((a, b) => b.priority - a.priority);
    
    if (mediumPriority.length === 0) {
      console.log('  None found');
    } else {
      mediumPriority.slice(0, 10).forEach(result => {
        console.log(`\n  📁 ${result.currentPath}`);
        console.log(`     Priority: ${result.priority}/5`);
        result.reasons.forEach(reason => console.log(`     • ${reason}`));
      });
      
      if (mediumPriority.length > 10) {
        console.log(`\n  ... and ${mediumPriority.length - 10} more medium priority items`);
      }
    }
    
    console.log('\n🔍 MANUAL REVIEW NEEDED:');
    const manualReview = this.results.filter(r => r.recommendation === 'review_manually');
    console.log(`  ${manualReview.length} files need manual review`);
  }

  /**
   * Generate automated restoration script
   */
  async generateRestorationScript() {
    const restorations = this.results.filter(r => r.recommendation === 'restore_backup');
    
    let script = `#!/bin/bash
# Automated Backup Restoration Script
# Generated on ${new Date().toISOString()}
# Total restorations: ${restorations.length}

echo "🔄 Starting automated backup restoration..."
echo "This will restore ${restorations.length} files from their backup versions"
echo ""

# Create restoration log
RESTORE_LOG="restoration-log-$(date +%Y%m%d-%H%M%S).txt"
echo "Restoration started at $(date)" > "$RESTORE_LOG"

`;

    // Sort by priority (highest first)
    restorations.sort((a, b) => b.priority - a.priority);
    
    restorations.forEach((result, index) => {
      script += `
# Restoration ${index + 1}/${restorations.length} - Priority ${result.priority}/5
echo "Restoring: ${result.currentPath}"
echo "  Reasons: ${result.reasons.join(', ')}"
cp "${result.backupPath}" "${result.currentPath}"
echo "Restored ${result.currentPath} from ${result.backupPath}" >> "$RESTORE_LOG"
`;
    });

    script += `
echo ""
echo "✅ Restoration complete!"
echo "📝 Check $RESTORE_LOG for details"
echo ""
echo "🔧 Next steps:"
echo "1. Run 'npm run check:typescript' to verify TypeScript issues are resolved"
echo "2. Run 'npm run check:svelte' to verify Svelte issues are resolved"
echo "3. Test the application to ensure functionality is preserved"
echo "4. Review any remaining manual review items"
`;

    await fs.writeFile('restore-backups.sh', script);
    await fs.chmod('restore-backups.sh', 0o755);
    
    // Also create a Windows batch version
    let batchScript = `@echo off
REM Automated Backup Restoration Script (Windows)
REM Generated on ${new Date().toISOString()}
REM Total restorations: ${restorations.length}

echo 🔄 Starting automated backup restoration...
echo This will restore ${restorations.length} files from their backup versions
echo.

`;

    restorations.forEach((result, index) => {
      batchScript += `
REM Restoration ${index + 1}/${restorations.length} - Priority ${result.priority}/5
echo Restoring: ${result.currentPath.replace(/\//g, '\\')}
copy "${result.backupPath.replace(/\//g, '\\')}" "${result.currentPath.replace(/\//g, '\\')}"
`;
    });

    batchScript += `
echo.
echo ✅ Restoration complete!
echo.
echo 🔧 Next steps:
echo 1. Run 'npm run check:typescript' to verify TypeScript issues are resolved
echo 2. Run 'npm run check:svelte' to verify Svelte issues are resolved
echo 3. Test the application to ensure functionality is preserved
pause
`;

    await fs.writeFile('restore-backups.bat', batchScript);
    
    console.log('\n📝 RESTORATION SCRIPTS GENERATED:');
    console.log('  • restore-backups.sh (Linux/Mac)');
    console.log('  • restore-backups.bat (Windows)');
    console.log('\n⚠️  BACKUP YOUR CURRENT STATE BEFORE RUNNING RESTORATION!');
  }
}

// Run the analysis
const analyzer = new BackupAnalyzer();
await analyzer.analyzeAll();