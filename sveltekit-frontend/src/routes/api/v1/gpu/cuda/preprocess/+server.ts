import type { RequestHandler } from './$types';

// CUDA preprocessing API with Clang/LLVM optimizations
// Integrates with the Clang-compiled CUDA worker for high-performance file processing

import { json } from '@sveltejs/kit';
import { exec } from 'child_process';
import { promisify } from 'util';
import { writeFile, readFile, unlink } from 'fs/promises';
import { join } from 'path';
import { nanoid } from 'nanoid';

const execAsync = promisify(exec);

interface CudaPreprocessOptions {
  enableGpuOptimization: boolean;
  useMsvcOptimizations: boolean;
  targetGpuArch: string;
  useClangOptimizations: boolean;
}

interface CudaProcessingResult {
  success: boolean;
  processedFile?: Buffer;
  metadata: {
    originalSize: number;
    processedSize?: number;
    processingTime: number;
    cudaVersion: string;
    clangVersion: string;
    optimizations: string[];
    gpuMemoryUsed?: number;
    throughputMBps?: number;
  };
  error?: string;
}

export const POST: RequestHandler = async ({ request }) => {
  const startTime = Date.now();
  
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const options = JSON.parse(formData.get('options') as string || '{}') as CudaPreprocessOptions;
    
    if (!file) {
      return json({
        success: false,
        error: 'No file provided'
      }, { status: 400 });
    }

    // Validate CUDA worker availability
    const cudaWorkerPath = join('..', 'cuda-worker', 'cuda-worker-clang.exe');
    const workerAvailable = await checkCudaWorkerAvailability(cudaWorkerPath);
    
    if (!workerAvailable.available) {
      console.warn('CUDA worker not available, falling back to CPU processing');
      return json({
        success: false,
        error: `CUDA worker unavailable: ${workerAvailable.error}`,
        metadata: {
          originalSize: file.size,
          processingTime: Date.now() - startTime,
          cudaVersion: 'unavailable',
          clangVersion: 'unavailable',
          optimizations: ['cpu-fallback']
        }
      });
    }

    // Process file based on type
    const result = await processFileWithCuda(file, options, cudaWorkerPath, startTime);
    
    return json(result);

  } catch (error) {
    console.error('CUDA preprocessing error:', error);
    return json({
      success: false,
      error: error instanceof Error ? error.message : 'CUDA processing failed',
      metadata: {
        originalSize: 0,
        processingTime: Date.now() - startTime,
        cudaVersion: 'error',
        clangVersion: 'error',
        optimizations: ['error']
      }
    }, { status: 500 });
  }
};

