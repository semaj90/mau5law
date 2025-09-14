// CUDA HTTP Service Test Script
// Tests inference, embedding, and health endpoints

const CUDA_SERVICE_URL = "http://localhost:8765";

async function testCUDAService() {
    console.log("🧪 Testing CUDA HTTP Service...");

    // Test 1: Health Check
    console.log("\n1. Testing Health Endpoint:");
    try {
        const healthResponse = await fetch(`${CUDA_SERVICE_URL}/health`);
        const healthData = await healthResponse.json();
        console.log("✅ Health Check:", healthData.status);
        console.log("   Available Models:", healthData.available_models);
        console.log("   GPU Available:", healthData.gpu_available);
    } catch (error) {
        console.error("❌ Health check failed:", error.message);
        return;
    }

    // Test 2: Inference
    console.log("\n2. Testing Inference Endpoint:");
    try {
        const inferenceRequest = {
            request_id: "test-" + Date.now(),
            model: "gemma3:270m",
            prompt: "Explain the importance of legal precedent in contract law"
        };

        const inferenceResponse = await fetch(`${CUDA_SERVICE_URL}/inference`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(inferenceRequest)
        });

        const inferenceData = await inferenceResponse.json();
        console.log("✅ Inference Response:", inferenceData.response.substring(0, 100) + "...");
        console.log("   Processing Time:", inferenceData.processing_ms + "ms");
    } catch (error) {
        console.error("❌ Inference test failed:", error.message);
    }

    // Test 3: Embedding
    console.log("\n3. Testing Embedding Endpoint:");
    try {
        const embeddingRequest = {
            request_id: "embed-" + Date.now(),
            model: "embeddinggemma:latest",
            text: "Contract law governs the formation and enforcement of agreements"
        };

        const embeddingResponse = await fetch(`${CUDA_SERVICE_URL}/embedding`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(embeddingRequest)
        });

        const embeddingData = await embeddingResponse.json();
        console.log("✅ Embedding Generated:", embeddingData.dimensions + " dimensions");
        console.log("   Processing Time:", embeddingData.processing_ms + "ms");
        console.log("   Sample Values:", embeddingData.embeddings.slice(0, 5));
    } catch (error) {
        console.error("❌ Embedding test failed:", error.message);
    }

    // Test 4: Service Info
    console.log("\n4. Testing Service Info:");
    try {
        const infoResponse = await fetch(`${CUDA_SERVICE_URL}/`);
        const infoData = await infoResponse.json();
        console.log("✅ Service Info:", infoData.service + " v" + infoData.version);
        console.log("   Processed Requests:", infoData.processed_requests);
        console.log("   Uptime:", infoData.uptime);
    } catch (error) {
        console.error("❌ Service info test failed:", error.message);
    }

    console.log("\n🎉 CUDA HTTP Service testing completed!");
}

// Run tests
testCUDAService();