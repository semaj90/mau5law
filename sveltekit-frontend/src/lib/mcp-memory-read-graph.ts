
// MCP Memory2 Read Graph utility
// Enhanced for duplicate variable tracking and component optimization
// Ensures #mcp_memory2_read_graph is available in the codebase

import type { RequestHandler } from "@sveltejs/kit";

export interface GraphNode {
  id: string;
  type: 'component' | 'variable' | 'prop' | 'store' | 'function';
  name: string;
  file: string;
  lineNumber?: number;
  duplicateCount?: number;
  relationships: string[];
}

export interface GraphReadResponse {
  nodes: GraphNode[];
  edges: {
    from: string;
    to: string;
    type: 'declares' | 'uses' | 'imports' | 'exports' | 'duplicates';
  }[];
  metadata: {
    totalNodes: number;
    duplicateVariables: number;
    componentCount: number;
    lastUpdated: string;
  };
}

export async function mcpMemory2ReadGraph(
  filter?: string,
  nodeType?: string
): Promise<GraphReadResponse> {
  // Enhanced MCP memory2 read_graph endpoint with filtering
  const params = new URLSearchParams();
  if (filter) params.append('filter', filter);
  if (nodeType) params.append('nodeType', nodeType);
  
  const response = await fetch(`/api/mcp/memory2/read-graph?${params.toString()}`, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(`Failed to read MCP memory2 graph: ${error.message || response.statusText}`);
  }
  
  return response.json();
}

// Specialized helpers for duplicate variable tracking
export async function findDuplicateVariables(): Promise<GraphNode[]> {
  const graph = await mcpMemory2ReadGraph(undefined, 'variable');
  return graph.nodes.filter(node => 
    node.type === 'variable' && (node.duplicateCount || 0) > 1
  );
}

export async function findDuplicateProps(): Promise<GraphNode[]> {
  const graph = await mcpMemory2ReadGraph(undefined, 'prop');
  return graph.nodes.filter(node => 
    node.type === 'prop' && (node.duplicateCount || 0) > 1
  );
}

export async function analyzeComponentStructure(componentName: string): Promise<{
  component: GraphNode;
  variables: GraphNode[];
  props: GraphNode[];
  duplicates: GraphNode[];
}> {
  const graph = await mcpMemory2ReadGraph(componentName, undefined);
  const componentNode = graph.nodes.find(n => n.name === componentName);
  
  if (!componentNode) {
    throw new Error(`Component ${componentName} not found in graph`);
  }
  
  const relatedNodes = graph.nodes.filter(n => 
    componentNode.relationships.includes(n.id)
  );
  
  return {
    component: componentNode,
    variables: relatedNodes.filter(n => n.type === 'variable'),
    props: relatedNodes.filter(n => n.type === 'prop'),
    duplicates: relatedNodes.filter(n => (n.duplicateCount || 0) > 1)
  };
}

// Helper for prop destructuring consolidation analysis
export async function analyzePropDestructuring(filePath: string): Promise<{
  duplicateProps: string[];
  consolidationSuggestions: Array<{
    duplicateVariables: string[];
    suggestedInterface: string;
    suggestedDestructuring: string;
  }>;
}> {
  const graph = await mcpMemory2ReadGraph(filePath, 'prop');
  const propNodes = graph.nodes.filter(n => n.file.includes(filePath));
  
  // Group by duplicate names
  const duplicateGroups = propNodes.reduce((acc, node) => {
    if (!acc[node.name]) acc[node.name] = [];
    acc[node.name].push(node);
    return acc;
  }, {} as Record<string, GraphNode[]>);
  
  const duplicateProps = Object.keys(duplicateGroups).filter(
    name => duplicateGroups[name].length > 1
  );
  
  const consolidationSuggestions = duplicateProps.map(propName => {
    const nodes = duplicateGroups[propName];
    return {
      duplicateVariables: [propName],
      suggestedInterface: `interface Props {\n  ${propName}?: unknown;\n}`,
      suggestedDestructuring: `let { ${propName} } = $props();`
    };
  });
  
  return { duplicateProps, consolidationSuggestions };
}

// Tag: #mcp_memory2_read_graph
// Keywords: #memory #read_graph #duplicates #props #consolidation
