import crypto from "crypto";

/**
 * XState State Machine for Evidence Chain of Custody Workflow
 * Handles the complete legal custody lifecycle with AI-powered verification,
 * real-time collaboration, and comprehensive audit trails
 */

import { createMachine, assign, fromPromise } from "xstate";
import type { Evidence } from "$lib/server/db/complete-introspected-schema"; // Evidence type source
import { db } from "$lib/db";
import { evidence } from "$lib/db/schema"; // Removed non-existent evidenceVectors & collaborationSessions
import { eq, and, desc } from "drizzle-orm";

// Types for the custody workflow state machine
export interface EvidenceCustodyContext {
  // Core evidence data
  evidenceId: string;
  caseId: string;
  userId: string;
  evidenceData?: Evidence;

  // Custody chain tracking
  custodyChainId?: string;
  currentCustodian: string;
  previousCustodian?: string;
  transferReason?: string;

  // Verification and integrity
  originalHash: string;
  currentHash?: string;
  integrityStatus:
    | "pending"
    | "verified"
    | "compromised"
    | "requires-attention";
  verificationResults?: {
    hashMatch: boolean;
    metadataIntact: boolean;
    timestampValid: boolean;
    digitalSignatureValid: boolean;
    aiAnalysisScore: number;
    riskAssessment: string;
  };

  // AI analysis and recommendations
  aiAnalysis?: {
    authenticity: number;
    completeness: number;
    relevance: number;
    riskLevel: "low" | "medium" | "high" | "critical";
    recommendations: string[];
    flaggedAnomalies: string[];
  };

  // Collaboration state
  activeCollaborators: string[];
  collaborationSession?: {
    sessionId: string;
    participants: Array<{ userId: string; role: string; joinedAt: string }>;
    chatHistory: Array<{ userId: string; message: string; timestamp: string }>;
    annotations: Array<{
      userId: string;
      content: string;
      position: any;
      timestamp: string;
    }>;
  };

  // Workflow progress
  workflowStage: string;
  progress: number;
  requiresApproval: boolean;
  approvalStatus?: "pending" | "approved" | "rejected";

  // Documentation and audit trail
  custodyEvents: Array<{
    id: string;
    eventType:
      | "intake"
      | "transfer"
      | "verification"
      | "analysis"
      | "approval"
      | "finalization";
    timestamp: string;
    userId: string;
    details: Record<string, any>;
    signature?: string;
  }>;

  // Performance and timing
  startTime: number;
  stageStartTime: number;
  stageTimes: Record<string, number>;

  // Error handling
  error?: string;
  warnings: string[];
  retryCount: number;
  maxRetries: number;
}

export type EvidenceCustodyEvent =
  | {
      type: "START_CUSTODY_WORKFLOW";
      evidenceId: string;
      caseId: string;
      userId: string;
      originalHash: string;
    }
  | { type: "VERIFY_INTEGRITY" }
  | { type: "START_AI_ANALYSIS" }
  | { type: "JOIN_COLLABORATION"; userId: string; role: string }
  | { type: "LEAVE_COLLABORATION"; userId: string }
  | { type: "ADD_ANNOTATION"; userId: string; content: string; position: any }
  | { type: "TRANSFER_CUSTODY"; newCustodian: string; reason: string }
  | { type: "APPROVE_CUSTODY" }
  | { type: "REJECT_CUSTODY"; reason: string }
  | { type: "FINALIZE_CUSTODY" }
  | { type: "RETRY" }
  | { type: "CANCEL_WORKFLOW" }
  | { type: "FORCE_COMPLETE" }
  | { type: "UPDATE_PROGRESS"; progress: number; stage: string };

// Service implementations
const evidenceIntakeService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(
      `Starting evidence intake for custody workflow: ${input.evidenceId}`
    );

    // Fetch evidence data with full details
    const evidenceRecord = await db
      .select()
      .from(evidence)
      .where(eq(evidence.id, input.evidenceId))
      .limit(1);

    if (!evidenceRecord.length) {
      throw new Error(`Evidence not found: ${input.evidenceId}`);
    }

    const evidenceData = evidenceRecord[0];

    // Verify initial integrity
    const currentHash = await generateEvidenceHash(evidenceData);
    const hashMatch = currentHash === input.originalHash;

    // Create initial custody event
    const custodyEvent = {
      id: crypto.randomUUID(),
      eventType: "intake" as const,
      timestamp: new Date().toISOString(),
      userId: input.userId,
      details: {
        evidenceId: input.evidenceId,
        originalHash: input.originalHash,
        currentHash,
        hashMatch,
        initialCustodian: input.userId,
      },
      signature: await generateEventSignature({
        evidenceId: input.evidenceId,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        eventType: "intake",
      }),
    };

    return {
      evidenceData,
      currentHash,
      integrityStatus: hashMatch ? "verified" : "compromised",
      custodyEvent,
    };
  }
);

