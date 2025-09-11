//go:build cognitive

// Cognitive Microservice: Redis + SIMD JSON (sonic) + Ollama Gemma Embeddings & Summaries
// This service:
//  1. Fetches JSON documents from Redis (list or key scan)
//  2. Parses via sonic for speed
//  3. Requests embedding & summary from local Ollama (Gemma model)
//  4. Stores embedding vector + summary back into Redis
//  5. Exposes HTTP endpoints for triggering processing & semantic search
//
// NOTE: Requires running Redis and Ollama with gemma model pulled.
//
//	ollama pull (gemma3:270m etc)
//	export OLLAMA_HOST=http://localhost:11434  (default)
//	go run cognitive-microservice.go
package main

import (
	context "context"
	"crypto/sha256"
	"database/sql"
	"encoding/hex"
	stdjson "encoding/json"
	"errors"
	"fmt"
	json "legal-ai-cuda/internal/xjson"
	"log/slog"
	"math"
	"net/http"
	"os"
	"os/signal"
	"strconv"
	"strings"
	"sync"
	"time"

	sonic "github.com/bytedance/sonic"
	_ "github.com/jackc/pgx/v5/stdlib"
	redis "github.com/redis/go-redis/v9"
)

// Config
var (
	redisAddr  = getenv("REDIS_ADDR", "127.0.0.1:6379")
	redisPass  = os.Getenv("REDIS_PASSWORD")
	ollamaHost = getenv("OLLAMA_HOST", "http://localhost:11434")
	// Default updated to official Ollama tag for the 270M Gemma 3 model.
	modelName  = getenv("GEMMA_MODEL", "gemma3:270m")
	modelValidated bool
	docPrefix  = getenv("DOC_PREFIX", "doc:")
	embPrefix  = getenv("EMB_PREFIX", "emb:") // legacy Redis emb storage (still used optionally)
	vectorDims = getenvInt("EMBED_DIMS", 0)     // optional sanity check

	// Postgres / pgvector config (DSN OR individual parts)
	pgDSN      = os.Getenv("PG_DSN")
	pgHost     = getenv("PG_HOST", "127.0.0.1")
	pgPort     = getenv("PG_PORT", "5432")
	pgUser     = getenv("PG_USER", "postgres")
	pgPass     = os.Getenv("PG_PASSWORD")
	pgDB       = getenv("PG_DB", "postgres")

	// Worker pool size for /process/scan
	workerCount = getenvInt("WORKERS", 6)
	ollamaTimeoutMs = getenvInt("OLLAMA_TIMEOUT_MS", 60000)
	ollamaRetries = getenvInt("OLLAMA_RETRIES", 3)
	backoffBaseMs = getenvInt("OLLAMA_BACKOFF_BASE_MS", 250)
	ollamaCBThreshold = getenvInt("OLLAMA_CB_THRESHOLD", 5)
	ollamaCBCooldownMs = getenvInt("OLLAMA_CB_COOLDOWN_MS", 10000)
	// Optional in-process backpressure guard limiting concurrent Ollama requests.
	ollamaMaxInFlight = getenvInt("OLLAMA_MAX_INFLIGHT", 0) // 0 disables guard
)

func getenv(k, d string) string { if v := os.Getenv(k); v != "" { return v }; return d }
func getenvInt(k string, d int) int { if v := os.Getenv(k); v != "" { if i,err:=strconv.Atoi(v); err==nil { return i } }; return d }

var rdb *redis.Client
var pg *sql.DB
var logger *slog.Logger
// Semaphore channel for in-flight Ollama calls (nil if disabled)
var inflightSem chan struct{}

// ================= Metrics ===================
type histogram struct {
	buckets []float64       // upper bounds in seconds
	counts  []uint64
	sum     float64
	total   uint64
}

func newHistogram(b []float64) *histogram { return &histogram{buckets: b, counts: make([]uint64, len(b)), sum: 0, total: 0} }

func (h *histogram) observe(v float64) {
	h.sum += v
	h.total++
	for i, ub := range h.buckets {
		if v <= ub { h.counts[i]++; break }
	}
}

type metricsState struct {
	mu sync.Mutex
	httpRequests map[string]uint64 // key = method|path|status
	cacheHits uint64
	cacheMisses uint64
	ollamaReqTotal map[string]uint64 // key = kind|outcome
	ollamaRetryAttempts uint64
	sonicFallbacks uint64
	ollamaInFlight uint64
	embedLatency *histogram
	summaryLatency *histogram
	queueWaitLatency *histogram
}

