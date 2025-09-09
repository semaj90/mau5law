/**
 * Search Cache Neural Engine (consolidated, cleaned)
 *
 * This file previously contained duplicated and conflicting declarations.
 * All duplicates were removed, keeping a single, coherent implementation
 * that now includes a sophisticated user analytics and recommendation engine.
 */
import type { LegalDocument } from '../memory/nes-memory-architecture';
// --- Helpers & Mock Subsystems ---
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// --- Mocks for the full analytics data stack ---

class MockDrizzleDB {
  async queryUserHistory(userId: string) {
    console.log(`[DrizzleDB] Querying PostgreSQL for user history: ${userId}`);
    await sleep(20);
    return [
      { action: 'open_document', docId: 'xyz' },
      { action: 'search', query: 'contract' },
      { action: 'open_document', docId: 'abc' },
    ];
  }
}

class MockQdrantClient {
  async findSimilarEmbeddings(vector: number[]) {
    // Use the vector so the param is not "never read"
    const hash = vector.slice(0, 8).reduce((s, v) => s + v, 0) / (vector.length || 1);
    console.log(`[Qdrant] Finding similar embeddings (len=${vector.length}, hash=${hash.toFixed(4)})`);
    await sleep(30);
    return [
      { id: 'glyph-001', score: 0.9 - (hash % 0.05) },
      { id: 'glyph-002', score: 0.82 - (hash % 0.03) },
    ];
  }
}

class MockNeo4jDriver {
  async runGraphQuery(cypher: string) {
    console.log(`[Neo4j] Running graph query: ${cypher}`);
    await sleep(40);
    return [
      { recommendedDocId: 'rec-abc', reason: 'collaborative_filtering' },
      { recommendedDocId: 'rec-def', reason: 'similar_users' },
    ];
  }
}

class MockMinioClient {
  async getGlyph(glyphId: string) {
    console.log(`[MinIO] Retrieving glyph from object storage: ${glyphId}`);
    await sleep(10);
    // Provide some deterministic pseudo-data for personalization synthesis
    const data = new Float32Array(16);
    for (let i = 0; i < data.length; i++) data[i] = ((i + glyphId.length) % 7) / 7;
    return { id: glyphId, embeddedVertexData: data };
  }
}

/**
 * A new engine to handle user analytics and generate recommendations.
 * This simulates the complex data pipeline you described.
 */
class UserAnalyticsEngine {
  private db = new MockDrizzleDB();
  private qdrant = new MockQdrantClient();
  private neo4j = new MockNeo4jDriver();
  private minio = new MockMinioClient();

  async trackUserInteraction(context: RenderContext) {
    console.log(
      `[Analytics] Tracking interaction: ${context.userInteractionType} for doc ${context.documentId}`
    );
    await sleep(5);
  }