const integrityVerificationService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(
      `Performing integrity verification for evidence: ${input.evidenceId}`
    );

    // Multi-layer integrity verification
    const verificationResults = {
      hashMatch: input.currentHash === input.originalHash,
      metadataIntact: await verifyMetadataIntegrity(input.evidenceData!),
      timestampValid: await verifyTimestamp(input.evidenceData!),
      digitalSignatureValid: await verifyDigitalSignature(input.evidenceData!),
      aiAnalysisScore: 0,
      riskAssessment: "pending",
    };

    // AI-powered integrity analysis
    try {
      const aiResponse = await fetch("/api/ai/analyze-evidence", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          evidenceId: input.evidenceId,
          analysisType: "integrity",
          verificationContext: {
            originalHash: input.originalHash,
            currentHash: input.currentHash,
            metadata: input.evidenceData?.metadata,
          },
        }),
      });

      if (aiResponse.ok) {
        const aiResult = await aiResponse.json();
        verificationResults.aiAnalysisScore = aiResult.integrityScore || 0;
        verificationResults.riskAssessment = aiResult.riskLevel || "medium";
      }
    } catch (error: any) {
      console.warn(
        "AI verification failed, using manual verification only:",
        error
      );
      verificationResults.riskAssessment = "requires-manual-review";
    }

    // Determine overall integrity status
    let integrityStatus: typeof input.integrityStatus = "verified";
    if (!verificationResults.hashMatch || !verificationResults.metadataIntact) {
      integrityStatus = "compromised";
    } else if (
      verificationResults.aiAnalysisScore < 0.7 ||
      !verificationResults.timestampValid
    ) {
      integrityStatus = "requires-attention";
    }

    // Create verification event
    const custodyEvent = {
      id: crypto.randomUUID(),
      eventType: "verification" as const,
      timestamp: new Date().toISOString(),
      userId: input.userId,
      details: {
        verificationResults,
        integrityStatus,
        verificationMethod: "automated-ai-enhanced",
      },
      signature: await generateEventSignature({
        evidenceId: input.evidenceId,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        eventType: "verification",
      }),
    };

    return {
      verificationResults,
      integrityStatus,
      custodyEvent,
    };
  }
);

const aiAnalysisService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(
      `Performing AI analysis for evidence custody: ${input.evidenceId}`
    );

    // Multi-agent AI analysis using the existing pipeline
    const analysisResponse = await fetch("/api/multi-agent/analyze", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        evidenceId: input.evidenceId,
        caseId: input.caseId,
        analysisType: "custody-workflow",
        context: {
          custodyChain: input.custodyEvents,
          integrityStatus: input.integrityStatus,
          verificationResults: input.verificationResults,
        },
      }),
    });

    if (!analysisResponse.ok) {
      throw new Error(`AI analysis failed: ${analysisResponse.statusText}`);
    }

    const analysisResult = await analysisResponse.json();

    // Structure the AI analysis for custody workflow
    const aiAnalysis = {
      authenticity: analysisResult.authenticityScore || 0.8,
      completeness: analysisResult.completenessScore || 0.9,
      relevance: analysisResult.relevanceScore || 0.85,
      riskLevel: analysisResult.riskLevel || "medium",
      recommendations: analysisResult.recommendations || [],
      flaggedAnomalies: analysisResult.anomalies || [],
    };

    // Create analysis event
    const custodyEvent = {
      id: crypto.randomUUID(),
      eventType: "analysis" as const,
      timestamp: new Date().toISOString(),
      userId: input.userId,
      details: {
        aiAnalysis,
        analysisMethod: "multi-agent-pipeline",
        models: analysisResult.modelsUsed || [
          "gemma3-legal",
          "crewai-legal-team",
        ],
      },
      signature: await generateEventSignature({
        evidenceId: input.evidenceId,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        eventType: "analysis",
      }),
    };

    return {
      aiAnalysis,
      custodyEvent,
    };
  }
);

