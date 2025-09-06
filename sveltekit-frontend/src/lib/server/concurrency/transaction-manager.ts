/**
 * Transaction Manager with Advisory Locks for Legal AI Platform
 * Ensures ACID properties for critical legal operations
 */

import { sql } from '$lib/database/connection';
import { advisoryLocks, type LockType, type LockMode, LOCK_MODES } from './advisory-locks';
import { randomUUID } from 'crypto';

export interface TransactionOptions {
  isolationLevel?: 'READ UNCOMMITTED' | 'READ COMMITTED' | 'REPEATABLE READ' | 'SERIALIZABLE';
  timeout?: number;
  userId?: string;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface TransactionContext {
  transactionId: string;
  startTime: Date;
  userId?: string;
  sessionId?: string;
  locks: Array<{ entityType: LockType; entityId: string; mode: LockMode }>;
  metadata?: Record<string, any>;
}

export class TransactionManager {
  private activeTransactions = new Map<string, TransactionContext>();

  /**
   * Execute a function within a database transaction with advisory locks
   */
  async withTransaction<T>(
    fn: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    const {
      isolationLevel = 'READ COMMITTED',
      timeout = 30000,
      userId,
      sessionId,
      metadata
    } = options;

    const transactionId = randomUUID();
    const context: TransactionContext = {
      transactionId,
      startTime: new Date(),
      userId,
      sessionId,
      locks: [],
      metadata
    };

    this.activeTransactions.set(transactionId, context);

    console.log(`📝 Starting transaction ${transactionId} with ${isolationLevel} isolation`);

    try {
      return await sql.begin(async (tx) => {
        // Set isolation level
        await tx`SET TRANSACTION ISOLATION LEVEL ${sql(isolationLevel)}`;
        
        // Set statement timeout
        if (timeout) {
          await tx`SET statement_timeout = ${timeout}`;
        }

        try {
          const result = await fn(context);
          console.log(`✅ Transaction ${transactionId} completed successfully`);
          return result;
        } catch (error) {
          console.error(`❌ Transaction ${transactionId} failed:`, error);
          throw error;
        }
      });

    } finally {
      // Clean up locks and transaction context
      await this.cleanupTransaction(transactionId);
    }
  }

  /**
   * Execute with lock acquisition inside transaction
   */
  async withTransactionAndLock<T>(
    entityType: LockType,
    entityId: string,
    fn: (ctx: TransactionContext) => Promise<T>,
    mode: LockMode = LOCK_MODES.EXCLUSIVE,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransaction(async (ctx) => {
      // Acquire lock within transaction
      const lock = await advisoryLocks.acquireLock(entityType, entityId, mode, {
        userId: ctx.userId,
        sessionId: ctx.sessionId,
        timeout: options.timeout
      });

      if (!lock) {
        throw new Error(`Failed to acquire ${mode} lock for ${entityType} ${entityId}`);
      }

      // Track lock in context
      ctx.locks.push({ entityType, entityId, mode });

      try {
        return await fn(ctx);
      } finally {
        // Lock will be released when transaction ends
        await advisoryLocks.releaseLock(entityType, entityId, mode);
      }
    }, options);
  }

  /**
   * Legal AI specific: Chain of Custody transaction
   * Ensures atomic updates to evidence custody records
   */
  async withCustodyTransaction<T>(
    evidenceId: string,
    fn: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransactionAndLock(
      'evidence',
      evidenceId,
      fn,
      LOCK_MODES.EXCLUSIVE,
      {
        ...options,
        isolationLevel: 'SERIALIZABLE', // Highest isolation for custody
        metadata: { 
          ...options.metadata, 
          operationType: 'chain_of_custody',
          evidenceId 
        }
      }
    );
  }

  /**
   * Legal AI specific: Case modification transaction
   * Prevents concurrent case updates that could cause inconsistencies
   */
  async withCaseTransaction<T>(
    caseId: string,
    fn: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransactionAndLock(
      'case',
      caseId,
      fn,
      LOCK_MODES.EXCLUSIVE,
      {
        ...options,
        isolationLevel: 'REPEATABLE READ',
        metadata: { 
          ...options.metadata, 
          operationType: 'case_modification',
          caseId 
        }
      }
    );
  }

