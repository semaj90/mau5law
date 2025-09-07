import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';
import { withSSRHandler, createSSRResponse, createSSRErrorResponse } from '$lib/server/api-ssr-helpers.js';

/*
 * Legal AI Orchestrator - Central API Router
 * Coordinates all legal AI services in end-to-end workflows
 * Handles complex multi-step operations with proper error handling and monitoring
 */

interface OrchestrationRequest {
  workflow: 'legal-research' | 'document-processing' | 'case-creation' | 'evidence-analysis';
  parameters: Record<string, any>;
  options?: {
    useGPU?: boolean;
    cacheResults?: boolean;
    priority?: 'low' | 'medium' | 'high';
    timeout?: number;
  };
}

interface OrchestrationResult {
  workflowId: string;
  workflow: string;
  status: 'processing' | 'completed' | 'failed';
  steps: WorkflowStep[];
  result?: any;
  error?: string;
  metrics: {
    totalTime: number;
    apiCalls: number;
    cacheHits: number;
    gpuAccelerated: boolean;
  };
}

interface WorkflowStep {
  name: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  result?: any;
  error?: string;
  duration: number;
  apiEndpoint: string;
}

// Workflow orchestration class
class LegalAIOrchestrator {
  private activeWorkflows = new Map<string, OrchestrationResult>();
  private stepExecutors = new Map<string, (params: any, options?: any) => Promise<any>>();

  constructor() {
    this.initializeStepExecutors();
  }

  private initializeStepExecutors() {
    // Legal research workflow steps
    this.stepExecutors.set('search-legal-documents', this.executeSearchLegalDocuments.bind(this));
    this.stepExecutors.set('analyze-precedents', this.executeAnalyzePrecedents.bind(this));
    this.stepExecutors.set('generate-research-summary', this.executeGenerateResearchSummary.bind(this));
    
    // Document processing workflow steps  
    this.stepExecutors.set('extract-document-entities', this.executeExtractDocumentEntities.bind(this));
    this.stepExecutors.set('analyze-document-content', this.executeAnalyzeDocumentContent.bind(this));
    this.stepExecutors.set('generate-document-summary', this.executeGenerateDocumentSummary.bind(this));
    
    // Case creation workflow steps
    this.stepExecutors.set('score-case-strength', this.executeScoreCaseStrength.bind(this));
    this.stepExecutors.set('suggest-research-topics', this.executeSuggestResearchTopics.bind(this));
    this.stepExecutors.set('create-case-timeline', this.executeCreateCaseTimeline.bind(this));
    
    // Evidence analysis workflow steps
    this.stepExecutors.set('process-evidence-metadata', this.executeProcessEvidenceMetadata.bind(this));
    this.stepExecutors.set('analyze-evidence-relevance', this.executeAnalyzeEvidenceRelevance.bind(this));
    this.stepExecutors.set('generate-evidence-report', this.executeGenerateEvidenceReport.bind(this));
  }

  async executeWorkflow(request: OrchestrationRequest): Promise<OrchestrationResult> {
    const workflowId = this.generateWorkflowId();
    const startTime = Date.now();
    
    const result: OrchestrationResult = {
      workflowId,
      workflow: request.workflow,
      status: 'processing',
      steps: [],
      metrics: {
        totalTime: 0,
        apiCalls: 0,
        cacheHits: 0,
        gpuAccelerated: request.options?.useGPU || false
      }
    };

    this.activeWorkflows.set(workflowId, result);

    try {
      const workflowSteps = this.getWorkflowSteps(request.workflow);
      
      for (const stepConfig of workflowSteps) {
        const step: WorkflowStep = {
          name: stepConfig.name,
          status: 'processing',
          duration: 0,
          apiEndpoint: stepConfig.endpoint
        };
        
        result.steps.push(step);
        result.metrics.apiCalls++;

        const stepStartTime = Date.now();
        
        try {
          const executor = this.stepExecutors.get(stepConfig.name);
          if (!executor) {
            throw new Error(`No executor found for step: ${stepConfig.name}`);
          }

          step.result = await executor(
            { ...request.parameters, previousResults: this.getPreviousResults(result.steps) },
            request.options
          );
          step.status = 'completed';
          
        } catch (error) {
          step.status = 'failed';
          step.error = error instanceof Error ? error.message : String(error);
          result.status = 'failed';
          result.error = `Workflow failed at step: ${stepConfig.name}`;
          break;
        }
        
        step.duration = Date.now() - stepStartTime;
      }

      if (result.status !== 'failed') {
        result.status = 'completed';
        result.result = this.aggregateWorkflowResults(result.steps, request.workflow);
      }

    } catch (error) {
      result.status = 'failed';
      result.error = error instanceof Error ? error.message : String(error);
    }

    result.metrics.totalTime = Date.now() - startTime;
    this.activeWorkflows.set(workflowId, result);
    
    return result;
  }

