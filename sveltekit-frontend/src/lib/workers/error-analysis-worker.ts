// ======================================================================
// ERROR ANALYSIS WORKER
// Web Worker for parallel TypeScript error analysis
// ======================================================================

export interface ErrorContext {
  id: string;
  file: string;
  line: number;
  column?: number;
  message: string;
  code: string;
  severity: 'error' | 'warning' | 'info';
  category: 'syntax' | 'type' | 'import' | 'semantic';
  confidence: number;
  suggestions: string[];
  relatedFiles: string[];
  fixable: boolean;
}

export interface ErrorAnalysisResult {
  errorId: string;
  priority: number;
  fixable: boolean;
  complexity: number;
  suggestionCount: number;
  autoFixStrategy: string;
  estimatedTime: number;
  dependencies: string[];
}

class ErrorAnalysisWorkerEngine {
  private errorPatterns = new Map<string, RegExp>();
  private fixStrategies = new Map<string, string>();
  
  constructor() {
    this.initializePatterns();
    this.initializeStrategies();
  }

  private initializePatterns() {
    // Common TypeScript error patterns
    this.errorPatterns.set('1434', /Unexpected keyword or identifier/);
    this.errorPatterns.set('2304', /Cannot find name '([^']+)'/);
    this.errorPatterns.set('2307', /Cannot find module '([^']+)'/);
    this.errorPatterns.set('2457', /Type alias name cannot be '([^']+)'/);
    this.errorPatterns.set('1005', /';' expected/);
    this.errorPatterns.set('1128', /Declaration or statement expected/);
    this.errorPatterns.set('2339', /Property '([^']+)' does not exist/);
    this.errorPatterns.set('2322', /Type '([^']+)' is not assignable to type '([^']+)'/);
  }

  private initializeStrategies() {
    // Fix strategies for common errors
    this.fixStrategies.set('1434', 'Remove unexpected token');
    this.fixStrategies.set('2304', 'Add missing import or declaration');
    this.fixStrategies.set('2307', 'Fix module path or install dependency');
    this.fixStrategies.set('2457', 'Rename type alias');
    this.fixStrategies.set('1005', 'Add missing semicolon');
    this.fixStrategies.set('1128', 'Add missing declaration');
    this.fixStrategies.set('2339', 'Add property or fix property name');
    this.fixStrategies.set('2322', 'Fix type mismatch');
  }

  analyzeErrors(errors: ErrorContext[]): ErrorAnalysisResult[] {
    const results: ErrorAnalysisResult[] = [];
    
    for (const error of errors) {
      const result = this.analyzeError(error);
      results.push(result);
    }
    
    return results;
  }

  private analyzeError(error: ErrorContext): ErrorAnalysisResult {
    const codeNumber = error.code.replace('TS', '');
    
    return {
      errorId: error.id,
      priority: this.calculatePriority(error),
      fixable: this.isErrorFixable(codeNumber),
      complexity: this.estimateComplexity(error),
      suggestionCount: this.generateSuggestionCount(error),
      autoFixStrategy: this.getFixStrategy(codeNumber),
      estimatedTime: this.estimateFixTime(error),
      dependencies: this.extractDependencies(error)
    };
  }

  private calculatePriority(error: ErrorContext): number {
    let priority = error.confidence;
    
    // Boost priority for high-impact errors
    if (error.severity === 'error') priority += 0.3;
    if (error.category === 'syntax') priority += 0.2;
    if (error.fixable) priority += 0.1;
    
    // Reduce priority for complex errors
    if (error.category === 'semantic') priority -= 0.2;
    if (error.relatedFiles.length > 3) priority -= 0.1;
    
    return Math.max(0, Math.min(1, priority));
  }

  private isErrorFixable(code: string): boolean {
    const fixableCodes = new Set([
      '1434', // Unexpected keyword
      '2304', // Cannot find name
      '2307', // Cannot find module
      '2457', // Type alias name cannot be
      '1005', // Semicolon expected
      '1128', // Declaration expected
      '1109', // Expression expected
      '1003', // Identifier expected
    ]);
    
    return fixableCodes.has(code);
  }

  private estimateComplexity(error: ErrorContext): number {
    let complexity = 1;
    
    // Base complexity by category
    switch (error.category) {
      case 'syntax':
        complexity = 1;
        break;
      case 'import':
        complexity = 1.5;
        break;
      case 'type':
        complexity = 2;
        break;
      case 'semantic':
        complexity = 3;
        break;
    }
    
    // Adjust for confidence
    if (error.confidence < 0.5) complexity += 1;
    if (error.confidence > 0.8) complexity -= 0.5;
    
    // Adjust for file dependencies
    complexity += error.relatedFiles.length * 0.3;
    
    return Math.max(1, complexity);
  }

  private generateSuggestionCount(error: ErrorContext): number {
    const code = error.code.replace('TS', '');
    
    // Common errors have more suggestions
    const commonErrors = new Set(['1434', '2304', '2307', '1005']);
    if (commonErrors.has(code)) return 3;
    
    // Type errors have moderate suggestions
    if (code.startsWith('23')) return 2;
    
    // Syntax errors have simple suggestions
    if (code.startsWith('10')) return 1;
    
    return 1;
  }

  private getFixStrategy(code: string): string {
    return this.fixStrategies.get(code) || 'Manual review required';
  }

  private estimateFixTime(error: ErrorContext): number {
    const baseTime = this.estimateComplexity(error);
    
    // Quick fixes for common errors
    const quickFixes = new Set(['1434', '1005', '1128']);
    if (quickFixes.has(error.code.replace('TS', ''))) return 1;
    
    // Medium time for imports and declarations
    if (error.category === 'import') return 2;
    if (error.category === 'type') return 3;
    
    // Longer time for semantic issues
    if (error.category === 'semantic') return 5;
    
    return Math.max(1, baseTime);
  }

  private extractDependencies(error: ErrorContext): string[] {
    const dependencies: string[] = [];
    
    // Extract module names from import errors
    if (error.code === 'TS2307') {
      const moduleMatch = error.message.match(/'([^']+)'/);
      if (moduleMatch) {
        dependencies.push(moduleMatch[1]);
      }
    }
    
    // Extract identifier names from type errors
    if (error.code === 'TS2304') {
      const nameMatch = error.message.match(/'([^']+)'/);
      if (nameMatch) {
        dependencies.push(`identifier:${nameMatch[1]}`);
      }
    }
    
    // Add file itself as dependency
    dependencies.push(error.file);
    
    return Array.from(new Set(dependencies));
  }
}

// ======================================================================
// WORKER MESSAGE HANDLING
// ======================================================================

const analysisEngine = new ErrorAnalysisWorkerEngine();

self.addEventListener('message', (event: MessageEvent) => {
  const { type, errors, id } = event.data;
  
  try {
    switch (type) {
      case 'analyze_errors':
        const results = analysisEngine.analyzeErrors(errors);
        
        self.postMessage({
          type: 'analysis_complete',
          results,
          id,
          timestamp: Date.now()
        });
        break;
        
      case 'ping':
        self.postMessage({
          type: 'pong',
          timestamp: Date.now()
        });
        break;
        
      default:
        throw new Error(`Unknown message type: ${type}`);
    }
  } catch (error: any) {
    self.postMessage({
      type: 'error',
      error: error instanceof Error ? error.message : String(error),
      id
    });
  }
});

// Signal that worker is ready
self.postMessage({
  type: 'worker_ready',
  timestamp: Date.now()
});

export {};