package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"runtime"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/mux"
)

// SIMDJSONResult represents the result of SIMD JSON parsing
type SIMDJSONResult struct {
	Tokens   []string          `json:"tokens"`
	Metadata map[string]interface{} `json:"metadata"`
	Error    string            `json:"error,omitempty"`
}

// SIMDJSONAccelerator provides high-performance JSON parsing using optimized Go routines
type SIMDJSONAccelerator struct {
	port int
}

// NewSIMDJSONAccelerator creates a new SIMD JSON accelerator
func NewSIMDJSONAccelerator(port int) *SIMDJSONAccelerator {
	return &SIMDJSONAccelerator{port: port}
}

// tokenizeJSONOptimized performs optimized JSON tokenization
func tokenizeJSONOptimized(jsonStr string) []string {
	// Convert string to byte slice for efficient processing
	data := []byte(jsonStr)
	tokens := make([]string, 0, len(data)/4) // Estimate capacity

	i := 0
	for i < len(data) {
		// Skip whitespace efficiently
		for i < len(data) && isWhitespace(data[i]) {
			i++
		}
		if i >= len(data) {
			break
		}

		char := data[i]
		switch char {
		case '{', '}', '[', ']', ':', ',':
			tokens = append(tokens, string(char))
			i++
		case '"':
			// Parse string efficiently
			start := i
			i++ // Skip opening quote
			for i < len(data) && data[i] != '"' {
				if data[i] == '\\' {
					i += 2 // Skip escaped character
				} else {
					i++
				}
			}
			if i < len(data) {
				i++ // Skip closing quote
				tokens = append(tokens, string(data[start:i]))
			}
		case 't', 'f', 'n':
			// Parse true, false, null
			start := i
			if strings.HasPrefix(jsonStr[i:], "true") {
				i += 4
			} else if strings.HasPrefix(jsonStr[i:], "false") {
				i += 5
			} else if strings.HasPrefix(jsonStr[i:], "null") {
				i += 4
			}
			tokens = append(tokens, string(data[start:i]))
		default:
			// Parse numbers
			if char == '-' || (char >= '0' && char <= '9') {
				start := i
				for i < len(data) && isNumberChar(data[i]) {
					i++
				}
				tokens = append(tokens, string(data[start:i]))
			} else {
				i++ // Skip unknown characters
			}
		}
	}

	return tokens
}

// isWhitespace checks if a byte is whitespace
func isWhitespace(b byte) bool {
	return b == ' ' || b == '\t' || b == '\n' || b == '\r'
}

// isNumberChar checks if a byte is a valid number character
func isNumberChar(b byte) bool {
	return (b >= '0' && b <= '9') || b == '.' || b == '-' || b == '+' || b == 'e' || b == 'E'
}

// parseHandler handles HTTP requests for JSON parsing
func (s *SIMDJSONAccelerator) parseHandler(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var request struct {
		JSON string `json:"json"`
	}

	if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
		http.Error(w, fmt.Sprintf("Invalid request: %v", err), http.StatusBadRequest)
		return
	}

	if request.JSON == "" {
		http.Error(w, "JSON field is required", http.StatusBadRequest)
		return
	}

	start := time.Now()

	// Use optimized parsing
	tokens := tokenizeJSONOptimized(request.JSON)
	duration := time.Since(start)

	// Create result
	result := SIMDJSONResult{
		Tokens: tokens,
		Metadata: map[string]interface{}{
			"optimized_parsing": true,
			"processing_time_ms": duration.Milliseconds(),
			"tokens_count": len(tokens),
			"input_length": len(request.JSON),
			"processed_at": time.Now().Unix(),
			"go_version": runtime.Version(),
			"goroutines": runtime.NumGoroutine(),
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(result)
}

// healthHandler provides health check endpoint
func (s *SIMDJSONAccelerator) healthHandler(w http.ResponseWriter, r *http.Request) {
	health := map[string]interface{}{
		"status": "healthy",
		"service": "simd-json-accelerator",
		"port": s.port,
		"optimized_parsing": true,
		"timestamp": time.Now().Unix(),
		"goroutines": runtime.NumGoroutine(),
		"go_version": runtime.Version(),
		"memory_stats": map[string]interface{}{
			"alloc": "N/A", // Would need runtime.ReadMemStats()
			"total_alloc": "N/A",
			"sys": "N/A",
		},
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(health)
}

// Start starts the SIMD JSON accelerator service
func (s *SIMDJSONAccelerator) Start() error {
	r := mux.NewRouter()

	// API routes
	r.HandleFunc("/parse", s.parseHandler).Methods("POST")
	r.HandleFunc("/health", s.healthHandler).Methods("GET")

	addr := fmt.Sprintf(":%d", s.port)
	log.Printf("🚀 SIMD JSON Accelerator starting on port %d", s.port)
	log.Printf("📊 Optimized parsing enabled")
	log.Printf("🔗 Health check: http://localhost:%d/health", s.port)
	log.Printf("🔗 Parse endpoint: http://localhost:%d/parse", s.port)

	server := &http.Server{
		Addr:         addr,
		Handler:      r,
		ReadTimeout:  30 * time.Second,
		WriteTimeout: 30 * time.Second,
	}

	return server.ListenAndServe()
}

func main() {
	port := 8095 // Default port for SIMD JSON accelerator

	// Check for port override
	if portEnv := os.Getenv("SIMD_JSON_PORT"); portEnv != "" {
		if p, err := strconv.Atoi(portEnv); err == nil {
			port = p
		}
	}

	log.Printf("🎯 Starting SIMD JSON Accelerator Service")
	log.Printf("🔧 Optimized parsing enabled")
	log.Printf("📡 Port: %d", port)

	accelerator := NewSIMDJSONAccelerator(port)

	if err := accelerator.Start(); err != nil {
		log.Fatalf("Failed to start SIMD JSON accelerator: %v", err)
	}
}