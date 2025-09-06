
import type { RequestHandler } from './$types';

// Lightweight in-memory topology extractor (would be replaced by real scanners / registries)
const backendServices = [
  { id: 'postgres', type: 'db' },
  { id: 'redis', type: 'cache' },
  { id: 'qdrant', type: 'vector' },
  { id: 'ollama', type: 'llm' },
  { id: 'go-grpc', type: 'service' },
  { id: 'quic-gateway', type: 'edge' }
];

const frontendModules = [
  { id: 'yorha-ui', type: 'ui-lib' },
  { id: 'autosolve', type: 'automation' },
  { id: 'unified-router', type: 'routing' }
];

const dbEntities = [
  { id: 'users', type: 'table' },
  { id: 'legal_documents', type: 'table' },
  { id: 'embedding_cache', type: 'table' }
];

export const GET: RequestHandler = async () => {
  const nodes = [...backendServices, ...frontendModules, ...dbEntities];
  const links = [
    { source: 'frontend', target: 'yorha-ui', kind: 'uses' },
    { source: 'yorha-ui', target: 'unified-router', kind: 'fetches' },
    { source: 'unified-router', target: 'quic-gateway', kind: 'proxy' },
    { source: 'quic-gateway', target: 'go-grpc', kind: 'forward' },
    { source: 'go-grpc', target: 'postgres', kind: 'reads' },
    { source: 'go-grpc', target: 'qdrant', kind: 'vector' },
    { source: 'go-grpc', target: 'redis', kind: 'cache' },
    { source: 'autosolve', target: 'legal_documents', kind: 'analyzes' },
    { source: 'autosolve', target: 'embedding_cache', kind: 'updates' }
  ];
  return json({ nodes, links, generatedAt: new Date().toISOString() });
};
