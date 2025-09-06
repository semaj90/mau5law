// Simple Qdrant test to identify the issue
import { QdrantClient } from '@qdrant/js-client-rest';

async function testSimple() {
    console.log('🔗 Simple Qdrant test...');
    
    const client = new QdrantClient({ 
        host: 'localhost',
        port: 6333,
        protocol: 'http'
    });

    try {
        // Test basic connection
        console.log('Testing connection...');
        await client.getCollections();
        console.log('✅ Connection OK');

        // Test collection creation
        const testCollection = 'simple_test';
        try {
            await client.deleteCollection(testCollection);
        } catch (e) { /* ignore if doesn't exist */ }

        console.log('Creating simple collection...');
        await client.createCollection(testCollection, {
            vectors: {
                size: 384,
                distance: 'Cosine'  
            }
        });
        console.log('✅ Collection created');

        // Test with minimal document
        console.log('Adding simple document...');
        const simpleDoc = {
            id: 1,
            vector: new Array(384).fill(0.1), // Simple non-random vector
            payload: {
                text: 'Hello world',
                category: 'test'
            }
        };

        await client.upsert(testCollection, {
            wait: true,
            points: [simpleDoc]
        });
        console.log('✅ Document added successfully!');

        // Verify the document
        const points = await client.scroll(testCollection, {
            limit: 10,
            with_payload: true,
            with_vector: false
        });
        
        console.log(`📊 Found ${points.points.length} points in collection`);
        if (points.points.length > 0) {
            console.log('📄 First point:', points.points[0].payload);
        }

        console.log('🎉 Simple test passed!');

    } catch (error) {
        console.error('❌ Error:', error.message);
        if (error.response) {
            console.error('Response:', await error.response.text());
        }
    }
}

testSimple();