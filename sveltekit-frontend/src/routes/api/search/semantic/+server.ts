import type { RequestHandler } from './$types.js';
import { json } from '@sveltejs/kit';

// Go inference service search endpoint
const GO_SEARCH_URL = process.env.GO_GPU_SERVER_URL || 'http://localhost:8080/api/v1/search';

// Semantic search using pgvector in Go service
export const POST: RequestHandler = async ({ request }) => {
    try {
        const body = await request.json();
        
        if (!body || !body.query || body.query.trim().length === 0) {
            return json({ 
                success: false, 
                error: 'Query is required' 
            }, { status: 400 });
        }

        console.log('Semantic search request:', body.query.substring(0, 100) + '...');

        // Forward search request to Go service
        const searchResponse = await fetch(`${GO_SEARCH_URL}?q=${encodeURIComponent(body.query)}&limit=${body.limit || 5}`, {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            },
            signal: AbortSignal.timeout(15000) // 15 second timeout
        });

        if (!searchResponse.ok) {
            const errorText = await searchResponse.text();
            console.error('Go search service error:', errorText);
            return json({ 
                success: false, 
                error: `Search service error: ${errorText}` 
            }, { status: searchResponse.status });
        }

        const searchData = await searchResponse.json();
        
        // Return semantic search results with similarity scores
        return json({
            success: searchData.success,
            query: searchData.query,
            results: searchData.results || [],
            count: searchData.count || 0,
            timestamp: new Date().toISOString()
        });

    } catch (error: any) {
        console.error('Semantic search API error:', error);
        return json({ 
            success: false, 
            error: `Semantic search failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
        }, { status: 500 });
    }
};

// GET endpoint for health check
export const GET: RequestHandler = async () => {
    try {
        const healthResponse = await fetch(GO_SEARCH_URL.replace('/search', '/health'), {
            signal: AbortSignal.timeout(5000)
        });
        
        const healthData = await healthResponse.json();
        
        return json({
            status: 'healthy',
            service: 'semantic-search',
            backend_status: healthData.status,
            pgvector_enabled: true,
            timestamp: new Date().toISOString()
        });
        
    } catch (error: any) {
        return json({
            status: 'error',
            service: 'semantic-search',
            error: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
        }, { status: 503 });
    }
};