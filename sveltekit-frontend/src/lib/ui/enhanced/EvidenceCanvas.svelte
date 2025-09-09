<script lang="ts">
  import { onMount, onDestroy } from "svelte";
  import { apiFetch } from "$lib/api/clients/api-client";
  import { concurrencyOrchestrator } from '$lib/services/concurrency-orchestrator';
  import { detectiveAnalysisEngine } from '$lib/evidence/detective-analysis-engine';
  import { Upload, FileText, Image, CheckCircle, AlertCircle, Loader2, Zap, X, Cpu, Database, Layers } from 'lucide-svelte';
  
  // Enhanced ingestion system (mock implementations for demo)
  const ingestionWorkerManager = {
    processIngestion: async (task: any, onProgress?: Function) => {
      // Simulate processing with callbacks
      if (onProgress) {
        setTimeout(() => onProgress(25, 'Uploading files'), 500);
        setTimeout(() => onProgress(50, 'Generating embeddings'), 1500);
        setTimeout(() => onProgress(75, 'SOM clustering'), 2500);
        setTimeout(() => onProgress(100, 'RTX compression'), 3500);
      }
      
      // Simulate processing delay
      await new Promise(resolve => setTimeout(resolve, 4000));
      
      return {
        taskId: task.id,
        success: true,
        uploadResults: task.files.map((f: File, i: number) => ({
          success: true,
          fileId: `file-${i}`,
          fileName: f.name,
          bucket: task.options.bucket,
          size: f.size
        })),
        embeddings: { documentEmbeddings: 1, chunkEmbeddings: 5, processingTime: 1200 },
        somClustering: { clusters: 3, quality: 0.85, processingTime: 800 },
        rtxCompression: { originalSize: task.files[0].size, compressedSize: Math.floor(task.files[0].size / 50), ratio: '50:1', processingTime: 500 },
        totalProcessingTime: 4000
      };
    },
    isAvailable: true
  };
  
  class MockEnhancedIngestionPipeline {
    async initialize() { 
      console.log('🎮 Mock Enhanced Ingestion Pipeline initialized'); 
    }
    
    async processMultimodalEvidence(evidence: any) {
      // Simulate multimodal processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return {
        processing_result: { 
          document_id: evidence.id, 
          embedding: new Array(384).fill(0).map(() => Math.random() - 0.5), 
          cluster_id: Math.floor(Math.random() * 8), 
          processing_time: 2000,
          extraction_metadata: {
            entities: ['evidence', 'legal', 'document'],
            keywords: ['case', 'analysis'],
            confidence: 0.85,
            language: 'en'
          }
        },
        anchor_points: [
          { 
            id: '1', 
            type: 'text', 
            coordinates: { x: 0.1, y: 0.1, width: 0.3, height: 0.1 }, 
            confidence: 0.9, 
            description: 'Key evidence section', 
            legal_relevance: 'high' 
          },
          { 
            id: '2', 
            type: 'object', 
            coordinates: { x: 0.5, y: 0.3, width: 0.2, height: 0.2 }, 
            confidence: 0.8, 
            description: 'Relevant document element', 
            legal_relevance: 'medium' 
          }
        ],
        timeline_segments: evidence.type === 'video' ? [
          { start_time: 0, end_time: 30, event_type: 'scene_change', description: 'Initial scene', confidence: 0.9, legal_significance: 'Key evidence timestamp' }
        ] : undefined,
        copilot_analysis: `Enhanced analysis for ${evidence.type} evidence: Legal relevance assessed with high confidence. Recommended for case inclusion.`
      };
    }
  }
  
  interface Props {
    caseId?: string;
    enableDragDrop?: boolean;
    enableGPUProcessing?: boolean;
    enableCUDAAcceleration?: boolean;
    enableN64Style?: boolean;
    maxFileSize?: number;
    acceptedTypes?: string[];
  }
  
  let {
    caseId = '',
    enableDragDrop = true,
    enableGPUProcessing = true,
    enableCUDAAcceleration = true,
    enableN64Style = true,
    maxFileSize = 100 * 1024 * 1024, // 100MB
    acceptedTypes = ['image/*', 'application/pdf', 'text/*', '.docx', '.xlsx']
  }: Props = $props();
  
  let canvasEl: HTMLCanvasElement = $state();
  let fabricCanvas: any;
  let fabric: any;
  let fileInput: HTMLInputElement;

  let analyzing = $state(false);
  let error: string | null = $state(null);
  let result: {
    analysis?: string;
    summary?: string;
    confidence?: number;
    processing_time_ms?: number;
    status?: string;
    error?: string;
  } | null = $state(null);
  
  let options = $state({
    analyze_layout: true,
    extract_entities: true,
    generate_summary: true,
    confidence_level: 0.8,
    context_window: 4096,
  });
  
  // Drag and drop state
  let dragOver = $state(false);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let uploadedFiles = $state<UploadedFile[]>([]);
  let performanceStats = $state({
    totalFiles: 0,
    cudaAccelerated: 0,
    avgProcessingTime: 0,
    throughputMBps: 0
  });
  
  interface UploadedFile {
    id: string;
    file: File;
    progress: number;
    status: 'pending' | 'uploading' | 'ingestion' | 'detective_analysis' | 'completed' | 'error';
    minioPath?: string;
    cudaProcessed?: boolean;
    errorMessage?: string;
    canvasObjectId?: string;
    ingestionResult?: any;
    detectiveAnalysis?: {
      ocrResults: any;
      embeddings: any;
      analysis: any;
      conflicts: any[];
      processingTime: number;
    };
    anchorPoints?: Array<{
      id: string;
      type: 'text' | 'object';
      coordinates: { x: number; y: number; width: number; height: number };
      confidence: number;
      description: string;
      legal_relevance: 'high' | 'medium' | 'low';
    }>;
  }
  
  interface UploadResult {
    id: string;
    fileName: string;
    minioPath: string;
    size: number;
    contentType: string;
    cudaOptimized: boolean;
    processingTime: number;
  }

  onMount(async () => {
    const fabricModule = await import("fabric");
    fabric = fabricModule.fabric;
    fabricCanvas = new fabric.Canvas(canvasEl);
    
    // Register canvas with concurrency orchestrator
    const canvasId = `evidence-canvas-${Date.now()}`;
    concurrencyOrchestrator.createCanvas(canvasId, canvasEl);
    
    // Setup canvas drag and drop
    if (enableDragDrop) {
      setupCanvasDragDrop();
    }
    
    // Example: Add a rectangle with N64 styling
    fabricCanvas.add(
      new fabric.Rect({
        left: 100,
        top: 100,
        fill: enableN64Style ? "#FFD700" : "red",
        width: 60,
        height: 60,
        stroke: enableN64Style ? "#FFA500" : undefined,
        strokeWidth: enableN64Style ? 2 : 0
      })
    );
    
    // Example: Add evidence annotation text with N64 styling
    fabricCanvas.add(
      new fabric.Text('🎮 Evidence Item #1', {
        left: 120,
        top: 80,
        fontFamily: enableN64Style ? 'Courier New' : 'Arial',
        fontSize: enableN64Style ? 14 : 12,
        fill: enableN64Style ? '#FFD700' : '#333',
        fontWeight: enableN64Style ? 'bold' : 'normal'
      })
    );
    
    // Add canvas event listeners for file drops
    canvasEl.addEventListener('dragover', handleCanvasDragOver);
    canvasEl.addEventListener('dragleave', handleCanvasDragLeave);
    canvasEl.addEventListener('drop', handleCanvasDrop);
  });
  
  onDestroy(() => {
    if (canvasEl) {
      canvasEl.removeEventListener('dragover', handleCanvasDragOver);
      canvasEl.removeEventListener('dragleave', handleCanvasDragLeave);
      canvasEl.removeEventListener('drop', handleCanvasDrop);
    }
  });

  function collectObjects() {
    const objs = (fabricCanvas?.getObjects?.() ?? []).map((o: any) => {
      const type = o.type || "object";
      const left = typeof o.left === "number" ? o.left : 0;
      const top = typeof o.top === "number" ? o.top : 0;
      const text = typeof o.text === "string" ? o.text : undefined;
      return { type, position: { x: left, y: top }, ...(text ? { text } : {}) };
    });
    return objs;
  }

  async function analyzeCanvas() {
    analyzing = true;
    error = null;
    result = null;
    
    try {
      // Use concurrency orchestrator for analysis
      const analysisTaskId = await concurrencyOrchestrator.submitAnalysisTask(
        {
          canvas_json: fabricCanvas?.toJSON() || {},
          objects: collectObjects(),
          canvas_size: { width: canvasEl.width, height: canvasEl.height },
          uploaded_files: uploadedFiles.filter(f => f.status === 'completed').map(f => ({
            id: f.id,
            fileName: f.file.name,
            minioPath: f.minioPath,
            cudaProcessed: f.cudaProcessed
          })),
          options
        },
        'legal'
      );
      
      // Subscribe to task completion
      const unsubscribe = concurrencyOrchestrator.subscribe((snapshot: any) => {
        const completedResult = snapshot.context.results.find(
          (r: any) => r.taskId === analysisTaskId && r.success
        );
        
        if (completedResult) {
          result = {
            analysis: completedResult.data.response || completedResult.data.analysis || 'Analysis completed',
            summary: completedResult.data.summary || 'Summary generated',
            confidence: completedResult.data.confidence || 0.85,
            processing_time_ms: completedResult.duration,
            status: 'success'
          };
          unsubscribe();
          analyzing = false;
        }
        
        const failedResult = snapshot.context.results.find(
          (r: any) => r.taskId === analysisTaskId && !r.success
        );
        
        if (failedResult) {
          error = failedResult.error || 'Analysis failed';
          unsubscribe();
          analyzing = false;
        }
      });
      
      // Fallback timeout
      setTimeout(() => {
        if (analyzing) {
          error = 'Analysis timed out';
          analyzing = false;
          unsubscribe();
        }
      }, 30000);
      
    } catch (e: any) {
      error = e instanceof Error ? e.message : String(e);
      analyzing = false;
    }
  }
  
  // Drag and Drop Functions
  function setupCanvasDragDrop() {
    console.log('🎮 Canvas drag and drop enabled with N64 style');
  }
  
  function handleCanvasDragOver(event: DragEvent) {
    event.preventDefault();
    event.dataTransfer!.dropEffect = 'copy';
    if (!dragOver && !uploading) {
      dragOver = true;
    }
  }
  
  function handleCanvasDragLeave(event: DragEvent) {
    event.preventDefault();
    const rect = canvasEl.getBoundingClientRect();
    const x = event.clientX;
    const y = event.clientY;
    
    if (x < rect.left || x > rect.right || y < rect.top || y > rect.bottom) {
      dragOver = false;
    }
  }
  
  function handleCanvasDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    
    if (uploading) return;
    
    const droppedFiles = Array.from(event.dataTransfer?.files || []);
    const canvasRect = canvasEl.getBoundingClientRect();
    const dropX = event.clientX - canvasRect.left;
    const dropY = event.clientY - canvasRect.top;
    
    processDroppedFiles(droppedFiles, { x: dropX, y: dropY });
  }
  
  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    if (!target.files) return;
    
    const selectedFiles = Array.from(target.files);
    processDroppedFiles(selectedFiles, { x: 400, y: 300 }); // Center position
    
    target.value = ''; // Clear input
  }
  
  async function processDroppedFiles(droppedFiles: File[], position: { x: number; y: number }) {
    error = null;
    
    // Validate files
    const validFiles = droppedFiles.filter(file => {
      if (file.size > maxFileSize) {
        console.warn(`File ${file.name} exceeds size limit`);
        return false;
      }
      
      const isValidType = acceptedTypes.some(type => {
        if (type.startsWith('.')) {
          return file.name.toLowerCase().endsWith(type.toLowerCase());
        }
        return file.type.match(type.replace('*', '.*'));
      });
      
      if (!isValidType) {
        console.warn(`File ${file.name} has invalid type`);
        return false;
      }
      
      return true;
    });

    if (validFiles.length === 0) {
      error = 'No valid files to upload';
      return;
    }

    // Create upload file objects
    const uploadFiles: UploadedFile[] = validFiles.map(file => ({
      id: `${Date.now()}-${Math.random()}`,
      file,
      progress: 0,
      status: 'pending'
    }));

    uploadedFiles = [...uploadedFiles, ...uploadFiles];
    performanceStats.totalFiles += uploadFiles.length;
    
    // Start upload process
    await uploadFilesToMinIO(uploadFiles, position);
  }
  
  async function uploadFilesToMinIO(uploadFiles: UploadedFile[], position: { x: number; y: number }) {
    uploading = true;
    uploadProgress = 0;
    
    const startTime = Date.now();
    
    try {
      for (let i = 0; i < uploadFiles.length; i++) {
        const uploadFile = uploadFiles[i];
        uploadFile.status = 'uploading';
        
        uploadProgress = (i / uploadFiles.length) * 100;

        // CUDA preprocessing if enabled
        let preprocessedData = uploadFile.file;
        let cudaProcessed = false;
        
        if (enableCUDAAcceleration && shouldUseCudaPreprocessing(uploadFile.file)) {
          const cudaResult = await preprocessWithCuda(uploadFile.file);
          if (cudaResult.success) {
            preprocessedData = cudaResult.processedFile || uploadFile.file;
            cudaProcessed = true;
            performanceStats.cudaAccelerated++;
          }
        }

        // Upload to MinIO via evidence API
        const result = await uploadSingleFile(uploadFile, preprocessedData, cudaProcessed);
        
        if (result.success) {
          uploadFile.status = 'ingestion';
          uploadFile.progress = 100;
          uploadFile.cudaProcessed = cudaProcessed;
          uploadFile.minioPath = result.data.minioPath;
          
          // Start enhanced ingestion processing
          try {
            const ingestionResult = await processEnhancedIngestion(uploadFile);
            uploadFile.ingestionResult = ingestionResult.processing_result;
            uploadFile.anchorPoints = ingestionResult.anchor_points;
            
            // Start detective analysis
            uploadFile.status = 'detective_analysis';
            const detectiveResult = await processDetectiveAnalysis(uploadFile);
            uploadFile.detectiveAnalysis = detectiveResult;
            
            uploadFile.status = 'completed';
            
            // Add file to canvas with anchor points and detective insights
            await addFileToCanvas(uploadFile, position, result.data);
            
            // Add anchor points visualization
            if (ingestionResult.anchor_points) {
              await addAnchorPointsToCanvas(uploadFile, ingestionResult.anchor_points);
            }
            
            // Add detective analysis visualization
            if (detectiveResult.analysis.detectedPatterns.length > 0) {
              await addDetectiveInsightsToCanvas(uploadFile, detectiveResult);
            }
            
          } catch (ingestionError) {
            console.warn('Enhanced ingestion failed:', ingestionError);
            uploadFile.status = 'completed'; // Still mark as completed if upload succeeded
            await addFileToCanvas(uploadFile, position, result.data);
          }
          
          // Adjust position for next file
          position.x += 120;
          if (position.x > 600) {
            position.x = 50;
            position.y += 120;
          }
          
        } else {
          uploadFile.status = 'error';
          uploadFile.errorMessage = result.error;
        }
      }

      const endTime = Date.now();
      const totalTime = endTime - startTime;
      const totalSizeMB = uploadFiles.reduce((sum, f) => sum + f.file.size, 0) / (1024 * 1024);
      
      performanceStats.avgProcessingTime = totalTime / uploadFiles.length;
      performanceStats.throughputMBps = totalSizeMB / (totalTime / 1000);

    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Upload failed';
      console.error('🎮 Upload error:', errorMsg);
    } finally {
      uploading = false;
      uploadProgress = 0;
    }
  }
  
  function shouldUseCudaPreprocessing(file: File): boolean {
    const cudaTypes = ['image/', 'application/pdf'];
    const isLargeFile = file.size > 10 * 1024 * 1024; // 10MB+
    
    return cudaTypes.some(type => file.type.startsWith(type)) || isLargeFile;
  }
  
  async function preprocessWithCuda(file: File) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('options', JSON.stringify({
        enableGpuOptimization: enableGPUProcessing,
        targetGpuArch: 'sm_75', // RTX 3060 Ti
        useClangOptimizations: true
      }));

      const response = await fetch('/api/v1/gpu/cuda/preprocess', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`CUDA preprocessing failed: ${response.statusText}`);
      }

      const result = await response.json();
      return {
        success: true,
        processedFile: result.processedFile ? new File([result.processedFile], file.name, { type: file.type }) : undefined,
        metadata: result.metadata
      };

    } catch (error) {
      console.warn('CUDA preprocessing failed:', error);
      return { success: false };
    }
  }
  
  async function uploadSingleFile(uploadFile: UploadedFile, file: File, cudaProcessed: boolean) {
    const formData = new FormData();
    
    formData.append('file', file);
    formData.append('uploadData', JSON.stringify({
      caseId,
      title: file.name,
      description: `🎮 Canvas upload: ${file.name}`,
      evidenceType: getEvidenceType(file),
      enableAiAnalysis: true,
      enableEmbeddings: true,
      enableOcr: file.type.startsWith('image/') || file.type === 'application/pdf',
      cudaPreprocessed: cudaProcessed
    }));

    const response = await fetch('/api/evidence/upload', {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json();
      return {
        success: false,
        error: errorData.error?.message || 'Upload failed'
      };
    }

    const result = await response.json();
    
    if (result.success && result.data?.[0]) {
      return {
        success: true,
        data: {
          ...result.data[0],
          cudaOptimized: cudaProcessed
        } as UploadResult
      };
    }

    return {
      success: false,
      error: 'Invalid response from upload service'
    };
  }
  
  async function addFileToCanvas(uploadFile: UploadedFile, position: { x: number; y: number }, uploadResult: UploadResult) {
    if (!fabricCanvas) return;
    
    const file = uploadFile.file;
    
    if (file.type.startsWith('image/')) {
      // Add image to canvas
      const reader = new FileReader();
      reader.onload = (e) => {
        const imgElement = new Image();
        imgElement.onload = () => {
          const fabricImage = new fabric.Image(imgElement, {
            left: position.x,
            top: position.y,
            scaleX: 0.3,
            scaleY: 0.3,
            cornerColor: enableN64Style ? '#FFD700' : '#178cff',
            cornerStrokeColor: enableN64Style ? '#FFA500' : '#178cff',
            borderColor: enableN64Style ? '#FFD700' : '#178cff'
          });
          
          fabricCanvas.add(fabricImage);
          uploadFile.canvasObjectId = fabricImage.id;
          
          // Add N64-style label
          const label = new fabric.Text(enableN64Style ? `🎮 ${file.name}` : file.name, {
            left: position.x,
            top: position.y - 25,
            fontSize: enableN64Style ? 12 : 10,
            fill: enableN64Style ? '#FFD700' : '#333',
            fontFamily: enableN64Style ? 'Courier New' : 'Arial',
            fontWeight: enableN64Style ? 'bold' : 'normal',
            backgroundColor: enableN64Style ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
            padding: 3
          });
          fabricCanvas.add(label);
          fabricCanvas.renderAll();
        };
        imgElement.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Add file icon and label for non-images
      const icon = new fabric.Rect({
        left: position.x,
        top: position.y,
        width: 80,
        height: 100,
        fill: enableN64Style ? '#1a1a2e' : '#4090FF',
        stroke: enableN64Style ? '#FFD700' : '#333',
        strokeWidth: enableN64Style ? 3 : 2,
        rx: enableN64Style ? 0 : 5,
        ry: enableN64Style ? 0 : 5
      });
      
      // File type icon
      const fileIcon = new fabric.Text(getFileIcon(file), {
        left: position.x + 25,
        top: position.y + 20,
        fontSize: 24,
        fill: enableN64Style ? '#FFD700' : '#fff',
        fontFamily: enableN64Style ? 'Courier New' : 'Arial',
        textAlign: 'center'
      });
      
      const label = new fabric.Text(enableN64Style ? `🎮 ${file.name}` : file.name, {
        left: position.x + 5,
        top: position.y + 50,
        fontSize: enableN64Style ? 10 : 9,
        fill: enableN64Style ? '#FFD700' : '#fff',
        fontFamily: enableN64Style ? 'Courier New' : 'Arial',
        width: 70,
        textAlign: 'center',
        fontWeight: enableN64Style ? 'bold' : 'normal'
      });
      
      // CUDA indicator if processed
      if (uploadFile.cudaProcessed) {
        const cudaIndicator = new fabric.Text('⚡', {
          left: position.x + 65,
          top: position.y + 5,
          fontSize: 16,
          fill: '#40FF40'
        });
        fabricCanvas.add(cudaIndicator);
      }
      
      fabricCanvas.add(icon);
      fabricCanvas.add(fileIcon);
      fabricCanvas.add(label);
      uploadFile.canvasObjectId = icon.id;
      fabricCanvas.renderAll();
    }
  }
  
  function getFileIcon(file: File): string {
    if (file.type.startsWith('image/')) return '🖼️';
    if (file.type === 'application/pdf') return '📄';
    if (file.type.startsWith('video/')) return '🎥';
    if (file.type.startsWith('audio/')) return '🎵';
    if (file.type.startsWith('text/')) return '📝';
    if (file.type.includes('word')) return '📘';
    if (file.type.includes('excel') || file.type.includes('spreadsheet')) return '📊';
    return '📎';
  }
  
  function getEvidenceType(file: File): string {
    if (file.type.startsWith('image/')) return 'IMAGE';
    if (file.type === 'application/pdf') return 'PDF';
    if (file.type.startsWith('video/')) return 'VIDEO';
    if (file.type.startsWith('audio/')) return 'AUDIO';
    if (file.type.startsWith('text/')) return 'TEXT';
    return 'DOCUMENT';
  }
  
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  
  function openFileDialog() {
    if (!uploading && fileInput) {
      fileInput.click();
    }
  }
  
  async function processEnhancedIngestion(uploadFile: UploadedFile) {
    if (!ingestionPipeline) {
      ingestionPipeline = new MockEnhancedIngestionPipeline();
      await ingestionPipeline.initialize();
    }
    
    const evidence = {
      id: uploadFile.id,
      type: getEvidenceType(uploadFile.file).toLowerCase(),
      fileName: uploadFile.file.name,
      size: uploadFile.file.size,
      minioPath: uploadFile.minioPath
    };
    
    return await ingestionPipeline.processMultimodalEvidence(evidence);
  }
  
  async function processDetectiveAnalysis(uploadFile: UploadedFile) {
    try {
      console.log(`🕵️ Starting detective analysis for: ${uploadFile.file.name}`);
      
      // Use the detective analysis engine
      const evidenceType = getEvidenceType(uploadFile.file).toLowerCase();
      const evidenceItem = await detectiveAnalysisEngine.analyzeEvidence(
        uploadFile.file,
        {
          type: evidenceType as any,
          caseId: caseId,
          userId: 'evidence-canvas-user'
        }
      );
      
      return {
        ocrResults: evidenceItem.ocrResults,
        embeddings: evidenceItem.embeddings,
        analysis: evidenceItem.analysis,
        conflicts: [], // Would be populated by conflict detection
        processingTime: evidenceItem.metadata.processingTime
      };
      
    } catch (error) {
      console.error('Detective analysis failed:', error);
      return {
        ocrResults: { text: '', confidence: 0, boundingBoxes: [], handwritingDetected: false },
        embeddings: {},
        analysis: { detectedPatterns: [], legalRelevance: 'low', conflictIndicators: [], contextualClues: [], suggestedActions: [] },
        conflicts: [],
        processingTime: 0
      };
    }
  }

  async function addDetectiveInsightsToCanvas(uploadFile: UploadedFile, detectiveResult: any) {
    if (!fabricCanvas || !detectiveResult.analysis.detectedPatterns.length) return;
    
    // Find the uploaded file's canvas object
    const canvasObjects = fabricCanvas.getObjects();
    const fileObject = canvasObjects.find((obj: any) => obj.id === uploadFile.canvasObjectId);
    
    if (!fileObject) return;
    
    // Add detective insights indicator
    const insightsIcon = new fabric.Text('🔍', {
      left: fileObject.left + 80,
      top: fileObject.top - 5,
      fontSize: 16,
      fill: detectiveResult.analysis.legalRelevance === 'high' ? '#FF3030' : 
            detectiveResult.analysis.legalRelevance === 'medium' ? '#FFD700' : '#40FF40',
      selectable: true,
      hasControls: false,
      hasBorders: false,
      hoverCursor: 'pointer'
    });
    
    // Add tooltip on hover (simplified)
    insightsIcon.on('mouseover', () => {
      const tooltip = new fabric.Text(
        `Detective Analysis:\n${detectiveResult.analysis.detectedPatterns.slice(0, 3).join('\n')}`,
        {
          left: insightsIcon.left + 20,
          top: insightsIcon.top,
          fontSize: enableN64Style ? 9 : 8,
          fill: enableN64Style ? '#FFD700' : '#333',
          fontFamily: enableN64Style ? 'Courier New' : 'Arial',
          backgroundColor: enableN64Style ? 'rgba(0,0,0,0.9)' : 'rgba(255,255,255,0.9)',
          padding: 5,
          cornerStyle: 'rect',
          selectable: false
        }
      );
      
      fabricCanvas.add(tooltip);
      setTimeout(() => fabricCanvas.remove(tooltip), 3000);
    });
    
    fabricCanvas.add(insightsIcon);
    fabricCanvas.renderAll();
  }

  // Enhanced evidence processing using unified legal orchestration service
  async function processEvidenceWithUnifiedService(canvasId: string, evidenceItems: any[]) {
    try {
      console.log(`🚀 Starting unified evidence processing for canvas: ${canvasId}`);
      
      // Use the unified legal orchestration service for comprehensive processing
      const response = await apiFetch('/api/legal/evidence-canvas', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          canvasId,
          evidenceItems,
          analysisType: 'detective'
        })
      });

      if (response.success) {
        console.log(`✅ Evidence processing initiated:`, {
          jobIds: response.jobIds,
          evidenceCount: response.evidenceCount
        });

        // Start monitoring job progress
        monitorUnifiedProcessingJobs(response.jobIds, response.jobStatuses);

        return response;
      } else {
        console.error('❌ Evidence processing failed:', response.error);
        return null;
      }
    } catch (error) {
      console.error('❌ Unified evidence processing error:', error);
      return null;
    }
  }

  // Monitor processing jobs and update UI
  async function monitorUnifiedProcessingJobs(jobIds: string[], jobStatuses: Record<string, any>) {
    const monitoringPromises = jobIds.map(async (jobId) => {
      const endpoint = jobStatuses[jobId].subscriptionEndpoint;
      
      // Poll job status every 2 seconds
      const pollStatus = async () => {
        try {
          const statusResponse = await apiFetch(endpoint);
          if (statusResponse.success) {
            updateJobProgressUI(jobId, statusResponse.status);
            
            // Continue polling if job is still processing
            if (statusResponse.status.status === 'processing' || statusResponse.status.status === 'pending') {
              setTimeout(pollStatus, 2000);
            } else if (statusResponse.status.status === 'completed') {
              handleJobCompletion(jobId, statusResponse.status);
            }
          }
        } catch (error) {
          console.error(`❌ Failed to poll status for job ${jobId}:`, error);
        }
      };

      // Start polling
      pollStatus();
    });

    return Promise.all(monitoringPromises);
  }

  // Update UI with job progress
  function updateJobProgressUI(jobId: string, status: any) {
    // Update any UI elements that show processing status
    console.log(`📊 Job ${jobId} status: ${status.status} (${status.progress || 0}%)`);
    
    // You could add visual indicators here, update progress bars, etc.
    if (status.status === 'processing') {
      showProcessingIndicator(`Processing job: ${status.type}`);
    }
  }

  // Handle job completion
  function handleJobCompletion(jobId: string, status: any) {
    console.log(`✅ Job ${jobId} completed:`, status);
    
    // Update canvas with results if applicable
    if (status.results) {
      addProcessingResultsToCanvas(status.results);
    }
  }

  // Add processing results to canvas
  function addProcessingResultsToCanvas(results: any) {
    if (!fabricCanvas) return;

    // Add visual representations of processing results
    if (results.detectedEntities) {
      addEntitiesToCanvas(results.detectedEntities);
    }
    
    if (results.relationshipMap) {
      addRelationshipLinesToCanvas(results.relationshipMap);
    }
    
    if (results.patternDetection) {
      highlightPatterns(results.patternDetection);
    }
  }

  // Trigger unified processing when evidence is added to canvas
  async function triggerUnifiedProcessing() {
    if (uploadedFiles.length === 0) return;

    const evidenceItems = uploadedFiles.map(file => ({
      id: file.id,
      name: file.file.name,
      type: getEvidenceType(file.file),
      size: file.file.size,
      canvasPosition: file.canvasObjectId ? getCanvasObjectPosition(file.canvasObjectId) : null,
      metadata: file.detectiveAnalysis || {},
      uploadTime: file.timestamp
    }));

    const canvasId = `canvas_${Date.now()}`;
    const processingResult = await processEvidenceWithUnifiedService(canvasId, evidenceItems);
    
    if (processingResult) {
      showSuccessMessage(`Evidence processing started with ${processingResult.jobIds.length} jobs`);
    }
  }

  // Helper function to get canvas object position
  function getCanvasObjectPosition(objectId: string) {
    if (!fabricCanvas) return null;
    
    const obj = fabricCanvas.getObjects().find((o: any) => o.id === objectId);
    return obj ? { x: obj.left, y: obj.top } : null;
  }

  async function addAnchorPointsToCanvas(uploadFile: UploadedFile, anchorPoints: any[]) {
    if (!fabricCanvas || !anchorPoints?.length) return;
    
    // Find the uploaded file's canvas object
    const canvasObjects = fabricCanvas.getObjects();
    const fileObject = canvasObjects.find((obj: any) => obj.id === uploadFile.canvasObjectId);
    
    if (!fileObject) return;
    
    // Add anchor point indicators
    anchorPoints.forEach((anchor, index) => {
      const anchorX = fileObject.left + (fileObject.width * fileObject.scaleX * anchor.coordinates.x);
      const anchorY = fileObject.top + (fileObject.height * fileObject.scaleY * anchor.coordinates.y);
      
      // Add anchor point circle
      const anchorCircle = new fabric.Circle({
        left: anchorX,
        top: anchorY,
        radius: 8,
        fill: anchor.legal_relevance === 'high' ? '#FF3030' : 
              anchor.legal_relevance === 'medium' ? '#FFD700' : '#40FF40',
        stroke: enableN64Style ? '#000' : '#fff',
        strokeWidth: 2,
        selectable: true,
        hasControls: false,
        hasBorders: false
      });
      
      // Add anchor label
      const anchorLabel = new fabric.Text(`📍 ${anchor.type}`, {
        left: anchorX + 15,
        top: anchorY - 5,
        fontSize: enableN64Style ? 10 : 8,
        fill: enableN64Style ? '#FFD700' : '#333',
        fontFamily: enableN64Style ? 'Courier New' : 'Arial',
        backgroundColor: enableN64Style ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.8)',
        padding: 2,
        fontWeight: enableN64Style ? 'bold' : 'normal'
      });
      
      fabricCanvas.add(anchorCircle);
      fabricCanvas.add(anchorLabel);
    });
    
    fabricCanvas.renderAll();
  }

  function removeFile(fileId: string) {
    const fileIndex = uploadedFiles.findIndex(f => f.id === fileId);
    if (fileIndex === -1) return;
    
    const file = uploadedFiles[fileIndex];
    
    // Remove from canvas if it exists
    if (file.canvasObjectId && fabricCanvas) {
      const canvasObjects = fabricCanvas.getObjects();
      const objectsToRemove = canvasObjects.filter((obj: any) => 
        obj.id === file.canvasObjectId || 
        (obj.left === file.canvasObjectId) // For grouped objects
      );
      objectsToRemove.forEach((obj: any) => fabricCanvas.remove(obj));
      fabricCanvas.renderAll();
    }
    
    // Remove from files array
    uploadedFiles = uploadedFiles.filter(f => f.id !== fileId);
  }