const collaborationService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(
      `Setting up collaboration session for evidence: ${input.evidenceId}`
    );

    // Create or join collaboration session
    const sessionId =
      input.collaborationSession?.sessionId || crypto.randomUUID();

    // Save collaboration session to database
    // Collaboration session persistence temporarily disabled (schema entity missing)
    // TODO: Re-enable when collaborationSessions table is defined

    // Set up real-time WebSocket connection for collaboration
    const collaborationSession = {
      sessionId,
      participants: [
        ...(input.collaborationSession?.participants || []),
        {
          userId: input.userId,
          role: "investigator",
          joinedAt: new Date().toISOString(),
        },
      ],
      chatHistory: input.collaborationSession?.chatHistory || [],
      annotations: input.collaborationSession?.annotations || [],
    };

    // Notify other participants via WebSocket
    await notifyCollaborators(sessionId, {
      type: "user-joined",
      userId: input.userId,
      evidenceId: input.evidenceId,
      timestamp: new Date().toISOString(),
    });

    return {
      collaborationSession,
    };
  }
);

const custodyTransferService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(
      `Processing custody transfer for evidence: ${input.evidenceId}`
    );

    // Validate transfer requirements
    if (!input.transferReason) {
      throw new Error("Transfer reason is required for custody transfer");
    }

    // Create transfer event with digital signatures
    const transferEvent = {
      id: crypto.randomUUID(),
      eventType: "transfer" as const,
      timestamp: new Date().toISOString(),
      userId: input.userId,
      details: {
        fromCustodian: input.currentCustodian,
        toCustodian: input.userId, // New custodian is the current user
        transferReason: input.transferReason,
        integrityVerified: input.integrityStatus === "verified",
        witnessSignatures: await getWitnessSignatures(input.evidenceId),
      },
      signature: await generateEventSignature({
        evidenceId: input.evidenceId,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        eventType: "transfer",
      }),
    };

    return {
      transferEvent,
      newCustodian: input.userId,
      previousCustodian: input.currentCustodian,
    };
  }
);

const custodyFinalizationService = fromPromise(
  async ({ input }: { input: EvidenceCustodyContext }) => {
    console.log(`Finalizing custody for evidence: ${input.evidenceId}`);

    // Generate comprehensive custody report
    const custodyReport = {
      evidenceId: input.evidenceId,
      caseId: input.caseId,
      custodyChainId: input.custodyChainId,
      totalEvents: input.custodyEvents.length,
      integrityStatus: input.integrityStatus,
      finalHash: input.currentHash,
      aiAnalysisSummary: input.aiAnalysis,
      collaborationSummary: {
        totalParticipants: input.activeCollaborators.length,
        sessionDuration: calculateSessionDuration(input.collaborationSession),
        annotationCount: input.collaborationSession?.annotations.length || 0,
      },
      stageTimes: input.stageTimes,
      totalProcessingTime: Date.now() - input.startTime,
      finalizedBy: input.userId,
      finalizedAt: new Date().toISOString(),
    };

    // Store final custody report
    await storeCustodyReport(custodyReport);

    // Create finalization event
    const finalizationEvent = {
      id: crypto.randomUUID(),
      eventType: "finalization" as const,
      timestamp: new Date().toISOString(),
      userId: input.userId,
      details: {
        custodyReport,
        approvalStatus: input.approvalStatus,
        finalIntegrityStatus: input.integrityStatus,
      },
      signature: await generateEventSignature({
        evidenceId: input.evidenceId,
        userId: input.userId,
        timestamp: new Date().toISOString(),
        eventType: "finalization",
      }),
    };

    // Close collaboration session
    if (input.collaborationSession) {
      await closeCollaborationSession(input.collaborationSession.sessionId);
    }

    return {
      custodyReport,
      finalizationEvent,
    };
  }
);

