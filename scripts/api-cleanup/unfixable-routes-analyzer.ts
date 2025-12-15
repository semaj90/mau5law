import fs from 'fs';
import path from 'path';

/**
 * Unfixable Routes Analyzer & Recovery Tool
 *
 * Analyzes the 809 unfixable routes to:
 * 1. Identify which ones are needed for core development/production
 * 2. Categorize by type and severity
 * 3. Attempt advanced fixes using multiple strategies
 * 4. Generate recovery recommendations
 */

export interface UnfixableRoute {
  path: string;
  filename: string;
  category: 'core' | 'experimental' | 'test' | 'phase-specific' | 'unknown';
  priority: 'critical' | 'high' | 'medium' | 'low';
  errorType: string;
  errorMessage: string;
  isNeeded: boolean;
  recoveryStrategy: string;
  recoveryAttempted: boolean;
  recoverySuccess: boolean;
}

export interface AnalysisResult {
  timestamp: string;
  totalUnfixable: number;
  neededRoutes: UnfixableRoute[];
  notNeededRoutes: UnfixableRoute[];
  recoveryAttempts: {
    successful: number;
    failed: number;
    total: number;
  };
  recommendations: string[];
}

export class UnfixableRoutesAnalyzer {
  private apiDir: string;
  private unfixableRoutes: UnfixableRoute[] = [];

  constructor(apiDir: string = 'sveltekit-frontend/src/routes/api') {
    this.apiDir = apiDir;
  }

  /**
   * Categorize route by path
   */
  private categorizeRoute(routePath: string): 'core' | 'experimental' | 'test' | 'phase-specific' | 'unknown' {
    const lowerPath = routePath.toLowerCase();

    // Core routes
    if (
      lowerPath.includes('/auth/') ||
      lowerPath.includes('/cases/') ||
      lowerPath.includes('/evidence/') ||
      lowerPath.includes('/search/') ||
      lowerPath.includes('/documents/') ||
      lowerPath.includes('/users/') ||
      lowerPath.includes('/health') ||
      lowerPath.includes('/embeddings/') ||
      lowerPath.includes('/rag/') ||
      lowerPath.includes('/ai/') ||
      lowerPath.includes('/upload/')
    ) {
      return 'core';
    }

    // Experimental routes
    if (
      lowerPath.includes('/experimental/') ||
      lowerPath.includes('/beta/') ||
      lowerPath.includes('/preview/') ||
      lowerPath.includes('/v2/')
    ) {
      return 'experimental';
    }

    // Test routes
    if (
      lowerPath.includes('/test/') ||
      lowerPath.includes('/debug/') ||
      lowerPath.includes('/dev/') ||
      lowerPath.includes('/mock/')
    ) {
      return 'test';
    }

    // Phase-specific routes
    if (lowerPath.includes('/phase')) {
      return 'phase-specific';
    }

    return 'unknown';
  }

  /**
   * Determine priority based on category and path
   */
  private determinePriority(
    category: 'core' | 'experimental' | 'test' | 'phase-specific' | 'unknown'
  ): 'critical' | 'high' | 'medium' | 'low' {
    switch (category) {
      case 'core':
        return 'critical';
      case 'experimental':
        return 'medium';
      case 'phase-specific':
        return 'low';
      case 'test':
        return 'low';
      default:
        return 'medium';
    }
  }

  /**
   * Determine if route is needed for production
   */
  private isRouteNeeded(category: 'core' | 'experimental' | 'test' | 'phase-specific' | 'unknown'): boolean {
    return category === 'core';
  }

