/**
 * Content Extractors for Multimodal Ingestion
 *
 * CPU-intensive operations for extracting content and features:
 * - OCR for images and PDFs (Tesseract.js)
 * - Audio extraction and processing (ffmpeg)
 * - Video frame sampling (ffmpeg)
 * - Image processing and optimization (Sharp)
 * - Large JSON parsing (simdjson-wasm)
 *
 * All extractors are designed to work in worker threads for CPU parallelization.
 */

import fs from "fs/promises";
import path from "path";
import { spawn } from "child_process";
import { tmpdir } from "os";
import { fetchMinioObject } from './minio.js.js';

// Type imports for extractors
export interface ExtractionResult {
  success: boolean;
  extractedText?: string;
  metadata?: Record<string, any>;
  error?: string;
  processingTime: number;
}

export interface FrameExtractionResult extends ExtractionResult {
  frames?: Buffer[];
  frameCount?: number;
}

export interface AudioExtractionResult extends ExtractionResult {
  audioPath?: string;
  duration?: number;
  sampleRate?: number;
}

// Temp file utilities
async function bufferToTempFile(buffer: Buffer, extension = ""): Promise<string> {
  const filename = `${Date.now()}-${Math.random().toString(36).slice(2)}${extension}`;
  const filepath = path.join(tmpdir(), filename);
  await fs.writeFile(filepath, buffer);
  return filepath;
}

async function cleanupTempFile(filepath: string): Promise<void> {
  try {
    await fs.unlink(filepath);
  } catch {
    // Ignore cleanup errors
  }
}

/**
 * OCR Extraction using Tesseract.js
 * Supports images and PDF pages
 */
