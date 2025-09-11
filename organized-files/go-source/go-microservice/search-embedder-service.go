// Search Embedder Service - High-Performance Embedding Generation for Neo4j Tricubic Search
// Integrates with Ollama nomic-embed-text model for 384-dimensional legal document embeddings
// Provides batch processing and real-time embedding generation with Redis caching

package main

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"math"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/redis/go-redis/v9"
)

// Ollama API configuration
type OllamaConfig struct {
	BaseURL    string `json:"base_url"`
	Model      string `json:"model"`
	Dimensions int    `json:"dimensions"`
	Timeout    int    `json:"timeout_seconds"`
}

// Embedding request for legal documents
type EmbeddingRequest struct {
	Text         string                 `json:"text"`
	DocumentID   string                 `json:"document_id,omitempty"`
	DocumentType string                 `json:"document_type,omitempty"`
	PracticeArea string                 `json:"practice_area,omitempty"`
	Metadata     map[string]interface{} `json:"metadata,omitempty"`
	CacheKey     string                 `json:"cache_key,omitempty"`
}

// Batch embedding request
type BatchEmbeddingRequest struct {
	Documents []EmbeddingRequest `json:"documents"`
	BatchSize int                `json:"batch_size,omitempty"`
	Parallel  bool               `json:"parallel,omitempty"`
}

// Embedding response
type EmbeddingResponse struct {
	DocumentID  string     `json:"document_id,omitempty"`
	Embedding   []float32  `json:"embedding"`
	Dimensions  int        `json:"dimensions"`
	Model       string     `json:"model"`
	ProcessTime float64    `json:"process_time_ms"`
	FromCache   bool       `json:"from_cache"`
	SpatialPos  [3]float64 `json:"spatial_position"` // For Neo4j spatial indexing
}

// Batch embedding response
type BatchEmbeddingResponse struct {
	Results     []EmbeddingResponse `json:"results"`
	TotalTime   float64             `json:"total_time_ms"`
	BatchSize   int                 `json:"batch_size"`
	CacheHits   int                 `json:"cache_hits"`
	CacheMisses int                 `json:"cache_misses"`
}

// Ollama API request format
type OllamaEmbedRequest struct {
	Model  string `json:"model"`
	Prompt string `json:"prompt"`
	Stream bool   `json:"stream"`
}

// Ollama API response format
type OllamaEmbedResponse struct {
	Embedding []float64 `json:"embedding"`
	Model     string    `json:"model"`
}

// Search Embedder Service
type SearchEmbedderService struct {
	config      OllamaConfig
	redisClient *redis.Client
	httpClient  *http.Client
	cache       map[string][]float32 // In-memory cache for hot embeddings
	cacheMutex  sync.RWMutex

	// Performance metrics
	totalRequests       int64
	totalCacheHits      int64 // aggregate
	totalCacheHitsMem   int64
	totalCacheHitsRedis int64
	totalCacheMisses    int64
	timeoutErrors       int64
	mutex               sync.Mutex

	// Redis health
	redisLastError     string
	redisLastCheck     time.Time
	redisLastLatencyMs float64
	redisConnected     bool
	redisMode          string

	// Extended metrics / lifecycle
	startTime          time.Time
	totalProcessTimeMs float64

	// LRU cache controls
	cacheMax       int
	cacheEvictions int64
	lruIndex       map[string]*lruNode
	lruHead        *lruNode
	lruTail        *lruNode

	// Per-request Ollama timeout
	ollamaReqTimeout time.Duration
}

// Initialize Search Embedder Service
func NewSearchEmbedderService(config OllamaConfig, redisClient *redis.Client) *SearchEmbedderService {
	return &SearchEmbedderService{
		config:      config,
		redisClient: redisClient,
		httpClient: &http.Client{
			Timeout: time.Duration(config.Timeout) * time.Second,
		},
		cache:     make(map[string][]float32),
		lruIndex:  make(map[string]*lruNode),
		startTime: time.Now(),
		}
	}