  async generateRecommendations(
    document: LegalDocument,
    context: RenderContext
  ): Promise<{ personalizationVector: Float32Array; recommendedDocIds: string[] }> {
    console.log(`[Analytics] Generating recommendations for user & document ${document.id}`);

    const userId = 'user-123';

    // 1. User history
    const history = await this.db.queryUserHistory(userId);

    // 2. Content embedding (mock) + vector similarity
    const contentVector = Array.from({ length: 1536 }, (_, i) => Math.sin(i * 0.013) + Math.random() * 0.01);
    const similarGlyphs = await this.qdrant.findSimilarEmbeddings(contentVector);

    // 3. Graph-based recommendations
    const graphRecs = await this.neo4j.runGraphQuery(
      `MATCH (u:User {id:"${userId}"})-[:INTERACTED_WITH]->(d:Doc)<-[:INTERACTED_WITH]-(o:User)
       WITH collect(DISTINCT d) as docs RETURN docs LIMIT 25`
    );

    // 4. Retrieve one glyph asset to fold into personalization
    let glyphData: Float32Array | null = null;
    if (similarGlyphs.length > 0) {
      const glyph = await this.minio.getGlyph(similarGlyphs[0].id);
      glyphData = glyph.embeddedVertexData;
    }

    // 5. Synthesize personalization vector (16 dims expected by engine)
    const pv = new Float32Array(16);
    const riskMap: Record<string, number> = { low: 0.25, medium: 0.5, high: 0.75, critical: 1 };
    const interactionMap: Record<string, number> = { idle: 0.25, hover: 0.5, focus: 0.75, interaction: 1 };

    pv[0] = Math.min(1, history.length / 20);
    pv[1] = similarGlyphs.length ? similarGlyphs[0].score : 0;
    pv[2] = Math.min(1, graphRecs.length / 10);
    pv[3] = document.priority / 255;
    pv[4] = riskMap[document.riskLevel] ?? 0.5;
    pv[5] = Math.min(1, document.size / 10_000_000);
    pv[6] = Math.min(1, (Date.now() - document.lastAccessed) / 86_400_000);
    pv[7] = document.compressed ? 1 : 0;
    pv[8] = interactionMap[context.userInteractionType] ?? 0.5;
    pv[9] = context.performanceMetrics.currentFPS / 60;
    pv[10] = context.performanceMetrics.memoryPressure;
    pv[11] = context.performanceMetrics.gpuUtilization;
    pv[12] = context.cacheStatus.chrRomHitRate;
    pv[13] = Math.min(1, context.cacheStatus.texturesCached / 100);
    pv[14] = Math.min(1, context.cacheStatus.shadersCompiled / 50);
    pv[15] = glyphData ? glyphData[0] : Math.random() * 0.05; // small stochastic component

    // Light normalization pass (clamp)
    for (let i = 0; i < pv.length; i++) {
      if (!Number.isFinite(pv[i])) pv[i] = 0;
      pv[i] = Math.min(1, Math.max(0, pv[i]));
    }

    return {
      personalizationVector: pv,
      recommendedDocIds: graphRecs.map((r) => r.recommendedDocId).filter(Boolean),
    };
  }
}

class WebGPUSOMCache {
  constructor(options: any) {
    console.log('Mock WebGPUSOMCache initialized with options:', options);
  }
  async findSimilar(features: number[], threshold: number): Promise<any[]> {
    await sleep(40 + Math.random() * 60);
    const count = Math.floor(Math.random() * 5);
    return Array(count)
      .fill(null)
      .map(() => ({ similarity: 0.7 + Math.random() * 0.3 }));
  }
  async storeVector(id: string, vector: number[], metadata: any): Promise<void> {
    await sleep(5);
  }
  getStats() {
    return { nodes: 1000, dimensions: 256, utilization: Math.random() };
  }
}

const lokiRedisCache = {
  async set(key: string, value: string, ttl: number): Promise<void> {
    console.log(`Loki/Redis Cache: SET key=${key} ttl=${ttl}s`);
    await sleep(5);
  },
};

// --- Core Types ---
export interface ShaderVariant {
  id: string;
  quality: 'ultra' | 'high' | 'medium' | 'low' | 'potato';
  complexity: number;
  memoryUsage: number;
  expectedPerformance: number;
  targetHardware: 'rtx' | 'gtx' | 'integrated' | 'mobile';
  shaderCode: string;
  uniformBindings: string[];
}

export interface LODLevel {
  level: number;
  distance: number;
  vertexCount: number;
  textureSize: number;
  shaderQuality: ShaderVariant['quality'];
  chrRomPattern?: string;
  estimatedLoad: number;
}

export interface RenderContext {
  documentId: string;
  viewportSize: { width: number; height: number };
  cameraDistance: number;
  userInteractionType: 'idle' | 'hover' | 'focus' | 'interaction';
  deviceCapabilities: {
    gpuTier: number;
    memoryAvailable: number;
    computeUnits: number;
    bandwidth: number;
  };
  performanceMetrics: {
    currentFPS: number;
    frameTime: number;
    gpuUtilization: number;
    memoryPressure: number;
  };
  cacheStatus: {
    chrRomHitRate: number;
    texturesCached: number;
    shadersCompiled: number;
  };
}

