package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
)

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
func NewCUDAService() *CUDAService {
	ctx, cancel := context.WithCancel(context.Background())
	
	service := &CUDAService{
		workers:     make([]*CUDAWorker, 0),
		taskQueue:   make(chan *CUDATask, TASK_QUEUE_SIZE),
		results:     make(map[string]*CUDATask),
		shutdownCtx: ctx,
		shutdown:    cancel,
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
		Type     string                 `json:"type" binding:"required"`
		Priority int                    `json:"priority"`
		Payload  map[string]interface{} `json:"payload" binding:"required"`
		Metadata map[string]string      `json:"metadata"`
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

func main() {
	log.Printf("Starting CUDA Service Worker for RTX 3060 Ti")
	log.Printf("Available CPU cores: %d", runtime.NumCPU())
	
	service := NewCUDAService()
	service.setupHTTPHandlers()
	
	// Start HTTP server
	go func() {
		log.Printf("Starting HTTP server on :8096")
		if err := service.httpServer.Run(":8096"); err != nil {
			log.Fatalf("HTTP server failed: %v", err)
		}
	}()
	
	// Future: gRPC server setup would go here
	
	log.Printf("CUDA Service Worker is running")
	log.Printf("HTTP API: http://localhost:8096/api/v1/health")
	log.Printf("Workers: http://localhost:8096/api/v1/workers")
	log.Printf("Metrics: http://localhost:8096/api/v1/metrics")
	
	// Keep the service running
	select {}
}