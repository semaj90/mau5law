/**
 * Context7 + Phase 8 Unified Recommendation System
 * Integrates MCP tools with AI-aware matrix UI and XState machines
 * Optimized for legal AI workflow enhancement and performance
 */

// Type definitions for xstate and matrix UI
export type StateValue = string | object;

export interface MatrixUINode {
  id: string;
  metadata?: {
    priority?: string;
    confidence?: number;
    [key: string]: unknown;
  };
  [key: string]: unknown;
}

// Type definitions
export interface LegalFormContext {
  evidenceFiles: File[];
  evidenceType?: string;
  confidence: number;
  [key: string]: unknown;
}

export interface Context7Phase8Query {
  component: string;
  context: "legal-ai" | "performance" | "ui-ux";
  area?: "performance" | "ui-ux" | "ai-enhancement";
  feature?: string;
  requirements?: string;
  xstateContext?: LegalFormContext;
  currentState?: StateValue;
  matrixNodes?: MatrixUINode[];
}

export interface Phase8Recommendation {
  id: string;
  type:
    | "ui-optimization"
    | "workflow-improvement"
    | "performance-boost"
    | "ai-enhancement";
  priority: "critical" | "high" | "medium" | "low";
  title: string;
  description: string;
  context7Source: string;
  aiConfidence: number;
  implementation: {
    component?: string;
    code?: string;
    dependencies?: string[];
    timeEstimate?: string;
  };
  benefits: string[];
  risks: string[];
  relatedStates?: string[];
}

export interface RerankResult {
  id: string;
  content: string;
  metadata: {
    type: string;
    priority: string;
    confidence: number;
    component: string;
  };
  originalScore: number;
  rerankScore: number;
  confidence: number;
}

export interface UserContext {
  intent: string;
  timeOfDay: "morning" | "afternoon" | "evening" | "night";
  focusedElement: string;
  currentCase: string;
  recentActions: string[];
  userRole: string;
  workflowState: string;
}

export class Context7Phase8Integrator {
  private mcpEndpoint = "http://localhost:8000/api";
  private ragEndpoint = "http://localhost:8000/api/rag";

  /**
   * Generate unified recommendations using Context7 MCP + Phase 8 AI
   */
  async generateUnifiedRecommendations(
    query: Context7Phase8Query,
  ): Promise<Phase8Recommendation[]> {
    const recommendations: Phase8Recommendation[] = [];

    try {
      // 1. Get Context7 stack analysis
      const stackAnalysis = await this.getContext7StackAnalysis(query);

      // 2. Get RAG-powered legal AI insights
      const ragInsights = await this.getRagLegalInsights(query);

      // 3. Get XState workflow recommendations
      const workflowRecs = await this.getXStateWorkflowRecommendations(query);

      // 4. Get Matrix UI performance suggestions
      const performanceRecs =
        await this.getMatrixUIPerformanceRecommendations(query);

      // 5. Merge and rank all recommendations
      recommendations.push(
        ...this.mergeRecommendations(
          stackAnalysis,
          ragInsights,
          workflowRecs,
          performanceRecs,
        ),
      );

      // 6. Apply AI reranking based on current context
      return this.rerankRecommendations(recommendations, query);
    } catch (error: any) {
      console.error("Context7 Phase 8 integration error:", error);
      return this.getFallbackRecommendations(query);
    }
  }

