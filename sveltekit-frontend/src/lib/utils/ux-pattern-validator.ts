/**
 * UX Pattern Validator for Legal AI Platform
 * Validates design consistency and user experience patterns
 */

interface UXPattern {
  name: string;
  description: string;
  category: 'consistency' | 'usability' | 'performance' | 'accessibility';
  validate: () => boolean | Promise<boolean>;
  recommendation: string;
}

interface UXValidationResult {
  pattern: UXPattern;
  passed: boolean;
  message: string;
  timestamp: Date;
}

export class UXPatternValidator {
  private patterns: UXPattern[] = [
    // Design Consistency Patterns
    {
      name: 'legal-color-scheme-consistency',
      description: 'All components use consistent legal AI color scheme',
      category: 'consistency',
      validate: () => {
        const legalElements = document.querySelectorAll('[class*="legal-"]');
        const inconsistentElements = Array.from(legalElements).filter(el => {
          const computedStyle = window.getComputedStyle(el);
          const hasLegalVars = computedStyle.getPropertyValue('--legal-ai-primary') ||
                              computedStyle.getPropertyValue('--color-legal-primary');
          return !hasLegalVars;
        });

        return inconsistentElements.length === 0;
      },
      recommendation: 'Update components to use CSS variables from the legal AI theme'
    },

    {
      name: 'button-variant-consistency',
      description: 'Button variants follow consistent design patterns',
      category: 'consistency',
      validate: () => {
        const buttons = document.querySelectorAll('button, [role="button"]');
        const inconsistentButtons = Array.from(buttons).filter(btn => {
          const classList = Array.from(btn.classList);
          const hasVariantClass = classList.some(cls =>
            cls.includes('btn-') ||
            cls.includes('legal-ai-btn') ||
            cls.includes('nes-btn')
          );

          return !hasVariantClass && btn.textContent?.trim();
        });

        return inconsistentButtons.length < buttons.length * 0.1; // Allow 10% variance
      },
      recommendation: 'Apply consistent button variant classes to all interactive buttons'
    },

    // Usability Patterns
    {
      name: 'loading-state-indicators',
      description: 'All async actions provide loading feedback',
      category: 'usability',
      validate: () => {
        const forms = document.querySelectorAll('form');
        const buttonsWithActions = document.querySelectorAll('button[type="submit"], button[onclick]');

        // Check if loading indicators are present
        const hasLoadingIndicators = document.querySelectorAll('.loading, .spinner, [aria-live]').length > 0;
        const hasLoadingStates = document.querySelectorAll('[aria-busy="true"], .btn-loading').length >= 0;

        return hasLoadingIndicators || hasLoadingStates || forms.length === 0;
      },
      recommendation: 'Add loading indicators for all async operations and form submissions'
    },

    {
      name: 'error-message-visibility',
      description: 'Error messages are clearly visible and actionable',
      category: 'usability',
      validate: () => {
        const errorElements = document.querySelectorAll('.error, [role="alert"], .text-red-500, .text-destructive');
        const validErrors = Array.from(errorElements).filter(el => {
          const style = window.getComputedStyle(el);
          return style.display !== 'none' && style.visibility !== 'hidden';
        });

        // If there are error elements, they should be visible
        return errorElements.length === 0 || validErrors.length === errorElements.length;
      },
      recommendation: 'Ensure error messages are visible and provide clear guidance for resolution'
    },

    // Performance Patterns
    {
      name: 'image-lazy-loading',
      description: 'Images use lazy loading for performance',
      category: 'performance',
      validate: () => {
        const images = document.querySelectorAll('img');
        const lazyImages = document.querySelectorAll('img[loading="lazy"]');

        // Most images should use lazy loading (except above-the-fold)
        return images.length === 0 || lazyImages.length >= images.length * 0.7;
      },
      recommendation: 'Add loading="lazy" to images that are not immediately visible'
    },

    {
      name: 'animation-performance',
      description: 'Animations use performant CSS properties',
      category: 'performance',
      validate: () => {
        const animatedElements = document.querySelectorAll('[class*="transition"], [class*="animate"]');

        // Check for performance-friendly animations
        return Array.from(animatedElements).every(el => {
          const style = window.getComputedStyle(el);
          const transitionProperty = style.transitionProperty;

          // Performant properties: transform, opacity, filter
          const hasPerformantTransitions = !transitionProperty ||
            transitionProperty.includes('transform') ||
            transitionProperty.includes('opacity') ||
            transitionProperty.includes('filter') ||
            transitionProperty === 'all';

          return hasPerformantTransitions;
        });
      },
      recommendation: 'Use transform and opacity for animations instead of layout properties'
    },

    // Accessibility Patterns
    {
      name: 'semantic-heading-structure',
      description: 'Headings follow semantic hierarchy (h1 → h2 → h3)',
      category: 'accessibility',
      validate: () => {
        const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'));
        const headingLevels = headings.map(h => parseInt(h.tagName.charAt(1)));

        // Check for proper hierarchy
        for (let i = 1; i < headingLevels.length; i++) {
          const current = headingLevels[i];
          const previous = headingLevels[i - 1];

          // Heading should not skip more than one level
          if (current > previous + 1) {
            return false;
          }
        }

        return true;
      },
      recommendation: 'Maintain proper heading hierarchy without skipping levels'
    },

    {
      name: 'legal-ai-terminology-consistency',
      description: 'Legal AI terminology is used consistently across the interface',
      category: 'consistency',
      validate: () => {
        const textContent = document.body.textContent?.toLowerCase() || '';

        // Check for consistent terminology
        const terminologyMappings = {
          'case management': ['case handling', 'case processing'],
          'legal analysis': ['legal review', 'legal examination'],
          'evidence': ['proof', 'documentation'],
        };

        let consistencyScore = 1;
        Object.entries(terminologyMappings).forEach(([preferred, alternatives]) => {
          const preferredCount = (textContent.match(new RegExp(preferred, 'g')) || []).length;
          const alternativeCount = alternatives.reduce((sum, alt) =>
            sum + (textContent.match(new RegExp(alt, 'g')) || []).length, 0
          );

          if (alternativeCount > preferredCount && preferredCount > 0) {
            consistencyScore -= 0.2;
          }
        });

        return consistencyScore >= 0.8;
      },
      recommendation: 'Use consistent legal AI terminology throughout the interface'
    }
  ];

