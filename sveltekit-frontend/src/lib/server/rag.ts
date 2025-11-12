import { QdrantClient } from '@qdrant/js-client-rest';
// import { QDRANT_URL, OLLAMA_URL, EMBEDDING_MODEL } from '$env/static/private';

const qdrant = new QdrantClient({ url: 'http://localhost:6333' });

export class RAGService {
  async search(query: string) {
    const res = await qdrant.search('evidence_vectors', {
      vector: await this.embedQuery(query),
      limit: 5,
    });
    return res;
  }

  async embedQuery(q: string) {
    const r = await fetch(`http://localhost:11434/api/embed`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: 'embeddinggemma:latest', input: q }),
    });
    const data = await r.json();
    return data.data[0].embedding;
  }
}
