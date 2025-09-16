package main

/*
#cgo CFLAGS: -I.
#cgo LDFLAGS: -L. -lq4km_plugin -lcudart -ltensorrt
#include <stdlib.h>

// C wrapper functions for TensorRT engine
typedef struct TensorRTEngine TensorRTEngine;

extern TensorRTEngine* createEngine(const char* modelPath, int maxBatchSize, int maxSeqLen, int numHeads, int headDim);
extern void destroyEngine(TensorRTEngine* engine);
extern int loadModel(TensorRTEngine* engine, const char* modelPath);
extern int setInputTensor(TensorRTEngine* engine, const char* name, void* data, size_t size);
extern int inferAsync(TensorRTEngine* engine);
extern void* getOutputTensor(TensorRTEngine* engine, const char* name);
extern void printEngineInfo(TensorRTEngine* engine);

// Performance metrics structure
typedef struct {
    float inferenceTime_ms;
    float throughput_tokens_per_sec;
    size_t memoryUsage_bytes;
    float gpuUtilization_percent;
} PerfMetrics;

extern PerfMetrics getLastMetrics(TensorRTEngine* engine);
*/
import "C"

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"sync"
	"time"
	"unsafe"

	"github.com/gorilla/mux"
	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"github.com/rs/cors"
	"github.com/sirupsen/logrus"
)

// LegalTensorRTService manages TensorRT inference for legal AI
type LegalTensorRTService struct {
	engine       unsafe.Pointer // *C.TensorRTEngine
	config       *ServiceConfig
	logger       *logrus.Logger
	requestQueue chan *InferenceRequest
	workers      []*InferenceWorker
	metrics      *ServiceMetrics
	mu           sync.RWMutex
	initialized  bool
}

// ServiceConfig holds configuration for the service
type ServiceConfig struct {
	ModelPath        string `json:"model_path"`
	PlanPath         string `json:"plan_path"`
	MaxBatchSize     int    `json:"max_batch_size"`
	MaxSeqLen        int    `json:"max_seq_len"`
	NumHeads         int    `json:"num_heads"`
	HeadDim          int    `json:"head_dim"`
	NumWorkers       int    `json:"num_workers"`
	QueueSize        int    `json:"queue_size"`
	Port             int    `json:"port"`
	EnableMetrics    bool   `json:"enable_metrics"`
	EnableProfiling  bool   `json:"enable_profiling"`
	CacheDir         string `json:"cache_dir"`
	LogLevel         string `json:"log_level"`
}

// InferenceRequest represents a single inference request
type InferenceRequest struct {
	ID          string                 `json:"id"`
	InputText   string                 `json:"input_text"`
	InputTokens []int32                `json:"input_tokens,omitempty"`
	MaxTokens   int                    `json:"max_tokens"`
	Temperature float32                `json:"temperature"`
	TopP        float32                `json:"top_p"`
	Metadata    map[string]interface{} `json:"metadata"`
	ResponseCh  chan *InferenceResponse
	Timestamp   time.Time
}

// InferenceResponse represents the response from inference
type InferenceResponse struct {
	ID           string                 `json:"id"`
	OutputText   string                 `json:"output_text"`
	OutputTokens []int32                `json:"output_tokens,omitempty"`
	Embeddings   []float32              `json:"embeddings,omitempty"`
	Latency      float64                `json:"latency_ms"`
	TokenCount   int                    `json:"token_count"`
	Metadata     map[string]interface{} `json:"metadata"`
	Error        string                 `json:"error,omitempty"`
}

// InferenceWorker processes inference requests
type InferenceWorker struct {
	id      int
	service *LegalTensorRTService
	ctx     context.Context
	cancel  context.CancelFunc
}

