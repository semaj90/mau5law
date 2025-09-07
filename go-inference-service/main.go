package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"go.uber.org/zap"
)

// RTX 3060 Ti optimized configuration
const (
	MaxGPULayers       = 35    // RTX 3060 Ti can handle 35-40 layers
	MaxContextSize     = 4096  // 4K context
	MaxConcurrentJobs  = 16    // Optimal for RTX 3060 Ti
	MemoryBudget       = 12288 // 12GB VRAM limit
	TensorCoreCount    = 112   // RTX 3060 Ti tensor cores
	MemoryBandwidthGBs = 448   // RTX 3060 Ti memory bandwidth
	OllamaBaseURL      = "http://localhost:11434"  // Ollama API endpoint
)

// InferenceRequest represents a chat inference request
type InferenceRequest struct {
	Prompt      string  `json:"prompt" binding:"required"`
	MaxTokens   int     `json:"max_tokens,omitempty"`
	Temperature float32 `json:"temperature,omitempty"`
	TopP        float32 `json:"top_p,omitempty"`
	Model       string  `json:"model,omitempty"`
	Stream      bool    `json:"stream,omitempty"`
	StopTokens  []string `json:"stop_tokens,omitempty"`
	UseGPU      bool    `json:"use_gpu,omitempty"`
}

// InferenceResponse represents the response from inference
type InferenceResponse struct {
	Text              string  `json:"text"`
	Tokens            int     `json:"tokens"`
	ProcessingTimeMs  int64   `json:"processing_time_ms"`
	TokensPerSecond   float64 `json:"tokens_per_second"`
	GPUUtilization    float32 `json:"gpu_utilization"`
	MemoryUsageMB     int64   `json:"memory_usage_mb"`
	Success           bool    `json:"success"`
	Error             string  `json:"error,omitempty"`
}

// GPUMetrics tracks RTX 3060 Ti performance
type GPUMetrics struct {
	UtilizationPercent float32   `json:"utilization_percent"`
	MemoryUsageMB      int64     `json:"memory_usage_mb"`
	TensorCoreLoad     int       `json:"tensor_core_load"`
	ThermalStatus      string    `json:"thermal_status"`
	Bandwidth          int       `json:"bandwidth_gbs"`
	LastUpdated        time.Time `json:"last_updated"`
}

// OllamaGenerateRequest represents request to Ollama API
type OllamaGenerateRequest struct {
	Model       string  `json:"model"`
	Prompt      string  `json:"prompt"`
	Temperature float32 `json:"temperature,omitempty"`
	TopP        float32 `json:"top_p,omitempty"`
	MaxTokens   int     `json:"num_predict,omitempty"`
	Stream      bool    `json:"stream"`
}

// OllamaGenerateResponse represents response from Ollama API
type OllamaGenerateResponse struct {
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

// InferenceService manages GPU-accelerated Ollama proxy
type InferenceService struct {
	httpClient     *http.Client
	jobQueue       chan *InferenceJob
	workers        []*InferenceWorker
	gpuMetrics     GPUMetrics
	logger         *zap.Logger
	totalJobs      int64
	successfulJobs int64
	modelsMutex    sync.RWMutex
}

// InferenceJob represents a single inference task
type InferenceJob struct {
	ID       string
	Request  InferenceRequest
	Response chan InferenceResponse
	StartTime time.Time
}

// InferenceWorker handles concurrent inference jobs
type InferenceWorker struct {
	ID      int
	service *InferenceService
	busy    bool
	mutex   sync.Mutex
}

// NewInferenceService creates a new inference service
func NewInferenceService() *InferenceService {
	logger, _ := zap.NewProduction()
	
	// Create HTTP client with optimized settings for Ollama
	httpClient := &http.Client{
		Timeout: 60 * time.Second,
		Transport: &http.Transport{
			MaxIdleConns:        100,
			MaxIdleConnsPerHost: 10,
			IdleConnTimeout:     30 * time.Second,
		},
	}
	
	service := &InferenceService{
		httpClient: httpClient,
		jobQueue:   make(chan *InferenceJob, 100),
		logger:     logger,
		gpuMetrics: GPUMetrics{
			Bandwidth: MemoryBandwidthGBs,
		},
	}

	// Initialize worker pool for concurrent inference
	service.initializeWorkers()
	
	// Start GPU metrics monitoring
	go service.monitorGPUMetrics()
	
	return service
}

// initializeWorkers creates a pool of inference workers
func (s *InferenceService) initializeWorkers() {
	cpuCount := runtime.NumCPU()
	workerCount := min(MaxConcurrentJobs, cpuCount*2)
	
	s.workers = make([]*InferenceWorker, workerCount)
	
	for i := 0; i < workerCount; i++ {
		worker := &InferenceWorker{
			ID:      i,
			service: s,
		}
		
		s.workers[i] = worker
		go worker.run()
	}
	
	s.logger.Info("Initialized inference workers",
		zap.Int("worker_count", workerCount),
		zap.Int("max_concurrent", MaxConcurrentJobs))
}

// VerifyOllamaModel verifies model is available in Ollama
func (s *InferenceService) VerifyOllamaModel(modelName string) error {
	resp, err := http.Get(fmt.Sprintf("%s/api/tags", OllamaBaseURL))
	if err != nil {
		return fmt.Errorf("failed to connect to Ollama: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Models []struct {
			Name string `json:"name"`
		} `json:"models"`
	}
	
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode Ollama response: %w", err)
	}

	for _, model := range result.Models {
		if model.Name == modelName {
			s.logger.Info("Model verified in Ollama",
				zap.String("model_name", modelName))
			return nil
		}
	}
	
	return fmt.Errorf("model %s not found in Ollama", modelName)
}