// Generate embedding for single document
func (s *SearchEmbedderService) GenerateEmbedding(req EmbeddingRequest) (*EmbeddingResponse, error) {
	startTime := time.Now()

	// Check cache first
	cacheKey := s.generateCacheKey(req)
	if embedding, found := s.getFromCache(cacheKey); found {
		return &EmbeddingResponse{
			DocumentID:  req.DocumentID,
			Embedding:   embedding,
			Dimensions:  len(embedding),
			Model:       s.config.Model,
			ProcessTime: float64(time.Since(startTime).Nanoseconds()) / 1e6,
			FromCache:   true,
			SpatialPos:  s.embeddingToSpatial(embedding),
		}, nil
	}

	// Generate embedding via Ollama
	embedding, err := s.callOllamaEmbedding(req.Text)
	if err != nil {
		return nil, fmt.Errorf("failed to generate embedding: %w", err)
	}

	// Cache the result
	s.cacheEmbedding(cacheKey, embedding)

	s.incrementTotalRequests()
	processTime := float64(time.Since(startTime).Nanoseconds()) / 1e6
	s.addProcessTime(processTime)

	return &EmbeddingResponse{
		DocumentID:  req.DocumentID,
		Embedding:   embedding,
		Dimensions:  len(embedding),
		Model:       s.config.Model,
		ProcessTime: processTime,
		FromCache:   false,
		SpatialPos:  s.embeddingToSpatial(embedding),
	}, nil
}

// Generate embeddings for batch of documents
func (s *SearchEmbedderService) GenerateBatchEmbeddings(req BatchEmbeddingRequest) (*BatchEmbeddingResponse, error) {
	startTime := time.Now()
	batchSize := req.BatchSize
	if batchSize <= 0 {
		batchSize = 10 // Default batch size
	}

	var results []EmbeddingResponse
	var cacheHits, cacheMisses int

	if req.Parallel && len(req.Documents) > 5 {
		// Parallel processing for large batches
		results, cacheHits, cacheMisses = s.processBatchParallel(req.Documents, batchSize)
	} else {
		// Sequential processing for small batches
		results, cacheHits, cacheMisses = s.processBatchSequential(req.Documents)
	}

	totalTime := float64(time.Since(startTime).Nanoseconds()) / 1e6

	return &BatchEmbeddingResponse{
		Results:     results,
		TotalTime:   totalTime,
		BatchSize:   len(req.Documents),
		CacheHits:   cacheHits,
		CacheMisses: cacheMisses,
	}, nil
}

// Process batch in parallel
func (s *SearchEmbedderService) processBatchParallel(documents []EmbeddingRequest, batchSize int) ([]EmbeddingResponse, int, int) {
	var results []EmbeddingResponse
	var resultsMutex sync.Mutex
	var wg sync.WaitGroup
	var cacheHits, cacheMisses int
	var metricsMutex sync.Mutex

	// Process in chunks
	for i := 0; i < len(documents); i += batchSize {
		end := i + batchSize
		if end > len(documents) {
			end = len(documents)
		}

		chunk := documents[i:end]
		wg.Add(1)

		go func(docs []EmbeddingRequest) {
			defer wg.Done()

			for _, doc := range docs {
				embedding, err := s.GenerateEmbedding(doc)
				if err != nil {
					log.Printf("Failed to generate embedding for doc %s: %v", doc.DocumentID, err)
					continue
				}

				resultsMutex.Lock()
				results = append(results, *embedding)
				resultsMutex.Unlock()

				metricsMutex.Lock()
				if embedding.FromCache {
					cacheHits++
				} else {
					cacheMisses++
				}
				metricsMutex.Unlock()
			}
		}(chunk)
	}

	wg.Wait()
	return results, cacheHits, cacheMisses
}

