package main

import (
	"bufio"
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type GenerateRequest struct {
	Model    string                 `json:"model"`
	Prompt   string                 `json:"prompt"`
	Stream   bool                   `json:"stream,omitempty"`
	Options  map[string]interface{} `json:"options,omitempty"`
	Backend  string                 `json:"backend,omitempty"`  // optional explicit backend: trt | ollama | auto
}

type GenerateResponse struct {
	Model    string `json:"model"`
	Response string `json:"response"`
	Done     bool   `json:"done"`
}

type ModelRoute struct {
	UseTensorRT bool
	OllamaModel string
	TensorRTModel string
	TensorRTPort int
	MemoryOptimized bool
}

var modelRoutes = map[string]ModelRoute{
	"gemma3-legal:latest": {
		UseTensorRT: true,
		OllamaModel: "gemma3-legal:latest",
		TensorRTModel: "gemma3-legal:latest",
		TensorRTPort: 8090,
		MemoryOptimized: true,
	},
	"gemma3:270m": {
		UseTensorRT: true,
		OllamaModel: "gemma3:270m",
		TensorRTModel: "gemma3:270m",
		TensorRTPort: 8091,
		MemoryOptimized: true,
	},
	"embeddinggemma:latest": {
		UseTensorRT: false,
		OllamaModel: "embeddinggemma:latest",
		TensorRTModel: "",
		TensorRTPort: 0,
		MemoryOptimized: false,
	},
}

// Metrics captures runtime statistics for observability.
type Metrics struct {
	sync.Mutex
	TotalRequests        int64 `json:"total_requests"`
	TensorRTRequests     int64 `json:"tensorrt_requests"`
	OllamaRequests       int64 `json:"ollama_requests"`
	FallbacksToOllama    int64 `json:"fallbacks_to_ollama"`
	StreamingRequests    int64 `json:"streaming_requests"`
	AvgLatencyMs         float64 `json:"avg_latency_ms"`
	cumulativeLatencyMs  float64
	LastUpdated          time.Time `json:"last_updated"`
	StartTime            time.Time `json:"start_time"`
	LastError            string `json:"last_error,omitempty"`
}

var metrics = &Metrics{StartTime: time.Now(), LastUpdated: time.Now()}

func (m *Metrics) record(start time.Time, backend string, streaming bool, fallback bool, err error) {
	elapsed := float64(time.Since(start).Milliseconds())
	m.Lock()
	defer m.Unlock()
	m.TotalRequests++
	if backend == "tensorrt" { m.TensorRTRequests++ } else if backend == "ollama" { m.OllamaRequests++ }
	if fallback { m.FallbacksToOllama++ }
	if streaming { m.StreamingRequests++ }
	m.cumulativeLatencyMs += elapsed
	m.AvgLatencyMs = m.cumulativeLatencyMs / float64(m.TotalRequests)
	m.LastUpdated = time.Now()
	if err != nil { m.LastError = err.Error() }
}

func metricsHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	metrics.Lock()
	snapshot := struct {
		*Metrics
		UptimeSeconds int64 `json:"uptime_seconds"`
		Version string `json:"version"`
		DefaultBackend string `json:"default_backend"`
	}{Metrics: metrics, UptimeSeconds: int64(time.Since(metrics.StartTime).Seconds()), Version: "bridge-v2", DefaultBackend: defaultBackend()}
	metrics.Unlock()
	json.NewEncoder(w).Encode(snapshot)
}

// defaultBackend returns configured default backend (auto|tensorrt|ollama).
func defaultBackend() string {
	val := os.Getenv("BRIDGE_DEFAULT_BACKEND")
	if val == "" { return "auto" }
	v := strings.ToLower(val)
	switch v {
	case "tensorrt", "ollama", "auto":
		return v
	default:
		return "auto"
	}
}

func main() {
	port := os.Getenv("PORT")
	if port == "" {
		port = "8085"
	}

	http.HandleFunc("/metrics", metricsHandler)
	http.HandleFunc("/engines", enginesHandler)

	http.HandleFunc("/api/generate", handleGenerate)
	http.HandleFunc("/api/tags", handleTags)
	http.HandleFunc("/health", handleHealth)

	log.Printf("TensorRT Bridge starting on port %s", port)
	log.Printf("Routing: TensorRT on :8084, Ollama on :11434")
	log.Fatal(http.ListenAndServe(":"+port, nil))
}

