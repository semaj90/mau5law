
/**
 * XState Machines with Go Microservice Integration
 * Comprehensive state management for AI-native architecture
 */

// Re-export with explicit names to avoid conflicts across modules
export { getProcessingProgress } from './aiProcessingMachine';
// Do not re-export non-exported types; keep barrel safe

export {
	documentMachine
} from './documentMachine';
export type { DocumentContext, DocumentEvent } from './documentMachine';

export { goMicroserviceMachine } from './goMicroserviceMachine';
// export type { GoMicroserviceContext } from './goMicroserviceMachine'; // not exported in file

export { userWorkflowMachine } from './userWorkflowMachine';
export type { UserWorkflowContext } from './userWorkflowMachine';

// types.ts can contain broad names that collide; pick safe, explicit exports only
// Narrow export surface to avoid missing symbol errors
// export type { MachineRegistry, MachineId } from './types';