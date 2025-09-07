// WebGPU to CUDA Service Worker Bridge
// Enables GPU acceleration for AI processing tasks using WebGPU as a bridge to CUDA

interface WebGPUCudaBridgeMessage {
	type: 'init' | 'process' | 'status' | 'cleanup';
	payload?: any;
	requestId: string;
}

interface CudaProcessingTask {
	id: string;
	type: 'inference' | 'embedding' | 'tensor-ops' | 'image-processing';
	data: ArrayBuffer | Float32Array;
	config: any;
	priority: 'low' | 'medium' | 'high' | 'critical';
}

interface WebGPUDevice {
	device: GPUDevice;
	adapter: GPUAdapter;
	isInitialized: boolean;
	capabilities: GPUDeviceCapabilities;
}

class WebGPUCudaBridge {
	private webgpuDevice: WebGPUDevice | null = null;
	private processingQueue: CudaProcessingTask[] = [];
	private isProcessing = false;
	private ollamaEndpoint = 'http://localhost:11434';
	private cudaServiceEndpoint = 'http://localhost:8085'; // Enhanced Legal CUDA Server
	
	constructor() {
		console.log('🚀 Initializing WebGPU to CUDA Bridge');
		this.initializeWebGPU();
	}

	async initializeWebGPU(): Promise<boolean> {
		try {
			if (!('gpu' in navigator)) {
				console.warn('⚠️ WebGPU not supported, falling back to CPU processing');
				return false;
			}

			const adapter = await navigator.gpu.requestAdapter({
				powerPreference: 'high-performance'
			});

			if (!adapter) {
				console.warn('⚠️ WebGPU adapter not available');
				return false;
			}

			const device = await adapter.requestDevice({
				requiredFeatures: ['texture-compression-bc'] as GPUFeatureName[],
				requiredLimits: {
					maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
					maxBufferSize: adapter.limits.maxBufferSize
				}
			});

			this.webgpuDevice = {
				device,
				adapter,
				isInitialized: true,
				capabilities: {
					maxWorkgroupsPerDimension: adapter.limits.maxComputeWorkgroupsPerDimension,
					maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
					maxBufferSize: adapter.limits.maxBufferSize
				} as GPUDeviceCapabilities
			};

			console.log('✅ WebGPU initialized successfully');
			console.log('GPU Device:', {
				vendor: adapter.info?.vendor || 'Unknown',
				architecture: adapter.info?.architecture || 'Unknown',
				device: adapter.info?.device || 'Unknown',
				description: adapter.info?.description || 'Unknown'
			});

			// Start processing queue
			this.startProcessingLoop();
			return true;

		} catch (error) {
			console.error('❌ WebGPU initialization failed:', error);
			return false;
		}
	}

	private startProcessingLoop() {
		const processLoop = async () => {
			if (this.processingQueue.length > 0 && !this.isProcessing) {
				await this.processNextTask();
			}
			setTimeout(processLoop, 100); // Check every 100ms
		};
		processLoop();
	}

