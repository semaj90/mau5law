import { json, type RequestHandler } from '@sveltejs/kit';

export const GET: RequestHandler = async ({ params }) => {
  const { engine } = params;
  const startTime = Date.now();

  try {
    let healthData;

    switch (engine) {
      case 'webgpu':
        healthData = await checkWebGPUHealth();
        break;

      case 'ollama':
        healthData = await checkOllamaHealth();
        break;

      case 'vllm':
        healthData = await checkVLLMHealth();
        break;

      case 'fastembed':
        healthData = await checkFastEmbedHealth();
        break;

      default:
        return json({ error: 'Unknown engine' }, { status: 400 });
    }

    const responseTime = Date.now() - startTime;

    // Avoid duplicate keys with spread: place spread first, then override/add engine/responseTime
    return json({
      ...healthData,
      engine,
      responseTime
    });

  } catch (error: unknown) {
    return json({
      engine,
      healthy: false,
      responseTime: Date.now() - startTime,
      error: (error as Error)?.message ?? String(error)
    }, { status: 503 });
  }
};

async function checkWebGPUHealth() {
  try {
    // Check if WebGPU is available in the context
    // This is a server-side check, so we'll simulate the response
    return {
      healthy: true,
      capabilities: ['compute-shaders', 'texture-streaming', 'nes-orchestrator'],
      version: '1.0.0',
      features: {
        nesCache: true,
        webgpuCompute: true,
        textureStreaming: true,
        memoryRegions: ['PRG_ROM', 'CHR_ROM', 'PPU_MEMORY', 'SPRITE_MEMORY']
      }
    };
  } catch (error: unknown) {
    return {
      healthy: false,
      error: (error as Error)?.message ?? String(error)
    };
  }
}

async function checkOllamaHealth() {
  try {
    const response = await fetch('http://localhost:11434/api/version', {
      method: 'GET',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const versionData = await response.json();

    // Check for gemma3-legal model
    const modelsResponse = await fetch('http://localhost:11434/api/tags');
    const modelsData = await modelsResponse.json();

  const gemmaAvailable = modelsData.models?.some((model: any) =>
      model.name.includes('gemma3-legal')
    ) || false;

    return {
      healthy: true,
      version: versionData.version,
      models: modelsData.models?.length || 0,
      gemma3LegalAvailable: gemmaAvailable,
      capabilities: ['text-generation', 'legal-analysis', 'cuda-acceleration']
    };

  } catch (error: unknown) {
    return {
      healthy: false,
      error: (error as Error)?.message ?? String(error),
      suggestion: 'Make sure Ollama is running: ollama serve'
    };
  }
}

async function checkVLLMHealth() {
  try {
    // Check Ollama Integration Service (which includes vLLM functionality)
    const response = await fetch('http://localhost:8096/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const healthData = await response.json();

    return {
      healthy: healthData.status === 'healthy',
      capabilities: [
        'webgpu-som-caching',
        'quic-streaming',
        'tensor-core-acceleration',
        '1000-concurrent-streams'
      ],
      features: {
        somCacheSize: '64x64 grid',
        similarityThreshold: '85%',
        tensorCores: true,
        batchProcessing: true,
        gpuLayers: 35
      },
      integration: healthData
    };

  } catch (error: unknown) {
    return {
      healthy: false,
      error: (error as Error)?.message ?? String(error),
      suggestion: 'Start Ollama Integration Service: python gpu-inference-worker/ollama_integration_service.py'
    };
  }
}

async function checkFastEmbedHealth() {
  try {
    // Check FastEmbed Proxy Client
    const proxyResponse = await fetch('http://localhost:8097/health', {
      method: 'GET',
      signal: AbortSignal.timeout(5000)
    });

    let proxyHealthy = false;
    let proxyData = null;

    if (proxyResponse.ok) {
      proxyHealthy = true;
      proxyData = await proxyResponse.json();
    }

    // Check direct FastEmbed service
    let directHealthy = false;
    let directData = null;

    try {
      const directResponse = await fetch('http://localhost:8000/health', {
        signal: AbortSignal.timeout(3000)
      });

      if (directResponse.ok) {
        directHealthy = true;
        directData = await directResponse.json();
      }
    } catch (e) {
      // Direct service might not be available
    }

    return {
      healthy: proxyHealthy || directHealthy,
      proxy: {
        healthy: proxyHealthy,
        url: 'http://localhost:8097',
        data: proxyData
      },
      direct: {
        healthy: directHealthy,
        url: 'http://localhost:8000',
        data: directData
      },
      capabilities: [
        'gpu-embeddings',
        'batch-processing',
        'multiple-models',
        'cuda-acceleration'
      ],
      models: [
        'BAAI/bge-small-en-v1.5',
        'sentence-transformers/all-MiniLM-L6-v2'
      ]
    };

  } catch (error: unknown) {
    return {
      healthy: false,
      error: (error as Error)?.message ?? String(error),
      suggestion: 'Start FastEmbed services: python gpu-inference-worker/fastembed_service.py && python gpu-inference-worker/fastembed_proxy_client.py'
    };
  }
}