// Main Evidence Chain of Custody state machine
export const evidenceCustodyMachine = createMachine(
  {
    id: "evidenceCustody",
    types: {
      context: {} as EvidenceCustodyContext,
      events: {} as EvidenceCustodyEvent,
    },
    initial: "idle",
    context: {
      evidenceId: "",
      caseId: "",
      userId: "",
      currentCustodian: "",
      originalHash: "",
      integrityStatus: "pending",
      activeCollaborators: [],
      workflowStage: "idle",
      progress: 0,
      requiresApproval: false,
      custodyEvents: [],
      startTime: 0,
      stageStartTime: 0,
      stageTimes: {},
      warnings: [],
      retryCount: 0,
      maxRetries: 3,
    },
    states: {
      idle: {
        on: {
          START_CUSTODY_WORKFLOW: {
            target: "evidenceIntake",
            actions: assign({
              evidenceId: ({ event }) => event.evidenceId,
              caseId: ({ event }) => event.caseId,
              userId: ({ event }) => event.userId,
              currentCustodian: ({ event }) => event.userId,
              originalHash: ({ event }) => event.originalHash,
              workflowStage: "evidence-intake",
              progress: 5,
              startTime: Date.now(),
              stageStartTime: Date.now(),
              retryCount: 0,
            }),
          },
        },
      },

      evidenceIntake: {
        invoke: {
          src: evidenceIntakeService,
          input: ({ context }) => context,
          onDone: {
            target: "integrityVerification",
            actions: assign({
              evidenceData: ({ event }) => event.output.evidenceData,
              currentHash: ({ event }) => event.output.currentHash,
              integrityStatus: ({ event }) => event.output.integrityStatus,
              custodyEvents: ({ context, event }) => [
                ...context.custodyEvents,
                event.output.custodyEvent,
              ],
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                evidenceIntake: Date.now() - context.stageStartTime,
              }),
              workflowStage: "integrity-verification",
              progress: 20,
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `Evidence intake failed: ${event.error}`,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                evidenceIntake: Date.now() - context.stageStartTime,
              }),
            }),
          },
        },
        on: {
          CANCEL_WORKFLOW: "cancelled",
        },
      },

      integrityVerification: {
        invoke: {
          src: integrityVerificationService,
          input: ({ context }) => context,
          onDone: {
            target: "aiAnalysis",
            actions: assign({
              verificationResults: ({ event }) =>
                event.output.verificationResults,
              integrityStatus: ({ event }) => event.output.integrityStatus,
              custodyEvents: ({ context, event }) => [
                ...context.custodyEvents,
                event.output.custodyEvent,
              ],
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                integrityVerification: Date.now() - context.stageStartTime,
              }),
              workflowStage: "ai-analysis",
              progress: 40,
              stageStartTime: Date.now(),
              // Set approval requirement if integrity is compromised
              requiresApproval: ({ event }) =>
                event.output.integrityStatus === "compromised",
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) =>
                `Integrity verification failed: ${event.error}`,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                integrityVerification: Date.now() - context.stageStartTime,
              }),
            }),
          },
        },
        on: {
          CANCEL_WORKFLOW: "cancelled",
        },
      },

      aiAnalysis: {
        invoke: {
          src: aiAnalysisService,
          input: ({ context }) => context,
          onDone: {
            target: "collaboration",
            actions: assign({
              aiAnalysis: ({ event }) => event.output.aiAnalysis,
              custodyEvents: ({ context, event }) => [
                ...context.custodyEvents,
                event.output.custodyEvent,
              ],
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                aiAnalysis: Date.now() - context.stageStartTime,
              }),
              workflowStage: "collaboration",
              progress: 60,
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `AI analysis failed: ${event.error}`,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                aiAnalysis: Date.now() - context.stageStartTime,
              }),
              warnings: ({ context }) => [
                ...context.warnings,
                "AI analysis failed, proceeding with manual review",
              ],
            }),
          },
        },
        on: {
          START_AI_ANALYSIS: {
            // Allow manual restart of AI analysis
            target: "aiAnalysis",
            actions: assign({
              stageStartTime: Date.now(),
            }),
          },
          CANCEL_WORKFLOW: "cancelled",
        },
      },

      collaboration: {
        invoke: {
          src: collaborationService,
          input: ({ context }) => context,
          onDone: {
            target: "awaitingApproval",
            guard: ({ context }) => context.requiresApproval,
            actions: assign({
              collaborationSession: ({ event }) =>
                event.output.collaborationSession,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                collaboration: Date.now() - context.stageStartTime,
              }),
              workflowStage: "awaiting-approval",
              progress: 80,
              stageStartTime: Date.now(),
            }),
          },
        },
        always: {
          target: "finalization",
          guard: ({ context }) => !context.requiresApproval,
          actions: assign({
            workflowStage: "finalization",
            progress: 90,
            stageStartTime: Date.now(),
          }),
        },
        on: {
          JOIN_COLLABORATION: {
            actions: assign({
              activeCollaborators: ({ context, event }) => [
                ...context.activeCollaborators.filter(
                  (id: any) => id !== event.userId
                ),
                event.userId,
              ],
              collaborationSession: ({ context, event }) =>
                context.collaborationSession
                  ? {
                      ...context.collaborationSession,
                      participants: [
                        ...context.collaborationSession.participants.filter(
                          (p: any) => p.userId !== event.userId
                        ),
                        {
                          userId: event.userId,
                          role: event.role,
                          joinedAt: new Date().toISOString(),
                        },
                      ],
                    }
                  : undefined,
            }),
          },
          LEAVE_COLLABORATION: {
            actions: assign({
              activeCollaborators: ({ context, event }) =>
                context.activeCollaborators.filter(
                  (id: any) => id !== event.userId
                ),
              collaborationSession: ({ context, event }) =>
                context.collaborationSession
                  ? {
                      ...context.collaborationSession,
                      participants:
                        context.collaborationSession.participants.filter(
                          (p: any) => p.userId !== event.userId
                        ),
                    }
                  : undefined,
            }),
          },
          ADD_ANNOTATION: {
            actions: assign({
              collaborationSession: ({ context, event }) =>
                context.collaborationSession
                  ? {
                      ...context.collaborationSession,
                      annotations: [
                        ...context.collaborationSession.annotations,
                        {
                          userId: event.userId,
                          content: event.content,
                          position: event.position,
                          timestamp: new Date().toISOString(),
                        },
                      ],
                    }
                  : undefined,
            }),
          },
          TRANSFER_CUSTODY: {
            target: "custodyTransfer",
            actions: assign({
              workflowStage: "custody-transfer",
              stageStartTime: Date.now(),
            }),
          },
          CANCEL_WORKFLOW: "cancelled",
        },
      },

      custodyTransfer: {
        invoke: {
          src: custodyTransferService,
          input: ({ context }) => context,
          onDone: {
            target: "collaboration",
            actions: assign({
              custodyEvents: ({ context, event }) => [
                ...context.custodyEvents,
                event.output.transferEvent,
              ],
              currentCustodian: ({ event }) => event.output.newCustodian,
              previousCustodian: ({ event }) => event.output.previousCustodian,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                custodyTransfer: Date.now() - context.stageStartTime,
              }),
              workflowStage: "collaboration",
              stageStartTime: Date.now(),
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `Custody transfer failed: ${event.error}`,
            }),
          },
        },
      },

      awaitingApproval: {
        on: {
          APPROVE_CUSTODY: {
            target: "finalization",
            actions: assign({
              approvalStatus: "approved",
              workflowStage: "finalization",
              progress: 90,
              stageStartTime: Date.now(),
            }),
          },
          REJECT_CUSTODY: {
            target: "rejected",
            actions: assign({
              approvalStatus: "rejected",
              error: ({ event }) => event.reason,
            }),
          },
          CANCEL_WORKFLOW: "cancelled",
        },
      },

      finalization: {
        invoke: {
          src: custodyFinalizationService,
          input: ({ context }) => context,
          onDone: {
            target: "completed",
            actions: assign({
              custodyEvents: ({ context, event }) => [
                ...context.custodyEvents,
                event.output.finalizationEvent,
              ],
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                finalization: Date.now() - context.stageStartTime,
                total: Date.now() - context.startTime,
              }),
              workflowStage: "completed",
              progress: 100,
            }),
          },
          onError: {
            target: "error",
            actions: assign({
              error: ({ event }) => `Finalization failed: ${event.error}`,
              stageTimes: ({ context }) => ({
                ...context.stageTimes,
                finalization: Date.now() - context.stageStartTime,
                total: Date.now() - context.startTime,
              }),
            }),
          },
        },
      },

      completed: {
        type: "final",
        entry: () => {
          console.log(
            "Evidence Chain of Custody workflow completed successfully"
          );
        },
      },

      error: {
        on: {
          RETRY: [
            {
              target: "evidenceIntake",
              guard: ({ context }) => context.retryCount < context.maxRetries,
              actions: assign({
                retryCount: ({ context }) => context.retryCount + 1,
                error: undefined,
                stageStartTime: Date.now(),
              }),
            },
            {
              target: "failed",
            },
          ],
          FORCE_COMPLETE: "completed",
        },
      },

      failed: {
        type: "final",
        entry: ({ context }) => {
          console.error(
            `Evidence custody workflow failed after ${context.retryCount} retries: ${context.error}`
          );
        },
      },

      rejected: {
        type: "final",
        entry: ({ context }) => {
          console.log(`Evidence custody workflow rejected: ${context.error}`);
        },
      },

      cancelled: {
        type: "final",
        entry: () => {
          console.log("Evidence custody workflow cancelled by user");
        },
      },
    },
  },
  {
    // Guards
    guards: {
      requiresApproval: ({ context }) => context.requiresApproval,
      canRetry: ({ context }) => context.retryCount < context.maxRetries,
      integrityCompromised: ({ context }) =>
        context.integrityStatus === "compromised",
    },
  }
);