// Process batch sequentially
func (s *SearchEmbedderService) processBatchSequential(documents []EmbeddingRequest) ([]EmbeddingResponse, int, int) {
	var results []EmbeddingResponse
	var cacheHits, cacheMisses int

	for _, doc := range documents {
		embedding, err := s.GenerateEmbedding(doc)
		if err != nil {
			log.Printf("Failed to generate embedding for doc %s: %v", doc.DocumentID, err)
			continue
		}

		results = append(results, *embedding)

		if embedding.FromCache {
			cacheHits++
		} else {
			cacheMisses++
		}
	}

	return results, cacheHits, cacheMisses
}

// Call Ollama API for embedding generation
func (s *SearchEmbedderService) callOllamaEmbedding(text string) ([]float32, error) {
	ollamaReq := OllamaEmbedRequest{Model: s.config.Model, Prompt: text, Stream: false}
	jsonData, err := json.Marshal(ollamaReq)
	if err != nil { return nil, err }

	url := s.config.BaseURL + "/api/embeddings"
	var ctx context.Context
	var cancel context.CancelFunc
	if s.ollamaReqTimeout > 0 {
		ctx, cancel = context.WithTimeout(context.Background(), s.ollamaReqTimeout)
	} else {
		ctx, cancel = context.WithCancel(context.Background())
	}
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewBuffer(jsonData))
	if err != nil { return nil, err }
	req.Header.Set("Content-Type", "application/json")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		if ctx.Err() == context.DeadlineExceeded {
			s.mutex.Lock(); s.timeoutErrors++; s.mutex.Unlock()
			return nil, fmt.Errorf("ollama request timeout after %v", s.ollamaReqTimeout)
		}
		return nil, err
	}
	defer resp.Body.Close()
	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("Ollama API error: %s", string(body))
	}
	var ollamaResp OllamaEmbedResponse
	if err := json.NewDecoder(resp.Body).Decode(&ollamaResp); err != nil { return nil, err }
	embedding := make([]float32, len(ollamaResp.Embedding))
	for i, v := range ollamaResp.Embedding { embedding[i] = float32(v) }
	return embedding, nil
}

// Convert embedding to 3D spatial coordinates for Neo4j
func (s *SearchEmbedderService) embeddingToSpatial(embedding []float32) [3]float64 {
	if len(embedding) < 3 {
		return [3]float64{0, 0, 0}
	}

	// Use PCA-like projection to 3D space
	// This is a simplified mapping - in production, use proper dimensionality reduction
	x := float64(embedding[0]) * 100
	y := float64(embedding[1]) * 100
	z := float64(embedding[2]) * 100

	// Apply some spatial transformation for better distribution
	x = math.Sin(x/10) * 50
	y = math.Cos(y/10) * 50
	z = math.Tanh(z/10) * 25

	return [3]float64{x, y, z}
}

// Cache management
func (s *SearchEmbedderService) generateCacheKey(req EmbeddingRequest) string {
	if req.CacheKey != "" {
		return req.CacheKey
	}
	return fmt.Sprintf("embed:%s:%s", s.config.Model, hashText(req.Text))
}

func (s *SearchEmbedderService) getFromCache(key string) ([]float32, bool) {
	// In-memory (LRU touch)
	s.cacheMutex.Lock()
	if embedding, found := s.cache[key]; found {
		s.lruTouch(key)
		s.cacheMutex.Unlock()
		s.incrementCacheHitMemory()
		return embedding, true
	}
	s.cacheMutex.Unlock()

	// Redis fallback
	if s.redisClient != nil {
		ctx := context.Background()
		data, err := s.redisClient.Get(ctx, key).Result()
		if err == nil {
			var embedding []float32
			if err := json.Unmarshal([]byte(data), &embedding); err == nil {
				// Promote to memory + LRU index
				s.cacheMutex.Lock()
				s.cache[key] = embedding
				s.lruAdd(key)
			// Evict if needed
			if s.cacheMax > 0 && len(s.cache) > s.cacheMax {
				for len(s.cache) > s.cacheMax && s.lruTail != nil {
					evict := s.lruTail
					if evict.prev != nil { evict.prev.next = nil }
					s.lruTail = evict.prev
					if s.lruTail == nil { s.lruHead = nil }
					delete(s.cache, evict.key)
					delete(s.lruIndex, evict.key)
					s.mutex.Lock(); s.cacheEvictions++; s.mutex.Unlock()
				}
			}
				s.cacheMutex.Unlock()
				s.incrementCacheHitRedis()
				return embedding, true
			}
		}
	}
	s.incrementCacheMiss()
	return nil, false
}

