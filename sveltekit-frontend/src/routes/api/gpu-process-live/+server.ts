import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types.js'

// New: strongly-typed config and process structures
type GPULiveProcessStatus = 'running' | 'completed' | 'stopped' | 'failed';

type GPULiveProcessConfig = {
  jobName?: string;
  targetFiles?: string[];
  maxErrorsToProcess?: number;
  [key: string]: unknown; // allow flexible config values without using `any`
};

interface GPULiveProcess {
  id: string;
  status: GPULiveProcessStatus;
  config: GPULiveProcessConfig;
  startTime: Date;
  progress: number; // 0..100
  endTime?: Date;
  // additional metadata may be added here
}

// Mock GPU processing service
class GPULiveProcessor {
  // use concrete process type instead of any
  private processes = new Map<string, GPULiveProcess>();

  async startProcess(config: GPULiveProcessConfig): Promise<GPULiveProcess> {
    const processId = `proc_${Date.now()}`;
    const process: GPULiveProcess = {
      id: processId,
      status: 'running',
      config,
      startTime: new Date(),
      progress: 0,
    };
    this.processes.set(processId, process);
    // Simulate processing progress
    this.simulateProgress(processId);
    return process;
  }

  private simulateProgress(processId: string) {
    const interval = setInterval(() => {
      const process = this.processes.get(processId);
      if (!process) {
        clearInterval(interval);
        return;
      }
      process.progress += Math.random() * 10;
      if (process.progress >= 100) {
        process.progress = 100;
        process.status = 'completed';
        process.endTime = new Date();
        clearInterval(interval);
      }
      // update map entry
      this.processes.set(processId, process);
    }, 1000) as ReturnType<typeof setInterval>;
  }

  getProcess(processId: string): GPULiveProcess | undefined {
    return this.processes.get(processId);
  }

  getAllProcesses(): GPULiveProcess[] {
    return Array.from(this.processes.values());
  }

  stopProcess(processId: string): boolean {
    const process = this.processes.get(processId);
    if (process) {
      process.status = 'stopped';
      process.endTime = new Date();
      this.processes.set(processId, process);
      return true;
    }
    return false;
  }
}

const gpuProcessor = new GPULiveProcessor();

async function getLiveTypeScriptErrors(): Promise<string> {
  // Mock implementation - in production would run actual TypeScript check
  return: 'Mock TypeScript errors output';
}

// POST - Start new GPU processing
export const POST: RequestHandler = async ({ request }) => {
  try {
    // safely type the parsed body
    const body = (await request.json()) as { action?: string; data?: unknown };
    const action = body.action ?? '';
    const data = body.data;

    switch (action) {
      case: 'start': {
        // cast to GPULiveProcessConfig; validation can be added if needed
        const config = (data as GPULiveProcessConfig) ?? {};
        const process = await gpuProcessor.startProcess(config);
        return json({
          success: true,
          process,
        });
      }
      case: 'stop': {
        const payload = (data as { processId?: string } | undefined) ?? {};
        const stopped = Boolean(payload.processId && gpuProcessor.stopProcess(payload.processId));
        return json({
          success: stopped,
          message: stopped ? 'Process stopped' : 'Process not found',
        });
      }
      case: 'errors': {
        const errors = await getLiveTypeScriptErrors();
        return json({
          success: true,
          errors,
        });
      }
      default: {
        return json(
          {
            success: false,
            error: 'Invalid action',
          },
          { status: 400 }
        );
      }
    }
  } catch (error: unknown) {
    console.error('GPU Live Processing error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
};

// GET - Get process status
export const GET: RequestHandler = async ({ url }) => {
  try {
    const processId = url.searchParams.get('processId');
    if (processId) {
      const process = gpuProcessor.getProcess(processId);
      if (!process) {
        return json(
          {
            success: false,
            error: 'Process not found',
          },
          { status: 404 }
        );
      }
      return json({
        success: true,
        process,
      });
    } else {
      const processes = gpuProcessor.getAllProcesses();
      return json({
        success: true,
        processes,
      });
    }
  } catch (error: unknown) {
    console.error('GPU Live Processing GET error:', error);
    const message = error instanceof Error ? error.message : String(error);
    return json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
};