	async addTask(task: CudaProcessingTask): Promise<string> {
		task.id = task.id || `task-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
		
		// Insert task based on priority
		const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
		const insertIndex = this.processingQueue.findIndex(
			t => priorityOrder[t.priority] > priorityOrder[task.priority]
		);
		
		if (insertIndex === -1) {
			this.processingQueue.push(task);
		} else {
			this.processingQueue.splice(insertIndex, 0, task);
		}

		console.log(`📋 Task queued: ${task.id} (${task.type}, priority: ${task.priority})`);
		return task.id;
	}

	private async processNextTask(): Promise<void> {
		if (this.processingQueue.length === 0 || this.isProcessing) {
			return;
		}

		this.isProcessing = true;
		const task = this.processingQueue.shift()!;
		
		console.log(`⚡ Processing task: ${task.id} (${task.type})`);
		
		try {
			let result;
			
			switch (task.type) {
				case 'inference':
					result = await this.processInference(task);
					break;
				case 'embedding':
					result = await this.processEmbedding(task);
					break;
				case 'tensor-ops':
					result = await this.processTensorOperations(task);
					break;
				case 'image-processing':
					result = await this.processImageOperations(task);
					break;
				default:
					throw new Error(`Unknown task type: ${task.type}`);
			}

			// Send result back to main thread
			self.postMessage({
				type: 'task-complete',
				taskId: task.id,
				result,
				timestamp: new Date().toISOString()
			});

			console.log(`✅ Task completed: ${task.id}`);
			
		} catch (error) {
			console.error(`❌ Task failed: ${task.id}`, error);
			
			self.postMessage({
				type: 'task-error',
				taskId: task.id,
				error: error instanceof Error ? error.message : String(error),
				timestamp: new Date().toISOString()
			});
		} finally {
			this.isProcessing = false;
		}
	}

	private async processInference(task: CudaProcessingTask): Promise<any> {
		const { data, config } = task;
		
		// Try WebGPU-accelerated processing first
		if (this.webgpuDevice?.isInitialized) {
			try {
				const result = await this.runWebGPUInference(data, config);
				return { source: 'webgpu', result };
			} catch (error) {
				console.warn('⚠️ WebGPU inference failed, falling back to Ollama:', error);
			}
		}

		// Fallback to Ollama
		return await this.runOllamaInference(data, config);
	}

	private async runWebGPUInference(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		if (!this.webgpuDevice) {
			throw new Error('WebGPU device not initialized');
		}

		const { device } = this.webgpuDevice;
		
		// Create compute shader for inference
		const computeShaderCode = `
			@group(0) @binding(0) var<storage, read> inputData: array<f32>;
			@group(0) @binding(1) var<storage, read_write> outputData: array<f32>;
			@group(0) @binding(2) var<uniform> config: array<f32, 4>;
			
			@compute @workgroup_size(64)
			fn main(@builtin(global_invocation_id) global_id: vec3<u32>) {
				let index = global_id.x;
				if (index >= arrayLength(&inputData)) {
					return;
				}
				
				// Simple neural network layer computation
				// This is a placeholder - real implementation would be more complex
				let input_val = inputData[index];
				let weight = config[0];
				let bias = config[1];
				let activation_threshold = config[2];
				
				var result = input_val * weight + bias;
				
				// ReLU activation
				if (result < activation_threshold) {
					result = 0.0;
				}
				
				outputData[index] = result;
			}
		`;

		const shaderModule = device.createShaderModule({
			code: computeShaderCode
		});

		// Convert data to Float32Array if needed
		const inputArray = data instanceof Float32Array ? data : new Float32Array(data);
		const outputArray = new Float32Array(inputArray.length);

		// Create buffers
		const inputBuffer = device.createBuffer({
			size: inputArray.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
		});

		const outputBuffer = device.createBuffer({
			size: outputArray.byteLength,
			usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
		});

		const configArray = new Float32Array([
			config.weight || 1.0,
			config.bias || 0.0,
			config.activationThreshold || 0.0,
			0.0 // padding
		]);

		const configBuffer = device.createBuffer({
			size: configArray.byteLength,
			usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
		});

		// Write data to buffers
		device.queue.writeBuffer(inputBuffer, 0, inputArray);
		device.queue.writeBuffer(configBuffer, 0, configArray);

		// Create bind group layout
		const bindGroupLayout = device.createBindGroupLayout({
			entries: [
				{
					binding: 0,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'read-only-storage' }
				},
				{
					binding: 1,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'storage' }
				},
				{
					binding: 2,
					visibility: GPUShaderStage.COMPUTE,
					buffer: { type: 'uniform' }
				}
			]
		});

		// Create bind group
		const bindGroup = device.createBindGroup({
			layout: bindGroupLayout,
			entries: [
				{ binding: 0, resource: { buffer: inputBuffer } },
				{ binding: 1, resource: { buffer: outputBuffer } },
				{ binding: 2, resource: { buffer: configBuffer } }
			]
		});

		// Create compute pipeline
		const computePipeline = device.createComputePipeline({
			layout: device.createPipelineLayout({
				bindGroupLayouts: [bindGroupLayout]
			}),
			compute: {
				module: shaderModule,
				entryPoint: 'main'
			}
		});

		// Create command encoder and dispatch compute
		const commandEncoder = device.createCommandEncoder();
		const passEncoder = commandEncoder.beginComputePass();
		
		passEncoder.setPipeline(computePipeline);
		passEncoder.setBindGroup(0, bindGroup);
		passEncoder.dispatchWorkgroups(Math.ceil(inputArray.length / 64));
		passEncoder.end();

		// Copy result buffer to staging buffer
		const stagingBuffer = device.createBuffer({
			size: outputArray.byteLength,
			usage: GPUBufferUsage.COPY_DST | GPUBufferUsage.MAP_READ,
		});

		commandEncoder.copyBufferToBuffer(outputBuffer, 0, stagingBuffer, 0, outputArray.byteLength);

		// Submit commands
		device.queue.submit([commandEncoder.finish()]);

		// Read results
		await stagingBuffer.mapAsync(GPUMapMode.READ);
		const resultArrayBuffer = stagingBuffer.getMappedRange();
		const result = new Float32Array(resultArrayBuffer);

		// Cleanup
		stagingBuffer.unmap();
		inputBuffer.destroy();
		outputBuffer.destroy();
		configBuffer.destroy();
		stagingBuffer.destroy();

		return Array.from(result);
	}

	private async runOllamaInference(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/generate`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: config.model || 'gemma3-legal',
					prompt: config.prompt || 'Analyze the provided legal document.',
					stream: false,
					options: {
						temperature: config.temperature || 0.7,
						top_p: config.top_p || 0.9,
						top_k: config.top_k || 40
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Ollama API error: ${response.status}`);
			}

			const result = await response.json();
			return { source: 'ollama', result: result.response };
			
		} catch (error) {
			// Final fallback to Go microservice
			return await this.runCudaMicroservice(data, config);
		}
	}

	private async runCudaMicroservice(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		try {
			const response = await fetch(`${this.cudaServiceEndpoint}/api/legal/inference`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					query: config.prompt || config.query || 'Legal analysis required',
					max_tokens: config.max_tokens || 2048,
					temperature: config.temperature || 0.7,
					top_p: config.top_p || 0.9,
					enable_grpo: config.enable_grpo || true,
					legal_domain: config.legal_domain || 'general',
					user_id: config.user_id,
					session_id: config.session_id,
					metadata: {
						webgpu_bridge: true,
						data_length: data instanceof Float32Array ? data.length : data.byteLength,
						optimization_level: 'rtx_3060_ti'
					}
				})
			});

			if (!response.ok) {
				throw new Error(`Enhanced CUDA server error: ${response.status}`);
			}

			const result = await response.json();
			return { 
				source: 'cuda-enhanced-server', 
				result: result.response,
				confidence: result.confidence,
				processing_time_ms: result.processing_time_ms,
				tokens_per_second: result.tokens_per_second,
				gpu_metrics: result.gpu_metrics,
				grpo: result.grpo,
				thinking: result.thinking_content
			};
			
		} catch (error) {
			throw new Error(`Enhanced CUDA server failed: ${error}`);
		}
	}

	private async processEmbedding(task: CudaProcessingTask): Promise<any> {
		const { data, config } = task;
		
		// For embeddings, we primarily use Ollama or the Go microservice
		try {
			const response = await fetch(`${this.ollamaEndpoint}/api/embeddings`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					model: config.model || 'nomic-embed-text',
					prompt: config.text || config.prompt,
					options: config.options || {}
				})
			});

			if (response.ok) {
				const result = await response.json();
				return { source: 'ollama', embeddings: result.embedding };
			}
		} catch (error) {
			console.warn('⚠️ Ollama embedding failed, trying CUDA microservice:', error);
		}

		// Fallback to enhanced CUDA server vector search
		const response = await fetch(`${this.cudaServiceEndpoint}/api/legal/vector-search`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				query_vector: config.query_vector || new Array(768).fill(0.1),
				top_k: config.top_k || 10,
				threshold: config.threshold || 0.5,
				legal_domain: config.legal_domain || 'general',
				include_metadata: true
			})
		});

		if (!response.ok) {
			throw new Error(`Enhanced vector search error: ${response.status}`);
		}

		const result = await response.json();
		return { 
			source: 'cuda-enhanced-server', 
			embeddings: result.matches,
			processing_time_ms: result.processing_time_ms,
			gpu_metrics: result.gpu_metrics
		};
	}

	private async processTensorOperations(task: CudaProcessingTask): Promise<any> {
		const { data, config } = task;
		
		if (this.webgpuDevice?.isInitialized) {
			// Use WebGPU for tensor operations
			return await this.runWebGPUTensorOps(data, config);
		}

		// Fallback to CPU-based operations
		return await this.runCPUTensorOps(data, config);
	}

	private async runWebGPUTensorOps(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		// Implement WebGPU-based tensor operations
		// This is a simplified implementation
		const inputArray = data instanceof Float32Array ? data : new Float32Array(data);
		
		switch (config.operation) {
			case 'multiply':
				return inputArray.map(x => x * (config.factor || 1.0));
			case 'add':
				return inputArray.map(x => x + (config.value || 0.0));
			case 'normalize':
				const max = Math.max(...inputArray);
				const min = Math.min(...inputArray);
				return inputArray.map(x => (x - min) / (max - min));
			default:
				return Array.from(inputArray);
		}
	}

	private async runCPUTensorOps(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		// CPU fallback for tensor operations
		const inputArray = data instanceof Float32Array ? data : new Float32Array(data);
		
		// Same operations as WebGPU version, but clearly marked as CPU fallback
		switch (config.operation) {
			case 'multiply':
				return inputArray.map(x => x * (config.factor || 1.0));
			case 'add':
				return inputArray.map(x => x + (config.value || 0.0));
			case 'normalize':
				const max = Math.max(...inputArray);
				const min = Math.min(...inputArray);
				return inputArray.map(x => (x - min) / (max - min));
			default:
				return Array.from(inputArray);
		}
	}

	private async processImageOperations(task: CudaProcessingTask): Promise<any> {
		const { data, config } = task;
		
		// Image processing operations
		if (this.webgpuDevice?.isInitialized) {
			return await this.runWebGPUImageProcessing(data, config);
		}

		return await this.runCPUImageProcessing(data, config);
	}

	private async runWebGPUImageProcessing(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		// WebGPU-based image processing (placeholder)
		return { processed: true, source: 'webgpu' };
	}

	private async runCPUImageProcessing(data: ArrayBuffer | Float32Array, config: any): Promise<any> {
		// CPU-based image processing (placeholder)
		return { processed: true, source: 'cpu' };
	}

	getStatus(): any {
		return {
			isInitialized: this.webgpuDevice?.isInitialized || false,
			queueLength: this.processingQueue.length,
			isProcessing: this.isProcessing,
			webgpuSupported: 'gpu' in navigator,
			deviceInfo: this.webgpuDevice ? {
				vendor: this.webgpuDevice.adapter.info?.vendor || 'Unknown',
				architecture: this.webgpuDevice.adapter.info?.architecture || 'Unknown'
			} : null,
			endpoints: {
				ollama: this.ollamaEndpoint,
				cudaService: this.cudaServiceEndpoint
			}
		};
	}

	cleanup(): void {
		console.log('🧹 Cleaning up WebGPU to CUDA Bridge');
		this.processingQueue = [];
		this.isProcessing = false;
		
		if (this.webgpuDevice?.device) {
			this.webgpuDevice.device.destroy();
		}
		
		this.webgpuDevice = null;
	}
}

// Initialize the bridge
const bridge = new WebGPUCudaBridge();

// Handle messages from main thread
self.onmessage = async (event: MessageEvent<WebGPUCudaBridgeMessage>) => {
	const { type, payload, requestId } = event.data;
	
	try {
		switch (type) {
			case 'init':
				const initialized = await bridge.initializeWebGPU();
				self.postMessage({
					type: 'init-complete',
					requestId,
					success: initialized,
					status: bridge.getStatus()
				});
				break;
				
			case 'process':
				const taskId = await bridge.addTask(payload);
				self.postMessage({
					type: 'task-queued',
					requestId,
					taskId
				});
				break;
				
			case 'status':
				self.postMessage({
					type: 'status-response',
					requestId,
					status: bridge.getStatus()
				});
				break;
				
			case 'cleanup':
				bridge.cleanup();
				self.postMessage({
					type: 'cleanup-complete',
					requestId
				});
				break;
				
			default:
				throw new Error(`Unknown message type: ${type}`);
		}
	} catch (error) {
		self.postMessage({
			type: 'error',
			requestId,
			error: error instanceof Error ? error.message : String(error)
		});
	}
};

// Export for TypeScript
export default bridge;