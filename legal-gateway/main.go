package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/go-redis/redis/v8"
	"github.com/gorilla/mux"
	"github.com/rs/cors"
)

var (
	rdb *redis.Client
	ctx = context.Background()
)

// IngestJob represents a document processing job
type IngestJob struct {
	ID        string          `json:"id"`
	CaseID    int             `json:"case_id"`
	Sender    string          `json:"sender"`
	Payload   json.RawMessage `json:"payload"`
	Created   time.Time       `json:"created"`
	Source    string          `json:"source"`
	ChunkSize int             `json:"chunk_size,omitempty"`
}

// SSEEvent represents a server-sent event
type SSEEvent struct {
	Event string      `json:"event"`
	Data  interface{} `json:"data"`
	ID    string      `json:"id,omitempty"`
}

// HealthStatus represents the API health status
type HealthStatus struct {
	Status    string            `json:"status"`
	Timestamp time.Time         `json:"timestamp"`
	Services  map[string]string `json:"services"`
	Version   string            `json:"version"`
}

func main() {
	// Initialize Redis client
	redisURL := getEnv("REDIS_URL", "redis://127.0.0.1:6379/0")
	opt, err := redis.ParseURL(redisURL)
	if err != nil {
		log.Fatal("Failed to parse Redis URL:", err)
	}
	rdb = redis.NewClient(opt)

	// Test Redis connection
	_, err = rdb.Ping(ctx).Result()
	if err != nil {
		log.Fatal("Failed to connect to Redis:", err)
	}
	log.Println("✅ Connected to Redis")

	// Setup router
	r := mux.NewRouter()

	// API routes
	api := r.PathPrefix("/api").Subrouter()
	api.HandleFunc("/health", healthHandler).Methods("GET")
	api.HandleFunc("/doc/ingest", ingestHandler).Methods("POST")
	api.HandleFunc("/events/subscribe", sseHandler).Methods("GET")
	api.HandleFunc("/status/{jobId}", statusHandler).Methods("GET")

	// CORS setup for SvelteKit integration
	c := cors.New(cors.Options{
		AllowedOrigins:   []string{"http://localhost:5173", "http://localhost:5174", "http://localhost:3000"},
		AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"*"},
		AllowCredentials: true,
	})

	// Start server
	port := getEnv("PORT", "8080")
	handler := c.Handler(r)
	
	log.Printf("🚀 Legal Gateway API server starting on port %s", port)
	log.Printf("📡 Redis connected: %s", redisURL)
	log.Printf("🔗 SSE endpoint: /api/events/subscribe")
	log.Printf("📥 Ingest endpoint: /api/doc/ingest")
	
	if err := http.ListenAndServe(":"+port, handler); err != nil {
		log.Fatal("Server failed to start:", err)
	}
}

// Health check endpoint
func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	// Check Redis connection
	redisStatus := "healthy"
	_, err := rdb.Ping(ctx).Result()
	if err != nil {
		redisStatus = "unhealthy: " + err.Error()
	}

	health := HealthStatus{
		Status:    "healthy",
		Timestamp: time.Now().UTC(),
		Version:   "1.0.0",
		Services: map[string]string{
			"redis":    redisStatus,
			"api":      "healthy",
			"pipeline": "ready",
		},
	}

	json.NewEncoder(w).Encode(health)
}

