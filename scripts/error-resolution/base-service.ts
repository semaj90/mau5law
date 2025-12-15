/**
 * Base service class with error handling and logging
 */

export abstract class BaseService {
  protected serviceName: string;

  constructor(serviceName: string) {
    this.serviceName = serviceName;
  }

  /**
   * Log info message
   */
  protected log(message: string, ...args: any[]): void {
    console.log(`[${this.serviceName}] ${message}`, ...args);
  }

  /**
   * Log error message
   */
  protected logError(message: string, error?: Error): void {
    console.error(`[${this.serviceName}] ERROR: ${message}`);
    if (error) {
      console.error(error);
    }
  }

  /**
   * Log warning message
   */
  protected logWarn(message: string, ...args: any[]): void {
    console.warn(`[${this.serviceName}] WARNING: ${message}`, ...args);
  }

  /**
   * Execute with error handling
   */
  protected async executeWithErrorHandling<T>(
    operation: () => Promise<T>,
    errorMessage: string
  ): Promise<T | null> {
    try {
      return await operation();
    } catch (error) {
      this.logError(errorMessage, error as Error);
      return null;
    }
  }

  /**
   * Retry operation with exponential backoff
   */
  protected async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    initialDelay: number = 1000
  ): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        if (attempt < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, attempt);
          this.logWarn(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
          await this.sleep(delay);
        }
      }
    }

    throw lastError || new Error('Operation failed after retries');
  }

  /**
   * Sleep for specified milliseconds
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Validate input is not null or undefined
   */
  protected validateInput<T>(value: T | null | undefined, name: string): T {
    if (value === null || value === undefined) {
      throw new Error(`${name} is required but was ${value}`);
    }
    return value;
  }

  /**
   * Validate file path exists
   */
  protected validateFilePath(filePath: string): void {
    if (!filePath || filePath.trim() === '') {
      throw new Error('File path is required');
    }
  }
}