func (s *SearchEmbedderService) cacheEmbedding(key string, embedding []float32) {
	// Memory + LRU
	s.cacheMutex.Lock()
	s.cache[key] = embedding
	s.lruAdd(key)
	// Evict if over limit
	if s.cacheMax > 0 && len(s.cache) > s.cacheMax {
		for len(s.cache) > s.cacheMax && s.lruTail != nil {
			evict := s.lruTail
			if evict.prev != nil { evict.prev.next = nil }
			s.lruTail = evict.prev
			if s.lruTail == nil { s.lruHead = nil }
			delete(s.cache, evict.key)
			delete(s.lruIndex, evict.key)
			s.mutex.Lock(); s.cacheEvictions++; s.mutex.Unlock()
		}
	}
	s.cacheMutex.Unlock()

	// Redis
	if s.redisClient != nil {
		ctx := context.Background()
		data, err := json.Marshal(embedding)
		if err == nil {
			if err := s.redisClient.Set(ctx, key, data, 24*time.Hour).Err(); err != nil {
				log.Printf("Warning: Failed to cache embedding in Redis: %v", err)
			}
		}
	}
}

// LRU cache management
type lruNode struct {
	key        string
	prev, next *lruNode
}

func (s *SearchEmbedderService) lruAdd(key string) {
	if s.lruIndex == nil {
		return
	}
	if node, ok := s.lruIndex[key]; ok {
		// move to head
		if node != s.lruHead {
			// detach
			if node.prev != nil { node.prev.next = node.next }
			if node.next != nil { node.next.prev = node.prev }
			if s.lruTail == node { s.lruTail = node.prev }
			node.prev = nil
			node.next = s.lruHead
			if s.lruHead != nil { s.lruHead.prev = node }
			s.lruHead = node
			if s.lruTail == nil { s.lruTail = node }
		}
		return
	}
	n := &lruNode{key: key}
	n.next = s.lruHead
	if s.lruHead != nil { s.lruHead.prev = n }
	s.lruHead = n
	if s.lruTail == nil { s.lruTail = n }
	s.lruIndex[key] = n
}

func (s *SearchEmbedderService) lruTouch(key string) {
	if s.lruIndex == nil { return }
	if node, ok := s.lruIndex[key]; ok {
		if node == s.lruHead { return }
		// detach
		if node.prev != nil { node.prev.next = node.next }
		if node.next != nil { node.next.prev = node.prev }
		if s.lruTail == node { s.lruTail = node.prev }
		// move to head
		node.prev = nil
		node.next = s.lruHead
		if s.lruHead != nil { s.lruHead.prev = node }
		s.lruHead = node
		if s.lruTail == nil { s.lruTail = node }
	}
}

// Metrics
func (s *SearchEmbedderService) incrementTotalRequests() {
	s.mutex.Lock()
	s.totalRequests++
	s.mutex.Unlock()
}

func (s *SearchEmbedderService) incrementCacheHitMemory() {
	s.mutex.Lock()
	s.totalCacheHits++
	s.totalCacheHitsMem++
	s.mutex.Unlock()
}

func (s *SearchEmbedderService) incrementCacheHitRedis() {
	s.mutex.Lock()
	s.totalCacheHits++
	s.totalCacheHitsRedis++
	s.mutex.Unlock()
}

func (s *SearchEmbedderService) incrementCacheMiss() {
	s.mutex.Lock()
	s.totalCacheMisses++
	s.mutex.Unlock()
}

func (s *SearchEmbedderService) addProcessTime(ms float64) {
	s.mutex.Lock()
	s.totalProcessTimeMs += ms
	s.mutex.Unlock()
}

