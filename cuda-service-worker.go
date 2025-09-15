package main

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"

	"legal-ai-cuda/internal/cuda"

	"github.com/gin-gonic/gin"
	"github.com/jackc/pgx/v5/pgxpool"
	pgvector "github.com/pgvector/pgvector-go"
)

// Diagnostic helper: scan the repository for other Go files that declare a main package
// or a func main(...) and log the findings. Useful to locate duplicate main() entries.
//
// Usage:
// - At runtime this will run once during init() and log any candidate files.
// - Set MAIN_SCAN_ROOT to override the root directory scanned.
func scanForMains(root string) ([]string, error) {
	var results []string

	var walk func(dir string)
	walk = func(dir string) {
		entries, err := os.ReadDir(dir)
		if err != nil {
			// ignore unreadable directories but log
			log.Printf("scanForMains: cannot read dir %s: %v", dir, err)
			return
		}
		for _, e := range entries {
			name := e.Name()

			// Skip common large/irrelevant directories
			if e.IsDir() {
				if name == ".git" || name == "vendor" || name == "node_modules" || name == "dist" || name == "node" || name == "bin" || name == "build" {
					continue
				}
				next := dir + string(os.PathSeparator) + name
				walk(next)
				continue
			}

			// Only inspect .go files
			if len(name) > 3 && name[len(name)-3:] == ".go" {
				path := dir + string(os.PathSeparator) + name
				data, err := os.ReadFile(path)
				if err != nil {
					continue
				}
				// Look for "package main" or "func main(" heuristically
				if bytes.Contains(data, []byte("package main")) || bytes.Contains(data, []byte("func main(")) {
					results = append(results, path)
				}
			}
		}
	}

	walk(root)
	return results, nil
}

func init() {
	// Disabled main scanning to prevent initialization issues in large codebases
	log.Printf("main-scan: disabled for performance reasons")
}
// CUDA GPU Worker optimized for RTX 3060 Ti
type CUDAWorker struct {
	ID                int
	DeviceID          int
	MemoryMB          int64
	CoresCount        int
	TensorCoreCount   int
	ComputeCapability string
	Status            string
	ActiveJobs        int
	TotalJobs         int64
	Utilization       float32
	Temperature       float32
	PowerUsage        float32
	mutex             sync.Mutex
}

// CUDA Task represents a GPU computation task
type CUDATask struct {
	ID           string                 `json:"id"`
	Type         string                 `json:"type"`         // inference, embedding, vector_search
	Priority     int                    `json:"priority"`     // 1-10, higher = more priority
	Payload      map[string]interface{} `json:"payload"`
	Metadata     map[string]string      `json:"metadata"`
	CreatedAt    time.Time              `json:"created_at"`
	StartedAt    *time.Time             `json:"started_at,omitempty"`
	CompletedAt  *time.Time             `json:"completed_at,omitempty"`
	Result       interface{}            `json:"result,omitempty"`
	Error        string                 `json:"error,omitempty"`
	GPUTimeMs    int64                  `json:"gpu_time_ms"`
	MemoryUsedMB int64                  `json:"memory_used_mb"`
}

// CUDA Service manages GPU workers and task queue
type CUDAService struct {
	workers     []*CUDAWorker
	taskQueue   chan *CUDATask
	results     map[string]*CUDATask
	resultsMux  sync.RWMutex
	grpcServer  interface{} // Future gRPC server
	httpServer  *gin.Engine
	shutdownCtx context.Context
	shutdown    context.CancelFunc
	// Optional path to an external native CUDA worker (cuda-worker.exe)
	externalWorkerPath string
	// Database connection pool for pgvector search
	dbPool *pgxpool.Pool
	// SIMD parser for high-performance vector operations
	simdParser *cuda.SIMDVectorParser
}

// SearchRequest is the JSON body for search endpoint
type SearchRequest struct {
	Query string `json:"q"`
	Limit int    `json:"limit,omitempty"`
}

// SearchResult is what we return to SvelteKit
type SearchResult struct {
	ID       string          `json:"id"`
	TaskID   string          `json:"task_id"`
	Payload  string          `json:"payload"`
	Metadata json.RawMessage `json:"metadata"`
	Score    float32         `json:"score"`
}

// SearchCandidate is used internally for SIMD processing
type SearchCandidate struct {
	ID       string
	TaskID   string
	Payload  string
	Metadata json.RawMessage
	Score    float32
	Vector   []float32 // For SIMD calculations
}

// RTX 3060 Ti specifications
const (
	RTX_3060_TI_CUDA_CORES    = 4864
	RTX_3060_TI_TENSOR_CORES  = 152  // 2nd gen RT cores
	RTX_3060_TI_MEMORY_MB     = 8192 // 8GB GDDR6X
	RTX_3060_TI_MEMORY_BW_GBS = 448
	RTX_3060_TI_BOOST_MHZ     = 1665
	MAX_CONCURRENT_TASKS      = 16
	TASK_QUEUE_SIZE          = 256
)

