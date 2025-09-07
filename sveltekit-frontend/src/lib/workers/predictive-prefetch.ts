
// Service Worker for AI-Driven Predictive Prefetching
// Integrates with our legal AI system for intelligent resource loading

export interface UserIntent {
  action:
    | "open_settings"
    | "search_evidence"
    | "create_case"
    | "analyze_document"
    | "view_timeline"
    | "view_evidence"
    | "search_documents"
    | "review_analysis";
  confidence: number;
  context: {
    currentPage: string;
    focusedElement?: string;
    recentActions: string[];
    caseId?: string;
    timeOnPage: number;
    scrollPosition: number;
    mouseActivity: MouseEvent[];
    keyboardActivity: KeyboardEvent[];
    eyeTracking?: { x: number; y: number; timestamp: number }[];
  };
  userProfile: {
    role: "prosecutor" | "detective" | "admin" | "user";
    recentActions: string[];
    preferences: Record<string, any>;
    workflowPatterns: string[];
  };
}

export interface PrefetchItem {
  type: "route" | "api" | "asset" | "ui-buffer" | "css";
  url: string;
  priority: "critical" | "high" | "medium" | "low";
  size: number;
  cacheStrategy: "aggressive" | "conservative" | "lazy";
  dependencies: string[];
  aiReasoning: string;
}

export interface LegalWorkflowPattern {
  name: string;
  sequence: string[];
  triggerConditions: Record<string, any>;
  successProbability: number;
  typicalAssets: string[];
  preloadTiming: "immediate" | "on-hover" | "predictive";
}

export interface PrefetchStrategy {
  routes: string[];
  assets: string[];
  uiBuffers: string[];
  priority: "critical" | "high" | "medium" | "low";
  conditions: {
    viewport?: "mobile" | "desktop";
    connection?: "fast" | "slow";
    battery?: "high" | "low";
    userRole?: string[];
    timeOfDay?: string[];
  };
  llmIntegration?: {
    modelEndpoint?: string;
    useLocalLLM?: boolean;
    intentThreshold?: number;
  };
}

export class PredictivePrefetcher {
  private cache: Cache | null = null;
  private intentHistory: UserIntent[] = [];
  private prefetchStrategies: Map<string, PrefetchStrategy> = new Map();
  private prefetchQueue: PrefetchItem[] = [];
  private legalWorkflowPatterns: LegalWorkflowPattern[] = [];
  private intentModel: any = null;
  private mouseEvents: MouseEvent[] = [];
  private keyboardEvents: KeyboardEvent[] = [];
  private lastPrediction = Date.now();
  private startTime = Date.now();

  constructor() {
    this.initializeStrategies();
    this.initializeLegalWorkflowPatterns();
  }

  async initialize(): Promise<void> {
    try {
      this.cache = await caches.open("legal-ai-predictive-v1");
      await this.initializeIntentModel();
      this.setupEventListeners();
      this.startBehaviorMonitoring();
      console.log(
        "✅ Enhanced Predictive Prefetcher initialized with LLM integration",
      );
    } catch (error: any) {
      console.error("Failed to initialize predictive prefetcher:", error);
    }
  }