func (s *SearchEmbedderService) getMetrics() map[string]interface{} {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	var avgProcessTimeMs float64
	if s.totalRequests > 0 {
		avgProcessTimeMs = s.totalProcessTimeMs / float64(s.totalRequests)
	}
	var cacheHitRatio float64
	if s.totalRequests > 0 { cacheHitRatio = float64(s.totalCacheHits) / float64(s.totalRequests) }
	uptime := time.Since(s.startTime).Seconds()
	redisStatus := map[string]interface{}{
		"connected":       s.redisConnected,
		"last_error":      s.redisLastError,
		"last_check_unix": s.redisLastCheck.Unix(),
		"last_latency_ms": s.redisLastLatencyMs,
		"mode":            s.redisMode,
	}
	return map[string]interface{}{
		"total_requests":        s.totalRequests,
		"cache_hits_total":      s.totalCacheHits,
		"cache_hits_memory":     s.totalCacheHitsMem,
		"cache_hits_redis":      s.totalCacheHitsRedis,
		"cache_misses":          s.totalCacheMisses,
		"cache_hit_ratio":       cacheHitRatio,
		"avg_process_time_ms":   avgProcessTimeMs,
		"total_process_time_ms": s.totalProcessTimeMs,
		"memory_cache_size":     len(s.cache),
		"cache_evictions":       s.cacheEvictions,
		"uptime_seconds":        uptime,
		"redis":                 redisStatus,
		"cache_max":             s.cacheMax,
		"timeout_errors":        s.timeoutErrors,
	}
}

// HTTP API endpoints
func (s *SearchEmbedderService) setupRoutes(router *gin.Engine) {
	api := router.Group("/api/embedder")
	{
		api.POST("/generate", s.handleGenerateEmbedding)
		api.POST("/batch", s.handleBatchEmbedding)
		api.GET("/health", s.handleHealthCheck)
		api.GET("/metrics", s.handleMetrics)
		api.GET("/metrics/prometheus", s.handlePrometheusMetrics)
		api.GET("/selftest", s.handleSelfTest)
		api.DELETE("/cache", s.handleClearCache)
	}
}

func (s *SearchEmbedderService) handleGenerateEmbedding(c *gin.Context) {
	var req EmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := s.GenerateEmbedding(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (s *SearchEmbedderService) handleBatchEmbedding(c *gin.Context) {
	var req BatchEmbeddingRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	result, err := s.GenerateBatchEmbeddings(req)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, result)
}

func (s *SearchEmbedderService) handleHealthCheck(c *gin.Context) {
	deep := false
	if v := strings.ToLower(c.Query("deep")); v == "1" || v == "true" || v == "yes" { deep = true }

	base := gin.H{
		"model":      s.config.Model,
		"dimensions": s.config.Dimensions,
		"timestamp":  time.Now().UTC(),
		"deep":       deep,
	}

	services := gin.H{}
	status := "healthy"

	if !deep {
		// Shallow: use cached redis status only; assume ollama ok if no recent errors
		s.mutex.Lock()
		redisHealthy := s.redisConnected
		redisErr := s.redisLastError
		redisLat := s.redisLastLatencyMs
		mode := s.redisMode
		s.mutex.Unlock()
		if redisHealthy {
			services["redis"] = gin.H{"status": "healthy", "last_latency_ms": redisLat, "mode": mode}
		} else {
			services["redis"] = gin.H{"status": "unhealthy", "error": redisErr, "mode": mode}
			status = "unhealthy"
		}
		services["ollama"] = gin.H{"status": "assumed_healthy"}
		base["mode"] = "shallow"
		base["services"] = services
		base["status"] = status
		if status != "healthy" { c.JSON(http.StatusServiceUnavailable, base); return }
		c.JSON(http.StatusOK, base); return
	}

	// Deep: perform live checks
	base["mode"] = "deep"
	if _, err := s.callOllamaEmbedding("health check"); err != nil {
		services["ollama"] = gin.H{"status": "unhealthy", "error": err.Error()}
		status = "unhealthy"
	} else {
		services["ollama"] = gin.H{"status": "healthy"}
	}
	ctx := context.Background()
	if err := s.redisClient.Ping(ctx).Err(); err != nil {
		services["redis"] = gin.H{"status": "unhealthy", "error": err.Error()}
		status = "unhealthy"
	} else {
		services["redis"] = gin.H{"status": "healthy"}
	}
	base["services"] = services
	base["status"] = status
	if status != "healthy" { c.JSON(http.StatusServiceUnavailable, base); return }
	c.JSON(http.StatusOK, base)
}

func (s *SearchEmbedderService) handleMetrics(c *gin.Context) {
	c.JSON(http.StatusOK, s.getMetrics())
}

// Simple self-test executes a quick embedding (non-cached text) and reports timing & status.
func (s *SearchEmbedderService) handleSelfTest(c *gin.Context) {
	testText := "__selftest__" + time.Now().Format(time.RFC3339Nano)
	start := time.Now()
	emb, err := s.callOllamaEmbedding(testText)
	took := time.Since(start).Milliseconds()
	if err != nil {
		c.JSON(http.StatusServiceUnavailable, gin.H{"status": "fail", "error": err.Error(), "duration_ms": took})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "ok", "duration_ms": took, "dims": len(emb)})
}

