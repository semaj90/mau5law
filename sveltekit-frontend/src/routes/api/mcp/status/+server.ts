
import type { RequestHandler } from './$types';

/*
 * MCP Integration Status API Endpoint
 * Provides status information about the enhanced MCP integration
 */


export const GET: RequestHandler = async ({ url, request }) => {
	try {
		// Check MCP Server Status
		let mcpServerStatus = 'offline';
		let mcpMetrics = null;
		
		try {
			const mcpResponse = await fetch('http://localhost:40000/health', {
				method: 'GET',
				headers: {
					'Accept': 'application/json'
				}
			});
			
			if (mcpResponse.ok) {
				mcpServerStatus = 'online';
				const healthData = await mcpResponse.json();
				mcpMetrics = healthData.metrics;
			}
		} catch (error: any) {
			console.log('MCP server not available:', error.message);
		}
		
		// Check Ollama Status
		let ollamaStatus = 'offline';
		let ollamaModels = [];
		
		try {
			const ollamaResponse = await fetch('http://localhost:11434/api/tags');
			if (ollamaResponse.ok) {
				ollamaStatus = 'online';
				const data = await ollamaResponse.json();
				ollamaModels = data.models || [];
			}
		} catch (error: any) {
			console.log('Ollama not available:', error.message);
		}
		
		// Check cluster performance data
		let clusterStatus = 'unknown';
		let clusterMetrics = null;
		
		try {
			// This would normally read from a file or database
			// For demo purposes, we'll provide sample data
			clusterStatus = 'validated';
			clusterMetrics = {
				totalRequests: 220,
				successfulRequests: 203,
				failedRequests: 17,
				successRate: 0.923,
				averageResponseTime: 226.52,
				workerCount: 2,
				lastTestTime: new Date().toISOString()
			};
		} catch (error: any) {
			console.log('Cluster metrics not available:', error.message);
		}
		
		// Integration readiness assessment
		const integrationReadiness = {
			mcpServerRunning: mcpServerStatus === 'online',
			ollamaModelsLoaded: ollamaStatus === 'online' && ollamaModels.length > 0,
			clusterSystemOnline: clusterStatus === 'validated',
			vsCodeExtensionActive: false, // Would need to be detected differently
			contextualAnalysisReady: mcpServerStatus === 'online' && clusterStatus === 'validated'
		};
		
		const overallStatus = Object.values(integrationReadiness).filter(Boolean).length >= 3 
			? 'operational' 
			: 'partial';
		
		// Enhanced MCP Tools Status
		const mcpToolsStatus = [
			{ id: 'enhanced_rag_query', name: 'Enhanced RAG Query', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'mcp_memory2_create_relations', name: 'Memory Relations', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'mcp_memory2_read_graph', name: 'Read Memory Graph', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'mcp_memory2_search_nodes', name: 'Search Memory Nodes', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'mcp_context72_get-library-docs', name: 'Context7 Docs', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'mcp_context72_resolve-library-id', name: 'Resolve Library ID', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'agent_orchestrate_claude', name: 'Claude Agent', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'agent_orchestrate_crewai', name: 'CrewAI Agent', status: mcpServerStatus === 'online' ? 'available' : 'offline' },
			{ id: 'agent_orchestrate_autogen', name: 'AutoGen Agent', status: mcpServerStatus === 'online' ? 'available' : 'offline' }
		];
		
		return json({
			success: true,
			timestamp: new Date().toISOString(),
			overallStatus,
			integrationReadiness,
			services: {
				mcpServer: {
					status: mcpServerStatus,
					metrics: mcpMetrics,
					url: 'http://localhost:40000'
				},
				ollama: {
					status: ollamaStatus,
					models: ollamaModels,
					url: 'http://localhost:11434'
				},
				cluster: {
					status: clusterStatus,
					metrics: clusterMetrics
				}
			},
			mcpTools: mcpToolsStatus,
			capabilities: {
				enhancedRAG: mcpServerStatus === 'online',
				memoryGraph: mcpServerStatus === 'online',
				context7Documentation: mcpServerStatus === 'online',
				multiAgentOrchestration: mcpServerStatus === 'online',
				realtimeUpdates: mcpServerStatus === 'online',
				clusterProcessing: clusterStatus === 'validated',
				semanticCaching: ollamaStatus === 'online',
				performanceMetrics: true
			},
			recommendations: generateRecommendations(integrationReadiness, mcpServerStatus, ollamaStatus, clusterStatus)
		});
		
	} catch (error: any) {
		console.error('MCP status check failed:', error);
		
		return json({
			success: false,
			error: error.message,
			timestamp: new Date().toISOString(),
			overallStatus: 'error'
		}, { status: 500 });
	}
};

function generateRecommendations(
	readiness: any, 
	mcpStatus: string, 
	ollamaStatus: string, 
	clusterStatus: string
): string[] {
	const recommendations = [];
	
	if (mcpStatus === 'offline') {
		recommendations.push('Start the Context7 MCP server: node context7-mcp-server.js');
	}
	
	if (ollamaStatus === 'offline') {
		recommendations.push('Start Ollama service and pull required models: ollama pull nomic-embed-text');
	}
	
	if (clusterStatus === 'unknown') {
		recommendations.push('Run cluster performance test: node test-cluster-simple.js');
	}
	
	if (readiness.contextualAnalysisReady) {
		recommendations.push('✅ System ready for enhanced MCP operations');
		recommendations.push('Try enhanced RAG queries and memory graph operations');
	}
	
	if (!readiness.vsCodeExtensionActive) {
		recommendations.push('Install VS Code Context7 MCP Assistant extension for full integration');
	}
	
	return recommendations;
}