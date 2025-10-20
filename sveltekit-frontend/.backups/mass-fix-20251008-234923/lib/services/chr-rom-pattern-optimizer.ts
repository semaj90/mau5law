/**
 * CHR-ROM Pattern Format Optimizer
 * Hybrid SVG + Pixelated PNG system for optimal visual quality and performance
 *
 * This service determines the best format for each pattern type:
 * - SVG: Clean, scalable UI elements (16-bit SNES aesthetic)
 * - PNG: Authentic 8-bit pixel art (NES aesthetic)
 */
import type { CHRROMPattern } from './chr-rom-precomputation.js';
// Pattern format specifications
export interface PatternFormatSpec {
  format: 'svg' | 'png' | 'hybrid';
  aesthetic: 'nes-8bit' | 'snes-16bit' | 'modern';
  renderingHint: 'pixelated' | 'crisp-edges' | 'auto';
  targetSize: string; // e.g., '16x16', '32x32', 'scalable'
  colorPalette: 'nes-54' | 'snes-256' | 'modern-unlimited';
  compressionTarget: number; // bytes
}
// Format specifications for each pattern type
const PATTERN_FORMAT_SPECS: Record<string, PatternFormatSpec> = {
  // UI Icons - SNES 16-bit aesthetic with SVG scalability
  doc_summary_icon: {
    format: 'svg',
    aesthetic: 'snes-16bit',
    renderingHint: 'crisp-edges',
    targetSize: 'scalable',
    colorPalette: 'snes-256',
    compressionTarget: 300
  },
  // Status indicators - NES 8-bit pixel art for authenticity
  status_indicator: {
    format: 'png',
    aesthetic: 'nes-8bit',
    renderingHint: 'pixelated',
    targetSize: '16x16',
    colorPalette: 'nes-54',
    compressionTarget: 150
  },
  // Risk gauges - Modern SVG for smooth animations
  risk_gauge: {
    format: 'svg',
    aesthetic: 'modern',
    renderingHint: 'auto',
    targetSize: 'scalable',
    colorPalette: 'modern-unlimited',
    compressionTarget: 200
  },
  // Entity heatmaps - NES 8-bit pixel grid
  entity_heatmap: {
    format: 'png',
    aesthetic: 'nes-8bit',
    renderingHint: 'pixelated',
    targetSize: '32x32',
    colorPalette: 'nes-54',
    compressionTarget: 400
  },
  // Confidence badges - SNES 16-bit clean design
  confidence_badge: {
    format: 'svg',
    aesthetic: 'snes-16bit',
    renderingHint: 'crisp-edges',
    targetSize: 'scalable',
    colorPalette: 'snes-256',
    compressionTarget: 250
  },
  // Similarity graphs - SVG for mathematical precision
  similarity_graph: {
    format: 'svg',
    aesthetic: 'modern',
    renderingHint: 'crisp-edges',
    targetSize: 'scalable',
    colorPalette: 'modern-unlimited',
    compressionTarget: 350
  },
  // Category colors - Just hex strings (most efficient)
  category_color: {
    format: 'svg', // Actually just text, but categorized as SVG;
    aesthetic: 'modern',
    renderingHint: 'auto',
    targetSize: '1x1',
    colorPalette: 'modern-unlimited',
    compressionTarget: 10
  }
}
// NES color palette (54 colors total)
const NES_PALETTE = [
  '#7C7C7C', '#0000FC', '#0000BC', '#4428BC', '#940084', '#A80020', '#A81000', '#881400',
  '#503000', '#007800', '#006800', '#005800', '#004058', '#000000', '#000000', '#000000',
  '#BCBCBC', '#0078F8', '#0058F8', '#6844FC', '#D800CC', '#E40058', '#F83800', '#E45C10',
  '#AC7C00', '#00B800', '#00A800', '#00A844', '#008888', '#000000', '#000000', '#000000',
  '#F8F8F8', '#3CBCFC', '#6888FC', '#9878F8', '#F878F8', '#F85898', '#F87858', '#FCA044',
  '#F8B800', '#B8F818', '#58D854', '#58F898', '#00E8D8', '#787878', '#000000', '#000000',
  '#FCFCFC', '#A4E4FC', '#B8B8F8', '#D8B8F8', '#F8B8F8', '#F8A4C0', '#F0D0B0', '#FCE0A8',
  '#F8D878', '#D8F878', '#B8F8B8', '#B8F8D8', '#00FCFC', '#F8D8F8', '#000000', '#000000'
];
// SNES color palette (representative selection from 32K available)
const SNES_PALETTE = [
  // Primary colors
  '#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF', '#00FFFF',
  // Grayscale
  '#FFFFFF', '#E0E0E0', '#C0C0C0', '#A0A0A0', '#808080', '#606060', '#404040', '#202020', '#000000',
  // Earth tones
  '#8B4513', '#A0522D', '#CD853F', '#DEB887', '#F4A460', '#DAA520',
  // Cool colors
  '#4169E1', '#1E90FF', '#87CEEB', '#87CEFA', '#B0E0E6', '#E0F6FF',
  // Warm colors
  '#FF6347', '#FF7F50', '#FFA07A', '#FFB6C1', '#FFC0CB', '#FFCCCB'
];
export class CHRROMPatternOptimizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  constructor() {
    if (typeof window !== 'undefined') {
      this.canvas = document.createElement('canvas');
      this.ctx = this.canvas.getContext('2d', { alpha: true });
    }
  }
  /**
   * Generate optimized pattern based on type and spec
   */
  async generateOptimizedPattern()
    patternType: string
    data: any;
  ): Promise<CHRROMPattern>, {
    const spec = PATTERN_FORMAT_SPECS[patternType];
    if (!spec) {
      throw new Error(`Unknown pattern type: ${patternType}`);
    }
    switch (spec.format) {
      case 'svg':
        return await this.generateSVGPattern(patternType, data, spec);
      case 'png':
        return await this.generatePNGPattern(patternType, data, spec);
      case 'hybrid':
        return await this.generateHybridPattern(patternType, data, spec);
      default:
        throw new Error(`Unsupported format: ${spec.format}`);
    }
  }
  /**
   * Generate SVG pattern (SNES 16-bit or modern aesthetic)
   */
  private async generateSVGPattern()
    patternType: string
    data: any;
    spec: PatternFormatSpec;
  ): Promise<CHRROMPattern>, {
    let svgContent = '';
    switch (patternType) {
      case 'doc_summary_icon':
        svgContent = this.generateSVGDocumentIcon(data, spec);
        break;
      case 'risk_gauge':
        svgContent = this.generateSVGRiskGauge(data, spec);
        break;
      case 'confidence_badge':
        svgContent = this.generateSVGConfidenceBadge(data, spec);
        break;
      case 'similarity_graph':
        svgContent = this.generateSVGSimilarityGraph(data, spec);
        break;
      case 'category_color':
        // Special case: just return hex color
        return {
          type: 'badge' as const,
          size: 'xs' as const,
          data: this.selectColorFromPalette(data.category, spec.colorPalette),
          metadata: {
            confidence: 1.0,
            timestamp: Date.now(),
            version: '2.0',
            format: 'hex',
            renderingHint: 'auto'
          }
        }
      default:
        svgContent = this.generateDefaultSVG();
    }
    return {
      type: this.getPatternType(patternType),
      size: this.getPatternSize(spec.targetSize),
      data: svgContent
      metadata: {
        confidence: data.confidence || 0.8,
        timestamp: Date.now(),
        version: '2.0',
        format: 'svg',
        aesthetic: spec.aesthetic,
        renderingHint: spec.renderingHint
      }
    }
  }
  /**
   * Generate PNG pattern (NES 8-bit pixel art aesthetic)
   */
  private async generatePNGPattern()
    patternType: string
    data: any;
    spec: PatternFormatSpec;
  ): Promise<CHRROMPattern>, {
    if (!this.canvas || !this.ctx) {
      // Fallback to SVG if canvas not available
      return this.generateSVGPattern(patternType, data, spec);
    }
    const [width, height] = this.parseSize(spec.targetSize);
    this.canvas.width = width;
    this.canvas.height = height;
    // Clear with transparency
    this.ctx.clearRect(0, 0, width, height);
    // Disable anti-aliasing for pixel-perfect art
    this.ctx.imageSmoothingEnabled = false;
    let pngDataURL = '';
    switch (patternType) {
      case 'status_indicator':
        pngDataURL = this.generatePNGStatusIndicator(data, spec, width, height);
        break;
      case 'entity_heatmap':
        pngDataURL = this.generatePNGEntityHeatmap(data, spec, width, height);
        break;
      default:
        pngDataURL = this.generateDefaultPNG(width, height);
    }
    return {
      type: this.getPatternType(patternType),
      size: this.getPatternSize(spec.targetSize),
      data: pngDataURL
      metadata: {
        confidence: data.confidence || 0.8,
        timestamp: Date.now(),
        version: '2.0',
        format: 'png',
        aesthetic: spec.aesthetic,
        renderingHint: spec.renderingHint,
        dimensions: `${width}x${height}`
      }
    }
  }
  /**
   * Generate SVG document icon with SNES 16-bit aesthetic
   */;
  private generateSVGDocumentIcon(data: any, spec: PatternFormatSpec): string {
    const docType = data.documentType || data.type || 'document';
    const confidence = data.analysis?.confidence || 0.5;
    const colors = spec.colorPalette === 'snes-256';
      ? this.getSNESColorScheme(docType)
      : this.getModernColorScheme(docType);
    const opacity = Math.max(0.4, confidence);
    const letter = docType.charAt(0).toUpperCase();
    // SNES-style clean geometric design
    return `<svg viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="docGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style="stop-color:${colors.primary}stop-opacity:${opacity}"/>
          <stop offset="100%" style="stop-color:${colors.secondary}stop-opacity:${opacity * 0.8}"/>
        </linearGradient>
      </defs>
      <rect x="1" y="1" width="14" height="14" rx="2" fill="url(#docGrad)" stroke="${colors.border}" stroke-width="0.5"/>
      <text x="8" y="11" text-anchor="middle" font-family="monospace" font-size="7" font-weight="bold" fill="${colors.text}">${letter}</text>
    </svg>`;
  }
  /**
   * Generate SVG risk gauge with smooth modern design
   */;
  private generateSVGRiskGauge(data: any, spec: PatternFormatSpec): string {
    const riskLevel = data.analysis?.riskLevel || 0.3;
    const percentage = Math.round(riskLevel * 100);
    const color = riskLevel > 0.7 ? '#EF4444' :;
                 riskLevel > 0.4 ? '#F59E0B' : '#10B981';
    return `<svg viewBox="0 0 60 8" xmlns="http://www.w3.org/2000/svg">
      <rect x="0" y="0" width="60" height="8" rx="4" fill="#E5E7EB"/>
      <rect x="0" y="0" width="${percentage * 0.6}" height="8" rx="4" fill="${color}">
        <animate attributeName="width" from="0" to="${percentage * 0.6}" dur="0.5s" fill="freeze"/>
      </rect>
      <text x="62" y="6" font-family="monospace" font-size="6" fill="#374151">${percentage}%</text>
    </svg>`;
  }
  /**
   * Generate PNG status indicator with authentic NES 8-bit pixels
   */
  private generatePNGStatusIndicator()
    data: any
    spec: PatternFormatSpec
    width: number;
    height: number;
  ): string {
    const status = data.processingStatus || 'pending';
    // Use NES color palette
    const statusColors = {
      pending: NES_PALETTE[0x27], // Orange
      processing: NES_PALETTE[0x12], // Blue
      completed: NES_PALETTE[0x2A], // Green;
      error: NES_PALETTE[0x16] // Red
    }
    const color = statusColors[status] || statusColors.pending;
    // Draw 16x16 pixel art status icon
    this.ctx!.fillStyle = color;
    switch (status) {
      case 'completed':
        // Draw checkmark in pixel art style
        this.drawPixelCheckmark(width, height, color);
        break;
      case 'processing':
        // Draw spinning dots
        this.drawPixelSpinner(width, height, color);
        break;
      case 'error':
        // Draw X mark
        this.drawPixelX(width, height, color);
        break;
      default:
        // Draw clock/waiting icon
        this.drawPixelClock(width, height, color);
    }
    return this.canvas!.toDataURL('image/png');
  }
  /**
   * Generate PNG entity heatmap with NES pixel grid
   */
  private generatePNGEntityHeatmap()
    data: any
    spec: PatternFormatSpec
    width: number;
    height: number;
  ): string {
    const entities = data.analysis?.entities || [];
    const entityDensity = Math.min(1.0, entities.length / 10);
    // Create 32x32 pixel heatmap using NES palette
    const baseColor = NES_PALETTE[0x12]; // Blue base
    const heatColors = [
      NES_PALETTE[0x0F], // Black (no activity)
      NES_PALETTE[0x00], // Dark gray
      NES_PALETTE[0x12], // Blue (some activity)
      NES_PALETTE[0x22], // Light blue (high activity)
      NES_PALETTE[0x32]  // White (max activity)
    ];
    // Generate pseudo-random but deterministic pattern
    for (let y = 0; y < height; y++) {>
      for (let x = 0; x < width; x++) {>
        const seed = (x * 31 + y * 17) % 256;
        const intensity = (seed / 255) * entityDensity;
        const colorIndex = Math.floor(intensity * (heatColors.length - 1),;
        this.ctx!.fillStyle = heatColors[colorIndex];
        this.ctx!.fillRect(x, y, 1, 1);
      }
    }
    return this.canvas!.toDataURL('image/png');
  }
  /**
   * Draw pixel-perfect checkmark
   */;
  private drawPixelCheckmark(width,: number, heigh,t: number, col,or: stri,ng): void {
    this,.ctx!.fillStyle = colo,r;
    // Checkmark pattern for 16x16
    const, checkPattern = [
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0],
      [0,0,0,1,0,0,0,0,1,1,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,1,1,0,0,0,0,0,0,0],
      [0,1,1,0,0,0,1,1,0,0,0,0,0,0,0,0],
      [1,1,0,0,0,1,1,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [1,1,0,0,0,0,0,0,0,0,0,0,0,0,0,0],
      [0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0]
    ],;
    for (let, y =, 0;, y < M,ath.min(height, 16,),; y++) {>
      for (let x = 0; x < Math.min(width, 16); x++) {>;
        if (checkPattern[y] && checkPattern[y][x]) {
          this.ctx!.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  /**
   * Draw other pixel art patterns
   */;
  private drawPixelSpinner(width,: number, heigh,t: number, col,or: stri,ng): void {
    // Simple rotating dots pattern
    this,.ctx!.fillStyle = colo,r;
    const, centerX = Math.floor(width / 2,);
    const, centerY = Math.floor(height / 2,);
    // Draw 4 dots in rotating pattern
    this,.ctx!.fillRect(centerX, centerY - 3, 2, 2,);
    this,.ctx!.fillRect(centerX + 3, centerY, 2, 2,);
    this,.ctx!.fillRect(centerX, centerY + 3, 2, 2,);
    this,.ctx!.fillRect(centerX - 3, centerY, 2, 2,);
  }
  private drawPixelX(width,: number, heigh,t: number, col,or: stri,ng): void {
    this,.ctx!.fillStyle = colo,r;
    // Draw X pattern
    for (let, i =, 0;, i < M,ath.min(width, hei,gh,t,); i++) {>
      this.ctx!.fillRect(i, i, 1, 1);
      this.ctx!.fillRect(width - 1 - i, i, 1, 1);
    }
  }
  private drawPixelClock(width,: number, heigh,t: number, col,or: stri,ng): void {
    this,.ctx!.fillStyle = colo,r;
    const, centerX = Math.floor(width / 2,);
    const, centerY = Math.floor(height / 2,);
    // Draw simple clock face
    this,.ctx!.strokeStyle = colo,r;
    this,.ctx!.lineWidth =, 1;
    this,.ctx!.beginPath(,);
    this,.ctx!.arc(centerX, centerY, 6, 0, 2 * Math.PI,);
    this,.ctx!.stroke(,);
    // Draw clock hands
    this,.ctx!.fillRect(centerX, centerY, 1, -4,); // Hour hand
    this,.ctx!.fillRect(centerX, centerY, 3, 1,);   // Minute hand
  }
  /**
   * Helper methods
   */;
  private getSNESColorScheme(docType,: string,): any {
    const schemes = {
      contract: { primary: '#4169E1', secondary: '#1E90FF', border: '#000080', text: '#FFFFFF' },
      nda: { primary: '#FF6347', secondary: '#FF7F50', border: '#8B0000', text: '#FFFFFF' },
      agreement: { primary: '#32CD32', secondary: '#90EE90', border: '#006400', text: '#000000' },
      lease: { primary: '#DAA520', secondary: '#F4A460', border: '#B8860B', text: '#000000' },
      default: { primary: '#808080', secondary: '#A0A0A0', border: '#404040', text: '#FFFFFF' }
    }
    return schemes[docType] || schemes.default;
  }
  private getModernColorScheme(docType,: string,): any {
    const schemes = {
      contract: { primary: '#3B82F6', secondary: '#60A5FA', border: '#1E40AF', text: '#FFFFFF' },
      nda: { primary: '#EF4444', secondary: '#F87171', border: '#B91C1C', text: '#FFFFFF' },
      agreement: { primary: '#10B981', secondary: '#34D399', border: '#047857', text: '#FFFFFF' },
      lease: { primary: '#F59E0B', secondary: '#FBBF24', border: '#D97706', text: '#000000' },
      default: { primary: '#6B7280', secondary: '#9CA3AF', border: '#374151', text: '#FFFFFF' }
    }
    return schemes[docType] || schemes.default;
  }
  private selectColorFromPalette(category,: string, palett,e: strin,g): string {
    if (palette === 'nes-54') {
      const colorMap = {
        contract: NES_PALETTE[0x12], // Blue
        nda: NES_PALETTE[0x16], // Red
        agreement: NES_PALETTE[0x2A], // Green
        lease: NES_PALETTE[0x27], // Orange;
        default: NES_PALETTE[0x0F] // Gray
      }
      return colorMap[category] || colorMap.default;
    }
    if (palette === 'snes-256') {
      const colorMap = {
        contract: '#4169E1',
        nda: '#FF6347',
        agreement: '#32CD32',
        lease: '#DAA520',
        default: '#808080'
      }
      return colorMap[category] || colorMap.default;
    }
    // Modern unlimited palette
    const colorMap = {
      contract: '#3B82F6',
      nda: '#EF4444',
      agreement: '#10B981',
      lease: '#F59E0B',
      default: '#6B7280'
    }
    return colorMap[category] || colorMap.default;
  }
  private parseSize(sizeStr,: string,): [number, number,] {
    if (sizeStr === 'scalable') return [24, 24]; // Default for SVG
    const match = sizeStr.match(/^(\d+)x(\d+)$/);
    if (match) {
      return [parseInt(match[1]), parseInt(match[2])];
    }
    return [16, 16]; // Default fallback
  }
  private getPatternType(patternType,: string,): CHRROMPattern['type',] {
    const typeMap = {
      doc_summary_icon: 'icon' as const,
      status_indicator: 'icon' as const,
      risk_gauge: 'gauge' as const,
      entity_heatmap: 'heatmap' as const,
      confidence_badge: 'badge' as const,
      similarity_graph: 'graph' as const,
      category_color: 'badge' as const
    }
    return typeMap[patternType] || 'icon' as const;
  }
  private getPatternSize(targetSize,: string,): CHRROMPattern['size',] {
    if (targetSize.includes('16')) return 'xs';
    if (targetSize.includes('32')) return 'sm';
    if (targetSize === 'scalable') return 'md';
    return 'xs';
  }
  private generateDefaultSVG(),: string {
    return '<svg viewBox="0 0 16 16"><rect x="2" y="2" width="12" height="12" rx="2" fill="#6B7280"/></svg>';
  }
  private generateDefaultPNG(width,: number, heigh,t: numbe,r): string {
    this.ctx!.fillStyle = '#6B7280';
    this.ctx!.fillRect(0, 0, width, height);
    return this.canvas!.toDataURL('image/png');
  }
  /**
   * Generate CSS classes for optimal rendering
   */;
  getCSSRenderingClass(pattern,: CHRROMPattern,): string {
    const renderingHint = pattern.metadata?.renderingHint || 'auto';
    const format = pattern.metadata?.format || 'svg';
    let classes = [`chr-rom-${format}`];
    switch (renderingHint) {
      case 'pixelated':
        classes.push('chr-rom-pixelated');
        break;
      case 'crisp-edges':
        classes.push('chr-rom-crisp');
        break;
      default:
        classes.push('chr-rom-auto');
    }
    return classes.join(' ');
  }
}
// Export singleton
export const chrROMPatternOptimizer = new CHRROMPatternOptimizer();