import type { RequestHandler } from './$types.js';
import { error } from '@sveltejs/kit';

// Environment variable for Go GPU server URL (updated to use new inference endpoint)
const GO_GPU_SERVER_URL = process.env.GO_GPU_SERVER_URL || 'http://localhost:8080/api/v1/inference';

// Streaming proxy to Go GPU server
export const POST: RequestHandler = async ({ request }) => {
    try {
        // Get the request body (expecting JSON for inference endpoint)
        const body = await request.json();
        
        if (!body || !body.prompt || body.prompt.trim().length === 0) {
            throw error(400, 'JSON body with prompt field is required');
        }

        console.log('Forwarding to GPU inference server:', GO_GPU_SERVER_URL);
        console.log('Request prompt:', body.prompt.substring(0, 100) + '...');

        // Create inference request for the Go GPU server
        const inferenceRequest = {
            prompt: body.prompt,
            model: body.model || 'legal:latest',
            max_tokens: body.max_tokens || 512,
            temperature: body.temperature || 0.1,
            use_gpu: true
        };

        // Forward the request to the Go GPU server
        const gpuServerResponse = await fetch(GO_GPU_SERVER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(inferenceRequest),
            signal: AbortSignal.timeout(30000) // 30 second timeout
        });

        if (!gpuServerResponse.ok) {
            const errorText = await gpuServerResponse.text();
            console.error('Go GPU server error:', errorText);
            throw error(gpuServerResponse.status, `GPU server error: ${errorText}`);
        }

        // Parse and return the JSON response from Go inference server
        const responseData = await gpuServerResponse.json();
        
        // Return enhanced response with pgvector similarity data
        return new Response(JSON.stringify({
            success: responseData.success,
            text: responseData.text,
            tokens: responseData.tokens,
            processing_time_ms: responseData.processing_time_ms,
            tokens_per_second: responseData.tokens_per_second,
            confidence: responseData.confidence,
            legal_domain: responseData.legal_domain,
            similar_queries: responseData.similar_queries || [],
            gpu_utilization: responseData.gpu_utilization,
            memory_usage_mb: responseData.memory_usage_mb
        }), {
            status: gpuServerResponse.status,
            statusText: gpuServerResponse.statusText,
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Cache-Control': 'no-cache',
                'Connection': 'keep-alive'
            }
        });

    } catch (err: any) {
        console.error('GPU Chat API error:', err);
        
        if (err instanceof Error && 'status' in err) {
            throw err;
        }
        
        throw error(500, `GPU chat service error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
};

// Health check endpoint for GPU server
export const GET: RequestHandler = async () => {
    try {
        const healthUrl = GO_GPU_SERVER_URL.replace('/api/v1/inference', '/api/v1/health');
        const response = await fetch(healthUrl, {
            signal: AbortSignal.timeout(5000)
        });
        
        if (response.ok) {
            return new Response(JSON.stringify({
                status: 'healthy',
                service: 'go-gpu-server',
                url: GO_GPU_SERVER_URL,
                timestamp: new Date().toISOString()
            }), {
                headers: { 'Content-Type': 'application/json' }
            });
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (err: any) {
        return new Response(JSON.stringify({
            status: 'error',
            error: err instanceof Error ? err.message : 'Unknown error',
            url: GO_GPU_SERVER_URL,
            timestamp: new Date().toISOString()
        }), {
            status: 503,
            headers: { 'Content-Type': 'application/json' }
        });
    }
};