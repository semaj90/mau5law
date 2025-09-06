
// CrewAI Legal Team Integration
// Orchestrated multi-agent workflows for legal case management

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  goal: string;
  backstory: string;
  tools: string[];
  maxExecutionTime: number;
  memoryEnabled: boolean;
  verboseMode: boolean;
}

export interface Task {
  id: string;
  description: string;
  expectedOutput: string;
  assignedAgent: string;
  dependencies: string[];
  priority: "low" | "medium" | "high" | "critical";
  estimatedDuration: number;
  context?: Record<string, any>;
}

export interface CrewConfig {
  name: string;
  members: CrewMember[];
  tasks: Task[];
  process: "sequential" | "hierarchical" | "consensus";
  verbose: boolean;
  memorySystem: boolean;
  maxIterations: number;
}

export interface WorkflowResult {
  crewId: string;
  workflowName: string;
  status: "completed" | "failed" | "partial";
  results: Array<{
    taskId: string;
    agentId: string;
    output: string;
    executionTime: number;
    confidence: number;
  }>;
  finalDeliverable: string;
  totalTime: number;
  insights: string[];
  recommendations: string[];
}

class CrewAILegalTeam {
  private crews: Map<string, CrewConfig>;
  private activeWorkflows: Map<string, Promise<WorkflowResult>>;
  private aiEndpoint: string;

  constructor(config: { aiEndpoint?: string } = {}) {
    this.aiEndpoint = config.aiEndpoint || "http://localhost:11434";
    this.crews = new Map();
    this.activeWorkflows = new Map();
    this.initializeLegalCrews();
  }

