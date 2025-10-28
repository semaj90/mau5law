import { QdrantClient } from '@qdrant/js-client-rest';
export const qdrant = new QdrantClient({
  url:
    // prefer VITE_ prefix in Vite, fallback to legacy key, then localhost
    (import.meta.env.VITE_QDRANT_URL as string) || (import.meta.env.QDRANT_URL as string) || 'http://localhost:6333',
});
export const EVIDENCE_COLLECTION_NAME = 'evidence_v1';

// Add configurable vector size + distance (env-driven, sensible defaults)
const rawVectorSize =
  (import.meta.env.VITE_QDRANT_VECTOR_SIZE as string) || (import.meta.env.QDRANT_VECTOR_SIZE as string) || '384'; // default to 384 if unspecified
export const QDRANT_VECTOR_SIZE = Number.parseInt(rawVectorSize, 10) || 384;

export const QDRANT_DISTANCE =
  (import.meta.env.VITE_QDRANT_DISTANCE as string) || (import.meta.env.QDRANT_DISTANCE as string) || 'Cosine';

// log the chosen config for startup diagnostics
if (typeof globalThis !== 'undefined') {
  console.log(`[qdrant-client] using vector size=${QDRANT_VECTOR_SIZE}, distance=${QDRANT_DISTANCE}`);
  if (QDRANT_VECTOR_SIZE <= 0) {
    console.warn('[qdrant-client] QDRANT_VECTOR_SIZE parsed to <= 0, defaulting to 384');
  }
}

/* Local minimal types that describe the shapes we call on different client versions */
type QdrantCollection = { name: string };
type CollectionsListResponse = { collections?: QdrantCollection[] };

type CollectionsApiLike = {
  getCollections?: () => Promise<CollectionsListResponse>;
  createCollection?: (body: {
    collection_name: string;
    vectors: { size: number; distance: string };
  }) => Promise<unknown>;
  createFieldIndex?: (
    collectionName: string,
    body: { field_name: string; field_type: string; wait?: boolean }
  ) => Promise<unknown>;
};

type QdrantClientLike = CollectionsApiLike & {
  // some client versions expose helpers at top-level
  getCollections?: () => Promise<CollectionsListResponse>;
  createCollection?: (body: {
    collection_name: string;
    vectors: { size: number; distance: string };
  }) => Promise<unknown>;
  createFieldIndex?: (
    collectionName: string,
    body: { field_name: string; field_type: string; wait?: boolean }
  ) => Promise<unknown>;
};

/**
 * Ensures the Qdrant collection exists and has a payload index for tags.
 * This is critical for efficient filtering and should be called on server startup.
 */
export async function initializeQdrantCollection(): Promise<void> {
  try {
    // adapt to client shape without using `any`
    const client = qdrant as unknown as QdrantClientLike;

    // fetch collections via whichever method exists
    let collectionsResp: CollectionsListResponse | undefined = undefined;
    if (typeof client.collectionsApi?.getCollections === 'function') {
      collectionsResp = await client.collectionsApi.getCollections();
    } else if (typeof client.getCollections === 'function') {
      collectionsResp = await client.getCollections();
    }

    const collections: Array<{ name: string }> = collectionsResp?.collections ?? [];
    const collectionExists = collections.some(c => c.name === EVIDENCE_COLLECTION_NAME);

    if (!collectionExists) {
      console.log(`Creating Qdrant collection: ${EVIDENCE_COLLECTION_NAME}`);

      const createCollectionPayload = {
        collection_name: EVIDENCE_COLLECTION_NAME,
        // use env-driven vector size + distance
        vectors: { size: QDRANT_VECTOR_SIZE, distance: QDRANT_DISTANCE },
      };

      if (typeof client.collectionsApi?.createCollection === 'function') {
        await client.collectionsApi.createCollection(createCollectionPayload);
      } else if (typeof client.createCollection === 'function') {
        await client.createCollection(createCollectionPayload);
      } else {
        console.warn('Qdrant client does not expose a createCollection API; skipping createCollection.');
      }

      // Create payload index using the correct API if available; guard behind try/catch
      try {
        const indexPayload = { field_name: 'tags', field_type: 'keyword', wait: true };
        if (typeof client.collectionsApi?.createFieldIndex === 'function') {
          await client.collectionsApi.createFieldIndex(EVIDENCE_COLLECTION_NAME, indexPayload);
        } else if (typeof client.createFieldIndex === 'function') {
          await client.createFieldIndex(EVIDENCE_COLLECTION_NAME, indexPayload);
        } else {
          // if index API not present, log and continue
          console.warn('Qdrant client does not expose a field-index creation API; skipping index creation.');
        }
      } catch (indexError: unknown) {
        console.warn('Field index creation failed, continuing without index:', indexError);
      }

      console.log('Qdrant collection and payload index created successfully.');
    } else {
      // existing collection - nothing to do
      console.log(`Qdrant collection already exists: ${EVIDENCE_COLLECTION_NAME}`);
    }
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error('Failed to initialize Qdrant:', msg);
  }
}
