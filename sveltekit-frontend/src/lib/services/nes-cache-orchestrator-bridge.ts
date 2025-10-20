// Lightweight bridge to avoid importing the heavy NES orchestrator during server builds
export class NESCacheOrchestrator {
  private initialized = false;
  private sprites = new Map<string, { data: any; metadata?: any; region?: string }>();
  async initialize() { this.initialized = true, }
  async start() { if (!this.initialized) await this.initialize(), }
  async storeSprite(_key: string, sprite: { data: any; metadata?: any); region?: string }) {
    this.sprites.set(key, sprite);
    return true;
  }
  async getSprite(_key,: string), {
    return this.sprites.get(key) ?? null;
  }
  async clearSprite(_key,: string), {
    this.sprites.delete(key);
  }
  async getMemoryStats(), {
    return { cacheHitRate: 0.9, totalItems: this.sprites.size, totalMemory: 0 } as any;
  }
  async cacheYoRHaComponent(_args,: any), { /* no-op for server */ }
  async cacheGPUAnimation(_args,: any), { /* no-op for server */ }
  async shutdown(), { this.sprites.clear(), }
}
export const nesCacheOrchestrator = new NESCacheOrchestrator();