export interface NeuralOptimizationResult {
  recommendedShaderVariant: ShaderVariant;
  optimalLODLevel: LODLevel;
  cacheStrategy: 'prefetch' | 'lazy' | 'aggressive' | 'conservative';
  confidenceScore: number;
  estimatedPerformanceGain: number;
  adaptationReasons: string[];
  visualContext?: {
    optimizationPlanSVG: string;
    semanticHeatmapSVG: string;
  };
}

// --- Neural Optimizer (simple MLP) ---
class NeuralOptimizer {
  private weights: { input: Float32Array; hidden: Float32Array; output: Float32Array };
  private biases: { hidden: Float32Array; output: Float32Array };
  private config: {
    inputSize: number;
    hiddenSize: number;
    outputSize: number;
    learningRate: number;
  };
  private accuracy = 0;

  constructor(config: {
    inputSize: number;
    hiddenSize: number;
    outputSize: number;
    learningRate: number;
  }) {
    this.config = config;
    this.weights = {
      input: new Float32Array(config.inputSize * config.hiddenSize),
      hidden: new Float32Array(config.hiddenSize * config.hiddenSize),
      output: new Float32Array(config.hiddenSize * config.outputSize),
    };
    this.biases = {
      hidden: new Float32Array(config.hiddenSize),
      output: new Float32Array(config.outputSize),
    };
    this.init();
  }

  private init() {
    this.rand(this.weights.input, Math.sqrt(2 / this.config.inputSize));
    this.rand(this.weights.hidden, Math.sqrt(2 / this.config.hiddenSize));
    this.rand(this.weights.output, Math.sqrt(2 / this.config.hiddenSize));
    this.rand(this.biases.hidden, 0.1);
    this.rand(this.biases.output, 0.1);
  }

  private rand(arr: Float32Array, scale: number) {
    for (let i = 0; i < arr.length; i++) arr[i] = (Math.random() - 0.5) * 2 * scale;
  }

