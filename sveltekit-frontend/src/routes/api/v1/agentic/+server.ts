import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { spawn } from 'child_process';
import { join } from 'path';

/**
 * API endpoint for Agentic Controller integration
 * Provides access to OCR → Embeddings → RAG system
 */

// GET /api/v1/agentic - Get system status and recent errors
export const GET: RequestHandler = async ({ url, getClientAddress }) => {
  const startTime = performance.now();

  try {
    const action = url.searchParams.get('action') || 'status';
    const query = url.searchParams.get('query');

    switch (action) {
      case 'status':
        return await getSystemStatus(startTime, getClientAddress);

      case 'recent-errors':
        return await getRecentErrors(startTime);

      case 'fix-suggestions':
        if (!query) {
          throw error(400, 'Query parameter required for fix suggestions');
        }
        return await getFixSuggestions(query, startTime);

      default:
        throw error(400, `Unknown action: ${action}`);
    }

  } catch (err: any) {
    const processingTime = performance.now() - startTime;
    console.error('Agentic API error:', err);

    const errorResponse = {
      error: err.status ? err.body?.message || 'Agentic API request failed' : 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      processingTime: Math.round(processingTime)
    };

    return json(errorResponse, {
      status: err.status || 500,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': `${Math.round(processingTime)}ms`,
        'X-Error': 'true'
      }
    });
  }
};

// POST /api/v1/agentic - Process screenshot or trigger analysis
export const POST: RequestHandler = async ({ request, getClientAddress }) => {
  const startTime = performance.now();

  try {
    const contentType = request.headers.get('content-type') || '';

    if (contentType.includes('multipart/form-data')) {
      // Handle screenshot upload
      return await processScreenshot(request, startTime, getClientAddress);
    } else {
      // Handle JSON requests
      const requestData = await request.json();
      const { action, data } = requestData;

      switch (action) {
        case 'analyze-error':
          return await analyzeErrorText(data.errorText, startTime);

        case 'get-contextual-fixes':
          return await getContextualFixes(data.errorId, startTime);

        case 'mark-fix-applied':
          return await markFixApplied(data.fixId, data.success, startTime);

        default:
          throw error(400, `Unknown action: ${action}`);
      }
    }

  } catch (err: any) {
    const processingTime = performance.now() - startTime;
    console.error('Agentic POST error:', err);

    return json({
      error: err.status ? err.body?.message || 'Agentic request failed' : 'Internal server error',
      message: process.env.NODE_ENV === 'development' ? err.message : undefined,
      processingTime: Math.round(processingTime)
    }, {
      status: err.status || 500
    });
  }
};

// Helper Functions
async function getSystemStatus(startTime: number, getClientAddress: () => string) {
  try {
    // Check if agentic controller is running by querying Redis
    const redis = await import('redis').then(m => m.createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      password: process.env.REDIS_PASSWORD || 'redis'
    }));

    let redisConnected = false;
    let recentActivity = 0;
    let errorCount = 0;

    try {
      await redis.connect();
      redisConnected = true;

      // Get recent AST activity
      const astKeys = await redis.keys('ast:*');
      recentActivity = astKeys.length;

      // Get recent errors
      const errorKeys = await redis.keys('error:*');
      errorCount = errorKeys.length;

      await redis.disconnect();
    } catch (redisError) {
      console.warn('Redis connection failed:', redisError);
    }

    const processingTime = performance.now() - startTime;

    console.log(`📊 Agentic status check from ${getClientAddress()}`);

    return json({
      status: 'running',
      system: {
        redisConnected,
        agenticControllerActive: redisConnected, // Assume active if Redis works
        watcherStatus: 'unknown' // Would need process check
      },
      activity: {
        recentASTProcessing: recentActivity,
        pendingErrors: errorCount,
        lastActivity: new Date().toISOString()
      },
      processingTime: Math.round(processingTime)
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': `${Math.round(processingTime)}ms`
      }
    });

  } catch (error) {
    throw error;
  }
}

async function getRecentErrors(startTime: number) {
  try {
    // Query database for recent errors
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db'
    });

    const result = await pool.query(`
      SELECT
        id,
        error_text,
        screenshot_path,
        confidence,
        resolved,
        created_at
      FROM error_embeddings
      ORDER BY created_at DESC
      LIMIT 20
    `);

    await pool.end();

    const processingTime = performance.now() - startTime;

    return json({
      errors: result.rows.map(row => ({
        id: row.id,
        text: row.error_text.substring(0, 200), // Truncated for display
        screenshotPath: row.screenshot_path,
        confidence: row.confidence,
        resolved: row.resolved,
        createdAt: row.created_at
      })),
      total: result.rows.length,
      processingTime: Math.round(processingTime)
    });

  } catch (error) {
    throw error;
  }
}

