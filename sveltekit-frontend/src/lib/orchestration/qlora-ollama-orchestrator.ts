/**
 * QLoRA Ollama Orchestrator - Intelligent model selection and loading
 * Uses AutoGen/CrewAI patterns for multi-agent coordination
 * Integrates with Ollama for distilled model management
 */

import { qloraWasmLoader } from '$lib/wasm/qlora-wasm-loader';
import { predictiveAssetEngine } from '$lib/services/predictive-asset-engine';
import type { Gemma3LegalConfig } from '$lib/config/gemma3-legal-config';

// Agent Types for AutoGen-style orchestration
interface LegalAgent {
  id: string;
  role: 'router' | 'contract' | 'litigation' | 'compliance' | 'research' | 'synthesis';
  name: string;
  description: string;
  specialization: string[];
  modelPath: string;
  confidence: number;
  isActive: boolean;
}

// Query Analysis Result
interface QueryIntent {
  primaryDomain: 'contract' | 'litigation' | 'compliance' | 'research' | 'general';
  complexity: 'simple' | 'moderate' | 'complex' | 'expert';
  urgency: 'low' | 'medium' | 'high' | 'critical';
  requiredAgents: string[];
  suggestedWorkflow: string[];
  confidence: number;
}

// Orchestration Plan
interface OrchestrationPlan {
  queryId: string;
  intent: QueryIntent;
  selectedAgents: LegalAgent[];
  executionSteps: ExecutionStep[];
  expectedDuration: number;
  fallbackPlan?: OrchestrationPlan;
}

interface ExecutionStep {
  stepId: string;
  agentId: string;
  action: 'analyze' | 'research' | 'draft' | 'review' | 'synthesize';
  prompt: string;
  expectedOutput: string;
  dependencies: string[];
  timeout: number;
}

// Ollama Integration
interface OllamaModelInfo {
  name: string;
  size: number;
  digest: string;
  modified_at: string;
  details: {
    format: string;
    family: string;
    families: string[];
    parameter_size: string;
    quantization_level: string;
  };
}

export class QLoRAOllamaOrchestrator {
  private agents: Map<string, LegalAgent> = new Map();
  private activeModels: Map<string, string> = new Map(); // agentId -> modelKey
  private ollamaEndpoint: string;
  private distilledModelsPath: string;
  
  // CrewAI-style agent coordination
  private agentCrew: Map<string, LegalAgent[]> = new Map();
  private workflowHistory: Array<{
    queryId: string;
    intent: QueryIntent;
    agents: string[];
    success: boolean;
    duration: number;
    userFeedback?: number;
  }> = [];

  constructor(ollamaEndpoint = 'http://localhost:11434') {
    this.ollamaEndpoint = ollamaEndpoint;
    this.distilledModelsPath = '~/.ollama/models/distilled-qlora';
    this.initializeAgents();
    this.setupAgentCrews();
    
    console.log('🎭 QLoRA Ollama Orchestrator initialized with', this.agents.size, 'agents');
  }