  private sigmoid(x: Float32Array) {
    const r = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) r[i] = 1 / (1 + Math.exp(-x[i]));
    return r;
  }
  private sigDeriv(x: Float32Array) {
    const r = new Float32Array(x.length);
    for (let i = 0; i < x.length; i++) r[i] = x[i] * (1 - x[i]);
    return r;
  }
  private add(a: Float32Array, b: Float32Array) {
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) r[i] = a[i] + b[i];
    return r;
  }
  private sub(a: Float32Array, b: Float32Array) {
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) r[i] = a[i] - b[i];
    return r;
  }
  private had(a: Float32Array, b: Float32Array) {
    const r = new Float32Array(a.length);
    for (let i = 0; i < a.length; i++) r[i] = a[i] * b[i];
    return r;
  }
  private mm(a: Float32Array, w: Float32Array, out: number) {
    const r = new Float32Array(out);
    const inSize = a.length;
    for (let i = 0; i < out; i++) {
      let s = 0;
      for (let j = 0; j < inSize; j++) s += a[j] * w[j * out + i];
      r[i] = s;
    }
    return r;
  }
  private mmT(a: Float32Array, w: Float32Array, out: number) {
    const r = new Float32Array(out);
    const inSize = a.length;
    for (let i = 0; i < out; i++) {
      let s = 0;
      for (let j = 0; j < inSize; j++) s += a[j] * w[i * inSize + j];
      r[i] = s;
    }
    return r;
  }

  async predict(input: Float32Array) {
    const hidden = this.sigmoid(
      this.add(this.mm(input, this.weights.input, this.config.hiddenSize), this.biases.hidden)
    );
    const output = this.sigmoid(
      this.add(this.mm(hidden, this.weights.output, this.config.outputSize), this.biases.output)
    );
    return output;
  }

  async train(input: Float32Array, target: Float32Array) {
    const hidden = this.sigmoid(
      this.add(this.mm(input, this.weights.input, this.config.hiddenSize), this.biases.hidden)
    );
    const output = this.sigmoid(
      this.add(this.mm(hidden, this.weights.output, this.config.outputSize), this.biases.output)
    );
    const outErr = this.sub(target, output);
    const hidErr = this.mmT(outErr, this.weights.output, this.config.hiddenSize);
    const outDelta = this.had(outErr, this.sigDeriv(output));
    const hidDelta = this.had(hidErr, this.sigDeriv(hidden));
    const { learningRate: lr, hiddenSize: hS, outputSize: oS, inputSize: iS } = this.config;
    for (let h = 0; h < hS; h++)
      for (let o = 0; o < oS; o++) this.weights.output[h * oS + o] += lr * hidden[h] * outDelta[o];
    for (let i = 0; i < iS; i++)
      for (let h = 0; h < hS; h++) this.weights.input[i * hS + h] += lr * input[i] * hidDelta[h];
    for (let o = 0; o < oS; o++) this.biases.output[o] += lr * outDelta[o];
    for (let h = 0; h < hS; h++) this.biases.hidden[h] += lr * hidDelta[h];
    let accCount = 0;
    for (let i = 0; i < output.length; i++) if (Math.abs(output[i] - target[i]) < 0.1) accCount++;
    const instAcc = accCount / output.length;
    this.accuracy = this.accuracy * 0.98 + instAcc * 0.02;
  }

  getAccuracy() {
    return this.accuracy;
  }
}

// --- Engine ---
export class SearchCacheNeuralEngine {
  private somCache: WebGPUSOMCache;
  private neural: NeuralOptimizer;
  private userAnalytics: UserAnalyticsEngine;
  private shaderVariants = new Map<string, ShaderVariant[]>();
  private lodLevels = new Map<string, LODLevel[]>();

  constructor(
    opts: { maxCacheSize?: number; learningRate?: number; adaptationThreshold?: number } = {}
  ) {
    this.somCache = new WebGPUSOMCache({ maxNodes: opts.maxCacheSize ?? 10000, dimensions: 256 });
    this.neural = new NeuralOptimizer({
      inputSize: 48,
      hiddenSize: 64,
      outputSize: 16,
      learningRate: opts.learningRate ?? 0.01,
    });
    this.userAnalytics = new UserAnalyticsEngine();
    this.initShaderVariants();
    this.initLODLevels();
    console.log('🧠 SearchCacheNeuralEngine ready with User Analytics');
  }

  async optimizeRenderingForDocument(
    document: LegalDocument,
    context: RenderContext
  ): Promise<NeuralOptimizationResult> {
    // Phase 1: User Analytics & Recommendation
    await this.userAnalytics.trackUserInteraction(context);
    const recommendations = await this.userAnalytics.generateRecommendations(document, context);

    // Phase 2: Feature Extraction including personalization
    const features = this.extractFeatures(context, document, recommendations.personalizationVector);
    const similar = await this.somCache.findSimilar(Array.from(features), 0.7);
    const rec = await this.neural.predict(features);
    const shader = this.pickShader(document.type, context, rec);
    const lod = this.pickLOD(document, context, rec);
    const cacheStrategy = this.pickCacheStrategy(context, similar);
    const confidence = this.computeConfidence(rec, similar);
    const perfGain = this.estimateGain(shader, lod, context);
    const reasons = this.buildReasons(shader, lod, context, recommendations);
    const result: NeuralOptimizationResult = {
      recommendedShaderVariant: shader,
      optimalLODLevel: lod,
      cacheStrategy,
      confidenceScore: confidence,
      estimatedPerformanceGain: perfGain,
      adaptationReasons: reasons,
      visualContext: {
        optimizationPlanSVG: this.makePlanSVG(shader, lod, cacheStrategy),
        semanticHeatmapSVG: this.makeHeatmap(features),
      },
    };
    await this.persist(document.id, result);
    console.log(
      `✅ NEURAL OPT ${document.id}: ${shader.quality} | LOD ${lod.level} | +${perfGain.toFixed(1)}%`
    );
    return result;
  } // --- Initialization ---