// ServiceMetrics holds Prometheus metrics
type ServiceMetrics struct {
	RequestsTotal     prometheus.Counter
	RequestDuration   prometheus.Histogram
	ActiveRequests    prometheus.Gauge
	QueueSize         prometheus.Gauge
	InferenceLatency  prometheus.Histogram
	TokenThroughput   prometheus.Gauge
	MemoryUsage       prometheus.Gauge
	GPUUtilization    prometheus.Gauge
	ErrorsTotal       prometheus.Counter
}

// Health check response
type HealthResponse struct {
	Status           string            `json:"status"`
	Timestamp        time.Time         `json:"timestamp"`
	Version          string            `json:"version"`
	TensorRTAvailable bool             `json:"tensorrt_available"`
	ModelLoaded      bool              `json:"model_loaded"`
	QueueSize        int               `json:"queue_size"`
	ActiveWorkers    int               `json:"active_workers"`
	SystemInfo       map[string]string `json:"system_info"`
}

// Default configuration
func defaultConfig() *ServiceConfig {
	return &ServiceConfig{
		ModelPath:       "/app/models/gemma3-legal-q4km.onnx",
		PlanPath:        "/app/cache/gemma3-legal-q4km.plan",
		MaxBatchSize:    8,
		MaxSeqLen:       131072, // Ultra-long context for legal documents
		NumHeads:        32,     // Gemma3 default
		HeadDim:         128,    // Gemma3 default
		NumWorkers:      4,      // Optimal for RTX 3060 Ti
		QueueSize:       1000,
		Port:            8100,
		EnableMetrics:   true,
		EnableProfiling: true,
		CacheDir:        "/app/cache",
		LogLevel:        "info",
	}
}

// NewLegalTensorRTService creates a new service instance
func NewLegalTensorRTService(config *ServiceConfig) *LegalTensorRTService {
	if config == nil {
		config = defaultConfig()
	}

	// Initialize logger
	logger := logrus.New()
	level, err := logrus.ParseLevel(config.LogLevel)
	if err == nil {
		logger.SetLevel(level)
	}

	service := &LegalTensorRTService{
		config:       config,
		logger:       logger,
		requestQueue: make(chan *InferenceRequest, config.QueueSize),
		metrics:      initializeMetrics(),
		initialized:  false,
	}

	return service
}

// Initialize initializes the TensorRT engine and workers
func (s *LegalTensorRTService) Initialize() error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.logger.Info("Initializing Legal AI TensorRT Service...")

	// Create TensorRT engine
	modelPathC := C.CString(s.config.ModelPath)
	defer C.free(unsafe.Pointer(modelPathC))

	s.engine = C.createEngine(
		modelPathC,
		C.int(s.config.MaxBatchSize),
		C.int(s.config.MaxSeqLen),
		C.int(s.config.NumHeads),
		C.int(s.config.HeadDim),
	)

	if s.engine == nil {
		return fmt.Errorf("failed to create TensorRT engine")
	}

	// Load model
	if result := C.loadModel((*C.TensorRTEngine)(s.engine), modelPathC); result == 0 {
		return fmt.Errorf("failed to load model from %s", s.config.ModelPath)
	}

	// Print engine information
	C.printEngineInfo((*C.TensorRTEngine)(s.engine))

	// Start worker goroutines
	s.workers = make([]*InferenceWorker, s.config.NumWorkers)
	for i := 0; i < s.config.NumWorkers; i++ {
		worker := &InferenceWorker{
			id:      i,
			service: s,
		}
		worker.ctx, worker.cancel = context.WithCancel(context.Background())
		s.workers[i] = worker
		go worker.run()
	}

	s.initialized = true
	s.logger.Info("Legal AI TensorRT Service initialized successfully")

	return nil
}

