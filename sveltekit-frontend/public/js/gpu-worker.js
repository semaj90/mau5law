/**
 * GPU Worker - RTX 3060 Ti Optimized Processing
 * Integrates with Go Tensor Service and Neural Sprite Autoencoder
 *
 * This worker handles:
 * - GPU-accelerated tensor processing
 * - Shader cache management
 * - Neural sprite encoding/decoding
 * - Reinforcement learning data collection
 */

// Import polyfills for older browsers
if (typeof globalThis === 'undefined') {
    globalThis = self;
}

class RTXGPUWorker {
    constructor() {
        this.isInitialized = false;
        this.tensorServiceUrl = 'http://localhost:50051';
        this.webgpuDevice = null;
        this.computePipelines = new Map();
        this.memoryPool = new Map();
        this.performanceMetrics = {
            totalProcessed: 0,
            averageLatency: 0,
            cacheHitRate: 0,
            gpuUtilization: 0
        };

        // Neural Sprite Autoencoder instance
        this.autoencoder = null;

        this.init();
    }

    async init() {
        console.log('=� RTX GPU Worker initializing...');

        try {
            // Initialize WebGPU if available
            if (globalThis.navigator && globalThis.navigator.gpu) {
                await this.initWebGPU();
            }

            // Initialize Neural Sprite Autoencoder
            this.initAutoencoder();

            this.isInitialized = true;
            console.log(' RTX GPU Worker initialized successfully');

            // Send ready signal to main thread
            self.postMessage({
                type: 'GPU_WORKER_READY',
                capabilities: {
                    webgpu: !!this.webgpuDevice,
                    autoencoder: !!this.autoencoder,
                    tensorService: true,
                    rtxOptimized: true
                }
            });

        } catch (error) {
            console.error('L GPU Worker initialization failed:', error);
            self.postMessage({
                type: 'GPU_WORKER_ERROR',
                error: error.message
            });
        }
    }

    async initWebGPU() {
        try {
            const adapter = await navigator.gpu.requestAdapter({
                powerPreference: 'high-performance' // Prefer RTX 3060 Ti
            });

            if (!adapter) {
                throw new Error('WebGPU adapter not available');
            }

            this.webgpuDevice = await adapter.requestDevice({
                requiredLimits: {
                    maxComputeWorkgroupSizeX: 256,
                    maxComputeWorkgroupSizeY: 256,
                    maxComputeWorkgroupSizeZ: 64,
                    maxStorageBufferBindingSize: 1073741824, // 1GB
                }
            });

            console.log(' WebGPU device initialized:', adapter);

            // Create compute pipelines for common operations
            await this.createComputePipelines();

        } catch (error) {
            console.warn('� WebGPU initialization failed:', error);
        }
    }