  private initShaderVariants() {
    const docTypes = ['contract', 'evidence', 'brief', 'citation', 'precedent'];
    docTypes.forEach((dt) => {
      this.shaderVariants.set(dt, [
        {
          id: `${dt}_ultra`,
          quality: 'ultra',
          complexity: 1.0,
          memoryUsage: 4_194_304,
          expectedPerformance: 30,
          targetHardware: 'rtx',
          shaderCode: `// ultra shader ${dt}`,
          uniformBindings: ['view', 'proj', 'light', 'material', 'shadow'],
        },
        {
          id: `${dt}_high`,
          quality: 'high',
          complexity: 0.7,
          memoryUsage: 2_097_152,
          expectedPerformance: 45,
          targetHardware: 'gtx',
          shaderCode: `// high shader ${dt}`,
          uniformBindings: ['view', 'proj', 'light', 'material'],
        },
        {
          id: `${dt}_medium`,
          quality: 'medium',
          complexity: 0.5,
          memoryUsage: 1_048_576,
          expectedPerformance: 60,
          targetHardware: 'integrated',
          shaderCode: `// medium shader ${dt}`,
          uniformBindings: ['view', 'proj', 'light'],
        },
        {
          id: `${dt}_low`,
          quality: 'low',
          complexity: 0.3,
          memoryUsage: 524_288,
          expectedPerformance: 60,
          targetHardware: 'integrated',
          shaderCode: `// low shader ${dt}`,
          uniformBindings: ['view', 'proj'],
        },
        {
          id: `${dt}_potato`,
          quality: 'potato',
          complexity: 0.1,
          memoryUsage: 262_144,
          expectedPerformance: 60,
          targetHardware: 'mobile',
          shaderCode: `// potato shader ${dt}`,
          uniformBindings: ['view'],
        },
      ]);
    });
  }

  private initLODLevels() {
    const docTypes = ['contract', 'evidence', 'brief', 'citation', 'precedent'];
    const base = Array.from({ length: 8 }, (_, level) => ({
      level,
      distance: 5 * Math.pow(1.8, level),
      vertexCount: Math.floor(1024 / Math.pow(2, level)),
      textureSize: Math.max(64, 512 / Math.pow(2, level)),
      shaderQuality: this.levelToQuality(level),
      estimatedLoad: (8 - level) / 8,
      chrRomPattern: `base_lod_${level}`,
    }));
    docTypes.forEach((dt) => this.lodLevels.set(dt, [...base]));
  } // --- Feature Extraction ---

