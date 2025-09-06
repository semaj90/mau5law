
// JSON UI Compiler with Matrix Transforms
// Builds on UnoCSS + Svelte 5 for GPU-accelerated layouts

import { mat4 } from "gl-matrix";
import { EventEmitter } from "events";

export interface MatrixUINode {
  type:
    | "button"
    | "card"
    | "input"
    | "dialog"
    | "grid"
    | "evidence-item"
    | "panel"
    | "text"
    | "image"
    | "container";
  id: string;
  matrix: number[]; // 4x4 transform matrix
  styles: {
    base?: string;
    color?: string;
    backgroundColor?: string;
    border?: string;
    opacity?: number;
    hover?: string;
    active?: string;
    disabled?: string;
    [key: string]: unknown;
  };
  events?: string[];
  children?: MatrixUINode[];
  metadata?: {
    priority?: "critical" | "high" | "medium" | "low";
    confidence?: number;
    evidenceType?: string;
    aiGenerated?: boolean;
    lodLevel?: "low" | "mid" | "high";
    component?: string;
  };
  content?: string;
  bounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface EnhancedWebGLBuffer {
  vertices: Float32Array;
  indices: Uint16Array;
  colors: Float32Array;
  texCoords: Float32Array;
  matrices: Float32Array;
  metadata: {
    vertexCount: number;
    indexCount: number;
    nodeCount: number;
    lodLevel: "low" | "mid" | "high";
    shaderComplexity: "basic" | "standard" | "advanced";
  };
}

export interface CSSOutput {
  classes: string[];
  variables: Record<string, string>;
  animations: string[];
  unoCSS: string;
}

export interface EventMapping {
  nodeId: string;
  events: {
    type: string;
    handler: string;
    matrix: number[];
    bounds: { x: number; y: number; width: number; height: number };
  }[];
}

export interface CompiledNode {
  element: HTMLElement;
  matrix: any;
  cssClasses: string[];
  webglBuffer?: WebGLBuffer;
  enhancedBuffer?: EnhancedWebGLBuffer;
  lodLevel: "low" | "mid" | "high";
}

export class MatrixUICompiler {
  private gl: WebGL2RenderingContext | null = null;
  private cssCache = new Map<string, string>();
  private bufferCache = new Map<string, WebGLBuffer>();
  private unoCache: Map<string, string> = new Map();
  private lodThresholds = {
    low: { maxVertices: 1000, maxNodes: 50 },
    mid: { maxVertices: 5000, maxNodes: 200 },
    high: { maxVertices: 20000, maxNodes: 1000 },
  };

  constructor(canvas?: HTMLCanvasElement) {
    if (canvas) {
      this.gl = canvas.getContext("webgl2");
    }
  }

  /**
   * Enhanced compilation with full Phase 8 features: JSON → WebGL + CSS + Events
   */
  async compileEnhanced(
    nodes: MatrixUINode[],
    xstateContext?: unknown,
  ): Promise<{
    compiled: CompiledNode[];
    webgl: EnhancedWebGLBuffer;
    css: CSSOutput;
    events: EventMapping[];
    optimizations: string[];
  }> {
    const optimizations: string[] = [];

    // 1. Optimize node tree for performance
    const optimizedNodes = this.optimizeNodeTree(nodes, optimizations);

    // 2. Determine LOD level based on complexity and AI metadata
    const lodLevel = this.calculateLODLevel(optimizedNodes);
    optimizations.push(`Selected LOD level: ${lodLevel}`);

    // 3. Compile individual nodes
    const compiledNodes: CompiledNode[] = [];
    for (const node of optimizedNodes) {
      const compiled = await this.compileNode(node);
      compiledNodes.push(compiled);
    }

    // 4. Generate enhanced WebGL buffers
    const webglBuffer = this.generateEnhancedWebGLBuffers(
      optimizedNodes,
      lodLevel,
    );

    // 5. Generate UnoCSS classes and CSS
    const cssOutput = await this.generateEnhancedCSS(
      optimizedNodes,
      xstateContext,
    );

    // 6. Map events with matrix-aware coordinates
    const eventMappings = this.generateEventMappings(optimizedNodes);

    return {
      compiled: compiledNodes,
      webgl: webglBuffer,
      css: cssOutput,
      events: eventMappings,
      optimizations,
    };
  }

  /**
   * Legacy compile method for backward compatibility
   */
  async compile(uiDefinition: MatrixUINode[]): Promise<CompiledNode[]> {
    const result = await this.compileEnhanced(uiDefinition);
    return result.compiled;
  }