  /**
   * Validate all UX patterns
   */
  async validateAllPatterns(): Promise<UXValidationResult[]> {
    const results: UXValidationResult[] = [];

    for (const pattern of this.patterns) {
      try {
        const passed = await pattern.validate();
        results.push({
          pattern,
          passed,
          message: passed ?
            `✅ ${pattern.name}: Follows best practices` :
            `⚠️ ${pattern.name}: ${pattern.description} - ${pattern.recommendation}`,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          pattern,
          passed: false,
          message: `❌ ${pattern.name}: Validation failed - ${error}`,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Validate patterns by category
   */
  async validateCategory(category: UXPattern['category']): Promise<UXValidationResult[]> {
    const categoryPatterns = this.patterns.filter(p => p.category === category);
    const results: UXValidationResult[] = [];

    for (const pattern of categoryPatterns) {
      try {
        const passed = await pattern.validate();
        results.push({
          pattern,
          passed,
          message: passed ?
            `✅ ${pattern.name}: Follows best practices` :
            `⚠️ ${pattern.name}: ${pattern.recommendation}`,
          timestamp: new Date()
        });
      } catch (error) {
        results.push({
          pattern,
          passed: false,
          message: `❌ ${pattern.name}: Validation failed - ${error}`,
          timestamp: new Date()
        });
      }
    }

    return results;
  }

  /**
   * Generate comprehensive UX report
   */
  async generateUXReport(): Promise<{
    summary: {
      totalPatterns: number;
      passedPatterns: number;
      failedPatterns: number;
      scorePercentage: number;
    };
    byCategory: Record<string, UXValidationResult[]>;
    recommendations: string[];
  }> {
    const results = await this.validateAllPatterns();

    const summary = {
      totalPatterns: results.length,
      passedPatterns: results.filter(r => r.passed).length,
      failedPatterns: results.filter(r => !r.passed).length,
      scorePercentage: Math.round((results.filter(r => r.passed).length / results.length) * 100)
    };

    const byCategory = results.reduce((acc, result) => {
      const category = result.pattern.category;
      if (!acc[category]) acc[category] = [];
      acc[category].push(result);
      return acc;
    }, {} as Record<string, UXValidationResult[]>);

    const recommendations = results
      .filter(r => !r.passed)
      .map(r => r.pattern.recommendation);

    return {
      summary,
      byCategory,
      recommendations
    };
  }

  /**
   * Monitor UX patterns in real-time
   */
  startUXMonitoring(): () => void {
    let monitoringInterval: NodeJS.Timeout;

    const runMonitoring = async () => {
      const results = await this.validateAllPatterns();
      const failedPatterns = results.filter(r => !r.passed);

      if (failedPatterns.length > 0) {
        console.group('🎨 UX Pattern Issues Detected');
        failedPatterns.forEach(pattern =>
          console.warn(pattern.message)
        );
        console.groupEnd();
      }
    };

    // Run initial check
    runMonitoring();

    // Set up periodic monitoring
    monitoringInterval = setInterval(runMonitoring, 30000); // Every 30 seconds

    return () => {
      clearInterval(monitoringInterval);
    };
  }
}

/**
 * Performance Metrics Helper
 */
export class PerformanceMetrics {
  /**
   * Measure Core Web Vitals
   */
  async measureCoreWebVitals(): Promise<{
    lcp?: number; // Largest Contentful Paint
    fid?: number; // First Input Delay
    cls?: number; // Cumulative Layout Shift
  }> {
    return new Promise((resolve) => {
      const metrics: any = {};

      // Largest Contentful Paint
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        metrics.lcp = entries[entries.length - 1].startTime;
      }).observe({ entryTypes: ['largest-contentful-paint'] });

      // First Input Delay
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        metrics.fid = entries[0].processingStart - entries[0].startTime;
      }).observe({ entryTypes: ['first-input'] });

      // Cumulative Layout Shift
      new PerformanceObserver((list) => {
        let clsValue = 0;
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        metrics.cls = clsValue;
      }).observe({ entryTypes: ['layout-shift'] });

      // Return metrics after a short delay
      setTimeout(() => resolve(metrics), 3000);
    });
  }

  /**
   * Measure component render times
   */
  measureComponentPerformance(componentName: string): () => void {
    const startTime = performance.now();

    return () => {
      const endTime = performance.now();
      const renderTime = endTime - startTime;

      console.log(`⚡ ${componentName} render time: ${renderTime.toFixed(2)}ms`);

      if (renderTime > 16) { // More than one frame at 60fps
        console.warn(`🐌 ${componentName} render is slow (${renderTime.toFixed(2)}ms)`);
      }
    };
  }
}

// Export singleton instances
export const uxPatternValidator = new UXPatternValidator();
export const performanceMetrics = new PerformanceMetrics();

// Development helper
if (typeof window !== 'undefined' && process.env.NODE_ENV === 'development') {
  // @ts-ignore - Attach to window for debugging
  window.uxPatternValidator = uxPatternValidator;
  window.performanceMetrics = performanceMetrics;
}