var metrics = &metricsState{
	httpRequests: make(map[string]uint64),
	ollamaReqTotal: make(map[string]uint64),
	embedLatency: newHistogram([]float64{0.05,0.1,0.25,0.5,1,2,5,10}),
	summaryLatency: newHistogram([]float64{0.05,0.1,0.25,0.5,1,2,5,10}),
	queueWaitLatency: newHistogram([]float64{0.001,0.005,0.01,0.025,0.05,0.1,0.25,0.5}),
}

func recordHTTPRequest(method, path string, status int, dur time.Duration) {
	metrics.mu.Lock(); metrics.httpRequests[fmt.Sprintf("%s|%s|%d", method, path, status)]++; metrics.mu.Unlock()
}
func recordCacheHit(hit bool) { metrics.mu.Lock(); if hit { metrics.cacheHits++ } else { metrics.cacheMisses++ }; metrics.mu.Unlock() }
func recordOllama(kind, outcome string) { metrics.mu.Lock(); metrics.ollamaReqTotal[kind+"|"+outcome]++; metrics.mu.Unlock() }
func recordRetryAttempt() { metrics.mu.Lock(); metrics.ollamaRetryAttempts++; metrics.mu.Unlock() }
func recordSonicFallback() { metrics.mu.Lock(); metrics.sonicFallbacks++; metrics.mu.Unlock() }
func recordEmbedLatency(sec float64) { metrics.mu.Lock(); metrics.embedLatency.observe(sec); metrics.mu.Unlock() }
func recordSummaryLatency(sec float64) { metrics.mu.Lock(); metrics.summaryLatency.observe(sec); metrics.mu.Unlock() }
func recordQueueWait(sec float64) { metrics.mu.Lock(); metrics.queueWaitLatency.observe(sec); metrics.mu.Unlock() }

func promEscapeLabel(v string) string {
	v = strings.ReplaceAll(v, "\\", "\\\\")
	v = strings.ReplaceAll(v, "\"", "\\\"")
	return v
}

func metricsHandler(w http.ResponseWriter, _ *http.Request) {
	metrics.mu.Lock(); defer metrics.mu.Unlock()
	var sb strings.Builder
	sb.WriteString("# HELP http_requests_total Total HTTP requests by method, path, status\n")
	sb.WriteString("# TYPE http_requests_total counter\n")
	for k, v := range metrics.httpRequests {
		parts := strings.SplitN(k, "|", 3)
		sb.WriteString(fmt.Sprintf("http_requests_total{method=\"%s\",path=\"%s\",status=\"%s\"} %d\n", promEscapeLabel(parts[0]), promEscapeLabel(parts[1]), promEscapeLabel(parts[2]), v))
	}
	sb.WriteString("# HELP embedding_cache_hits_total Embedding cache hits\n# TYPE embedding_cache_hits_total counter\n")
	sb.WriteString(fmt.Sprintf("embedding_cache_hits_total %d\n", metrics.cacheHits))
	sb.WriteString("# HELP embedding_cache_misses_total Embedding cache misses\n# TYPE embedding_cache_misses_total counter\n")
	sb.WriteString(fmt.Sprintf("embedding_cache_misses_total %d\n", metrics.cacheMisses))
	sb.WriteString("# HELP ollama_requests_total Ollama API requests by kind and outcome\n# TYPE ollama_requests_total counter\n")
	for k,v := range metrics.ollamaReqTotal {
		parts := strings.SplitN(k, "|", 2)
		sb.WriteString(fmt.Sprintf("ollama_requests_total{kind=\"%s\",outcome=\"%s\"} %d\n", promEscapeLabel(parts[0]), promEscapeLabel(parts[1]), v))
	}
	sb.WriteString("# HELP ollama_retry_attempts_total Total retry attempts for Ollama calls\n# TYPE ollama_retry_attempts_total counter\n")
	sb.WriteString(fmt.Sprintf("ollama_retry_attempts_total %d\n", metrics.ollamaRetryAttempts))

	// Sonic fallback counter
	sb.WriteString("# HELP sonic_parse_fallback_total Total JSON parse fallbacks from sonic to xjson\n# TYPE sonic_parse_fallback_total counter\n")
	sb.WriteString(fmt.Sprintf("sonic_parse_fallback_total %d\n", metrics.sonicFallbacks))

	// Ollama in-flight gauge
	sb.WriteString("# HELP ollama_inflight_requests Current in-flight Ollama API requests\n# TYPE ollama_inflight_requests gauge\n")
	sb.WriteString(fmt.Sprintf("ollama_inflight_requests %d\n", metrics.ollamaInFlight))
	if ollamaMaxInFlight > 0 {
		sb.WriteString("# HELP ollama_inflight_capacity Configured max in-flight Ollama API requests\n# TYPE ollama_inflight_capacity gauge\n")
		sb.WriteString(fmt.Sprintf("ollama_inflight_capacity %d\n", ollamaMaxInFlight))
	}

	// Histograms
	writeHist := func(name, help string, h *histogram) {
		sb.WriteString(fmt.Sprintf("# HELP %s %s\n# TYPE %s histogram\n", name, help, name))
		var cum uint64
		for i, ub := range h.buckets {
			cum += h.counts[i]
			sb.WriteString(fmt.Sprintf("%s_bucket{le=\"%.2f\"} %d\n", name, ub, cum))
		}
		// +Inf bucket
		sb.WriteString(fmt.Sprintf("%s_bucket{le=\"+Inf\"} %d\n", name, h.total))
		sb.WriteString(fmt.Sprintf("%s_count %d\n", name, h.total))
		sb.WriteString(fmt.Sprintf("%s_sum %.6f\n", name, h.sum))
	}
	writeHist("ollama_embedding_duration_seconds", "Histogram of embedding call durations", metrics.embedLatency)
	writeHist("ollama_summary_duration_seconds", "Histogram of summarize call durations", metrics.summaryLatency)
	writeHist("ollama_queue_wait_duration_seconds", "Histogram of time spent waiting for in-flight slot", metrics.queueWaitLatency)

	// Circuit breaker state gauge: 0=closed,1=open,2=half_open
	ollamaCB.mu.Lock()
	stateVal := 0
	switch ollamaCB.state { case cbClosed: stateVal=0; case cbOpen: stateVal=1; case cbHalfOpen: stateVal=2 }
	ollamaCB.mu.Unlock()
	sb.WriteString("# HELP ollama_circuit_state Current state of Ollama circuit breaker (0=closed,1=open,2=half_open)\n# TYPE ollama_circuit_state gauge\n")
	sb.WriteString(fmt.Sprintf("ollama_circuit_state %d\n", stateVal))

	w.Header().Set("Content-Type", "text/plain; version=0.0.4")
	w.Write([]byte(sb.String()))
}