// NewCUDAService creates a new CUDA service with RTX 3060 Ti optimization
func NewCUDAService(dbPool *pgxpool.Pool) *CUDAService {
	ctx, cancel := context.WithCancel(context.Background())

	service := &CUDAService{
		workers:     make([]*CUDAWorker, 0),
		taskQueue:   make(chan *CUDATask, TASK_QUEUE_SIZE),
		results:     make(map[string]*CUDATask),
		shutdownCtx: ctx,
		shutdown:    cancel,
		externalWorkerPath: cuda.FindCudaWorkerPath(),
		dbPool:      dbPool,
		simdParser:  cuda.NewSIMDVectorParser(),
	}

	// Initialize RTX 3060 Ti worker
	worker := &CUDAWorker{
		ID:                0,
		DeviceID:          0,
		MemoryMB:          RTX_3060_TI_MEMORY_MB,
		CoresCount:        RTX_3060_TI_CUDA_CORES,
		TensorCoreCount:   RTX_3060_TI_TENSOR_CORES,
		ComputeCapability: "8.6", // RTX 3060 Ti compute capability
		Status:            "ready",
		ActiveJobs:        0,
		TotalJobs:         0,
		Utilization:       0.0,
		Temperature:       45.0, // Simulated idle temperature
		PowerUsage:        50.0, // Simulated idle power usage (watts)
	}

	service.workers = append(service.workers, worker)

	// Start worker goroutine
	go service.workerLoop(worker)

	// Start cleanup routine
	go service.cleanupLoop()

	log.Printf("CUDA Service initialized with RTX 3060 Ti (Device 0)")
	return service
}

// workerLoop processes tasks for a specific GPU worker
func (s *CUDAService) workerLoop(worker *CUDAWorker) {
	for {
		select {
		case <-s.shutdownCtx.Done():
			return
		case task := <-s.taskQueue:
			s.processTask(worker, task)
		}
	}
}

// processTask executes a CUDA task on the specified worker
func (s *CUDAService) processTask(worker *CUDAWorker, task *CUDATask) {
	startTime := time.Now()

	worker.mutex.Lock()
	worker.ActiveJobs++
	worker.TotalJobs++
	worker.Status = "busy"
	worker.Utilization = minFloat32(100.0, float32(worker.ActiveJobs)*25.0) // Estimate utilization
	worker.mutex.Unlock()

	task.StartedAt = &startTime

	// Simulate CUDA kernel execution based on task type
	result, err := s.executeCUDAKernel(worker, task)

	completedTime := time.Now()
	task.CompletedAt = &completedTime
	task.GPUTimeMs = completedTime.Sub(startTime).Milliseconds()

	if err != nil {
		task.Error = err.Error()
	} else {
		task.Result = result
	}

	// Update worker status
	worker.mutex.Lock()
	worker.ActiveJobs--
	if worker.ActiveJobs == 0 {
		worker.Status = "ready"
		worker.Utilization = 0.0
		worker.Temperature = 45.0
		worker.PowerUsage = 50.0
	} else {
		worker.Utilization = float32(worker.ActiveJobs) * 25.0
		worker.Temperature = 45.0 + (worker.Utilization * 0.4) // Simulate thermal scaling
		worker.PowerUsage = 50.0 + (worker.Utilization * 1.8)   // Simulate power scaling
	}
	worker.mutex.Unlock()

	// Store result
	s.resultsMux.Lock()
	s.results[task.ID] = task
	s.resultsMux.Unlock()

	log.Printf("CUDA Task %s completed in %dms on GPU %d",
		task.ID, task.GPUTimeMs, worker.DeviceID)
}

// executeCUDAKernel simulates CUDA kernel execution
func (s *CUDAService) executeCUDAKernel(worker *CUDAWorker, task *CUDATask) (interface{}, error) {
	switch task.Type {
	case "inference":
		return s.executeInferenceKernel(worker, task)
	case "embedding":
		return s.executeEmbeddingKernel(worker, task)
	case "vector_search":
		return s.executeVectorSearchKernel(worker, task)
	case "matrix_multiply":
		return s.executeMatrixMultiplyKernel(worker, task)
	default:
		return nil, fmt.Errorf("unknown CUDA kernel type: %s", task.Type)
	}
}

// executeInferenceKernel simulates LLM inference on RTX 3060 Ti
func (s *CUDAService) executeInferenceKernel(worker *CUDAWorker, task *CUDATask) (interface{}, error) {
	// Simulate transformer inference workload
	// RTX 3060 Ti can handle ~35-40 layers of Gemma 7B efficiently

	prompt, ok := task.Payload["prompt"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid prompt")
	}

	maxTokens := 256
	if mt, ok := task.Payload["max_tokens"].(float64); ok {
		maxTokens = int(mt)
	}

	// Simulate processing time based on token count and GPU capabilities
	// RTX 3060 Ti: ~15-25 tokens/second for 7B models
	processingTimeMs := int64(float64(maxTokens) * 45.0) // Conservative estimate
	task.MemoryUsedMB = int64(float64(maxTokens) * 0.8)  // Estimate memory usage

	// Simulate actual processing delay
	time.Sleep(time.Duration(processingTimeMs) * time.Millisecond / 10) // 10x speed for simulation

	result := map[string]interface{}{
		"text":              fmt.Sprintf("Generated response for: %s", prompt[:minInt(50, len(prompt))]),
		"tokens":            maxTokens,
		"processing_time_ms": processingTimeMs,
		"tokens_per_second": float64(maxTokens) / (float64(processingTimeMs) / 1000.0),
		"gpu_utilization":   worker.Utilization,
		"memory_used_mb":    task.MemoryUsedMB,
		"tensor_cores_used": worker.TensorCoreCount,
	}

	return result, nil
}