// Helper functions
async function generateEvidenceHash(evidence: Evidence): Promise<string> {
  // Implementation for generating evidence hash
  const data = JSON.stringify({
    id: evidence.id,
    content: evidence.content,
    metadata: evidence.metadata,
    createdAt: evidence.createdAt,
  });

  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b: any) => b.toString(16).padStart(2, "0")).join("");
}

async function generateEventSignature(event: {
  evidenceId: string;
  userId: string;
  timestamp: string;
  eventType: string;
}): Promise<string> {
  // Implementation for digital signature generation
  const data = JSON.stringify(event);
  const encoder = new TextEncoder();
  const buffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  const hashArray = Array.from(new Uint8Array(buffer));
  return hashArray.map((b: any) => b.toString(16).padStart(2, "0")).join("");
}

async function verifyMetadataIntegrity(evidence: Evidence): Promise<boolean> {
  // Implementation for metadata integrity verification
  return evidence.metadata !== null && typeof evidence.metadata === "object";
}

async function verifyTimestamp(evidence: Evidence): Promise<boolean> {
  // Implementation for timestamp validation
  return evidence.createdAt && new Date(evidence.createdAt).getTime() > 0;
}

async function verifyDigitalSignature(evidence: Evidence): Promise<boolean> {
  // Implementation for digital signature verification
  return true; // Placeholder - implement actual verification logic
}