  // Missing method implementations
  private optimizeNodeTree(nodes: MatrixUINode[], optimizations: string[]): MatrixUINode[] {
    // Simple optimization - remove disabled nodes and merge similar ones
    const optimized = nodes.filter((node: any) => !node.styles?.disabled);
    optimizations.push(`Removed ${nodes.length - optimized.length} disabled nodes`);
    return optimized;
  }

  private calculateLODLevel(nodes: MatrixUINode[]): "low" | "mid" | "high" {
    const nodeCount = nodes.length;
    if (nodeCount < this.lodThresholds.low.maxNodes) return "low";
    if (nodeCount < this.lodThresholds.mid.maxNodes) return "mid";
    return "high";
  }

  private generateEnhancedWebGLBuffers(nodes: MatrixUINode[], lodLevel: "low" | "mid" | "high"): EnhancedWebGLBuffer {
    const vertexCount = nodes.length * 4; // 4 vertices per node
    const vertices = new Float32Array(vertexCount * 3); // x, y, z
    const indices = new Uint16Array(nodes.length * 6); // 2 triangles per node
    const colors = new Float32Array(vertexCount * 4); // r, g, b, a
    const texCoords = new Float32Array(vertexCount * 2); // u, v
    const matrices = new Float32Array(nodes.length * 16); // 4x4 matrix per node

    // Fill buffers with node data
    nodes.forEach((node, i) => {
      const bounds = node.bounds || { x: 0, y: 0, width: 100, height: 100 };
      const baseVertex = i * 4;
      const baseIndex = i * 6;

      // Vertices (quad)
      vertices[baseVertex * 3] = bounds.x;
      vertices[baseVertex * 3 + 1] = bounds.y;
      vertices[baseVertex * 3 + 2] = 0;

      // Indices (two triangles)
      indices[baseIndex] = baseVertex;
      indices[baseIndex + 1] = baseVertex + 1;
      indices[baseIndex + 2] = baseVertex + 2;
      indices[baseIndex + 3] = baseVertex + 2;
      indices[baseIndex + 4] = baseVertex + 3;
      indices[baseIndex + 5] = baseVertex;

      // Matrix data
      const matrix = node.matrix || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1];
      matrices.set(matrix, i * 16);
    });

    return {
      vertices,
      indices,
      colors,
      texCoords,
      matrices,
      metadata: {
        vertexCount,
        indexCount: indices.length,
        nodeCount: nodes.length,
        lodLevel,
        shaderComplexity: lodLevel === "high" ? "advanced" : "standard"
      }
    };
  }

  /**
   * Generate UnoCSS classes for a node
   */
  private generateNodeClasses(node: MatrixUINode): string[] {
    const classes: string[] = [];
    
    // Base styling
    classes.push('relative', 'transition-all', 'duration-300');
    
    // Node type specific classes
    switch (node.type) {
      case 'container':
        classes.push('flex', 'flex-col');
        break;
      case 'text':
        classes.push('text-base', 'leading-relaxed');
        break;
      case 'button':
        classes.push('px-4', 'py-2', 'rounded', 'cursor-pointer');
        break;
      default:
        classes.push('block');
    }
    
    return classes;
  }

  private async generateEnhancedCSS(nodes: MatrixUINode[], xstateContext?: unknown): Promise<CSSOutput> {
    const classes: string[] = [];
    const variables: Record<string, string> = {};
    const animations: string[] = [];

    nodes.forEach((node: any) => {
      // Generate UnoCSS classes based on node type and metadata
      const baseClasses = this.generateNodeClasses(node);
      classes.push(...baseClasses);

      // Add AI-specific classes
      if (node.metadata?.aiGenerated) {
        classes.push("ai-generated", "border-purple-500/50");
      }

      // Add confidence-based styling
      if (node.metadata?.confidence !== undefined) {
        const confidence = node.metadata.confidence;
        if (confidence > 0.8) classes.push("border-green-500");
        else if (confidence > 0.6) classes.push("border-yellow-500");
        else classes.push("border-red-500");
      }
    });

    const unoCSS = classes.join(" ");

    return {
      classes: [...new Set(classes)], // Remove duplicates
      variables,
      animations,
      unoCSS
    };
  }

