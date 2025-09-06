import crypto from "crypto";

// XState Legal Form Machine for AI-Aware Browser States
// Integrates with Phase 8 Matrix UI System and Context7 MCP

import { setup, assign, type StateValue, fromPromise } from "xstate";

export interface LegalFormContext {
  evidenceFiles: File[];
  caseTitle: string;
  caseDescription: string;
  evidenceType: "digital" | "physical" | "testimony" | "forensic";
  priority: "low" | "medium" | "high" | "critical";
  assignedTo: string;
  aiSuggestions: string[];
  confidence: number;
  currentStep: number;
  totalSteps: number;
  validationErrors: Record<string, string>;
  aiRecommendations: {
    nextAction: string;
    reasoning: string;
    confidence: number;
  }[];
}

export type LegalFormEvent =
  | { type: "NEXT" }
  | { type: "BACK" }
  | { type: "SUBMIT" }
  | { type: "UPLOAD_EVIDENCE"; files: File[] }
  | { type: "UPDATE_CASE_DETAILS"; title: string; description: string }
  | {
      type: "SET_EVIDENCE_TYPE";
      evidenceType: LegalFormContext["evidenceType"];
    }
  | { type: "SET_PRIORITY"; priority: LegalFormContext["priority"] }
  | { type: "AI_SUGGESTION"; suggestions: string[] }
  | { type: "VALIDATE_STEP" }
  | { type: "RESET_FORM" }
  | { type: "REQUEST_AI_HELP" }
  | { type: "APPLY_AI_RECOMMENDATION"; recommendation: string };