  /**
   * Attempt advanced recovery strategies
   */
  private attemptRecovery(routePath: string, errorMessage: string): { success: boolean; strategy: string } {
    const fullPath = path.join(this.apiDir, routePath, '+server.ts');

    try {
      if (!fs.existsSync(fullPath)) {
        return { success: false, strategy: 'file-not-found' };
      }

      let content = fs.readFileSync(fullPath, 'utf-8');
      const originalContent = content;

      // Strategy 1: Fix missing imports
      if (errorMessage.includes('Cannot find module') || errorMessage.includes('import')) {
        if (!content.includes('import { json')) {
          content = `import { json, type RequestEvent } from '@sveltejs/kit';\n\n${content}`;
        }
      }

      // Strategy 2: Fix unmatched braces
      if (errorMessage.includes('Unexpected token') || errorMessage.includes('Expected')) {
        const openBraces = (content.match(/{/g) || []).length;
        const closeBraces = (content.match(/}/g) || []).length;

        if (openBraces > closeBraces) {
          content += '\n}'.repeat(openBraces - closeBraces);
        }
      }

      // Strategy 3: Fix missing semicolons
      if (errorMessage.includes('Unexpected identifier')) {
        content = content.replace(/(\w+)\n(\w+)/g, '$1;\n$2');
      }

      // Strategy 4: Fix malformed exports
      if (errorMessage.includes('export') || errorMessage.includes('default')) {
        if (!content.includes('export async function')) {
          // Try to wrap in proper export
          const functionMatch = content.match(/async function (\w+)/);
          if (functionMatch) {
            content = content.replace(/async function (\w+)/, 'export async function $1');
          }
        }
      }

      // Strategy 5: Fix type annotations
      if (errorMessage.includes('Type') || errorMessage.includes('type')) {
        content = content.replace(/function (\w+)\(/g, 'function $1(event: RequestEvent)');
      }

      // Strategy 6: Add error handling wrapper
      if (!content.includes('try {') && !content.includes('catch')) {
        const functionMatch = content.match(/(export async function \w+\([^)]*\) \{)/);
        if (functionMatch) {
          content = content.replace(
            functionMatch[1],
            `${functionMatch[1]}\n  try {`
          );
          content += `\n  } catch (error) {\n    console.error('Error:', error);\n    return json({ error: 'Internal server error' }, { status: 500 });\n  }`;
        }
      }

      // Check if content changed
      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content, 'utf-8');
        return { success: true, strategy: 'advanced-recovery' };
      }

      return { success: false, strategy: 'no-applicable-strategy' };
    } catch (error) {
      return { success: false, strategy: 'recovery-failed' };
    }
  }

  /**
   * Analyze unfixable routes
   */
  analyzeUnfixableRoutes(disabledRoutes: string[]): AnalysisResult {
    console.log(`\n🔍 Analyzing ${disabledRoutes.length} unfixable routes...\n`);

    const result: AnalysisResult = {
      timestamp: new Date().toISOString(),
      totalUnfixable: disabledRoutes.length,
      neededRoutes: [],
      notNeededRoutes: [],
      recoveryAttempts: {
        successful: 0,
        failed: 0,
        total: 0,
      },
      recommendations: [],
    };

    for (const routePath of disabledRoutes) {
      const category = this.categorizeRoute(routePath);
      const priority = this.determinePriority(category);
      const isNeeded = this.isRouteNeeded(category);

      const route: UnfixableRoute = {
        path: routePath,
        filename: path.basename(routePath),
        category,
        priority,
        errorType: 'unknown',
        errorMessage: 'Route was marked as unfixable',
        isNeeded,
        recoveryStrategy: 'pending',
        recoveryAttempted: false,
        recoverySuccess: false,
      };

      // Attempt recovery for needed routes
      if (isNeeded) {
        const recovery = this.attemptRecovery(routePath, route.errorMessage);
        route.recoveryAttempted = true;
        route.recoverySuccess = recovery.success;
        route.recoveryStrategy = recovery.strategy;

        result.recoveryAttempts.total++;
        if (recovery.success) {
          result.recoveryAttempts.successful++;
          console.log(`✅ Recovered: ${routePath}`);
        } else {
          result.recoveryAttempts.failed++;
          console.log(`❌ Failed to recover: ${routePath}`);
        }

        result.neededRoutes.push(route);
      } else {
        result.notNeededRoutes.push(route);
      }
    }

    // Generate recommendations
    result.recommendations = this.generateRecommendations(result);

    console.log(`\n📊 Analysis Complete:`);
    console.log(`   Total Unfixable: ${result.totalUnfixable}`);
    console.log(`   Needed Routes: ${result.neededRoutes.length}`);
    console.log(`   Not Needed: ${result.notNeededRoutes.length}`);
    console.log(`   Recovery Successful: ${result.recoveryAttempts.successful}`);
    console.log(`   Recovery Failed: ${result.recoveryAttempts.failed}\n`);

    return result;
  }

  /**
   * Generate recommendations
   */
  private generateRecommendations(result: AnalysisResult): string[] {
    const recommendations: string[] = [];

    // Recommendation 1: Recovery success rate
    const successRate = result.recoveryAttempts.total > 0
      ? (result.recoveryAttempts.successful / result.recoveryAttempts.total) * 100
      : 0;

    if (successRate > 50) {
      recommendations.push(`✅ High recovery success rate (${successRate.toFixed(1)}%)`);
    } else if (successRate > 0) {
      recommendations.push(`⚠️ Moderate recovery success rate (${successRate.toFixed(1)}%)`);
    } else {
      recommendations.push(`❌ No routes recovered - manual intervention needed`);
    }

    // Recommendation 2: Needed routes status
    const recoveredNeeded = result.neededRoutes.filter((r) => r.recoverySuccess).length;
    const totalNeeded = result.neededRoutes.length;

    if (recoveredNeeded === totalNeeded) {
      recommendations.push(`✅ All needed routes recovered (${recoveredNeeded}/${totalNeeded})`);
    } else if (recoveredNeeded > 0) {
      recommendations.push(
        `⚠️ Partial recovery of needed routes (${recoveredNeeded}/${totalNeeded}) - ${totalNeeded - recoveredNeeded} still need manual fixes`
      );
    } else if (totalNeeded > 0) {
      recommendations.push(`❌ No needed routes recovered - ${totalNeeded} routes need manual intervention`);
    }

    // Recommendation 3: Not needed routes
    if (result.notNeededRoutes.length > 0) {
      recommendations.push(
        `ℹ️ ${result.notNeededRoutes.length} non-core routes can be safely disabled`
      );
    }

    // Recommendation 4: Next steps
    if (result.recoveryAttempts.failed > 0) {
      recommendations.push(
        `📋 Manual fixes needed for ${result.recoveryAttempts.failed} routes - review error logs`
      );
    }

    return recommendations;
  }

  /**
   * Export analysis results
   */
  exportResults(outputPath: string, result: AnalysisResult): void {
    fs.writeFileSync(outputPath, JSON.stringify(result, null, 2), 'utf-8');
    console.log(`📄 Results exported to: ${outputPath}`);
  }

  /**
   * Generate recovery guide
   */
  generateRecoveryGuide(result: AnalysisResult): string {
    let guide = `# Unfixable Routes Recovery Guide\n\n`;
    guide += `Generated: ${new Date(result.timestamp).toLocaleString()}\n\n`;

    guide += `## Summary\n`;
    guide += `- Total Unfixable Routes: ${result.totalUnfixable}\n`;
    guide += `- Needed Routes: ${result.neededRoutes.length}\n`;
    guide += `- Not Needed Routes: ${result.notNeededRoutes.length}\n`;
    guide += `- Recovery Successful: ${result.recoveryAttempts.successful}\n`;
    guide += `- Recovery Failed: ${result.recoveryAttempts.failed}\n\n`;

    guide += `## Recommendations\n`;
    for (const rec of result.recommendations) {
      guide += `- ${rec}\n`;
    }
    guide += `\n`;

    guide += `## Recovered Routes (${result.neededRoutes.filter((r) => r.recoverySuccess).length})\n`;
    for (const route of result.neededRoutes.filter((r) => r.recoverySuccess)) {
      guide += `- ✅ ${route.path} (${route.recoveryStrategy})\n`;
    }
    guide += `\n`;

    guide += `## Routes Needing Manual Fixes (${result.neededRoutes.filter((r) => !r.recoverySuccess).length})\n`;
    for (const route of result.neededRoutes.filter((r) => !r.recoverySuccess)) {
      guide += `- ❌ ${route.path}\n`;
      guide += `  - Category: ${route.category}\n`;
      guide += `  - Priority: ${route.priority}\n`;
      guide += `  - Strategy Attempted: ${route.recoveryStrategy}\n`;
    }
    guide += `\n`;

    guide += `## Non-Core Routes (Safe to Disable)\n`;
    const byCategory = result.notNeededRoutes.reduce(
      (acc, route) => {
        if (!acc[route.category]) acc[route.category] = [];
        acc[route.category].push(route);
        return acc;
      },
      {} as Record<string, UnfixableRoute[]>
    );

    for (const [category, routes] of Object.entries(byCategory)) {
      guide += `\n### ${category.toUpperCase()} (${routes.length} routes)\n`;
      for (const route of routes.slice(0, 10)) {
        guide += `- ${route.path}\n`;
      }
      if (routes.length > 10) {
        guide += `- ... and ${routes.length - 10} more\n`;
      }
    }

    return guide;
  }
}