  /**
   * Get Context7 MCP stack analysis recommendations
   */
  private async getContext7StackAnalysis(
    query: Context7Phase8Query,
  ): Promise<Partial<Phase8Recommendation>[]> {
    const response = await fetch(`${this.mcpEndpoint}/mcp/analyze-stack`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        component: query.component,
        context: query.context,
      }),
    });

    if (!response.ok) throw new Error("Context7 MCP request failed");

    const analysis = await response.json();

    return (
      analysis.recommendations?.map((rec: any) => ({
        type: "ui-optimization" as const,
        priority: rec.priority || "medium",
        title: rec.title,
        description: rec.description,
        context7Source: "stack-analysis",
        aiConfidence: rec.confidence || 75,
        implementation: {
          component: query.component,
          code: rec.code,
          dependencies: rec.dependencies,
          timeEstimate: rec.timeEstimate,
        },
        benefits: rec.benefits || [],
        risks: rec.risks || [],
      })) || []
    );
  }

  /**
   * Get RAG-powered legal AI insights
   */
  private async getRagLegalInsights(
    query: Context7Phase8Query,
  ): Promise<Partial<Phase8Recommendation>[]> {
    const ragQuery = this.buildRagQuery(query);

    const response = await fetch(`${this.ragEndpoint}/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: ragQuery,
        context: "legal-ai",
        limit: 5,
      }),
    });

    if (!response.ok) throw new Error("RAG query failed");

    const insights = await response.json();

    return (
      insights.results?.map((result: any) => ({
        type: "ai-enhancement" as const,
        priority: this.calculatePriorityFromScore(result.score),
        title: `Legal AI Enhancement: ${result.title}`,
        description: result.content,
        context7Source: "rag-legal",
        aiConfidence: Math.round(result.score * 100),
        implementation: {
          component: query.component,
          timeEstimate: "2-4 hours",
        },
        benefits: this.extractBenefits(result.content),
        risks: [],
      })) || []
    );
  }

  /**
   * Get XState workflow recommendations based on current state
   */
  private async getXStateWorkflowRecommendations(
    query: Context7Phase8Query,
  ): Promise<Partial<Phase8Recommendation>[]> {
    if (!query.xstateContext || !query.currentState) return [];

    const recommendations: Partial<Phase8Recommendation>[] = [];

    // Analyze current state for optimization opportunities
    if (
      query.currentState === "evidenceUpload" &&
      query.xstateContext.evidenceFiles.length === 0
    ) {
      recommendations.push({
        type: "workflow-improvement",
        priority: "high",
        title: "Streamline Evidence Upload UX",
        description:
          "Current evidence upload requires multiple clicks. Consider drag-and-drop or bulk upload.",
        context7Source: "xstate-analysis",
        aiConfidence: 85,
        implementation: {
          component: "EvidenceUpload",
          code: `
// Enhanced drag-and-drop evidence upload
<div 
  class="drop-zone yorha-panel border-dashed border-2 p-8"
  on:drop={handleDrop}
  on:dragover={handleDragOver}
>
  <FileUploadIcon />
  <p>Drag evidence files here or click to browse</p>
</div>`,
          dependencies: ["@uppy/core", "@uppy/drag-drop"],
          timeEstimate: "1-2 hours",
        },
        benefits: [
          "Faster evidence upload",
          "Better user experience",
          "Reduced form abandonment",
        ],
        risks: ["Browser compatibility"],
        relatedStates: ["evidenceUpload"],
      });
    }

    // Check for AI confidence optimization
    if (query.xstateContext.confidence < 70) {
      recommendations.push({
        type: "ai-enhancement",
        priority: "medium",
        title: "Boost AI Confidence Scoring",
        description:
          "Current AI confidence is below optimal. Add validation rules and user feedback loops.",
        context7Source: "confidence-analysis",
        aiConfidence: 78,
        implementation: {
          component: "ConfidenceBooster",
          timeEstimate: "3-4 hours",
        },
        benefits: [
          "Higher AI accuracy",
          "Better recommendations",
          "Improved user trust",
        ],
        risks: ["Increased complexity"],
        relatedStates: ["caseDetails", "review"],
      });
    }

    return recommendations;
  }

  /**
   * Get Matrix UI performance recommendations
   */
  private async getMatrixUIPerformanceRecommendations(
    query: Context7Phase8Query,
  ): Promise<Partial<Phase8Recommendation>[]> {
    if (!query.matrixNodes || query.matrixNodes.length === 0) return [];

    const recommendations: Partial<Phase8Recommendation>[] = [];

    // Analyze matrix complexity
    const highComplexityNodes = query.matrixNodes.filter(
      (node) =>
        node.metadata?.priority === "critical" ||
        (node.metadata?.confidence && node.metadata.confidence > 90),
    );

    if (highComplexityNodes.length > 5) {
      recommendations.push({
        type: "performance-boost",
        priority: "high",
        title: "Optimize Matrix UI LOD System",
        description: `Detected ${highComplexityNodes.length} high-complexity nodes. Consider LOD optimization.`,
        context7Source: "matrix-performance",
        aiConfidence: 82,
        implementation: {
          component: "MatrixLODSystem",
          code: `
// Enhanced LOD with adaptive quality
const adaptiveLOD = {
  low: { vertexCount: 100, shaderComplexity: 'basic' },
  mid: { vertexCount: 500, shaderComplexity: 'standard' },
  high: { vertexCount: 1000, shaderComplexity: 'advanced' }
};`,
          timeEstimate: "4-6 hours",
        },
        benefits: [
          "60% performance improvement",
          "Smoother animations",
          "Better mobile experience",
        ],
        risks: ["Visual quality trade-offs"],
        relatedStates: ["review", "submitting"],
      });
    }

    return recommendations;
  }

  /**
   * Merge recommendations from different sources
   */
  private mergeRecommendations(
    ...sources: Partial<Phase8Recommendation>[][]
  ): Phase8Recommendation[] {
    const merged: Phase8Recommendation[] = [];
    let idCounter = 1;

    sources.forEach((source) => {
      source.forEach((rec) => {
        if (rec.title && rec.description) {
          merged.push({
            id: `rec-${idCounter++}`,
            type: rec.type || "ui-optimization",
            priority: rec.priority || "medium",
            title: rec.title,
            description: rec.description,
            context7Source: rec.context7Source || "unknown",
            aiConfidence: rec.aiConfidence || 50,
            implementation: rec.implementation || {},
            benefits: rec.benefits || [],
            risks: rec.risks || [],
            relatedStates: rec.relatedStates || [],
          });
        }
      });
    });

    return merged;
  }

  /**
   * Rerank recommendations using AI context
   */
  private async rerankRecommendations(
    recommendations: Phase8Recommendation[],
    query: Context7Phase8Query,
  ): Promise<Phase8Recommendation[]> {
    // Convert to rerank format
    const rerankInput: RerankResult[] = recommendations.map((rec) => ({
      id: rec.id,
      content: `${rec.title}: ${rec.description}`,
      metadata: {
        type: rec.type,
        priority: rec.priority,
        confidence: rec.aiConfidence,
        component: query.component,
      },
      originalScore: rec.aiConfidence / 100,
      rerankScore: 0,
      confidence: rec.aiConfidence,
    }));

    const userContext: UserContext = {
      intent: "review",
      timeOfDay: this.getTimeOfDay(),
      focusedElement: query.component,
      currentCase: "PHASE8_OPTIMIZATION",
      recentActions: ["analyze_component", "request_recommendations"],
      userRole: "admin",
      workflowState: query.currentState === "review" ? "review" : "draft",
    };

    try {
      // Try to use advanced reranking if available, otherwise use fallback
      let reranked = rerankInput;
      
      // Simple fallback reranking based on confidence scores
      reranked = rerankInput.map(item => ({
        ...item,
        rerankScore: item.confidence / 100,
      })).sort((a, b) => b.rerankScore - a.rerankScore);

      // Apply rerank scores back to recommendations
      return recommendations
        .map((rec) => {
          const rerankedItem = reranked.find((r) => r.id === rec.id);
          return {
            ...rec,
            aiConfidence: rerankedItem
              ? Math.round(rerankedItem.rerankScore * 100)
              : rec.aiConfidence,
          };
        })
        .sort((a, b) => b.aiConfidence - a.aiConfidence);
    } catch (error: any) {
      console.warn("Reranking failed, using original order:", error);
      return recommendations.sort((a, b) => b.aiConfidence - a.aiConfidence);
    }
  }

  /**
   * Helper functions
   */
  private buildRagQuery(query: Context7Phase8Query): string {
    let ragQuery = `${query.component} optimization`;

    if (query.context === "legal-ai") {
      ragQuery += " legal AI case management evidence";
    }

    if (query.xstateContext?.evidenceType) {
      ragQuery += ` ${query.xstateContext.evidenceType} evidence`;
    }

    if (query.currentState) {
      ragQuery += ` workflow state ${query.currentState}`;
    }

    return ragQuery;
  }

  private calculatePriorityFromScore(
    score: number,
  ): "critical" | "high" | "medium" | "low" {
    if (score > 0.9) return "critical";
    if (score > 0.7) return "high";
    if (score > 0.5) return "medium";
    return "low";
  }

  private extractBenefits(content: string): string[] {
    // Simple keyword extraction for benefits
    const benefitKeywords = [
      "improve",
      "optimize",
      "enhance",
      "faster",
      "better",
      "reduce",
      "increase",
    ];

    const benefits: string[] = [];
    benefitKeywords.forEach((keyword) => {
      if (content.toLowerCase().includes(keyword)) {
        benefits.push(`May ${keyword} system performance`);
      }
    });

    return benefits.slice(0, 3); // Limit to top 3
  }

  private getTimeOfDay(): "morning" | "afternoon" | "evening" | "night" {
    const hour = new Date().getHours();
    if (hour < 12) return "morning";
    if (hour < 17) return "afternoon";
    if (hour < 21) return "evening";
    return "night";
  }

  private getFallbackRecommendations(
    query: Context7Phase8Query,
  ): Phase8Recommendation[] {
    return [
      {
        id: "fallback-1",
        type: "ui-optimization",
        priority: "medium",
        title: "Basic Component Optimization",
        description: `Consider optimizing ${query.component} for better performance.`,
        context7Source: "fallback",
        aiConfidence: 60,
        implementation: {
          component: query.component,
          timeEstimate: "1-2 hours",
        },
        benefits: ["Improved performance"],
        risks: [],
        relatedStates: [],
      },
    ];
  }
}

// Convenience functions for common Context7 + Phase 8 queries
export const commonContext7Phase8Queries = {
  /**
   * Analyze Phase 8 component with legal AI context
   */
  analyzePhase8Component: (
    component: string,
    xstateContext?: LegalFormContext,
    currentState?: StateValue,
  ) => ({
    component,
    context: "legal-ai" as const,
    area: "performance" as const,
    xstateContext,
    currentState,
  }),

  /**
   * Get performance recommendations for Matrix UI
   */
  optimizeMatrixUI: (matrixNodes: MatrixUINode[]) => ({
    component: "MatrixUICompiler",
    context: "performance" as const,
    area: "performance" as const,
    matrixNodes,
  }),

  /**
   * Get workflow improvement suggestions
   */
  improveWorkflow: (
    xstateContext: LegalFormContext,
    currentState: StateValue,
  ) => ({
    component: "LegalFormMachine",
    context: "legal-ai" as const,
    area: "ui-ux" as const,
    xstateContext,
    currentState,
  }),

  /**
   * Get AI enhancement recommendations
   */
  enhanceAIFeatures: (component: string, requirements: string) => ({
    component,
    context: "legal-ai" as const,
    feature: "ai-enhancement",
    requirements,
  }),
};

// Export singleton instance
export const context7Phase8Integrator = new Context7Phase8Integrator();
;
export default Context7Phase8Integrator;