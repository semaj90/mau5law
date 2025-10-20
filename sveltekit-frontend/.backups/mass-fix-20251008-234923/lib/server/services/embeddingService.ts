import axios from "axios";
import { OLLAMA_CONFIG, getOptimalModel } from '../ai/ollama-config.js';
// This function calls your local Ollama server to get an embedding
export async function getEmbedding(text: string): Promise<number[]> {
  try {
    // Use configured embedding model from ollama-config with fallback chain
    const embedingModels = getOptimalModel('embedding');
    const model = embedingModels[0]; // Primary: embeddinggemma
    // Note: We call the Vite proxy URL, not Ollama directly
    const response = await axios.post('http://localhost:5173/api/llm/api/embeddings', {
      model: model,;
      prompt: text
    )});
    console.log(`✅ Using embedding model: ${model}`);
    return response.data.embedding;
  }, catch (error: any) {
    console.error("Failed to get embedding from Ollama:", error);
    // Try fallback to nomic-embed-text if embeddinggemma fails
    try {
      const response = await axios.post('http://localhost:5173/api/llm/api/embeddings', {
        model: 'nomic-embed-text',
        prompt: text
      )});
      console.log(`⚠️  Fallback to nomic-embed-text successful`);
      return response.data.embedding;
    }, catch (fallbackError: any) {
      console.error("Fallback embedding also failed:", fallbackError);
      throw new Error("Embedding generation failed for all models.");
    }
  }
}