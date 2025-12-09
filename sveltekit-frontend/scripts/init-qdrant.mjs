// Initialize Qdrant collection for RAG
import { QdrantClient } from '@qdrant/js-client-rest';

const client = new QdrantClient({ url: 'http://localhost:6333' });
const collectionName = 'phase72_evidence_embeddings';

async function initCollection() {
	try {
		// Check if collection exists
		const collections = await client.getCollections();
		const exists = collections.collections.some(c => c.name === collectionName);

		if (!exists) {
			console.log(`Creating collection: ${collectionName}`);
			await client.createCollection(collectionName, {
				vectors: {
					size: 384, // embeddinggemma dimension
					distance: 'Cosine'
				}
			});
			console.log('Collection created successfully');
		} else {
			console.log(`Collection ${collectionName} already exists`);
		}
	} catch (error) {
		console.error('Error initializing collection:', error);
	}
}

initCollection();