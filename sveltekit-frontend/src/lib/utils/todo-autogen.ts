import { getLocalOllamaUrl } from "$lib/constants/local-llm-config";

/**
 * Automated TODO Generation & LLM Misfire Tracking
 * Captures and categorizes development issues for AI review
 */

import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

export interface TodoEntry {
  id: string;
  timestamp: string;
  category: 'llm-misfire' | 'typescript' | 'runtime' | 'performance' | 'memory';
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  stackTrace?: string;
  context?: Record<string, any>;
  llmAttempts?: number;
  memoryUsage?: {
    heapUsed: number;
    heapTotal: number;
    external: number;
  };
}

export interface LLMMisfireData {
  model: string;
  prompt: string;
  error: string;
  tokenCount?: number;
  retryCount: number;
  gpuMemory?: number;
}

class TodoAutogen {
  private readonly todoBasePath = join(process.cwd(), 'todos');
  private readonly unresolvedPath = join(this.todoBasePath, 'unresolved');
  
  constructor() {
    this.ensureDirectories();
  }

  private async ensureDirectories() {
    const dirs = [
      this.todoBasePath,
      this.unresolvedPath,
      join(this.unresolvedPath, 'llm-misfires'),
      join(this.unresolvedPath, 'typescript'),
      join(this.unresolvedPath, 'runtime'),
      join(this.unresolvedPath, 'performance'),
      join(this.todoBasePath, 'autogen'),
      join(this.todoBasePath, 'crewai'),
      join(this.todoBasePath, 'resolved')
    ];

    for (const dir of dirs) {
      try {
        await mkdir(dir, { recursive: true });
      } catch (error: any) {
        // Directory exists or creation failed
      }
    }
  }

  /**
   * Log LLM misfire for review
   */
  async logLLMMisfire(data: LLMMisfireData, context?: unknown): Promise<string> {
    const id = `llm-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const todo: TodoEntry = {
      id,
      timestamp: new Date().toISOString(),
      category: 'llm-misfire',
      severity: data.retryCount > 3 ? 'critical' : 'high',
      title: `LLM Failure: ${data.model} - ${data.error.substring(0, 50)}...`,
      description: `Model: ${data.model}\nError: ${data.error}\nPrompt length: ${data.prompt.length}\nRetries: ${data.retryCount}`,
      context: {
        ...data,
        timestamp: Date.now(),
        memoryUsage: this.getMemoryUsage()
      }
    };

    await this.saveTodo(todo, 'llm-misfires');
    
    // Auto-queue for CrewAI review if critical
    if (todo.severity === 'critical') {
      await this.queueForAIReview(todo, 'crewai');
    }

    return id;
  }

  /**
   * Log TypeScript compilation errors
   */
  async logTypeScriptError(file: string, error: string, lineNumber?: number): Promise<string> {
    const id = `ts-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const todo: TodoEntry = {
      id,
      timestamp: new Date().toISOString(),
      category: 'typescript',
      severity: error.includes('error TS') ? 'high' : 'medium',
      title: `TypeScript Error: ${file}${lineNumber ? `:${lineNumber}` : ''}`,
      description: error,
      context: {
        file,
        lineNumber,
        memoryUsage: this.getMemoryUsage()
      }
    };

    await this.saveTodo(todo, 'typescript');
    return id;
  }

  /**
   * Log runtime exceptions
   */
  async logRuntimeError(error: Error, context?: unknown): Promise<string> {
    const id = `runtime-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const todo: TodoEntry = {
      id,
      timestamp: new Date().toISOString(),
      category: 'runtime',
      severity: 'high',
      title: `Runtime Error: ${error.name}`,
      description: error.message,
      stackTrace: error.stack,
      context: {
        ...context,
        memoryUsage: this.getMemoryUsage()
      }
    };

    await this.saveTodo(todo, 'runtime');
    return id;
  }

  /**
   * Log performance/memory issues
   */
  async logPerformanceIssue(type: 'memory' | 'gpu' | 'timeout', details: any): Promise<string> {
    const id = `perf-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const todo: TodoEntry = {
      id,
      timestamp: new Date().toISOString(),
      category: 'performance',
      severity: type === 'memory' ? 'critical' : 'medium',
      title: `Performance Issue: ${type.toUpperCase()}`,
      description: JSON.stringify(details, null, 2),
      context: {
        type,
        details,
        memoryUsage: this.getMemoryUsage()
      }
    };

    await this.saveTodo(todo, 'performance');
    return id;
  }