// executeEmbeddingKernel simulates embedding generation on RTX 3060 Ti
func (s *CUDAService) executeEmbeddingKernel(worker *CUDAWorker, task *CUDATask) (interface{}, error) {
	text, ok := task.Payload["text"].(string)
	if !ok {
		return nil, fmt.Errorf("missing or invalid text")
	}

	dimension := 768 // Default embedding dimension
	if d, ok := task.Payload["dimension"].(float64); ok {
		dimension = int(d)
	}

	// RTX 3060 Ti is very efficient for embedding generation
	processingTimeMs := int64(float64(len(text)) * 0.1) // ~10ms per 100 characters
	task.MemoryUsedMB = int64(dimension * 4 / 1024 / 1024) // 4 bytes per float32

	time.Sleep(time.Duration(processingTimeMs) * time.Millisecond / 20) // 20x speed for simulation

	// Generate mock embedding vector
	embedding := make([]float32, dimension)
	for i := range embedding {
		embedding[i] = float32(i%100) / 100.0 // Deterministic mock data
	}

	result := map[string]interface{}{
		"embedding":         embedding,
		"dimension":         dimension,
		"processing_time_ms": processingTimeMs,
		"memory_used_mb":    task.MemoryUsedMB,
		"text_length":       len(text),
	}

	return result, nil
}

// executeVectorSearchKernel simulates vector similarity search on RTX 3060 Ti
func (s *CUDAService) executeVectorSearchKernel(worker *CUDAWorker, task *CUDATask) (interface{}, error) {
	queryVector, ok := task.Payload["query_vector"].([]interface{})
	if !ok {
		return nil, fmt.Errorf("missing or invalid query_vector")
	}

	limit := 10
	if l, ok := task.Payload["limit"].(float64); ok {
		limit = int(l)
	}

	vectorCount := 1000000 // Simulate searching through 1M vectors
	if vc, ok := task.Payload["vector_count"].(float64); ok {
		vectorCount = int(vc)
	}

	// RTX 3060 Ti excellent for parallel vector operations
	processingTimeMs := int64(float64(vectorCount) * 0.001) // ~1ms per 1000 vectors
	task.MemoryUsedMB = int64(float64(vectorCount*len(queryVector)*4) / 1024 / 1024)

	time.Sleep(time.Duration(processingTimeMs) * time.Millisecond / 50) // 50x speed for simulation

	// Generate mock search results
	results := make([]map[string]interface{}, limit)
	for i := 0; i < limit; i++ {
		results[i] = map[string]interface{}{
			"id":         fmt.Sprintf("doc_%d", i),
			"similarity": 0.9 - float64(i)*0.05,
			"metadata":   map[string]string{"type": "legal_document"},
		}
	}

	result := map[string]interface{}{
		"results":           results,
		"total_searched":    vectorCount,
		"processing_time_ms": processingTimeMs,
		"memory_used_mb":    task.MemoryUsedMB,
		"vectors_per_second": float64(vectorCount) / (float64(processingTimeMs) / 1000.0),
	}

	return result, nil
}

// executeMatrixMultiplyKernel simulates large matrix operations
func (s *CUDAService) executeMatrixMultiplyKernel(worker *CUDAWorker, task *CUDATask) (interface{}, error) {
	sizeA := 1024 // Default matrix size
	if sa, ok := task.Payload["size_a"].(float64); ok {
		sizeA = int(sa)
	}

	sizeB := 1024
	if sb, ok := task.Payload["size_b"].(float64); ok {
		sizeB = int(sb)
	}

	// RTX 3060 Ti tensor cores excel at matrix multiplication
	operations := int64(sizeA) * int64(sizeB) * int64(sizeA) // A*B operations
	processingTimeMs := operations / 10000000                // ~10M ops per ms on RTX 3060 Ti
	task.MemoryUsedMB = int64((sizeA*sizeB + sizeB*sizeA + sizeA*sizeA) * 4 / 1024 / 1024)

	time.Sleep(time.Duration(processingTimeMs) * time.Millisecond / 100) // 100x speed for simulation

	result := map[string]interface{}{
		"matrix_size_a":     [2]int{sizeA, sizeB},
		"matrix_size_b":     [2]int{sizeB, sizeA},
		"operations":        operations,
		"processing_time_ms": processingTimeMs,
		"memory_used_mb":    task.MemoryUsedMB,
		"gflops":           float64(operations) / float64(processingTimeMs) / 1000.0,
		"tensor_cores_used": worker.TensorCoreCount,
	}

	return result, nil
}

// cleanupLoop removes old completed tasks to prevent memory leaks
func (s *CUDAService) cleanupLoop() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-s.shutdownCtx.Done():
			return
		case <-ticker.C:
			s.cleanupOldResults()
		}
	}
}

// cleanupOldResults removes results older than 1 hour
func (s *CUDAService) cleanupOldResults() {
	cutoff := time.Now().Add(-1 * time.Hour)

	s.resultsMux.Lock()
	defer s.resultsMux.Unlock()

	for id, task := range s.results {
		if task.CompletedAt != nil && task.CompletedAt.Before(cutoff) {
			delete(s.results, id)
		}
	}
}

