// Simple compilation test
export interface SimpleInferenceRequest {
  model: 'gemma3:270m' | 'gemma3-legal:latest' | 'embeddinggemma:latest';
  prompt: string;
  useCase: 'chat' | 'legal-analysis' | 'embedding' | 'similarity';
}

export function testModelRouting(request: SimpleInferenceRequest): string {
  const { model } = request;

  if (model === 'gemma3:270m') {
    return 'wasm';
  }
  if (model === 'embeddinggemma:latest') {
    return 'webgl2';
  }
  if (model === 'gemma3-legal:latest') {
    return 'tensorrt';
  }

  return 'fallback';
}

const testRequest: SimpleInferenceRequest = {
  model: 'gemma3:270m',
  prompt: 'test',
  useCase: 'chat'
};

console.log('✅ Simple runtime test compiled successfully!');
console.log('Routing result:', testModelRouting(testRequest));