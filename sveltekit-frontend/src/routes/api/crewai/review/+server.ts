
import type { RequestHandler } from './$types.js';

// CrewAI Multi-Agent Document Review API
// Orchestrates legal document analysis with multiple AI agents

import { crewAIOrchestrator, LEGAL_AGENTS, type DocumentReviewTask } from "$lib/ai/crewai-legal-agents";
import { documents, cases } from "$lib/db/schema";
import crypto from "crypto";
import { URL } from "url";

// ============================================================================
// REVIEW ORCHESTRATION
// ============================================================================

export const POST: RequestHandler = async ({ request }) => {
  try {
    const {
      documentId,
      reviewType = 'comprehensive',
      priority = 'medium',
      assignedAgents,
      context
    } = await request.json();

    // Validation
    if (!documentId) {
      throw error(400, 'Document ID is required');
    }

    if (!assignedAgents || !Array.isArray(assignedAgents) || assignedAgents.length === 0) {
      throw error(400, 'At least one agent must be assigned');
    }

    // Validate assigned agents
    const invalidAgents = assignedAgents.filter((agentId: any) => !LEGAL_AGENTS[agentId]);
    if (invalidAgents.length > 0) {
      throw error(400, `Invalid agents: ${invalidAgents.join(', ')}`);
    }

    // Get document content
    const [document] = await db
      .select({
        id: documents.id,
        filename: documents.filename,
        extractedText: documents.extractedText,
        caseId: documents.caseId
      })
      .from(documents)
      .where(eq(documents.id, documentId))
      .limit(1);

    if (!document) {
      throw error(404, `Document ${documentId} not found`);
    }

    if (!document.extractedText || document.extractedText.trim().length === 0) {
      throw error(400, 'Document has no extractable text content');
    }

    // Get case context if available
    let caseContext = null;
    if (document.caseId) {
      const [caseData] = await db
        .select()
        .from(cases)
        .where(eq(cases.id, document.caseId))
        .limit(1);
      
      if (caseData) {
        caseContext = {
          caseType: (caseData.metadata as any)?.type || 'general',
          jurisdiction: (caseData.metadata as any)?.jurisdiction || 'federal',
          priority: caseData.priority || 'medium'
        };
      }
    }

    // Create review task
    const reviewTask: DocumentReviewTask = {
      taskId: crypto.randomUUID(),
      documentId,
      documentContent: document.extractedText,
      reviewType: reviewType as DocumentReviewTask['reviewType'],
      priority: priority as DocumentReviewTask['priority'],
      assignedAgents,
      context: {
        ...caseContext,
        ...context // User-provided context overrides case context
      }
    };

    console.log(`🚀 Starting CrewAI review for document: ${document.filename}`);
    console.log(`📋 Agents assigned: ${assignedAgents.join(', ')}`);

    // Start the review process (async)
    const taskId = await crewAIOrchestrator.startDocumentReview(reviewTask);

    return json({
      success: true,
      data: {
        taskId,
        documentId,
        filename: document.filename,
        reviewType,
        priority,
        assignedAgents: assignedAgents.map((agentId: any) => ({
          id: agentId,
          name: LEGAL_AGENTS[agentId].name,
          role: LEGAL_AGENTS[agentId].role,
          expertise: LEGAL_AGENTS[agentId].expertise
        })),
        estimatedTime: calculateEstimatedTime(assignedAgents, document.extractedText.length),
        status: 'started'
      },
      message: `CrewAI review started with ${assignedAgents.length} agents`
    });

  } catch (err: any) {
    console.error('❌ CrewAI review error:', err);
    
    if (err instanceof Error && 'status' in err) {
      throw err; // Re-throw SvelteKit errors
    }
    
    throw error(500, `CrewAI review failed: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// ============================================================================
// REVIEW STATUS & MANAGEMENT
// ============================================================================

export const GET: RequestHandler = async ({ url }) => {
  try {
    const action = url.searchParams.get('action') || 'status';
    const taskId = url.searchParams.get('taskId');

    switch (action) {
      case 'status':
        if (!taskId) {
          // Get all active reviews
          const activeReviews = await crewAIOrchestrator.getActiveReviews();
          
          return json({
            success: true,
            data: {
              activeReviews: activeReviews.length,
              reviews: activeReviews.map((review: any) => ({
                taskId: review.taskId,
                documentId: review.documentId,
                reviewType: review.reviewType,
                priority: review.priority,
                assignedAgents: review.assignedAgents.length,
                status: 'in_progress'
              }))
            }
          });
        } else {
          // Get specific review status
          const activeReviews = await crewAIOrchestrator.getActiveReviews();
          const review = activeReviews.find((r: any) => r.taskId === taskId);
          
          if (!review) {
            return json({
              success: false,
              error: 'Review not found or completed'
            }, { status: 404 });
          }
          
          return json({
            success: true,
            data: {
              taskId: review.taskId,
              documentId: review.documentId,
              reviewType: review.reviewType,
              priority: review.priority,
              assignedAgents: review.assignedAgents,
              status: 'in_progress',
              progress: calculateProgress(review)
            }
          });
        }

      case 'agents':
        // Get available agents
        const agents = crewAIOrchestrator.getAvailableAgents();
        
        return json({
          success: true,
          data: {
            agents: agents.map((agent: any) => ({
              id: agent.id,
              name: agent.name,
              role: agent.role,
              expertise: agent.expertise,
              model: agent.model,
              description: getAgentDescription(agent)
            }))
          }
        });

      case 'presets':
        // Get common agent combinations
        return json({
          success: true,
          data: {
            presets: [
              {
                id: 'comprehensive_review',
                name: 'Comprehensive Review',
                description: 'Full analysis with all agents',
                agents: ['compliance_specialist', 'risk_analyst', 'contract_specialist', 'legal_editor'],
                estimatedTime: '5-8 minutes',
                bestFor: ['new_contracts', 'major_agreements', 'high_risk_documents']
              },
              {
                id: 'risk_focused',
                name: 'Risk-Focused Analysis',
                description: 'Emphasis on risk identification and mitigation',
                agents: ['risk_analyst', 'compliance_specialist'],
                estimatedTime: '2-3 minutes',
                bestFor: ['risk_assessment', 'due_diligence', 'litigation_prep']
              },
              {
                id: 'contract_review',
                name: 'Contract Review',
                description: 'Specialized contract and agreement analysis',
                agents: ['contract_specialist', 'legal_editor'],
                estimatedTime: '3-4 minutes',
                bestFor: ['contracts', 'agreements', 'terms_conditions']
              },
              {
                id: 'compliance_check',
                name: 'Compliance Check',
                description: 'Regulatory and compliance verification',
                agents: ['compliance_specialist'],
                estimatedTime: '1-2 minutes',
                bestFor: ['regulatory_filings', 'compliance_docs', 'quick_checks']
              }
            ]
          }
        });

      case 'health':
        // Health check for CrewAI system
        const activeReviews = await crewAIOrchestrator.getActiveReviews();
        const isHealthy = activeReviews.length < 10; // Arbitrary threshold
        
        return json({
          success: true,
          healthy: isHealthy,
          data: {
            status: isHealthy ? 'healthy' : 'overloaded',
            activeReviews: activeReviews.length,
            availableAgents: Object.keys(LEGAL_AGENTS).length,
            systemLoad: activeReviews.length / 10, // Percentage
            recommendations: isHealthy ? [] : [
              'System overloaded - consider queuing reviews',
              'Review agent allocation and performance',
              'Check for stuck or failed reviews'
            ]
          }
        }, { 
          status: isHealthy ? 200 : 503 
        });

      default:
        throw error(400, `Unknown action: ${action}`);
    }

  } catch (err: any) {
    console.error('❌ CrewAI status error:', err);
    
    return json({
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error'
    }, { status: 500 });
  }
};

// ============================================================================
// REVIEW CANCELLATION
// ============================================================================

export const DELETE: RequestHandler = async ({ url }) => {
  try {
    const taskId = url.searchParams.get('taskId');
    
    if (!taskId) {
      throw error(400, 'Task ID is required');
    }

    const cancelled = await crewAIOrchestrator.cancelReview(taskId);
    
    if (!cancelled) {
      return json({
        success: false,
        error: 'Review not found or already completed'
      }, { status: 404 });
    }

    return json({
      success: true,
      data: {
        taskId,
        status: 'cancelled'
      },
      message: 'Review cancelled successfully'
    });

  } catch (err: any) {
    console.error('❌ CrewAI cancellation error:', err);
    
    if (err instanceof Error && 'status' in err) {
      throw err;
    }
    
    throw error(500, `Failed to cancel review: ${err instanceof Error ? err.message : 'Unknown error'}`);
  }
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateEstimatedTime(agentIds: string[], contentLength: number): string {
  // Base time per agent (in seconds)
  const baseTimePerAgent = 30;
  
  // Content length factor (longer content = more time)
  const contentFactor = Math.max(1, Math.ceil(contentLength / 10000));
  
  // Model speed factors
  const modelFactors = {
    'claude': 1.2, // Slower but higher quality
    'gemma3': 0.8, // Faster local model
    'gpt-4': 1.0   // Baseline
  };
  
  let totalTime = 0;
  for (const agentId of agentIds) {
    const agent = LEGAL_AGENTS[agentId];
    if (agent) {
      const modelFactor = modelFactors[agent.model] || 1.0;
      totalTime += baseTimePerAgent * modelFactor * contentFactor;
    }
  }
  
  // Add synthesis time
  totalTime += 15;
  
  if (totalTime < 60) {
    return `${Math.round(totalTime)} seconds`;
  } else {
    const minutes = Math.round(totalTime / 60);
    return `${minutes} minute${minutes > 1 ? 's' : ''}`;
  }
}

function calculateProgress(review: DocumentReviewTask): number {
  // This would be implemented to track actual progress
  // For now, return a placeholder
  return Math.random() * 100;
}

function getAgentDescription(agent: any): string {
  const descriptions = {
    'compliance_specialist': 'Identifies regulatory compliance issues and legal standard adherence',
    'risk_analyst': 'Assesses legal, financial, and operational risks with mitigation strategies',
    'contract_specialist': 'Analyzes contract terms, liability provisions, and negotiation opportunities',
    'legal_editor': 'Improves document clarity, structure, and legal writing effectiveness'
  };
  
  return descriptions[agent.id as keyof typeof descriptions] || 'Specialized legal analysis agent';
}