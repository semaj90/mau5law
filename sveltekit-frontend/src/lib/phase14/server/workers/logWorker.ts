
import { Worker } from 'bullmq';
// Orphaned content: // import { logQueue // Missing module
import { getEmbedding } from '$lib/server/services/embeddingService'; // You'll create this
import { storeLogInVectorDB } from '$lib/server/services/vectorDBService'; // You'll create this

console.log(' Log worker process started.');

// The worker listens for jobs on the 'logQueue'
const worker = new Worker('logQueue', async (job) => {
  try {
    console.log(`Processing log job ${job.id}...`);
    const logData = job.data;

    // 1. Semantic Understanding with Nomic Embed
    // Create an embedding from the core error message
    const embedding = await getEmbedding(logData.message);

    // 2. Enhanced RAG Integration
    // Store the original log and its vector in your database for future analysis
    await storeLogInVectorDB({
      log: logData,
      embedding: embedding,
    });
        console.log(`✅ Successfully processed and indexed log job ${job.id}.`);
    // NEXT STEP: This is where you would trigger the self-prompting/analysis agent
    // For now, we are just indexing the errors.
  } catch (error: any) {
    console.error(`❌ Failed to process log job ${job.id}:`, error);
    // It's important to throw the error so BullMQ knows the job failed and can retry it
    throw error;
  }
}, {
    // Configuration for the worker
    connection: {
        host: 'localhost', // Your Redis host
        port: 6379
    },
    concurrency: 5 // Process up to 5 logs at the same time
});

worker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed with error: ${err.message}`);
});