  /**
   * Initialize specialized legal agents (AutoGen pattern)
   */
  private initializeAgents(): void {
    const agents: LegalAgent[] = [
      {
        id: 'router',
        role: 'router', 
        name: 'Query Router',
        description: 'Analyzes user queries and routes to appropriate specialists',
        specialization: ['intent_analysis', 'query_classification', 'workflow_planning'],
        modelPath: 'gemma3-legal-router-q4:latest',
        confidence: 0.95,
        isActive: true
      },
      {
        id: 'contract_specialist',
        role: 'contract',
        name: 'Contract Law Specialist',
        description: 'Expert in contract analysis, drafting, and review',
        specialization: ['contract_analysis', 'clause_review', 'risk_assessment', 'compliance_check'],
        modelPath: 'gemma3-legal-contract-q4:latest',
        confidence: 0.92,
        isActive: false
      },
      {
        id: 'litigation_specialist', 
        role: 'litigation',
        name: 'Litigation Specialist',
        description: 'Expert in case law, precedents, and litigation strategy',
        specialization: ['case_analysis', 'precedent_research', 'evidence_review', 'legal_strategy'],
        modelPath: 'gemma3-legal-litigation-q4:latest',
        confidence: 0.90,
        isActive: false
      },
      {
        id: 'compliance_specialist',
        role: 'compliance',
        name: 'Compliance Officer',
        description: 'Expert in regulatory compliance and corporate governance',
        specialization: ['regulatory_analysis', 'compliance_audit', 'policy_review', 'risk_management'],
        modelPath: 'gemma3-legal-compliance-q4:latest',
        confidence: 0.88,
        isActive: false
      },
      {
        id: 'research_specialist',
        role: 'research',
        name: 'Legal Researcher',
        description: 'Expert in legal research, citation analysis, and precedent discovery',
        specialization: ['legal_research', 'citation_analysis', 'precedent_discovery', 'jurisprudence'],
        modelPath: 'gemma3-legal-research-q4:latest',
        confidence: 0.85,
        isActive: false
      },
      {
        id: 'synthesis_specialist',
        role: 'synthesis',
        name: 'Legal Synthesizer',
        description: 'Combines insights from multiple agents into coherent recommendations',
        specialization: ['multi_source_synthesis', 'recommendation_generation', 'report_writing'],
        modelPath: 'gemma3-legal-synthesis-q4:latest',
        confidence: 0.87,
        isActive: false
      }
    ];

    agents.forEach(agent => {
      this.agents.set(agent.id, agent);
    });
  }

  /**
   * Setup agent crews for collaborative workflows (CrewAI pattern)
   */
  private setupAgentCrews(): void {
    // Contract Analysis Crew
    this.agentCrew.set('contract_analysis', [
      this.agents.get('router')!,
      this.agents.get('contract_specialist')!,
      this.agents.get('compliance_specialist')!,
      this.agents.get('synthesis_specialist')!
    ]);

    // Litigation Research Crew  
    this.agentCrew.set('litigation_research', [
      this.agents.get('router')!,
      this.agents.get('litigation_specialist')!,
      this.agents.get('research_specialist')!,
      this.agents.get('synthesis_specialist')!
    ]);

    // Comprehensive Legal Review Crew
    this.agentCrew.set('comprehensive_review', [
      this.agents.get('router')!,
      this.agents.get('contract_specialist')!,
      this.agents.get('litigation_specialist')!,
      this.agents.get('compliance_specialist')!,
      this.agents.get('research_specialist')!,
      this.agents.get('synthesis_specialist')!
    ]);

    console.log('👥 Agent crews configured:', Array.from(this.agentCrew.keys()));
  }

  /**
   * Analyze query and determine orchestration plan
   */
  async analyzeQuery(query: string, context: any = {}): Promise<OrchestrationPlan> {
    console.log('🔍 Analyzing query for orchestration...', query.substring(0, 100));

    // Ensure router agent is loaded
    await this.ensureAgentLoaded('router');

    // Use router agent to analyze intent
    const routerModel = this.activeModels.get('router');
    if (!routerModel) {
      throw new Error('Router agent not available');
    }

    const intentAnalysisPrompt = `
Analyze this legal query and provide structured intent classification:

Query: "${query}"
Context: ${JSON.stringify(context)}

Classify the query and respond with JSON:
{
  "primaryDomain": "contract|litigation|compliance|research|general",
  "complexity": "simple|moderate|complex|expert", 
  "urgency": "low|medium|high|critical",
  "requiredSkills": ["skill1", "skill2"],
  "suggestedWorkflow": ["step1", "step2"],
  "confidence": 0.0-1.0
}`;

    try {
      const analysis = await qloraWasmLoader.generateText(routerModel, intentAnalysisPrompt, {
        maxTokens: 256,
        temperature: 0.1
      });

      const intent = this.parseIntentFromResponse(analysis.text);
      const plan = await this.createOrchestrationPlan(query, intent);
      
      console.log('📋 Orchestration plan created:', {
        domain: intent.primaryDomain,
        agents: plan.selectedAgents.length,
        steps: plan.executionSteps.length
      });

      return plan;

    } catch (error) {
      console.error('❌ Query analysis failed:', error);
      return this.createFallbackPlan(query);
    }
  }