export const legalFormMachine = setup({
  types: {
    context: {} as LegalFormContext,
    events: {} as LegalFormEvent,
  },
  actors: {
    submitCaseService: fromPromise(
      async ({ input }: { input: LegalFormContext }) => {
        await new Promise((resolve) => setTimeout(resolve, 2000));
        const success = Math.random() > 0.1; // 90% success rate
        if (!success) {
          throw new Error("Submission failed - please try again");
        }
        return {
          caseId:
            typeof crypto !== "undefined" && crypto.randomUUID
              ? crypto.randomUUID()
              : Math.random().toString(36).slice(2),
          success: true,
          message: "Case submitted successfully",
        };
      }
    ),
  },
}).createMachine({
  id: "legalForm",
  initial: "evidenceUpload",
  context: {
    evidenceFiles: [],
    caseTitle: "",
    caseDescription: "",
    evidenceType: "digital",
    priority: "medium",
    assignedTo: "",
    aiSuggestions: [],
    confidence: 0,
    currentStep: 1,
    totalSteps: 4,
    validationErrors: {},
    aiRecommendations: [],
  },

  states: {
    evidenceUpload: {
      meta: {
        description: "Upload and classify evidence files",
        aiContext: "evidence_management",
        requiredFields: ["evidenceFiles"],
        suggestedHelp: "Upload evidence files to begin case analysis",
      },

      on: {
        UPLOAD_EVIDENCE: {
          actions: assign({
            evidenceFiles: ({ event }) => event.files,
            confidence: ({ context, event }) => {
              // AI confidence based on file types and count
              const hasDigitalEvidence = event.files.some(
                (f) => f.type.includes("pdf") || f.type.includes("image")
              );
              return hasDigitalEvidence
                ? Math.min(context.confidence + 30, 100)
                : context.confidence + 10;
            },
          }),
        },

        SET_EVIDENCE_TYPE: {
          actions: assign({
            evidenceType: ({ event }) => event.evidenceType,
            aiSuggestions: ({ event }) => {
              // Generate AI suggestions based on evidence type
              const suggestions = {
                digital: [
                  "Consider OCR analysis",
                  "Check metadata integrity",
                  "Verify timestamps",
                ],
                physical: [
                  "Document chain of custody",
                  "Photograph all angles",
                  "Note condition",
                ],
                testimony: [
                  "Schedule witness interview",
                  "Prepare statement template",
                  "Verify identity",
                ],
                forensic: [
                  "Lab analysis required",
                  "Expert testimony needed",
                  "Technical validation",
                ],
              };
              return suggestions[event.evidenceType] || [];
            },
          }),
        },

        NEXT: {
          target: "caseDetails",
          guard: ({ context }) => context.evidenceFiles.length > 0,
          actions: assign({
            currentStep: 2,
            confidence: ({ context }) => Math.min(context.confidence + 20, 100),
          }),
        },

        REQUEST_AI_HELP: {
          actions: assign({
            aiRecommendations: () => [
              {
                nextAction: "Upload evidence files",
                reasoning: "Evidence is required to proceed with case analysis",
                confidence: 95,
              },
            ],
          }),
        },
      },
    },

    caseDetails: {
      meta: {
        description: "Enter case title, description, and priority",
        aiContext: "case_management",
        requiredFields: ["caseTitle", "caseDescription", "priority"],
        suggestedHelp: "Provide case details for proper categorization",
      },

      entry: assign({
        aiRecommendations: ({ context }) => {
          const recommendations = [];

          // AI recommendation based on evidence type
          if (context.evidenceType === "forensic") {
            recommendations.push({
              nextAction: "Set priority to HIGH",
              reasoning:
                "Forensic evidence typically requires urgent processing",
              confidence: 85,
            });
          }

          // AI recommendation based on file count
          if (context.evidenceFiles.length > 10) {
            recommendations.push({
              nextAction: "Consider bulk processing workflow",
              reasoning: "Large evidence sets benefit from automated analysis",
              confidence: 78,
            });
          }

          return recommendations;
        },
      }),

      on: {
        UPDATE_CASE_DETAILS: {
          actions: assign({
            caseTitle: ({ event }) => {
              if (event.type === "UPDATE_CASE_DETAILS") {
                return event.title;
              }
              return "";
            },
            caseDescription: ({ event }) => {
              if (event.type === "UPDATE_CASE_DETAILS") {
                return event.description;
              }
              return "";
            },
            confidence: ({ context, event }) => {
              // AI confidence boost for detailed descriptions
              if (event.type === "UPDATE_CASE_DETAILS") {
                const hasDetail = event.description.length > 50;
                return hasDetail
                  ? Math.min(context.confidence + 15, 100)
                  : context.confidence + 5;
              }
              return context.confidence;
            },
          }),
        },

        SET_PRIORITY: {
          actions: assign({
            priority: ({ event }) => event.priority,
            aiSuggestions: ({ event, context }) => {
              // AI suggestions based on priority and evidence type
              if (
                event.priority === "critical" &&
                context.evidenceType === "digital"
              ) {
                return [
                  "Enable real-time monitoring",
                  "Assign senior analyst",
                  "Fast-track processing",
                ];
              }
              return context.aiSuggestions;
            },
          }),
        },

        VALIDATE_STEP: {
          actions: assign({
            validationErrors: ({ context }) => {
              const errors: Record<string, string> = {};
              if (!context.caseTitle.trim()) {
                errors.caseTitle = "Case title is required";
              }
              if (!context.caseDescription.trim()) {
                errors.caseDescription = "Case description is required";
              }
              return errors;
            },
          }),
        },

        NEXT: {
          target: "review",
          guard: ({ context }) =>
            context.caseTitle.trim() &&
            context.caseDescription.trim() &&
            Object.keys(context.validationErrors).length === 0,
          actions: assign({
            currentStep: 3,
            confidence: ({ context }) => Math.min(context.confidence + 25, 100),
          }),
        },

        BACK: {
          target: "evidenceUpload",
          actions: assign({ currentStep: 1 }),
        },

        REQUEST_AI_HELP: {
          actions: assign({
            aiRecommendations: ({ context }) => [
              {
                nextAction: "Use case templates",
                reasoning: `For ${context.evidenceType} evidence, consider using predefined templates`,
                confidence: 82,
              },
            ],
          }),
        },
      },
    },

    review: {
      meta: {
        description: "Review all case details before submission",
        aiContext: "quality_assurance",
        requiredFields: [],
        suggestedHelp: "Review and verify all case information",
      },

      entry: assign({
        confidence: ({ context }) => {
          // AI confidence calculation for complete case
          let confidence = 60; // Base confidence

          if (context.evidenceFiles.length > 0) confidence += 15;
          if (context.caseTitle.length > 10) confidence += 10;
          if (context.caseDescription.length > 50) confidence += 10;
          if (context.priority === "high" || context.priority === "critical")
            confidence += 5;

          return Math.min(confidence, 100);
        },

        aiRecommendations: ({ context }) => {
          const recommendations = [];

          // AI quality assurance recommendations
          if (context.confidence < 80) {
            recommendations.push({
              nextAction: "Add more evidence details",
              reasoning: "Case confidence is below optimal threshold",
              confidence: 90,
            });
          }

          if (
            context.evidenceType === "testimony" &&
            context.evidenceFiles.length === 0
          ) {
            recommendations.push({
              nextAction: "Attach witness statement document",
              reasoning: "Testimony cases benefit from written statements",
              confidence: 85,
            });
          }

          return recommendations;
        },
      }),

      on: {
        SUBMIT: {
          target: "submitting",
          actions: assign({
            currentStep: 4,
            confidence: ({ context }) => Math.min(context.confidence + 10, 100),
          }),
        },

        BACK: {
          target: "caseDetails",
          actions: assign({ currentStep: 2 }),
        },

        APPLY_AI_RECOMMENDATION: {
          actions: assign({
            aiSuggestions: ({ context, event }) => [
              ...context.aiSuggestions,
              `Applied: ${event.recommendation}`,
            ],
          }),
        },
      },
    },

    submitting: {
      meta: {
        description: "Submitting case to system",
        aiContext: "case_submission",
        requiredFields: [],
        suggestedHelp: "Case is being processed...",
      },

      invoke: {
        id: "submitCase",
        src: "submitCaseService",
        onDone: {
          target: "success",
          actions: assign({
            confidence: 100,
            aiSuggestions: [
              "Case submitted successfully",
              "Track progress in dashboard",
            ],
          }),
        },
        onError: {
          target: "error",
          actions: assign({
            validationErrors: {
              submit: "Case submission failed. Please try again.",
            },
          }),
        },
      },
    },

    success: {
      meta: {
        description: "Case successfully submitted",
        aiContext: "completion",
        suggestedHelp: "Case has been created successfully",
      },

      on: {
        RESET_FORM: {
          target: "evidenceUpload",
          actions: assign({
            evidenceFiles: [],
            caseTitle: "",
            caseDescription: "",
            evidenceType: "digital",
            priority: "medium",
            assignedTo: "",
            aiSuggestions: [],
            confidence: 0,
            currentStep: 1,
            validationErrors: {},
            aiRecommendations: [],
          }),
        },
      },
    },
    error: {
      meta: {
        description: "Error occurred during submission",
        aiContext: "error_handling",
        suggestedHelp: "Please review the error and try again",
      },
      on: {
        BACK: {
          target: "review",
          actions: assign({
            currentStep: 3,
            validationErrors: {},
          }),
        },
        REQUEST_AI_HELP: {
          actions: assign({
            aiRecommendations: [
              {
                nextAction: "Check network connection",
                reasoning: "Submission errors are often connectivity related",
                confidence: 75,
              },
            ],
          }),
        },
      },
    },
  },
});

