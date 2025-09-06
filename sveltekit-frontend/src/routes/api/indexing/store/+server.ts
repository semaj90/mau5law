
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';

db // Your Drizzle ORM client
import { indexedFiles } from '$lib/db/schema/aiHistory'; // The new schema for indexed files

export async function POST({ request }): Promise<any> {
    try {
        const processedFiles = await request.json();

        if (!Array.isArray(processedFiles) || processedFiles.length === 0) {
            return json({ status: 'error', message: 'Invalid or empty array of processed files' }, { status: 400 });
        }

        console.log(`Received ${processedFiles.length} processed files for storage.`);

        // Store in PostgreSQL using Drizzle
        const insertPromises = processedFiles.map(async (file) => {
            try {
                await db.insert(indexedFiles).values({
                    filePath: file.filePath,
                    content: file.content,
                    embedding: file.embedding,
                    summary: file.summary,
                    metadata: file.metadata,
                });
                console.log(`Successfully stored ${file.filePath} in PostgreSQL.`);
            } catch (pgError) {
                console.error(`Error storing ${file.filePath} in PostgreSQL:`, pgError);
                // Depending on your error handling strategy, you might want to re-throw or collect these errors
            }
        });

        await Promise.all(insertPromises);

        // TODO: Integrate with Neo4j for long-term knowledge graph storage
        // This would involve another service or direct Neo4j driver calls here.
        console.log('Neo4j integration placeholder: Data would be sent to Neo4j here.');

        return json({ status: 'success', message: 'Processed files received and stored' }, { status: 200 });

    } catch (error: any) {
        console.error('Error in indexing store endpoint:', error);
        return json({ status: 'error', message: 'Failed to store processed files', error: error.message }, { status: 500 });
    }
}