// ================= Circuit Breaker ===============
type circuitState int
const (
	cbClosed circuitState = iota
	cbOpen
	cbHalfOpen
)
type circuitBreaker struct {
	mu sync.Mutex
	state circuitState
	failCount int
	openedAt time.Time
}
var ollamaCB = &circuitBreaker{state: cbClosed}

// validateOllamaModel queries /api/tags to verify the model exists locally.
// It returns error if the model isn't found or endpoint fails.
func validateOllamaModel(name string) error {
	req, err := http.NewRequest("GET", fmt.Sprintf("%s/api/tags", ollamaHost), nil)
	if err != nil { return err }
	c := &http.Client{ Timeout: 5 * time.Second }
	resp, err := c.Do(req)
	if err != nil { return err }
	defer resp.Body.Close()
	if resp.StatusCode != 200 { return fmt.Errorf("tags status %d", resp.StatusCode) }
	var parsed struct { Models []struct { Name string `json:"name"` } `json:"models"` }
	if err := stdjson.NewDecoder(resp.Body).Decode(&parsed); err != nil { return err }
	for _, m := range parsed.Models { if m.Name == name { return nil } }
	return fmt.Errorf("model '%s' not found locally (run: ollama pull %s)", name, name)
}

func (c *circuitBreaker) allow() bool {
	c.mu.Lock(); defer c.mu.Unlock()
	switch c.state {
	case cbClosed:
		return true
	case cbOpen:
		if time.Since(c.openedAt) > time.Duration(ollamaCBCooldownMs)*time.Millisecond {
			c.state = cbHalfOpen
			return true
		}
		return false
	case cbHalfOpen:
		// allow single trial
		if c.failCount == 0 { return true }
		return false
	}
	return true
}
func (c *circuitBreaker) onSuccess() {
	c.mu.Lock(); defer c.mu.Unlock()
	c.failCount = 0
	c.state = cbClosed
}
func (c *circuitBreaker) onFailure() {
	c.mu.Lock(); defer c.mu.Unlock()
	c.failCount++
	if c.state == cbHalfOpen || (c.state == cbClosed && c.failCount >= ollamaCBThreshold) {
		c.state = cbOpen
		c.openedAt = time.Now()
	}
}

const tableDDL = `CREATE TABLE IF NOT EXISTS ai_docs (
	id TEXT PRIMARY KEY,
	title TEXT,
	content_sha TEXT UNIQUE,
	summary TEXT,
	embedding vector,
	created_at TIMESTAMPTZ DEFAULT now(),
	updated_at TIMESTAMPTZ DEFAULT now()
);`