  /**
   * Initialize local LLM model for intent prediction
   */
  private async initializeIntentModel(): Promise<void> {
    try {
      // Use Ollama for local LLM inference
      const modelResponse = await fetch("http://localhost:11434/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3-legal:latest", // Lightweight model for fast inference
          prompt: "Initialize legal workflow intent prediction model",
          stream: false,
        }),
      });

      if (modelResponse.ok) {
        this.intentModel = {
          initialized: true,
          endpoint: "http://localhost:11434/api/generate",
          model: "gemma3-legal:latest",
        };
        console.log("🧠 Local LLM initialized for intent prediction");
      } else {
        throw new Error("Local LLM not available, using heuristic fallback");
      }
    } catch (error: any) {
      console.warn(
        "⚠️ LLM initialization failed, using pattern matching:",
        error,
      );
      this.intentModel = { initialized: false, fallback: true };
    }
  }

  /**
   * Start monitoring user behavior for intent prediction
   */
  private startBehaviorMonitoring(): void {
    // Mouse movement tracking
    self.addEventListener("mousemove", (e: any) => {
      this.mouseEvents.push(e);
      if (this.mouseEvents.length > 50)
        this.mouseEvents = this.mouseEvents.slice(-50);

      // Throttled prediction every 2 seconds
      if (Date.now() - this.lastPrediction > 2000) {
        this.predictUserIntentEnhanced({
          mouseEvents: this.mouseEvents,
          keyboardEvents: this.keyboardEvents,
        }).then((intent: any) => {
          if (intent) {
            this.intentHistory.push(intent);
          }
        }).catch(console.warn);
        this.lastPrediction = Date.now();
      }
    });

    // Keyboard activity tracking
    self.addEventListener("keydown", (e: any) => {
      this.keyboardEvents.push(e);
      if (this.keyboardEvents.length > 20)
        this.keyboardEvents = this.keyboardEvents.slice(-20);
    });

    console.log("👀 Enhanced user behavior monitoring started");
  }

  /**
   * Initialize prefetch strategies for legal AI workflows
   */
  private initializeStrategies(): void {
    // Evidence analysis workflow
    this.prefetchStrategies.set("analyze_document", {
      routes: [
        "/api/ai/analyze",
        "/api/documents/metadata",
        "/api/ui/buffers/analysis-panel",
      ],
      assets: [
        "/assets/css/analysis.css",
        "/assets/wasm/pdf-parser.wasm",
        "/assets/models/legal-classifier.onnx",
      ],
      uiBuffers: ["analysis-panel", "document-viewer"],
      priority: "high",
      conditions: {
        viewport: "desktop",
        connection: "fast",
      },
    });

    // Case management
    this.prefetchStrategies.set("create_case", {
      routes: [
        "/api/cases/templates",
        "/api/ui/buffers/case-form",
        "/api/legal/precedents",
      ],
      assets: ["/assets/css/forms.css", "/assets/js/case-validator.js"],
      uiBuffers: ["case-form", "precedent-search"],
      priority: "medium",
      conditions: {},
    });

    // Evidence search
    this.prefetchStrategies.set("search_evidence", {
      routes: [
        "/api/search/semantic",
        "/api/ui/buffers/search-results",
        "/api/evidence/filters",
      ],
      assets: [
        "/assets/css/search.css",
        "/assets/models/search-embeddings.bin",
      ],
      uiBuffers: ["search-results", "filter-panel"],
      priority: "high",
      conditions: {
        connection: "fast",
      },
    });

    // Settings and configuration
    this.prefetchStrategies.set("open_settings", {
      routes: [
        "/api/ui/buffers/settings",
        "/api/user/preferences",
        "/api/system/config",
      ],
      assets: ["/assets/css/settings.css"],
      uiBuffers: ["/api/ui/buffers/settings"],
      priority: "low",
      conditions: {},
      llmIntegration: {
        useLocalLLM: true,
        intentThreshold: 0.7,
      },
    });

    // Evidence viewing (Phase 8 enhanced)
    this.prefetchStrategies.set("view_evidence", {
      routes: [
        "/evidence/viewer",
        "/api/evidence/recent",
        "/api/ui/buffers/evidence-panel",
      ],
      assets: [
        "/assets/css/evidence.css",
        "/assets/models/evidence-classifier.onnx",
      ],
      uiBuffers: [
        "/api/ui/buffers/evidence-viewer",
        "/api/ui/buffers/timeline",
      ],
      priority: "critical",
      conditions: {
        userRole: ["prosecutor", "detective"],
      },
      llmIntegration: {
        useLocalLLM: true,
        intentThreshold: 0.8,
      },
    });

    // Document search (Phase 8 enhanced)
    this.prefetchStrategies.set("search_documents", {
      routes: [
        "/api/documents/search",
        "/api/ui/buffers/search-results",
        "/api/semantic-search",
      ],
      assets: [
        "/assets/css/search.css",
        "/assets/models/search-embeddings.bin",
      ],
      uiBuffers: [
        "/api/ui/buffers/search-interface",
        "/api/ui/buffers/filters",
      ],
      priority: "high",
      conditions: {
        connection: "fast",
      },
      llmIntegration: {
        useLocalLLM: true,
        intentThreshold: 0.75,
      },
    });
  }

  /**
   * Initialize legal workflow patterns for Phase 8
   */
  private initializeLegalWorkflowPatterns(): void {
    this.legalWorkflowPatterns = [
      {
        name: "Evidence Review Workflow",
        sequence: ["/cases", "/evidence", "/evidence/viewer", "/analysis"],
        triggerConditions: {
          userRole: "prosecutor",
          timeOfDay: "morning",
          recentAction: "case_assigned",
        },
        successProbability: 0.85,
        typicalAssets: [
          "/api/evidence/recent",
          "/api/analysis/summary",
          "/api/ui/buffers/evidence-panel",
        ],
        preloadTiming: "predictive",
      },
      {
        name: "Case Creation Workflow",
        sequence: ["/dashboard", "/cases/new", "/evidence/upload", "/review"],
        triggerConditions: {
          userRole: "detective",
          recentAction: "investigation_complete",
          workflowState: "case_prep",
        },
        successProbability: 0.78,
        typicalAssets: [
          "/api/templates/case",
          "/api/users/assignments",
          "/api/ui/buffers/case-form",
        ],
        preloadTiming: "on-hover",
      },
      {
        name: "Document Search Workflow",
        sequence: ["/search", "/documents", "/documents/viewer", "/citations"],
        triggerConditions: {
          activity: "research",
          keyboardIntensive: true,
          mouseVelocity: "low",
        },
        successProbability: 0.82,
        typicalAssets: [
          "/api/documents/search",
          "/api/citations/generate",
          "/api/ui/buffers/search-results",
        ],
        preloadTiming: "immediate",
      },
      {
        name: "AI Analysis Workflow",
        sequence: [
          "/upload",
          "/ai/analyze",
          "/ai/summary",
          "/ai/recommendations",
        ],
        triggerConditions: {
          fileUpload: true,
          aiConfidence: "high",
          documentType: "legal",
        },
        successProbability: 0.88,
        typicalAssets: [
          "/api/ai/analyze",
          "/api/ui/buffers/analysis-panel",
          "/assets/models/legal-classifier.onnx",
        ],
        preloadTiming: "immediate",
      },
    ];
  }

  /**
   * Predict user intent based on current context
   */
  async predictIntent(
    context: UserIntent["context"],
  ): Promise<UserIntent | null> {
    const intentScores = new Map<string, number>();

    // Analyze current page for intent signals
    if (context.currentPage.includes("/evidence")) {
      intentScores.set("search_evidence", 0.7);
      intentScores.set("analyze_document", 0.5);
    } else if (context.currentPage.includes("/cases")) {
      intentScores.set("create_case", 0.6);
      intentScores.set("search_evidence", 0.4);
    }

    // Analyze focused element
    if (context.focusedElement) {
      if (context.focusedElement.includes("upload")) {
        intentScores.set(
          "analyze_document",
          (intentScores.get("analyze_document") || 0) + 0.3,
        );
      } else if (context.focusedElement.includes("search")) {
        intentScores.set(
          "search_evidence",
          (intentScores.get("search_evidence") || 0) + 0.4,
        );
      } else if (context.focusedElement.includes("settings")) {
        intentScores.set("open_settings", 0.8);
      }
    }

    // Analyze recent actions for patterns
    const recentAnalysis = this.analyzeRecentActions(context.recentActions);
    recentAnalysis.forEach((score, action) => {
      intentScores.set(action, (intentScores.get(action) || 0) + score);
    });

    // Find highest scoring intent
    let maxScore = 0;
    let predictedAction = "";

    intentScores.forEach((score, action) => {
      if (score > maxScore) {
        maxScore = score;
        predictedAction = action;
      }
    });

    // Only return prediction if confidence is above threshold
    if (maxScore > 0.6) {
      return {
        action: predictedAction as UserIntent["action"],
        confidence: maxScore,
        context,
        userProfile: {
          role: "user",
          recentActions: this.intentHistory.slice(-5).map((intent: any) => intent.action),
          preferences: {},
          workflowPatterns: []
        }
      };
    }

    return null;
  }

  /**
   * Enhanced prediction with additional context
   */
  private async predictUserIntentEnhanced(context: { mouseEvents: MouseEvent[]; keyboardEvents: KeyboardEvent[] }): Promise<UserIntent | null> {
    const currentContext = {
      currentPage: window.location.pathname,
      recentActions: this.intentHistory.slice(-5).map((intent: any) => intent.action),
      timeOnPage: Date.now() - this.startTime,
      scrollPosition: window.scrollY || 0,
      mouseActivity: context.mouseEvents,
      keyboardActivity: context.keyboardEvents
    };
    return await this.predictIntent(currentContext);
  }

  /**
   * Analyze recent actions for behavioral patterns
   */
  private analyzeRecentActions(actions: string[]): Map<string, number> {
    const patterns = new Map<string, number>();

    // Look for sequential patterns
    for (let i = 0; i < actions.length - 1; i++) {
      const current = actions[i];
      const next = actions[i + 1];

      // Document upload → analysis pattern
      if (current === "file_upload" && next === "view_document") {
        patterns.set("analyze_document", 0.6);
      }

      // Search → filter → sort pattern
      if (current === "search_input" && next === "apply_filter") {
        patterns.set("search_evidence", 0.5);
      }

      // Case creation workflow
      if (current === "new_case_button" && next === "case_form") {
        patterns.set("create_case", 0.7);
      }
    }

    return patterns;
  }

  /**
   * Execute prefetch strategy based on predicted intent
   */
  async executePrefetch(intent: UserIntent): Promise<void> {
    const strategy = this.prefetchStrategies.get(intent.action);
    if (!strategy) return;

    // Check conditions before prefetching
    if (!this.checkConditions(strategy.conditions)) {
      return;
    }

    try {
      // Prefetch routes
      const routePromises = strategy.routes.map((route) =>
        this.prefetchRoute(route),
      );

      // Prefetch assets
      const assetPromises = strategy.assets.map((asset) =>
        this.prefetchAsset(asset),
      );

      // Execute based on priority
      if (strategy.priority === "high") {
        await Promise.all([...routePromises, ...assetPromises]);
      } else {
        // Lower priority - don't block
        Promise.all([...routePromises, ...assetPromises]).catch(console.warn);
      }

      console.log(
        `Prefetched resources for intent: ${intent.action} (confidence: ${intent.confidence})`,
      );
    } catch (error: any) {
      console.warn("Prefetch failed:", error);
    }
  }

  /**
   * Check if conditions are met for prefetching
   */
  private checkConditions(conditions: PrefetchStrategy["conditions"]): boolean {
    // Check viewport
    if (conditions.viewport) {
      const isMobile = window.innerWidth < 768;
      if (conditions.viewport === "mobile" && !isMobile) return false;
      if (conditions.viewport === "desktop" && isMobile) return false;
    }

    // Check connection speed
    if (conditions.connection && "connection" in navigator) {
      const connection = (navigator as any).connection;
      if (
        conditions.connection === "fast" &&
        connection.effectiveType.includes("2g")
      ) {
        return false;
      }
    }

    // Check battery level
    if (conditions.battery && "getBattery" in navigator) {
      // Note: Battery API is deprecated, but included for completeness
      return true; // Skip battery check for now
    }

    return true;
  }

  /**
   * Prefetch API route
   */
  private async prefetchRoute(route: string): Promise<void> {
    if (!this.cache) return;

    try {
      const response = await fetch(route, {
        method: "GET",
        headers: {
          "X-Prefetch": "true",
        },
      });

      if (response.ok) {
        await this.cache.put(route, response.clone());
      }
    } catch (error: any) {
      console.warn(`Failed to prefetch route ${route}:`, error);
    }
  }

  /**
   * Prefetch static asset
   */
  private async prefetchAsset(asset: string): Promise<void> {
    if (!this.cache) return;

    try {
      const response = await fetch(asset);
      if (response.ok) {
        await this.cache.put(asset, response.clone());
      }
    } catch (error: any) {
      console.warn(`Failed to prefetch asset ${asset}:`, error);
    }
  }

  /**
   * Setup event listeners for intent detection
   */
  private setupEventListeners(): void {
    // Listen for user interactions
    self.addEventListener("message", async (event: any) => {
      if (event.data.type === "USER_INTERACTION") {
        const intent = await this.predictIntent(event.data.context);
        if (intent) {
          await this.executePrefetch(intent);
          this.intentHistory.push(intent);

          // Keep history manageable
          if (this.intentHistory.length > 10) {
            this.intentHistory.shift();
          }
        }
      }
    });

    // Clean up old cache entries
    self.addEventListener("activate", () => {
      this.cleanupCache();
    });
  }

  /**
   * Cleanup old cache entries
   */
  private async cleanupCache(): Promise<void> {
    if (!this.cache) return;

    try {
      const keys = await this.cache.keys();
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours

      for (const request of keys) {
        const response = await this.cache.match(request);
        if (response) {
          const cachedTime = response.headers.get("sw-cached-time");
          if (cachedTime && now - parseInt(cachedTime) > maxAge) {
            await this.cache.delete(request);
          }
        }
      }
    } catch (error: any) {
      console.warn("Cache cleanup failed:", error);
    }
  }

  /**
   * Get cached response for request
   */
  async getCachedResponse(request: Request): Promise<Response | null> {
    if (!this.cache) return null;

    try {
      return await this.cache.match(request);
    } catch (error: any) {
      console.warn("Cache retrieval failed:", error);
      return null;
    }
  }
}

// Initialize and export for service worker
export const prefetcher = new PredictivePrefetcher();
;
// Service worker event handlers
self.addEventListener("install", () => {
  (self as any).skipWaiting();
});

self.addEventListener("activate", () => {
  prefetcher.initialize();
});

self.addEventListener("fetch", async (event: any) => {
  // Check cache first for prefetched resources
  const cachedResponse = await prefetcher.getCachedResponse(event.request);
  if (cachedResponse) {
    event.respondWith(cachedResponse);
  }
});

export default PredictivePrefetcher;