// Shutdown gracefully shuts down the service
func (s *LegalTensorRTService) Shutdown() {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.logger.Info("Shutting down Legal AI TensorRT Service...")

	// Cancel all workers
	for _, worker := range s.workers {
		if worker.cancel != nil {
			worker.cancel()
		}
	}

	// Close request queue
	close(s.requestQueue)

	// Destroy TensorRT engine
	if s.engine != nil {
		C.destroyEngine((*C.TensorRTEngine)(s.engine))
		s.engine = nil
	}

	s.initialized = false
	s.logger.Info("Legal AI TensorRT Service shut down complete")
}

// ProcessInference processes a single inference request
func (s *LegalTensorRTService) ProcessInference(req *InferenceRequest) {
	if !s.initialized {
		req.ResponseCh <- &InferenceResponse{
			ID:    req.ID,
			Error: "Service not initialized",
		}
		return
	}

	// Update metrics
	s.metrics.RequestsTotal.Inc()
	s.metrics.ActiveRequests.Inc()
	defer s.metrics.ActiveRequests.Dec()

	startTime := time.Now()

	// Queue the request
	select {
	case s.requestQueue <- req:
		s.metrics.QueueSize.Set(float64(len(s.requestQueue)))
	case <-time.After(5 * time.Second):
		req.ResponseCh <- &InferenceResponse{
			ID:    req.ID,
			Error: "Request queue timeout",
		}
		s.metrics.ErrorsTotal.Inc()
		return
	}

	// Wait for response (handled by workers)
	select {
	case response := <-req.ResponseCh:
		duration := time.Since(startTime).Seconds()
		s.metrics.RequestDuration.Observe(duration)
		response.Latency = duration * 1000 // Convert to milliseconds

		// Update TensorRT-specific metrics
		s.updateTensorRTMetrics()

	case <-time.After(30 * time.Second):
		s.metrics.ErrorsTotal.Inc()
		s.logger.Error("Inference timeout for request", req.ID)
	}
}

// Worker goroutine for processing inference requests
func (w *InferenceWorker) run() {
	w.service.logger.Infof("Starting inference worker %d", w.id)

	for {
		select {
		case <-w.ctx.Done():
			w.service.logger.Infof("Stopping inference worker %d", w.id)
			return

		case req := <-w.service.requestQueue:
			if req == nil {
				continue
			}

			w.service.metrics.QueueSize.Set(float64(len(w.service.requestQueue)))
			w.processRequest(req)
		}
	}
}

// Process a single inference request
func (w *InferenceWorker) processRequest(req *InferenceRequest) {
	startTime := time.Now()

	response := &InferenceResponse{
		ID:        req.ID,
		Metadata:  make(map[string]interface{}),
		Timestamp: time.Now(),
	}

	defer func() {
		req.ResponseCh <- response
		w.service.metrics.InferenceLatency.Observe(time.Since(startTime).Seconds())
	}()

	// Convert input text to tokens (simplified - would use proper tokenizer)
	inputTokens := w.tokenizeText(req.InputText)
	if len(inputTokens) == 0 {
		response.Error = "Failed to tokenize input text"
		return
	}

	// Prepare input tensor
	inputName := C.CString("input_ids")
	defer C.free(unsafe.Pointer(inputName))

	inputData := (*C.int)(unsafe.Pointer(&inputTokens[0]))
	inputSize := C.size_t(len(inputTokens) * 4) // int32 = 4 bytes

	// Set input tensor
	if result := C.setInputTensor((*C.TensorRTEngine)(w.service.engine), inputName, unsafe.Pointer(inputData), inputSize); result == 0 {
		response.Error = "Failed to set input tensor"
		return
	}

	// Run inference
	if result := C.inferAsync((*C.TensorRTEngine)(w.service.engine)); result == 0 {
		response.Error = "Inference failed"
		return
	}

	// Get output tensor
	outputName := C.CString("logits")
	defer C.free(unsafe.Pointer(outputName))

	outputPtr := C.getOutputTensor((*C.TensorRTEngine)(w.service.engine), outputName)
	if outputPtr == nil {
		response.Error = "Failed to get output tensor"
		return
	}

	// Convert output to tokens and then to text (simplified)
	outputTokens := w.processOutputLogits(outputPtr, req.MaxTokens)
	response.OutputText = w.detokenizeTokens(outputTokens)
	response.OutputTokens = outputTokens
	response.TokenCount = len(outputTokens)

	// Add metadata
	response.Metadata["worker_id"] = w.id
	response.Metadata["input_length"] = len(inputTokens)
	response.Metadata["output_length"] = len(outputTokens)
}