  /**
   * Legal AI specific: Document analysis transaction
   * Allows concurrent reads but exclusive writes for AI analysis
   */
  async withDocumentAnalysisTransaction<T>(
    documentId: string,
    fn: (ctx: TransactionContext) => Promise<T>,
    isReadOnly: boolean = false,
    options: TransactionOptions = {}
  ): Promise<T> {
    const mode = isReadOnly ? LOCK_MODES.SHARED : LOCK_MODES.EXCLUSIVE;
    
    return this.withTransactionAndLock(
      'document',
      documentId,
      fn,
      mode,
      {
        ...options,
        isolationLevel: isReadOnly ? 'READ COMMITTED' : 'REPEATABLE READ',
        metadata: { 
          ...options.metadata, 
          operationType: 'document_analysis',
          documentId,
          readOnly: isReadOnly
        }
      }
    );
  }

  /**
   * Legal AI specific: Vector index update transaction
   * Prevents concurrent vector operations that could corrupt indexes
   */
  async withVectorIndexTransaction<T>(
    indexName: string,
    fn: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransactionAndLock(
      'vector_index',
      indexName,
      fn,
      LOCK_MODES.EXCLUSIVE,
      {
        ...options,
        isolationLevel: 'SERIALIZABLE',
        timeout: 60000, // Vector operations can take longer
        metadata: { 
          ...options.metadata, 
          operationType: 'vector_index_update',
          indexName 
        }
      }
    );
  }

  /**
   * Batch operation with multiple entity locks
   */
  async withMultiEntityTransaction<T>(
    entities: Array<{ type: LockType; id: string; mode?: LockMode }>,
    fn: (ctx: TransactionContext) => Promise<T>,
    options: TransactionOptions = {}
  ): Promise<T> {
    return this.withTransaction(async (ctx) => {
      // Sort entities to prevent deadlocks (consistent ordering)
      const sortedEntities = [...entities].sort((a, b) => 
        `${a.type}:${a.id}`.localeCompare(`${b.type}:${b.id}`)
      );

      // Acquire all locks
      for (const entity of sortedEntities) {
        const lock = await advisoryLocks.acquireLock(
          entity.type,
          entity.id,
          entity.mode || LOCK_MODES.EXCLUSIVE,
          {
            userId: ctx.userId,
            sessionId: ctx.sessionId,
            timeout: options.timeout
          }
        );

        if (!lock) {
          throw new Error(`Failed to acquire lock for ${entity.type} ${entity.id}`);
        }

        ctx.locks.push({ 
          entityType: entity.type, 
          entityId: entity.id, 
          mode: entity.mode || LOCK_MODES.EXCLUSIVE 
        });
      }

      try {
        return await fn(ctx);
      } finally {
        // Release locks in reverse order
        for (const lock of ctx.locks.reverse()) {
          await advisoryLocks.releaseLock(lock.entityType, lock.entityId, lock.mode);
        }
      }
    }, options);
  }

  /**
   * Get active transaction information
   */
  getActiveTransactions(): TransactionContext[] {
    return Array.from(this.activeTransactions.values());
  }

  /**
   * Get transaction by ID
   */
  getTransaction(transactionId: string): TransactionContext | undefined {
    return this.activeTransactions.get(transactionId);
  }

  /**
   * Clean up expired transactions
   */
  async cleanupExpiredTransactions(): Promise<number> {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [id, ctx] of this.activeTransactions.entries()) {
      const age = now - ctx.startTime.getTime();
      
      // Clean up transactions older than 5 minutes
      if (age > 300000) {
        await this.cleanupTransaction(id);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired transactions`);
    }

    return cleanedCount;
  }

  /**
   * Clean up a specific transaction
   */
  private async cleanupTransaction(transactionId: string): Promise<void> {
    const ctx = this.activeTransactions.get(transactionId);
    if (!ctx) return;

    console.log(`🧹 Cleaning up transaction ${transactionId}`);

    // Release any locks that might still be held
    for (const lock of ctx.locks) {
      try {
        await advisoryLocks.releaseLock(lock.entityType, lock.entityId, lock.mode);
      } catch (error) {
        console.warn(`Warning: Failed to release lock during cleanup:`, error);
      }
    }

    // Remove from active transactions
    this.activeTransactions.delete(transactionId);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{
    activeTransactions: number;
    oldestTransaction?: { id: string; age: number };
    locksHeld: number;
  }> {
    const transactions = Array.from(this.activeTransactions.values());
    const now = Date.now();
    
    let oldestTransaction: { id: string; age: number } | undefined;
    let totalLocks = 0;

    for (const [id, ctx] of this.activeTransactions.entries()) {
      const age = now - ctx.startTime.getTime();
      totalLocks += ctx.locks.length;

      if (!oldestTransaction || age > oldestTransaction.age) {
        oldestTransaction = { id, age };
      }
    }

    return {
      activeTransactions: transactions.length,
      oldestTransaction,
      locksHeld: totalLocks
    };
  }
}

// Export singleton instance
export const transactionManager = new TransactionManager();
export default transactionManager;