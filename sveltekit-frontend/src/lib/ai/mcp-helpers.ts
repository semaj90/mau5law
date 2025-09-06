
// Context7 MCP Helpers: Production implementation with VS Code Extension Integration
// Library ID resolution using Context7 MCP server

// ============================================================================
// VS Code Extension Integration Types & Interfaces
// ============================================================================

export interface VSCodeMCPContext {
  workspaceRoot: string;
  activeFiles: string[];
  currentFile?: string;
  errors: DiagnosticError[];
  userIntent: 'debugging' | 'feature-development' | 'optimization' | 'documentation';
  recentPrompts: string[];
  projectType: 'sveltekit-legal-ai' | 'react-nextjs' | 'vue-nuxt' | 'generic';
}

export interface DiagnosticError {
  file: string;
  line: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
  source?: 'typescript' | 'eslint' | 'svelte' | 'other';
}

export interface AutoMCPSuggestion {
  tool: 'analyze-stack' | 'generate-best-practices' | 'suggest-integration' | 'get-library-docs' | 'resolve-library-id';
  confidence: number;
  reasoning: string;
  args: Record<string, any>;
  priority: 'high' | 'medium' | 'low';
  expectedOutput: string;
}

export interface MCPContextAnalysis {
  detectedStack: string[];
  currentErrors: DiagnosticError[];
  suggestedActions: AutoMCPSuggestion[];
  contextConfidence: number;
}

// Extension-specific MCP tool suggestions
export interface ContextTriggers {
  onFileOpen: string[];           // Detect stack from open files
  onNpmErrors: string[];          // Parse `npm run check` output  
  onPromptAnalysis: string[];     // Analyze user comments/prompts
  onWorkspaceChange: string;      // Detect project type
}

// ============================================================================
// Intelligent Context Detection Functions
// ============================================================================

// Analyze current VS Code workspace and suggest appropriate MCP tools
export async function getContextAwareSuggestions(
  vsCodeContext: VSCodeMCPContext
): Promise<AutoMCPSuggestion[]> {
  const suggestions: AutoMCPSuggestion[] = [];
  
  // Analyze TypeScript errors for context
  const errorSuggestions = analyzeErrorsForMCPSuggestions(vsCodeContext.errors);
  suggestions.push(...errorSuggestions);
  
  // Analyze open files for stack detection
  const stackSuggestions = analyzeFilesForStackSuggestions(vsCodeContext.activeFiles);
  suggestions.push(...stackSuggestions);
  
  // Analyze recent prompts/comments for intent
  const intentSuggestions = analyzePromptIntent(vsCodeContext.recentPrompts);
  suggestions.push(...intentSuggestions);
  
  // Sort by priority and confidence
  return suggestions
    .sort((a, b) => {
      const priorityWeight = { high: 3, medium: 2, low: 1 };
      return (priorityWeight[b.priority] * b.confidence) - (priorityWeight[a.priority] * a.confidence);
    })
    .slice(0, 5); // Return top 5 suggestions
}

// Parse TypeScript/build errors and suggest relevant MCP tools
export function analyzeErrorsForMCPSuggestions(errors: DiagnosticError[]): AutoMCPSuggestion[] {
  const suggestions: AutoMCPSuggestion[] = [];
  
  errors.forEach((error: any) => {
    if (error.message.includes('XState') || error.message.includes('xstate')) {
      suggestions.push({
        tool: 'get-library-docs',
        confidence: 0.9,
        reasoning: 'XState error detected - suggesting library documentation',
        args: { context7CompatibleLibraryID: 'xstate', topic: 'v5-migration' },
        priority: 'high',
        expectedOutput: 'XState v5 migration guide and best practices'
      });
    }
    
    if (error.message.includes('Drizzle') || error.message.includes('drizzle')) {
      suggestions.push({
        tool: 'analyze-stack',
        confidence: 0.85,
        reasoning: 'Drizzle ORM error detected - analyzing database stack',
        args: { component: 'drizzle', context: 'legal-ai' },
        priority: 'high',
        expectedOutput: 'Drizzle ORM setup analysis and recommendations'
      });
    }
    
    if (error.message.includes('SvelteKit') || error.message.includes('svelte')) {
      suggestions.push({
        tool: 'generate-best-practices',
        confidence: 0.8,
        reasoning: 'SvelteKit error detected - suggesting best practices',
        args: { area: 'performance' },
        priority: 'medium',
        expectedOutput: 'SvelteKit performance optimization guidelines'
      });
    }
    
    if (error.message.includes('env') || error.message.includes('environment')) {
      suggestions.push({
        tool: 'suggest-integration',
        confidence: 0.75,
        reasoning: 'Environment configuration error detected',
        args: { feature: 'environment-setup', requirements: 'sveltekit server-side' },
        priority: 'medium',
        expectedOutput: 'Environment variable setup recommendations'
      });
    }
  });
  
  return suggestions;
}