// build DSN if not provided
func buildPgDSN() string {
		if pgDSN != "" { return pgDSN }
		// sslmode=disable for local dev; adjust for prod
		return fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=disable", pgHost, pgPort, pgUser, pgPass, pgDB)
}

// Run with: go run -tags cognitive cognitive-microservice.go
// or build: go build -tags cognitive -o cognitive-service ./cognitive-microservice.go
func main() {
	logger = slog.New(slog.NewTextHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelInfo}))
	// Init Redis
	rdb = redis.NewClient(&redis.Options{Addr: redisAddr, Password: redisPass})
	if err := rdb.Ping(context.Background()).Err(); err != nil { logger.Error("redis.ping", "error", err); os.Exit(1) }
	logger.Info("redis.connected", "addr", redisAddr)

	// Initialize optional in-flight semaphore (backpressure against Ollama)
	if ollamaMaxInFlight > 0 {
		inflightSem = make(chan struct{}, ollamaMaxInFlight)
		logger.Info("ollama.backpressure.enabled", "max_inflight", ollamaMaxInFlight)
	} else {
		logger.Info("ollama.backpressure.disabled")
	}

	// Validate Ollama model presence early (non-fatal but logs warning and attempts pull hint)
	if err := validateOllamaModel(modelName); err != nil {
		logger.Warn("ollama.model.validate", "model", modelName, "error", err)
	} else { modelValidated = true }

	// Init Postgres + pgvector
	if err := initPostgres(); err != nil { logger.Error("postgres.init", "error", err); os.Exit(1) }
	logger.Info("postgres.connected", "host", pgHost, "db", pgDB)

	mux := http.NewServeMux()
	mux.HandleFunc("/process/key/", handleProcessKey)
	mux.HandleFunc("/process/scan", handleProcessScan)
	mux.HandleFunc("/search", handleSemanticSearch)
	mux.HandleFunc("/live", handleLive)
	mux.HandleFunc("/ready", handleReady)
	mux.HandleFunc("/health", handleLive)
	mux.HandleFunc("/metrics", metricsHandler)

	srv := &http.Server{Addr: ":8099", Handler: requestIDMiddleware(loggingMiddleware(mux))}
	logger.Info("server.listening", "addr", ":8099", "model", modelName)

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt)
	go func(){
		<-stop
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		logger.Info("shutdown.start")
		if err := srv.Shutdown(ctx); err != nil { logger.Error("shutdown.error", "error", err) }
		_ = rdb.Close()
		if pg != nil { _ = pg.Close() }
		logger.Info("shutdown.complete")
	}()

	if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
		logger.Error("server.error", "error", err)
	}
}

// ============== Core Handlers ==================
func handleProcessKey(w http.ResponseWriter, r *http.Request) {
	id := strings.TrimPrefix(r.URL.Path, "/process/key/")
	if id == "" { http.Error(w, "missing key", 400); return }
	ctx := r.Context()
	key := docPrefix + id
	raw, err := rdb.Get(ctx, key).Result()
	if err != nil { http.Error(w, "redis get: "+err.Error(), 500); return }
	processed, err := processDocument(ctx, id, raw)
	if err != nil { http.Error(w, err.Error(), 500); return }
	writeJSON(w, processed)
}

func handleProcessScan(w http.ResponseWriter, r *http.Request) {
	pattern := r.URL.Query().Get("pattern")
	if pattern == "" { pattern = docPrefix+"*" }
	ctx := r.Context()
	var cursor uint64
	type job struct { id, raw string }
	jobs := make(chan job, 256)
	var wg sync.WaitGroup
	var mu sync.Mutex
	processed := make([]any, 0, 128)
	// start workers
	if workerCount < 1 { workerCount = 1 }
	for i := 0; i < workerCount; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			for j := range jobs {
				if ctx.Err() != nil { return }
				res, err := processDocument(ctx, j.id, j.raw)
				if err != nil { continue }
				mu.Lock(); processed = append(processed, res); mu.Unlock()
			}
		}()
	}

	scanStart := time.Now()
	for {
		keys, next, err := rdb.Scan(ctx, cursor, pattern, 500).Result()
		if err != nil { http.Error(w, "scan: "+err.Error(), 500); close(jobs); return }
		for _, k := range keys {
			id := strings.TrimPrefix(k, docPrefix)
			raw, err := rdb.Get(ctx, k).Result()
			if err != nil { continue }
			select {
			case jobs <- job{id: id, raw: raw}:
			case <-ctx.Done(): close(jobs); http.Error(w, "cancelled", 499); return
			}
		}
		cursor = next
		if cursor == 0 { break }
	}
	close(jobs)
	wg.Wait()

	writeJSON(w, map[string]any{
		"count": len(processed),
		"items": processed,
		"duration_ms": time.Since(scanStart).Milliseconds(),
		"workers": workerCount,
	})
}