async function getFixSuggestions(query: string, startTime: number) {
  try {
    // Use the controller's fix suggestion function via subprocess
    const controllerPath = join(process.cwd(), 'scripts', 'agentic-controller.mjs');

    return new Promise((resolve, reject) => {
      const process = spawn('node', [controllerPath, 'query', query], {
        stdio: ['inherit', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';

      process.stdout.on('data', (data) => {
        output += data.toString();
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
      });

      process.on('close', (code) => {
        const processingTime = performance.now() - startTime;

        if (code === 0) {
          try {
            // Parse the JSON output from the controller
            const suggestions = JSON.parse(output.trim().split('\n').pop() || '[]');

            resolve(json({
              query: query,
              suggestions: suggestions,
              processingTime: Math.round(processingTime)
            }));
          } catch (parseError) {
            reject(error(500, 'Failed to parse controller response'));
          }
        } else {
          console.error('Controller process error:', errorOutput);
          reject(error(500, 'Controller process failed'));
        }
      });

      // Set timeout for long-running queries
      setTimeout(() => {
        process.kill();
        reject(error(408, 'Fix suggestion request timed out'));
      }, 30000);
    });

  } catch (err) {
    throw error(500, `Fix suggestion failed: ${err.message}`);
  }
}

async function processScreenshot(request: Request, startTime: number, getClientAddress: () => string) {
  try {
    // Parse form data
    const formData = await request.formData();
    const screenshot = formData.get('screenshot') as File;

    if (!screenshot || !screenshot.name) {
      throw error(400, 'Screenshot file is required');
    }

    // Save to errors directory for processing
    const errorsDir = join(process.cwd(), 'errors');
    const filename = `error_${Date.now()}_${screenshot.name}`;
    const filepath = join(errorsDir, filename);

    // Ensure errors directory exists
    await import('fs').then(fs => fs.promises.mkdir(errorsDir, { recursive: true }));

    // Write file
    const buffer = Buffer.from(await screenshot.arrayBuffer());
    await import('fs').then(fs => fs.promises.writeFile(filepath, buffer));

    // Trigger analysis via controller
    const controllerPath = join(process.cwd(), 'scripts', 'agentic-controller.mjs');
    const analysisProcess = spawn('node', [controllerPath, 'analyze', filepath], {
      stdio: 'inherit'
    });

    const processingTime = performance.now() - startTime;

    console.log(`📸 Screenshot uploaded from ${getClientAddress()}: ${filename}`);

    return json({
      message: 'Screenshot uploaded and analysis started',
      filename: filename,
      filepath: filepath,
      processingTime: Math.round(processingTime)
    }, {
      status: 202, // Accepted - processing asynchronously
      headers: {
        'Content-Type': 'application/json',
        'X-Processing-Time': `${Math.round(processingTime)}ms`
      }
    });

  } catch (err) {
    throw error(500, `Screenshot processing failed: ${err.message}`);
  }
}

async function analyzeErrorText(errorText: string, startTime: number) {
  try {
    // This would integrate with the controller's embedding system
    // For now, return a mock response
    const processingTime = performance.now() - startTime;

    return json({
      message: 'Error text analysis started',
      errorText: errorText.substring(0, 100),
      status: 'processing',
      processingTime: Math.round(processingTime)
    });

  } catch (err) {
    throw error(500, `Error text analysis failed: ${err.message}`);
  }
}

async function getContextualFixes(errorId: number, startTime: number) {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db'
    });

    const result = await pool.query(`
      SELECT
        cf.id as fix_id,
        cf.suggested_fix,
        cf.success_rate,
        cf.applied,
        cf.created_at
      FROM contextual_fixes cf
      WHERE cf.error_id = $1
      ORDER BY cf.created_at DESC
    `, [errorId]);

    await pool.end();

    const processingTime = performance.now() - startTime;

    return json({
      errorId: errorId,
      fixes: result.rows,
      processingTime: Math.round(processingTime)
    });

  } catch (err) {
    throw error(500, `Contextual fixes retrieval failed: ${err.message}`);
  }
}

async function markFixApplied(fixId: number, success: boolean, startTime: number) {
  try {
    const { Pool } = await import('pg');
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL || 'postgresql://legal_admin:123456@localhost:5432/legal_ai_db'
    });

    await pool.query(`
      UPDATE contextual_fixes
      SET
        applied = TRUE,
        success_rate = CASE
          WHEN $2 THEN LEAST(success_rate + 0.1, 1.0)
          ELSE GREATEST(success_rate - 0.1, 0.0)
        END
      WHERE id = $1
    `, [fixId, success]);

    await pool.end();

    const processingTime = performance.now() - startTime;

    return json({
      message: 'Fix status updated',
      fixId: fixId,
      success: success,
      processingTime: Math.round(processingTime)
    });

  } catch (err) {
    throw error(500, `Fix status update failed: ${err.message}`);
  }
}