  private initializeLegalCrews() {
    // Case Investigation Crew
    this.crews.set("case_investigation", {
      name: "Case Investigation Team",
      process: "sequential",
      verbose: true,
      memorySystem: true,
      maxIterations: 3,
      members: [
        {
          id: "lead_investigator",
          name: "Lead Case Investigator",
          role: "Lead Investigator",
          goal: "Thoroughly investigate case facts and coordinate evidence gathering",
          backstory:
            "Veteran investigator with 15+ years experience in complex criminal cases. Expert in evidence analysis and case theory development.",
          tools: ["evidence_analyzer", "database_search", "timeline_builder"],
          maxExecutionTime: 300000, // 5 minutes
          memoryEnabled: true,
          verboseMode: true,
        },
        {
          id: "evidence_analyst",
          name: "Digital Evidence Analyst",
          role: "Evidence Specialist",
          goal: "Analyze digital and physical evidence for admissibility and relevance",
          backstory:
            "Certified digital forensics expert with extensive court testimony experience. Specializes in evidence authentication and chain of custody.",
          tools: [
            "forensics_tools",
            "metadata_analyzer",
            "authenticity_checker",
          ],
          maxExecutionTime: 240000, // 4 minutes
          memoryEnabled: true,
          verboseMode: false,
        },
        {
          id: "legal_researcher",
          name: "Legal Research Specialist",
          role: "Research Analyst",
          goal: "Identify relevant case law, statutes, and legal precedents",
          backstory:
            "Law librarian turned legal tech specialist. Expert in legal research and citation analysis with access to comprehensive legal databases.",
          tools: ["legal_database", "citation_checker", "precedent_analyzer"],
          maxExecutionTime: 180000, // 3 minutes
          memoryEnabled: true,
          verboseMode: false,
        },
      ],
      tasks: [
        {
          id: "initial_case_review",
          description:
            "Conduct comprehensive initial case review and evidence inventory",
          expectedOutput:
            "Detailed case summary with evidence catalog and initial assessment",
          assignedAgent: "lead_investigator",
          dependencies: [],
          priority: "critical",
          estimatedDuration: 120000,
          context: {},
        },
        {
          id: "evidence_analysis",
          description:
            "Analyze all evidence for admissibility, authenticity, and relevance",
          expectedOutput:
            "Evidence analysis report with admissibility recommendations",
          assignedAgent: "evidence_analyst",
          dependencies: ["initial_case_review"],
          priority: "high",
          estimatedDuration: 180000,
          context: {},
        },
        {
          id: "legal_research",
          description:
            "Research applicable laws, precedents, and procedural requirements",
          expectedOutput:
            "Legal research memo with case law analysis and procedural checklist",
          assignedAgent: "legal_researcher",
          dependencies: ["initial_case_review"],
          priority: "high",
          estimatedDuration: 150000,
          context: {},
        },
      ],
    });

    // Trial Preparation Crew
    this.crews.set("trial_preparation", {
      name: "Trial Preparation Team",
      process: "hierarchical",
      verbose: true,
      memorySystem: true,
      maxIterations: 2,
      members: [
        {
          id: "trial_attorney",
          name: "Lead Trial Attorney",
          role: "Trial Strategist",
          goal: "Develop comprehensive trial strategy and coordinate team efforts",
          backstory:
            "Senior prosecutor with 20+ years trial experience. Expert in jury psychology, case presentation, and courtroom strategy.",
          tools: ["strategy_planner", "jury_analyzer", "presentation_builder"],
          maxExecutionTime: 360000, // 6 minutes
          memoryEnabled: true,
          verboseMode: true,
        },
        {
          id: "witness_coordinator",
          name: "Witness Preparation Specialist",
          role: "Witness Coordinator",
          goal: "Prepare witnesses and coordinate testimony scheduling",
          backstory:
            "Former victim advocate with expertise in witness preparation and trauma-informed interviewing techniques.",
          tools: ["witness_prep", "scheduling_system", "testimony_analyzer"],
          maxExecutionTime: 180000, // 3 minutes
          memoryEnabled: true,
          verboseMode: false,
        },
        {
          id: "exhibit_specialist",
          name: "Exhibit and Technology Specialist",
          role: "Exhibit Manager",
          goal: "Organize exhibits and prepare courtroom technology",
          backstory:
            "Courtroom technology specialist with experience in multimedia presentations and evidence display systems.",
          tools: ["exhibit_organizer", "tech_setup", "presentation_tools"],
          maxExecutionTime: 120000, // 2 minutes
          memoryEnabled: false,
          verboseMode: false,
        },
      ],
      tasks: [
        {
          id: "trial_strategy",
          description:
            "Develop comprehensive trial strategy based on case evidence and research",
          expectedOutput:
            "Detailed trial strategy document with timeline and key arguments",
          assignedAgent: "trial_attorney",
          dependencies: [],
          priority: "critical",
          estimatedDuration: 240000,
          context: {},
        },
        {
          id: "witness_preparation",
          description: "Prepare witness list and testimony coordination plan",
          expectedOutput:
            "Witness preparation plan with testimony summaries and scheduling",
          assignedAgent: "witness_coordinator",
          dependencies: ["trial_strategy"],
          priority: "high",
          estimatedDuration: 120000,
          context: {},
        },
        {
          id: "exhibit_organization",
          description:
            "Organize exhibits and prepare courtroom technology setup",
          expectedOutput:
            "Exhibit list with technology requirements and setup procedures",
          assignedAgent: "exhibit_specialist",
          dependencies: ["trial_strategy"],
          priority: "medium",
          estimatedDuration: 90000,
          context: {},
        },
      ],
    });

    // Appeal Analysis Crew
    this.crews.set("appeal_analysis", {
      name: "Appeal Analysis Team",
      process: "consensus",
      verbose: false,
      memorySystem: true,
      maxIterations: 4,
      members: [
        {
          id: "appellate_attorney",
          name: "Appellate Attorney",
          role: "Appeal Specialist",
          goal: "Analyze case for potential appeal issues and develop response strategies",
          backstory:
            "Appellate specialist with expertise in constitutional law and procedural analysis. Expert in identifying and addressing appeal-worthy issues.",
          tools: [
            "appeal_analyzer",
            "constitutional_checker",
            "precedent_mapper",
          ],
          maxExecutionTime: 300000, // 5 minutes
          memoryEnabled: true,
          verboseMode: true,
        },
        {
          id: "procedural_reviewer",
          name: "Procedural Review Specialist",
          role: "Procedure Analyst",
          goal: "Review case procedures for compliance and identify potential procedural issues",
          backstory:
            "Former court clerk with extensive knowledge of criminal procedure and administrative requirements.",
          tools: [
            "procedure_checker",
            "deadline_tracker",
            "compliance_auditor",
          ],
          maxExecutionTime: 180000, // 3 minutes
          memoryEnabled: true,
          verboseMode: false,
        },
      ],
      tasks: [
        {
          id: "appeal_vulnerability_analysis",
          description:
            "Analyze case for potential appeal vulnerabilities and issues",
          expectedOutput:
            "Appeal vulnerability report with risk assessment and mitigation strategies",
          assignedAgent: "appellate_attorney",
          dependencies: [],
          priority: "high",
          estimatedDuration: 180000,
          context: {},
        },
        {
          id: "procedural_compliance_review",
          description:
            "Review all case procedures for compliance with legal requirements",
          expectedOutput:
            "Procedural compliance report with any issues identified and corrections needed",
          assignedAgent: "procedural_reviewer",
          dependencies: [],
          priority: "high",
          estimatedDuration: 120000,
          context: {},
        },
      ],
    });
  }