  private extractFeatures(
    ctx: RenderContext,
    doc: LegalDocument | null,
    personalization: Float32Array
  ): Float32Array {
    const f = new Float32Array(48);
    let i = 0; // 48 total (16 sys + 8 doc + 8 temporal + 16 personalization)

    // --- System context (16) ---
    f[i++] = ctx.viewportSize.width / 1920;
    f[i++] = ctx.viewportSize.height / 1080;
    f[i++] = ctx.cameraDistance / 100;
    f[i++] = this.interactionToNum(ctx.userInteractionType);
    f[i++] = ctx.deviceCapabilities.gpuTier / 4;
    f[i++] = ctx.deviceCapabilities.memoryAvailable / 8e9;
    f[i++] = ctx.deviceCapabilities.computeUnits / 2048;
    f[i++] = ctx.deviceCapabilities.bandwidth / 5e11;
    f[i++] = ctx.performanceMetrics.currentFPS / 60;
    f[i++] = ctx.performanceMetrics.frameTime / 16.67;
    f[i++] = ctx.performanceMetrics.gpuUtilization;
    f[i++] = ctx.performanceMetrics.memoryPressure;
    f[i++] = ctx.cacheStatus.chrRomHitRate;
    f[i++] = ctx.cacheStatus.texturesCached / 100;
    f[i++] = ctx.cacheStatus.shadersCompiled / 50;
    f[i++] = 0; // reserved

    // --- Document context (8) ---
    if (doc) {
      f[i++] = doc.priority / 255;
      f[i++] = Math.min(1, Math.max(0, doc.confidenceLevel));
      f[i++] = this.riskToNum(doc.riskLevel);
      f[i++] = this.docTypeToNum(doc.type);
      f[i++] = doc.size / 1e7;
      f[i++] = (Date.now() - doc.lastAccessed) / 864e5;
      f[i++] = doc.compressed ? 1 : 0;
      f[i++] = 0; // reserved
    } else {
      i += 8;
    }

    // --- Temporal context (8) ---
    const now = new Date();
    const hour = now.getHours();
    f[i++] = hour / 24;
    f[i++] = now.getDay() / 7;
    f[i++] = Math.sin((2 * Math.PI * hour) / 24);
    f[i++] = Math.cos((2 * Math.PI * hour) / 24);
    i += 4; // reserved future temporal slots

    // --- Personalization (16) ---
    if (personalization.length >= 16) {
      f.set(personalization.subarray(0, 16), i);
    } else {
      const tmp = new Float32Array(16);
      tmp.set(personalization);
      f.set(tmp, i);
    }

    return f;
  } // --- Selection Logic ---

  private pickShader(docType: string, ctx: RenderContext, rec: Float32Array): ShaderVariant {
    const variants = this.shaderVariants.get(docType)!;
    const q = rec[0] ?? 0.5;
    if (q > 0.9) return variants.find((v) => v.quality === 'ultra')!;
    if (q > 0.7) return variants.find((v) => v.quality === 'high')!;
    if (q > 0.5) return variants.find((v) => v.quality === 'medium')!;
    if (q > 0.3) return variants.find((v) => v.quality === 'low')!;
    return variants.find((v) => v.quality === 'potato')!;
  }

  private pickLOD(doc: LegalDocument, ctx: RenderContext, rec: Float32Array): LODLevel {
    const levels = this.lodLevels.get(doc.type)!;
    const score = rec[1] ?? 0.5;
    const dist = Math.min(1, ctx.cameraDistance / 100);
    const perfFactor = ctx.performanceMetrics.currentFPS > 45 ? 0.8 : 1.2;
    const raw = Math.floor(((score + dist + (1 - perfFactor)) * levels.length) / 3);
    const clamped = Math.max(0, Math.min(levels.length - 1, raw));
    return levels[clamped];
  }

  private pickCacheStrategy(
    ctx: RenderContext,
    similar: any[]
  ): 'prefetch' | 'lazy' | 'aggressive' | 'conservative' {
    if (ctx.cacheStatus.chrRomHitRate > 0.8 && ctx.performanceMetrics.memoryPressure < 0.4)
      return 'conservative';
    if (ctx.performanceMetrics.memoryPressure < 0.3) return 'aggressive';
    if (similar.length > 5) return 'prefetch';
    return 'lazy';
  } // --- Metrics & Explanations ---

  private computeConfidence(rec: Float32Array, similar: any[]): number {
    let c = Math.max(...Array.from(rec).slice(0, 4));
    if (similar.length) {
      const avg = similar.reduce((s: number, v: any) => s + v.similarity, 0) / similar.length;
      c = Math.min(1, c + avg * 0.3);
    }
    return c;
  }