// Prometheus text exposition format (basic counters/gauges). No external lib to stay lightweight.
func (s *SearchEmbedderService) handlePrometheusMetrics(c *gin.Context) {
	m := s.getMetrics()
	// Build lines; only expose numeric values.
	var b strings.Builder
	b.WriteString("# HELP embedder_total_requests Total requests processed\n")
	b.WriteString("# TYPE embedder_total_requests counter\n")
	fmt.Fprintf(&b, "embedder_total_requests %d\n", m["total_requests"])
	b.WriteString("# HELP embedder_cache_hits_total Total cache hits (memory+redis)\n")
	b.WriteString("# TYPE embedder_cache_hits_total counter\n")
	fmt.Fprintf(&b, "embedder_cache_hits_total %d\n", m["cache_hits_total"])
	b.WriteString("# HELP embedder_cache_misses_total Total cache misses\n")
	b.WriteString("# TYPE embedder_cache_misses_total counter\n")
	fmt.Fprintf(&b, "embedder_cache_misses_total %d\n", m["cache_misses"])
	b.WriteString("# HELP embedder_cache_evictions_total LRU cache evictions\n")
	b.WriteString("# TYPE embedder_cache_evictions_total counter\n")
	fmt.Fprintf(&b, "embedder_cache_evictions_total %d\n", m["cache_evictions"])
	b.WriteString("# HELP embedder_timeout_errors_total Ollama timeout errors\n")
	b.WriteString("# TYPE embedder_timeout_errors_total counter\n")
	fmt.Fprintf(&b, "embedder_timeout_errors_total %d\n", m["timeout_errors"])
	b.WriteString("# HELP embedder_avg_process_time_ms Average process time per request (ms)\n")
	b.WriteString("# TYPE embedder_avg_process_time_ms gauge\n")
	fmt.Fprintf(&b, "embedder_avg_process_time_ms %v\n", m["avg_process_time_ms"])
	b.WriteString("# HELP embedder_total_process_time_ms Cumulative process time (ms)\n")
	b.WriteString("# TYPE embedder_total_process_time_ms counter\n")
	fmt.Fprintf(&b, "embedder_total_process_time_ms %v\n", m["total_process_time_ms"])
	b.WriteString("# HELP embedder_uptime_seconds Service uptime in seconds\n")
	b.WriteString("# TYPE embedder_uptime_seconds gauge\n")
	fmt.Fprintf(&b, "embedder_uptime_seconds %v\n", m["uptime_seconds"])
	b.WriteString("# HELP embedder_memory_cache_size Current in-memory cache size\n")
	b.WriteString("# TYPE embedder_memory_cache_size gauge\n")
	fmt.Fprintf(&b, "embedder_memory_cache_size %d\n", m["memory_cache_size"])
	b.WriteString("# HELP embedder_cache_max Configured LRU max size (0=unbounded)\n")
	b.WriteString("# TYPE embedder_cache_max gauge\n")
	fmt.Fprintf(&b, "embedder_cache_max %d\n", m["cache_max"])
	c.Header("Content-Type", "text/plain; version=0.0.4")
	c.String(http.StatusOK, b.String())
}