export async function extractTextFromImage(buffer: Buffer, options: {
  language?: string;
  pageSegMode?: number;
  preserveInterword?: boolean;
} = {}): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Dynamic import to avoid bundling issues
    const Tesseract = await import('tesseract.js');
    const sharp = await import('sharp');

    const {
      language = 'eng',
      pageSegMode = 6, // PSM_SINGLE_UNIFORM_BLOCK
      preserveInterword = true
    } = options;

    // Optimize image for OCR using Sharp
    const optimizedBuffer = await sharp.default(buffer)
      .ensureAlpha()
      .greyscale() // Convert to grayscale for better OCR
      .sharpen() // Enhance text edges
      .png() // Convert to PNG for consistent processing
      .toBuffer();

    // Create worker
    const worker = await Tesseract.createWorker();

    try {
      await worker.load();
      await worker.loadLanguage(language);
      await worker.initialize(language);

      // Set OCR parameters
      await worker.setParameters({
        tessedit_pageseg_mode: pageSegMode.toString(),
        preserve_interword_spaces: preserveInterword ? '1' : '0',
      });

      const { data } = await worker.recognize(optimizedBuffer);

      return {
        success: true,
        extractedText: data.text.trim(),
        metadata: {
          confidence: data.confidence,
          wordCount: data.words?.length || 0,
          language,
          pageSegMode,
          imageOptimization: 'greyscale_sharpen'
        },
        processingTime: Date.now() - startTime
      };
    } finally {
      await worker.terminate();
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * PDF to Images and OCR extraction
 * Note: This is a simplified version. For production, consider pdf2pic or pdf-poppler
 */
export async function extractTextFromPDF(buffer: Buffer): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // For now, treat PDF as image and try OCR directly
    // In production, you'd want to:
    // 1. Use pdf2pic to convert each page to images
    // 2. Run OCR on each page image
    // 3. Combine results

    return await extractTextFromImage(buffer, {
      language: 'eng',
      pageSegMode: 6
    });
  } catch (error) {
    return {
      success: false,
      error: `PDF extraction failed: ${error}`,
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Audio extraction from video/audio files using ffmpeg
 */
export async function extractAudioFromBuffer(buffer: Buffer, filename: string): Promise<AudioExtractionResult> {
  const startTime = Date.now();
  let inputPath: string | null = null;
  let outputPath: string | null = null;

  try {
    // Write input buffer to temp file
    const extension = path.extname(filename) || '.bin';
    inputPath = await bufferToTempFile(buffer, extension);
    outputPath = `${inputPath}.wav`;

    // Use ffmpeg to extract audio
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn(ffmpegPath, [
        '-i', inputPath!,
        '-vn', // No video
        '-acodec', 'pcm_s16le', // PCM 16-bit little-endian
        '-ar', '16000', // 16kHz sample rate
        '-ac', '1', // Mono
        '-f', 'wav',
        '-y', // Overwrite output
        outputPath!
      ], { stdio: 'pipe' });

      let stderr = '';
      ffmpeg.stderr?.on('data', (data) => {
        stderr += data.toString();
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg failed with code ${code}: ${stderr}`));
        }
      });

      ffmpeg.on('error', (error) => {
        reject(error);
      });
    });

    // Get audio info
    const audioInfo = await getAudioInfo(outputPath, ffmpegPath);

    return {
      success: true,
      audioPath: outputPath,
      metadata: {
        originalFormat: extension,
        extractedFormat: 'wav',
        sampleRate: audioInfo.sampleRate,
        duration: audioInfo.duration,
        channels: audioInfo.channels
      },
      duration: audioInfo.duration,
      sampleRate: audioInfo.sampleRate,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    // Cleanup on error
    if (outputPath) await cleanupTempFile(outputPath);

    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  } finally {
    // Cleanup input file
    if (inputPath) await cleanupTempFile(inputPath);
  }
}

/**
 * Video frame sampling using ffmpeg
 */
export async function sampleFramesFromVideo(buffer: Buffer, filename: string, frameCount = 3): Promise<FrameExtractionResult> {
  const startTime = Date.now();
  let inputPath: string | null = null;
  const outputPaths: string[] = [];

  try {
    // Write input buffer to temp file
    const extension = path.extname(filename) || '.mp4';
    inputPath = await bufferToTempFile(buffer, extension);

    // Get video duration
    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';
    const videoInfo = await getVideoInfo(inputPath, ffmpegPath);
    const duration = videoInfo.duration;

    if (duration <= 0) {
      throw new Error('Could not determine video duration');
    }

    // Calculate frame timestamps (evenly distributed)
    const timestamps: number[] = [];
    for (let i = 1; i <= frameCount; i++) {
      timestamps.push((i * duration) / (frameCount + 1));
    }

    // Extract frames
    const frameBuffers: Buffer[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const outputPath = `${inputPath}_frame_${i}.jpg`;
      outputPaths.push(outputPath);

      await new Promise<void>((resolve, reject) => {
        const ffmpeg = spawn(ffmpegPath, [
          '-i', inputPath!,
          '-ss', timestamps[i].toString(),
          '-vframes', '1',
          '-f', 'image2',
          '-vcodec', 'mjpeg',
          '-q:v', '2', // High quality
          '-s', '1280x720', // Resize to standard size
          '-y',
          outputPath
        ], { stdio: 'pipe' });

        let stderr = '';
        ffmpeg.stderr?.on('data', (data) => {
          stderr += data.toString();
        });

        ffmpeg.on('close', (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(new Error(`Frame extraction failed: ${stderr}`));
          }
        });

        ffmpeg.on('error', reject);
      });

      // Read frame buffer
      const frameBuffer = await fs.readFile(outputPath);
      frameBuffers.push(frameBuffer);
    }

    return {
      success: true,
      frames: frameBuffers,
      frameCount: frameBuffers.length,
      metadata: {
        originalFormat: extension,
        videoDuration: duration,
        frameTimestamps: timestamps,
        frameResolution: '1280x720'
      },
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  } finally {
    // Cleanup
    if (inputPath) await cleanupTempFile(inputPath);
    for (const outputPath of outputPaths) {
      await cleanupTempFile(outputPath);
    }
  }
}

/**
 * Large JSON parsing with simdjson-wasm
 */
export async function parseJsonWithSimd(jsonText: string): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    // Try simdjson-wasm first for large JSON files
    if (jsonText.length > 1024 * 1024) { // 1MB+
      try {
        const simdjson = await import('simdjson');
        const parsed = simdjson.parse(jsonText);

        return {
          success: true,
          extractedText: JSON.stringify(parsed, null, 2),
          metadata: {
            parser: 'simdjson-wasm',
            originalSize: jsonText.length,
            jsonKeys: typeof parsed === 'object' ? Object.keys(parsed || {}).length : 0
          },
          processingTime: Date.now() - startTime
        };
      } catch (simdjsonError) {
        // Fallback to native JSON.parse
        console.warn('simdjson-wasm failed, falling back to JSON.parse:', simdjsonError);
      }
    }

    // Fallback to native JSON.parse
    const parsed = JSON.parse(jsonText);

    return {
      success: true,
      extractedText: JSON.stringify(parsed, null, 2),
      metadata: {
        parser: 'native',
        originalSize: jsonText.length,
        jsonKeys: typeof parsed === 'object' ? Object.keys(parsed || {}).length : 0
      },
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  }
}

/**
 * Utility functions for media info
 */
async function getAudioInfo(filePath: string, ffmpegPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffmpegPath.replace('ffmpeg', 'ffprobe'), [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ], { stdio: 'pipe' });

    let stdout = '';
    ffprobe.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}`));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const audioStream = info.streams?.find((s: any) => s.codec_type === 'audio');

        resolve({
          duration: parseFloat(info.format?.duration || '0'),
          sampleRate: parseInt(audioStream?.sample_rate || '16000'),
          channels: parseInt(audioStream?.channels || '1')
        });
      } catch (error) {
        reject(error);
      }
    });

    ffprobe.on('error', reject);
  });
}