  /**
   * Save TODO entry to appropriate directory
   */
  private async saveTodo(todo: TodoEntry, category: string): Promise<void> {
    const filename = `${todo.id}.json`;
    const filepath = join(this.unresolvedPath, category, filename);
    
    try {
      await writeFile(filepath, JSON.stringify(todo, null, 2));
      console.log(`📝 TODO logged: ${filepath}`);
    } catch (error: any) {
      console.error('Failed to save TODO:', error);
    }
  }

  /**
   * Queue TODO for AI review
   */
  private async queueForAIReview(todo: TodoEntry, agent: 'claude' | 'crewai' | 'autogen'): Promise<void> {
    const queueFile = join(this.todoBasePath, agent, `queue-${Date.now()}.json`);
    
    const queueEntry = {
      todoId: todo.id,
      priority: todo.severity,
      timestamp: new Date().toISOString(),
      instructions: this.generateReviewInstructions(todo)
    };

    try {
      await writeFile(queueFile, JSON.stringify(queueEntry, null, 2));
      console.log(`🤖 Queued for ${agent} review: ${todo.id}`);
    } catch (error: any) {
      console.error(`Failed to queue for ${agent}:`, error);
    }
  }

  /**
   * Generate AI review instructions based on TODO type
   */
  private generateReviewInstructions(todo: TodoEntry): string {
    switch (todo.category) {
      case 'llm-misfire':
        return `Analyze LLM failure patterns and suggest retry strategies, prompt optimization, or model switching. Focus on local Ollama GPU usage only.`;
      
      case 'typescript':
        return `Review TypeScript error and provide precise fix. Consider type safety, modern patterns, and SvelteKit 2 compatibility.`;
      
      case 'runtime':
        return `Investigate runtime exception, identify root cause, and suggest defensive programming patterns.`;
      
      case 'performance':
        return `Analyze performance bottleneck and recommend optimizations using worker threads, WASM, or caching strategies.`;
      
      default:
        return `General review and resolution suggestions for this development issue.`;
    }
  }

  /**
   * Get current memory usage
   */
  private getMemoryUsage() {
    if (typeof process !== 'undefined' && process.memoryUsage) {
      return process.memoryUsage();
    }
    return { heapUsed: 0, heapTotal: 0, external: 0 };
  }
}

// Singleton instance
export const todoAutogen = new TodoAutogen();
;
/**
 * LLM Retry Logic with Automated TODO Generation
 */
export async function retryLLMCall<T>(
  llmCall: () => Promise<T>,
  model: string,
  prompt: string,
  maxRetries = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await llmCall();
    } catch (error: any) {
      lastError = error as Error;
      
      console.warn(`🔄 LLM retry ${attempt}/${maxRetries}:`, error.message);
      
      // Log misfire if multiple attempts
      if (attempt >= 2) {
        await todoAutogen.logLLMMisfire({
          model,
          prompt: prompt.substring(0, 500) + '...', // Truncate for logging
          error: error.message,
          retryCount: attempt
        });
      }
      
      // Exponential backoff with jitter
      const delay = Math.min(2000 * Math.pow(2, attempt - 1), 10000);
      const jitter = Math.random() * 1000;
      await new Promise((resolve: any) => setTimeout(resolve, delay + jitter));
    }
  }
  
  // Final attempt failed - log critical misfire
  await todoAutogen.logLLMMisfire({
    model,
    prompt: prompt.substring(0, 500) + '...',
    error: lastError.message,
    retryCount: maxRetries
  });
  
  throw lastError;
}

/**
 * Memory usage monitor
 */
export function startMemoryMonitoring() {
  if (typeof process === 'undefined') return;
  
  const interval = setInterval(async () => {
    const usage = process.memoryUsage();
    const heapUsedMB = usage.heapUsed / 1024 / 1024;
    
    // Log if memory usage exceeds threshold
    if (heapUsedMB > 2048) { // 2GB threshold
      await todoAutogen.logPerformanceIssue('memory', {
        heapUsedMB,
        heapTotalMB: usage.heapTotal / 1024 / 1024,
        externalMB: usage.external / 1024 / 1024,
        threshold: 2048
      });
    }
  }, 30000); // Check every 30 seconds
  
  // Cleanup on process exit
  process.on('beforeExit', () => clearInterval(interval));
}