// ============ Embeddings & Summary Pipeline =============
type embeddingResponse struct { Embedding []float64 `json:"embedding"` }

type generateRequest struct { Model string `json:"model"`; Prompt string `json:"prompt"` }
type generateResponse struct { Response string `json:"response"`; Done bool `json:"done"` }

type docRecord struct { ID string `json:"id"`; Title string `json:"title"`; Content string `json:"content"` }

type processedDoc struct { ID string `json:"id"`; Title string `json:"title"`; Summary string `json:"summary"`; Vector []float64 `json:"vector"` }

func processDocument(ctx context.Context, id, raw string) (*processedDoc, error) {
	// Parse with sonic (fast path) and fallback to xjson for resilience
	var rec docRecord
	if err := sonic.Unmarshal([]byte(raw), &rec); err != nil {
		var rec2 docRecord
		if err2 := json.Unmarshal([]byte(raw), &rec2); err2 == nil {
			rec = rec2
			logger.Warn("sonic.parse.fallback", "error", err)
			recordSonicFallback()
		} else {
			return nil, fmt.Errorf("json parse: %w", err)
		}
	}
	if rec.ID == "" { rec.ID = id }
	if rec.Content == "" { return nil, errors.New("empty content") }

	// Embedding cache based on SHA256(content)
	contentHash := sha256.Sum256([]byte(rec.Content))
	sha := hex.EncodeToString(contentHash[:])
	cachedVec, cacheHit, cacheErr := getCachedEmbedding(ctx, sha)
	if cacheErr != nil { logger.Warn("cache.read.error", "error", cacheErr) }
	var vec []float64
	var err error
	if cacheHit {
		recordCacheHit(true)
		vec = normalizeVector(cachedVec)
	} else {
		recordCacheHit(false)
		vec, err = embedText(ctx, rec.Content)
		if err != nil { return nil, err }
		vec = normalizeVector(vec)
		// store cache asynchronously
		go func(vcopy []float64, key string){ if err := cacheEmbedding(context.Background(), key, vcopy); err!=nil { logger.Warn("cache.write.error", "error", err) } }(append([]float64{}, vec...), sha)
	}
	if err != nil { return nil, err }
	if vectorDims > 0 && len(vec) != vectorDims { logger.Warn("vector.dim.mismatch", "got", len(vec), "want", vectorDims) }

	summary, err := summarizeText(ctx, rec.Content)
	if err != nil { return nil, err }

	p := &processedDoc{ ID: rec.ID, Title: rec.Title, Summary: summary, Vector: vec }
	// Upsert into Postgres
	if err := upsertDocument(ctx, p, sha); err != nil { logger.Error("pg.upsert", "error", err) }
	// Optional legacy Redis storage for backward compatibility
	b, _ := json.Marshal(p)
	if err := rdb.Set(ctx, embPrefix+rec.ID, string(b), 0).Err(); err != nil { logger.Warn("redis.emb.store", "error", err) }
	return p, nil
}

// embedText calls local Ollama embeddings endpoint
func embedText(ctx context.Context, text string) ([]float64, error) {
	return getOllamaEmbeddings(ctx, text)
}

