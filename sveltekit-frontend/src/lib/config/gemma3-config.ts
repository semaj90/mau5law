
import { join } from "path";

// Gemma3 Model Configuration for Legal AI Assistant
// Optimized configurations for your local Gemma3 model

export interface Gemma3ModelConfig {
  modelId: string;
  name: string;
  description: string;
  modelPath: string;
  contextLength: number;
  maxTokens: number;
  quantization: "f16" | "q4_0" | "q4_1" | "q5_0" | "q5_1" | "q8_0" | "q4_k_m";
  memoryRequirement: number; // in GB
  inferenceSpeed: "fast" | "medium" | "slow";
  quality: "high" | "medium" | "low";
  useCase: string[];
  promptTemplate: string;
  ollamaModel?: string;
  fallbackModel?: string;
  format: string;
  size: string;
}

const projectRoot = process.cwd();

export const GEMMA3_MODELS: Gemma3ModelConfig[] = [
  {
    modelId: "gemma3-legal-q4_k_m",
    name: "Gemma3 Legal (Q4_K_M)",
    description: "Local Gemma3 8B model optimized for legal analysis",
    modelPath: join(projectRoot, "gemma3Q4_K_M", "mo16.gguf"),
    contextLength: 8192,
    maxTokens: 4096,
    quantization: "q4_k_m",
    memoryRequirement: 6,
    inferenceSpeed: "medium",
    quality: "high",
    useCase: [
      "complex_analysis",
      "legal_research",
      "case_review",
      "contract_analysis",
      "document_summarization",
      "quick_queries"
],
    promptTemplate: `<bos><start_of_turn>user
{system_prompt}

{user_input}<end_of_turn>
<start_of_turn>model
`,
    ollamaModel: "gemma3:legal-latest",
    fallbackModel: "gemma3:legal-latest",
    format: "gguf",
    size: "8B"
}
];

export const LEGAL_SYSTEM_PROMPTS = {
  general: `You are a specialized legal AI assistant with expertise in:
- Case law analysis and legal research
- Document review and evidence evaluation
- Legal reasoning and argumentation
- Citation and precedent identification
- Procedural guidance and compliance

Always provide accurate, well-reasoned responses based on the provided context. Cite specific sources and indicate confidence levels in your analysis.`,

  case_analysis: `You are analyzing legal case documents. Focus on:
- Key facts and legal issues
- Applicable laws and regulations
- Relevant precedents and citations
- Potential arguments and counterarguments
- Risk assessment and recommendations

Base your analysis strictly on the provided evidence and documents.`,

  document_review: `You are reviewing legal documents for:
- Accuracy and completeness
- Legal compliance and requirements
- Potential issues or red flags
- Missing information or clauses
- Recommendations for improvement

Provide detailed, practical feedback based on legal best practices.`,

  evidence_analysis: `You are analyzing evidence for legal proceedings:
- Authenticity and reliability assessment
- Relevance to case facts and issues
- Chain of custody considerations
- Admissibility under evidence rules
- Impact on case strategy

Focus on factual analysis and legal implications.`
};

export const GEMMA3_INFERENCE_SETTINGS = {
  quick_response: {
    temperature: 0.3,
    topP: 0.8,
    topK: 20,
    repeatPenalty: 1.05,
    maxTokens: 512
},
  balanced: {
    temperature: 0.7,
    topP: 0.9,
    topK: 40,
    repeatPenalty: 1.1,
    maxTokens: 1024
},
  creative: {
    temperature: 0.9,
    topP: 0.95,
    topK: 60,
    repeatPenalty: 1.15,
    maxTokens: 2048
},
  precise: {
    temperature: 0.1,
    topP: 0.7,
    topK: 10,
    repeatPenalty: 1.05,
    maxTokens: 512
}
};

export function selectOptimalGemmaModel(
  contextLength: number,
  availableMemory: number,
): Gemma3ModelConfig | null {
  // Since we only have one model, check if it fits memory requirements
  const model = GEMMA3_MODELS[0];

  if (model.memoryRequirement <= availableMemory) {
    return model;
  }

  return null;
}

export function formatGemmaPrompt(
  template: string,
  systemPrompt: string,
  userInput: string,
): string {
  return template
    .replace("{system_prompt}", systemPrompt)
    .replace("{user_input}", userInput);
}

export function getSystemPromptForContext(
  queryType: string,
  hasLegalContext: boolean,
): string {
  if (hasLegalContext) {
    switch (queryType) {
      case "case_analysis":
        return LEGAL_SYSTEM_PROMPTS.case_analysis;
      case "document_review":
        return LEGAL_SYSTEM_PROMPTS.document_review;
      case "evidence_analysis":
        return LEGAL_SYSTEM_PROMPTS.evidence_analysis;
      default:
        return LEGAL_SYSTEM_PROMPTS.general;
    }
  }
  return LEGAL_SYSTEM_PROMPTS.general;
}

export function getInferenceSettings(
  priorityLevel: "quick" | "balanced" | "creative" | "precise" = "balanced",
) {
  return GEMMA3_INFERENCE_SETTINGS[priorityLevel];
}
