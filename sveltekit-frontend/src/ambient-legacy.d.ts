// Temporary legacy ambient declarations to reduce TypeScript noise during phased cleanup.
// Narrow and delete once real implementations are added.

// Generic Redis shim (methods used in various legacy endpoints)
declare interface RedisLegacy {
  connect?: () => Promise<void>;
  ping?: () => Promise<string>;
  quit?: () => Promise<void>;
  get?: (key: string) => Promise<string | null>;
  set?: (key: string, value: string, mode?: string, duration?: number) => Promise<unknown>;
  keys?: (pattern: string) => Promise<string[]>;
  xAdd?: (...args: unknown[]) => Promise<unknown>;
}

declare const redis: RedisLegacy;

// Enhanced Ollama service placeholder methods referenced but not yet implemented
interface EnhancedOllamaServiceLegacy {
  generate?: (prompt: string, opts?: unknown) => Promise<unknown>;
  generateCompletion?: (prompt: string, opts?: unknown) => Promise<unknown>;
  extractLegalEntities?: (text: string) => Promise<string[]>;
  classifyLegalDocument?: (text: string) => Promise<string>;
  generateEmbeddings?: (text: string | string[]) => Promise<number[] | number[][]>;
  generateLegalEmbeddings?: (text: string | string[]) => Promise<number[] | number[][]>;
  healthCheck?: () => Promise<{ ok: boolean }>;
}

declare const enhancedOllamaService: EnhancedOllamaServiceLegacy;

// Misc legacy symbols
interface CrewAIOrchestratorLegacy {}
interface LegalAgentsLegacy {}

declare const crewAIOrchestrator: CrewAIOrchestratorLegacy;
declare const LEGAL_AGENTS: LegalAgentsLegacy;

declare module '$lib/services/enhanced-rag-integration.js' {
  export const enhancedRAGService: unknown;
}

declare module '$lib/*';

declare module '$lib/server/*';

declare module '$lib/server/db/*';

declare module '$lib/server/db';

declare module '$lib/server/db/schema-postgres';

declare module '$lib/server/db/schema-unified';

declare module '$lib/server/vector/qdrant';

declare module '$lib/services/semantic-search';

declare module '$lib/services/performance-optimizer';

declare module '$lib/services/security';

declare module '$lib/services/neo4j-planner-singleton';