</script>

<!-- Hidden file input -->
<input
  type="file"
  multiple
  accept={acceptedTypes.join(',')}
  bind:this={fileInput}
  onchange={handleFileSelect}
  style="display: none;"
/>

<div class="enhanced-evidence-canvas" class:n64-style={enableN64Style}>
  <!-- Performance Stats -->
  {#if enableCUDAAcceleration && performanceStats.totalFiles > 0}
    <div class="performance-stats" class:n64-performance={enableN64Style}>
      <div class="flex justify-between text-sm">
        <span class="font-semibold">
          {enableN64Style ? '🎮 N64 PERFORMANCE (CLANG/LLVM + CUDA):' : 'Performance (CUDA):'}
        </span>
        <span>{performanceStats.cudaAccelerated}/{performanceStats.totalFiles} CUDA optimized</span>
      </div>
      <div class="flex justify-between text-xs opacity-75">
        <span>Avg Processing: {performanceStats.avgProcessingTime.toFixed(0)}ms</span>
        <span>Throughput: {performanceStats.throughputMBps.toFixed(1)} MB/s</span>
      </div>
    </div>
  {/if}

  <!-- Enhanced Ingestion Progress -->
  {#if uploadedFiles.some(f => f.status === 'ingestion') && uploadedFiles.length > 0}
    <div class="ingestion-progress" class:n64-ingestion={enableN64Style}>
      <div class="flex justify-between text-sm">
        <span class="font-semibold">
          {enableN64Style ? '🧠 ENHANCED INGESTION PIPELINE:' : 'Enhanced Ingestion:'}
        </span>
        <span>{uploadedFiles.filter(f => f.ingestionResult).length}/{uploadedFiles.length} processed</span>
      </div>
      
      <div class="progress-stages">
        <div class="stage" class:active={uploadedFiles.some(f => f.status === 'ingestion')}>
          <Database class="w-3 h-3" />
          <span>Ingestion</span>
        </div>
        <div class="stage" class:active={uploadedFiles.some(f => f.ingestionResult?.embedding)}>
          <Layers class="w-3 h-3" />
          <span>Embeddings</span>
        </div>
        <div class="stage" class:active={uploadedFiles.some(f => f.ingestionResult?.cluster_id !== undefined)}>
          <Cpu class="w-3 h-3" />
          <span>Clustering</span>
        </div>
        <div class="stage" class:active={uploadedFiles.some(f => f.anchorPoints?.length > 0)}>
          <CheckCircle class="w-3 h-3" />
          <span>Complete</span>
        </div>
      </div>
      
      <div class="current-stage">
        {#if uploadedFiles.some(f => f.status === 'ingestion')}
          Processing multimodal evidence with enhanced AI pipeline...
        {:else if uploadedFiles.every(f => f.status === 'completed')}
          All files processed successfully
        {/if}
      </div>
    </div>
  {/if}

  <!-- Toolbar -->
  <div class="toolbar" class:n64-toolbar={enableN64Style}>
    <button 
      onclick={analyzeCanvas} 
      disabled={analyzing}
      class="analyze-btn"
      class:n64-btn={enableN64Style}
    >
      {#if analyzing}
        <Loader2 class="w-4 h-4 animate-spin" />
        {enableN64Style ? '🎮 ANALYZING...' : 'Analyzing…'}
      {:else}
        <Zap class="w-4 h-4" />
        {enableN64Style ? '🎮 ANALYZE CANVAS' : 'Analyze Canvas'}
      {/if}
    </button>
    
    <button 
      onclick={openFileDialog} 
      disabled={uploading}
      class="upload-btn"
      class:n64-btn={enableN64Style}
    >
      <Upload class="w-4 h-4" />
      {enableN64Style ? '🎮 UPLOAD FILES' : 'Upload Files'}
    </button>
    
    <button 
      onclick={triggerUnifiedProcessing} 
      disabled={uploadedFiles.length === 0}
      class="unified-process-btn"
      class:n64-btn={enableN64Style}
      title="Process all evidence using unified legal AI orchestration"
    >
      <Layers class="w-4 h-4" />
      {enableN64Style ? '🚀 UNIFIED AI' : 'Unified Processing'}
    </button>
    
    <label class="checkbox-label" class:n64-label={enableN64Style}>
      <input type="checkbox" bind:checked={options.analyze_layout} /> 
      {enableN64Style ? '🎮 LAYOUT' : 'Layout'}
    </label>
    <label class="checkbox-label" class:n64-label={enableN64Style}>
      <input type="checkbox" bind:checked={options.extract_entities} /> 
      {enableN64Style ? '🎮 ENTITIES' : 'Entities'}
    </label>
    <label class="checkbox-label" class:n64-label={enableN64Style}>
      <input type="checkbox" bind:checked={options.generate_summary} /> 
      {enableN64Style ? '🎮 SUMMARY' : 'Summary'}
    </label>
    
    <span class="spacer"></span>
    
    <small class="config-input" class:n64-input={enableN64Style}>
      Ctx: <input
        type="number"
        bind:value={options.context_window}
        min={512}
        max={16384}
        step={256}
        style="width:6rem"
      />
    </small>
    <small class="config-input" class:n64-input={enableN64Style}>
      Conf: <input
        type="number"
        bind:value={options.confidence_level}
        min={0}
        max={1}
        step={0.05}
        style="width:5rem"
      />
    </small>
    
    {#if error}<span class="error">{error}</span>{/if}
    {#if result && result.status === "success"}<span class="ok">✓</span>{/if}
    {#if analyzing}<span class="spinner">⏳</span>{/if}
  </div>

  <!-- Canvas Container -->
  <div class="evidence-canvas-wrapper" class:drag-over={dragOver} class:n64-canvas={enableN64Style}>
    {#if dragOver}
      <div class="drag-overlay" class:n64-drag={enableN64Style}>
        <div class="text-center">
          <div class="drag-text">
            {enableN64Style ? '🎮 DROP FILES FOR CUDA ACCELERATION!' : '📁 Drop files here'}
          </div>
          {#if enableN64Style}
            <div class="drag-subtext">
              CLANG/LLVM OPTIMIZED • VISUAL STUDIO 2022 NATIVE
            </div>
          {/if}
        </div>
      </div>
    {/if}
    
    <canvas bind:this={canvasEl} width="800" height="600"></canvas>
    
    {#if uploading}
      <div class="upload-progress-overlay" class:n64-upload={enableN64Style}>
        <Loader2 class="w-8 h-8 animate-spin" />
        <div>
          {enableN64Style ? '🎮 UPLOADING WITH MINIO SYNC...' : 'Uploading...'}
        </div>
        <div class="progress-text">
          Progress: {uploadProgress.toFixed(1)}%
          {#if enableCUDAAcceleration}
            <span class="cuda-indicator">⚡ CUDA ENABLED</span>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Uploaded Files List -->
  {#if uploadedFiles.length > 0}
    <div class="uploaded-files" class:n64-files={enableN64Style}>
      <div class="files-header">
        <h4>{enableN64Style ? '🎮 UPLOADED FILES' : 'Uploaded Files'}</h4>
        <span class="files-count">{uploadedFiles.length} files</span>
      </div>
      
      <div class="files-grid">
        {#each uploadedFiles as file (file.id)}
          <div class="file-item" class:n64-file={enableN64Style} class:status-{file.status}>
            <div class="file-icon">
              {#if file.file.type.startsWith('image/')}
                <Image class="w-4 h-4" />
              {:else}
                <FileText class="w-4 h-4" />
              {/if}
            </div>
            
            <div class="file-info">
              <div class="file-name">{file.file.name}</div>
              <div class="file-size">{formatFileSize(file.file.size)}</div>
              <div class="file-status">
                {#if file.status === 'completed'}
                  <CheckCircle class="w-3 h-3 text-green-500" />
                  {enableN64Style ? '✅ COMPLETED' : 'Completed'}
                  {#if file.cudaProcessed}
                    <span class="cuda-badge">⚡ CUDA</span>
                  {/if}
                  {#if file.ingestionResult}
                    <span class="ingestion-badge">🧠 ENHANCED</span>
                  {/if}
                  {#if file.detectiveAnalysis && file.detectiveAnalysis.analysis.detectedPatterns.length > 0}
                    <span class="detective-badge">🔍 DETECTIVE</span>
                  {/if}
                  {#if file.anchorPoints && file.anchorPoints.length > 0}
                    <span class="anchor-badge">📍 {file.anchorPoints.length}</span>
                  {/if}
                {:else if file.status === 'error'}
                  <AlertCircle class="w-3 h-3 text-red-500" />
                  {enableN64Style ? '❌ FAILED' : 'Failed'}
                {:else if file.status === 'detective_analysis'}
                  <Zap class="w-3 h-3 animate-pulse text-purple-500" />
                  {enableN64Style ? '🔍 DETECTIVE ANALYSIS...' : 'Detective Analysis...'}
                {:else if file.status === 'ingestion'}
                  <Cpu class="w-3 h-3 animate-pulse text-blue-500" />
                  {enableN64Style ? '🧠 PROCESSING...' : 'Processing...'}
                {:else if file.status === 'uploading'}
                  <Loader2 class="w-3 h-3 animate-spin" />
                  {enableN64Style ? '🚀 UPLOADING...' : 'Uploading...'}
                {:else}
                  {enableN64Style ? '⏳ PENDING' : 'Pending'}
                {/if}
              </div>
            </div>
            
            <button 
              class="remove-btn" 
              class:n64-remove={enableN64Style}
              onclick={() => removeFile(file.id)}
              disabled={file.status === 'uploading'}
            >
              <X class="w-3 h-3" />
            </button>
          </div>
        {/each}
      </div>
    </div>
  {/if}

  <!-- Analysis Results -->
  {#if result}
    <div class="analysis-panel" class:n64-panel={enableN64Style}>
      <h3>{enableN64Style ? '🎮 AI ANALYSIS RESULTS' : 'Analysis Results'}</h3>
      <div class="analysis-content">
        <div class="analysis-section">
          <h4>{enableN64Style ? '🔍 ANALYSIS' : 'Analysis'}</h4>
          <pre>{result.analysis}</pre>
        </div>
        <div class="analysis-section">
          <h4>{enableN64Style ? '📋 SUMMARY' : 'Summary'}</h4>
          <pre>{result.summary}</pre>
        </div>
        <div class="meta-info">
          <span>Confidence: {result.confidence?.toFixed?.(2)}</span>
          <span>Time: {result.processing_time_ms} ms</span>
          <span>Status: {result.status}</span>
          {#if uploadedFiles.some(f => f.cudaProcessed)}
            <span class="cuda-meta">⚡ CUDA Optimized</span>
          {/if}
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  .enhanced-evidence-canvas {
    width: 100%;
    max-width: 900px;
    margin: 0 auto;
    padding: 1rem;
  }
  
  .n64-style {
    font-family: 'Courier New', monospace;
    background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
    border: 2px solid #FFD700;
    border-radius: 0;
    padding: 1.5rem;
  }
  
  .performance-stats {
    margin-bottom: 1rem;
    padding: 0.75rem;
    background: #f0f8ff;
    border: 1px solid #4090FF;
    border-radius: 6px;
  }
  
  .n64-performance {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 2px solid #4090FF;
    border-radius: 0;
    color: #4090FF;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000;
  }
  
  .toolbar {
    display: flex;
    gap: 0.75rem;
    align-items: center;
    padding: 0.5rem 0;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }
  
  .n64-toolbar {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #FFD700;
    padding: 1rem;
    margin: 0 -1.5rem 1rem -1.5rem;
  }
  
  .analyze-btn, .upload-btn, .unified-process-btn {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    padding: 0.5rem 1rem;
    background: #4090FF;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    font-size: 0.9rem;
    transition: all 0.2s ease;
  }
  
  .n64-btn {
    background: #FFD700;
    color: #000;
    border: 2px solid #FFA500;
    border-radius: 0;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 
      inset 1px 1px 0 rgba(255, 255, 255, 0.3),
      inset -1px -1px 0 rgba(0, 0, 0, 0.3);
  }
  
  .n64-btn:hover:not(:disabled) {
    background: #FFA500;
    transform: translateY(-1px);
  }
  
  .checkbox-label {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.9rem;
  }
  
  .n64-label {
    color: #FFD700;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000;
  }
  
  .config-input {
    display: flex;
    align-items: center;
    gap: 0.25rem;
  }
  
  .n64-input {
    color: #CCCCCC;
    font-weight: bold;
  }
  
  .n64-input input {
    background: #1a1a1a;
    border: 1px solid #666;
    color: #FFD700;
    font-family: 'Courier New', monospace;
  }
  
  .spacer {
    flex: 1;
    min-width: 1rem;
  }
  
  .error {
    color: #ff4444;
    font-weight: bold;
  }
  
  .ok {
    color: #44ff44;
    font-weight: bold;
  }
  
  .spinner {
    color: #ffaa00;
  }
  
  .evidence-canvas-wrapper {
    position: relative;
    display: flex;
    justify-content: center;
    align-items: center;
    margin: 1rem auto;
    border: 2px dashed #ccc;
    border-radius: 8px;
    width: 100%;
    max-width: 820px;
    height: 620px;
    background: #fafafa;
    transition: all 0.3s ease;
  }
  
  .n64-canvas {
    border: 4px solid #FFD700;
    border-radius: 0;
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
    box-shadow: 
      inset 0 0 20px rgba(255, 215, 0, 0.1),
      0 0 20px rgba(255, 215, 0, 0.3);
  }
  
  .evidence-canvas-wrapper.drag-over {
    border-color: #4090FF;
    background: #e8f4fd;
    transform: scale(1.02);
  }
  
  .n64-canvas.drag-over {
    border-color: #FF6B35;
    background: linear-gradient(135deg, #2e1a1a 0%, #3e1616 100%);
    box-shadow: 
      inset 0 0 40px rgba(255, 107, 53, 0.3),
      0 0 40px rgba(255, 107, 53, 0.7);
  }
  
  .drag-overlay {
    position: absolute;
    inset: 0;
    background: rgba(64, 144, 255, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    z-index: 10;
  }
  
  .n64-drag {
    background: rgba(255, 107, 53, 0.9);
    border-radius: 0;
  }
  
  .drag-text {
    font-size: 1.25rem;
    font-weight: bold;
    color: white;
    margin-bottom: 0.5rem;
  }
  
  .drag-subtext {
    font-size: 0.9rem;
    color: rgba(255, 255, 255, 0.8);
  }
  
  .upload-progress-overlay {
    position: absolute;
    inset: 0;
    background: rgba(0, 0, 0, 0.8);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: white;
    gap: 0.5rem;
    border-radius: 6px;
    z-index: 5;
  }
  
  .n64-upload {
    background: rgba(26, 26, 46, 0.95);
    color: #FFD700;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    border-radius: 0;
  }
  
  .progress-text {
    font-size: 0.9rem;
    text-align: center;
  }
  
  .cuda-indicator {
    color: #40FF40;
    margin-left: 0.5rem;
  }
  
  canvas {
    background: #fff;
    border-radius: 4px;
    max-width: 100%;
  }
  
  .uploaded-files {
    margin-top: 1.5rem;
    padding: 1rem;
    background: #f8f9fa;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
  }
  
  .n64-files {
    background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
    border: 2px solid #4090FF;
    border-radius: 0;
  }
  
  .files-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1rem;
    padding-bottom: 0.5rem;
    border-bottom: 1px solid #ddd;
  }
  
  .n64-files .files-header {
    border-bottom: 1px solid #666;
    color: #4090FF;
    font-weight: bold;
  }
  
  .files-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
    gap: 0.75rem;
  }
  
  .file-item {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 6px;
    transition: all 0.2s ease;
  }
  
  .n64-file {
    background: linear-gradient(135deg, #1a1a2e 0%, #0a0a1a 100%);
    border: 1px solid #FFD700;
    border-radius: 0;
    color: #FFD700;
  }
  
  .file-item.status-completed {
    border-color: #28a745;
  }
  
  .file-item.status-error {
    border-color: #dc3545;
  }
  
  .file-item.status-uploading {
    border-color: #007bff;
  }
  
  .file-icon {
    flex-shrink: 0;
    color: #666;
  }
  
  .n64-file .file-icon {
    color: #FFD700;
  }
  
  .file-info {
    flex: 1;
    min-width: 0;
  }
  
  .file-name {
    font-weight: 500;
    font-size: 0.9rem;
    word-break: break-word;
  }
  
  .file-size {
    font-size: 0.8rem;
    color: #666;
    margin-top: 0.25rem;
  }
  
  .n64-file .file-size {
    color: #CCCCCC;
  }
  
  .file-status {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    font-size: 0.8rem;
    margin-top: 0.25rem;
  }
  
  .cuda-badge {
    background: #40FF40;
    color: #000;
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
    font-size: 0.7rem;
    font-weight: bold;
  }
  
  .remove-btn {
    padding: 0.25rem;
    background: #dc3545;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  
  .n64-remove {
    background: #FF3030;
    border: 1px solid #CC0000;
    border-radius: 0;
  }
  
  .remove-btn:hover:not(:disabled) {
    background: #c82333;
    transform: scale(1.1);
  }
  
  .remove-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
    transform: none;
  }
  
  .analysis-panel {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: white;
    border: 1px solid #e5e5e5;
    border-radius: 8px;
  }
  
  .n64-panel {
    background: linear-gradient(135deg, #1a2e1a 0%, #0a1a0a 100%);
    border: 2px solid #40FF40;
    border-radius: 0;
    color: #40FF40;
  }
  
  .analysis-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }
  
  .analysis-section h4 {
    margin: 0 0 0.5rem 0;
    color: #333;
    font-size: 1rem;
  }
  
  .n64-panel .analysis-section h4 {
    color: #40FF40;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000;
  }
  
  .analysis-section pre {
    background: #f8f8f8;
    padding: 1rem;
    border-radius: 6px;
    white-space: pre-wrap;
    font-size: 0.9rem;
    line-height: 1.4;
    overflow-x: auto;
  }
  
  .n64-panel .analysis-section pre {
    background: #0a1a0a;
    color: #CCCCCC;
    border: 1px solid #40FF40;
    border-radius: 0;
    font-family: 'Courier New', monospace;
  }
  
  .meta-info {
    display: flex;
    gap: 1rem;
    flex-wrap: wrap;
    font-size: 0.9rem;
    color: #666;
    padding-top: 1rem;
    border-top: 1px solid #eee;
  }
  
  .n64-panel .meta-info {
    color: #CCCCCC;
    border-top: 1px solid #40FF40;
  }
  
  .cuda-meta {
    color: #40FF40;
    font-weight: bold;
  }
  
  /* Enhanced Ingestion Styles */
  .ingestion-progress {
    margin-bottom: 1rem;
    padding: 1rem;
    background: #f0f8ff;
    border: 1px solid #4090FF;
    border-radius: 6px;
  }
  
  .n64-ingestion {
    background: linear-gradient(135deg, #1a1a2e 0%, #0f0f1a 100%);
    border: 2px solid #4090FF;
    border-radius: 0;
    color: #4090FF;
    font-family: 'Courier New', monospace;
    font-weight: bold;
    text-shadow: 1px 1px 0 #000;
  }
  
  .progress-stages {
    display: flex;
    justify-content: space-between;
    margin: 0.75rem 0;
  }
  
  .stage {
    display: flex;
    align-items: center;
    gap: 0.25rem;
    padding: 0.25rem 0.5rem;
    border-radius: 4px;
    font-size: 0.8rem;
    opacity: 0.5;
    transition: all 0.2s ease;
  }
  
  .stage.active {
    opacity: 1;
    background: rgba(64, 144, 255, 0.1);
  }
  
  .n64-ingestion .stage.active {
    background: rgba(64, 144, 255, 0.2);
    color: #FFD700;
  }
  
  .current-stage {
    font-size: 0.8rem;
    font-style: italic;
    margin-top: 0.5rem;
    color: #666;
  }
  
  .n64-ingestion .current-stage {
    color: #CCCCCC;
  }
  
  .ingestion-badge {
    background: #4090FF;
    color: #fff;
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
    font-size: 0.7rem;
    font-weight: bold;
    margin-left: 0.25rem;
  }
  
  .anchor-badge {
    background: #FF6B35;
    color: #fff;
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
    font-size: 0.7rem;
    font-weight: bold;
    margin-left: 0.25rem;
  }

  .detective-badge {
    background: #8B5CF6;
    color: #fff;
    padding: 0.125rem 0.25rem;
    border-radius: 2px;
    font-size: 0.7rem;
    font-weight: bold;
    margin-left: 0.25rem;
    box-shadow: 0 0 5px rgba(139, 92, 246, 0.5);
  }
  
  .file-item.status-ingestion {
    border-color: #4090FF;
    background: linear-gradient(135deg, #e8f4fd 0%, #f0f8ff 100%);
  }
  
  .n64-file.status-ingestion {
    border-color: #4090FF;
    background: linear-gradient(135deg, #1a1a3e 0%, #0a0a2a 100%);
  }

  .file-item.status-detective_analysis {
    border-color: #8B5CF6;
    background: linear-gradient(135deg, #f3e8ff 0%, #faf5ff 100%);
  }
  
  .n64-file.status-detective_analysis {
    border-color: #8B5CF6;
    background: linear-gradient(135deg, #2a1a3e 0%, #1a0a2a 100%);
  }
  
  @media (max-width: 768px) {
    .enhanced-evidence-canvas {
      padding: 0.5rem;
    }
    
    .toolbar {
      flex-direction: column;
      align-items: flex-start;
      gap: 0.5rem;
    }
    
    .evidence-canvas-wrapper {
      height: 400px;
    }
    
    canvas {
      width: 100%;
      height: auto;
    }
    
    .files-grid {
      grid-template-columns: 1fr;
    }
  }
</style>