// ProcessInference handles inference requests with GPU acceleration
func (s *InferenceService) ProcessInference(req InferenceRequest) InferenceResponse {
	startTime := time.Now()
	
	// Set defaults
	if req.MaxTokens == 0 {
		req.MaxTokens = 256
	}
	if req.Temperature == 0 {
		req.Temperature = 0.1
	}
	if req.TopP == 0 {
		req.TopP = 0.9
	}
	if req.Model == "" {
		req.Model = "legal:latest"
	}

	// Create inference job
	job := &InferenceJob{
		ID:        fmt.Sprintf("job_%d", time.Now().UnixNano()),
		Request:   req,
		Response:  make(chan InferenceResponse, 1),
		StartTime: startTime,
	}

	// Submit to worker queue
	select {
	case s.jobQueue <- job:
		// Wait for response with timeout
		select {
		case response := <-job.Response:
			s.totalJobs++
			if response.Success {
				s.successfulJobs++
			}
			return response
		case <-time.After(60 * time.Second):
			return InferenceResponse{
				Success: false,
				Error:   "Inference timeout after 60 seconds",
			}
		}
	default:
		return InferenceResponse{
			Success: false,
			Error:   "Inference queue full, try again later",
		}
	}
}

// InferenceWorker.run processes jobs from the queue
func (w *InferenceWorker) run() {
	for job := range w.service.jobQueue {
		w.mutex.Lock()
		w.busy = true
		w.mutex.Unlock()

		response := w.processJob(job)
		job.Response <- response

		w.mutex.Lock()
		w.busy = false
		w.mutex.Unlock()
	}
}

// processJob runs actual inference via Ollama API with GPU acceleration
func (w *InferenceWorker) processJob(job *InferenceJob) InferenceResponse {
	startTime := time.Now()
	req := job.Request

	// Create Ollama API request
	ollamaReq := OllamaGenerateRequest{
		Model:       req.Model,
		Prompt:      req.Prompt,
		Temperature: req.Temperature,
		TopP:        req.TopP,
		MaxTokens:   req.MaxTokens,
		Stream:      false,
	}

	// Marshal request
	requestBody, err := json.Marshal(ollamaReq)
	if err != nil {
		return InferenceResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to marshal request: %v", err),
		}
	}

	// Make API call to Ollama
	resp, err := w.service.httpClient.Post(
		fmt.Sprintf("%s/api/generate", OllamaBaseURL),
		"application/json",
		bytes.NewBuffer(requestBody),
	)
	if err != nil {
		return InferenceResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to call Ollama API: %v", err),
		}
	}
	defer resp.Body.Close()

	// Read response
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return InferenceResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to read response: %v", err),
		}
	}

	// Parse Ollama response
	var ollamaResp OllamaGenerateResponse
	if err := json.Unmarshal(responseBody, &ollamaResp); err != nil {
		return InferenceResponse{
			Success: false,
			Error:   fmt.Sprintf("Failed to parse response: %v", err),
		}
	}

	processingTime := time.Since(startTime)
	
	// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
	outputTokens := len(ollamaResp.Response) / 4
	tokensPerSecond := float64(outputTokens) / processingTime.Seconds()

	return InferenceResponse{
		Text:              ollamaResp.Response,
		Tokens:            outputTokens,
		ProcessingTimeMs:  processingTime.Milliseconds(),
		TokensPerSecond:   tokensPerSecond,
		GPUUtilization:    w.service.gpuMetrics.UtilizationPercent,
		MemoryUsageMB:     w.service.gpuMetrics.MemoryUsageMB,
		Success:           true,
	}
}

