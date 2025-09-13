/**
 * XState v5 Service Adapter Logic Layer
 * Provides clean reactive stores that wrap XState v5 machines
 * and expose simple state to UI components
 */

import { writable, derived, type Readable } from 'svelte/store';
import { createActor, type Actor, type AnyStateMachine, type AnyEventObject } from 'xstate';

// Simple state interfaces for UI consumption
export interface MachineState<TContext = any> {
  value: string;
  context: TContext;
  matches: (value: string) => boolean;
  can: (event: string) => boolean;
  hasTag: (tag: string) => boolean;
}

export interface MachineService<TContext = any> {
  state: Readable<MachineState<TContext>>;
  send: (event: AnyEventObject | string) => void;
  start: () => void;
  stop: () => void;
  isRunning: Readable<boolean>;
}

/**
 * XState v5 Service Adapter
 * Wraps XState v5 actors and provides Svelte-friendly reactive state
 */
export class XStateServiceAdapter<TMachine extends AnyStateMachine> {
  private actor: Actor<TMachine> | null = null;
  private stateStore = writable<MachineState>();
  private runningStore = writable<boolean>(false);

  constructor(private machine: TMachine) {}

  createService(): MachineService {
    const { subscribe } = this.stateStore;

    return {
      state: { subscribe },
      send: (event: AnyEventObject | string) => {
        if (this.actor) {
          // Handle string events by converting to event object
          const eventObj = typeof event === 'string' ? { type: event } : event;
          this.actor.send(eventObj);
        }
      },
      start: () => this.start(),
      stop: () => this.stop(),
      isRunning: { subscribe: this.runningStore.subscribe }
    };
  }

  private start(): void {
    if (this.actor) return;

    this.actor = createActor(this.machine);
    
    // Subscribe to actor state changes
    this.actor.subscribe((snapshot) => {
      const simpleState: MachineState = {
        value: typeof snapshot.value === 'string' ? snapshot.value : JSON.stringify(snapshot.value),
        context: snapshot.context,
        matches: (value: string) => snapshot.matches(value),
        can: (event: string) => snapshot.can({ type: event }),
        hasTag: (tag: string) => snapshot.hasTag(tag)
      };
      
      this.stateStore.set(simpleState);
    });

    this.actor.start();
    this.runningStore.set(true);
  }

  private stop(): void {
    if (this.actor) {
      this.actor.stop();
      this.actor = null;
      this.runningStore.set(false);
    }
  }
}

// Specific service adapters for different machine types
export interface ChatMachineContext {
  messages: Array<{ role: string; content: string }>;
  currentMessage: string;
  isTyping: boolean;
  isLoading: boolean;
  session: any;
  error: string;
  confidence: number;
  model: string;
}

export interface SearchMachineContext {
  query: string;
  results: any[];
  loading: boolean;
  error: any;
  confidence: number;
  sources: any[];
}

export interface UploadMachineContext {
  files: any[];
  currentFile: any;
  progress: number;
  error: any;
  results: any[];
  services: {
    postgresql: boolean;
    minio: boolean;
    qdrant: boolean;
    redis: boolean;
    rabbitmq: boolean;
    ollama: boolean;
  };
}

/**
 * Factory functions for creating typed service adapters
 */
export function createChatService(machine: AnyStateMachine): MachineService<ChatMachineContext> {
  const adapter = new XStateServiceAdapter(machine);
  return adapter.createService();
}

export function createSearchService(machine: AnyStateMachine): MachineService<SearchMachineContext> {
  const adapter = new XStateServiceAdapter(machine);
  return adapter.createService();
}

export function createUploadService(machine: AnyStateMachine): MachineService<UploadMachineContext> {
  const adapter = new XStateServiceAdapter(machine);
  return adapter.createService();
}

/**
 * Generic service creator for any machine
 */
export function createMachineService<TContext = any>(
  machine: AnyStateMachine
): MachineService<TContext> {
  const adapter = new XStateServiceAdapter(machine);
  return adapter.createService();
}

/**
 * Helper utilities for common XState patterns
 */
export const xstateUtils = {
  // Convert XState v4 style state access to v5
  getStateValue: (state: MachineState) => state.value,
  getContext: (state: MachineState) => state.context,
  
  // Common state checks
  isState: (state: MachineState, stateName: string) => state.matches(stateName),
  canTransition: (state: MachineState, event: string) => state.can(event),
  
  // Safe property access
  safeGet: <T>(obj: any, path: string, defaultValue: T): T => {
    try {
      return path.split('.').reduce((o, p) => o?.[p], obj) ?? defaultValue;
    } catch {
      return defaultValue;
    }
  }
};

/**
 * Migration helpers for existing XState v4 code
 */
export const migrationHelpers = {
  // Convert old machine.state access to new pattern
  wrapLegacyMachine: (machine: AnyStateMachine) => {
    const service = createMachineService(machine);
    service.start();
    
    return {
      ...service,
      // Legacy compatibility properties
      snapshot: service.state,
      // Legacy send method that accepts string or object
      send: service.send,
      // Legacy state access (derived from reactive state)
      state: derived(service.state, $state => ({
        value: $state.value,
        context: $state.context,
        matches: $state.matches,
        can: $state.can
      }))
    };
  }
};