  private estimateGain(shader: ShaderVariant, lod: LODLevel, ctx: RenderContext): number {
    const base = ctx.performanceMetrics.currentFPS;
    const target = shader.expectedPerformance;
    const lodBonus = ((8 - lod.level) / 8) * 10;
    const gain = Math.max(0, ((target + lodBonus) / Math.max(1, base) - 1) * 100);
    return Math.min(200, gain);
  }

  private buildReasons(
    shader: ShaderVariant,
    lod: LODLevel,
    ctx: RenderContext,
    recommendations: any
  ): string[] {
    const reasons: string[] = [];
    if (ctx.performanceMetrics.currentFPS < 45)
      reasons.push(`Low FPS (${ctx.performanceMetrics.currentFPS.toFixed(1)})`);
    if (shader.quality !== 'ultra') reasons.push(`Shader lowered -> ${shader.quality}`);
    if (lod.level > 2) reasons.push(`LOD raised -> ${lod.level}`);
    if (ctx.performanceMetrics.memoryPressure > 0.7)
      reasons.push(
        `High memory pressure (${(ctx.performanceMetrics.memoryPressure * 100).toFixed(0)}%)`
      );
    if (recommendations.recommendedDocIds.length > 0) reasons.push(`Personalized for user history`);
    return reasons;
  } // --- Persistence & Visuals ---

  private async persist(docId: string, result: NeuralOptimizationResult) {
    await lokiRedisCache.set(
      `neural_opt:${docId}:${Date.now()}`,
      JSON.stringify({
        t: Date.now(),
        q: result.recommendedShaderVariant.quality,
        lod: result.optimalLODLevel.level,
        conf: result.confidenceScore,
      }),
      3600
    );
  }

  private makePlanSVG(shader: ShaderVariant, lod: LODLevel, strategy: string): string {
    const color = {
      ultra: '#ff00ff',
      high: '#8a2be2',
      medium: '#00BFFF',
      low: '#32cd32',
      potato: '#f0e68c',
    }[shader.quality];
    return `<svg width="220" height="54" xmlns="http://www.w3.org/2000/svg"><rect width="220" height="54" rx="6" fill="#1f2937"/><text x="10" y="20" fill="#fff" font-size="12">Shader: <tspan fill="${color}" font-weight="bold">${shader.quality}</tspan></text><text x="10" y="38" fill="#fff" font-size="12">LOD ${lod.level} • Cache ${strategy}</text></svg>`;
  }

  private makeHeatmap(features: Float32Array): string {
    let svg = `<svg width="200" height="50" xmlns="http://www.w3.org/2000/svg">`;
    for (let i = 0; i < features.length; i++) {
      // Length is now 48
      const v = Math.min(255, Math.max(0, Math.floor(features[i] * 255)));
      svg += `<rect x="${i * 4.16}" y="0" width="4.16" height="50" fill="rgb(${255 - v},0,${v})"/>`;
    }
    return svg + '</svg>';
  } // --- Mapping Helpers ---

  private interactionToNum(t: string) {
    return { idle: 0.25, hover: 0.5, focus: 0.75, interaction: 1 }[t] ?? 0.5;
  }
  private riskToNum(r: string) {
    return { low: 0.25, medium: 0.5, high: 0.75, critical: 1 }[r] ?? 0.5;
  }
  private docTypeToNum(d: string) {
    return { contract: 0.2, evidence: 0.4, brief: 0.6, citation: 0.8, precedent: 1 }[d] ?? 0.5;
  }
  private levelToQuality(l: number): ShaderVariant['quality'] {
    if (l <= 1) return 'ultra';
    if (l <= 2) return 'high';
    if (l <= 4) return 'medium';
    if (l <= 6) return 'low';
    return 'potato';
  }
}

// Singleton instance
export const searchCacheNeuralEngine = new SearchCacheNeuralEngine({
  maxCacheSize: 10000,
  learningRate: 0.01,
  adaptationThreshold: 0.1,
});