  private generateEventMappings(nodes: MatrixUINode[]): EventMapping[] {
    return nodes.map((node: any) => ({
      nodeId: node.id,
      events: node.events?.map((eventType: any) => ({
        type: eventType,
        handler: `handle${eventType.charAt(0).toUpperCase() + eventType.slice(1)}`,
        matrix: node.matrix || [1,0,0,0, 0,1,0,0, 0,0,1,0, 0,0,0,1],
        bounds: node.bounds || { x: 0, y: 0, width: 100, height: 100 }
      })) || []
    }));
  }

  /**
   * Compile individual UI node
   */
  private async compileNode(node: MatrixUINode): Promise<CompiledNode> {
    // Create DOM element
    const element = this.createElement(node);

    // Parse matrix transform
    const matrix = mat4.fromValues(
      node.matrix[0] || 1, node.matrix[1] || 0, node.matrix[2] || 0, node.matrix[3] || 0,
      node.matrix[4] || 0, node.matrix[5] || 1, node.matrix[6] || 0, node.matrix[7] || 0,
      node.matrix[8] || 0, node.matrix[9] || 0, node.matrix[10] || 1, node.matrix[11] || 0,
      node.matrix[12] || 0, node.matrix[13] || 0, node.matrix[14] || 0, node.matrix[15] || 1
    );

    // Generate CSS classes with UnoCSS
    const cssClasses = await this.generateCSS(node);

    // Create WebGL buffer for GPU acceleration
    const webglBuffer = this.createWebGLBuffer(node, new Float32Array(matrix));

    // Determine LOD level based on viewport and AI context
    const lodLevel = this.calculateLOD(node);

    return {
      element,
      matrix,
      cssClasses,
      webglBuffer,
      lodLevel,
    };
  }

  /**
   * Create DOM element based on node type
   */
  private createElement(node: MatrixUINode): HTMLElement {
    let element: HTMLElement;

    switch (node.type) {
      case "button":
        element = document.createElement("button");
        break;
      case "card":
        element = document.createElement("div");
        element.setAttribute("role", "article");
        break;
      case "input":
        element = document.createElement("input");
        break;
      case "dialog":
        element = document.createElement("dialog");
        break;
      case "evidence-item":
        element = document.createElement("div");
        element.setAttribute(
          "data-evidence-type",
          node.metadata?.evidenceType || "",
        );
        break;
      default:
        element = document.createElement("div");
    }

    element.id = node.id;

    // Add event listeners
    if (node.events) {
      node.events.forEach((eventType) => {
        element.addEventListener(eventType, (e: any) => {
          this.handleEvent(e, node);
        });
      });
    }

    return element;
  }

  /**
   * Generate CSS classes using UnoCSS patterns
   */
  private async generateCSS(node: MatrixUINode): Promise<string[]> {
    const cacheKey = `${node.type}-${JSON.stringify(node.styles)}`;

    if (this.cssCache.has(cacheKey)) {
      return this.cssCache.get(cacheKey)!.split(" ");
    }

    let classes: string[] = [];

    // Base classes from UnoCSS shortcuts
    switch (node.type) {
      case "button":
        classes.push("yorha-button");
        break;
      case "card":
        classes.push("yorha-card");
        if (node.metadata?.priority) {
          classes.push(`yorha-priority-${node.metadata.priority}`);
        }
        break;
      case "evidence-item":
        classes.push("yorha-evidence-item");
        if (node.metadata?.evidenceType) {
          classes.push(`evidence-type-${node.metadata.evidenceType}`);
        }
        break;
    }

    // Add style modifiers
    if (node.styles.base) {
      classes.push(...node.styles.base.split(" "));
    }

    // AI confidence styling
    if (node.metadata?.confidence !== undefined) {
      if (node.metadata.confidence > 80) {
        classes.push("vector-confidence-high");
      } else if (node.metadata.confidence > 60) {
        classes.push("vector-confidence-medium");
      } else {
        classes.push("vector-confidence-low");
      }
    }

    // Matrix transform classes
    const transformClass = this.generateTransformCSS(node.matrix);
    if (transformClass) {
      classes.push(transformClass);
    }

    const classString = classes.join(" ");
    this.cssCache.set(cacheKey, classString);

    return classes;
  }