// getOllamaEmbeddings provides embedding with circuit breaker, retry w/ backoff, normalization and caching reuse.
func getOllamaEmbeddings(ctx context.Context, prompt string) ([]float64, error) {
	// In-flight guard (non-blocking context cancellation respected via select)
	if inflightSem != nil {
		acqStart := time.Now()
		select {
		case inflightSem <- struct{}{}:
			recordQueueWait(time.Since(acqStart).Seconds())
			metrics.mu.Lock(); metrics.ollamaInFlight++; metrics.mu.Unlock()
			defer func(){ <-inflightSem; metrics.mu.Lock(); if metrics.ollamaInFlight>0 { metrics.ollamaInFlight-- }; metrics.mu.Unlock() }()
		case <-ctx.Done():
			return nil, ctx.Err()
		}
	}
	if !ollamaCB.allow() { recordOllama("embedding", "short_circuit"); return nil, errors.New("ollama circuit open") }
	// cache key based on sha256 of prompt
	h := sha256.Sum256([]byte(prompt))
	cacheKey := "embcache:" + hex.EncodeToString(h[:]) + ":norm1"
	if val, err := rdb.Get(ctx, cacheKey).Result(); err == nil {
		var cached []float64
		if json.Unmarshal([]byte(val), &cached) == nil {
			recordCacheHit(true)
			return cached, nil
		}
	}
	recordCacheHit(false)
	payload := fmt.Sprintf(`{"model":"%s","prompt":%q}`, modelName, truncate(prompt, 4000))
	var embedding []float64
	start := time.Now()
	op := func(attempt int) error {
		cctx, cancel := context.WithTimeout(ctx, time.Duration(ollamaTimeoutMs)*time.Millisecond)
		defer cancel()
		req, _ := http.NewRequestWithContext(cctx, "POST", fmt.Sprintf("%s/api/embeddings", ollamaHost), strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil { logger.Warn("ollama.embeddings.http", "attempt", attempt, "error", err); recordRetryAttempt(); return err }
		defer resp.Body.Close()
		if resp.StatusCode != 200 { logger.Warn("ollama.embeddings.status", "attempt", attempt, "status", resp.StatusCode); recordRetryAttempt(); return fmt.Errorf("status %d", resp.StatusCode) }
		var parsed struct { Embedding []float64 `json:"embedding"` }
		if err := stdjson.NewDecoder(resp.Body).Decode(&parsed); err != nil { logger.Warn("ollama.embeddings.decode", "attempt", attempt, "error", err); recordRetryAttempt(); return err }
		embedding = parsed.Embedding
		return nil
	}
	err := withRetry(ctx, ollamaRetries, time.Duration(backoffBaseMs)*time.Millisecond, op)
	lat := time.Since(start).Seconds(); recordEmbedLatency(lat)
	if err != nil { ollamaCB.onFailure(); recordOllama("embedding", "error"); return nil, err }
	ollamaCB.onSuccess(); recordOllama("embedding", "ok")
	norm := normalizeVector(embedding)
	if b, err2 := json.Marshal(norm); err2 == nil { _ = rdb.Set(ctx, cacheKey, b, 24*time.Hour).Err() }
	return norm, nil
}

func summarizeText(ctx context.Context, text string) (string, error) {
	return getOllamaSummary(ctx, text)
}

// getOllamaSummary fetches (and caches) a concise summary for a document.
func getOllamaSummary(ctx context.Context, text string) (string, error) {
	if inflightSem != nil {
		acqStart := time.Now()
		select {
		case inflightSem <- struct{}{}:
			recordQueueWait(time.Since(acqStart).Seconds())
			metrics.mu.Lock(); metrics.ollamaInFlight++; metrics.mu.Unlock()
			defer func(){ <-inflightSem; metrics.mu.Lock(); if metrics.ollamaInFlight>0 { metrics.ollamaInFlight-- }; metrics.mu.Unlock() }()
		case <-ctx.Done():
			return "", ctx.Err()
		}
	}
	if !ollamaCB.allow() { recordOllama("summary", "short_circuit"); return "", errors.New("ollama circuit open") }
	// cache key on content hash
	h := sha256.Sum256([]byte(text))
	cacheKey := "sumcache:" + hex.EncodeToString(h[:]) + ":v1"
	if val, err := rdb.Get(ctx, cacheKey).Result(); err == nil && val != "" {
		return val, nil
	}
	prompt := "Summarize this legal document in 2 concise sentences focusing on entities and obligations:\n" + truncate(text, 4000)
	payload := fmt.Sprintf(`{"model":"%s","prompt":%q}`, modelName, prompt)
	var summary string
	start := time.Now()
	op := func(attempt int) error {
		cctx, cancel := context.WithTimeout(ctx, time.Duration(ollamaTimeoutMs)*time.Millisecond)
		defer cancel()
		req, _ := http.NewRequestWithContext(cctx, "POST", fmt.Sprintf("%s/api/generate", ollamaHost), strings.NewReader(payload))
		req.Header.Set("Content-Type", "application/json")
		resp, err := http.DefaultClient.Do(req)
		if err != nil { logger.Warn("ollama.generate.http", "attempt", attempt, "error", err); recordRetryAttempt(); return err }
		defer resp.Body.Close()
		if resp.StatusCode != 200 { logger.Warn("ollama.generate.status", "attempt", attempt, "status", resp.StatusCode); recordRetryAttempt(); return fmt.Errorf("status %d", resp.StatusCode) }
		var sb strings.Builder
		dec := stdjson.NewDecoder(resp.Body)
		for dec.More() {
			var chunk generateResponse
			if err := dec.Decode(&chunk); err != nil { return err }
			if chunk.Response != "" { sb.WriteString(chunk.Response) }
		}
		summary = strings.TrimSpace(sb.String())
		return nil
	}
	err := withRetry(ctx, ollamaRetries, time.Duration(backoffBaseMs)*time.Millisecond, op)
	lat := time.Since(start).Seconds(); recordSummaryLatency(lat)
	if err != nil { ollamaCB.onFailure(); recordOllama("summary", "error"); return "", err }
	ollamaCB.onSuccess(); recordOllama("summary", "ok")
	// cache summary (shorter TTL maybe 12h)
	_ = rdb.Set(ctx, cacheKey, summary, 12*time.Hour).Err()
	return summary, nil
}

// ============ Semantic Search =============
func handleSemanticSearch(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query().Get("q")
	if q == "" { http.Error(w, "missing q", 400); return }
	ctx := r.Context()
	vec, err := embedText(ctx, q)
	if err != nil { http.Error(w, "embed fail: "+err.Error(), 500); return }
	vec = normalizeVector(vec)
	// Convert to pgvector literal '[v1,v2,...]'
	lit := vectorLiteral(vec)
	limit := 10
	rows, err := pg.QueryContext(ctx, `SELECT id, title, summary, (embedding <-> $1::vector) AS distance FROM ai_docs ORDER BY embedding <-> $1::vector ASC LIMIT $2`, lit, limit)
	if err != nil { http.Error(w, "pg query: "+err.Error(), 500); return }
	defer rows.Close()
	type scored struct { ID string; Score float64; Title string; Summary string }
	var out []scored
	for rows.Next() {
		var id, title, summary string
		var distance float64
		if err := rows.Scan(&id, &title, &summary, &distance); err == nil {
			// Convert distance (Euclidean) to similarity placeholder (1/(1+distance))
			score := 1.0 / (1.0 + distance)
			out = append(out, scored{ID: id, Title: title, Summary: summary, Score: score})
		}
	}
	writeJSON(w, map[string]any{"query": q, "results": out})
}

// cosine similarity
func cosine(a, b []float64) float64 {
	var dot, na, nb float64
	for i := range a { dot += a[i]*b[i]; na += a[i]*a[i]; nb += b[i]*b[i] }
	if na == 0 || nb == 0 { return 0 }
	return dot / (math.Sqrt(na) * math.Sqrt(nb))
}

func truncate(s string, n int) string { if len(s) <= n { return s }; return s[:n] }

// ============ Middleware & Health =============
type statusRecorder struct { http.ResponseWriter; status int }
func (s *statusRecorder) WriteHeader(code int){ s.status = code; s.ResponseWriter.WriteHeader(code) }

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		rec := &statusRecorder{ResponseWriter: w, status: 200}
		next.ServeHTTP(rec, r)
		dur := time.Since(start)
		logger.Info("request", "method", r.Method, "path", r.URL.Path, "status", rec.status, "duration_ms", dur.Milliseconds(), "request_id", r.Context().Value(ctxReqIDKey{}))
		recordHTTPRequest(r.Method, r.URL.Path, rec.status, dur)
	})
}