func handleGenerate(w http.ResponseWriter, r *http.Request) {
	// CORS headers for browser compatibility
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	if r.Method != "POST" {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req GenerateRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	start := time.Now()

	// Backend override precedence: request.Backend -> Header -> Query -> env default -> auto
	backendOverride := req.Backend
	if backendOverride == "" {
		if h := r.Header.Get("X-Inference-Backend"); h != "" { backendOverride = h }
	}
	if backendOverride == "" {
		if q := r.URL.Query().Get("backend"); q != "" { backendOverride = q }
	}
	if backendOverride == "" { backendOverride = defaultBackend() }
	backendOverride = strings.ToLower(backendOverride)

	// Intelligent routing based on prompt characteristics unless explicit override forces backend
	route := intelligentRouting(req)

	useTRT := route.UseTensorRT
	forced := false
	switch backendOverride {
	case "tensorrt", "trt":
		useTRT = true; forced = true
	case "ollama":
		useTRT = false; forced = true
	case "auto":
		// keep intelligent decision
	default:
		// unknown -> auto
	}

	if forced {
		log.Printf("Backend override=%s model=%s", backendOverride, req.Model)
	}

	// Streaming detection
	streaming := req.Stream

	if useTRT {
		log.Printf("Routing %s to TensorRT-LLM (port %d, mem-opt:%v, stream:%v)", req.Model, route.TensorRTPort, route.MemoryOptimized, streaming)
		err := proxyToTensorRT(w, r, req, route, streaming)
		metrics.record(start, "tensorrt", streaming, err != nil, err)
		if err != nil {
			// Already fell back inside proxy; metrics recorded fallback flag.
			return
		}
	} else {
		log.Printf("Routing %s to Ollama (stream:%v)", req.Model, streaming)
		err := proxyToOllama(w, r, req, route.OllamaModel, streaming)
		metrics.record(start, "ollama", streaming, false, err)
		if err != nil {
			http.Error(w, fmt.Sprintf("Ollama error: %v", err), http.StatusBadGateway)
		}
	}
}

// intelligentRouting determines optimal model based on prompt characteristics
func intelligentRouting(req GenerateRequest) ModelRoute {
	prompt := req.Prompt
	tokenCount := len(strings.Fields(prompt))

	// Check for explicit model requests first
	route, exists := modelRoutes[req.Model]
	if exists {
		return route
	}

	// Intelligent routing logic for gemma3-legal vs gemma3:270m
	isComplexLegal := strings.Contains(strings.ToLower(prompt), "contract") ||
		strings.Contains(strings.ToLower(prompt), "legal analysis") ||
		strings.Contains(strings.ToLower(prompt), "jurisdiction") ||
		strings.Contains(strings.ToLower(prompt), "precedent") ||
		strings.Contains(strings.ToLower(prompt), "litigation") ||
		tokenCount >= 2048

	isQuickQuery := strings.Contains(strings.ToLower(prompt), "summary") ||
		strings.Contains(strings.ToLower(prompt), "classify") ||
		strings.Contains(strings.ToLower(prompt), "extract") ||
		tokenCount < 500

	if isComplexLegal {
		// Use large model for complex legal reasoning
		return modelRoutes["gemma3-legal:latest"]
	} else if isQuickQuery {
		// Use small model for quick tasks
		return modelRoutes["gemma3:270m"]
	}

	// Default to medium complexity = large model
	return modelRoutes["gemma3-legal:latest"]
}

func proxyToTensorRT(w http.ResponseWriter, r *http.Request, req GenerateRequest, route ModelRoute, streaming bool) error {
	req.Model = route.TensorRTModel

	jsonData, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "Error marshaling request", http.StatusInternalServerError)
		return err
	}

	tensorrtUrl := fmt.Sprintf("http://127.0.0.1:%d/api/generate", route.TensorRTPort)

	client := &http.Client{Timeout: 0}
	httpReq, err := http.NewRequest(http.MethodPost, tensorrtUrl, bytes.NewBuffer(jsonData))
	if err != nil { http.Error(w, "Upstream request create failed", http.StatusBadGateway); return err }
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		log.Printf("TensorRT-LLM unavailable, falling back to Ollama: %v", err)
		fallbackErr := proxyToOllama(w, r, req, req.Model, streaming)
		if fallbackErr != nil { return fallbackErr }
		return err
	}
	defer resp.Body.Close()

	// Streaming pass-through
	if streaming && strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "stream") {
		flusher, _ := w.(http.Flusher)
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.WriteHeader(resp.StatusCode)
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Bytes()
			w.Write(line)
			w.Write([]byte("\n"))
			if flusher != nil { flusher.Flush() }
		}
		return nil
	}

	// Non-streaming copy
	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
	return nil
}