// Document ingestion endpoint
func ingestHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")

	// Parse request body
	var payload json.RawMessage
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		http.Error(w, `{"error":"invalid json payload"}`, http.StatusBadRequest)
		return
	}

	// Extract case ID from query params or headers
	caseIDStr := r.URL.Query().Get("case_id")
	caseID := 1 // default
	if caseIDStr != "" {
		if id, err := strconv.Atoi(caseIDStr); err == nil {
			caseID = id
		}
	}

	// Create job
	job := IngestJob{
		ID:      fmt.Sprintf("job-%d-%d", time.Now().UnixNano(), caseID),
		CaseID:  caseID,
		Sender:  getClientID(r),
		Payload: payload,
		Created: time.Now().UTC(),
		Source:  "wasm-parser",
	}

	// Serialize and enqueue job
	jobBytes, err := json.Marshal(job)
	if err != nil {
		http.Error(w, `{"error":"failed to serialize job"}`, http.StatusInternalServerError)
		return
	}

	// Push to Redis list for worker processing
	if err := rdb.RPush(ctx, "ingest:jobs", jobBytes).Err(); err != nil {
		log.Printf("❌ Redis enqueue error: %v", err)
		http.Error(w, `{"error":"queue error"}`, http.StatusInternalServerError)
		return
	}

	// Publish job created event
	publishEvent("job_created", map[string]interface{}{
		"job_id":    job.ID,
		"case_id":   job.CaseID,
		"timestamp": job.Created,
		"status":    "queued",
	})

	// Return job info
	w.WriteHeader(http.StatusAccepted)
	response := map[string]interface{}{
		"job_id":    job.ID,
		"case_id":   job.CaseID,
		"status":    "queued",
		"timestamp": job.Created,
		"message":   "Document queued for processing",
	}
	
	json.NewEncoder(w).Encode(response)
	log.Printf("📥 Job queued: %s (case %d)", job.ID, job.CaseID)
}

// Server-Sent Events endpoint for real-time updates
func sseHandler(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")
	w.Header().Set("Access-Control-Allow-Headers", "Cache-Control")

	// Check if client supports streaming
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming unsupported", http.StatusInternalServerError)
		return
	}

	// Subscribe to Redis Pub/Sub
	pubsub := rdb.Subscribe(ctx, "events:ingest", "events:processing", "events:completed")
	defer pubsub.Close()

	ch := pubsub.Channel()

	// Client disconnect detection
	clientGone := r.Context().Done()
	
	// Send initial connection event
	fmt.Fprintf(w, "event: connected\n")
	fmt.Fprintf(w, "data: {\"message\":\"SSE connection established\",\"timestamp\":\"%s\"}\n\n", time.Now().Format(time.RFC3339))
	flusher.Flush()

	log.Printf("🔗 SSE client connected: %s", r.RemoteAddr)

	// Event loop
	for {
		select {
		case msg := <-ch:
			// Forward Redis messages as SSE events
			fmt.Fprintf(w, "event: %s\n", msg.Channel)
			fmt.Fprintf(w, "data: %s\n\n", msg.Payload)
			flusher.Flush()
			
		case <-clientGone:
			log.Printf("🔌 SSE client disconnected: %s", r.RemoteAddr)
			return
			
		case <-time.After(30 * time.Second):
			// Send keepalive ping
			fmt.Fprintf(w, "event: ping\n")
			fmt.Fprintf(w, "data: {\"timestamp\":\"%s\"}\n\n", time.Now().Format(time.RFC3339))
			flusher.Flush()
		}
	}
}

// Job status endpoint
func statusHandler(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	
	vars := mux.Vars(r)
	jobID := vars["jobId"]
	
	if jobID == "" {
		http.Error(w, `{"error":"job_id required"}`, http.StatusBadRequest)
		return
	}
	
	// Check job status in Redis
	statusKey := "job:status:" + jobID
	status, err := rdb.Get(ctx, statusKey).Result()
	if err == redis.Nil {
		http.Error(w, `{"error":"job not found"}`, http.StatusNotFound)
		return
	} else if err != nil {
		http.Error(w, `{"error":"status check failed"}`, http.StatusInternalServerError)
		return
	}
	
	// Try to parse as JSON, fallback to simple status
	var statusData interface{}
	if err := json.Unmarshal([]byte(status), &statusData); err != nil {
		statusData = map[string]interface{}{
			"job_id": jobID,
			"status": status,
		}
	}
	
	json.NewEncoder(w).Encode(statusData)
}

// Utility functions

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getClientID(r *http.Request) string {
	// Try to get client ID from header or generate from IP
	if clientID := r.Header.Get("X-Client-ID"); clientID != "" {
		return clientID
	}
	return fmt.Sprintf("client-%s", r.RemoteAddr)
}

func publishEvent(eventType string, data interface{}) {
	event := SSEEvent{
		Event: eventType,
		Data:  data,
		ID:    fmt.Sprintf("%d", time.Now().UnixNano()),
	}
	
	eventBytes, _ := json.Marshal(event)
	rdb.Publish(ctx, "events:ingest", eventBytes)
}