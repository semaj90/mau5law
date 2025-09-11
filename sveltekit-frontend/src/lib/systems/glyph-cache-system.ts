/**
 * Glyph Cache Storage System
 * Stores NES-style character glyphs with texture streaming
 * Integrates with CHR-ROM caching and quantized text processing
 */

import { base64FP32Quantizer } from '../text/base64-fp32-quantizer';
import { chrRomPatternCache } from '../cache/chr-rom-pattern-cache';
import { enhancedCachingRevolutionaryBridge } from '../services/enhanced-caching-revolutionary-bridge';

export interface GlyphTexture {
  char: string;
  charCode: number;
  nesPattern: Uint8Array; // 8x8 NES-style pattern
  quantizedData: Float32Array; // Quantized representation
  textureData: ImageData | null; // Rendered texture
  chrRomBankId: number; // CHR-ROM bank assignment
  cacheTimestamp: number;
  accessCount: number;
  renderMetrics: {
    width: number;
    height: number;
    pixelDensity: number;
    colorDepth: number;
  };
}

export interface GlyphFont {
  fontName: string;
  fontSize: number;
  fontStyle: 'classic' | 'modern' | 'legal' | 'retro';
  glyphs: Map<string, GlyphTexture>;
  totalGlyphs: number;
  cacheSize: number; // In bytes
  lastOptimized: number;
}

export interface GlyphCacheMetrics {
  totalGlyphs: number;
  cacheHitRate: number;
  memoryUsage: number;
  renderingTime: number;
  compressionRatio: number;
  nesPatternEfficiency: number;
}

export interface SynthesizedGlyph {
  original: string;
  synthesized: string;
  confidence: number;
  didYouMean: string[];
  llmGenerated: boolean;
  embeddings: Float32Array;
}

export class GlyphCacheSystem {
  private fonts = new Map<string, GlyphFont>();
  private renderCanvas: HTMLCanvasElement;
  private renderContext: CanvasRenderingContext2D;
  private readonly GLYPH_SIZE = 8; // 8x8 NES standard
  private readonly MAX_CACHE_SIZE = 50 * 1024 * 1024; // 50MB max cache
  private readonly CACHE_CLEANUP_INTERVAL = 300000; // 5 minutes

  // LLM Integration for "did you mean" suggestions
  private llmCache = new Map<string, string[]>();
  private ollamaUrl: string = 'http://localhost:11437';

  // Performance metrics
  private metrics: GlyphCacheMetrics = {
    totalGlyphs: 0,
    cacheHitRate: 0,
    memoryUsage: 0,
    renderingTime: 0,
    compressionRatio: 0,
    nesPatternEfficiency: 0
  };

  private cacheHits = 0;
  private cacheRequests = 0;
  private cleanupInterval: number;

  constructor() {
    this.initializeRenderingSystem();
    this.startCacheCleanup();
    this.loadPersistedCache();
  }

  private initializeRenderingSystem(): void {
    if (typeof window === 'undefined') return;

    // Create off-screen canvas for glyph rendering
    this.renderCanvas = document.createElement('canvas');
    this.renderCanvas.width = this.GLYPH_SIZE;
    this.renderCanvas.height = this.GLYPH_SIZE;

    const context = this.renderCanvas.getContext('2d');
    if (!context) {
      throw new Error('Failed to get 2D rendering context');
    }

    this.renderContext = context;

    // Configure for pixel-perfect rendering
    this.renderContext.imageSmoothingEnabled = false;
    this.renderContext.textAlign = 'center';
    this.renderContext.textBaseline = 'middle';

    console.log('🎨 Glyph rendering system initialized');
  }

  private startCacheCleanup(): void {
    this.cleanupInterval = setInterval(() => {
      this.optimizeCache();
    }, this.CACHE_CLEANUP_INTERVAL);
  }