// Simplified tokenization (would use proper tokenizer in production)
func (w *InferenceWorker) tokenizeText(text string) []int32 {
	// This is a placeholder - in production, you'd use the actual tokenizer
	tokens := make([]int32, 0, len(text)/4) // Rough estimate
	for i, char := range text {
		if i >= 4096 { // Limit input length
			break
		}
		tokens = append(tokens, int32(char)%32000) // Simplified mapping
	}
	return tokens
}

// Process output logits to generate tokens
func (w *InferenceWorker) processOutputLogits(logitsPtr unsafe.Pointer, maxTokens int) []int32 {
	// This is a placeholder - in production, you'd implement proper sampling
	tokens := make([]int32, 0, maxTokens)

	// Simplified: just return some dummy tokens
	for i := 0; i < min(maxTokens, 100); i++ {
		tokens = append(tokens, int32(1000+i))
	}

	return tokens
}

// Convert tokens back to text
func (w *InferenceWorker) detokenizeTokens(tokens []int32) string {
	// Placeholder implementation
	text := ""
	for _, token := range tokens {
		if token < 32000 {
			text += string(rune(token%128 + 32)) // Simple ASCII mapping
		}
	}
	return text
}

// Update TensorRT-specific metrics
func (s *LegalTensorRTService) updateTensorRTMetrics() {
	if s.engine == nil {
		return
	}

	metrics := C.getLastMetrics((*C.TensorRTEngine)(s.engine))

	s.metrics.TokenThroughput.Set(float64(metrics.throughput_tokens_per_sec))
	s.metrics.MemoryUsage.Set(float64(metrics.memoryUsage_bytes))
	s.metrics.GPUUtilization.Set(float64(metrics.gpuUtilization_percent))
}

// Initialize Prometheus metrics
func initializeMetrics() *ServiceMetrics {
	return &ServiceMetrics{
		RequestsTotal: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "legal_tensorrt_requests_total",
			Help: "Total number of inference requests",
		}),
		RequestDuration: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "legal_tensorrt_request_duration_seconds",
			Help:    "Request duration in seconds",
			Buckets: prometheus.ExponentialBuckets(0.001, 2, 15),
		}),
		ActiveRequests: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "legal_tensorrt_active_requests",
			Help: "Number of active requests",
		}),
		QueueSize: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "legal_tensorrt_queue_size",
			Help: "Current queue size",
		}),
		InferenceLatency: prometheus.NewHistogram(prometheus.HistogramOpts{
			Name:    "legal_tensorrt_inference_latency_seconds",
			Help:    "TensorRT inference latency in seconds",
			Buckets: prometheus.ExponentialBuckets(0.01, 2, 10),
		}),
		TokenThroughput: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "legal_tensorrt_token_throughput",
			Help: "Token processing throughput (tokens/sec)",
		}),
		MemoryUsage: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "legal_tensorrt_memory_usage_bytes",
			Help: "GPU memory usage in bytes",
		}),
		GPUUtilization: prometheus.NewGauge(prometheus.GaugeOpts{
			Name: "legal_tensorrt_gpu_utilization",
			Help: "GPU utilization percentage",
		}),
		ErrorsTotal: prometheus.NewCounter(prometheus.CounterOpts{
			Name: "legal_tensorrt_errors_total",
			Help: "Total number of errors",
		}),
	}
}