  /**
   * Execute orchestration plan with multi-agent coordination
   */
  async executeOrchestration(plan: OrchestrationPlan, onProgress?: (step: ExecutionStep, result: string) => void): Promise<{
    success: boolean;
    results: Map<string, string>;
    finalSynthesis: string;
    duration: number;
    metadata: any;
  }> {
    const startTime = performance.now();
    const results = new Map<string, string>();
    
    console.log('🚀 Executing orchestration plan:', plan.queryId);
    console.log(`   • ${plan.selectedAgents.length} agents selected`);
    console.log(`   • ${plan.executionSteps.length} steps planned`);

    try {
      // Ensure all required agents are loaded
      for (const agent of plan.selectedAgents) {
        await this.ensureAgentLoaded(agent.id);
      }

      // Execute steps in dependency order
      for (const step of plan.executionSteps) {
        console.log(`⚡ Executing step: ${step.stepId} (${step.agentId})`);
        
        const modelKey = this.activeModels.get(step.agentId);
        if (!modelKey) {
          throw new Error(`Agent ${step.agentId} not loaded`);
        }

        // Generate response using agent's specialized model
        const response = await qloraWasmLoader.generateText(modelKey, step.prompt, {
          maxTokens: 512,
          temperature: 0.2,
          streaming: false
        });

        results.set(step.stepId, response.text);
        
        if (onProgress) {
          onProgress(step, response.text);
        }

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Synthesize final results
      const finalSynthesis = await this.synthesizeResults(plan, results);
      
      const endTime = performance.now();
      const duration = endTime - startTime;

      // Record successful execution
      this.workflowHistory.push({
        queryId: plan.queryId,
        intent: plan.intent,
        agents: plan.selectedAgents.map(a => a.id),
        success: true,
        duration
      });

      console.log('✅ Orchestration completed successfully in', Math.round(duration), 'ms');

      return {
        success: true,
        results,
        finalSynthesis,
        duration,
        metadata: {
          agentsUsed: plan.selectedAgents.length,
          stepsExecuted: plan.executionSteps.length,
          avgStepTime: duration / plan.executionSteps.length
        }
      };

    } catch (error) {
      console.error('❌ Orchestration execution failed:', error);
      
      // Record failed execution
      this.workflowHistory.push({
        queryId: plan.queryId,
        intent: plan.intent,
        agents: plan.selectedAgents.map(a => a.id),
        success: false,
        duration: performance.now() - startTime
      });

      // Try fallback plan if available
      if (plan.fallbackPlan) {
        console.log('🔄 Attempting fallback plan...');
        return this.executeOrchestration(plan.fallbackPlan, onProgress);
      }

      throw error;
    }
  }

  /**
   * Ensure agent model is loaded in Ollama/WASM
   */
  private async ensureAgentLoaded(agentId: string): Promise<void> {
    if (this.activeModels.has(agentId)) {
      return; // Already loaded
    }

    const agent = this.agents.get(agentId);
    if (!agent) {
      throw new Error(`Agent not found: ${agentId}`);
    }

    console.log(`📦 Loading agent: ${agent.name} (${agent.modelPath})`);

    try {
      // First check if model exists in Ollama
      const ollamaModels = await this.listOllamaModels();
      const modelExists = ollamaModels.some(m => m.name === agent.modelPath);

      if (!modelExists) {
        console.log(`⬇️ Model ${agent.modelPath} not found, attempting to pull...`);
        await this.pullOllamaModel(agent.modelPath);
      }

      // Load model in WASM loader
      const modelKey = await qloraWasmLoader.loadDistilledModel({
        baseModel: {
          name: agent.modelPath,
          path: `${this.distilledModelsPath}/${agent.modelPath}`,
          size: 256, // Default distilled size
          contextLength: 2048,
          vocabulary: 32000
        },
        adapter: {
          name: `${agentId}-adapter`,
          path: `${this.distilledModelsPath}/${agentId}-adapter.bin`,
          rank: 16,
          alpha: 32,
          targetModules: ['q_proj', 'v_proj', 'k_proj', 'o_proj'],
          size: 8
        }
      });

      this.activeModels.set(agentId, modelKey);
      agent.isActive = true;

      console.log(`✅ Agent ${agent.name} loaded successfully`);

    } catch (error) {
      console.error(`❌ Failed to load agent ${agent.name}:`, error);
      throw error;
    }
  }

  /**
   * List available models in Ollama
   */
  private async listOllamaModels(): Promise<OllamaModelInfo[]> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status}`);
      }
      
      const data = await response.json();
      return data.models || [];
      
    } catch (error) {
      console.warn('⚠️ Could not connect to Ollama, using fallback:', error);
      return [];
    }
  }

  /**
   * Pull model from Ollama registry
   */
  private async pullOllamaModel(modelName: string): Promise<void> {
    try {
      const response = await fetch(`${this.ollamaEndpoint}/api/pull`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName })
      });

      if (!response.ok) {
        throw new Error(`Failed to pull model: ${response.status}`);
      }

      console.log(`📥 Model ${modelName} pulled successfully`);
      
    } catch (error) {
      console.error(`❌ Failed to pull model ${modelName}:`, error);
      throw error;
    }
  }

  /**
   * Parse intent from router agent response
   */
  private parseIntentFromResponse(response: string): QueryIntent {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          primaryDomain: parsed.primaryDomain || 'general',
          complexity: parsed.complexity || 'moderate',
          urgency: parsed.urgency || 'medium',
          requiredAgents: this.mapSkillsToAgents(parsed.requiredSkills || []),
          suggestedWorkflow: parsed.suggestedWorkflow || ['analyze', 'synthesize'],
          confidence: parsed.confidence || 0.7
        };
      }
    } catch (error) {
      console.warn('⚠️ Failed to parse intent JSON:', error);
    }

    // Fallback to heuristic analysis
    return this.heuristicIntentAnalysis(response);
  }

  /**
   * Create orchestration plan based on intent
   */
  private async createOrchestrationPlan(query: string, intent: QueryIntent): Promise<OrchestrationPlan> {
    const selectedAgents: LegalAgent[] = [];
    
    // Always include router
    selectedAgents.push(this.agents.get('router')!);
    
    // Add specialized agents based on domain
    switch (intent.primaryDomain) {
      case 'contract':
        selectedAgents.push(this.agents.get('contract_specialist')!);
        if (intent.complexity === 'complex' || intent.complexity === 'expert') {
          selectedAgents.push(this.agents.get('compliance_specialist')!);
        }
        break;
        
      case 'litigation':
        selectedAgents.push(this.agents.get('litigation_specialist')!);
        selectedAgents.push(this.agents.get('research_specialist')!);
        break;
        
      case 'compliance':
        selectedAgents.push(this.agents.get('compliance_specialist')!);
        break;
        
      case 'research':
        selectedAgents.push(this.agents.get('research_specialist')!);
        break;
        
      default:
        // For general queries, use multiple agents
        selectedAgents.push(this.agents.get('contract_specialist')!);
        selectedAgents.push(this.agents.get('research_specialist')!);
    }
    
    // Always add synthesis for multi-agent workflows
    if (selectedAgents.length > 2) {
      selectedAgents.push(this.agents.get('synthesis_specialist')!);
    }

    const executionSteps = this.createExecutionSteps(query, intent, selectedAgents);
    
    const plan: OrchestrationPlan = {
      queryId: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      intent,
      selectedAgents,
      executionSteps,
      expectedDuration: this.estimateExecutionTime(executionSteps),
      fallbackPlan: this.createFallbackPlan(query)
    };

    return plan;
  }

  /**
   * Synthesize results from multiple agents
   */
  private async synthesizeResults(plan: OrchestrationPlan, results: Map<string, string>): Promise<string> {
    const synthesisAgent = plan.selectedAgents.find(a => a.role === 'synthesis');
    
    if (!synthesisAgent || !this.activeModels.has(synthesisAgent.id)) {
      // Simple concatenation fallback
      return Array.from(results.values()).join('\n\n');
    }

    const synthesisPrompt = `
As a legal synthesis specialist, combine these expert analyses into a coherent, actionable response:

${Array.from(results.entries()).map(([step, result]) => `
${step.toUpperCase()}:
${result}
`).join('\n')}

Provide a comprehensive synthesis that:
1. Integrates all expert perspectives
2. Highlights key findings and recommendations  
3. Identifies any contradictions or gaps
4. Provides clear next steps

Synthesis:`;

    const modelKey = this.activeModels.get(synthesisAgent.id)!;
    const synthesis = await qloraWasmLoader.generateText(modelKey, synthesisPrompt, {
      maxTokens: 512,
      temperature: 0.2
    });

    return synthesis.text;
  }

  // ===============================
  // UTILITY METHODS
  // ===============================

  private mapSkillsToAgents(skills: string[]): string[] {
    const skillMapping: Record<string, string> = {
      'contract_analysis': 'contract_specialist',
      'case_analysis': 'litigation_specialist', 
      'compliance_audit': 'compliance_specialist',
      'legal_research': 'research_specialist'
    };
    
    return skills.map(skill => skillMapping[skill]).filter(Boolean);
  }

  private heuristicIntentAnalysis(text: string): QueryIntent {
    const lowerText = text.toLowerCase();
    
    let primaryDomain: QueryIntent['primaryDomain'] = 'general';
    if (lowerText.includes('contract') || lowerText.includes('agreement')) {
      primaryDomain = 'contract';
    } else if (lowerText.includes('case') || lowerText.includes('lawsuit')) {
      primaryDomain = 'litigation';
    } else if (lowerText.includes('compliance') || lowerText.includes('regulation')) {
      primaryDomain = 'compliance';
    } else if (lowerText.includes('research') || lowerText.includes('precedent')) {
      primaryDomain = 'research';
    }
    
    return {
      primaryDomain,
      complexity: 'moderate',
      urgency: 'medium',
      requiredAgents: [primaryDomain === 'general' ? 'contract_specialist' : `${primaryDomain}_specialist`],
      suggestedWorkflow: ['analyze', 'synthesize'],
      confidence: 0.6
    };
  }

  private createExecutionSteps(query: string, intent: QueryIntent, agents: LegalAgent[]): ExecutionStep[] {
    const steps: ExecutionStep[] = [];
    
    // Create steps for each specialized agent (skip router and synthesis)
    const workingAgents = agents.filter(a => a.role !== 'router' && a.role !== 'synthesis');
    
    workingAgents.forEach((agent, index) => {
      steps.push({
        stepId: `step_${index + 1}_${agent.role}`,
        agentId: agent.id,
        action: 'analyze',
        prompt: `As a ${agent.name}, analyze this legal query with your expertise in ${agent.specialization.join(', ')}:\n\n"${query}"\n\nProvide detailed analysis:`,
        expectedOutput: `${agent.role}_analysis`,
        dependencies: index === 0 ? [] : [`step_${index}_${workingAgents[index-1].role}`],
        timeout: 30000
      });
    });
    
    return steps;
  }

  private estimateExecutionTime(steps: ExecutionStep[]): number {
    return steps.length * 5000; // 5 seconds per step estimate
  }

  private createFallbackPlan(query: string): OrchestrationPlan {
    return {
      queryId: `fallback_${Date.now()}`,
      intent: {
        primaryDomain: 'general',
        complexity: 'simple',
        urgency: 'low',
        requiredAgents: ['router'],
        suggestedWorkflow: ['basic_analysis'],
        confidence: 0.5
      },
      selectedAgents: [this.agents.get('router')!],
      executionSteps: [{
        stepId: 'fallback_analysis',
        agentId: 'router',
        action: 'analyze',
        prompt: `Provide a basic legal analysis for: "${query}"`,
        expectedOutput: 'basic_analysis',
        dependencies: [],
        timeout: 15000
      }],
      expectedDuration: 15000
    };
  }

  /**
   * Get orchestrator performance statistics
   */
  getPerformanceStats() {
    const successfulRuns = this.workflowHistory.filter(h => h.success);
    const avgDuration = successfulRuns.length > 0 
      ? successfulRuns.reduce((sum, h) => sum + h.duration, 0) / successfulRuns.length 
      : 0;

    return {
      totalQueries: this.workflowHistory.length,
      successRate: successfulRuns.length / Math.max(this.workflowHistory.length, 1),
      averageDuration: avgDuration,
      activeAgents: Array.from(this.activeModels.keys()),
      agentLoadingTime: avgDuration * 0.3 // Estimate
    };
  }
}

// Export singleton instance
export const qloraOllamaOrchestrator = new QLoRAOllamaOrchestrator();