type ctxReqIDKey struct{}

func requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		rid := r.Header.Get("X-Request-ID")
		if rid == "" { rid = fmt.Sprintf("req-%d", time.Now().UnixNano()) }
		w.Header().Set("X-Request-ID", rid)
		ctx := context.WithValue(r.Context(), ctxReqIDKey{}, rid)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func handleLive(w http.ResponseWriter, _ *http.Request) { w.Write([]byte("ok")) }
func handleReady(w http.ResponseWriter, r *http.Request) {
	ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
	defer cancel()
	type check struct { OK bool `json:"ok"`; LatencyMs int64 `json:"latency_ms,omitempty"`; Error string `json:"error,omitempty"` }
	resp := struct { Status string `json:"status"`; Redis check `json:"redis"`; Postgres check `json:"postgres"`; Ollama check `json:"ollama"`; Model struct { Name string `json:"name"`; Validated bool `json:"validated"` } `json:"model"`; Timestamp string `json:"timestamp"` }{}
	resp.Timestamp = time.Now().UTC().Format(time.RFC3339)
	resp.Model.Name = modelName
	resp.Model.Validated = modelValidated
	overall := true
	{ t0 := time.Now(); if err := rdb.Ping(ctx).Err(); err != nil { resp.Redis = check{OK:false, Error: err.Error()}; overall=false } else { resp.Redis = check{OK:true, LatencyMs: time.Since(t0).Milliseconds()} } }
	{ t0 := time.Now(); if err := pg.PingContext(ctx); err != nil { resp.Postgres = check{OK:false, Error: err.Error()}; overall=false } else { resp.Postgres = check{OK:true, LatencyMs: time.Since(t0).Milliseconds()} } }
	{ t0 := time.Now(); embCtx, cancel2 := context.WithTimeout(ctx, 3*time.Second); defer cancel2(); err := func() error { req, _ := http.NewRequestWithContext(embCtx, "POST", fmt.Sprintf("%s/api/embeddings", ollamaHost), strings.NewReader(fmt.Sprintf(`{"model":"%s","prompt":"ok"}`, modelName))); req.Header.Set("Content-Type","application/json"); resp, err := http.DefaultClient.Do(req); if err != nil { return err }; defer resp.Body.Close(); if resp.StatusCode != 200 { return fmt.Errorf("status %d", resp.StatusCode) }; return nil }(); if err != nil { resp.Ollama = check{OK:false, Error: err.Error()}; overall=false } else { resp.Ollama = check{OK:true, LatencyMs: time.Since(t0).Milliseconds()} } }
	if overall { resp.Status = "ok" } else { resp.Status = "degraded" }
	w.Header().Set("Content-Type", "application/json")
	writeJSON(w, resp)
}