  /**
   * Generate CSS transform from matrix
   */
  private generateTransformCSS(matrix: number[]): string {
    // Convert 4x4 matrix to CSS transform
    const [
      m00,
      m01,
      m02,
      m03,
      m10,
      m11,
      m12,
      m13,
      m20,
      m21,
      m22,
      m23,
      m30,
      m31,
      m32,
      m33,
    ] = matrix;

    // Extract translation
    const translateX = m30;
    const translateY = m31;
    const translateZ = m32;

    // Extract scale (assuming uniform scaling for now)
    const scaleX = Math.sqrt(m00 * m00 + m01 * m01 + m02 * m02);
    const scaleY = Math.sqrt(m10 * m10 + m11 * m11 + m12 * m12);

    // Generate CSS custom property
    const transformValue = `translate3d(${translateX}px, ${translateY}px, ${translateZ}px) scale3d(${scaleX}, ${scaleY}, 1)`;

    // Create CSS class name
    const className = `matrix-transform-${Math.abs(translateX + translateY).toString(36)}`;

    // Inject CSS if not already present
    if (!document.querySelector(`style[data-matrix="${className}"]`)) {
      const style = document.createElement("style");
      style.setAttribute("data-matrix", className);
      style.textContent = `.${className} { transform: ${transformValue}; }`;
      document.head.appendChild(style);
    }

    return className;
  }

  /**
   * Create WebGL buffer for GPU acceleration
   */
  private createWebGLBuffer(
    node: MatrixUINode,
    matrix: Float32Array,
  ): WebGLBuffer | undefined {
    if (!this.gl) return undefined;

    const cacheKey = node.id;
    if (this.bufferCache.has(cacheKey)) {
      return this.bufferCache.get(cacheKey);
    }

    // Create vertex data for UI quad
    const vertices = new Float32Array([
      -0.5,
      -0.5,
      0.0,
      0.0,
      0.0, // Bottom-left
      0.5,
      -0.5,
      0.0,
      1.0,
      0.0, // Bottom-right
      0.5,
      0.5,
      0.0,
      1.0,
      1.0, // Top-right
      -0.5,
      0.5,
      0.0,
      0.0,
      1.0, // Top-left
    ]);

    // Apply matrix transform to vertices
    for (let i = 0; i < vertices.length; i += 5) {
      const vertex = [vertices[i], vertices[i + 1], vertices[i + 2], 1.0];
      const result = mat4.create();
      const transformed = mat4.multiply(result, matrix, vertex as any);
      vertices[i] = transformed[0];
      vertices[i + 1] = transformed[1];
      vertices[i + 2] = transformed[2];
    }

    // Create and upload buffer
    const buffer = this.gl.createBuffer();
    if (buffer) {
      this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
      this.gl.bufferData(this.gl.ARRAY_BUFFER, vertices, this.gl.STATIC_DRAW);
      this.bufferCache.set(cacheKey, buffer);
    }

    return buffer;
  }

  /**
   * Calculate Level of Detail based on viewport and AI context
   */
  private calculateLOD(node: MatrixUINode): "low" | "mid" | "high" {
    // High LOD for AI-flagged important elements
    if (
      node.metadata?.aiGenerated &&
      node.metadata?.confidence &&
      node.metadata.confidence > 80
    ) {
      return "high";
    }

    // High LOD for critical priority elements
    if (node.metadata?.priority === "critical") {
      return "high";
    }

    // Medium LOD for evidence items
    if (node.type === "evidence-item") {
      return "mid";
    }

    // Default to low LOD
    return "low";
  }

  /**
   * Handle UI events with matrix context
   */
  private handleEvent(event: Event, node: MatrixUINode): void {
    // Emit custom event with matrix context
    const matrixEvent = new CustomEvent("matrix-ui-event", {
      detail: {
        originalEvent: event,
        nodeId: node.id,
        nodeType: node.type,
        matrix: node.matrix,
        metadata: node.metadata,
      },
    });

    event.target?.dispatchEvent(matrixEvent);
  }

  /**
   * Update node matrix and recompile
   */
  async updateMatrix(nodeId: string, newMatrix: number[]): Promise<void> {
    // Update buffer cache
    if (this.bufferCache.has(nodeId)) {
      this.bufferCache.delete(nodeId);
    }

    // Find and update DOM element
    const element = document.getElementById(nodeId);
    if (element) {
      const transformClass = this.generateTransformCSS(newMatrix);
      element.className = element.className.replace(
        /matrix-transform-\w+/,
        transformClass,
      );
    }
  }

  /**
   * Cleanup WebGL resources
   */
  dispose(): void {
    if (this.gl) {
      this.bufferCache.forEach((buffer) => {
        this.gl?.deleteBuffer(buffer);
      });
    }
    this.bufferCache.clear();
    this.cssCache.clear();
  }
}

// Integration with Svelte 5 components
export function createMatrixComponent(node: MatrixUINode) {
  return {
    destroy() {
      // Cleanup when component unmounts
    },
  };
}

export default MatrixUICompiler;
