import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { ollamaService } from '$lib/server/ai/ollama-service';

interface BatchTask {
  id: string;
  type: 'extract-entities' | 'classify-document' | 'generate-embeddings';
  text: string;
  options?: any;
}

interface BatchResult {
  taskId: string;
  success: boolean;
  result?: any;
  error?: string;
  processingTime: number;
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const { tasks, options = {} } = await request.json();
    
    if (!Array.isArray(tasks) || tasks.length === 0) {
      return json({ error: 'Tasks array is required and must not be empty' }, { status: 400 });
    }
    
    // Validate tasks
    for (const task of tasks) {
      if (!task.id || !task.type || !task.text) {
        return json({ 
          error: 'Each task must have id, type, and text fields' 
        }, { status: 400 });
      }
      
      if (!['extract-entities', 'classify-document', 'generate-embeddings'].includes(task.type)) {
        return json({ 
          error: `Invalid task type: ${task.type}. Must be one of: extract-entities, classify-document, generate-embeddings` 
        }, { status: 400 });
      }
    }
    
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = Date.now();
    const maxConcurrency = Math.min(options.maxConcurrency || 4, 8); // Limit concurrency
    
    console.log(`🔄 Starting batch processing: ${tasks.length} tasks with concurrency ${maxConcurrency}`);
    
    // Process tasks in chunks to control concurrency
    const results: BatchResult[] = [];
    const chunks: BatchTask[][] = [];
    
    // Split tasks into chunks
    for (let i = 0; i < tasks.length; i += maxConcurrency) {
      chunks.push(tasks.slice(i, i + maxConcurrency));
    }
    
    // Process each chunk in parallel
    for (let chunkIndex = 0; chunkIndex < chunks.length; chunkIndex++) {
      const chunk = chunks[chunkIndex];
      
      console.log(`📦 Processing chunk ${chunkIndex + 1}/${chunks.length} with ${chunk.length} tasks`);
      
      const chunkPromises = chunk.map(async (task: BatchTask): Promise<BatchResult> => {
        const taskStartTime = Date.now();
        
        try {
          let result: any;
          
          switch (task.type) {
            case 'extract-entities':
              result = await ollamaService.extractLegalEntities(task.text);
              break;
            case 'classify-document':
              result = await ollamaService.classifyLegalDocument(task.text);
              break;
            case 'generate-embeddings':
              const embeddings = await ollamaService.generateLegalEmbeddings(task.text);
              result = { 
                embeddings, 
                dimensions: embeddings.length,
                modelUsed: 'legal-bert-onnx'
              };
              break;
            default:
              throw new Error(`Unknown task type: ${task.type}`);
          }
          
          const processingTime = Date.now() - taskStartTime;
          
          return {
            taskId: task.id,
            success: true,
            result,
            processingTime
          };
          
        } catch (error: any) {
          console.error(`❌ Task ${task.id} failed:`, error);
          
          return {
            taskId: task.id,
            success: false,
            error: error.message,
            processingTime: Date.now() - taskStartTime
          };
        }
      });
      
      // Wait for chunk to complete
      const chunkResults = await Promise.allSettled(chunkPromises);
      
      // Extract results
      chunkResults.forEach((settledResult, index) => {
        if (settledResult.status === 'fulfilled') {
          results.push(settledResult.value);
        } else {
          results.push({
            taskId: chunk[index].id,
            success: false,
            error: settledResult.reason?.message || 'Unknown error',
            processingTime: 0
          });
        }
      });
    }
    
    const totalTime = Date.now() - startTime;
    const successfulTasks = results.filter(r => r.success).length;
    const failedTasks = results.filter(r => !r.success).length;
    const averageProcessingTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    
    console.log(`✅ Batch processing complete: ${successfulTasks}/${tasks.length} successful in ${totalTime}ms`);
    
    return json({
      success: true,
      batchId,
      results,
      summary: {
        totalTasks: tasks.length,
        successful: successfulTasks,
        failed: failedTasks,
        totalTime,
        averageProcessingTime,
        throughput: tasks.length / (totalTime / 1000), // tasks per second
        concurrency: maxConcurrency
      }
    });
    
  } catch (error: any) {
    console.error('Batch processing error:', error);
    return json(
      { 
        success: false, 
        error: 'Batch processing failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
};