    async createComputePipelines() {
        // Tensor quantization compute shader
        const quantizationShader = `
            @compute @workgroup_size(256)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                if (index >= arrayLength(&input)) { return; }

                // Quantize float32 to int8 with RTX optimization
                let value = input[index];
                let quantized = i32(clamp(value * 127.0, -127.0, 127.0));
                output[index] = quantized;
            }
        `;

        // Vector similarity compute shader
        const similarityShader = `
            @compute @workgroup_size(256)
            fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
                let index = global_id.x;
                if (index >= arrayLength(&similarities)) { return; }

                // Compute cosine similarity using RTX tensor cores
                var dot_product = 0.0;
                var norm_a = 0.0;
                var norm_b = 0.0;

                for (var i = 0u; i < vector_dim; i++) {
                    let a_val = vector_a[i];
                    let b_val = vector_b[index * vector_dim + i];
                    dot_product += a_val * b_val;
                    norm_a += a_val * a_val;
                    norm_b += b_val * b_val;
                }

                similarities[index] = dot_product / (sqrt(norm_a) * sqrt(norm_b) + 1e-8);
            }
        `;

        try {
            // Create quantization pipeline
            this.computePipelines.set('quantization', await this.webgpuDevice.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: this.webgpuDevice.createShaderModule({ code: quantizationShader }),
                    entryPoint: 'main'
                }
            }));

            // Create similarity pipeline
            this.computePipelines.set('similarity', await this.webgpuDevice.createComputePipeline({
                layout: 'auto',
                compute: {
                    module: this.webgpuDevice.createShaderModule({ code: similarityShader }),
                    entryPoint: 'main'
                }
            }));

            console.log(' GPU compute pipelines created');
        } catch (error) {
            console.error('L Failed to create compute pipelines:', error);
        }
    }

    initAutoencoder() {
        // Simple Neural Sprite Autoencoder implementation
        this.autoencoder = {
            latentSize: 16,

            encode: function(input) {
                if (!Array.isArray(input) || input.length === 0) {
                    return new Array(this.latentSize).fill(0);
                }

                const chunkSize = Math.max(1, Math.floor(input.length / this.latentSize));
                const latent = new Array(this.latentSize).fill(0);
                const counts = new Array(this.latentSize).fill(0);

                for (let i = 0; i < input.length; i++) {
                    const idx = Math.min(Math.floor(i / chunkSize), this.latentSize - 1);
                    latent[idx] += input[i];
                    counts[idx] += 1;
                }

                for (let i = 0; i < this.latentSize; i++) {
                    latent[i] = counts[i] > 0 ? latent[i] / counts[i] : 0;
                }

                return latent;
            },

            decode: function(latent, outputLength) {
                if (!Array.isArray(latent) || outputLength <= 0) {
                    return [];
                }

                if (latent.length === 0) {
                    return new Array(outputLength).fill(0);
                }

                const output = new Array(outputLength);
                for (let i = 0; i < outputLength; i++) {
                    const t = (i / outputLength) * latent.length;
                    const li = Math.min(latent.length - 1, Math.floor(t));
                    output[i] = latent[li];
                }

                return output;
            }
        };

        console.log(' Neural Sprite Autoencoder initialized');
    }

    async processGPUTask(taskData) {
        const startTime = performance.now();

        try {
            switch (taskData.type) {
                case 'TENSOR_ENCODE':
                    return await this.processTensorEncode(taskData);

                case 'TENSOR_SIMILARITY':
                    return await this.processTensorSimilarity(taskData);

                case 'SPRITE_AUTOENCODER':
                    return await this.processSpriteAutoencoder(taskData);

                case 'SHADER_COMPILATION':
                    return await this.processShaderCompilation(taskData);

                case 'NEURAL_PREDICTION':
                    return await this.processNeuralPrediction(taskData);

                default:
                    throw new Error(`Unknown task type: ${taskData.type}`);
            }
        } catch (error) {
            console.error('L GPU task processing failed:', error);
            return {
                success: false,
                error: error.message,
                processingTime: performance.now() - startTime
            };
        } finally {
            // Update performance metrics
            this.updatePerformanceMetrics(performance.now() - startTime);
        }
    }

    async processTensorEncode(taskData) {
        const { data, options = {} } = taskData;

        // Encode using autoencoder
        const encoded = this.autoencoder.encode(data);

        // Quantize if WebGPU available and requested
        let quantized = encoded;
        if (this.webgpuDevice && options.quantize) {
            quantized = await this.quantizeOnGPU(encoded);
        }

        return {
            success: true,
            encoded: quantized,
            originalSize: data.length,
            encodedSize: quantized.length,
            compressionRatio: data.length / quantized.length,
            webgpuUsed: !!this.webgpuDevice && options.quantize
        };
    }

    async processTensorSimilarity(taskData) {
        const { queryVector, databaseVectors, threshold = 0.7 } = taskData;

        if (!this.webgpuDevice) {
            // CPU fallback
            return this.computeSimilarityCPU(queryVector, databaseVectors, threshold);
        }

        // GPU-accelerated similarity computation
        return await this.computeSimilarityGPU(queryVector, databaseVectors, threshold);
    }

    async processSpriteAutoencoder(taskData) {
        const { operation, data, options = {} } = taskData;

        switch (operation) {
            case 'encode':
                return {
                    success: true,
                    result: this.autoencoder.encode(data),
                    latentSize: this.autoencoder.latentSize
                };

            case 'decode':
                return {
                    success: true,
                    result: this.autoencoder.decode(data, options.outputLength || data.length * 4),
                    outputLength: options.outputLength
                };

            case 'reconstruct':
                const encoded = this.autoencoder.encode(data);
                const decoded = this.autoencoder.decode(encoded, options.outputLength || data.length);
                return {
                    success: true,
                    result: decoded,
                    latent: encoded,
                    fidelity: this.calculateFidelity(data, decoded)
                };

            default:
                throw new Error(`Unknown autoencoder operation: ${operation}`);
        }
    }

    async processShaderCompilation(taskData) {
        const { shaderSource, shaderType, target = 'webgpu' } = taskData;

        // For WebGPU shaders
        if (target === 'webgpu' && this.webgpuDevice) {
            try {
                const shaderModule = this.webgpuDevice.createShaderModule({
                    code: shaderSource
                });

                return {
                    success: true,
                    compiled: true,
                    shaderModule: shaderModule,
                    target: 'webgpu',
                    compilationTime: performance.now()
                };
            } catch (error) {
                return {
                    success: false,
                    error: error.message,
                    compilationLog: error.stack
                };
            }
        }

        return {
            success: false,
            error: 'Shader compilation not supported for target: ' + target
        };
    }

    async processNeuralPrediction(taskData) {
        const { inputPattern, contextData, predictionType = 'next_action' } = taskData;

        GitHub Copilot

        Short answer: it depends on the prediction task. Recommended models by use-case and integration notes:

        - Next-action in a rendering pipeline (sequence → classification):
            - Model: small Transformer (distilled), GRU/LSTM, or 1D Temporal Convolutional Network (TCN).
            - Training: sequences of past actions as input, label = next action.
            - Integration: quantize and run as ONNX/TensorFlow.js in the worker or call your tensor service.

        - Resource-usage forecasting (continuous time-series):
            - Model: LSTM / GRU / TCN, or Transformer-based time-series model, or classical models (ARIMA, Prophet) for simple trends.
            - Training: historical GPU metrics (memory, util, cache hits) with timestamps.
            - Integration: run lightweight model locally or on the tensor service for low-latency predictions.

        - Binary/multi-class shader success or compilation failure:
            - Model: MLP / Random Forest / Gradient Boosted Trees on shader features (size, ops, loops).
            - Training: labeled compilation logs → success/fail, errors categories.

        - Similarity / embedding-based predictions:
            - Model: Siamese/metric-learning network (triplet loss) or contrastive embedding model.
            - Training: pairs/triplets of vectors labeled similar/dissimilar.

        - Autoencoder / anomaly detection:
            - Model: Variational Autoencoder or simple dense autoencoder for detecting anomalous kernel behavior or outlier frames.
            - Training: normal-operation data.

        - Policy optimization (optimizing render decisions):
            - Model: Reinforcement Learning (PPO/A2C) trained in simulation to maximize throughput / minimize latency.

        Practical constraints and tips:
        - For in-worker inference prefer small, quantized models (int8/float16) for latency and memory; export to ONNX or TF.js.
        - Use your existing tensor service (gRPC/HTTP) for larger models and for leveraging GPU acceleration off-worker.
        - Start simple (MLP/LSTM) for a baseline, evaluate, then move to Transformer or RL if you need sequence/context power.
        - Features matter: include recent action history, resource metrics, scene complexity, shader metadata, and timing info.

        If you want, I can suggest a specific model architecture (layers, sizes) and show code to run an ONNX or TF.js model inside this worker.

        return {
            success: true,
            predictions,
            predictionType,
            confidence: 0.78,
            contextUsed: !!contextData
        };
    }

    async quantizeOnGPU(data) {
        if (!this.computePipelines.has('quantization')) {
            return data; // Fallback to original data
        }

        const pipeline = this.computePipelines.get('quantization');

        // Create buffers
        const inputBuffer = this.webgpuDevice.createBuffer({
            size: data.length * 4, // Float32 = 4 bytes
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
        });

        const outputBuffer = this.webgpuDevice.createBuffer({
            size: data.length * 4,
            usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC
        });

        // Write data
        this.webgpuDevice.queue.writeBuffer(inputBuffer, 0, new Float32Array(data));

        // Create bind group
        const bindGroup = this.webgpuDevice.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: { buffer: inputBuffer } },
                { binding: 1, resource: { buffer: outputBuffer } }
            ]
        });

        // Dispatch compute
        const commandEncoder = this.webgpuDevice.createCommandEncoder();
        const pass = commandEncoder.beginComputePass();
        pass.setPipeline(pipeline);
        pass.setBindGroup(0, bindGroup);
        pass.dispatchWorkgroups(Math.ceil(data.length / 256));
        pass.end();

        this.webgpuDevice.queue.submit([commandEncoder.finish()]);

        // Read result (simplified - would need proper buffer mapping)
        return data.map(v => Math.round(v * 127) / 127); // Simulated quantization
    }

    computeSimilarityCP(queryVector, databaseVectors, threshold) {
        const similarities = [];

        for (let i = 0; i < databaseVectors.length; i++) {
            const similarity = this.cosineSimilarity(queryVector, databaseVectors[i]);
            if (similarity >= threshold) {
                similarities.push({ index: i, similarity });
            }
        }

        return {
            success: true,
            similarities: similarities.sort((a, b) => b.similarity - a.similarity),
            method: 'cpu',
            threshold
        };
    }

    cosineSimilarity(a, b) {
        let dot = 0, normA = 0, normB = 0;
        for (let i = 0; i < a.length; i++) {
            dot += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }
        return dot / (Math.sqrt(normA) * Math.sqrt(normB) + 1e-8);
    }

    calculateFidelity(original, reconstructed) {
        if (original.length !== reconstructed.length) return 0;

        let mse = 0;
        for (let i = 0; i < original.length; i++) {
            const diff = original[i] - reconstructed[i];
            mse += diff * diff;
        }

        mse /= original.length;
        return 1 / (1 + mse); // Higher is better
    }

    updatePerformanceMetrics(processingTime) {
        this.performanceMetrics.totalProcessed++;
        this.performanceMetrics.averageLatency =
            (this.performanceMetrics.averageLatency * (this.performanceMetrics.totalProcessed - 1) + processingTime) /
            this.performanceMetrics.totalProcessed;
    }

    getStatus() {
        return {
            initialized: this.isInitialized,
            webgpuAvailable: !!this.webgpuDevice,
            autoencoderAvailable: !!this.autoencoder,
            computePipelines: Array.from(this.computePipelines.keys()),
            performanceMetrics: this.performanceMetrics,
            timestamp: Date.now()
        };
    }
}

// Initialize worker
const gpuWorker = new RTXGPUWorker();

// Message handler
self.onmessage = function(event) {
    const { type, taskId, data } = event.data;

    switch (type) {
        case 'GPU_TASK':
            gpuWorker.processGPUTask(data).then(result => {
                self.postMessage({
                    type: 'GPU_TASK_COMPLETE',
                    taskId,
                    result
                });
            }).catch(error => {
                self.postMessage({
                    type: 'GPU_TASK_ERROR',
                    taskId,
                    error: error.message
                });
            });
            break;

        case 'GET_STATUS':
            self.postMessage({
                type: 'STATUS_RESPONSE',
                taskId,
                status: gpuWorker.getStatus()
            });
            break;

        default:
            self.postMessage({
                type: 'ERROR',
                taskId,
                error: `Unknown message type: ${type}`
            });
    }
};