func proxyToOllama(w http.ResponseWriter, r *http.Request, req GenerateRequest, model string, streaming bool) error {
	req.Model = model

	jsonData, err := json.Marshal(req)
	if err != nil {
		http.Error(w, "Error marshaling request", http.StatusInternalServerError)
		return err
	}

	client := &http.Client{Timeout: 0}
	httpReq, err := http.NewRequest(http.MethodPost, "http://127.0.0.1:11434/api/generate", bytes.NewBuffer(jsonData))
	if err != nil { http.Error(w, "Upstream request create failed", http.StatusBadGateway); return err }
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(httpReq)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if streaming && strings.Contains(strings.ToLower(resp.Header.Get("Content-Type")), "stream") {
		flusher, _ := w.(http.Flusher)
		w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
		w.WriteHeader(resp.StatusCode)
		scanner := bufio.NewScanner(resp.Body)
		for scanner.Scan() {
			line := scanner.Bytes()
			w.Write(line)
			w.Write([]byte("\n"))
			if flusher != nil { flusher.Flush() }
		}
		return nil
	}

	w.Header().Set("Content-Type", resp.Header.Get("Content-Type"))
	w.WriteHeader(resp.StatusCode)
	io.Copy(w, resp.Body)
	return nil
}

func handleTags(w http.ResponseWriter, r *http.Request) {
	// CORS headers for browser compatibility
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Combine models from both services
	// Build model tag list dynamically from route table
	models := []map[string]interface{}{}
	for key, rt := range modelRoutes {
		size := 0
		if rt.MemoryOptimized { size = 7300000000 }
		models = append(models, map[string]interface{}{
			"name": key,
			"model": key,
			"size": size,
			"digest": "sha256:tensorrt-bridge",
			"details": map[string]interface{}{
				"format": func() string { if rt.UseTensorRT { return "tensorrt-enhanced" }; return "ollama" }(),
				"family": "gemma3",
				"parameter_size": "9B",
			},
		})
	}
	response := map[string]interface{}{"models": models, "default_backend": defaultBackend()}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func handleHealth(w http.ResponseWriter, r *http.Request) {
	// CORS headers for browser compatibility
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
	w.Header().Set("Access-Control-Allow-Headers", "Content-Type")

	if r.Method == "OPTIONS" {
		w.WriteHeader(http.StatusOK)
		return
	}

	// Check both services
	// Allow override of TensorRT health port via env
	trtPort := 8084
	if v := os.Getenv("TENSORRT_HEALTH_PORT"); v != "" { if p, err := strconv.Atoi(v); err == nil { trtPort = p } }
	tensorrtStatus := checkService(fmt.Sprintf("http://127.0.0.1:%d/health", trtPort))
	ollamaStatus := checkService("http://127.0.0.1:11434/")

	status := map[string]interface{}{
		"service": "tensorrt-bridge",
		"status": "healthy",
		"timestamp": time.Now().Format(time.RFC3339),
		"backends": map[string]bool{
			"tensorrt": tensorrtStatus,
			"ollama": ollamaStatus,
		},
        "engines": detectEngines(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

// detectEngines scans common directories/env vars for built TensorRT engines.
func detectEngines() []map[string]string {
	// Candidate directories (add more as needed)
	candidates := []string{}
	if v := os.Getenv("TRT_ENGINE_DIR"); v != "" { candidates = append(candidates, v) }
	// Conventional relative paths
	for _, p := range []string{"./engines", "./tensorrt-llm-gemma3-conversion/engines", "./trt_engines"} { candidates = append(candidates, p) }

	engines := []map[string]string{}
	seen := map[string]struct{}{}
	for _, dir := range candidates {
		info, err := os.Stat(dir)
		if err != nil || !info.IsDir() { continue }
		entries, err := os.ReadDir(dir)
		if err != nil { continue }
		for _, e := range entries {
			if e.IsDir() { continue }
			name := e.Name()
			if !strings.HasSuffix(strings.ToLower(name), ".plan") { continue }
			full := dir + "/" + name
			if _, dup := seen[full]; dup { continue }
			seen[full] = struct{}{}
			engines = append(engines, map[string]string{
				"path": full,
				"name": name,
				"source_dir": dir,
			})
		}
	}
	return engines
}

// enginesHandler exposes detected engines and simple health probing against TensorRT HTTP API when available.
func enginesHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Content-Type", "application/json")
	if r.Method == http.MethodOptions { w.WriteHeader(http.StatusOK); return }

	engines := detectEngines()
	probe := r.URL.Query().Get("probe") == "1"
	var trtHealth any = nil
	if probe {
		// Attempt a lightweight /health on tensorrt serve port(s)
		ports := []int{8084, 8090, 8091}
		results := map[string]bool{}
		for _, p := range ports {
			url := fmt.Sprintf("http://127.0.0.1:%d/health", p)
			results[fmt.Sprintf("%d", p)] = checkService(url)
		}
		trtHealth = results
	}
	json.NewEncoder(w).Encode(map[string]any{
		"engines": engines,
		"count": len(engines),
		"probed": trtHealth,
		"default_backend": defaultBackend(),
	})
}

func checkService(url string) bool {
	client := &http.Client{Timeout: 2 * time.Second}
	resp, err := client.Get(url)
	if err != nil {
		return false
	}
	defer resp.Body.Close()
	return resp.StatusCode == 200
}
