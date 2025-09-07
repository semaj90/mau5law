/*
 * Database Setup API Endpoint
 * Initializes all required tables, indexes, and sample data for the unified vector system
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { setupDatabase, checkDatabaseHealth, getDatabaseStats } from '$lib/server/db/setup-database';

export const GET: RequestHandler = async ({ url }) => {
  const action = url.searchParams.get('action');

  try {
    switch (action) {
      case 'health':
        const health = await checkDatabaseHealth();
        return json({
          success: true,
          health,
          allHealthy: Object.values(health).every(Boolean),
          timestamp: new Date().toISOString()
        });

      case 'stats':
        const stats = await getDatabaseStats();
        return json({
          success: true,
          stats,
          timestamp: new Date().toISOString()
        });

      case 'status':
        const [healthStatus, databaseStats] = await Promise.all([
          checkDatabaseHealth(),
          getDatabaseStats()
        ]);

        return json({
          success: true,
          health: healthStatus,
          stats: databaseStats,
          ready: Object.values(healthStatus).every(Boolean),
          timestamp: new Date().toISOString()
        });

      default:
        return json({
          success: false,
          error: 'Unknown action. Available: health, stats, status',
          availableActions: ['health', 'stats', 'status']
        }, { status: 400 });
    }
  } catch (error: any) {
    console.error('❌ Database health check error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const POST: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, force } = body;

    if (action !== 'setup') {
      return json({
        success: false,
        error: 'Only "setup" action is supported for POST requests',
        example: { action: 'setup', force: false }
      }, { status: 400 });
    }

    // Check if database is already set up (unless force is true)
    if (!force) {
      const health = await checkDatabaseHealth();
      if (health.connected && health.tablesExist && health.extensionsEnabled) {
        return json({
          success: true,
          message: 'Database is already set up. Use force: true to reinitialize.',
          health,
          alreadySetup: true,
          timestamp: new Date().toISOString()
        });
      }
    }

    console.log('🚀 Starting database setup...');
    
    const setupResult = await setupDatabase();

    if (setupResult.success) {
      console.log('✅ Database setup completed successfully');
      
      // Get final status
      const [health, stats] = await Promise.all([
        checkDatabaseHealth(),
        getDatabaseStats()
      ]);

      return json({
        success: true,
        message: 'Database setup completed successfully',
        setupResult,
        health,
        stats,
        timestamp: new Date().toISOString()
      });

    } else {
      console.error('❌ Database setup failed');
      return json({
        success: false,
        message: 'Database setup failed',
        setupResult,
        timestamp: new Date().toISOString()
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('❌ Database setup API error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const PUT: RequestHandler = async ({ request }) => {
  try {
    const body = await request.json();
    const { action, data } = body;

    switch (action) {
      case 'add-sample-documents':
        // Add additional sample documents for testing
        return json({
          success: false,
          error: 'Adding sample documents not yet implemented',
          plannedFeature: true
        }, { status: 501 });

      case 'rebuild-indexes':
        // Rebuild database indexes
        return json({
          success: false,
          error: 'Index rebuilding not yet implemented',
          plannedFeature: true
        }, { status: 501 });

      case 'clear-cache':
        // Clear embedding and vector caches
        return json({
          success: false,
          error: 'Cache clearing not yet implemented',
          plannedFeature: true
        }, { status: 501 });

      default:
        return json({
          success: false,
          error: 'Unknown action. Available: add-sample-documents, rebuild-indexes, clear-cache',
          availableActions: ['add-sample-documents', 'rebuild-indexes', 'clear-cache']
        }, { status: 400 });
    }

  } catch (error: any) {
    console.error('❌ Database maintenance error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};

export const DELETE: RequestHandler = async ({ url }) => {
  const confirm = url.searchParams.get('confirm');
  
  if (confirm !== 'yes-delete-all-data') {
    return json({
      success: false,
      error: 'Destructive operation requires confirmation',
      requiredParam: 'confirm=yes-delete-all-data',
      warning: 'This will delete ALL data in the database'
    }, { status: 400 });
  }

  try {
    // This is a destructive operation - should be implemented carefully
    return json({
      success: false,
      error: 'Database deletion not implemented for safety',
      message: 'Use manual SQL commands or database admin tools for destructive operations'
    }, { status: 501 });

  } catch (error: any) {
    console.error('❌ Database deletion error:', error);
    return json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
};