// Helper functions for AI-aware state management
export function getStateDescription(state: StateValue): string {
  const descriptions = {
    evidenceUpload: "Uploading and classifying evidence",
    caseDetails: "Entering case information",
    review: "Reviewing case details",
    submitting: "Submitting case to system",
    success: "Case submitted successfully",
    error: "Error occurred during submission",
  };

  return descriptions[state as keyof typeof descriptions] || "Unknown state";
}

export function getAISuggestions(
  context: LegalFormContext,
  state: StateValue
): string[] {
  const baseSuggestions = context.aiSuggestions;

  // Add state-specific AI suggestions
  const stateSuggestions = {
    evidenceUpload: [
      "Drag and drop files here",
      "Supported formats: PDF, JPG, PNG, DOC",
    ],
    caseDetails: [
      "Be specific in descriptions",
      "Include relevant case law if available",
    ],
    review: ["Double-check evidence classification", "Verify priority level"],
    submitting: ["Do not close this window", "Submission in progress..."],
  };

  const stateSpecific =
    stateSuggestions[state as keyof typeof stateSuggestions] || [];
  return [...baseSuggestions, ...stateSpecific];
}

export function calculateProgressPercentage(context: LegalFormContext): number {
  return Math.round((context.currentStep / context.totalSteps) * 100);
}

export function getNextPossibleActions(state: StateValue): string[] {
  const actions = {
    evidenceUpload: [
      "UPLOAD_EVIDENCE",
      "SET_EVIDENCE_TYPE",
      "NEXT",
      "REQUEST_AI_HELP",
    ],
    caseDetails: [
      "UPDATE_CASE_DETAILS",
      "SET_PRIORITY",
      "VALIDATE_STEP",
      "NEXT",
      "BACK",
    ],
    review: ["SUBMIT", "BACK", "APPLY_AI_RECOMMENDATION"],
    submitting: [],
    success: ["RESET_FORM"],
    error: ["BACK", "REQUEST_AI_HELP"],
  };

  return actions[state as keyof typeof actions] || [];
}

/**
 * Generate best practices for legal form state management using #context7
 * Leverages semantic search, memory, and agent recommendations.
 *
 * @param context LegalFormContext
 * @param state StateValue
 * @returns string[] Array of best practice recommendations
 */
export async function generateBestPractices(
  context: LegalFormContext,
  state: StateValue
): Promise<string[]> {
  // #context7: Use semantic search, memory, and agent orchestration for best practices
  let dynamicPractices: string[] = [];
  try {
    // Use Context7 MCP semantic search for dynamic best practices
    const query = `best practices for legal form state: ${state}`;
    const results = await semanticSearch(query);
    if (Array.isArray(results) && results.length > 0) {
      dynamicPractices = results
        .map((r: any) => r.text || r.snippet || r)
        .filter(Boolean);
    }
  } catch (err: any) {
    // Fallback to static if MCP tools unavailable
    console.warn(
      "Context7 semantic search unavailable, using static best practices.",
      err
    );
  }
  const basePractices = [
    "Always validate evidence file types and sizes before upload.",
    "Use AI suggestions to improve case detail quality.",
    "Leverage agent recommendations for error handling and next steps.",
    "Ensure all required fields are filled before submission.",
    "Log all state transitions and user actions for auditability.",
    "Utilize semantic search to suggest relevant legal precedents or templates.",
    "Provide clear user feedback on submission status and errors.",
  ];
  // Combine static and dynamic recommendations, deduplicated
  return Array.from(new Set([...dynamicPractices, ...basePractices]));
}

export default legalFormMachine;
