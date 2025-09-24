/**
 * Performance Monitor for N64 Texture Streaming
 * Adaptive quality adjustment based on client capabilities
 */;
}
export interface PerformanceMetrics {
  frameRate: number;
  renderTime: number;
  gpuMemoryUsage: number;
  cpuUsage: number;
  networkLatency: number;
  cacheHitRate: number;
  chunksPerSecond: number;
  qualityLevel: number;
  adaptiveEnabled: boolean;
}
export interface ClientCapabilities {
  hasWebGL: boolean;
  hasWebGL2: boolean;
  hasWASM: boolean;
  maxTextureSize: number;
  supportedFormats: string[];
  gpuVendor: string;
  gpuRenderer: string;
  memoryLimit: number;
  connectionSpeed: 'slow' | 'medium' | 'fast';
  deviceType: 'mobile' | 'tablet' | 'desktop';
}
export interface QualitySettings {
  textureResolution: number;
  compressionLevel: number;
  chunkSize: number;
  cacheSize: number;
  wasmEnabled: boolean;
  gpuAcceleration: boolean;
  adaptiveThresholds: {
    excellent: number;
    good: number;
    poor: number;
  };
}
/**
 * Performance Monitor and Adaptive Quality Controller
 */;
export class PerformanceMonitor {
  private metrics: PerformanceMetrics;
  private capabilities: ClientCapabilities;
  private qualitySettings: QualitySettings;
  private samples: number[] = [];
  private sampleSize = 60; // 1 second at 60fps
  private lastFrameTime = 0;
  private frameCount = 0;
  private startTime = performance.now();
  // Monitoring intervals
  private performanceInterval: number | null = null;
  private qualityCheckInterval: number | null = null;
  // Callbacks
  private onQualityChange?: (settings: QualitySettings) => void;
  private onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
  constructor(onQualityChange?: (settings: QualitySettings) => void, onPerformanceUpdate?: (metrics: PerformanceMetrics) => void) {
    this.onQualityChange = onQualityChange;
    this.onPerformanceUpdate = onPerformanceUpdate;
    // Initialize default metrics
    this.metrics = {
      frameRate: 0,
      renderTime: 0,
      gpuMemoryUsage: 0,
      cpuUsage: 0,
      networkLatency: 0,
      cacheHitRate: 0,
      chunksPerSecond: 0,
      qualityLevel: 1.0,
      adaptiveEnabled: true
    };
    // Detect client capabilities
    this.capabilities = this.detectClientCapabilities();
    // Initialize quality settings based on capabilities
    this.qualitySettings = this.getOptimalQualitySettings();
    this.startMonitoring();
  }
  /**
   * Detect client capabilities
   */;
  private detectClientCapabilities(): ClientCapabilities {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    const gl2 = canvas.getContext('webgl2');
    let gpuVendor = 'Unknown';
    let gpuRenderer = 'Unknown';
    let maxTextureSize = 1024;
    let memoryLimit = 256; // MB
    if (gl) {
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (debugInfo) {
        gpuVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL) || 'Unknown';
        gpuRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) || 'Unknown';
      }
      maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 1024;
    }
    // Estimate memory based on device characteristics
    const navigator_memory = (navigator as any).deviceMemory;
    if (navigator_memory) {
      memoryLimit = Math.min(navigator_memory * 1024 / 4, 512); // Conservative estimate
    }
    // Detect device type
    let deviceType: 'mobile' | 'tablet' | 'desktop' = 'desktop';
    if (/Mobile|Android|iPhone|iPad/.test(navigator.userAgent)) {
      deviceType = /iPad/.test(navigator.userAgent) ? 'tablet' : 'mobile';
    }
    // Detect connection speed
    const connection = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
    let connectionSpeed: 'slow' | 'medium' | 'fast' = 'medium';
    if (connection) {
      const effectiveType = connection.effectiveType;
      if (effectiveType === 'slow-2g' || effectiveType === '2g') {
        connectionSpeed = 'slow';
      } else if (effectiveType === '3g') {
        connectionSpeed = 'medium';
      } else if (effectiveType === '4g') {
        connectionSpeed = 'fast';
      }
    }
    // Detect supported formats
    const supportedFormats = ['rgba', 'rgb'];
    if (gl) {
      const ext = gl.getExtension('WEBGL_compressed_texture_s3tc');
      if (ext) {
        supportedFormats.push('dxt1', 'dxt3', 'dxt5');
      }
    }
    return {
      hasWebGL: !!gl,
      hasWebGL2: !!gl2,
      hasWASM: typeof WebAssembly !== 'undefined',
      maxTextureSize,
      supportedFormats,
      gpuVendor,
      gpuRenderer,
      memoryLimit,
      connectionSpeed,
      deviceType
    };
  }
  /**
   * Get optimal quality settings based on capabilities
   */;
  private getOptimalQualitySettings(): QualitySettings {
    const base: QualitySettings = {
      textureResolution: 1.0,
      compressionLevel: 0.8,
      chunkSize: 4096,
      cacheSize: 256,
      wasmEnabled: this.capabilities.hasWASM,
      gpuAcceleration: this.capabilities.hasWebGL,
      adaptiveThresholds: {
        excellent: 16.67, // 60fps
        good: 33.33, // 30fps
        poor: 66.67 // 15fps
      }
    };
    // Adjust based on device type
    switch (this.capabilities.deviceType) {
      case 'mobile':
        base.textureResolution = 0.6;
        base.compressionLevel = 0.9;
        base.chunkSize = 2048;
        base.cacheSize = 128;
        break;
      case 'tablet':
        base.textureResolution = 0.8;
        base.compressionLevel = 0.85;
        base.chunkSize = 3072;
        base.cacheSize = 192;
        break;
      case 'desktop':
        // Use base settings
        break;
    }
    // Adjust based on connection speed
    switch (this.capabilities.connectionSpeed) {
      case 'slow':
        base.compressionLevel = Math.max(0.9, base.compressionLevel);
        base.chunkSize = Math.min(2048, base.chunkSize);
        break;
      case 'medium':
        base.compressionLevel = Math.max(0.8, base.compressionLevel);
        break;
      case 'fast':
        // Use base settings or even reduce compression
        base.compressionLevel = Math.max(0.6, base.compressionLevel);
        break;
    }
    // Adjust based on GPU capabilities
    if (!this.capabilities.hasWebGL) {
      base.gpuAcceleration = false;
      base.textureResolution *= 0.8;
    }
    if (!this.capabilities.hasWASM) {
      base.wasmEnabled = false;
      base.compressionLevel = Math.min(0.7, base.compressionLevel); // Less compression without WASM
    }
    return base;
  }
  /**
   * Start performance monitoring
   */;
  private startMonitoring(): void {
    // Monitor frame performance
    this.performanceInterval = window.setInterval(() => {
      this.updatePerformanceMetrics();
    }, 1000);
    // Check quality adjustments
    this.qualityCheckInterval = window.setInterval(() => {
      this.checkQualityAdjustment();
    }, 5000);
  }
  /**
   * Update frame timing
   */;
  updateFrameTiming(renderTime: number): void {
    const now = performance.now();
    if (this.lastFrameTime > 0) {
      const frameTime = now - this.lastFrameTime;
      this.samples.push(frameTime);
      if (this.samples.length > this.sampleSize) {
        this.samples.shift();
      }
    }
    this.lastFrameTime = now;
    this.frameCount++;
    // Update render time
    this.metrics.renderTime = renderTime;
  }
  /**
   * Update cache statistics
   */;
  updateCacheStats(hits: number, total: number): void {
    this.metrics.cacheHitRate = total > 0 ? hits / total : 0;
  }
  /**
   * Update chunk loading rate
   */;
  updateChunkRate(chunksLoaded: number): void {
    const elapsed = (performance.now() - this.startTime) / 1000;
    this.metrics.chunksPerSecond = elapsed > 0 ? chunksLoaded / elapsed : 0;
  }
  /**
   * Update network latency
   */;
  updateNetworkLatency(latency: number): void {
    this.metrics.networkLatency = latency;
  }
  /**
   * Update performance metrics
   */;
  private updatePerformanceMetrics(): void {
    if (this.samples.length > 0) {
      const avgFrameTime = this.samples.reduce((sum, time) => sum + time, 0) / this.samples.length;
      this.metrics.frameRate = 1000 / avgFrameTime;
    }
    // Estimate GPU memory usage (simplified)
    this.metrics.gpuMemoryUsage = this.estimateGPUMemoryUsage();
    // Estimate CPU usage based on frame consistency
    this.metrics.cpuUsage = this.estimateCPUUsage();
    // Update quality level
    this.metrics.qualityLevel = this.qualitySettings.textureResolution;
    // Notify listeners
    if (this.onPerformanceUpdate) {
      this.onPerformanceUpdate({ ...this.metrics });
    }
  }
  /**
   * Check if quality adjustment is needed
   */;
  private checkQualityAdjustment(): void {
    if (!this.metrics.adaptiveEnabled) return;
    const avgFrameTime = this.metrics.frameRate > 0 ? 1000 / this.metrics.frameRate: 100;
    const { excellent, good, poor } = this.qualitySettings.adaptiveThresholds;
    let qualityAdjustment = 0;
    if (avgFrameTime > poor) {
      // Performance is poor, reduce quality
      qualityAdjustment = -0.1;
    } else if (avgFrameTime > good) {
      // Performance is fair, slight reduction
      qualityAdjustment = -0.05;
    } else if (avgFrameTime < excellent) {
      // Performance is excellent, can increase quality
      qualityAdjustment = 0.05;
    }
    if (qualityAdjustment !== 0) {
      this.adjustQuality(qualityAdjustment);
    }
  }
  /**
   * Adjust quality settings
   */;
  private adjustQuality(adjustment: number): void {
    const newResolution = Math.max(0.3, Math.min(1.0, this.qualitySettings.textureResolution + adjustment);
    if (Math.abs(newResolution - this.qualitySettings.textureResolution) > 0.01) {
      this.qualitySettings.textureResolution = newResolution;
      // Adjust other settings proportionally
      if (adjustment < 0) {
        // Reducing quality
        this.qualitySettings.compressionLevel = Math.min(0.95, this.qualitySettings.compressionLevel + 0.05);
        this.qualitySettings.chunkSize = Math.max(1024, this.qualitySettings.chunkSize - 512);
      } else {
        // Increasing quality
        this.qualitySettings.compressionLevel = Math.max(0.5, this.qualitySettings.compressionLevel - 0.05);
        this.qualitySettings.chunkSize = Math.min(4096, this.qualitySettings.chunkSize + 512);
      }
      console.log(`Quality adjusted: resolution=${newResolution.toFixed(2)}, compression=${this.qualitySettings.compressionLevel.toFixed(2)}`);
      // Notify listeners
      if (this.onQualityChange) {
        this.onQualityChange({ ...this.qualitySettings });
      }
    }
  }
  /**
   * Estimate GPU memory usage
   */;
  private estimateGPUMemoryUsage(): number {
    // Simplified estimation based on texture count and size
    // In a real implementation, this would query GPU memory APIs
    const estimatedTextureSize = 64; // KB per texture
    const textureCount = 10; // Rough estimate
    return textureCount * estimatedTextureSize;
  }
  /**
   * Estimate CPU usage based on frame timing variance
   */;
  private estimateCPUUsage(): number {
    if (this.samples.length < 10) return 0;
    const avgFrameTime = this.samples.reduce((sum, time) => sum + time, 0) / this.samples.length;
    const variance = this.samples.reduce((sum, time) => sum + Math.pow(time - avgFrameTime, 2), 0) / this.samples.length;
    const stdDev = Math.sqrt(variance);
    // Higher variance indicates more CPU stress
    return Math.min(100, (stdDev / avgFrameTime) * 100);
  }
  /**
   * Force quality level
   */;
  setQualityLevel(level: number): void {
    this.qualitySettings.textureResolution = Math.max(0.1, Math.min(1.0, level);
    if (this.onQualityChange) {
      this.onQualityChange({ ...this.qualitySettings });
    }
  }
  /**
   * Enable/disable adaptive quality
   */;
  setAdaptiveEnabled(enabled: boolean): void {
    this.metrics.adaptiveEnabled = enabled;
  }
  /**
   * Get current metrics
   */;
  getMetrics(): PerformanceMetrics {
    return { ...this.metrics };
  }
  /**
   * Get client capabilities
   */;
  getCapabilities(): ClientCapabilities {
    return { ...this.capabilities };
  }
  /**
   * Get current quality settings
   */;
  getQualitySettings(): QualitySettings {
    return { ...this.qualitySettings };
  }
  /**
   * Benchmark system performance
   */;
  async runBenchmark(): Promise<{
    cpuScore: number;
    gpuScore: number;
    memoryScore: number;
    networkScore: number;
    overallScore: number;
    recommendedQuality: number;
  }> {
    console.log('Running performance benchmark...');
    const results = {
      cpuScore: 0,
      gpuScore: 0,
      memoryScore: 0,
      networkScore: 0,
      overallScore: 0,
      recommendedQuality: 0.8
    };
    // CPU benchmark - JavaScript computation speed
    const cpuStart = performance.now();
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
      sum += Math.random() * Math.sin(i) * Math.cos(i);
    }
    const cpuTime = performance.now() - cpuStart;
    results.cpuScore = Math.max(0, Math.min(100, 100 - (cpuTime - 50) * 2);
    // GPU benchmark - WebGL operations
    if (this.capabilities.hasWebGL) {
      const canvas = document.createElement('canvas');
      canvas.width = 512;
      canvas.height = 512;
      const gl = canvas.getContext('webgl');
      if (gl) {
        const gpuStart = performance.now();
        // Create and render to texture
        const texture = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 512, 512, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
        // Simulate rendering operations
        for (let i = 0; i < 100; i++) {
          gl.clear(gl.COLOR_BUFFER_BIT);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
        }
        gl.finish(); // Wait for GPU
        const gpuTime = performance.now() - gpuStart;
        results.gpuScore = Math.max(0, Math.min(100, 100 - (gpuTime - 20) * 3);
        gl.deleteTexture(texture);
      }
    } else {
      results.gpuScore = 20; // Lower score for CPU fallback
    }
    // Memory benchmark - allocation and GC stress
    const memStart = performance.now();
    const arrays = [];
    for (let i = 0; i < 100; i++) {
      arrays.push(new Uint8Array(1024 * 1024); // 1MB arrays
    }
    const memTime = performance.now() - memStart;
    results.memoryScore = Math.max(0, Math.min(100, 100 - (memTime - 100) * 0.5);
    // Network benchmark - simple latency test
    try {
      const netStart = performance.now();
      const response = await fetch('data:text/plain;base64,SGVsbG8gV29ybGQ='); // Minimal test
      await response.text();
      const netTime = performance.now() - netStart;
      results.networkScore = Math.max(0, Math.min(100, 100 - netTime * 10);
    } catch {
      results.networkScore = 50; // Default if fetch fails
    }
    // Calculate overall score
    results.overallScore = (
      results.cpuScore * 0.3 +
      results.gpuScore * 0.4 +
      results.memoryScore * 0.2 +
      results.networkScore * 0.1
    );
    // Recommend quality level based on overall score
    if (results.overallScore >= 80) {
      results.recommendedQuality = 1.0;
    } else if (results.overallScore >= 60) {
      results.recommendedQuality = 0.8;
    } else if (results.overallScore >= 40) {
      results.recommendedQuality = 0.6;
    } else {
      results.recommendedQuality = 0.4;
    }
    console.log('Benchmark results:', results);
    return results;
  }
  /**
   * Generate performance report
   */;
  generateReport(): string {
    const report = {
      timestamp: new Date().toISOString(),
      capabilities: this.capabilities,
      metrics: this.metrics,
      qualitySettings: this.qualitySettings,
      recommendations: this.generateRecommendations()
    };
    return JSON.stringify(report, null, 2);
  }
  /**
   * Generate performance recommendations
   */;
  private generateRecommendations(): string[] {
    const recommendations: string[] = [];
    if (this.metrics.frameRate < 30) {
      recommendations.push('Consider reducing texture resolution or enabling aggressive compression');
    }
    if (this.metrics.cacheHitRate < 0.7) {
      recommendations.push('Increase cache size to improve performance');
    }
    if (this.metrics.networkLatency > 100) {
      recommendations.push('Enable compression to reduce bandwidth usage');
    }
    if (!this.capabilities.hasWebGL) {
      recommendations.push('WebGL not available - performance will be limited');
    }
    if (!this.capabilities.hasWASM) {
      recommendations.push('WebAssembly not available - some optimizations disabled');
    }
    if (this.capabilities.deviceType === 'mobile') {
      recommendations.push('Mobile device detected - consider battery-saving optimizations');
    }
    return recommendations;
  }
  /**
   * Cleanup monitoring
   */;
  dispose(): void {
    if (this.performanceInterval) {
      clearInterval(this.performanceInterval);
    }
    if (this.qualityCheckInterval) {
      clearInterval(this.qualityCheckInterval);
    }
  }
}
/**
 * Factory function for creating performance monitor
 */
export function createPerformanceMonitor(
  onQualityChange?: (settings: QualitySettings) => void,
  onPerformanceUpdate?: (metrics: PerformanceMetrics) => void;
): PerformanceMonitor {
  return new PerformanceMonitor(onQualityChange, onPerformanceUpdate);
}