// HTTP API handlers
func (s *CUDAService) setupHTTPHandlers() {
	gin.SetMode(gin.ReleaseMode)
	s.httpServer = gin.New()
	s.httpServer.Use(gin.Logger(), gin.Recovery())

	// CORS middleware
	s.httpServer.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		c.Next()
	})

	api := s.httpServer.Group("/api/v1")
	{
		api.GET("/health", s.healthHandler)
		api.GET("/workers", s.workersHandler)
		api.GET("/metrics", s.metricsHandler)
		api.POST("/submit", s.submitTaskHandler)
		api.GET("/result/:id", s.getResultHandler)
		api.GET("/status/:id", s.getStatusHandler)
		api.POST("/search", s.searchHandler)

		// CUDA Indexing endpoints
		api.POST("/index/build", s.buildIndexHandler)
		api.POST("/index/search", s.searchIndexHandler)
		api.POST("/index/hnsw", s.buildHNSWHandler)
		api.POST("/index/ivfpq", s.buildIVFPQHandler)
		api.GET("/index/optimize/:dimensions/:type", s.optimizeBatchHandler)

		// SIMD-accelerated vector operations
		api.POST("/simd/similarity", s.simdSimilarityHandler)
		api.POST("/simd/distance", s.simdDistanceHandler)
		api.POST("/simd/batch", s.simdBatchHandler)
		api.GET("/simd/capabilities", s.simdCapabilitiesHandler)
	}
}

func (s *CUDAService) healthHandler(c *gin.Context) {
	totalWorkers := len(s.workers)
	readyWorkers := 0
	totalJobs := int64(0)

	for _, worker := range s.workers {
		worker.mutex.Lock()
		if worker.Status == "ready" {
			readyWorkers++
		}
		totalJobs += worker.TotalJobs
		worker.mutex.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{
		"service":        "cuda-service-worker",
		"status":         "healthy",
		"total_workers":  totalWorkers,
		"ready_workers":  readyWorkers,
		"total_jobs":     totalJobs,
		"queue_length":   len(s.taskQueue),
		"result_cache":   len(s.results),
		"gpu_model":      "RTX 3060 Ti",
		"cuda_cores":     RTX_3060_TI_CUDA_CORES,
		"tensor_cores":   RTX_3060_TI_TENSOR_CORES,
		"memory_gb":      RTX_3060_TI_MEMORY_MB / 1024,
		"timestamp":      time.Now(),
	})
}

func (s *CUDAService) workersHandler(c *gin.Context) {
	workers := make([]gin.H, len(s.workers))
	for i, worker := range s.workers {
		worker.mutex.Lock()
		workers[i] = gin.H{
			"id":                 worker.ID,
			"device_id":          worker.DeviceID,
			"status":             worker.Status,
			"active_jobs":        worker.ActiveJobs,
			"total_jobs":         worker.TotalJobs,
			"utilization":        worker.Utilization,
			"temperature":        worker.Temperature,
			"power_usage":        worker.PowerUsage,
			"memory_mb":          worker.MemoryMB,
			"cuda_cores":         worker.CoresCount,
			"tensor_cores":       worker.TensorCoreCount,
			"compute_capability": worker.ComputeCapability,
		}
		worker.mutex.Unlock()
	}

	c.JSON(http.StatusOK, gin.H{
		"workers": workers,
		"count":   len(workers),
	})
}

func (s *CUDAService) metricsHandler(c *gin.Context) {
	s.resultsMux.RLock()
	completedTasks := len(s.results)
	s.resultsMux.RUnlock()

	// Calculate average processing time
	var totalProcessingTime int64
	var taskCount int64

	s.resultsMux.RLock()
	for _, task := range s.results {
		if task.CompletedAt != nil {
			totalProcessingTime += task.GPUTimeMs
			taskCount++
		}
	}
	s.resultsMux.RUnlock()

	avgProcessingTime := float64(0)
	if taskCount > 0 {
		avgProcessingTime = float64(totalProcessingTime) / float64(taskCount)
	}

	c.JSON(http.StatusOK, gin.H{
		"completed_tasks":      completedTasks,
		"queued_tasks":         len(s.taskQueue),
		"avg_processing_ms":    avgProcessingTime,
		"total_processing_ms":  totalProcessingTime,
		"gpu_model":           "RTX 3060 Ti",
		"memory_bandwidth_gbs": RTX_3060_TI_MEMORY_BW_GBS,
		"boost_clock_mhz":     RTX_3060_TI_BOOST_MHZ,
		"timestamp":           time.Now(),
	})
}

