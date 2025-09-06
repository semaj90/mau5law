/**
 * Legal Automation Configuration API
 * Handles automation setup and batch processing orchestration
 */

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

interface AutomationConfig {
  id: string;
  type: string;
  source: string;
  autoProcessing: boolean;
  gpuAcceleration: boolean;
  batchSize: number;
  confidenceThreshold: number;
  processingOptions: string[];
  createdAt: string;
}

interface ProcessingJob {
  id: string;
  configId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  documentsProcessed: number;
  totalDocuments: number;
  startTime: Date;
  endTime?: Date;
  errors?: string[];
}

// In-memory storage for demo (replace with database in production)
const automationConfigs = new Map<string, AutomationConfig>();
const processingJobs = new Map<string, ProcessingJob>();

// POST: Create or update automation configuration
export const POST: RequestHandler = async ({ request }) => {
  try {
    const config: AutomationConfig = await request.json();
    
    // Validate required fields
    if (!config.id || !config.type || !config.source) {
      return json({
        success: false,
        error: 'Missing required fields: id, type, source'
      }, { status: 400 });
    }

    // Validate automation type
    const validTypes = [
      'folder_watch',
      'email_attachment', 
      'api_integration',
      'batch_upload',
      'evidence_automation',
      'case_discovery',
      'contract_analysis'
    ];

    if (!validTypes.includes(config.type)) {
      return json({
        success: false,
        error: `Invalid automation type. Must be one of: ${validTypes.join(', ')}`
      }, { status: 400 });
    }

    // Store configuration
    automationConfigs.set(config.id, {
      ...config,
      createdAt: new Date().toISOString()
    });

    // Create initial processing job if auto-processing is enabled
    let jobId: string | undefined;
    if (config.autoProcessing) {
      jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const job: ProcessingJob = {
        id: jobId,
        configId: config.id,
        status: 'pending',
        documentsProcessed: 0,
        totalDocuments: config.batchSize || 50,
        startTime: new Date()
      };
      processingJobs.set(jobId, job);

      // Start background processing (simulate)
      processDocuments(jobId).catch(error => {
        console.error('Background processing failed:', error);
        const job = processingJobs.get(jobId!);
        if (job) {
          job.status = 'failed';
          job.errors = [error.message];
          job.endTime = new Date();
        }
      });
    }

    return json({
      success: true,
      data: {
        configId: config.id,
        jobId,
        message: 'Automation configuration saved successfully',
        autoProcessing: config.autoProcessing
      }
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Configuration failed'
    }, { status: 500 });
  }
};

// GET: Retrieve automation configurations and job status
export const GET: RequestHandler = async ({ url }) => {
  try {
    const configId = url.searchParams.get('configId');
    const jobId = url.searchParams.get('jobId');
    const status = url.searchParams.get('status');

    // Get specific configuration
    if (configId) {
      const config = automationConfigs.get(configId);
      if (!config) {
        return json({
          success: false,
          error: 'Configuration not found'
        }, { status: 404 });
      }

      // Find related jobs
      const relatedJobs = Array.from(processingJobs.values())
        .filter(job => job.configId === configId);

      return json({
        success: true,
        data: {
          config,
          jobs: relatedJobs
        }
      });
    }

    // Get specific job status
    if (jobId) {
      const job = processingJobs.get(jobId);
      if (!job) {
        return json({
          success: false,
          error: 'Job not found'
        }, { status: 404 });
      }

      return json({
        success: true,
        data: { job }
      });
    }

    // List configurations with optional status filter
    const configs = Array.from(automationConfigs.values());
    const jobs = Array.from(processingJobs.values());

    let filteredJobs = jobs;
    if (status) {
      filteredJobs = jobs.filter(job => job.status === status);
    }

    return json({
      success: true,
      data: {
        configurations: configs,
        jobs: filteredJobs,
        summary: {
          totalConfigs: configs.length,
          activeJobs: jobs.filter(j => j.status === 'processing').length,
          completedJobs: jobs.filter(j => j.status === 'completed').length,
          failedJobs: jobs.filter(j => j.status === 'failed').length
        }
      }
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Request failed'
    }, { status: 500 });
  }
};