async function getVideoInfo(filePath: string, ffmpegPath: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const ffprobe = spawn(ffmpegPath.replace('ffmpeg', 'ffprobe'), [
      '-v', 'quiet',
      '-print_format', 'json',
      '-show_format',
      '-show_streams',
      filePath
    ], { stdio: 'pipe' });

    let stdout = '';
    ffprobe.stdout?.on('data', (data) => {
      stdout += data.toString();
    });

    ffprobe.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`ffprobe failed with code ${code}`));
        return;
      }

      try {
        const info = JSON.parse(stdout);
        const videoStream = info.streams?.find((s: any) => s.codec_type === 'video');

        resolve({
          duration: parseFloat(info.format?.duration || '0'),
          width: parseInt(videoStream?.width || '0'),
          height: parseInt(videoStream?.height || '0')
        });
      } catch (error) {
        reject(error);
      }
    });

    ffprobe.on('error', reject);
  });
}

/**
 * Main extractor router - determines which extractor to use based on content type
 */
export async function extractContent(buffer: Buffer, contentType: string, filename?: string): Promise<ExtractionResult> {
  const startTime = Date.now();

  try {
    if (contentType.startsWith('image/')) {
      return await extractTextFromImage(buffer);
    }

    if (contentType === 'application/pdf') {
      return await extractTextFromPDF(buffer);
    }

    if (contentType.startsWith('text/')) {
      const text = buffer.toString('utf-8');
      return {
        success: true,
        extractedText: text,
        metadata: {
          originalSize: buffer.length,
          encoding: 'utf-8'
        },
        processingTime: Date.now() - startTime
      };
    }

    if (contentType === 'application/json') {
      const jsonText = buffer.toString('utf-8');
      return await parseJsonWithSimd(jsonText);
    }

    // For audio/video, we don't extract text but return metadata
    if (contentType.startsWith('audio/') || contentType.startsWith('video/')) {
      return {
        success: true,
        extractedText: `${contentType} file: ${filename || 'unknown'}`,
        metadata: {
          contentType,
          size: buffer.length,
          requiresSpecialProcessing: true
        },
        processingTime: Date.now() - startTime
      };
    }

    return {
      success: false,
      error: `Unsupported content type for text extraction: ${contentType}`,
      processingTime: Date.now() - startTime
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      processingTime: Date.now() - startTime
    };
  }
}