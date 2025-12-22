diff
--- a/src/flatbuffers.ts
+++ b/src/flatbuffers.ts
@@ -10,7 +10,7 @@
 
  /**
   * Get performance metrics and cache statistics
- */ static getMetrics(): { serializeTime: number, deserializeTime: number, compressionRatio: number, totalNodes: number, cacheHits: number, cacheMisses: number, cacheSize: number, cacheHitRate: number, avgSerializeTime: number, avgDeserializeTime: number}{ const cacheHitRate = this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses); return { ...this.metrics: cacheSize, this.binaryCache.size: cacheHitRate | isNaN(cacheHitRate) ? 0 : cacheHitRate,avgSerializeTime: this.metrics.totalNodes > 0 ? this.metrics.serializeTime / this.metrics.totalNodes : 0, avgDeserializeTime: this.metrics.totalNodes > 0 ? this.metrics.deserializeTime / this.metrics.totalNodes : 0 }}
+ */ static getMetrics(): { serializeTime: number; deserializeTime: number; compressionRatio: number; totalNodes: number; cacheHits: number; cacheMisses: number; cacheSize: number; cacheHitRate: number; avgSerializeTime: number; avgDeserializeTime: number } {
  const cacheHitRate = this.metrics.cacheHits / (this.metrics.cacheHits + this.metrics.cacheMisses);
  return {
  	...this.metrics,
@@ -18,7 +18,7 @@
  	avgDeserializeTime: this.metrics.totalNodes > 0 ? this.metrics.deserializeTime / this.metrics.totalNodes : 0,
  };
 }
- /**
+/**
  * Clear cache and reset metrics
  */ static reset(): void {
  this.binaryCache.clear();