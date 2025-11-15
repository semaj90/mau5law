# Legal AI RAG Pipeline

Complete shard-job lifecycle for document processing with parallel Go SIMD workers and Python GPU workers, integrated with a TypeScript SDK for SvelteKit orchestration.

## Architecture Overview

```
Document Upload → MinIO Storage → RabbitMQ Sharding → Go SIMD Chunking → Python GPU Embedding → Qdrant/pgvector → Cosine Similarity Search
```

## Components

### 1. TypeScript SDK (`src/lib/server/rag/`)
- **Purpose**: Orchestrate document processing from SvelteKit routes
- **Features**: Job enqueueing, status tracking, error handling
- **Integration**: RabbitMQ + Redis for distributed processing

### 2. Python ML Pipeline (`python-services/topic_pipeline.py`)
- **Purpose**: Legal topic discovery and embedding compression
- **Features**: k-means clustering, SOM visualization, autoencoder compression
- **Integration**: GPU acceleration with PyTorch + FAISS

### 3. QLoRA Fine-tuning (`python-services/qlora_legal_finetune.py`)
- **Purpose**: Fine-tune legal AI models on domain-specific data
- **Features**: 4-bit quantization, PEFT/QLoRA, tool-calling optimization
- **Integration**: Transformers + BitsAndBytes for efficient training

## Quick Start

### 1. Install Dependencies

```bash
# Python ML pipeline
pip install scikit-learn minisom torch faiss-gpu transformers peft bitsandbytes

# TypeScript SDK (already in package.json)
npm install
```

### 2. Start Services

```bash
# Redis for status tracking
redis-server --port 6379

# RabbitMQ for job queuing
rabbitmq-server

# MinIO for document storage
minio server --address :9000 ./minio-data

# Qdrant for vector search
docker run -p 6333:6333 qdrant/qdrant
```

### 3. Process a Document (SvelteKit Route Example)

```typescript
// src/routes/api/rag/process/+server.ts
import { enqueueDocumentForRag, getDocStatus } from '$lib/server/rag/sdk';
import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const { documentUrl, documentId } = await request.json();

    // Enqueue document for processing
    const jobId = await enqueueDocumentForRag(documentUrl, documentId);

    return json({ jobId });
}

// src/routes/api/rag/status/[jobId]/+server.ts
import { getDocStatus } from '$lib/server/rag/sdk';
import { json } from '@sveltejs/kit';

export async function GET({ params }) {
    const status = await getDocStatus(params.jobId);
    return json(status);
}
```

### 4. Run Topic Discovery Pipeline

```python
from topic_pipeline import LegalTopicPipeline

# Initialize pipeline
pipeline = LegalTopicPipeline()

# Load embeddings from Qdrant/Redis
embeddings = pipeline.load_embeddings_from_qdrant(query="legal contracts")

# Run clustering pipeline
results = pipeline.run_full_pipeline(embeddings, n_clusters=20)

# Results include:
# - k-means clusters
# - SOM visualization coordinates
# - Autoencoder compressed embeddings
# - Topic labels and metadata
```

### 5. Fine-tune Legal AI Model

```python
from qlora_legal_finetune import LegalQLoRAFinetuner

# Initialize fine-tuner
finetuner = LegalQLoRAFinetuner(
    model_name="google/gemma-2b",  # or your Gemma3 checkpoint
    output_dir="./legal-gemma-qlora"
)

# Setup model and LoRA
finetuner.load_model_and_tokenizer()
finetuner.setup_lora_config(r=16, alpha=32)

# Load training data
dataset = finetuner.prepare_legal_dataset("legal_chat_transcripts.jsonl")

# Train
finetuner.train(dataset, num_epochs=3, batch_size=2)

# Generate responses
response = finetuner.generate_legal_response(
    "What are the key elements of a valid contract?",
    context="Retrieved legal context..."
)
```

## API Reference

### TypeScript SDK

#### `enqueueDocumentForRag(documentUrl: string, documentId: string): Promise<string>`
Enqueues a document for sharding and processing. Returns job ID.

#### `getDocStatus(jobId: string): Promise<DocStatus>`
Gets current processing status for a document job.

#### `getShardChunks(jobId: string, shardId: number): Promise<ChunkRecord[]>`
Retrieves processed chunks for a specific shard.

### Python ML Pipeline

#### `LegalTopicPipeline.run_full_pipeline(embeddings, n_clusters=20)`
Runs complete clustering pipeline: k-means → SOM → autoencoder → topic analysis.