// Analyze open files to detect technology stack and suggest tools
export function analyzeFilesForStackSuggestions(activeFiles: string[]): AutoMCPSuggestion[] {
  const suggestions: AutoMCPSuggestion[] = [];
  const detectedTech = new Set<string>();
  
  activeFiles.forEach((file: any) => {
    if (file.includes('xstate') || file.includes('machine')) {
      detectedTech.add('xstate');
    }
    if (file.includes('drizzle') || file.includes('schema')) {
      detectedTech.add('drizzle');
    }
    if (file.includes('svelte') || file.includes('+page')) {
      detectedTech.add('sveltekit');
    }
    if (file.includes('mcp') || file.includes('context7')) {
      detectedTech.add('mcp');
    }
  });
  
  // Generate suggestions based on detected technology
  detectedTech.forEach((tech: any) => {
    suggestions.push({
      tool: 'analyze-stack',
      confidence: 0.7,
      reasoning: `${tech} files detected in workspace`,
      args: { component: tech, context: 'legal-ai' },
      priority: 'medium',
      expectedOutput: `${tech} analysis and optimization recommendations`
    });
  });
  
  return suggestions;
}

// Analyze user prompts/comments for intent and suggest appropriate tools
export function analyzePromptIntent(recentPrompts: string[]): AutoMCPSuggestion[] {
  const suggestions: AutoMCPSuggestion[] = [];
  
  recentPrompts.forEach((prompt: any) => {
    const lowerPrompt = prompt.toLowerCase();
    
    if (lowerPrompt.includes('best practices') || lowerPrompt.includes('optimize')) {
      suggestions.push({
        tool: 'generate-best-practices',
        confidence: 0.9,
        reasoning: 'User explicitly mentioned best practices or optimization',
        args: { area: detectArea(lowerPrompt) },
        priority: 'high',
        expectedOutput: 'Customized best practices for current context'
      });
    }
    
    if (lowerPrompt.includes('integrate') || lowerPrompt.includes('add')) {
      suggestions.push({
        tool: 'suggest-integration',
        confidence: 0.85,
        reasoning: 'User asking for integration guidance',
        args: { feature: extractFeature(lowerPrompt) },
        priority: 'high',
        expectedOutput: 'Integration patterns and implementation guide'
      });
    }
    
    if (lowerPrompt.includes('docs') || lowerPrompt.includes('documentation')) {
      suggestions.push({
        tool: 'get-library-docs',
        confidence: 0.8,
        reasoning: 'User requesting documentation',
        args: { context7CompatibleLibraryID: extractLibrary(lowerPrompt) },
        priority: 'medium',
        expectedOutput: 'Relevant library documentation and examples'
      });
    }
  });
  
  return suggestions;
}

// Helper functions for prompt analysis
function detectArea(prompt: string): string {
  if (prompt.includes('performance') || prompt.includes('speed')) return 'performance';
  if (prompt.includes('security') || prompt.includes('auth')) return 'security';
  if (prompt.includes('ui') || prompt.includes('ux')) return 'ui-ux';
  return 'performance'; // default
}

function extractFeature(prompt: string): string {
  // Extract feature name from integration prompts
  const words = prompt.split(' ');
  const integrateIndex = words.findIndex((w: any) => w.includes('integrat') || w.includes('add'));
  return words[integrateIndex + 1] || 'unknown-feature';
}