func (s *SearchEmbedderService) handleClearCache(c *gin.Context) {
	// Clear in-memory cache
	s.cacheMutex.Lock()
	memoryKeys := len(s.cache)
	s.cache = make(map[string][]float32)
	s.cacheMutex.Unlock()

	// Clear Redis cache (gracefully handle failures)
	var redisKeys int
	if s.redisClient != nil {
		ctx := context.Background()
		pattern := "embed:*"
		keys, err := s.redisClient.Keys(ctx, pattern).Result()
		if err == nil && len(keys) > 0 {
			if delErr := s.redisClient.Del(ctx, keys...).Err(); delErr == nil {
				redisKeys = len(keys)
			}
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message":           "Cache cleared successfully",
		"memory_keys_deleted": memoryKeys,
		"redis_keys_deleted":  redisKeys,
	})
}

// Utility function for text hashing
func hashText(text string) string {
	// Simple hash for demonstration - use proper hash function in production
	hash := uint32(0)
	for _, r := range text {
		hash = hash*31 + uint32(r)
	}
	return fmt.Sprintf("%x", hash)
}

// Get environment variable with default value
func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intVal, err := strconv.Atoi(value); err == nil {
			return intVal
		}
	}
	return defaultValue
}

func getEnvBool(key string, defaultValue bool) bool {
	if value := os.Getenv(key); value != "" {
		v := strings.ToLower(strings.TrimSpace(value))
		switch v {
		case "1", "true", "yes", "y", "on":
			return true
		case "0", "false", "no", "n", "off":
			return false
		}
	}
	return defaultValue
}