  async executeWorkflow(
    crewName: string,
    context: Record<string, any>,
    priority: "low" | "medium" | "high" | "critical" = "medium",
  ): Promise<WorkflowResult> {
    const workflowId = `${crewName}_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const startTime = Date.now();

    try {
      const crew = this.crews.get(crewName);
      if (!crew) {
        throw new Error(`Crew '${crewName}' not found`);
      }

      // Create workflow promise with proper typing
      const workflowPromise = this.runCrewWorkflow(
        crew,
        context,
        workflowId,
      ).then((result) => ({
        ...result,
        crewId: workflowId,
        workflowName: crewName,
        totalTime: Date.now() - startTime,
      }));
      this.activeWorkflows.set(workflowId, workflowPromise);

      const result = await workflowPromise;
      this.activeWorkflows.delete(workflowId);

      return result;
    } catch (error: any) {
      this.activeWorkflows.delete(workflowId);
      console.error(`Workflow ${workflowId} failed:`, error);
      throw error;
    }
  }

  private async runCrewWorkflow(
    crew: CrewConfig,
    context: Record<string, any>,
    workflowId: string,
  ): Promise<Omit<WorkflowResult, "crewId" | "workflowName" | "totalTime">> {
    const results: WorkflowResult["results"] = [];
    const insights: string[] = [];
    const recommendations: string[] = [];

    try {
      // Execute tasks based on crew process type
      switch (crew.process) {
        case "sequential":
          await this.executeSequentialTasks(crew, context, results);
          break;
        case "hierarchical":
          await this.executeHierarchicalTasks(crew, context, results);
          break;
        case "consensus":
          await this.executeConsensusTasks(crew, context, results);
          break;
      }

      // Generate final deliverable by combining all results
      const finalDeliverable = await this.synthesizeResults(
        crew,
        results,
        context,
      );

      // Extract insights and recommendations
      for (const result of results) {
        insights.push(...this.extractInsights(result.output));
        recommendations.push(...this.extractRecommendations(result.output));
      }

      return {
        status: "completed",
        results,
        finalDeliverable,
        insights: [...new Set(insights)], // Remove duplicates
        recommendations: [...new Set(recommendations)], // Remove duplicates
      };
    } catch (error: any) {
      console.error(`Crew workflow failed:`, error);
      return {
        status: "failed",
        results,
        finalDeliverable: `Workflow failed: ${error}`,
        insights,
        recommendations,
      };
    }
  }

  private async executeSequentialTasks(
    crew: CrewConfig,
    context: Record<string, any>,
    results: WorkflowResult["results"],
  ): Promise<void> {
    // Sort tasks by dependencies and priority
    const sortedTasks = this.sortTasksByDependencies(crew.tasks);

    for (const task of sortedTasks) {
      const agent = crew.members.find((m) => m.id === task.assignedAgent);
      if (!agent) {
        throw new Error(
          `Agent ${task.assignedAgent} not found for task ${task.id}`,
        );
      }

      const startTime = Date.now();

      // Build task context including previous results
      const taskContext = {
        ...context,
        previousResults: results.map((r) => ({
          taskId: r.taskId,
          output: r.output,
        })),
        task: task,
      };

      const output = await this.executeAgentTask(agent, task, taskContext);
      const executionTime = Date.now() - startTime;

      results.push({
        taskId: task.id,
        agentId: agent.id,
        output,
        executionTime,
        confidence: this.calculateConfidence(
          output,
          executionTime,
          task.estimatedDuration,
        ),
      });
    }
  }

  private async executeHierarchicalTasks(
    crew: CrewConfig,
    context: Record<string, any>,
    results: WorkflowResult["results"],
  ): Promise<void> {
    // Find manager (first agent) and subordinates
    const manager = crew.members[0];
    const subordinates = crew.members.slice(1);

    // Manager creates work plan
    const planningTask: Task = {
      id: "work_planning",
      description:
        "Create detailed work plan and task assignments for the team",
      expectedOutput:
        "Comprehensive work plan with task assignments and priorities",
      assignedAgent: manager.id,
      dependencies: [],
      priority: "critical",
      estimatedDuration: 60000,
    };

    const workPlan = await this.executeAgentTask(
      manager,
      planningTask,
      context,
    );

    // Execute subordinate tasks in parallel
    const subordinateTasks = crew.tasks.filter(
      (t) => t.assignedAgent !== manager.id,
    );
    const taskPromises = subordinateTasks.map(async (task) => {
      const agent = subordinates.find((a) => a.id === task.assignedAgent);
      if (!agent) return null;

      const startTime = Date.now();
      const taskContext = { ...context, workPlan, task };
      const output = await this.executeAgentTask(agent, task, taskContext);

      return {
        taskId: task.id,
        agentId: agent.id,
        output,
        executionTime: Date.now() - startTime,
        confidence: this.calculateConfidence(
          output,
          Date.now() - startTime,
          task.estimatedDuration,
        ),
      };
    });

    const subordinateResults = (await Promise.all(taskPromises)).filter(
      (r) => r !== null,
    );
    results.push(...(subordinateResults as WorkflowResult["results"]));

    // Manager reviews and synthesizes
    const reviewTask: Task = {
      id: "final_review",
      description: "Review team outputs and provide final synthesis",
      expectedOutput: "Final integrated analysis with quality review",
      assignedAgent: manager.id,
      dependencies: subordinateTasks.map((t) => t.id),
      priority: "critical",
      estimatedDuration: 90000,
    };

    const finalReview = await this.executeAgentTask(manager, reviewTask, {
      ...context,
      subordinateResults: subordinateResults,
    });

    results.push({
      taskId: reviewTask.id,
      agentId: manager.id,
      output: finalReview,
      executionTime: Date.now() - Date.now(),
      confidence: 0.9,
    });
  }

  private async executeConsensusTasks(
    crew: CrewConfig,
    context: Record<string, any>,
    results: WorkflowResult["results"],
  ): Promise<void> {
    // All agents work on the same tasks and reach consensus
    for (const task of crew.tasks) {
      const agentOutputs: Array<{
        agentId: string;
        output: string;
        confidence: number;
      }> = [];

      // Get output from each agent
      for (const agent of crew.members) {
        const startTime = Date.now();
        const output = await this.executeAgentTask(agent, task, context);
        const executionTime = Date.now() - startTime;
        const confidence = this.calculateConfidence(
          output,
          executionTime,
          task.estimatedDuration,
        );

        agentOutputs.push({ agentId: agent.id, output, confidence });
      }

      // Reach consensus (use highest confidence output as base, incorporate others)
      const bestOutput = agentOutputs.reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
      );

      const consensusOutput = await this.buildConsensus(
        agentOutputs,
        task,
        context,
      );

      results.push({
        taskId: task.id,
        agentId: "consensus",
        output: consensusOutput,
        executionTime: 0,
        confidence:
          agentOutputs.reduce((sum, out) => sum + out.confidence, 0) /
          agentOutputs.length,
      });
    }
  }

  private async executeAgentTask(
    agent: CrewMember,
    task: Task,
    context: Record<string, any>,
  ): Promise<string> {
    const prompt = this.buildAgentPrompt(agent, task, context);

    try {
      const response = await fetch(`${this.aiEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3-legal",
          prompt,
          stream: false,
          options: {
            temperature: 0.3,
            num_predict: 2048,
            num_ctx: 8192,
            gpu_layers: -1, // Use GPU acceleration
            repeat_penalty: 1.1,
          },
        }),
      });

      if (!response.ok) {
        throw new Error(`AI request failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      console.error(`Agent ${agent.id} task execution failed:`, error);
      throw error;
    }
  }

  private buildAgentPrompt(
    agent: CrewMember,
    task: Task,
    context: Record<string, any>,
  ): string {
    return `You are ${agent.name}, a ${agent.role}.

GOAL: ${agent.goal}

BACKSTORY: ${agent.backstory}

CURRENT TASK: ${task.description}

EXPECTED OUTPUT: ${task.expectedOutput}

CONTEXT:
${JSON.stringify(context, null, 2)}

AVAILABLE TOOLS: ${agent.tools.join(", ")}

Please complete this task according to your role and expertise. Provide detailed, actionable output that meets the expected deliverable. Be thorough but concise.

Your response:`;
  }

  private async synthesizeResults(
    crew: CrewConfig,
    results: WorkflowResult["results"],
    context: Record<string, any>,
  ): Promise<string> {
    const synthesisPrompt = `As a legal team coordinator, synthesize the following team outputs into a comprehensive final deliverable:

CREW: ${crew.name}
CONTEXT: ${JSON.stringify(context, null, 2)}

TEAM OUTPUTS:
${results
  .map(
    (r) => `
${r.agentId} (${r.taskId}):
${r.output}
---
`,
  )
  .join("\n")}

Please provide a comprehensive synthesis that:
1. Integrates all team findings
2. Identifies key insights and patterns
3. Provides clear recommendations
4. Highlights any concerns or risks
5. Suggests next steps

Final synthesis:`;

    try {
      const response = await fetch(`${this.aiEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3-legal",
          prompt: synthesisPrompt,
          stream: false,
          options: {
            temperature: 0.2,
            num_predict: 3072,
            num_ctx: 16384,
            gpu_layers: -1,
          },
        }),
      });

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      console.error("Synthesis failed:", error);
      return `Synthesis failed: ${error}. Individual results available above.`;
    }
  }

  private sortTasksByDependencies(tasks: Task[]): Task[] {
    const sorted: Task[] = [];
    const remaining = [...tasks];

    while (remaining.length > 0) {
      const canExecute = remaining.filter((task) =>
        task.dependencies.every((dep) => sorted.some((s) => s.id === dep)),
      );

      if (canExecute.length === 0) {
        // Circular dependency or missing dependency
        console.warn(
          "Circular dependency detected, executing remaining tasks anyway",
        );
        sorted.push(...remaining);
        break;
      }

      // Sort by priority within executable tasks
      canExecute.sort((a, b) => {
        const priorityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        return priorityOrder[b.priority] - priorityOrder[a.priority];
      });

      const next = canExecute[0];
      sorted.push(next);
      remaining.splice(remaining.indexOf(next), 1);
    }

    return sorted;
  }

  private async buildConsensus(
    agentOutputs: Array<{
      agentId: string;
      output: string;
      confidence: number;
    }>,
    task: Task,
    context: Record<string, any>,
  ): Promise<string> {
    const consensusPrompt = `Build consensus from the following agent outputs for task: ${task.description}

AGENT OUTPUTS:
${agentOutputs
  .map(
    (out) => `
Agent ${out.agentId} (Confidence: ${out.confidence}):
${out.output}
---
`,
  )
  .join("\n")}

Please create a consensus output that:
1. Incorporates the best elements from each agent
2. Resolves any conflicts or contradictions
3. Maintains high quality and accuracy
4. Reflects the collective expertise

Consensus output:`;

    try {
      const response = await fetch(`${this.aiEndpoint}/api/generate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "gemma3-legal",
          prompt: consensusPrompt,
          stream: false,
          options: {
            temperature: 0.25,
            num_predict: 2048,
            gpu_layers: -1,
          },
        }),
      });

      const data = await response.json();
      return data.response;
    } catch (error: any) {
      console.error("Consensus building failed:", error);
      // Fallback to highest confidence output
      return agentOutputs.reduce((best, current) =>
        current.confidence > best.confidence ? current : best,
      ).output;
    }
  }

  private calculateConfidence(
    output: string,
    actualTime: number,
    estimatedTime: number,
  ): number {
    let confidence = 0.5; // Base confidence

    // Adjust based on output length and completeness
    if (output.length > 500) confidence += 0.2;
    if (output.length > 1000) confidence += 0.1;

    // Adjust based on timing
    const timeRatio = actualTime / estimatedTime;
    if (timeRatio > 0.5 && timeRatio < 1.5) confidence += 0.15; // Good timing
    if (timeRatio > 2) confidence -= 0.1; // Too slow

    // Check for key indicators
    if (output.includes("recommend") || output.includes("suggest"))
      confidence += 0.05;
    if (output.includes("analysis") || output.includes("conclusion"))
      confidence += 0.05;

    return Math.min(Math.max(confidence, 0.1), 0.95); // Clamp between 0.1 and 0.95
  }

  private extractInsights(output: string): string[] {
    const insightPatterns = [
      /(?:insight|finding|discovery):\s*(.+?)(?:\n|$)/gi,
      /(?:importantly|notably|significantly),?\s*(.+?)(?:\n|$)/gi,
      /(?:revealed|shows|indicates)\s+(?:that\s+)?(.+?)(?:\n|$)/gi,
    ];

    const insights: string[] = [];
    for (const pattern of insightPatterns) {
      const matches = output.matchAll(pattern);
      for (const match of matches) {
        if (match[1]?.trim()) {
          insights.push(match[1].trim());
        }
      }
    }

    return insights.slice(0, 5); // Limit to top 5 insights
  }

  private extractRecommendations(output: string): string[] {
    const recommendationPatterns = [
      /(?:recommend|suggest|should|propose):\s*(.+?)(?:\n|$)/gi,
      /(?:recommendation|suggestion):\s*(.+?)(?:\n|$)/gi,
      /(?:next step|action item):\s*(.+?)(?:\n|$)/gi,
    ];

    const recommendations: string[] = [];
    for (const pattern of recommendationPatterns) {
      const matches = output.matchAll(pattern);
      for (const match of matches) {
        if (match[1]?.trim()) {
          recommendations.push(match[1].trim());
        }
      }
    }

    return recommendations.slice(0, 8); // Limit to top 8 recommendations
  }

  // Public methods for crew management
  getCrews(): string[] {
    return Array.from(this.crews.keys());
  }

  getCrewConfig(crewName: string): CrewConfig | undefined {
    return this.crews.get(crewName);
  }

  getActiveWorkflows(): string[] {
    return Array.from(this.activeWorkflows.keys());
  }

  async cancelWorkflow(workflowId: string): Promise<boolean> {
    if (this.activeWorkflows.has(workflowId)) {
      // Note: In a real implementation, you'd need proper cancellation logic
      this.activeWorkflows.delete(workflowId);
      return true;
    }
    return false;
  }
}

export {
  CrewAILegalTeam,
};