// ================== Postgres / pgvector helpers ==================
func initPostgres() error {
	dsn := buildPgDSN()
	db, err := sql.Open("pgx", dsn)
	if err != nil { return err }
	if err = db.Ping(); err != nil { return err }
	pg = db
	if _, err = pg.Exec(`CREATE EXTENSION IF NOT EXISTS vector`); err != nil { return fmt.Errorf("enable pgvector: %w", err) }
	if _, err = pg.Exec(tableDDL); err != nil { return fmt.Errorf("table ddl: %w", err) }
	return nil
}

func upsertDocument(ctx context.Context, p *processedDoc, contentSHA string) error {
	lit := vectorLiteral(p.Vector)
	_, err := pg.ExecContext(ctx, `INSERT INTO ai_docs (id, title, content_sha, summary, embedding)
		VALUES ($1,$2,$3,$4,$5::vector)
		ON CONFLICT (id) DO UPDATE SET title=EXCLUDED.title, summary=EXCLUDED.summary, embedding=EXCLUDED.embedding, updated_at=now()`,
		p.ID, p.Title, contentSHA, p.Summary, lit)
	return err
}

func vectorLiteral(v []float64) string {
	parts := make([]string, len(v))
	for i, f := range v { parts[i] = strconv.FormatFloat(f, 'f', 6, 64) }
	return "[" + strings.Join(parts, ",") + "]"
}

// normalizeVector scales vector to unit L2 norm (if magnitude > 0)
func normalizeVector(vec []float64) []float64 {
	var sumSq float64
	for _, v := range vec { sumSq += v * v }
	mag := math.Sqrt(sumSq)
	if mag == 0 { return vec }
	out := make([]float64, len(vec))
	for i, v := range vec { out[i] = v / mag }
	return out
}

// ================== Embedding Cache (Redis) ==================
func getCachedEmbedding(ctx context.Context, sha string) ([]float64, bool, error) {
	key := "embcache:" + sha
	val, err := rdb.Get(ctx, key).Result()
	if err == redis.Nil { return nil, false, nil }
	if err != nil { return nil, false, err }
	var vec []float64
	if err := json.Unmarshal([]byte(val), &vec); err != nil { return nil, false, err }
	return vec, true, nil
}

func cacheEmbedding(ctx context.Context, sha string, vec []float64) error {
	b, _ := json.Marshal(vec)
	return rdb.Set(ctx, "embcache:"+sha, b, 24*time.Hour).Err()
}

// ================= Retry Helper =================
func withRetry(ctx context.Context, attempts int, baseDelay time.Duration, fn func(int) error) error {
	if attempts < 1 { attempts = 1 }
	var err error
	for a:=1; a<=attempts; a++ {
		if ctx.Err() != nil { return ctx.Err() }
		err = fn(a)
		if err == nil { return nil }
		if a < attempts {
			d := baseDelay * time.Duration(1<<uint(a-1))
			j := d/4
			d = d - j + time.Duration(randInt63n(int64(2*j)))
			select { case <-time.After(d): case <-ctx.Done(): return ctx.Err() }
		}
	}
	return err
}

var randState uint64 = 88172645463393265
func randInt63n(n int64) int64 { if n<=0 { return 0 }; x:=randState; x ^= x>>12; x ^= x<<25; x ^= x>>27; randState = x; v := int64((x * 2685821657736338717) >> 1); if v<0 { v=-v }; return v % n }

// writeJSON marshals via abstraction and writes response
func writeJSON(w http.ResponseWriter, v any) {
	b, err := json.Marshal(v)
	if err != nil { http.Error(w, "json marshal error", 500); return }
	w.Header().Set("Content-Type", "application/json")
	w.Write(b)
}
