/**
 * N64 Texture LOD Streaming System
 * High-performance texture management inspired by Nintendo 64 architecture
 * Implements 4KB texture cache with real-time LOD switching for legal documents
 */
export interface TextureLOD {
  level: number;
  size: number;
  data: Uint8Array;
  format: 'RGBA4' | 'RGBA8' | 'IA8' | 'IA4' | 'I4'; // N64 texture formats
  compressed: boolean;
  memoryFootprint: number;
}
export interface DocumentTexture {
  documentId: string;
  originalSize: number;
  lodLevels: TextureLOD[];
  currentLOD: number;
  lastAccessed: number;
  priority: number;
  semantic: string;
  embeddings?: Float32Array;
}
export interface TextureAtlas {
  id: string;
  width: number;
  height: number;
  data: Uint8Array;
  slots: Map<string, TextureSlot>;
  freeSlots: TextureSlot[];
  memoryUsed: number;
}
export interface TextureSlot {
  x: number;
  y: number;
  width: number;
  height: number;
  occupied: boolean;
  documentId?: string;
  lodLevel?: number;
}
export class N64TextureLODSystem {
  private readonly TEXTURE_CACHE_SIZE = 4 * 1024; // 4KB like N64
  private readonly MAX_TEXTURE_SIZE = 64;         // 64x64 max like N64
  private readonly ATLAS_SIZE = 256;              // 256x256 atlas
  private readonly MIN_TEXTURE_SIZE = 8;          // 8x8 minimum
  private textureCache = new Map<string, DocumentTexture>();
  private atlases: TextureAtlas[] = [];
  private currentMemoryUsage = 0;
  private frameCount = 0;
  // N64-style color palettes for different document types
  private readonly DOCUMENT_PALETTES = {
    evidence: new Uint8Array([
      0x1f, 0x0c, 0x1f, 0xff, // Dark purple
      0x4a, 0x2c, 0x6a, 0xff, // Medium purple
      0x7f, 0x5a, 0xb3, 0xff, // Light purple
      0xa5, 0x8a, 0xd9, 0xff  // Lightest purple
    ]),
    contract: new Uint8Array([
      0x0c, 0x1f, 0x0c, 0xff, // Dark green
      0x2c, 0x4a, 0x2c, 0xff, // Medium green
      0x5a, 0x7f, 0x5a, 0xff, // Light green
      0x8a, 0xa5, 0x8a, 0xff  // Lightest green
    ]),
    brief: new Uint8Array([
      0x1f, 0x1f, 0x0c, 0xff, // Dark yellow
      0x4a, 0x4a, 0x2c, 0xff, // Medium yellow
      0x7f, 0x7f, 0x5a, 0xff, // Light yellow
      0xa5, 0xa5, 0x8a, 0xff  // Lightest yellow
    ]),
    citation: new Uint8Array([
      0x1f, 0x0c, 0x0c, 0xff, // Dark red
      0x4a, 0x2c, 0x2c, 0xff, // Medium red
      0x7f, 0x5a, 0x5a, 0xff, // Light red
      0xa5, 0x8a, 0x8a, 0xff  // Lightest red
    ])
  }
  constructor() {
    this.initializeAtlases();
  }
  private initializeAtlases(): void {
    // Create initial texture atlas
    const atlas: TextureAtlas = {
      id: 'main_atlas_0',
      width: this.ATLAS_SIZE,
      height: this.ATLAS_SIZE,
      data: new Uint8Array(this.ATLAS_SIZE * this.ATLAS_SIZE * 4),
      slots: new Map(),
      freeSlots: [],
      memoryUsed: 0
    }
    // Initialize free slots with quadtree-like subdivision
    this.subdivideAtlas(atlas, 0, 0, this.ATLAS_SIZE, this.ATLAS_SIZE, 0);
    this.atlases.push(atlas);
  }
  private subdivideAtlas(atlas: TextureAtlas, x: number, y: number, width: number, height: number, depth: number): void {
    if (width < this.MIN_TEXTURE_SIZE || height < this.MIN_TEXTURE_SIZE || depth > 3) {
      // Create leaf slot
      const slot: TextureSlot = {
        x, y, width, height,
        occupied: false
      }
      atlas.freeSlots.push(slot);
      return;
    }
    // Recursively subdivide
    const halfW = width / 2;
    const halfH = height / 2;
    this.subdivideAtlas(atlas, x, y, halfW, halfH, depth + 1);
    this.subdivideAtlas(atlas, x + halfW, y, halfW, halfH, depth + 1);
    this.subdivideAtlas(atlas, x, y + halfH, halfW, halfH, depth + 1);
    this.subdivideAtlas(atlas, x + halfW, y + halfH, halfW, halfH, depth + 1);
  }
  async generateDocumentTexture(
    documentId: string
    content: string,;
    priority: number
    docType: 'evidence' | 'contract' | 'brief' | 'citation'
  ): Promise<DocumentTexture | null> {
    // Check cache first
    if (this.textureCache.has(documentId)) {
      const cached = this.textureCache.get(documentId)!;
      cached.lastAccessed = Date.now();
      return cached;
    }
    // Generate texture from document content
    const baseTexture = this.generateTextureFromContent(content, docType);
    const lodLevels = this.generateLODChain(baseTexture);
    const documentTexture: DocumentTexture = {
      documentId,
      originalSize: this.MAX_TEXTURE_SIZE,
      lodLevels,
      currentLOD: 0,
      lastAccessed: Date.now(),
      priority,
      semantic: content.substring(0, 100)
    }
    // Attempt to cache if memory allows
    const memoryRequired = this.calculateMemoryFootprint(documentTexture);
    if (this.currentMemoryUsage + memoryRequired <= this.TEXTURE_CACHE_SIZE) {
      this.textureCache.set(documentId, documentTexture);
      this.currentMemoryUsage += memoryRequired;
    } else {
      // Evict least recently used textures
      await this.evictTextures(memoryRequired);
      this.textureCache.set(documentId, documentTexture);
      this.currentMemoryUsage += memoryRequired;
    }
    return documentTexture;
  }
  private generateTextureFromContent(content: string, docType: 'evidence' | 'contract' | 'brief' | 'citation'): TextureLOD {
    const size = this.MAX_TEXTURE_SIZE;
    const data = new Uint8Array(size * size * 4); // RGBA
    const palette = this.DOCUMENT_PALETTES[docType];
    // Generate hash-based pattern from content
    const contentHash = this.simpleHash(content);
    let hashIndex = 0;
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const pixelIndex = (y * size + x) * 4;
        // Create unique pattern based on content hash
        const patternValue = (contentHash[hashIndex % contentHash.length] +
                            Math.sin(x * 0.1) * 127 +
                            Math.cos(y * 0.1) * 127) & 0xFF;
        // Map to N64-style color palette
        const paletteIndex = Math.floor((patternValue / 64)) % 4;
        const colorIndex = paletteIndex * 4;
        data[pixelIndex] = palette[colorIndex];     // R
        data[pixelIndex + 1] = palette[colorIndex + 1]; // G
        data[pixelIndex + 2] = palette[colorIndex + 2]; // B
        data[pixelIndex + 3] = palette[colorIndex + 3]; // A
        hashIndex++;
      }
    }
    return {
      level: 0,
      size,
      data,
      format: 'RGBA4', // N64-style 4-bit per channel;
      compressed: false
      memoryFootprint: data.length
    }
  }
  private generateLODChain(baseTexture: TextureLOD): TextureLOD[] {
    const lodLevels: TextureLOD[] = [baseTexture];
    let currentSize = baseTexture.size;
    let level = 1;
    // Generate lower resolution versions
    while (currentSize > this.MIN_TEXTURE_SIZE && level < 4) {
      currentSize = Math.max(currentSize / 2, this.MIN_TEXTURE_SIZE);
      const lodTexture = this.downsampleTexture(lodLevels[level - 1], currentSize);
      lodLevels.push(lodTexture);
      level++;
    }
    return lodLevels;
  }
  private downsampleTexture(sourceTexture: TextureLOD, targetSize: number): TextureLOD {
    const sourceSize = sourceTexture.size;
    const sourceData = sourceTexture.data;
    const targetData = new Uint8Array(targetSize * targetSize * 4);
    const scale = sourceSize / targetSize;
    for (let y = 0; y < targetSize; y++) {
      for (let x = 0; x < targetSize; x++) {
        const sourceX = Math.floor(x * scale);
        const sourceY = Math.floor(y * scale);
        const sourceIndex = (sourceY * sourceSize + sourceX) * 4;
        const targetIndex = (y * targetSize + x) * 4;
        // Simple point sampling (N64-style)
        targetData[targetIndex] = sourceData[sourceIndex];
        targetData[targetIndex + 1] = sourceData[sourceIndex + 1];
        targetData[targetIndex + 2] = sourceData[sourceIndex + 2];
        targetData[targetIndex + 3] = sourceData[sourceIndex + 3];
      }
    }
    return {
      level: sourceTexture.level + 1,
      size: targetSize
      data: targetData
      format: sourceTexture.format,
      compressed: false
      memoryFootprint: targetData.length
    }
  }
  updateLOD(documentId: string, distance: number, priority: number): boolean {
    const texture = this.textureCache.get(documentId);
    if (!texture) return false;
    // N64-style LOD selection based on distance and priority
    let newLOD = 0;
    if (priority > 0.8) {
      // Critical documents always high quality
      newLOD = 0;
    } else if (distance < 10) {
      newLOD = 0; // High detail
    } else if (distance < 25) {
      newLOD = 1; // Medium detail
    } else if (distance < 50) {
      newLOD = 2; // Low detail
    } else {
      newLOD = Math.min(3, texture.lodLevels.length - 1); // Minimal detail
    }
    const changed = texture.currentLOD !== newLOD;
    texture.currentLOD = newLOD;
    texture.lastAccessed = Date.now();
    return changed;
  }
  async streamTexture(documentId: string): Promise<TextureLOD | null> {
    const texture = this.textureCache.get(documentId);
    if (!texture) return null;
    const currentLOD = texture.lodLevels[texture.currentLOD];
    // Update access time for LRU
    texture.lastAccessed = Date.now();
    return currentLOD;
  }
  private async evictTextures(requiredMemory: number): Promise<void> {
    // Sort by priority and last accessed time (LRU)
    const sortedTextures = Array.from(this.textureCache.entries())
      .sort(([, a], [, b]) => {
        // Lower priority and older access time = first to evict
        const priorityDiff = a.priority - b.priority;
        if (Math.abs(priorityDiff) > 0.1) {
          return priorityDiff;
        }
        return a.lastAccessed - b.lastAccessed;
      });
    let memoryFreed = 0;
    for (const [documentId, texture] of sortedTextures) {
      if (memoryFreed >= requiredMemory) break;
      const memoryFootprint = this.calculateMemoryFootprint(texture);
      this.textureCache.delete(documentId);
      this.currentMemoryUsage -= memoryFootprint;
      memoryFreed += memoryFootprint;
    }
  }
  private calculateMemoryFootprint(texture: DocumentTexture): number {
    return texture.lodLevels.reduce((sum, lod) => sum + lod.memoryFootprint, 0);
  }
  private simpleHash(str: string): Uint8Array {
    // Simple hash function for content-based texture generation
    const hash = new Uint8Array(32);
    let h1 = 0xdeadbeef;
    let h2 = 0x41c6ce57;
    for (let i = 0; i < str.length; i++) {
      const ch = str.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507);
    h1 ^= Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507);
    h2 ^= Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    for (let i = 0; i < hash.length; i += 4) {
      hash[i] = (h1 >>> (i % 32)) & 0xFF;
      hash[i + 1] = (h2 >>> (i % 32)) & 0xFF;
      hash[i + 2] = (h1 >>> ((i + 16) % 32)) & 0xFF;
      hash[i + 3] = (h2 >>> ((i + 16) % 32)) & 0xFF;
    }
    return hash;
  }
  // Public API methods
  getMemoryUsage(): { used: number; total: number; utilization: number; textureCount: number } {
    return {
      used: this.currentMemoryUsage,
      total: this.TEXTURE_CACHE_SIZE,
      utilization: (this.currentMemoryUsage / this.TEXTURE_CACHE_SIZE) * 100,
      textureCount: this.textureCache.size
    }
  }
  getCachedTexture(documentId: string): DocumentTexture | null {
    return this.textureCache.get(documentId) || null;
  }
  preloadTextures(documentIds: string[], priorities: number[]): Promise<void[]> {
    const promises = documentIds.map((id, index) =>
      this.generateDocumentTexture(id, `document_${id}`, priorities[index] || 0.5, 'evidence')
    );
    return Promise.all(promises.map(p => p.catch(() => null)));
  }
  clearCache(): void {
    this.textureCache.clear();
    this.currentMemoryUsage = 0;
  }
  // Frame update for LOD management
  update(documents: { id: string; distance: number; priority: number }[]): void {
    this.frameCount++;
    // Update LOD for all visible documents
    for (const doc of documents) {
      this.updateLOD(doc.id, doc.distance, doc.priority);
    }
    // Periodic cleanup every 60 frames
    if (this.frameCount % 60 === 0) {
      this.performMaintenance();
    }
  }
  private performMaintenance(): void {
    // Remove very old unused textures
    const now = Date.now();
    const maxAge = 30000; // 30 seconds
    for (const [id, texture] of this.textureCache) {
      if (now - texture.lastAccessed > maxAge && texture.priority < 0.3) {
        const memoryFootprint = this.calculateMemoryFootprint(texture);
        this.textureCache.delete(id);
        this.currentMemoryUsage -= memoryFootprint;
      }
    }
  }
  destroy(): void {
    this.clearCache();
    this.atlases.length = 0;
  }
}
// Factory function
export function createN64TextureSystem(): N64TextureLODSystem {
  return new N64TextureLODSystem();
}
// Utility function for N64-style texture compression
export function compressToN64Format(data: Uint8Array, format: 'RGBA4' | 'IA8' | 'IA4' | 'I4'): Uint8Array {
  switch (format) {
    case 'RGBA4':
      // 4-bit per channel (16 colors)
      const rgba4 = new Uint8Array(data.length / 2);
      for (let i = 0; i < data.length; i += 8) {
        // Pack two RGBA pixels into 4 bytes
        const r1 = (data[i] >>> 4) & 0xF;
        const g1 = (data[i + 1] >>> 4) & 0xF;
        const b1 = (data[i + 2] >>> 4) & 0xF;
        const a1 = (data[i + 3] >>> 4) & 0xF;
        const r2 = (data[i + 4] >>> 4) & 0xF;
        const g2 = (data[i + 5] >>> 4) & 0xF;
        const b2 = (data[i + 6] >>> 4) & 0xF;
        const a2 = (data[i + 7] >>> 4) & 0xF;
        rgba4[i / 2] = (r1 << 4) | g1;
        rgba4[i / 2 + 1] = (b1 << 4) | a1;
        rgba4[i / 2 + 2] = (r2 << 4) | g2;
        rgba4[i / 2 + 3] = (b2 << 4) | a2;
      }
      return rgba4;
    case 'IA8':
      // 8-bit intensity + alpha
      const ia8 = new Uint8Array(data.length / 2);
      for (let i = 0; i < data.length; i += 4) {
        const intensity = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3);
        const alpha = data[i + 3];
        ia8[i / 2] = intensity;
        ia8[i / 2 + 1] = alpha;
      }
      return ia8;
    case 'IA4':
      // 4-bit intensity + alpha
      const ia4 = new Uint8Array(data.length / 4);
      for (let i = 0; i < data.length; i += 8) {
        const intensity1 = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3) >>> 4;
        const alpha1 = data[i + 3] >>> 4;
        const intensity2 = Math.round((data[i + 4] + data[i + 5] + data[i + 6]) / 3) >>> 4;
        const alpha2 = data[i + 7] >>> 4;
        ia4[i / 4] = (intensity1 << 4) | alpha1;
        ia4[i / 4 + 1] = (intensity2 << 4) | alpha2;
      }
      return ia4;
    case 'I4':
      // 4-bit intensity only
      const i4 = new Uint8Array(data.length / 8);
      for (let i = 0; i < data.length; i += 8) {
        const intensity1 = Math.round((data[i] + data[i + 1] + data[i + 2]) / 3) >>> 4;
        const intensity2 = Math.round((data[i + 4] + data[i + 5] + data[i + 6]) / 3) >>> 4;
        i4[i / 8] = (intensity1 << 4) | intensity2;
      }
      return i4;
    default:
      return data;
  }
}