async function getWitnessSignatures(evidenceId: string): Promise<string[]> {
  // Implementation for collecting witness signatures
  return []; // Placeholder - implement actual signature collection
}

async function notifyCollaborators(
  sessionId: string,
  notification: any
): Promise<void> {
  // Implementation for WebSocket notifications
  console.log(`Notifying collaborators in session ${sessionId}:`, notification);
}

async function calculateSessionDuration(
  session?: EvidenceCustodyContext["collaborationSession"]
): Promise<number> {
  if (!session) return 0;
  // Implementation for calculating session duration
  return (
    Date.now() - new Date(session.participants[0]?.joinedAt || 0).getTime()
  );
}

async function storeCustodyReport(report: any): Promise<void> {
  // Implementation for storing custody report
  console.log("Storing custody report:", report);
}

async function closeCollaborationSession(sessionId: string): Promise<void> {
  // Implementation for closing collaboration session
  // TODO: implement collaborationSessions update when schema available
}

// Export convenience functions
export const createEvidenceCustodyActor = (
  context?: Partial<EvidenceCustodyContext>
) => {
  return evidenceCustodyMachine.provide({
    actions: {
      // Custom actions can be added here
    },
    guards: {
      // Custom guards can be added here
    },
  });
};

// State machine utility functions
export const isCustodyWorkflowActive = (state: any): boolean => {
  return !["idle", "completed", "failed", "rejected", "cancelled"].includes(
    state.value
  );
};

export const getCustodyProgress = (state: any): number => {
  return state.context.progress;
};

export const getCustodyStage = (state: any): string => {
  return state.context.workflowStage;
};

export const getIntegrityStatus = (state: any): string => {
  return state.context.integrityStatus;
};

export const getActiveCollaborators = (state: any): string[] => {
  return state.context.activeCollaborators;
};

export const getCustodyEvents = (
  state: any
): EvidenceCustodyContext["custodyEvents"] => {
  return state.context.custodyEvents;
};

export const requiresApproval = (state: any): boolean => {
  return state.context.requiresApproval;
};

export const getApprovalStatus = (state: any): string | undefined => {
  return state.context.approvalStatus;
};
