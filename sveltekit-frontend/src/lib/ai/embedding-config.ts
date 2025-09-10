/**
 * Embedding Configuration for Legal AI
 * Defines embedding models with Gemma embeddings and nomic-embed-text fallback
 */

export interface EmbeddingModelConfig {
  id: string;
  name: string;
  provider: 'ollama' | 'openai' | 'huggingface' | 'local';
  dimensions: number;
  maxTokens: number;
  cost?: number;
  latency: number;
  accuracy: number;
  specialized: boolean;
  capabilities: string[];
}

export const EMBEDDING_MODELS: Record<string, EmbeddingModelConfig> = {
  // Primary: Gemma embeddings (optimized for legal and general tasks)
  'embeddinggemma': {
    id: 'embeddinggemma',
    name: 'Gemma Embeddings',
    provider: 'ollama',
    dimensions: 768,
    maxTokens: 2048,
    latency: 100,
    accuracy: 0.90,
    specialized: true,
    capabilities: ['general-text', 'semantic-search', 'similarity', 'legal-text', 'context-understanding']
  },

  'embeddinggemma:latest': {
    id: 'embeddinggemma:latest',
    name: 'Gemma Embeddings Latest',
    provider: 'ollama',
    dimensions: 768,
    maxTokens: 2048,
    latency: 95,
    accuracy: 0.91,
    specialized: true,
    capabilities: ['general-text', 'semantic-search', 'similarity', 'legal-text', 'context-understanding']
  },

  // Fallback: nomic-embed-text (reliable backup)
  'nomic-embed-text': {
    id: 'nomic-embed-text',
    name: 'Nomic Embed Text',
    provider: 'ollama',
    dimensions: 768,
    maxTokens: 2048,
    latency: 120,
    accuracy: 0.85,
    specialized: false,
    capabilities: ['general-text', 'semantic-search', 'similarity', 'legal-text']
  },

  // Specialized legal embedding
  'legal-bert-embeddings': {
    id: 'legal-bert-embeddings',
    name: 'Legal-BERT Embeddings',
    provider: 'local',
    dimensions: 768,
    maxTokens: 512,
    latency: 50,
    accuracy: 0.90,
    specialized: true,
    capabilities: ['legal-text', 'case-law', 'legal-entity-extraction']
  }
};

export const EMBEDDING_FALLBACK_CHAINS = {
  'legal-general': [
    'embeddinggemma:latest',
    'embeddinggemma',
    'nomic-embed-text',
    'legal-bert-embeddings'
  ],
  'legal-fast': [
    'embeddinggemma',
    'legal-bert-embeddings',
    'nomic-embed-text'
  ],
  'general': [
    'embeddinggemma:latest',
    'embeddinggemma',
    'nomic-embed-text'
  ]
};

export function getOptimalEmbeddingModel(
  taskType: 'legal-general' | 'legal-fast' | 'general' = 'legal-general',
  availableModels: string[] = []
): string[] {
  const chain = EMBEDDING_FALLBACK_CHAINS[taskType];
  
  if (availableModels.length === 0) {
    return chain;
  }
  
  // Filter to only available models
  const availableChain = chain.filter(modelId => availableModels.includes(modelId));
  
  // If no models from the chain are available, return the full chain
  return availableChain.length > 0 ? availableChain : chain;
}

export function getEmbeddingModelConfig(modelId: string): EmbeddingModelConfig | null {
  return EMBEDDING_MODELS[modelId] || null;
}

export function isLegalSpecializedEmbedding(modelId: string): boolean {
  const config = getEmbeddingModelConfig(modelId);
  return config?.specialized && config.capabilities.includes('legal-text') || false;
}