<!--
  Enhanced 3D Legal AI Interface
  Integrates all systems: vLLM CUDA, SIMD Parser, Neo4j Recommendations, XState, RabbitMQ
  Features: 3D headless vertex buffer, progress animations, bit-encoding, QUIC streaming
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import createIdleDetectionService, { type IdleDetectionActor } from '$lib/machines/idle-detection-rabbitmq-machine';
  import { EnhancedVLLMCudaIntegration, type StreamingRequest } from '$lib/services/enhanced-vllm-cuda-integration';
  import SIMDGPUParserIntegration, { type ParsedDocument } from '$lib/services/simd-gpu-parser-integration';
  import { Neo4jRecommendationEngine, type Recommendation } from '$lib/services/neo4j-recommendation-engine';
  import { getOllamaApiUrl } from '$lib/utils/ollama-helpers'; // Import the Ollama API helper

  // Props for component configuration
  let {
    enableGPUAcceleration = true,
    enableAIRecommendations = true,
    enableIdleProcessing = true,
    theme = 'yorha',
    maxConcurrentStreams = 100,
    progressAnimationSpeed = 1.0
  } = $props();
  // Component state
  let containerRef: HTMLDivElement;
  let canvasRef: HTMLCanvasElement;
  let progressCanvasRef: HTMLCanvasElement;
  // 3D Rendering context
  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let shaderProgram: WebGLProgram | null = null;
  // Service integrations
  let vllmIntegration: EnhancedVLLMCudaIntegration | null = null;
  let simdParser: SIMDGPUParserIntegration | null = null;
  let neo4jEngine: Neo4jRecommendationEngine | null = null;
  let idleDetectionService: IdleDetectionActor | null = null;
  // Component state
  let isInitialized = $state(false);
  let isProcessing = $state(false);
  let currentProgress = $state(0); // Use $state for reactivity
  let progressStages = $state([ // Use $state for reactivity
    { name: 'GPU Initialization', progress: 0, status: 'pending' },
    { name: 'SIMD Parser Setup', progress: 0, status: 'pending' },
    { name: 'vLLM CUDA Integration', progress: 0, status: 'pending' },
    { name: 'Neo4j Connection', progress: 0, status: 'pending' },
    { name: 'XState Machine Start', progress: 0, status: 'pending' },
    { name: 'System Ready', progress: 0, status: 'pending' }
  ]);
  // User interaction state
  let userInput = $state('');
  let chatMessages = $state<Array<any>>([]); // Added type
  let recommendations = $state<Recommendation[]>([]);
  let parsedDocument: ParsedDocument | null = null; // Use the defined interface
  // Performance metrics
  let performanceMetrics = $state({ // Use $state for reactivity
    fps: 0,
    gpuUtilization: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    aiResponseTime: 0,
  });
  // Bit-encoding streaming state
  let streamingChunks = $state<Array<any>>([]); // Added type
  // Animation frame
  let animationFrame: number;
  let lastFrameTime = 0;
  let deltaTime = 0;
  let errorMessage = $state<string | null>(null); // Added error message state

  $effect(() => {
    (async () => {
      if (!browser) return;
      try {
        await initializeSystem();
      } catch (error) {
        console.error('System initialization failed:', error);
        addSystemMessage('System initialization failed. Running in degraded mode.');
        errorMessage = error instanceof Error ? error.message : 'An error occurred'; // Fixed: error message assignment
      }
    })();
  });
  onDestroy(() => {
    cleanup();
  });
  async function initializeSystem() {
    console.log('🚀 Initializing Enhanced 3D Legal AI Interface...');
    // Initialize 3D rendering context
    await initializeWebGL();
    // Initialize service integrations with progress tracking
    await initializeServicesWithProgress();
    // Start animation: loop
    startAnimationLoop();
    // Initialize idle detection if enabled
    if (enableIdleProcessing) {
      idleDetectionService = createIdleDetectionService({
        idleTimeout: 3 * 60 * 1000, // 3 minutes
        backgroundJobsEnabled: true
      });
    }
    isInitialized = true;
    addSystemMessage('System initialized successfully. All services operational.');
    console.log('✅ Enhanced 3D Legal AI Interface initialized');
  }
  async function initializeWebGL() {
    if (!canvasRef) return;
    gl = canvasRef.getContext('webgl2') || canvasRef.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    // Create shader program for 3D vertex buffer visualization
    const vertexShaderSource = `
      attribute vec3 position; // Fixed: positio -> position
      attribute vec3 color;
      attribute float progress; // Fixed: progres -> progress
      uniform mat4 mvpMatrix;
      uniform float time;
      uniform float globalProgress; // Fixed: globalProgres -> globalProgress
      varying vec3 vColor;
      varying float vProgress; // Fixed: vProgres -> vProgress
      void main() {
        // Animate vertices based on progress and time
        vec3 animatedPosition = position; // Fixed: positio -> position
        animatedPosition.y += sin(time + position.x * 0.1) * progress * 0.1; // Fixed: progress is now defined
        // Scale based on global progress
        animatedPosition *= mix(0.1, 1.0, globalProgress);
        gl_Position = mvpMatrix * vec4(animatedPosition, 1.0);
        gl_PointSize = mix(2.0, 8.0, progress);
        vColor = mix(vec3(0.3, 0.3, 0.3), color, progress);
        vProgress = progress; // Fixed: progres -> progress
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      varying float vProgress; // Fixed: vProgres -> vProgress
      uniform float time;
      void main() {
        // Pulsing effect based on progress
        float pulse = sin(time * 3.0) * 0.1 + 0.9;
        vec3 finalColor = vColor * pulse; // Fixed: pul -> pulse
        // Add glow effect for high progress
        if (vProgress > 0.8) {
          finalColor += vec3(0.2, 0.4, 0.8) * sin(time * 5.0) * 0.3;
        }
        gl_FragColor = vec4(finalColor, mix(0.3, 1.0, vProgress));
      }
    `;
    // Compile shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    // Create program
    shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    // Create vertex buffer for legal AI visualization
    createVertexBuffer();
    // Enable depth testing and blending
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    return shader;
  }
  function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking error: ${error}`);
    }
    return program;
  }
  function createVertexBuffer() {
    if (!gl) return;
    // Create a 3D grid representing legal AI processing nodes
    const vertices: number[] = [];
    const colors: number[] = [];
    const progressValues: number[] = [];
    const gridSize = 20;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < 5; z++) {
          // Position
          vertices.push((x - gridSize/2) * 0.1, (y - gridSize/2) * 0.1, z * 0.05);
          // Color based on position (YoRHa-style)
          const hue = (x + y + z) / (gridSize * 2 + 5);
          colors.push(
            0.2 + hue * 0.3,  // R
            0.4 + hue * 0.4,  // G
            0.8 + hue * 0.2   // B
          );
          // Initial progress (will be animated)
          progressValues.push(Math.random() * 0.1);
        }
      }
    }
    // Create vertex buffer
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Interleave vertex data (position + color + progress)
    const interleavedData: number[] = [];
    const vertexCount = vertices.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      interleavedData.push(
        vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2], // position
        colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2],       // color
        progressValues[i]                                           // progress
      );
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedData), gl.DYNAMIC_DRAW);
  }
  async function initializeServicesWithProgress() {
    const stages = progressStages; // Fixed: progressStage -> progressStages
    try {
      // Stage 1: GPU Initialization
      stages[0].status = 'active';
      stages[0].progress = 0.1;
      // Stage 2: SIMD Parser Setup
      stages[1].status = 'active';
      if (enableGPUAcceleration) {
        simdParser = new SIMDGPUParserIntegration({
          enableSpellCheck: true,
          enableEntityExtraction: true,
          enableLegalTermSuggestions: true,
          enableCitationValidation: true,
          confidenceThreshold: 0.7,
          maxSuggestions: 10,
          simdOptimization: true,
          gpuAcceleration: true,
        });
        await simdParser.initializeGPU();
      }
      stages[1].progress = 1.0;
      stages[1].status = 'completed';
      // Stage 3: vLLM CUDA Integration
      stages[2].status = 'active';
      vllmIntegration = new EnhancedVLLMCudaIntegration({
        serverUrl: getOllamaApiUrl(), // Wired Ollama endpoint, supports gemma3-legal:latest and embeddinggemma:latest
        maxConcurrentStreams,
        gpuMemoryPerDevice: 8,
        tensorParallelSize: 1,
        quantization: 'int8',
        maxModelLength: 4096,
        enableTensorCores: true,
      });
      await vllmIntegration.initializeGPU();
      stages[2].progress = 1.0;
      stages[2].status = 'completed';
      // Stage 4: Neo4j Connection
      stages[3].status = 'active';
      if (enableAIRecommendations) {
        neo4jEngine = new Neo4jRecommendationEngine();
        await neo4jEngine.initialize();
      }
      stages[3].progress = 1.0;
      stages[3].status = 'completed';
      // Stage 5: XState Machine Start
      stages[4].status = 'active';
      // XState machine initialized in onMount
      stages[4].progress = 1.0;
      stages[4].status = 'completed';
      // Stage 6: System Ready
      stages[5].status = 'active';
      stages[5].progress = 1.0;
      stages[5].status = 'completed';
      // Mark stage 1 as completed after all others
      stages[0].progress = 1.0;
      stages[0].status = 'completed';
    } catch (error) {
      console.error('Service initialization failed:', error);
      // Mark failed stages
      stages.forEach(stage => {
        if (stage.status === 'active') {
          stage.status = 'pending';
          stage.progress = 0;
        }
      });
      errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw error;
    }
  }
  function startAnimationLoop() {
    const animate = (currentTime: number) => {
      deltaTime = currentTime - lastFrameTime; // Fixed: lastFrameTim -> lastFrameTime
      lastFrameTime = currentTime; // Fixed: currentTim -> currentTime
      // Update performance metrics
      performanceMetrics.fps = 1000 / deltaTime; // Fixed: deltaTim -> deltaTime
      // Render 3D scene
      render3DScene(currentTime);
      // Update progress animations
      updateProgressAnimations(currentTime);
      // Update streaming visualizations
      updateStreaming<!--
  Enhanced 3D Legal AI Interface
  Integrates all systems: vLLM CUDA, SIMD Parser, Neo4j Recommendations, XState, RabbitMQ
  Features: 3D headless vertex buffer, progress animations, bit-encoding, QUIC streaming
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import createIdleDetectionService, { type IdleDetectionActor } from '$lib/machines/idle-detection-rabbitmq-machine';
  import { EnhancedVLLMCudaIntegration, type StreamingRequest } from '$lib/services/enhanced-vllm-cuda-integration';
  import SIMDGPUParserIntegration, { type ParsedDocument } from '$lib/services/simd-gpu-parser-integration';
  import { Neo4jRecommendationEngine, type Recommendation } from '$lib/services/neo4j-recommendation-engine';
  import { getOllamaApiUrl } from '$lib/utils/ollama-helpers'; // Import the Ollama API helper

  // Props for component configuration
  let {
    enableGPUAcceleration = true,
    enableAIRecommendations = true,
    enableIdleProcessing = true,
    theme = 'yorha',
    maxConcurrentStreams = 100,
    progressAnimationSpeed = 1.0
  } = $props();
  // Component state
  let containerRef: HTMLDivElement;
  let canvasRef: HTMLCanvasElement;
  let progressCanvasRef: HTMLCanvasElement;
  // 3D Rendering context
  let gl: WebGLRenderingContext | null = null;
  let vertexBuffer: WebGLBuffer | null = null;
  let shaderProgram: WebGLProgram | null = null;
  // Service integrations
  let vllmIntegration: EnhancedVLLMCudaIntegration | null = null;
  let simdParser: SIMDGPUParserIntegration | null = null;
  let neo4jEngine: Neo4jRecommendationEngine | null = null;
  let idleDetectionService: IdleDetectionActor | null = null;
  // Component state
  let isInitialized = $state(false);
  let isProcessing = $state(false);
  let currentProgress = $state(0); // Use $state for reactivity
  let progressStages = $state([ // Use $state for reactivity
    { name: 'GPU Initialization', progress: 0, status: 'pending' },
    { name: 'SIMD Parser Setup', progress: 0, status: 'pending' },
    { name: 'vLLM CUDA Integration', progress: 0, status: 'pending' },
    { name: 'Neo4j Connection', progress: 0, status: 'pending' },
    { name: 'XState Machine Start', progress: 0, status: 'pending' },
    { name: 'System Ready', progress: 0, status: 'pending' }
  ]);
  // User interaction state
  let userInput = $state('');
  let chatMessages = $state<Array<any>>([]); // Added type
  let recommendations = $state<Recommendation[]>([]);
  let parsedDocument: ParsedDocument | null = null; // Use the defined interface
  // Performance metrics
  let performanceMetrics = $state({ // Use $state for reactivity
    fps: 0,
    gpuUtilization: 0,
    memoryUsage: 0,
    networkLatency: 0,
    cacheHitRate: 0,
    aiResponseTime: 0,
  });
  // Bit-encoding streaming state
  let streamingChunks = $state<Array<any>>([]); // Added type
  // Animation frame
  let animationFrame: number;
  let lastFrameTime = 0;
  let deltaTime = 0;
  let errorMessage = $state<string | null>(null); // Added error message state

  $effect(() => {
    (async () => {
      if (!browser) return;
      try {
        await initializeSystem();
      } catch (error) {
        console.error('System initialization failed:', error);
        addSystemMessage('System initialization failed. Running in degraded mode.');
        errorMessage = error instanceof Error ? error.message : 'An error occurred'; // Fixed: error message assignment
      }
    })();
  });
  onDestroy(() => {
    cleanup();
  });
  async function initializeSystem() {
    console.log('🚀 Initializing Enhanced 3D Legal AI Interface...');
    // Initialize 3D rendering context
    await initializeWebGL();
    // Initialize service integrations with progress tracking
    await initializeServicesWithProgress();
    // Start animation: loop
    startAnimationLoop();
    // Initialize idle detection if enabled
    if (enableIdleProcessing) {
      idleDetectionService = createIdleDetectionService({
        idleTimeout: 3 * 60 * 1000, // 3 minutes
        backgroundJobsEnabled: true
      });
    }
    isInitialized = true;
    addSystemMessage('System initialized successfully. All services operational.');
    console.log('✅ Enhanced 3D Legal AI Interface initialized');
  }
  async function initializeWebGL() {
    if (!canvasRef) return;
    gl = canvasRef.getContext('webgl2') || canvasRef.getContext('webgl');
    if (!gl) {
      throw new Error('WebGL not supported');
    }
    // Create shader program for 3D vertex buffer visualization
    const vertexShaderSource = `
      attribute vec3 position; // Fixed: positio -> position
      attribute vec3 color;
      attribute float progress; // Fixed: progres -> progress
      uniform mat4 mvpMatrix;
      uniform float time;
      uniform float globalProgress; // Fixed: globalProgres -> globalProgress
      varying vec3 vColor;
      varying float vProgress; // Fixed: vProgres -> vProgress
      void main() {
        // Animate vertices based on progress and time
        vec3 animatedPosition = position; // Fixed: positio -> position
        animatedPosition.y += sin(time + position.x * 0.1) * progress * 0.1; // Fixed: progress is now defined
        // Scale based on global progress
        animatedPosition *= mix(0.1, 1.0, globalProgress);
        gl_Position = mvpMatrix * vec4(animatedPosition, 1.0);
        gl_PointSize = mix(2.0, 8.0, progress);
        vColor = mix(vec3(0.3, 0.3, 0.3), color, progress);
        vProgress = progress; // Fixed: progres -> progress
      }
    `;
    const fragmentShaderSource = `
      precision mediump float;
      varying vec3 vColor;
      varying float vProgress; // Fixed: vProgres -> vProgress
      uniform float time;
      void main() {
        // Pulsing effect based on progress
        float pulse = sin(time * 3.0) * 0.1 + 0.9;
        vec3 finalColor = vColor * pulse; // Fixed: pul -> pulse
        // Add glow effect for high progress
        if (vProgress > 0.8) {
          finalColor += vec3(0.2, 0.4, 0.8) * sin(time * 5.0) * 0.3;
        }
        gl_FragColor = vec4(finalColor, mix(0.3, 1.0, vProgress));
      }
    `;
    // Compile shaders
    const vertexShader = createShader(gl, gl.VERTEX_SHADER, vertexShaderSource);
    const fragmentShader = createShader(gl, gl.FRAGMENT_SHADER, fragmentShaderSource);
    // Create program
    shaderProgram = createProgram(gl, vertexShader, fragmentShader);
    // Create vertex buffer for legal AI visualization
    createVertexBuffer();
    // Enable depth testing and blending
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
  }
  function createShader(gl: WebGLRenderingContext, type: number, source: string): WebGLShader {
    const shader = gl.createShader(type)!;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      const error = gl.getShaderInfoLog(shader);
      gl.deleteShader(shader);
      throw new Error(`Shader compilation error: ${error}`);
    }
    return shader;
  }
  function createProgram(gl: WebGLRenderingContext, vertexShader: WebGLShader, fragmentShader: WebGLShader): WebGLProgram {
    const program = gl.createProgram()!;
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      const error = gl.getProgramInfoLog(program);
      gl.deleteProgram(program);
      throw new Error(`Program linking error: ${error}`);
    }
    return program;
  }
  function createVertexBuffer() {
    if (!gl) return;
    // Create a 3D grid representing legal AI processing nodes
    const vertices: number[] = [];
    const colors: number[] = [];
    const progressValues: number[] = [];
    const gridSize = 20;
    for (let x = 0; x < gridSize; x++) {
      for (let y = 0; y < gridSize; y++) {
        for (let z = 0; z < 5; z++) {
          // Position
          vertices.push((x - gridSize/2) * 0.1, (y - gridSize/2) * 0.1, z * 0.05);
          // Color based on position (YoRHa-style)
          const hue = (x + y + z) / (gridSize * 2 + 5);
          colors.push(
            0.2 + hue * 0.3,  // R
            0.4 + hue * 0.4,  // G
            0.8 + hue * 0.2   // B
          );
          // Initial progress (will be animated)
          progressValues.push(Math.random() * 0.1);
        }
      }
    }
    // Create vertex buffer
    vertexBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
    // Interleave vertex data (position + color + progress)
    const interleavedData: number[] = [];
    const vertexCount = vertices.length / 3;
    for (let i = 0; i < vertexCount; i++) {
      interleavedData.push(
        vertices[i * 3], vertices[i * 3 + 1], vertices[i * 3 + 2], // position
        colors[i * 3], colors[i * 3 + 1], colors[i * 3 + 2],       // color
        progressValues[i]                                           // progress
      );
    }
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(interleavedData), gl.DYNAMIC_DRAW);
  }
  async function initializeServicesWithProgress() {
    const stages = progressStages; // Fixed: progressStage -> progressStages
    try {
      // Stage 1: GPU Initialization
      stages[0].status = 'active';
      stages[0].progress = 0.1;
      // Stage 2: SIMD Parser Setup
      stages[1].status = 'active';
      if (enableGPUAcceleration) {
        simdParser = new SIMDGPUParserIntegration({
          enableSpellCheck: true,
          enableEntityExtraction: true,
          enableLegalTermSuggestions: true,
          enableCitationValidation: true,
          confidenceThreshold: 0.7,
          maxSuggestions: 10,
          simdOptimization: true,
          gpuAcceleration: true,
        });
        await simdParser.initializeGPU();
      }
      stages[1].progress = 1.0;
      stages[1].status = 'completed';
      // Stage 3: vLLM CUDA Integration
      stages[2].status = 'active';
      vllmIntegration = new EnhancedVLLMCudaIntegration({
        serverUrl: getOllamaApiUrl(), // Wired Ollama endpoint, supports gemma3-legal:latest and embeddinggemma:latest
        maxConcurrentStreams,
        gpuMemoryPerDevice: 8,
        tensorParallelSize: 1,
        quantization: 'int8',
        maxModelLength: 4096,
        enableTensorCores: true,
      });
      await vllmIntegration.initializeGPU();
      stages[2].progress = 1.0;
      stages[2].status = 'completed';
      // Stage 4: Neo4j Connection
      stages[3].status = 'active';
      if (enableAIRecommendations) {
        neo4jEngine = new Neo4jRecommendationEngine();
        await neo4jEngine.initialize();
      }
      stages[3].progress = 1.0;
      stages[3].status = 'completed';
      // Stage 5: XState Machine Start
      stages[4].status = 'active';
      // XState machine initialized in onMount
      stages[4].progress = 1.0;
      stages[4].status = 'completed';
      // Stage 6: System Ready
      stages[5].status = 'active';
      stages[5].progress = 1.0;
      stages[5].status = 'completed';
      // Mark stage 1 as completed after all others
      stages[0].progress = 1.0;
      stages[0].status = 'completed';
    } catch (error) {
      console.error('Service initialization failed:', error);
      // Mark failed stages
      stages.forEach(stage => {
        if (stage.status === 'active') {
          stage.status = 'pending';
          stage.progress = 0;
        }
      });
      errorMessage = error instanceof Error ? error.message : 'An error occurred';
      throw error;
    }
  }
  function startAnimationLoop() {
    const animate = (currentTime: number) => {
      deltaTime = currentTime - lastFrameTime; // Fixed: lastFrameTim -> lastFrameTime
      lastFrameTime = currentTime; // Fixed: currentTim -> currentTime
      // Update performance metrics
      performanceMetrics.fps = 1000 / deltaTime; // Fixed: deltaTim -> deltaTime
      // Render 3D scene
      render3DScene(currentTime);
      // Update progress animations
      updateProgressAnimations(currentTime);
      // Update streaming visualizations
      updateStreaming
          class:user={message.type === 'user'}
          class:ai={message.type === 'ai'}
          class:system={message.type === 'system'}
        >
          <div class="message-type">{message.type.toUpperCase()}</div>
          <div class="message-content">{message.content}</div>
          <div class="message-time">{new Date(message.timestamp).toLocaleTimeString()}</div>
        </div>
      {/each}
    </div>
    <div class="chat-input">
      <input
        bind:value={userInput}
        placeholder="Enter legal query or document text..."
        onkeydown={e => e.key === 'Enter' && handleUserInput()}
        disabled={!isInitialized || isProcessing}
      />
      <button onclick={handleUserInput} disabled={!isInitialized || isProcessing}>
        {isProcessing ? 'Processing...' : 'Analyze'}
      </button>
    </div>
  </div>
  <!-- Recommendations Panel -->
  {#if recommendations.length > 0}
    <div class="recommendations-panel">
      <h3>AI Recommendations</h3>
      {#each recommendations as rec}
        <div class="recommendation">
          <div class="rec-title">{rec.title}</div>
          <div class="rec-description">{rec.description}</div>
          <div class="rec-meta">
            <span class="rec-score">Score: {(rec.score * 100).toFixed(0)}%</span>
            <span class="rec-confidence">Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
          </div>
          {#if rec.aiGenerated}
            <div class="rec-ai-badge">AI Generated</div>
          {/if}
        </div>
      {/each}
    </div>
  {/if}
</div>

<style>
  /* @unocss-include */
  .enhanced-3d-legal-ai-interface {
    display: grid;
    grid-template-columns: 1fr 300px;
    grid-template-rows: 400px 100px auto;
    gap: 16px;
    padding: 16px;
    background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
    color: #ffffff;
    font-family: 'Roboto Mono', monospace;
    min-height: 100vh;
    overflow: hidden;
  }
  .visualization-canvas, .progress-canvas { /* Fixed: combined selectors and removed comma */
    grid-column: 1;
    grid-row: 1; /* Visualization canvas takes row 1 */
    border: 1px solid #444;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.6);
  }
  .progress-canvas {
    grid-row: 2; /* Progress canvas takes row 2 */
  }
  .status-panel {
    grid-column: 2;
    grid-row: 1 / 3;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    overflow-y: auto;
  }
  .status-header {
    display: flex;
    justify-content: space-between; /* Fixed: space-betweenn -> space-between */
    align-items: center;
    margin-bottom: 16px;
  }
  .status-header h3 {
    margin: 0;
    color: #00d4aa;
    font-size: 14px;
    text-transform: uppercase;
  }
  .status-indicator {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 12px;
    color: #888;
  }
  .status-indicator.active {
    color: #00d4aa;
  }
  .pulse {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #888;
    animation: pulse 2s infinite;
  }
  .status-indicator.active .pulse {
    background: #00d4aa;
  }
  .initialization-progress {
    margin-bottom: 16px;
  }
  .stage {
    margin-bottom: 8px;
    padding: 8px;
    border: 1px solid #333;
    border-radius: 4px;
    font-size: 12px;
  }
  .stage.active {
    border-color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
  }
  .stage.completed {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
  }
  .stage-name {
    font-weight: bold;
    margin-bottom: 4px;
  }
  .stage-progress {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .progress-bar {
    flex: 1; /* Fixed: flex: 1, -> flex: 1; */
    height: 4px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
  }
  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #00d4aa, #00ff88);
    border-radius: 2px;
    transition: width 0.3s ease;
  }
  .progress-text {
    font-size: 10px;
    color: #888;
    min-width: 30px;
    text-align: right;
  }
  .performance-metrics {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 16px;
  }
  .metric {
    display: flex;
    justify-content: space-between; /* Fixed: space-betweenn -> space-between */
    align-items: center;
    padding: 4px 8px;
    background: rgba(0, 0, 0, 0.5);
    border-radius: 4px;
    font-size: 11px;
  }
  .metric-label {
    color: #888;
  }
  .metric-value {
    color: #00d4aa;
    font-weight: bold;
  }
  .error-message {
    background-color: rgba(255, 0, 0, 0.2);
    border: 1px solid red;
    padding: 8px;
    border-radius: 4px;
    color: #ffcccc;
    font-size: 12px;
    margin-top: 16px;
  }
  .streaming-chunks {
    grid-column: 1 / 3;
    grid-row: 3; /* Fixed: grid-row: 3, -> grid-row: 3; */
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    max-height: 200px;
    overflow-y: auto;
  }
  .streaming-chunks h4 {
    margin: 0 0 16px 0;
    color: #00d4aa;
    font-size: 14px;
    text-transform: uppercase;
  }
  .chunks-container {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
  }
  .chunk {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
    border-radius: 4px;
    font-size: 11px;
    min-width: 200px;
  }
  .chunk.streaming {
    border-color: #00d4aa;
    background: rgba(0, 212, 170, 0.1);
  }
  .chunk.completed {
    border-color: #4caf50;
    background: rgba(76, 175, 80, 0.1);
  }
  .chunk-id {
    font-family: monospace;
    color: #888;
  }
  .chunk-progress {
    flex: 1; /* Fixed: flex: 1, -> flex: 1; */
  }
  .chunk-progress-bar {
    width: 100%;
    height: 3px;
    background: #333;
    border-radius: 2px;
    overflow: hidden;
  }
  .chunk-progress-fill {
    height: 100%;
    background: #00d4aa;
    border-radius: 2px;
    transition: width 0.1s linear;
  }
  .chunk-status {
    color: #888;
    text-transform: uppercase;
    font-size: 10px;
  }
  .chat-interface {
    grid-column: 1 / 3;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    height: 400px;
  }
  .chat-header {
    display: flex;
    justify-content: space-between; /* Fixed: space-betweenn -> space-between */
    align-items: center;
    margin-bottom: 16px;
    padding-bottom: 8px;
    border-bottom: 1px solid #333;
  }
  .chat-header h3 {
    margin: 0;
    color: #00d4aa;
    font-size: 14px;
    text-transform: uppercase;
  }
  .ai-status {
    font-size: 12px;
    color: #888;
  }
  .ai-status.processing {
    color: #ff9800;
    animation: pulse 1s infinite;
  }
  .chat-messages {
    flex: 1;
    overflow-y: auto;
    margin-bottom: 16px;
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .message {
    padding: 8px 12px;
    border-radius: 8px;
    font-size: 13px;
  }
  .message.user {
    background: rgba(0, 212, 170, 0.1);
    border-left: 3px solid #00d4aa;
    align-self: flex-end;
    max-width: 70%;
  }
  .message.ai {
    background: rgba(33, 150, 243, 0.1);
    border-left: 3px solid #2196f3;
    align-self: flex-start;
    max-width: 80%;
  }
  .message.system {
    background: rgba(255, 152, 0, 0.1);
    border-left: 3px solid #ff9800;
    align-self: center;
    max-width: 90%;
  }
  .message-type {
    font-size: 10px;
    color: #888;
    text-transform: uppercase;
    margin-bottom: 4px;
  }
  .message-content {
    margin-bottom: 4px;
    line-height: 1.4;
  }
  .message-time {
    font-size: 10px;
    color: #666;
    text-align: right;
  }
  .chat-input {
    display: flex;
    gap: 12px;
  }
  .chat-input input {
    flex: 1; /* Fixed: flex: 1, -> flex: 1; */
    padding: 10px 12px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
    border-radius: 4px;
    color: #ffffff;
    font-family: inherit;
    font-size: 13px;
  }
  .chat-input input:focus {
    outline: none;
    border-color: #00d4aa;
    box-shadow: 0 0 0 2px rgba(0, 212, 170, 0.2);
  }
  .chat-input button {
    padding: 10px 16px;
    background: #00d4aa;
    border: none;
    border-radius: 4px;
    color: #000;
    font-family: inherit;
    font-size: 13px;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s; /* Fixed: transition: background 0.2 -> transition: background 0.2s; */
  }
  .chat-input button:hover:not(:disabled) { /* Fixed: buttonhover:not(:disabled) {, -> button:hover:not(:disabled) { */
    background: #00ff88;
  }
  .chat-input button:disabled { /* Fixed: buttondisabled { -> button:disabled { */
    background: #333;
    color: #666;
    cursor: not-allowed;
  }
  .recommendations-panel {
    grid-column: 1 / 3;
    background: rgba(0, 0, 0, 0.7);
    border: 1px solid #333;
    border-radius: 8px;
    padding: 16px;
    max-height: 300px;
    overflow-y: auto;
  }
  .recommendations-panel h3 {
    margin: 0 0 16px 0;
    color: #00d4aa;
    font-size: 14px;
    text-transform: uppercase;
  }
  .recommendation {
    margin-bottom: 12px;
    padding: 12px;
    background: rgba(0, 0, 0, 0.5);
    border: 1px solid #333;
    border-radius: 4px;
    position: relative; /* Fixed: position relative; -> position: relative; */
  }
  .rec-title {
    font-weight: bold;
    color: #00d4aa;
    margin-bottom: 6px;
    font-size: 13px;
  }
  .rec-description {
    color: #ccc;
    font-size: 12px;
    line-height: 1.4;
    margin-bottom: 8px;
  }
  .rec-meta {
    display: flex;
    gap: 16px;
    font-size: 11px;
    color: #888;
  }
  .rec-score, .rec-confidence {
    font-weight: bold;
  }
  .rec-ai-badge {
    position: absolute; /* Fixed: position absolute; -> position: absolute; */
    top: 8px;
    right: 8px;
    background: rgba(33, 150, 243, 0.2);
    color: #2196f3;
    padding: 2px 6px;
    border-radius: 2px;
    font-size: 9px;
    text-transform: uppercase;
    font-weight: bold;
  }
  /* YoRHa theme specific styles */
  .enhanced-3d-legal-ai-interface.yorha {
    background: linear-gradient(135deg, #2c1810 0%, #1a1a2e 100%);
  }
  .yorha .visualization-canvas, .yorha .progress-canvas { /* Fixed: combined selectors */
    border-color: #d4af37;
  }
  .yorha .status-indicator.active {
    color: #d4af37;
  }
  .yorha .status-indicator.active .pulse {
    background: #d4af37;
  }
  .yorha .stage.active {
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.1);
  }
  .yorha .metric-value {
    color: #d4af37;
  }
  .yorha .chunk.streaming {
    border-color: #d4af37;
    background: rgba(212, 175, 55, 0.1);
  }
  .yorha .chunk-progress-fill {
    background: #d4af37;
  }
  @keyframes pulse {
    0% { opacity: 0.5; }
    50% { opacity: 1; }
    100% { opacity: 0.5; }
  }
  @media (max-width: 1200px) {
    .enhanced-3d-legal-ai-interface {
      grid-template-columns: 1fr;
      grid-template-rows: 300px auto auto auto auto;
    }
    .visualization-canvas, .progress-canvas { /* Fixed: combined selectors */
      grid-column: 1;
      grid-row: 1; /* Visualization canvas takes row 1 */
      height: 250px; /* Adjusted height for smaller screens */
    }
    .progress-canvas {
      grid-row: 2; /* Progress canvas takes row 2 */
      height: 80px;
    }
    .status-panel {
      grid-column: 1;
      grid-row: 3;
      max-height: 300px;
    }
    .streaming-chunks {
      grid-column: 1;
      grid-row: 4; /* Fixed: grid-row: 4, -> grid-row: 4; */
    }
    .chat-interface {
      grid-column: 1;
      grid-row: 5; /* Fixed: grid-row: 5, -> grid-row: 5; */
    }
    .recommendations-panel {
      grid-column: 1; /* Fixed: grid-column: 1, -> grid-column: 1; */
    }
  }
</style>