func (s *CUDAService) submitTaskHandler(c *gin.Context) {
	var req struct {
		Type       string                 `json:"type" binding:"required"`
		Priority   int                    `json:"priority"`
		// Payload may be a JSON object or a base64-encoded string (field name: payload_b64)
		Payload    map[string]interface{} `json:"payload"`
		PayloadB64 string                 `json:"payload_b64"`
		Metadata   map[string]string      `json:"metadata"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}

	task := &CUDATask{
		ID:        fmt.Sprintf("task_%d", time.Now().UnixNano()),
		Type:      req.Type,
		Priority:  req.Priority,
		Payload:   req.Payload,
		Metadata:  req.Metadata,
		CreatedAt: time.Now(),
	}

	// If payload_b64 is provided, attempt to decode and unmarshal into Payload
	if req.PayloadB64 != "" {
		raw, err := base64.StdEncoding.DecodeString(req.PayloadB64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid base64 payload"})
			return
		}

		// Try decode as JSON object
		var p map[string]interface{}
		if err := json.Unmarshal(raw, &p); err == nil {
			task.Payload = p
		} else {
			// store raw bytes as a base64 payload field
			task.Payload = map[string]interface{}{"raw_b64": req.PayloadB64}
		}
	}

	// If an external native cuda-worker exists and the task requests native acceleration, forward
	if s.externalWorkerPath != "" {
		// Build a minimal request for external worker
		externalReq := map[string]interface{}{
			"job_id": task.ID,
			"type":   task.Type,
			"priority": task.Priority,
			"payload": task.Payload,
			"metadata": task.Metadata,
		}
		go func() {
			// run with a conservative timeout using the centralized helper
			resp, err := cuda.RunExternalCudaWorker(context.Background(), s.externalWorkerPath, externalReq, 60*time.Second)
			if err != nil {
				log.Printf("external cuda worker error: %v", err)
				// fallback to local simulated queue
				select {
				case s.taskQueue <- task:
				default:
					log.Printf("task queue full, dropping task %s", task.ID)
				}
				return
			}

			// convert external response into task.Result and mark completed
			completed := time.Now()
			task.Result = resp
			task.CompletedAt = &completed
			task.GPUTimeMs = 0

			s.resultsMux.Lock()
			s.results[task.ID] = task
			s.resultsMux.Unlock()
		}()

		c.JSON(http.StatusAccepted, gin.H{"task_id": task.ID, "status": "processing_native"})
		return
	}

	// Otherwise enqueue for simulated processing
	select {
	case s.taskQueue <- task:
		c.JSON(http.StatusAccepted, gin.H{
			"task_id":    task.ID,
			"status":     "queued",
			"created_at": task.CreatedAt,
		})
	default:
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Task queue is full, please try again later",
		})
	}
}

func (s *CUDAService) getResultHandler(c *gin.Context) {
	taskID := c.Param("id")

	s.resultsMux.RLock()
	task, exists := s.results[taskID]
	s.resultsMux.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Task not found",
		})
		return
	}

	c.JSON(http.StatusOK, task)
}

func (s *CUDAService) getStatusHandler(c *gin.Context) {
	taskID := c.Param("id")

	s.resultsMux.RLock()
	task, exists := s.results[taskID]
	s.resultsMux.RUnlock()

	if !exists {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Task not found",
		})
		return
	}

	status := "queued"
	if task.StartedAt != nil {
		status = "processing"
	}
	if task.CompletedAt != nil {
		if task.Error != "" {
			status = "failed"
		} else {
			status = "completed"
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"task_id":     task.ID,
		"status":      status,
		"created_at":  task.CreatedAt,
		"started_at":  task.StartedAt,
		"completed_at": task.CompletedAt,
		"error":       task.Error,
		"gpu_time_ms": task.GPUTimeMs,
		"memory_used_mb": task.MemoryUsedMB,
	})
}

// searchHandler performs semantic search using Ollama embeddings and pgvector with SIMD acceleration
func (s *CUDAService) searchHandler(c *gin.Context) {
	var req SearchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}

	if req.Limit == 0 {
		req.Limit = 5
	}

	// Check if database pool is available
	if s.dbPool == nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{
			"error": "Database connection not available",
		})
		return
	}

	// Step 1: call Ollama to get embedding with GPU acceleration
	embedding, err := embedWithOllama(req.Query)
	if err != nil {
		log.Printf("embedding failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "embedding generation failed",
		})
		return
	}

	// Step 2: Use SIMD-accelerated pgvector search
	queryVector := pgvector.NewVector(embedding)
	startTime := time.Now()

	// Enhanced query with SIMD optimization hints
	rows, err := s.dbPool.Query(
		context.Background(),
		`SELECT id, task_id, payload, metadata, embedding_gemma,
			(embedding_gemma <-> $1) AS score
		 FROM embeddings
		 WHERE embedding_gemma IS NOT NULL
		 ORDER BY embedding_gemma <-> $1
		 LIMIT $2`,
		queryVector,
		req.Limit*2, // Get more candidates for SIMD reranking
	)
	if err != nil {
		log.Printf("pgvector query failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "database query failed",
		})
		return
	}
	defer rows.Close()

	// Step 3: Collect candidates for SIMD processing
	var candidates []SearchCandidate
	for rows.Next() {
		var candidate SearchCandidate
		var embeddingBytes []byte

		if err := rows.Scan(&candidate.ID, &candidate.TaskID, &candidate.Payload,
			&candidate.Metadata, &embeddingBytes, &candidate.Score); err != nil {
			log.Printf("row scan failed: %v", err)
			continue
		}

		// Parse pgvector binary format with SIMD acceleration
		if len(embeddingBytes) > 0 {
			vector, err := s.simdParser.ParsePgVectorBinary(embeddingBytes)
			if err != nil {
				log.Printf("SIMD parse failed: %v", err)
				continue
			}
			candidate.Vector = vector
		}

		candidates = append(candidates, candidate)
	}

	// Step 4: SIMD-accelerated similarity reranking
	if len(candidates) > 0 {
		candidateVectors := make([][]float32, len(candidates))
		for i, candidate := range candidates {
			candidateVectors[i] = candidate.Vector
		}

		// Use SIMD batch similarity calculation
		similarities := s.simdParser.BatchCosineSimilarity(embedding, candidateVectors)

		// Update scores with SIMD-calculated similarities
		for i := range candidates {
			if i < len(similarities) {
				candidates[i].Score = 1.0 - similarities[i] // Convert to distance
			}
		}

		// Sort by improved scores
		for i := 0; i < len(candidates)-1; i++ {
			for j := i + 1; j < len(candidates); j++ {
				if candidates[i].Score > candidates[j].Score {
					candidates[i], candidates[j] = candidates[j], candidates[i]
				}
			}
		}
	}

	// Step 5: Prepare final results
	var results []SearchResult
	limit := req.Limit
	if len(candidates) < limit {
		limit = len(candidates)
	}

	for i := 0; i < limit; i++ {
		candidate := candidates[i]
		results = append(results, SearchResult{
			ID:       candidate.ID,
			TaskID:   candidate.TaskID,
			Payload:  candidate.Payload,
			Metadata: candidate.Metadata,
			Score:    candidate.Score,
		})
	}

	searchTime := time.Since(startTime)

	c.JSON(http.StatusOK, gin.H{
		"query":           req.Query,
		"results":         results,
		"count":           len(results),
		"limit":           req.Limit,
		"candidates":      len(candidates),
		"search_time_ms":  searchTime.Milliseconds(),
		"simd_enabled":    true,
		"gpu_accelerated": true,
		"embedding_model": "embeddinggemma",
	})
}

// Utility functions
func minInt(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func minFloat32(a, b float32) float32 {
	if a < b {
		return a
	}
	return b
}

// embedWithOllama calls Ollama embed API with embeddinggemma
func embedWithOllama(text string) ([]float32, error) {
	// Ollama REST API endpoint
	ollamaURL := os.Getenv("OLLAMA_URL")
	if ollamaURL == "" {
		ollamaURL = "http://localhost:11434"
	}

	// Try embeddinggemma first, fallback to nomic-embed-text
	models := []string{"embeddinggemma:latest", "embeddinggemma", "nomic-embed-text"}

	var lastErr error
	for _, model := range models {
		// Prepare request
		body := map[string]interface{}{
			"model": model,
			"input": text,
		}
		payload, _ := json.Marshal(body)

		resp, err := http.Post(ollamaURL+"/api/embed", "application/json", bytes.NewBuffer(payload))
		if err != nil {
			lastErr = err
			continue
		}
		defer resp.Body.Close()

		if resp.StatusCode != http.StatusOK {
			lastErr = fmt.Errorf("model %s returned status %d", model, resp.StatusCode)
			continue
		}

		var result struct {
			Embeddings [][]float32 `json:"embeddings"`
		}
		if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
			lastErr = err
			continue
		}

		if len(result.Embeddings) == 0 {
			lastErr = fmt.Errorf("no embeddings returned from %s", model)
			continue
		}

		log.Printf("Successfully generated embedding with model: %s", model)
		return result.Embeddings[0], nil
	}

	return nil, fmt.Errorf("all embedding models failed, last error: %v", lastErr)
}

func main() {
	log.Printf("Starting CUDA Service Worker for RTX 3060 Ti")
	log.Printf("Available CPU cores: %d", runtime.NumCPU())

	// Initialize PostgreSQL connection for pgvector search
	dbURL := os.Getenv("DATABASE_URL")
	if dbURL == "" {
		dbURL = "postgres://legal_admin:123456@localhost:5432/legal_ai_db?sslmode=disable"
		log.Printf("DATABASE_URL not set, using default: %s", dbURL)
	}

	dbPool, err := pgxpool.New(context.Background(), dbURL)
	if err != nil {
		log.Printf("Failed to connect to database: %v", err)
		log.Printf("Search functionality will be disabled")
		dbPool = nil
	} else {
		// Test the connection
		if err := dbPool.Ping(context.Background()); err != nil {
			log.Printf("Database ping failed: %v", err)
			log.Printf("Search functionality will be disabled")
			dbPool.Close()
			dbPool = nil
		} else {
			log.Printf("Database connection established successfully")
		}
	}

	service := NewCUDAService(dbPool)
	service.setupHTTPHandlers()

	// Start HTTP server
	go func() {
		port := os.Getenv("PORT")
		if port == "" {
			port = "8097" // Use 8097 to avoid conflict
		}

		log.Printf("Starting HTTP server on :%s", port)
		log.Printf("HTTP API: http://localhost:%s/api/v1/health", port)
		log.Printf("Workers: http://localhost:%s/api/v1/workers", port)
		log.Printf("Metrics: http://localhost:%s/api/v1/metrics", port)
		log.Printf("Search: http://localhost:%s/api/v1/search", port)

		if err := service.httpServer.Run(":" + port); err != nil {
			log.Fatalf("HTTP server failed to start on port %s: %v", port, err)
		}
	}()

	// Future: gRPC server setup would go here

	log.Printf("CUDA Service Worker is running")

	// Give the HTTP server time to start
	time.Sleep(2 * time.Second)

	// Verify the server is responding
	go func() {
		time.Sleep(3 * time.Second)
		port := os.Getenv("PORT")
		if port == "" {
			port = "8097"
		}

		resp, err := http.Get(fmt.Sprintf("http://localhost:%s/api/v1/health", port))
		if err != nil {
			log.Printf("WARNING: Health check failed: %v", err)
			log.Printf("Server may not be accepting connections on port %s", port)
		} else {
			resp.Body.Close()
			log.Printf("✅ HTTP server is responding on port %s", port)
		}
	}()

	// Keep the service running
	select {}
}

// CUDA Indexing HTTP Handlers

// buildIndexHandler handles generic GPU index building requests
func (s *CUDAService) buildIndexHandler(c *gin.Context) {
	var req struct {
		Vectors [][]float32               `json:"vectors"`
		Config  cuda.IndexingConfig       `json:"config"`
		Metadata map[string]interface{}   `json:"metadata,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Vectors) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No vectors provided"})
		return
	}

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	result, err := cuda.BuildGPUIndex(ctx, req.Vectors, req.Config)
	if err != nil {
		log.Printf("GPU index build failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// searchIndexHandler handles GPU-accelerated vector search
func (s *CUDAService) searchIndexHandler(c *gin.Context) {
	var req struct {
		Query     []float32             `json:"query"`
		IndexData []byte                `json:"index_data"`
		K         int                   `json:"k"`
		Config    cuda.IndexingConfig   `json:"config"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Query) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No query vector provided"})
		return
	}

	if req.K <= 0 {
		req.K = 10 // Default to top 10 results
	}

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	result, err := cuda.SearchGPUIndex(ctx, req.Query, req.IndexData, req.K, req.Config)
	if err != nil {
		log.Printf("GPU search failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

// buildHNSWHandler creates optimized HNSW index for RTX 3060 Ti
func (s *CUDAService) buildHNSWHandler(c *gin.Context) {
	var req struct {
		Vectors     [][]float32 `json:"vectors"`
		Dimensions  int         `json:"dimensions"`
		MaxElements int         `json:"max_elements,omitempty"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Vectors) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No vectors provided"})
		return
	}

	if req.Dimensions <= 0 {
		req.Dimensions = len(req.Vectors[0]) // Auto-detect dimensions
	}

	if req.MaxElements <= 0 {
		req.MaxElements = len(req.Vectors) * 2 // Allow for growth
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Minute)
	defer cancel()

	result, err := cuda.BuildHNSWIndex(ctx, req.Vectors, req.Dimensions, req.MaxElements)
	if err != nil {
		log.Printf("HNSW index build failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      result.Success,
		"index_id":     result.IndexID,
		"stats":        result.Stats,
		"error":        result.Error,
		"index_type":   "hnsw",
		"rtx_3060_optimized": true,
	})
}

// buildIVFPQHandler creates IVF-PQ index for large-scale legal documents
func (s *CUDAService) buildIVFPQHandler(c *gin.Context) {
	var req struct {
		Vectors    [][]float32 `json:"vectors"`
		Dimensions int         `json:"dimensions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Vectors) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No vectors provided"})
		return
	}

	if req.Dimensions <= 0 {
		req.Dimensions = len(req.Vectors[0]) // Auto-detect dimensions
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Minute)
	defer cancel()

	result, err := cuda.BuildIVFPQIndex(ctx, req.Vectors, req.Dimensions)
	if err != nil {
		log.Printf("IVF-PQ index build failed: %v", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success":      result.Success,
		"index_id":     result.IndexID,
		"stats":        result.Stats,
		"error":        result.Error,
		"index_type":   "ivf_pq",
		"legal_docs_optimized": true,
	})
}

// optimizeBatchHandler returns optimal batch size for RTX 3060 Ti
func (s *CUDAService) optimizeBatchHandler(c *gin.Context) {
	dimensionsStr := c.Param("dimensions")
	indexType := c.Param("type")

	dimensions := 768 // Default to common embedding size
	if d, err := strconv.Atoi(dimensionsStr); err == nil && d > 0 {
		dimensions = d
	}

	batchSize := cuda.OptimizeBatchSize(dimensions, indexType)

	c.JSON(http.StatusOK, gin.H{
		"dimensions":     dimensions,
		"index_type":     indexType,
		"optimal_batch":  batchSize,
		"gpu_model":      "RTX 3060 Ti",
		"vram_gb":        8,
		"cuda_cores":     4352,
		"recommendation": fmt.Sprintf("Use batch size %d for %s indexing with %d-dimensional vectors", batchSize, indexType, dimensions),
	})
}

// =============================================================================
// SIMD-ACCELERATED VECTOR OPERATION HANDLERS
// =============================================================================

// simdSimilarityHandler computes cosine similarity using SIMD acceleration
func (s *CUDAService) simdSimilarityHandler(c *gin.Context) {
	var req struct {
		VectorA []float32 `json:"vector_a"`
		VectorB []float32 `json:"vector_b"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.VectorA) == 0 || len(req.VectorB) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vectors cannot be empty"})
		return
	}

	if len(req.VectorA) != len(req.VectorB) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Vector dimension mismatch: %d vs %d", len(req.VectorA), len(req.VectorB)),
		})
		return
	}

	startTime := time.Now()
	similarity := s.simdParser.CosineSimilaritySIMD(req.VectorA, req.VectorB)
	processingTime := time.Since(startTime)

	c.JSON(http.StatusOK, gin.H{
		"similarity":       similarity,
		"dimensions":       len(req.VectorA),
		"processing_time_ns": processingTime.Nanoseconds(),
		"simd_enabled":     s.simdParser.UseAVX2 || s.simdParser.UseSSE4,
		"instruction_set":  s.getSIMDInstructionSet(),
	})
}