async function checkCudaWorkerAvailability(workerPath: string): Promise<{
  available: boolean;
  error?: string;
  version?: string;
}> {
  try {
    // Test CUDA worker with version check
    const { stdout, stderr } = await execAsync(`"${workerPath}" --version`, {
      timeout: 5000
    });
    
    return {
      available: true,
      version: stdout.trim() || stderr.trim()
    };
  } catch (error) {
    return {
      available: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

async function processFileWithCuda(
  file: File,
  options: CudaPreprocessOptions,
  workerPath: string,
  startTime: number
): Promise<CudaProcessingResult> {
  const tempId = nanoid();
  const tempDir = join('..', 'temp', 'cuda-processing');
  const inputPath = join(tempDir, `input_${tempId}.bin`);
  const outputPath = join(tempDir, `output_${tempId}.bin`);
  const metadataPath = join(tempDir, `metadata_${tempId}.json`);
  
  try {
    // Ensure temp directory exists
    await execAsync(`mkdir -p "${tempDir}"`);
    
    // Write input file
    const fileBuffer = Buffer.from(await file.arrayBuffer());
    await writeFile(inputPath, fileBuffer);
    
    // Prepare CUDA worker command with Clang optimizations
    const cudaCommand = buildCudaCommand(workerPath, inputPath, outputPath, metadataPath, options);
    
    console.log('Executing CUDA command:', cudaCommand);
    
    // Execute CUDA processing with timeout
    const { stdout, stderr } = await execAsync(cudaCommand, {
      timeout: 30000, // 30 second timeout
      cwd: join('..', 'cuda-worker')
    });
    
    // Read processed file and metadata
    const processedBuffer = await readFile(outputPath);
    let metadata;
    
    try {
      const metadataContent = await readFile(metadataPath, 'utf-8');
      metadata = JSON.parse(metadataContent);
    } catch (err) {
      metadata = {
        error: 'Metadata not available',
        stdout: stdout.trim(),
        stderr: stderr.trim()
      };
    }
    
    const processingTime = Date.now() - startTime;
    const throughputMBps = (file.size / (1024 * 1024)) / (processingTime / 1000);
    
    // Cleanup temp files
    await cleanupTempFiles(inputPath, outputPath, metadataPath);
    
    return {
      success: true,
      processedFile: processedBuffer,
      metadata: {
        originalSize: file.size,
        processedSize: processedBuffer.length,
        processingTime,
        cudaVersion: metadata.cudaVersion || 'unknown',
        clangVersion: metadata.clangVersion || 'unknown',
        optimizations: buildOptimizationsList(options),
        gpuMemoryUsed: metadata.gpuMemoryUsed,
        throughputMBps
      }
    };
    
  } catch (error) {
    // Cleanup on error
    await cleanupTempFiles(inputPath, outputPath, metadataPath);
    
    const processingTime = Date.now() - startTime;
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'CUDA processing failed',
      metadata: {
        originalSize: file.size,
        processingTime,
        cudaVersion: 'error',
        clangVersion: 'error',
        optimizations: ['error'],
        throughputMBps: 0
      }
    };
  }
}

function buildCudaCommand(
  workerPath: string,
  inputPath: string,
  outputPath: string,
  metadataPath: string,
  options: CudaPreprocessOptions
): string {
  const args = [
    `"${workerPath}"`,
    `--input="${inputPath}"`,
    `--output="${outputPath}"`,
    `--metadata="${metadataPath}"`,
    `--gpu-arch="${options.targetGpuArch || 'sm_75'}"` // RTX 3060 Ti
  ];
  
  if (options.enableGpuOptimization) {
    args.push('--enable-gpu-optimizations');
  }
  
  if (options.useMsvcOptimizations) {
    args.push('--use-msvc-optimizations');
  }
  
  if (options.useClangOptimizations) {
    args.push('--use-clang-optimizations');
    args.push('--target=x86_64-pc-windows-msvc');
  }
  
  return args.join(' ');
}

function buildOptimizationsList(options: CudaPreprocessOptions): string[] {
  const optimizations: string[] = ['cuda-acceleration'];
  
  if (options.useClangOptimizations) {
    optimizations.push('clang-llvm');
  }
  
  if (options.useMsvcOptimizations) {
    optimizations.push('msvc-native');
  }
  
  if (options.enableGpuOptimization) {
    optimizations.push('gpu-memory-optimization');
  }
  
  return optimizations;
}

async function cleanupTempFiles(...paths: string[]) {
  await Promise.allSettled(
    paths.map(path => unlink(path).catch(() => {}))
  );
}

// Health check endpoint
export const GET: RequestHandler = async () => {
  try {
    const cudaWorkerPath = join('..', 'cuda-worker', 'cuda-worker-clang.exe');
    const availability = await checkCudaWorkerAvailability(cudaWorkerPath);
    
    return json({
      cudaWorkerAvailable: availability.available,
      cudaWorkerVersion: availability.version,
      cudaWorkerPath,
      clangOptimizations: true,
      msvcCompatibility: true,
      supportedGpuArchs: ['sm_75', 'sm_86', 'sm_89'],
      error: availability.error
    });
    
  } catch (error) {
    return json({
      cudaWorkerAvailable: false,
      error: error instanceof Error ? error.message : 'Health check failed'
    }, { status: 500 });
  }
};