  private async loadPersistedCache(): Promise<void> {
    try {
      // Try to load cached glyphs from localStorage or IndexedDB
      const persistedData = localStorage.getItem('glyph_cache_system');
      if (persistedData) {
        const cacheData = JSON.parse(persistedData);
        console.log(`💾 Loaded ${Object.keys(cacheData).length} font caches from storage`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persisted glyph cache:', error);
    }
  }

  /**
   * Get or create a glyph texture for a character
   */
  async getGlyph(
    char: string,
    fontStyle: 'classic' | 'modern' | 'legal' | 'retro' = 'legal',
    fontSize: number = 8
  ): Promise<GlyphTexture> {
    const startTime = performance.now();
    this.cacheRequests++;

    const fontKey = `${fontStyle}_${fontSize}`;

    // Get or create font cache
    if (!this.fonts.has(fontKey)) {
      await this.createFontCache(fontKey, fontStyle, fontSize);
    }

    const font = this.fonts.get(fontKey)!;

    // Check if glyph already cached
    if (font.glyphs.has(char)) {
      const glyph = font.glyphs.get(char)!;
      glyph.accessCount++;
      this.cacheHits++;

      const renderTime = performance.now() - startTime;
      this.updateMetrics(renderTime, true);

      console.log(`🎯 Glyph cache hit: '${char}' (${renderTime.toFixed(2)}ms)`);
      return glyph;
    }

    // Cache miss - generate new glyph
    const glyph = await this.generateGlyph(char, fontStyle, fontSize);
    font.glyphs.set(char, glyph);
    font.totalGlyphs++;

    // Store in CHR-ROM system
    await this.storeToCHRROM(glyph);

    const renderTime = performance.now() - startTime;
    this.updateMetrics(renderTime, false);

    console.log(`✨ Generated new glyph: '${char}' (${renderTime.toFixed(2)}ms)`);
    return glyph;
  }

  private async createFontCache(
    fontKey: string,
    fontStyle: string,
    fontSize: number
  ): Promise<void> {
    const font: GlyphFont = {
      fontName: fontKey,
      fontSize,
      fontStyle: fontStyle as any,
      glyphs: new Map(),
      totalGlyphs: 0,
      cacheSize: 0,
      lastOptimized: Date.now()
    };

    this.fonts.set(fontKey, font);
    console.log(`📝 Created font cache: ${fontKey}`);
  }

  private async generateGlyph(
    char: string,
    fontStyle: string,
    fontSize: number
  ): Promise<GlyphTexture> {
    const charCode = char.charCodeAt(0);

    // Generate NES-style 8x8 pattern
    const nesPattern = this.generateNESPattern(char, fontStyle);

    // Render glyph to texture
    const textureData = this.renderGlyphTexture(char, nesPattern, fontStyle);

    // Quantize glyph data for compression
    const quantizedData = await this.quantizeGlyph(char, nesPattern);

    // Assign CHR-ROM bank
    const chrRomBankId = this.assignCHRROMBank(charCode);

    const glyph: GlyphTexture = {
      char,
      charCode,
      nesPattern,
      quantizedData,
      textureData,
      chrRomBankId,
      cacheTimestamp: Date.now(),
      accessCount: 1,
      renderMetrics: {
        width: this.GLYPH_SIZE,
        height: this.GLYPH_SIZE,
        pixelDensity: 1,
        colorDepth: 32 // RGBA
      }
    };

    return glyph;
  }

  private generateNESPattern(char: string, fontStyle: string): Uint8Array {
    const pattern = new Uint8Array(64); // 8x8 pattern
    const charCode = char.charCodeAt(0);

    // Style-specific pattern generation
    switch (fontStyle) {
      case 'classic':
        return this.generateClassicNESPattern(char, charCode);
      case 'modern':
        return this.generateModernPattern(char, charCode);
      case 'legal':
        return this.generateLegalPattern(char, charCode);
      case 'retro':
        return this.generateRetroPattern(char, charCode);
      default:
        return this.generateClassicNESPattern(char, charCode);
    }
  }

  private generateClassicNESPattern(char: string, charCode: number): Uint8Array {
    const pattern = new Uint8Array(64);

    // Classic NES font patterns
    const patterns = {
      'A': [0x18, 0x3C, 0x66, 0x7E, 0x66, 0x66, 0x66, 0x00],
      'B': [0x7C, 0x66, 0x66, 0x7C, 0x66, 0x66, 0x7C, 0x00],
      'C': [0x3C, 0x66, 0x60, 0x60, 0x60, 0x66, 0x3C, 0x00],
      'D': [0x78, 0x6C, 0x66, 0x66, 0x66, 0x6C, 0x78, 0x00],
      'E': [0x7E, 0x60, 0x60, 0x78, 0x60, 0x60, 0x7E, 0x00],
      ' ': [0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00]
    };

    const charPattern = patterns[char] || this.generateFallbackPattern(charCode);

    // Convert to 8x8 pixel array
    for (let row = 0; row < 8; row++) {
      const rowData = charPattern[row];
      for (let col = 0; col < 8; col++) {
        const pixel = (rowData >> (7 - col)) & 1;
        pattern[row * 8 + col] = pixel * 255;
      }
    }

    return pattern;
  }

  private generateModernPattern(char: string, charCode: number): Uint8Array {
    const pattern = new Uint8Array(64);

    // Modern style with anti-aliasing simulation
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const index = y * 8 + x;

        // Create smoother patterns
        const centerX = 4, centerY = 4;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);

        if (char === 'O' || char === 'o') {
          // Circle pattern
          pattern[index] = distance < 3 && distance > 1 ? 255 : 0;
        } else if (char.match(/[A-Z]/)) {
          // Bold uppercase
          pattern[index] = ((x + y + charCode) % 3 === 0) ? 255 : 128;
        } else {
          // Regular pattern
          pattern[index] = ((x * y + charCode) % 4 === 0) ? 192 : 0;
        }
      }
    }