#### `LegalTopicPipeline.cluster_embeddings_kmeans(embeddings, n_clusters)`
Performs k-means clustering with FAISS GPU acceleration.

#### `LegalTopicPipeline.cluster_embeddings_som(embeddings, map_size=(20,20))`
Creates SOM visualization for topic exploration.

#### `LegalTopicPipeline.compress_embeddings_autoencoder(embeddings, bottleneck_size=128)`
Compresses embeddings using autoencoder for efficient storage.

### QLoRA Fine-tuning

#### `LegalQLoRAFinetuner.train(dataset, num_epochs=3, batch_size=4)`
Fine-tunes model on legal conversation data.

#### `LegalQLoRAFinetuner.generate_legal_response(question, context="", tools=[])`
Generates legal assistant responses with RAG context.

## Configuration

### Environment Variables

```bash
# Redis
REDIS_URL=redis://localhost:6379

# RabbitMQ
RABBITMQ_URL=amqp://localhost:5672

# MinIO
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin

# Qdrant
QDRANT_URL=http://localhost:6333

# GPU Device
CUDA_VISIBLE_DEVICES=0
```

### Pipeline Configuration

```python
# Topic pipeline settings
PIPELINE_CONFIG = {
    'n_clusters': 20,
    'som_map_size': (20, 20),
    'autoencoder_bottleneck': 128,
    'similarity_threshold': 0.8
}
```

## Monitoring & Debugging

### Status Tracking
- Document processing status: `rag:doc:{jobId}:status`
- Shard completion: `rag:doc:{jobId}:shard_count`
- Error logs: `rag:doc:{jobId}:errors`

### Health Checks
```bash
# Redis connectivity
redis-cli ping

# RabbitMQ queues
rabbitmqctl list_queues

# Qdrant health
curl http://localhost:6333/health
```

## Performance Optimization

### GPU Acceleration
- Use FAISS for k-means clustering on large datasets
- Autoencoder compression reduces storage by 70-80%
- QLoRA enables fine-tuning on consumer GPUs

### Parallel Processing
- Go SIMD workers for text chunking (1000+ chunks/sec)
- Python GPU workers for embedding generation
- RabbitMQ distributes work across multiple workers

### Memory Management
- Streaming processing for large documents
- Embedding quantization (FP16/INT8)
- Redis caching for frequent queries

## Integration Examples

### SvelteKit Chat Interface
```svelte
<script>
    import { enqueueDocumentForRag, getDocStatus } from '$lib/server/rag/sdk';

    let documentUrl = '';
    let status = null;

    async function processDocument() {
        const jobId = await enqueueDocumentForRag(documentUrl, 'doc-123');

        // Poll status
        const pollStatus = async () => {
            status = await getDocStatus(jobId);
            if (status.status !== 'completed') {
                setTimeout(pollStatus, 2000);
            }
        };
        pollStatus();
    }
</script>

<input bind:value={documentUrl} placeholder="Document URL">
<button on:click={processDocument}>Process Document</button>
{#if status}
    <p>Status: {status.status} ({status.completedShards}/{status.totalShards})</p>
{/if}
```

### Legal Topic Visualization
```python
# Generate topic clusters and SOM visualization
results = pipeline.run_full_pipeline(embeddings)

# Plot SOM with topic labels
import matplotlib.pyplot as plt
plt.figure(figsize=(10, 8))
for i, (x, y) in enumerate(results['som_coordinates']):
    plt.scatter(x, y, c=results['kmeans_labels'][i], cmap='tab20')
    if i % 50 == 0:  # Label every 50th point
        plt.annotate(results['topic_labels'][i], (x, y))
plt.title('Legal Topic SOM Visualization')
plt.show()
```

## Troubleshooting

### Common Issues

1. **Out of Memory**: Reduce batch sizes, use gradient accumulation
2. **Slow Processing**: Enable GPU acceleration, increase workers
3. **Queue Backlog**: Scale RabbitMQ consumers, monitor Redis memory
4. **Low Similarity Scores**: Adjust clustering parameters, retrain embeddings

### Logs & Debugging
```bash
# View processing logs
tail -f logs/rag-processing.log

# Check queue status
rabbitmqctl list_queues name messages

# Monitor GPU usage
nvidia-smi
```

## Contributing

1. Add new clustering algorithms to `LegalTopicPipeline`
2. Extend QLoRA fine-tuning for additional legal domains
3. Improve TypeScript SDK error handling
4. Add more integration examples

## License

MIT License - Open source legal AI toolkit.