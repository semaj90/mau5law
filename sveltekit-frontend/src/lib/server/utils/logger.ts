// Production-ready logging system for the legal AI platform
// Structured logging with different levels and async storage

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  FATAL = 4
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  component: string;
  userId?: string;
  conversationId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  performance?: {
    duration: number;
    memoryUsage: number;
  };
}

interface LoggerConfig {
  level: LogLevel;
  enableConsole: boolean;
  enableFile: boolean;
  enableDatabase: boolean;
  maxRetries: number;
}

class Logger {
  private config: LoggerConfig;
  private logQueue: LogEntry[] = [];
  private isProcessing = false;

  constructor(config: Partial<LoggerConfig> = {}) {
    this.config = {
      level: LogLevel.INFO,
      enableConsole: true,
      enableFile: false,
      enableDatabase: true,
      maxRetries: 3,
      ...config
    };

    // Process logs periodically
    setInterval(() => {
      this.processLogQueue();
    }, 5000);

    // Process logs on exit
    if (typeof process !== 'undefined') {
      process.on('exit', () => {
        this.processLogQueue();
      });
    }
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level;
  }

  private async processLogQueue(): Promise<void> {
    if (this.isProcessing || this.logQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const logsToProcess = [...this.logQueue];
    this.logQueue = [];

    try {
      if (this.config.enableDatabase) {
        await this.storeLogs(logsToProcess);
      }

      if (this.config.enableFile) {
        await this.writeToFile(logsToProcess);
      }
    } catch (error) {
      // If logging fails, re-queue with limited retries
      console.error('Log processing failed:', error);
      
      const retriableLogs = logsToProcess.filter(log => 
        (log.metadata?.retryCount || 0) < this.config.maxRetries
      );
      
      retriableLogs.forEach(log => {
        log.metadata = log.metadata || {};
        log.metadata.retryCount = (log.metadata.retryCount || 0) + 1;
      });
      
      this.logQueue.unshift(...retriableLogs);
    } finally {
      this.isProcessing = false;
    }
  }

  private async storeLogs(logs: LogEntry[]): Promise<void> {
    try {
      // Import database connection here to avoid circular dependencies
      const { db, sql } = await import('$lib/server/db');
      
      for (const log of logs) {
        try {
          await db.execute(
            sql`INSERT INTO system_logs (
              timestamp,
              level,
              message,
              component,
              user_id,
              conversation_id,
              request_id,
              metadata,
              error_data,
              performance_data
            ) VALUES (
              ${log.timestamp},
              ${log.level},
              ${log.message},
              ${log.component},
              ${log.userId || null},
              ${log.conversationId || null},
              ${log.requestId || null},
              ${JSON.stringify(log.metadata || {})},
              ${log.error ? JSON.stringify(log.error) : null},
              ${log.performance ? JSON.stringify(log.performance) : null}
            )`
          );
        } catch (dbError) {
          // If individual log fails, continue with others
          console.warn('Failed to store individual log:', dbError);
        }
      }
    } catch (error) {
      throw new Error(`Database logging failed: ${error.message}`);
    }
  }

  private async writeToFile(logs: LogEntry[]): Promise<void> {
    // File logging implementation would go here
    // For now, we'll skip file logging in the browser environment
    if (typeof window !== 'undefined') {
      return;
    }
    
    try {
      const fs = await import('fs/promises');
      const path = await import('path');
      
      const logDir = path.join(process.cwd(), 'logs');
      const logFile = path.join(logDir, `chat-api-${new Date().toISOString().split('T')[0]}.log`);
      
      // Ensure log directory exists
      try {
        await fs.mkdir(logDir, { recursive: true });
      } catch (dirError) {
        // Directory might already exist
      }
      
      const logLines = logs.map(log => JSON.stringify(log)).join('\n') + '\n';
      await fs.appendFile(logFile, logLines);
    } catch (error) {
      throw new Error(`File logging failed: ${error.message}`);
    }
  }

  private formatForConsole(entry: LogEntry): string {
    const levelName = LogLevel[entry.level];
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] ${levelName} [${entry.component}]`;
    
    let message = `${prefix} ${entry.message}`;
    
    if (entry.requestId) {
      message += ` (req: ${entry.requestId.slice(-8)})`;
    }
    
    if (entry.conversationId) {
      message += ` (conv: ${entry.conversationId.slice(-8)})`;
    }
    
    if (entry.performance) {
      message += ` (${entry.performance.duration}ms, ${Math.round(entry.performance.memoryUsage / 1024 / 1024)}MB)`;
    }
    
    return message;
  }

  private log(level: LogLevel, message: string, component: string, metadata?: Record<string, any>): void {
    if (!this.shouldLog(level)) {
      return;
    }

    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      component,
      metadata: { ...metadata }
    };

    // Add performance data if available
    if (typeof process !== 'undefined' && process.memoryUsage) {
      const usage = process.memoryUsage();
      entry.performance = {
        duration: metadata?.duration || 0,
        memoryUsage: usage.heapUsed
      };
    }

    // Console logging (immediate)
    if (this.config.enableConsole) {
      const formatted = this.formatForConsole(entry);
      
      switch (level) {
        case LogLevel.DEBUG:
          console.debug(formatted);
          break;
        case LogLevel.INFO:
          console.info(formatted);
          break;
        case LogLevel.WARN:
          console.warn(formatted);
          break;
        case LogLevel.ERROR:
        case LogLevel.FATAL:
          console.error(formatted);
          if (entry.error) {
            console.error('Error details:', entry.error);
          }
          break;
      }
    }

    // Queue for async processing
    this.logQueue.push(entry);
  }

  debug(message: string, component: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.DEBUG, message, component, metadata);
  }

  info(message: string, component: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.INFO, message, component, metadata);
  }

  warn(message: string, component: string, metadata?: Record<string, any>): void {
    this.log(LogLevel.WARN, message, component, metadata);
  }

  error(message: string, component: string, error?: Error, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.ERROR,
      message,
      component,
      metadata: { ...metadata },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    if (this.config.enableConsole) {
      console.error(this.formatForConsole(entry));
      if (error) {
        console.error('Error details:', error);
      }
    }

    this.logQueue.push(entry);
  }

  fatal(message: string, component: string, error?: Error, metadata?: Record<string, any>): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level: LogLevel.FATAL,
      message,
      component,
      metadata: { ...metadata },
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack
      } : undefined
    };

    if (this.config.enableConsole) {
      console.error(this.formatForConsole(entry));
      if (error) {
        console.error('FATAL ERROR:', error);
      }
    }

    this.logQueue.push(entry);
    
    // Force immediate processing for fatal errors
    this.processLogQueue();
  }

  // Utility methods for request tracking
  withRequestId(requestId: string) {
    return {
      debug: (message: string, component: string, metadata?: Record<string, any>) => 
        this.debug(message, component, { ...metadata, requestId }),
      info: (message: string, component: string, metadata?: Record<string, any>) => 
        this.info(message, component, { ...metadata, requestId }),
      warn: (message: string, component: string, metadata?: Record<string, any>) => 
        this.warn(message, component, { ...metadata, requestId }),
      error: (message: string, component: string, error?: Error, metadata?: Record<string, any>) => 
        this.error(message, component, error, { ...metadata, requestId }),
      fatal: (message: string, component: string, error?: Error, metadata?: Record<string, any>) => 
        this.fatal(message, component, error, { ...metadata, requestId })
    };
  }

  withConversation(conversationId: string) {
    return {
      debug: (message: string, component: string, metadata?: Record<string, any>) => 
        this.debug(message, component, { ...metadata, conversationId }),
      info: (message: string, component: string, metadata?: Record<string, any>) => 
        this.info(message, component, { ...metadata, conversationId }),
      warn: (message: string, component: string, metadata?: Record<string, any>) => 
        this.warn(message, component, { ...metadata, conversationId }),
      error: (message: string, component: string, error?: Error, metadata?: Record<string, any>) => 
        this.error(message, component, error, { ...metadata, conversationId }),
      fatal: (message: string, component: string, error?: Error, metadata?: Record<string, any>) => 
        this.fatal(message, component, error, { ...metadata, conversationId })
    };
  }

  // Create system logs table if it doesn't exist
  async initializeLogTable(): Promise<void> {
    try {
      const { db, sql } = await import('$lib/server/db');
      
      await db.execute(
        sql`CREATE TABLE IF NOT EXISTS system_logs (
          id SERIAL PRIMARY KEY,
          timestamp TIMESTAMP NOT NULL,
          level INTEGER NOT NULL,
          message TEXT NOT NULL,
          component VARCHAR(100) NOT NULL,
          user_id VARCHAR(255),
          conversation_id VARCHAR(255),
          request_id VARCHAR(255),
          metadata JSONB DEFAULT '{}',
          error_data JSONB,
          performance_data JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )`
      );
      
      // Create indexes for better query performance
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_system_logs_timestamp 
        ON system_logs (timestamp)`
      );
      
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_system_logs_level 
        ON system_logs (level)`
      );
      
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_system_logs_component 
        ON system_logs (component)`
      );
      
      await db.execute(
        sql`CREATE INDEX IF NOT EXISTS idx_system_logs_conversation 
        ON system_logs (conversation_id)`
      );
      
      console.log('System logs table initialized successfully');
    } catch (error) {
      console.error('Failed to initialize system logs table:', error);
    }
  }
}

// Global logger instance
export const logger = new Logger({
  level: LogLevel.INFO,
  enableConsole: true,
  enableDatabase: true,
  enableFile: false
});

// Initialize logs table on startup
logger.initializeLogTable();