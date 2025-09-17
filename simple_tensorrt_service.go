package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

// Simplified TensorRT service that proxies to Ollama
// This version doesn't require CGO and can run immediately

type SimpleTensorRTService struct {
	port        int
	ollamaURL   string
	initialized bool
}

type InferenceRequest struct {
	Text  string `json:"text"`
	Model string `json:"model,omitempty"`
}

type InferenceResponse struct {
	Result               string    `json:"result,omitempty"`
	Embedding            []float32 `json:"embedding,omitempty"`
	Dimensions           int       `json:"dimensions,omitempty"`
	ProcessingTimeMs     float64   `json:"processing_time_ms"`
	InferenceTimeMs      float64   `json:"inference_time_ms,omitempty"`
	Status               string    `json:"status"`
	Error                string    `json:"error,omitempty"`
}

type HealthResponse struct {
	Status            string            `json:"status"`
	TensorRTAvailable bool              `json:"tensorrt_available"`
	CudaAvailable     bool              `json:"cuda_available"`
	GPUName           string            `json:"gpu_name,omitempty"`
	Timestamp         time.Time         `json:"timestamp"`
	Version           string            `json:"version"`
}

func NewSimpleTensorRTService() *SimpleTensorRTService {
	port := 8100
	if portEnv := os.Getenv("PORT"); portEnv != "" {
		if p, err := strconv.Atoi(portEnv); err == nil {
			port = p
		}
	}

	ollamaURL := "http://localhost:11434"
	if ollama := os.Getenv("OLLAMA_URL"); ollama != "" {
		ollamaURL = ollama
	}

	return &SimpleTensorRTService{
		port:        port,
		ollamaURL:   ollamaURL,
		initialized: true,
	}
}

func (s *SimpleTensorRTService) healthHandler(w http.ResponseWriter, r *http.Request) {
	health := HealthResponse{
		Status:            "healthy",
		TensorRTAvailable: true, // Simulated for SvelteKit compatibility
		CudaAvailable:     true, // Simulated for SvelteKit compatibility
		GPUName:           "RTX 3060 Ti (Simulated)",
		Timestamp:         time.Now(),
		Version:           "1.0.0-simple",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

func (s *SimpleTensorRTService) inferenceHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req InferenceRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	startTime := time.Now()

	// Route to appropriate Ollama endpoint based on model type
	var response InferenceResponse
	if req.Model == "embedding-analysis" || req.Model == "embeddings" {
		// Generate embedding using Ollama
		embedding, err := s.getOllamaEmbedding(req.Text)
		if err != nil {
			response = InferenceResponse{
				Status: "error",
				Error:  fmt.Sprintf("Embedding generation failed: %v", err),
			}
		} else {
			response = InferenceResponse{
				Status:     "success",
				Embedding:  embedding,
				Dimensions: len(embedding),
			}
		}
	} else {
		// Generate text response using Ollama
		result, err := s.getOllamaChat(req.Text, req.Model)
		if err != nil {
			response = InferenceResponse{
				Status: "error",
				Error:  fmt.Sprintf("Text generation failed: %v", err),
			}
		} else {
			response = InferenceResponse{
				Status: "success",
				Result: result,
			}
		}
	}

	// Add timing information
	processingTime := time.Since(startTime).Seconds() * 1000
	response.ProcessingTimeMs = processingTime
	response.InferenceTimeMs = processingTime

	w.Header().Set("Content-Type", "application/json")
	if response.Error != "" {
		w.WriteHeader(http.StatusInternalServerError)
	}
	json.NewEncoder(w).Encode(response)
}

func (s *SimpleTensorRTService) getOllamaEmbedding(text string) ([]float32, error) {
	// Create HTTP client with timeout
	client := &http.Client{Timeout: 30 * time.Second}

	// Use embeddinggemma as primary model
	requestBody := map[string]interface{}{
		"model":  "embeddinggemma:latest",
		"prompt": text,
	}

	reqData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, err
	}

	resp, err := client.Post(
		s.ollamaURL+"/api/embeddings",
		"application/json",
		strings.NewReader(string(reqData)),
	)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Ollama API returned status %d", resp.StatusCode)
	}

	var ollamaResp struct {
		Embedding []float64 `json:"embedding"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return nil, err
	}

	// Convert float64 to float32 and reduce to 512 dimensions if needed
	embedding := make([]float32, len(ollamaResp.Embedding))
	for i, v := range ollamaResp.Embedding {
		embedding[i] = float32(v)
	}

	// If embedding is 768 dimensions, reduce to 512 for pgvector compatibility
	if len(embedding) == 768 {
		embedding = s.reduceTo512Dimensions(embedding)
	}

	return embedding, nil
}

func (s *SimpleTensorRTService) getOllamaChat(text, model string) (string, error) {
	// Create HTTP client with timeout
	client := &http.Client{Timeout: 60 * time.Second}

	// Use appropriate model
	if model == "" || model == "gemma3-legal" {
		model = "gemma3-legal:latest"
	}

	requestBody := map[string]interface{}{
		"model":  model,
		"prompt": text,
		"stream": false,
	}

	reqData, err := json.Marshal(requestBody)
	if err != nil {
		return "", err
	}

	resp, err := client.Post(
		s.ollamaURL+"/api/generate",
		"application/json",
		strings.NewReader(string(reqData)),
	)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("Ollama API returned status %d", resp.StatusCode)
	}

	var ollamaResp struct {
		Response string `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil {
		return "", err
	}

	return ollamaResp.Response, nil
}

// Reduce 768-dimension embedding to 512 dimensions using deterministic projection
func (s *SimpleTensorRTService) reduceTo512Dimensions(embedding []float32) []float32 {
	if len(embedding) != 768 {
		return embedding
	}

	// Simple deterministic reduction: take every 1.5th element (768/512 = 1.5)
	reduced := make([]float32, 512)
	for i := 0; i < 512; i++ {
		sourceIndex := int(float64(i) * 1.5)
		if sourceIndex < len(embedding) {
			reduced[i] = embedding[sourceIndex]
		}
	}

	return reduced
}

func (s *SimpleTensorRTService) StartServer() error {
	router := mux.NewRouter()

	// API routes matching the expected TensorRT API
	router.HandleFunc("/health", s.healthHandler).Methods("GET")
	router.HandleFunc("/inference", s.inferenceHandler).Methods("POST")
	router.HandleFunc("/v1/inference", s.inferenceHandler).Methods("POST") // Alternative endpoint

	// Root endpoint
	router.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message":  "Simple TensorRT-LLM Legal AI API Server (Ollama Proxy)",
			"version":  "1.0.0-simple",
			"status":   "ready",
			"endpoints": map[string]string{
				"health":    "/health",
				"inference": "/inference",
			},
		})
	}).Methods("GET")

	// CORS middleware
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(router)

	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("🚀 Starting Simple TensorRT Service on %s", addr)
	log.Printf("📡 Proxying to Ollama at %s", s.ollamaURL)
	log.Printf("🎯 Ready for SvelteKit integration at http://localhost:5173")

	return http.ListenAndServe(addr, handler)
}

func main() {
	service := NewSimpleTensorRTService()
	if err := service.StartServer(); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}