    return pattern;
  }

  private generateLegalPattern(char: string, charCode: number): Uint8Array {
    const pattern = new Uint8Array(64);

    // Legal-themed patterns with high readability
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const index = y * 8 + x;

        if (char === '§') {
          // Section symbol - special legal character
          const isSectionPattern = (x === 2 || x === 5) && (y >= 1 && y <= 6);
          pattern[index] = isSectionPattern ? 255 : 0;
        } else if (char === '¶') {
          // Paragraph symbol
          const isParagraphPattern = (x <= 3 && y >= 2 && y <= 5) || (x === 4 && y === 3);
          pattern[index] = isParagraphPattern ? 255 : 0;
        } else if (char.match(/[A-Z]/)) {
          // Professional uppercase
          pattern[index] = ((x === 0 || x === 7 || y === 0 || y === 7) && (x + y) % 2 === 0) ? 255 : 0;
        } else {
          // Standard readable pattern
          pattern[index] = ((x + y + charCode) % 5 === 0) ? 255 : 64;
        }
      }
    }

    return pattern;
  }

  private generateRetroPattern(char: string, charCode: number): Uint8Array {
    const pattern = new Uint8Array(64);

    // Retro arcade-style patterns
    for (let y = 0; y < 8; y++) {
      for (let x = 0; x < 8; x++) {
        const index = y * 8 + x;

        // Create retro scan-line effect
        const scanLine = y % 2 === 0 ? 255 : 128;
        const pixelPattern = ((x + charCode) % 3 === 0) ? scanLine : 0;

        pattern[index] = pixelPattern;
      }
    }

    return pattern;
  }

  private generateFallbackPattern(charCode: number): number[] {
    // Generate a fallback pattern for unknown characters
    const pattern = new Array(8).fill(0);

    for (let i = 0; i < 8; i++) {
      pattern[i] = (charCode + i) % 256;
    }

    return pattern;
  }

  private renderGlyphTexture(
    char: string,
    nesPattern: Uint8Array,
    fontStyle: string
  ): ImageData | null {
    if (!this.renderContext) return null;

    // Clear canvas
    this.renderContext.clearRect(0, 0, this.GLYPH_SIZE, this.GLYPH_SIZE);

    // Create image data
    const imageData = this.renderContext.createImageData(this.GLYPH_SIZE, this.GLYPH_SIZE);
    const data = imageData.data;

    // Style-specific colors
    const styleColors = {
      classic: [255, 255, 255, 255], // White
      modern: [0, 255, 0, 255],      // Green
      legal: [255, 215, 0, 255],     // Gold
      retro: [255, 0, 255, 255]      // Magenta
    };

    const color = styleColors[fontStyle] || styleColors.legal;

    // Render pattern to image data
    for (let i = 0; i < 64; i++) {
      const pixelIntensity = nesPattern[i];
      const dataIndex = i * 4;

      if (pixelIntensity > 0) {
        data[dataIndex] = color[0];     // R
        data[dataIndex + 1] = color[1]; // G
        data[dataIndex + 2] = color[2]; // B
        data[dataIndex + 3] = Math.min(255, pixelIntensity); // A
      } else {
        data[dataIndex + 3] = 0; // Transparent
      }
    }

    return imageData;
  }

  private async quantizeGlyph(char: string, nesPattern: Uint8Array): Promise<Float32Array> {
    try {
      // Convert pattern to base64 for quantization
      const patternString = Array.from(nesPattern).join(',');
      const base64Pattern = btoa(patternString);

      // Quantize using our FP32 system
      const quantizationResult = await base64FP32Quantizer.quantizeGemmaOutput(base64Pattern, {
        quantizationBits: 8,
        scalingMethod: 'sigmoid',
        targetLength: 64,
        cudaThreads: 32,
        cacheStrategy: 'aggressive'
      });

      return quantizationResult.quantizedData as Float32Array;

    } catch (error) {
      console.error(`❌ Glyph quantization failed for '${char}':`, error);
      return new Float32Array(64);
    }
  }

  private assignCHRROMBank(charCode: number): number {
    // Assign characters to CHR-ROM banks based on character code
    // Similar to how NES games organized character graphics

    if (charCode >= 32 && charCode <= 126) {
      // Printable ASCII characters
      return Math.floor((charCode - 32) / 12) % 8; // Distribute across 8 banks
    } else if (charCode >= 128 && charCode <= 255) {
      // Extended ASCII
      return (charCode % 8);
    } else {
      // Unicode or special characters
      return 7; // Special bank for unusual characters
    }
  }

  private async storeToCHRROM(glyph: GlyphTexture): Promise<void> {
    try {
      const patternId = `glyph_${glyph.charCode}_${glyph.chrRomBankId}`;

      await chrRomPatternCache.generateAndCachePattern(patternId, {
        documentType: 'citation',
        riskLevel: 'low',
        visualStyle: 'classic',
        colorScheme: 'default',
        animated: false
      });

      console.log(`🎮 Stored glyph '${glyph.char}' to CHR-ROM bank ${glyph.chrRomBankId}`);

    } catch (error) {
      console.warn(`⚠️ CHR-ROM storage failed for '${glyph.char}':`, error);
    }
  }

  private updateMetrics(renderTime: number, cacheHit: boolean): void {
    this.metrics.renderingTime = (this.metrics.renderingTime + renderTime) / 2;
    this.metrics.cacheHitRate = this.cacheHits / this.cacheRequests;

    // Calculate memory usage
    let totalMemory = 0;
    this.fonts.forEach(font => {
      font.glyphs.forEach(glyph => {
        totalMemory += 64 + (glyph.quantizedData.byteLength || 0) +
                      (glyph.textureData ? glyph.textureData.data.byteLength : 0);
      });
    });

    this.metrics.memoryUsage = totalMemory;
    this.metrics.totalGlyphs = Array.from(this.fonts.values())
      .reduce((sum, font) => sum + font.totalGlyphs, 0);
  }

  private optimizeCache(): void {
    console.log('🧹 Optimizing glyph cache...');

    const cutoffTime = Date.now() - (30 * 60 * 1000); // 30 minutes
    let removedCount = 0;

    this.fonts.forEach((font, fontKey) => {
      const toRemove: string[] = [];

      font.glyphs.forEach((glyph, char) => {
        // Remove old, rarely accessed glyphs
        if (glyph.cacheTimestamp < cutoffTime && glyph.accessCount < 3) {
          toRemove.push(char);
        }
      });

      toRemove.forEach(char => {
        font.glyphs.delete(char);
        font.totalGlyphs--;
        removedCount++;
      });

      font.lastOptimized = Date.now();
    });

    console.log(`🗑️ Removed ${removedCount} unused glyphs from cache`);

    // Persist optimized cache
    this.persistCache();
  }

  private persistCache(): void {
    try {
      const cacheData = {};
      this.fonts.forEach((font, key) => {
        const glyphData = {};
        font.glyphs.forEach((glyph, char) => {
          glyphData[char] = {
            charCode: glyph.charCode,
            nesPattern: Array.from(glyph.nesPattern),
            chrRomBankId: glyph.chrRomBankId,
            accessCount: glyph.accessCount
          };
        });
        cacheData[key] = { ...font, glyphs: glyphData };
      });

      localStorage.setItem('glyph_cache_system', JSON.stringify(cacheData));
      console.log('💾 Glyph cache persisted to storage');

    } catch (error) {
      console.warn('⚠️ Failed to persist glyph cache:', error);
    }
  }

  /**
   * Preload commonly used characters
   */
  async preloadCommonGlyphs(fontStyle: 'classic' | 'modern' | 'legal' | 'retro' = 'legal'): Promise<void> {
    const commonChars =
      'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789' +
      '.,;:!?-()[]{}"\' ' +
      '§¶©®™'; // Legal symbols

    console.log(`📚 Preloading ${commonChars.length} common glyphs...`);

    const promises = [];
    for (const char of commonChars) {
      promises.push(this.getGlyph(char, fontStyle));
    }

    await Promise.all(promises);
    console.log(`✅ Preloaded ${commonChars.length} glyphs for ${fontStyle} style`);
  }

  /**
   * Get glyph cache metrics
   */
  getMetrics(): GlyphCacheMetrics {
    return { ...this.metrics };
  }

  /**
   * Clear entire cache
   */
  clearCache(): void {
    this.fonts.clear();
    this.cacheHits = 0;
    this.cacheRequests = 0;
    localStorage.removeItem('glyph_cache_system');
    console.log('🧹 Glyph cache cleared');
  }

  /**
   * Export glyph as data URL
   */
  exportGlyphAsDataURL(char: string, fontStyle: string = 'legal'): string | null {
    const fontKey = `${fontStyle}_8`;
    const font = this.fonts.get(fontKey);

    if (!font || !font.glyphs.has(char)) {
      return null;
    }

    const glyph = font.glyphs.get(char)!;
    if (!glyph.textureData) return null;

    // Create temporary canvas
    const canvas = document.createElement('canvas');
    canvas.width = this.GLYPH_SIZE;
    canvas.height = this.GLYPH_SIZE;
    const ctx = canvas.getContext('2d')!;

    ctx.putImageData(glyph.textureData, 0, 0);
    return canvas.toDataURL();
  }

  /**
   * LLM Integration - Get "did you mean" suggestions from gemma3:legal-latest
   */
  async getLLMSuggestions(inputText: string): Promise<string[]> {
    const cacheKey = `suggestions_${inputText}`;
    
    if (this.llmCache.has(cacheKey)) {
      return this.llmCache.get(cacheKey)!;
    }

    try {
      const response = await fetch(`${this.ollamaUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:legal-latest',
          prompt: `Given the text "${inputText}", provide 3-5 "did you mean" suggestions for legal terminology. Focus on legal terms, case names, and professional language. Respond only with suggestions separated by commas.`,
          stream: false,
          options: {
            temperature: 0.3,
            top_p: 0.9,
            max_tokens: 100
          }
        })
      });

      if (!response.ok) {
        throw new Error(`LLM request failed: ${response.status}`);
      }

      const data = await response.json();
      const suggestions = data.response
        .split(',')
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 0)
        .slice(0, 5);

      this.llmCache.set(cacheKey, suggestions);
      console.log(`🤖 Generated ${suggestions.length} LLM suggestions for "${inputText}"`);
      
      return suggestions;

    } catch (error) {
      console.error('❌ LLM suggestion generation failed:', error);
      return [inputText]; // Fallback to original
    }
  }

  /**
   * Generate embeddings for glyph text using gemma3:legal-latest
   */
  async generateEmbedding(text: string): Promise<Float32Array> {
    try {
      const response = await fetch(`${this.ollamaUrl}/api/embeddings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'gemma3:legal-latest',
          prompt: text
        })
      });

      if (!response.ok) {
        throw new Error(`Embedding request failed: ${response.status}`);
      }

      const data = await response.json();
      return new Float32Array(data.embedding);

    } catch (error) {
      console.error('❌ Embedding generation failed:', error);
      return new Float32Array(384); // Default embedding size
    }
  }

  /**
   * Synthesize glyph combinations with LLM suggestions
   */
  async synthesizeGlyphCombinations(inputGlyphs: string[]): Promise<SynthesizedGlyph[]> {
    const combinations = this.generateCombinations(inputGlyphs);
    const synthesized: SynthesizedGlyph[] = [];

    for (const combo of combinations) {
      const didYouMean = await this.getLLMSuggestions(combo);
      const embedding = await this.generateEmbedding(combo);
      
      synthesized.push({
        original: inputGlyphs.join(''),
        synthesized: combo,
        confidence: this.calculateConfidence(combo, inputGlyphs),
        didYouMean,
        llmGenerated: true,
        embeddings: embedding
      });
    }

    console.log(`✨ Synthesized ${synthesized.length} glyph combinations`);
    return synthesized;
  }

  /**
   * Generate combinations from input glyphs
   */
  private generateCombinations(glyphs: string[]): string[] {
    const combinations: string[] = [];
    const text = glyphs.join('');

    // Generate variations
    combinations.push(text); // Original
    combinations.push(text.toLowerCase()); // Lowercase
    combinations.push(text.toUpperCase()); // Uppercase
    combinations.push(text.replace(/\s+/g, '')); // No spaces
    
    // Legal document variations
    if (text.includes('contract')) {
      combinations.push('agreement', 'deed', 'covenant');
    }
    if (text.includes('case')) {
      combinations.push('matter', 'proceeding', 'litigation');
    }
    if (text.includes('evidence')) {
      combinations.push('exhibit', 'proof', 'documentation');
    }

    return [...new Set(combinations)]; // Remove duplicates
  }

  /**
   * Calculate confidence score for synthesized text
   */
  private calculateConfidence(synthesized: string, originalGlyphs: string[]): number {
    const original = originalGlyphs.join('');
    
    // Basic similarity metrics
    const lengthSimilarity = 1 - Math.abs(synthesized.length - original.length) / Math.max(synthesized.length, original.length);
    const characterSimilarity = this.calculateLevenshteinSimilarity(synthesized, original);
    
    return (lengthSimilarity + characterSimilarity) / 2;
  }

  /**
   * Calculate Levenshtein similarity
   */
  private calculateLevenshteinSimilarity(a: string, b: string): number {
    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    const distance = matrix[b.length][a.length];
    const maxLength = Math.max(a.length, b.length);
    return maxLength === 0 ? 1 : 1 - distance / maxLength;
  }

  /**
   * Stream glyphs to CHR-ROM with quantization
   */
  async streamToTexture(glyphs: GlyphTexture[]): Promise<void> {
    try {
      const textureData = glyphs.map(glyph => ({
        char: glyph.char,
        pattern: Array.from(glyph.nesPattern),
        quantized: Array.from(glyph.quantizedData),
        bankId: glyph.chrRomBankId
      }));

      await enhancedCachingRevolutionaryBridge.storeTextureStream('glyph_cache', textureData);
      console.log(`🎮 Streamed ${glyphs.length} glyphs to texture cache`);

    } catch (error) {
      console.error('❌ Texture streaming failed:', error);
    }
  }

  /**
   * Dispose resources
   */
  dispose(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.persistCache();
    this.fonts.clear();

    console.log('🗑️ Glyph cache system disposed');
  }
}

/**
 * Singleton instance for global use
 */
export const glyphCacheSystem = new GlyphCacheSystem();

/**
 * Convenience functions
 */

export async function getCachedGlyph(
  char: string,
  style: 'classic' | 'modern' | 'legal' | 'retro' = 'legal'
): Promise<GlyphTexture> {
  return await glyphCacheSystem.getGlyph(char, style);
}

export async function preloadLegalGlyphs(): Promise<void> {
  await glyphCacheSystem.preloadCommonGlyphs('legal');
}

export function getGlyphCacheMetrics(): GlyphCacheMetrics {
  return glyphCacheSystem.getMetrics();
}

export async function synthesizeGlyphsWithLLM(inputText: string): Promise<SynthesizedGlyph[]> {
  const glyphs = inputText.split('');
  return await glyphCacheSystem.synthesizeGlyphCombinations(glyphs);
}

export async function getLegalTermSuggestions(text: string): Promise<string[]> {
  return await glyphCacheSystem.getLLMSuggestions(text);
}

export async function generateLegalEmbedding(text: string): Promise<Float32Array> {
  return await glyphCacheSystem.generateEmbedding(text);
}