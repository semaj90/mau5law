import type { RequestHandler } from './$types.js';

/*
 * Production Logging API Endpoint
 * Handles client-side error logging and monitoring for the Legal AI Platform
 */

import { json, error } from '@sveltejs/kit';
import crypto from "crypto";
import { URL } from "url";

// Log levels
type LogLevel = 'error' | 'warn' | 'info' | 'debug';

export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  error?: any;
  context?: any;
  requestId?: string;
  userId?: string;
  sessionId?: string;
  userAgent?: string;
  url?: string;
}

export interface LogBatch {
  logs: LogEntry[];
  clientInfo: {
    userAgent: string;
    url: string;
    timestamp: string;
  };
}

// In-memory log storage (in production, this would go to a proper logging service)
const logStore: LogEntry[] = [];
const MAX_LOG_ENTRIES = 10000; // Keep last 10k entries in memory

// Log processing functions
function processLogEntry(entry: LogEntry): LogEntry {
  return {
    ...entry,
    timestamp: entry.timestamp || new Date().toISOString(),
    requestId: entry.requestId || crypto.randomUUID?.() || Date.now().toString()
  };
}

function storeLogEntry(entry: LogEntry): void {
  logStore.push(entry);
  
  // Keep only recent entries
  if (logStore.length > MAX_LOG_ENTRIES) {
    logStore.splice(0, logStore.length - MAX_LOG_ENTRIES);
  }

  // In production, forward to external logging service
  if (import.meta.env.NODE_ENV === 'production') {
    forwardToExternalService(entry);
  }

  // Print to console for development
  if (import.meta.env.NODE_ENV === 'development') {
    console.log(`[${entry.level.toUpperCase()}] ${entry.message}`, entry);
  }
}

async function forwardToExternalService(entry: LogEntry): Promise<void> {
  // This would integrate with services like:
  // - Sentry
  // - LogRocket
  // - Datadog
  // - CloudWatch
  // - Custom logging infrastructure
  
  try {
    // Example: Forward to Sentry or similar service
    if (import.meta.env.SENTRY_DSN && entry.level === 'error') {
      // Sentry integration would go here
      console.log('Forwarding error to Sentry:', entry);
    }

    // Example: Forward to custom logging service
    if (import.meta.env.CUSTOM_LOGGING_ENDPOINT) {
      await fetch(import.meta.env.CUSTOM_LOGGING_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.LOGGING_API_KEY}`
        },
        body: JSON.stringify(entry)
      });
    }
  } catch (err: any) {
    console.error('Failed to forward log to external service:', err);
  }
}

// POST endpoint for logging
export const POST: RequestHandler = async ({ request, getClientAddress, url }) => {
  try {
    const body = await request.json();
    const clientAddress = getClientAddress();
    const userAgent = request.headers.get('user-agent') || 'Unknown';

    // Handle single log entry
    if (body.level && body.message) {
      const entry: LogEntry = processLogEntry({
        ...body,
        userAgent,
        url: url.pathname,
        clientAddress
      });

      storeLogEntry(entry);

      return json({
        success: true,
        message: 'Log entry recorded',
        entryId: entry.requestId
      });
    }

    // Handle batch log entries
    if (body.logs && Array.isArray(body.logs)) {
      const batch: LogBatch = body;
      const processedEntries = batch.logs.map(log => 
        processLogEntry({
          ...log,
          userAgent: batch.clientInfo?.userAgent || userAgent,
          url: batch.clientInfo?.url || url.pathname,
          clientAddress
        })
      );

      processedEntries.forEach(storeLogEntry);

      return json({
        success: true,
        message: 'Log batch recorded',
        entriesProcessed: processedEntries.length,
        entryIds: processedEntries.map(e => e.requestId)
      });
    }

    throw error(400, 'Invalid log format. Expected single entry or batch.');

  } catch (err: any) {
    console.error('Logging endpoint error:', err);
    throw error(500, 'Failed to process log entry');
  }
};

// GET endpoint for retrieving logs (development/debugging)
export const GET: RequestHandler = async ({ url, request }) => {
  // Only allow in development or with proper authorization
  if (import.meta.env.NODE_ENV === 'production') {
    const authHeader = request.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ') || 
        authHeader.split(' ')[1] !== import.meta.env.ADMIN_API_KEY) {
      throw error(401, 'Unauthorized');
    }
  }

  const searchParams = url.searchParams;
  const level = searchParams.get('level') as LogLevel | null;
  const since = searchParams.get('since');
  const limit = parseInt(searchParams.get('limit') || '100');
  const userId = searchParams.get('userId');

  let filteredLogs = [...logStore];

  // Filter by level
  if (level) {
    filteredLogs = filteredLogs.filter(log => log.level === level);
  }

  // Filter by timestamp
  if (since) {
    const sinceDate = new Date(since);
    filteredLogs = filteredLogs.filter(log => new Date(log.timestamp) >= sinceDate);
  }

  // Filter by user ID
  if (userId) {
    filteredLogs = filteredLogs.filter(log => log.userId === userId);
  }

  // Sort by timestamp (newest first)
  filteredLogs.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

  // Apply limit
  filteredLogs = filteredLogs.slice(0, limit);

  return json({
    success: true,
    logs: filteredLogs,
    totalCount: filteredLogs.length,
    filters: {
      level,
      since,
      limit,
      userId
    }
  });
};

// DELETE endpoint for clearing logs (development only)
export const DELETE: RequestHandler = async ({ request }) => {
  if (import.meta.env.NODE_ENV === 'production') {
    throw error(403, 'Log clearing not allowed in production');
  }

  const authHeader = request.headers.get('authorization');
  if (!authHeader || authHeader !== 'Bearer dev-admin-key') {
    throw error(401, 'Unauthorized');
  }

  const originalCount = logStore.length;
  logStore.splice(0, logStore.length);

  return json({
    success: true,
    message: `Cleared ${originalCount} log entries`,
    clearedCount: originalCount
  });
};