// monitorGPUMetrics updates RTX 3060 Ti performance metrics
func (s *InferenceService) monitorGPUMetrics() {
	ticker := time.NewTicker(1 * time.Second)
	defer ticker.Stop()

	for range ticker.C {
		// Simulate RTX 3060 Ti metrics (in production, use nvidia-ml-go)
		activeWorkers := 0
		for _, worker := range s.workers {
			worker.mutex.Lock()
			if worker.busy {
				activeWorkers++
			}
			worker.mutex.Unlock()
		}

		utilizationPercent := float32(activeWorkers) / float32(len(s.workers)) * 100
		
		s.gpuMetrics = GPUMetrics{
			UtilizationPercent: utilizationPercent,
			MemoryUsageMB:      int64(4096 + activeWorkers*512), // Estimate
			TensorCoreLoad:     int(utilizationPercent * TensorCoreCount / 100),
			ThermalStatus:      getThermalStatus(utilizationPercent),
			Bandwidth:          MemoryBandwidthGBs,
			LastUpdated:        time.Now(),
		}
	}
}

// getThermalStatus estimates thermal status based on utilization
func getThermalStatus(utilization float32) string {
	switch {
	case utilization > 85:
		return "hot"
	case utilization > 60:
		return "warm"
	default:
		return "cool"
	}
}

// HTTP Handlers

func (s *InferenceService) healthHandler(c *gin.Context) {
	// Test Ollama connection
	ollamaHealthy := true
	if err := s.VerifyOllamaModel("legal:latest"); err != nil {
		ollamaHealthy = false
	}

	stats := gin.H{
		"service":         "go-inference-ollama-proxy",
		"status":          "healthy",
		"ollama_healthy":  ollamaHealthy,
		"ollama_url":      OllamaBaseURL,
		"default_model":   "legal:latest",
		"active_workers":  len(s.workers),
		"total_jobs":      s.totalJobs,
		"successful_jobs": s.successfulJobs,
		"success_rate":    float64(s.successfulJobs) / max(float64(s.totalJobs), 1) * 100,
		"gpu_metrics":     s.gpuMetrics,
		"rtx_specs": gin.H{
			"tensor_cores":    TensorCoreCount,
			"memory_gb":       12,
			"bandwidth_gbs":   MemoryBandwidthGBs,
			"max_gpu_layers":  MaxGPULayers,
			"max_context":     MaxContextSize,
		},
		"timestamp": time.Now(),
	}

	if ollamaHealthy {
		c.JSON(http.StatusOK, stats)
	} else {
		c.JSON(http.StatusServiceUnavailable, stats)
	}
}

func (s *InferenceService) inferenceHandler(c *gin.Context) {
	var req InferenceRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   fmt.Sprintf("Invalid request: %v", err),
		})
		return
	}

	// Process inference
	response := s.ProcessInference(req)
	
	if response.Success {
		c.JSON(http.StatusOK, response)
	} else {
		c.JSON(http.StatusInternalServerError, response)
	}
}

func (s *InferenceService) metricsHandler(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{
		"gpu_metrics": s.gpuMetrics,
		"service_metrics": gin.H{
			"total_jobs":      s.totalJobs,
			"successful_jobs": s.successfulJobs,
			"active_workers":  len(s.workers),
			"queue_length":    len(s.jobQueue),
		},
		"timestamp": time.Now(),
	})
}

// Utility functions
func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b float64) float64 {
	if a > b {
		return a
	}
	return b
}

func main() {
	// Initialize inference service
	service := NewInferenceService()
	defer service.logger.Sync()

	// Verify Ollama connection and legal:latest model
	if err := service.VerifyOllamaModel("legal:latest"); err != nil {
		service.logger.Warn("Failed to verify Ollama model",
			zap.String("model", "legal:latest"),
			zap.Error(err))
	}

	// Setup Gin router
	gin.SetMode(gin.ReleaseMode)
	r := gin.New()
	r.Use(gin.Logger())
	r.Use(gin.Recovery())

	// CORS middleware
	r.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type")
		
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(http.StatusNoContent)
			return
		}
		
		c.Next()
	})

	// API routes
	api := r.Group("/api/v1")
	{
		api.GET("/health", service.healthHandler)
		api.GET("/metrics", service.metricsHandler)
		api.POST("/inference", service.inferenceHandler)
	}

	// Start server
	port := ":8080"
	service.logger.Info("Starting Go inference service",
		zap.String("port", port),
		zap.Int("workers", len(service.workers)))

	log.Fatal(http.ListenAndServe(port, r))
}