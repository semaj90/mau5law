// XState Machine Exports
// Centralized export for all state machines
export { default as documentUploadMachine } from './document-upload-machine';
export { default as caseCreationMachine } from './case-creation-machine';
export { default as searchMachine } from './search-machine';
export { default as aiAnalysisMachine } from './ai-analysis-machine';
// Re-export existing machines
export { agentShellMachine } from './agentShellMachine';
export { legalAIMachine } from './legalAIMachine';
export { authMachine } from './auth-machine';
// export { uploadMachine } from './uploadMachine'; // disabled: uploadMachine file is intentionally disabled
export { sessionMachine } from './sessionMachine';
// AI Processing and Microservice machines
export { default as aiProcessingMachine } from './ai-analysis-machine';
export { default as goMicroserviceMachine } from './enhanced-legal-case-machine';
// AI Task creators and utilities
// Define specific data interfaces for each AI task type
// These can be expanded with actual properties as needed.
export interface AnalysisData {
  /* Add specific properties for analysis tasks here */
}
export interface ProcessingData {
  /* Add specific properties for processing tasks here */
}
export interface SearchData {
  /* Add specific properties for search tasks here */
}
// Union type for all possible AI task data types
export type AITaskPayload = AnalysisData | ProcessingData | SearchData;
// Union type for the AI task types
export type AITaskType = 'analysis' | 'processing' | 'search';
// Generic AITask interface
export interface AITask<T extends AITaskPayload = AITaskPayload> {
  id: string;
  type: AITaskType;
  data: T;
  timestamp: number;
}
export const createAITask = <T extends AITaskPayload>(type: AITaskType, data: T): AITask<T> => ({
  id: `${type}_${Date.now()}`,
  type,
  data,
  timestamp: Date.now(),
});
export const aiTaskCreators = {
  analysis: (data: AnalysisData) => createAITask('analysis', data),
  processing: (data: ProcessingData) => createAITask('processing', data),
  search: (data: SearchData) => createAITask('search', data),
};
// Export types
export type { DocumentUploadContext } from './document-upload-machine';
export type { CaseCreationContext } from './case-creation-machine';
export type { SearchContext } from './search-machine';
export type { AIAnalysisContext } from './ai-analysis-machine';
// NOTE: file touched to trigger Vite rebuild after machine cleanup