function extractLibrary(prompt: string): string {
  // Extract library name from documentation requests
  const libraries = ['xstate', 'drizzle', 'sveltekit', 'tailwind', 'typescript'];
  return libraries.find((lib: any) => prompt.includes(lib)) || 'generic';
}

// ============================================================================
// Enhanced MCP Tools with Context Awareness
// ============================================================================

// Context-aware library documentation with VS Code integration
export async function getContextAwareLibraryDocs(
  libraryName: string,
  vsCodeContext?: VSCodeMCPContext,
  topic?: string
): Promise<string> {
  try {
    // Enhance topic based on current context
    let enhancedTopic = topic;
    if (vsCodeContext && !topic) {
      // Auto-detect topic from current errors or files
      const relevantErrors = vsCodeContext.errors.filter((e: any) => e.message.toLowerCase().includes(libraryName.toLowerCase())
      );
      if (relevantErrors.length > 0) {
        enhancedTopic = 'troubleshooting';
      }
    }
    
    return await getLibraryDocs(libraryName, enhancedTopic);
  } catch (err: any) {
    console.error('getContextAwareLibraryDocs error:', err);
    throw err;
  }
}

// ============================================================================
// Core MCP Helper Functions (existing)
// ============================================================================
export async function resolveLibraryId(libraryName: string): Promise<string> {
  try {
    const response = await fetch("http://localhost:3000/mcp/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "resolve-library-id",
        arguments: { libraryName },
      }),
    });
    const data = await response.json();
    // Parse the selected library ID from the response text
    const match = data?.content?.[0]?.text?.match(/Selected Library ID: (\S+)/);
    if (match) return match[1];
    throw new Error(data?.content?.[0]?.text || "No library ID found");
  } catch (err: any) {
    console.error("resolveLibraryId error:", err);
    throw err;
  }
}

// Fetch library documentation from Context7 MCP server
export async function getLibraryDocs(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens: number = 10000,
): Promise<string> {
  try {
    const response = await fetch("http://localhost:3000/mcp/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: "get-library-docs",
        arguments: { context7CompatibleLibraryID, topic, tokens },
      }),
    });
    const data = await response.json();
    return data?.content?.[0]?.text || "No documentation found.";
  } catch (err: any) {
    console.error("getLibraryDocs error:", err);
    throw err;
  }
}

// Enhanced semantic search using Context7 MCP server
export async function semanticSearch(query: string): Promise<any[]> {
  try {
    const response = await fetch("http://localhost:3000/api/semantic-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const data = await response.json();
    return data.results || [];
  } catch (err: any) {
    console.error("semanticSearch error:", err);
    // Return empty array on error to prevent UI breakage
    return [];
  }
}

// Enhanced Context7 MCP tool calling with Copilot architecture integration
export async function callContext7Tool(
  toolName: string,
  args: Record<string, any>,
  options: { includeCopilotContext?: boolean } = {},
): Promise<any> {
  try {
    const response = await fetch("http://localhost:3000/mcp/call", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        tool: toolName,
        arguments: {
          ...args,
          // Inject Copilot architecture context if requested
          ...(options.includeCopilotContext && {
            copilotArchitecture: true,
            legalAIContext: true,
          }),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Context7 tool call failed: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (err: any) {
    console.error(`Context7 tool ${toolName} error:`, err);
    throw err;
  }
}

// Copilot architecture-aware library documentation retrieval
export async function getLibraryDocsWithContext(
  context7CompatibleLibraryID: string,
  topic?: string,
  tokens: number = 10000,
  includeCopilotPatterns: boolean = true,
): Promise<string> {
  try {
    const response = await callContext7Tool("get-library-docs", {
      context7CompatibleLibraryID,
      topic,
      tokens,
      includeCopilotPatterns,
    });

    return response?.content?.[0]?.text || "No documentation found.";
  } catch (err: any) {
    console.error("getLibraryDocsWithContext error:", err);
    throw err;
  }
}

// Create memory relation for agent integration
export async function createMemoryRelation(
  entityId: string,
  relation: string,
  targetId: string,
): Promise<void> {
  try {
    await callContext7Tool("create-memory-relation", {
      entityId,
      relation,
      targetId,
    });
  } catch (err: any) {
    console.error("createMemoryRelation error:", err);
    throw err;
  }
}