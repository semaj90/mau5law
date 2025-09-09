import fs from 'fs';
import path from 'path';
import type { AuthenticatedUser } from './auth-guard.js';
import { db } from './db';
import { storage_audits } from './schema';

export interface AuditEntry {
  timestamp: string;
  action: 'upload' | 'delete' | 'access' | 'update';
  userId: string;
  userEmail: string;
  bucket: string;
  key: string;
  ip?: string;
  userAgent?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, any>;
}

/**
 * Enhanced audit logging for storage operations
 * Supports both file-based and database logging
 */
export class StorageAuditLogger {
  private static logFile = path.resolve(process.cwd(), 'storage-audit.log');
  private static dbLogEnabled = !!process.env.DATABASE_URL;

  /**
   * Log storage operation with detailed metadata
   */
  static async log(
    action: AuditEntry['action'],
    user: AuthenticatedUser,
    bucket: string,
    key: string,
    request: Request,
    success: boolean,
    error?: string,
    metadata?: Record<string, any>
  ): Promise<void> {
    const entry: AuditEntry = {
      timestamp: new Date().toISOString(),
      action,
      userId: user.id,
      userEmail: user.email,
      bucket,
      key,
      ip: request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'unknown',
      userAgent: request.headers.get('user-agent') || 'unknown',
      success,
      error,
      metadata
    };

    // Log to file (always)
    await this.logToFile(entry);

    // Log to database if available
    if (this.dbLogEnabled && db) {
      try {
        await db.insert(storage_audits).values({
          action: entry.action,
          user_id: entry.userId,
          target: entry.key,
          bucket: entry.bucket,
          success: entry.success,
          metadata: entry.metadata || null
        });
      } catch (e) {
        console.error('Failed to write audit entry to DB:', e);
      }
    }
  }

  /**
   * Log to file system
   */
  private static async logToFile(entry: AuditEntry): Promise<void> {
    try {
      const logLine = JSON.stringify(entry) + '\n';
      await fs.promises.appendFile(this.logFile, logLine);
    } catch (error) {
      console.error('Failed to write audit log to file:', error);
    }
  }

  /**
   * Log to database (if available)
   */
  private static async logToDatabase(entry: AuditEntry): Promise<void> {
    try {
      // This would integrate with your existing database setup
      // For now, we'll use a simple approach that can be extended

      if (typeof window === 'undefined' && global.database) {
        // Example database integration - adjust based on your ORM/database setup
        await global.database.auditLog.create({
          data: {
            timestamp: new Date(entry.timestamp),
            action: entry.action,
            userId: entry.userId,
            userEmail: entry.userEmail,
            bucket: entry.bucket,
            key: entry.key,
            ip: entry.ip,
            userAgent: entry.userAgent,
            success: entry.success,
            error: entry.error,
            metadata: entry.metadata ? JSON.stringify(entry.metadata) : null
          }
        });
      }
    } catch (error) {
      console.error('Failed to write audit log to database:', error);
      // Don't fail the operation if audit logging fails
    }
  }

  /**
   * Query audit logs (for admin dashboard)
   */
  static async getAuditLogs(
    filters: {
      userId?: string;
      action?: string;
      bucket?: string;
      startDate?: Date;
      endDate?: Date;
      limit?: number;
    } = {}
  ): Promise<AuditEntry[]> {
    try {
      if (this.dbLogEnabled && db) {
        try {
          // Use Drizzle to query storage_audits table
          const q: any = db.select().from(storage_audits).orderBy(storage_audits.created_at.desc).limit(filters.limit || 100);
          const rows = await q;
          return rows.map((r: any) => ({
            timestamp: (r.created_at || new Date()).toISOString(),
            action: r.action,
            userId: r.user_id,
            userEmail: r.user_email || '',
            bucket: r.bucket,
            key: r.target,
            ip: r.ip || undefined,
            userAgent: r.user_agent || undefined,
            success: r.success,
            error: r.error || undefined,
            metadata: r.metadata || undefined
          } as AuditEntry));
        } catch (e) {
          console.error('DB audit query failed:', e);
          return this.queryLogFile(filters);
        }
      }

      // File-based query (simple implementation)
      return this.queryLogFile(filters);
    } catch (error) {
      console.error('Failed to query audit logs:', error);
      return [];
    }
  }

  /**
   * Simple file-based log querying
   */
  private static async queryLogFile(filters: any): Promise<AuditEntry[]> {
    try {
      const content = await fs.promises.readFile(this.logFile, 'utf-8');
      const lines = content.trim().split('\n').filter(Boolean);

      let entries: AuditEntry[] = lines
        .map(line => {
          try {
            return JSON.parse(line) as AuditEntry;
          } catch {
            return null;
          }
        })
        .filter(Boolean) as AuditEntry[];

      // Apply filters
      if (filters.userId) {
        entries = entries.filter(e => e.userId === filters.userId);
      }
      if (filters.action) {
        entries = entries.filter(e => e.action === filters.action);
      }
      if (filters.bucket) {
        entries = entries.filter(e => e.bucket === filters.bucket);
      }
      if (filters.startDate) {
        entries = entries.filter(e => new Date(e.timestamp) >= filters.startDate);
      }
      if (filters.endDate) {
        entries = entries.filter(e => new Date(e.timestamp) <= filters.endDate);
      }

      // Sort by timestamp (newest first) and limit
      entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

      if (filters.limit) {
        entries = entries.slice(0, filters.limit);
      }

      return entries;
    } catch (error) {
      console.error('Failed to query log file:', error);
      return [];
    }
  }

  /**
   * Archive old logs (for maintenance)
   */
  static async archiveLogs(olderThanDays = 90): Promise<void> {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);

      if (this.dbLogEnabled && global.database) {
        // Archive database logs
        await global.database.auditLog.deleteMany({
          where: {
            timestamp: {
              lt: cutoffDate
            }
          }
        });
      }

      // Archive file logs
      const content = await fs.promises.readFile(this.logFile, 'utf-8');
      const lines = content.trim().split('\n');

      const recentLines = lines.filter(line => {
        try {
          const entry = JSON.parse(line) as AuditEntry;
          return new Date(entry.timestamp) >= cutoffDate;
        } catch {
          return false;
        }
      });

      await fs.promises.writeFile(this.logFile, recentLines.join('\n') + '\n');

      console.log(`Archived audit logs older than ${olderThanDays} days`);
    } catch (error) {
      console.error('Failed to archive audit logs:', error);
    }
  }
}