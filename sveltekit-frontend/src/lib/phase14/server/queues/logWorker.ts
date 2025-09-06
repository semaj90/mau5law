/// <reference types="vite/client" />

import { Worker } from "bullmq";
import { logQueue } from './logQueue';

// Define the type for the log entry data
export interface LogEntryData {
  timestamp: string;
  level: string;
  message: string;
}

// Create a new BullMQ Worker instance
// Ensure your Redis connection details are correct (same as logQueue)
const logWorker = new Worker<LogEntryData>('logQueue', async (job) => {
  const { timestamp, level, message } = job.data;

  console.log(`Processing log job ${job.id}: ${message}`);

  // --- Placeholder for Ollama Nomic Embeddings --- 
  // Replace with actual Ollama API call to get embeddings
  try {
    const ollamaEndpoint = import.meta.env.OLLAMA_EMBEDDING_URL || 'http://localhost:11434/api/embeddings';
    const embeddingModel = import.meta.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text';

    console.log(`Generating embedding for: "${message}" using ${embeddingModel}`);
    
    const response = await fetch(ollamaEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: embeddingModel,
        prompt: message,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama embedding failed: ${response.statusText}`);
    }

    const data = await response.json();
    const embedding = data.embedding; // Assuming the embedding is directly in data.embedding

    if (!embedding) {
      throw new Error("Ollama response did not contain an embedding.");
    }

    console.log(`Generated embedding (first 5 elements): ${embedding.slice(0, 5)}...`);

    // --- Placeholder for RAG Integration (e.g., Qdrant) --- 
    // Replace with actual vector database insertion logic
    console.log(`Integrating log into RAG system: ${message}`);
    // Example: qdrantClient.upsert({ points: [{ id: someId, vector: embedding, payload: { timestamp, level, message } }] });

    // For now, just simulate success
    console.log(`Successfully processed log: ${message}`);

  } catch (error: any) {
    console.error(`Error processing log job ${job.id}:`, error);
    throw error; // Re-throw to mark the job as failed in BullMQ
  }
}, {
  connection: {
    host: 'localhost',
    port: 6379,
  },
});

console.log('BullMQ Log Worker started.');

// Export the worker instance if you need to manage it from elsewhere
export default logWorker;