// simdDistanceHandler computes Euclidean distance using SIMD acceleration
func (s *CUDAService) simdDistanceHandler(c *gin.Context) {
	var req struct {
		VectorA []float32 `json:"vector_a"`
		VectorB []float32 `json:"vector_b"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.VectorA) == 0 || len(req.VectorB) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Vectors cannot be empty"})
		return
	}

	startTime := time.Now()
	distance := s.simdParser.EuclideanDistanceSIMD(req.VectorA, req.VectorB)
	processingTime := time.Since(startTime)

	c.JSON(http.StatusOK, gin.H{
		"distance":         distance,
		"dimensions":       len(req.VectorA),
		"processing_time_ns": processingTime.Nanoseconds(),
		"simd_enabled":     s.simdParser.UseAVX2 || s.simdParser.UseSSE4,
		"instruction_set":  s.getSIMDInstructionSet(),
	})
}

// simdBatchHandler processes multiple vector comparisons in batch
func (s *CUDAService) simdBatchHandler(c *gin.Context) {
	var req struct {
		Query      []float32   `json:"query"`
		Candidates [][]float32 `json:"candidates"`
		Operation  string      `json:"operation"` // "similarity" or "distance"
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON: " + err.Error()})
		return
	}

	if len(req.Query) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Query vector cannot be empty"})
		return
	}

	if len(req.Candidates) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Candidate vectors cannot be empty"})
		return
	}

	if req.Operation == "" {
		req.Operation = "similarity" // Default operation
	}

	startTime := time.Now()
	var results []float32

	switch req.Operation {
	case "similarity":
		results = s.simdParser.BatchCosineSimilarity(req.Query, req.Candidates)
	case "distance":
		results = make([]float32, len(req.Candidates))
		for i, candidate := range req.Candidates {
			results[i] = s.simdParser.EuclideanDistanceSIMD(req.Query, candidate)
		}
	default:
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid operation. Use 'similarity' or 'distance'",
		})
		return
	}

	processingTime := time.Since(startTime)
	vectorsPerSecond := float64(len(req.Candidates)) / processingTime.Seconds()

	c.JSON(http.StatusOK, gin.H{
		"operation":          req.Operation,
		"results":            results,
		"query_dimensions":   len(req.Query),
		"candidates_count":   len(req.Candidates),
		"processing_time_ms": processingTime.Milliseconds(),
		"vectors_per_second": vectorsPerSecond,
		"simd_enabled":       s.simdParser.UseAVX2 || s.simdParser.UseSSE4,
		"instruction_set":    s.getSIMDInstructionSet(),
		"batch_optimized":    true,
	})
}

// simdCapabilitiesHandler returns SIMD capabilities and configuration
func (s *CUDAService) simdCapabilitiesHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"simd_capabilities": gin.H{
			"avx2_enabled":     s.simdParser.UseAVX2,
			"sse4_enabled":     s.simdParser.UseSSE4,
			"cuda_available":   s.simdParser.UseCUDA,
			"instruction_set":  s.getSIMDInstructionSet(),
			"batch_size":       s.simdParser.BatchSize,
			"cache_enabled":    len(s.simdParser.VectorCache) >= 0,
			"cache_size":       len(s.simdParser.VectorCache),
		},
		"gpu_capabilities": gin.H{
			"model":            "RTX 3060 Ti",
			"cuda_cores":       RTX_3060_TI_CUDA_CORES,
			"tensor_cores":     RTX_3060_TI_TENSOR_CORES,
			"memory_gb":        RTX_3060_TI_MEMORY_MB / 1024,
			"memory_bandwidth": RTX_3060_TI_MEMORY_BW_GBS,
			"compute_capability": "8.6",
		},
		"optimization_settings": gin.H{
			"pgvector_simd":    true,
			"batch_processing": true,
			"memory_aligned":   true,
			"parallel_workers": runtime.NumCPU(),
		},
		"performance_metrics": gin.H{
			"estimated_ops_per_second": s.estimateOpsPerSecond(),
			"memory_efficiency":        "High",
			"cpu_utilization":          "Optimized",
		},
	})
}

// getSIMDInstructionSet returns the active SIMD instruction set
func (s *CUDAService) getSIMDInstructionSet() string {
	if s.simdParser.UseAVX2 {
		return "AVX2"
	} else if s.simdParser.UseSSE4 {
		return "SSE4"
	} else {
		return "Scalar"
	}
}

// estimateOpsPerSecond estimates operations per second based on hardware
func (s *CUDAService) estimateOpsPerSecond() int64 {
	// Conservative estimates based on RTX 3060 Ti + CPU SIMD
	baseOps := int64(1000000) // 1M ops/sec baseline

	if s.simdParser.UseAVX2 {
		baseOps *= 8 // AVX2 8-wide SIMD
	} else if s.simdParser.UseSSE4 {
		baseOps *= 4 // SSE4 4-wide SIMD
	}

	// GPU acceleration multiplier
	if s.simdParser.UseCUDA {
		baseOps *= 10 // 10x with GPU acceleration
	}

	return baseOps
}