// Main function
func main() {
	// Configuration from environment variables
	config := OllamaConfig{
		BaseURL:    getEnv("OLLAMA_URL", "http://localhost:11434"),
		Model:      getEnv("EMBEDDING_MODEL", "embeddinggemma:latest"),
		Dimensions: getEnvInt("EMBEDDING_DIMENSIONS", 400),
		Timeout:    getEnvInt("OLLAMA_TIMEOUT", 30),
	}

	// Redis client with environment configuration (supports username + optional TLS)
	tlsEnabled := getEnvBool("REDIS_TLS", false)
	var tlsConfig *tls.Config
	if tlsEnabled {
		insecure := getEnvBool("REDIS_TLS_INSECURE", false)
		serverName := getEnv("REDIS_TLS_SERVER_NAME", "")
		tlsConfig = &tls.Config{InsecureSkipVerify: insecure}
		if serverName != "" {
			tlsConfig.ServerName = serverName
		}
	}

	// Timeouts / pooling
	dialTimeoutMs := getEnvInt("REDIS_DIAL_TIMEOUT_MS", 1000)
	readTimeoutMs := getEnvInt("REDIS_READ_TIMEOUT_MS", 1500)
	writeTimeoutMs := getEnvInt("REDIS_WRITE_TIMEOUT_MS", 1500)
	poolSize := getEnvInt("REDIS_POOL_SIZE", 10)
	reconnectIntervalSec := getEnvInt("REDIS_RECONNECT_INTERVAL_SEC", 10)
	pingTimeoutMs := getEnvInt("REDIS_PING_TIMEOUT_MS", 500)

	redisOptions := &redis.Options{
		Addr:         getEnv("REDIS_URL", "localhost:6379"),
		Username:     getEnv("REDIS_USERNAME", ""),
		Password:     getEnv("REDIS_PASSWORD", ""),
		DB:           getEnvInt("REDIS_DB", 1), // Use different DB for embeddings
		TLSConfig:    tlsConfig,
		DialTimeout:  time.Duration(dialTimeoutMs) * time.Millisecond,
		ReadTimeout:  time.Duration(readTimeoutMs) * time.Millisecond,
		WriteTimeout: time.Duration(writeTimeoutMs) * time.Millisecond,
		PoolSize:     poolSize,
	}

	redisClient := redis.NewClient(redisOptions)

	// Additional env configuration for Phase 1 features
	embedCacheMax := getEnvInt("EMBED_CACHE_MAX", 0)
	ollamaReqTimeoutMs := getEnvInt("OLLAMA_REQUEST_TIMEOUT_MS", 0)

// Test Redis connection & initialize service
	ctx := context.Background()
	service := NewSearchEmbedderService(config, redisClient)
	service.cacheMax = embedCacheMax
	if ollamaReqTimeoutMs > 0 {
		service.ollamaReqTimeout = time.Duration(ollamaReqTimeoutMs) * time.Millisecond
	}
	mode := "plaintext"
	if tlsEnabled {
		mode = "TLS"
		if redisOptions.TLSConfig != nil && redisOptions.TLSConfig.InsecureSkipVerify {
			mode += " (insecure)"
		}
	}
	service.redisMode = mode
	startPing := time.Now()
	if err := redisClient.Ping(ctx).Err(); err != nil {
		service.mutex.Lock()
		service.redisConnected = false
		service.redisLastError = err.Error()
		service.redisLastCheck = time.Now()
		service.redisLastLatencyMs = 0
		service.mutex.Unlock()
		log.Printf("⚠️  Warning: Redis connection failed: %v", err)
		if tlsEnabled {
			log.Println("ℹ️  TLS was enabled. Verify certificates / server name / auth.")
		}
		log.Printf("🔄 Background reconnect loop every %ds", reconnectIntervalSec)
	} else {
		lat := time.Since(startPing).Milliseconds()
		service.mutex.Lock()
		service.redisConnected = true
		service.redisLastError = ""
		service.redisLastCheck = time.Now()
		service.redisLastLatencyMs = float64(lat)
		service.mutex.Unlock()
		log.Printf("✅ Redis connection established (%s) latency=%dms", mode, lat)
	}

	go func() {
		ticker := time.NewTicker(time.Duration(reconnectIntervalSec) * time.Second)
		defer ticker.Stop()
		for range ticker.C {
			ctxPing, cancel := context.WithTimeout(context.Background(), time.Duration(pingTimeoutMs)*time.Millisecond)
			start := time.Now()
			err := service.redisClient.Ping(ctxPing).Err()
			latMs := float64(time.Since(start).Milliseconds())
			cancel()
			service.mutex.Lock()
			if err != nil {
				if service.redisConnected { // status changed
					log.Printf("⚠️  Redis disconnected: %v", err)
				}
				service.redisConnected = false
				service.redisLastError = err.Error()
				service.redisLastLatencyMs = 0
			} else {
				if !service.redisConnected {
					log.Printf("✅ Redis reconnected latency=%.0fms", latMs)
				}
				service.redisConnected = true
				service.redisLastError = ""
				service.redisLastLatencyMs = latMs
			}
			service.redisLastCheck = time.Now()
			service.mutex.Unlock()
		}
	}()

	// Set Gin mode based on environment
	if getEnv("GIN_MODE", "debug") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// Setup Gin router
	router := gin.Default()
	router.Use(func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")
		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}
		c.Next()
	})

	service.setupRoutes(router)

	port := getEnv("PORT", "8088")
	log.Printf("🚀 Search Embedder Service starting on :%s", port)
	log.Println("🤖 Using Ollama model:", config.Model)
	log.Println("📐 Embedding dimensions:", config.Dimensions)
	log.Println("🔍 Endpoints:")
	log.Println("   POST /api/embedder/generate - Generate single embedding")
	log.Println("   POST /api/embedder/batch - Generate batch embeddings")
	log.Println("   GET  /api/embedder/health - Health check")
	log.Println("   GET  /api/embedder/metrics - Service metrics")
	log.Println("   DELETE /api/embedder/cache - Clear cache")

	if err := router.Run(":" + port); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