// HTTP handlers
func (s *LegalTensorRTService) healthHandler(w http.ResponseWriter, r *http.Request) {
	health := HealthResponse{
		Status:           "healthy",
		Timestamp:        time.Now(),
		Version:          "1.0.0",
		TensorRTAvailable: s.engine != nil,
		ModelLoaded:      s.initialized,
		QueueSize:        len(s.requestQueue),
		ActiveWorkers:    len(s.workers),
		SystemInfo: map[string]string{
			"go_version":    runtime.Version(),
			"num_cpu":       strconv.Itoa(runtime.NumCPU()),
			"num_goroutine": strconv.Itoa(runtime.NumGoroutine()),
		},
	}

	if !s.initialized {
		health.Status = "initializing"
		w.WriteHeader(http.StatusServiceUnavailable)
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

func (s *LegalTensorRTService) inferenceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req InferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Generate request ID if not provided
	if req.ID == "" {
		req.ID = fmt.Sprintf("req_%d", time.Now().UnixNano())
	}

	// Set defaults
	if req.MaxTokens == 0 {
		req.MaxTokens = 512
	}
	if req.Temperature == 0 {
		req.Temperature = 0.7
	}
	if req.TopP == 0 {
		req.TopP = 0.9
	}

	req.ResponseCh = make(chan *InferenceResponse, 1)
	req.Timestamp = time.Now()

	// Process inference asynchronously
	go s.ProcessInference(&req)

	// Wait for response
	select {
	case response := <-req.ResponseCh:
		w.Header().Set("Content-Type", "application/json")
		if response.Error != "" {
			w.WriteHeader(http.StatusInternalServerError)
		}
		json.NewEncoder(w).Encode(response)

	case <-time.After(30 * time.Second):
		http.Error(w, "Request timeout", http.StatusRequestTimeout)
	}
}

func (s *LegalTensorRTService) metricsHandler(w http.ResponseWriter, r *http.Request) {
	// Register metrics with Prometheus
	reg := prometheus.NewRegistry()
	reg.MustRegister(s.metrics.RequestsTotal)
	reg.MustRegister(s.metrics.RequestDuration)
	reg.MustRegister(s.metrics.ActiveRequests)
	reg.MustRegister(s.metrics.QueueSize)
	reg.MustRegister(s.metrics.InferenceLatency)
	reg.MustRegister(s.metrics.TokenThroughput)
	reg.MustRegister(s.metrics.MemoryUsage)
	reg.MustRegister(s.metrics.GPUUtilization)
	reg.MustRegister(s.metrics.ErrorsTotal)

	handler := promhttp.HandlerFor(reg, promhttp.HandlerOpts{})
	handler.ServeHTTP(w, r)
}

// Start the HTTP server
func (s *LegalTensorRTService) StartServer() error {
	router := mux.NewRouter()

	// API routes
	router.HandleFunc("/health", s.healthHandler).Methods("GET")
	router.HandleFunc("/v1/inference", s.inferenceHandler).Methods("POST")

	if s.config.EnableMetrics {
		router.HandleFunc("/metrics", s.metricsHandler).Methods("GET")
	}

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	addr := fmt.Sprintf(":%d", s.config.Port)
	s.logger.Infof("Starting Legal AI TensorRT Service on %s", addr)

	return http.ListenAndServe(addr, handler)
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func main() {
	// Load configuration from environment or config file
	config := defaultConfig()

	if port := os.Getenv("PORT"); port != "" {
		if p, err := strconv.Atoi(port); err == nil {
			config.Port = p
		}
	}

	if modelPath := os.Getenv("MODEL_PATH"); modelPath != "" {
		config.ModelPath = modelPath
	}

	// Create and initialize service
	service := NewLegalTensorRTService(config)

	if err := service.Initialize(); err != nil {
		log.Fatalf("Failed to initialize service: %v", err)
	}

	// Graceful shutdown
	defer service.Shutdown()

	// Start HTTP server
	if err := service.StartServer(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}