  // Step executor implementations
  private async executeSearchLegalDocuments(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/enhanced-legal-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.query,
        jurisdiction: params.jurisdiction,
        maxResults: params.maxResults || 20,
        useAI: true
      })
    });

    if (!response.ok) {
      throw new Error(`Search failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeAnalyzePrecedents(params: any, options?: any): Promise<any> {
    const searchResults = params.previousResults?.find((r: any) => r?.results)?.results || [];
    
    const response = await fetch('/api/ai/legal-research', {
      method: 'POST', 
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: params.query,
        jurisdiction: params.jurisdiction,
        sources: ['cases', 'statutes'],
        includeAnalysis: true,
        userRole: params.userRole
      })
    });

    if (!response.ok) {
      throw new Error(`Precedent analysis failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeGenerateResearchSummary(params: any, options?: any): Promise<any> {
    const precedentData = params.previousResults?.find((r: any) => r?.analysis)?.analysis || '';
    
    const response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message: `Generate a comprehensive legal research summary for: ${params.query}. Include key findings, precedents, and strategic recommendations based on the following analysis: ${precedentData.substring(0, 2000)}`,
        model: 'gemma3-legal:latest',
        temperature: 0.3
      })
    });

    if (!response.ok) {
      throw new Error(`Summary generation failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeExtractDocumentEntities(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/analyze-evidence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: params.content,
        documentType: params.documentType || 'legal_document',
        extractEntities: true,
        includeKeyTerms: true
      })
    });

    if (!response.ok) {
      throw new Error(`Entity extraction failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeAnalyzeDocumentContent(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: params.content,
        analysisType: 'legal_document',
        includeMetadata: true
      })
    });

    if (!response.ok) {
      throw new Error(`Document analysis failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeGenerateDocumentSummary(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: params.content,
        maxLength: 500,
        includeKeyPoints: true,
        legalFocus: true
      })
    });

    if (!response.ok) {
      throw new Error(`Document summarization failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeScoreCaseStrength(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/case-scoring', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        caseTitle: params.title,
        description: params.description,
        caseType: params.caseType,
        jurisdiction: params.jurisdiction
      })
    });

    if (!response.ok) {
      throw new Error(`Case scoring failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeSuggestResearchTopics(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/suggestions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        context: `New ${params.caseType} case: ${params.title}. ${params.description}`,
        suggestionType: 'research',
        maxSuggestions: 10
      })
    });

    if (!response.ok) {
      throw new Error(`Research suggestions failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeCreateCaseTimeline(params: any, options?: any): Promise<any> {
    // This would typically integrate with a calendar/timeline service
    const timeline = {
      milestones: [
        { name: 'Case Created', date: new Date(), type: 'created' },
        { name: 'Initial Research Due', date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), type: 'deadline' },
        { name: 'Discovery Phase', date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), type: 'phase' }
      ],
      generated: new Date()
    };

    return timeline;
  }

  private async executeProcessEvidenceMetadata(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/storage/evidence-metadata', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        evidenceId: params.evidenceId,
        metadata: params.metadata,
        extractAdditional: true
      })
    });

    if (!response.ok) {
      throw new Error(`Evidence metadata processing failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeAnalyzeEvidenceRelevance(params: any, options?: any): Promise<any> {
    const response = await fetch('/api/ai/evidence-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query: params.caseContext || params.title,
        evidenceItems: [params.evidenceId],
        analysisDepth: 'comprehensive'
      })
    });

    if (!response.ok) {
      throw new Error(`Evidence relevance analysis failed: ${response.status}`);
    }

    return await response.json();
  }

  private async executeGenerateEvidenceReport(params: any, options?: any): Promise<any> {
    const relevanceData = params.previousResults?.find((r: any) => r?.relevanceScore)?.relevanceScore || 0.5;
    
    const response = await fetch('/api/ai/generate-report', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        reportType: 'evidence_analysis',
        evidenceId: params.evidenceId,
        relevanceScore: relevanceData,
        includeRecommendations: true
      })
    });

    if (!response.ok) {
      throw new Error(`Evidence report generation failed: ${response.status}`);
    }

    return await response.json();
  }

  // Helper methods
  private getWorkflowSteps(workflow: string) {
    const workflows = {
      'legal-research': [
        { name: 'search-legal-documents', endpoint: '/api/ai/enhanced-legal-search' },
        { name: 'analyze-precedents', endpoint: '/api/ai/legal-research' },
        { name: 'generate-research-summary', endpoint: '/api/ai/chat' }
      ],
      'document-processing': [
        { name: 'extract-document-entities', endpoint: '/api/ai/analyze-evidence' },
        { name: 'analyze-document-content', endpoint: '/api/ai/analyze' },
        { name: 'generate-document-summary', endpoint: '/api/ai/summarize' }
      ],
      'case-creation': [
        { name: 'score-case-strength', endpoint: '/api/ai/case-scoring' },
        { name: 'suggest-research-topics', endpoint: '/api/ai/suggestions' },
        { name: 'create-case-timeline', endpoint: 'internal' }
      ],
      'evidence-analysis': [
        { name: 'process-evidence-metadata', endpoint: '/api/storage/evidence-metadata' },
        { name: 'analyze-evidence-relevance', endpoint: '/api/ai/evidence-search' },
        { name: 'generate-evidence-report', endpoint: '/api/ai/generate-report' }
      ]
    };

    return workflows[workflow] || [];
  }

  private getPreviousResults(steps: WorkflowStep[]): any[] {
    return steps
      .filter(step => step.status === 'completed' && step.result)
      .map(step => step.result);
  }

  private aggregateWorkflowResults(steps: WorkflowStep[], workflow: string): any {
    const results = this.getPreviousResults(steps);
    const baseResult = {
      workflow,
      completedSteps: steps.filter(s => s.status === 'completed').length,
      totalSteps: steps.length,
      timestamp: new Date()
    };

    switch (workflow) {
      case 'legal-research':
        return {
          ...baseResult,
          searchResults: results[0]?.results || [],
          precedentAnalysis: results[1]?.analysis || '',
          summary: results[2]?.response || '',
          recommendations: results[1]?.recommendations || []
        };

      case 'document-processing':
        return {
          ...baseResult,
          entities: results[0]?.entities || [],
          analysis: results[1]?.analysis || {},
          summary: results[2]?.summary || '',
          keyTerms: results[2]?.keyTerms || []
        };

      case 'case-creation':
        return {
          ...baseResult,
          caseScore: results[0]?.score || 0,
          researchSuggestions: results[1]?.suggestions || [],
          timeline: results[2] || {}
        };

      case 'evidence-analysis':
        return {
          ...baseResult,
          metadata: results[0] || {},
          relevanceAnalysis: results[1] || {},
          report: results[2]?.report || ''
        };

      default:
        return { ...baseResult, results };
    }
  }

  private generateWorkflowId(): string {
    return `workflow_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  getWorkflowStatus(workflowId: string): OrchestrationResult | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  listActiveWorkflows(): OrchestrationResult[] {
    return Array.from(this.activeWorkflows.values()).filter(w => w.status === 'processing');
  }
}

// Global orchestrator instance
const orchestrator = new LegalAIOrchestrator();

// API handlers
export const POST: RequestHandler = withSSRHandler(async ({ request }) => {
  const requestData: OrchestrationRequest = await request.json();

  // Validate request
  if (!requestData.workflow || !requestData.parameters) {
    return createSSRErrorResponse('Missing required fields: workflow and parameters', 400);
  }

  const validWorkflows = ['legal-research', 'document-processing', 'case-creation', 'evidence-analysis'];
  if (!validWorkflows.includes(requestData.workflow)) {
    return createSSRErrorResponse(`Invalid workflow. Must be one of: ${validWorkflows.join(', ')}`, 400);
  }

  try {
    const result = await orchestrator.executeWorkflow(requestData);
    return createSSRResponse(result, {
      gpuAccelerated: requestData.options?.useGPU,
      cacheKey: requestData.options?.cacheResults ? `orchestrator_${result.workflowId}` : undefined
    });
  } catch (error) {
    return createSSRErrorResponse(
      `Orchestration failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      500
    );
  }
}, {
  gpuAccelerated: true,
  cacheKey: (event) => {
    const url = new URL(event.request.url);
    return `orchestrator_${url.searchParams.get('workflow')}_${Date.now()}`;
  }
});

export const GET: RequestHandler = withSSRHandler(async ({ url }) => {
  const workflowId = url.searchParams.get('workflowId');
  
  if (workflowId) {
    const workflow = orchestrator.getWorkflowStatus(workflowId);
    if (!workflow) {
      return createSSRErrorResponse('Workflow not found', 404);
    }
    return createSSRResponse(workflow);
  }

  // List active workflows
  const activeWorkflows = orchestrator.listActiveWorkflows();
  return createSSRResponse({
    activeWorkflows,
    total: activeWorkflows.length,
    timestamp: new Date().toISOString()
  });
});

// Health check
export const OPTIONS: RequestHandler = withSSRHandler(async () => {
  return createSSRResponse({
    service: 'legal-ai-orchestrator',
    status: 'healthy',
    supportedWorkflows: ['legal-research', 'document-processing', 'case-creation', 'evidence-analysis'],
    features: [
      'Multi-step workflow orchestration',
      'GPU acceleration support', 
      'Result caching',
      'Error recovery',
      'Progress tracking'
    ],
    version: '1.0.0'
  });
});