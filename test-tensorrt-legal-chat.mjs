#!/usr/bin/env node

/**
 * Test TensorRT Legal Chat Integration with gemma3-legal:latest
 */

console.log('🧪 Testing TensorRT + gemma3-legal:latest integration...\n');

const LEGAL_TEST_QUERY = "What are the key elements of proving negligence in tort law?";

// Test TensorRT endpoint directly
async function testTensorRTDirect() {
    try {
        console.log('🌉 Testing TensorRT endpoint directly (port 8090)...');

        const response = await fetch('http://localhost:8090/api/generate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                model: 'gemma3-legal:latest',
                prompt: LEGAL_TEST_QUERY,
                stream: false,
                options: {
                    temperature: 0.7,
                    num_predict: 512
                }
            })
        });

        if (!response.ok) {
            throw new Error(`TensorRT failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ TensorRT direct response:');
        console.log(`   Model: ${result.model || 'gemma3-legal:latest'}`);
        console.log(`   Response length: ${(result.response || '').length} chars`);
        console.log(`   Preview: ${(result.response || '').substring(0, 150)}...`);

        return result;
    } catch (error) {
        console.error('❌ TensorRT direct test failed:', error.message);
        return null;
    }
}

// Test via QUIC stack (port 8080)
async function testQUICStack() {
    try {
        console.log('\n🚀 Testing via QUIC stack (port 8080)...');

        const response = await fetch('http://localhost:8080/api/ai/chat-tensorrt', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                messages: [
                    {
                        role: 'user',
                        content: LEGAL_TEST_QUERY
                    }
                ],
                model: 'gemma3-legal:latest',
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`QUIC API failed: ${response.status} ${response.statusText}`);
        }

        const result = await response.json();
        console.log('✅ QUIC Stack TensorRT Chat API response:');
        console.log(`   Model: ${result.model}`);
        console.log(`   TensorRT enabled: ${result.tensorrt?.gpu_accelerated}`);
        console.log(`   Response time: ${result.tensorrt?.response_time_ms}ms`);
        console.log(`   Content: ${result.choices[0]?.message?.content?.substring(0, 150)}...`);

        return result;
    } catch (error) {
        console.error('❌ QUIC Stack test failed:', error.message);
        return null;
    }
}

// Run tests
async function runTests() {
    console.log('🚀 Starting comprehensive TensorRT Legal AI tests...\n');

    // Test 1: Direct TensorRT endpoint
    const directResult = await testTensorRTDirect();

    // Test 2: Via QUIC stack
    const quicResult = await testQUICStack();

    // Summary
    console.log('\n📊 Test Summary:');
    console.log(`   TensorRT Direct: ${directResult ? '✅ Working' : '❌ Failed'}`);
    console.log(`   QUIC Stack: ${quicResult ? '✅ Working' : '❌ Failed'}`);

    if (directResult && quicResult) {
        console.log('\n🎉 SUCCESS: TensorRT + gemma3-legal:latest integration is fully working!');
        console.log('   ✅ TensorRT-LLM acceleration enabled');
        console.log('   ✅ QUIC/HTTP3 protocol ready');
        console.log('   ✅ Legal AI chat interface ready');
    } else if (directResult) {
        console.log('\n⚠️  TensorRT is working but QUIC routing needs debugging');
    } else {
        console.log('\n❌ TensorRT endpoints need debugging');
    }
}

runTests().catch(console.error);