// PUT: Update automation configuration
export const PUT: RequestHandler = async ({ request }) => {
  try {
    const updates = await request.json();
    const { id, ...configUpdates } = updates;

    if (!id) {
      return json({
        success: false,
        error: 'Configuration ID is required'
      }, { status: 400 });
    }

    const existingConfig = automationConfigs.get(id);
    if (!existingConfig) {
      return json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 });
    }

    // Update configuration
    const updatedConfig = {
      ...existingConfig,
      ...configUpdates,
      updatedAt: new Date().toISOString()
    };

    automationConfigs.set(id, updatedConfig);

    return json({
      success: true,
      data: {
        config: updatedConfig,
        message: 'Configuration updated successfully'
      }
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Update failed'
    }, { status: 500 });
  }
};

// DELETE: Remove automation configuration
export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const configId = url.searchParams.get('configId');
    
    if (!configId) {
      return json({
        success: false,
        error: 'Configuration ID is required'
      }, { status: 400 });
    }

    const config = automationConfigs.get(configId);
    if (!config) {
      return json({
        success: false,
        error: 'Configuration not found'
      }, { status: 404 });
    }

    // Remove configuration and related jobs
    automationConfigs.delete(configId);
    
    // Cancel and remove related jobs
    const relatedJobs = Array.from(processingJobs.entries())
      .filter(([, job]) => job.configId === configId);

    relatedJobs.forEach(([jobId, job]) => {
      if (job.status === 'processing') {
        job.status = 'failed';
        job.errors = ['Configuration deleted'];
        job.endTime = new Date();
      }
      processingJobs.delete(jobId);
    });

    return json({
      success: true,
      data: {
        message: 'Configuration and related jobs deleted successfully',
        deletedJobs: relatedJobs.length
      }
    });

  } catch (error) {
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'Delete failed'
    }, { status: 500 });
  }
};

// Background document processing simulation
async function processDocuments(jobId: string): Promise<void> {
  const job = processingJobs.get(jobId);
  const config = job ? automationConfigs.get(job.configId) : null;

  if (!job || !config) {
    throw new Error('Job or configuration not found');
  }

  job.status = 'processing';
  
  try {
    // Simulate document processing with realistic delays
    const totalDocuments = job.totalDocuments;
    const batchSize = Math.min(config.batchSize, 10);
    
    for (let processed = 0; processed < totalDocuments; processed += batchSize) {
      const currentBatch = Math.min(batchSize, totalDocuments - processed);
      
      // Simulate processing delay based on automation type
      const processingDelay = getProcessingDelay(config.type);
      await new Promise(resolve => setTimeout(resolve, processingDelay));
      
      // Simulate potential GPU acceleration speedup
      if (config.gpuAcceleration) {
        await new Promise(resolve => setTimeout(resolve, processingDelay * 0.3));
      }
      
      job.documentsProcessed += currentBatch;
      
      // Simulate some processing failures based on confidence threshold
      if (Math.random() > config.confidenceThreshold) {
        if (!job.errors) job.errors = [];
        job.errors.push(`Low confidence processing for batch ${Math.floor(processed / batchSize) + 1}`);
      }
    }
    
    job.status = 'completed';
    job.endTime = new Date();
    
  } catch (error) {
    job.status = 'failed';
    job.errors = [error instanceof Error ? error.message : 'Processing failed'];
    job.endTime = new Date();
    throw error;
  }
}

// Get processing delay based on automation type (simulation)
function getProcessingDelay(automationType: string): number {
  const delays = {
    folder_watch: 500,
    email_attachment: 800,
    api_integration: 300,
    batch_upload: 1000,
    evidence_automation: 1200,
    case_discovery: 1500,
    contract_analysis: 2000
  };
  
  return delays[automationType as keyof typeof delays] || 800;
}