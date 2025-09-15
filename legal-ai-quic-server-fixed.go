package main

import (
	"context"
	crand "crypto/rand"
	"crypto/rsa"
	"crypto/sha256"
	"crypto/tls"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"log"
	"math"
	"math/big"
	"net"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/quic-go/quic-go/http3"
	"github.com/redis/go-redis/v9"
)

// Legal AI Request/Response structures based on our protobuf schema
type LegalDocumentRequest struct {
	DocumentID   string            `json:"document_id"`
	DocumentData []byte            `json:"document_data"`
	DocumentType string            `json:"document_type"`
	Filename     string            `json:"filename"`
	Metadata     map[string]string `json:"metadata"`
	Options      ProcessingOptions `json:"options"`
}

type ProcessingOptions struct {
	ExtractEntities  bool `json:"extract_entities"`
	AnalyzeSentiment bool `json:"analyze_sentiment"`
	ClassifyDomain   bool `json:"classify_domain"`
	GenerateEmbedding bool `json:"generate_embedding"`
	FindSimilar      bool `json:"find_similar"`
	RiskAssessment   bool `json:"risk_assessment"`
}

type LegalDocumentResponse struct {
	DocumentID       string             `json:"document_id"`
	Summary          string             `json:"summary"`
	KeyEntities      []string           `json:"key_entities"`
	LegalConcepts    []string           `json:"legal_concepts"`
	Confidence       float32            `json:"confidence"`
	LegalDomain      string             `json:"legal_domain"`
	SentimentScore   float32            `json:"sentiment_score"`
	ComplexityScore  int32              `json:"complexity_score"`
	Embedding        []float32          `json:"embedding,omitempty"`
	SimilarCases     []SimilarCase      `json:"similar_cases,omitempty"`
	RiskAssessment   *RiskAssessment    `json:"risk_assessment,omitempty"`
	ProcessingTimeMs int64              `json:"processing_time_ms"`
	Success          bool               `json:"success"`
	Error            string             `json:"error,omitempty"`
}

type RecommendationRequest struct {
	CaseID              string            `json:"case_id"`
	CaseFacts           []string          `json:"case_facts"`
	LegalDomain         string            `json:"legal_domain"`
	Jurisdiction        string            `json:"jurisdiction"`
	MaxRecommendations  int32             `json:"max_recommendations"`
	SimilarityThreshold float32           `json:"similarity_threshold"`
	IncludePrecedents   bool              `json:"include_precedents"`
	IncludeSimilarCases bool              `json:"include_similar_cases"`
	IncludeRiskAssessment bool            `json:"include_risk_assessment"`
	Filters             map[string]string `json:"filters"`
}

type RecommendationResponse struct {
	Recommendations   []LegalRecommendation `json:"recommendations"`
	TotalCount        int32                 `json:"total_count"`
	ConfidenceScore   float32               `json:"confidence_score"`
	ProcessingTimeMs  int64                 `json:"processing_time_ms"`
	Success           bool                  `json:"success"`
	Error             string                `json:"error,omitempty"`
}

type SimilarCase struct {
	CaseID         string  `json:"case_id"`
	Title          string  `json:"title"`
	Similarity     float32 `json:"similarity"`
	LegalDomain    string  `json:"legal_domain"`
	Jurisdiction   string  `json:"jurisdiction"`
	Year           int32   `json:"year"`
	KeyFactors     []string `json:"key_factors"`
	RelevanceScore float32  `json:"relevance_score"`
}

type LegalRecommendation struct {
	ID                   string          `json:"id"`
	Title                string          `json:"title"`
	Description          string          `json:"description"`
	ConfidenceScore      float32         `json:"confidence_score"`
	LegalDomain          string          `json:"legal_domain"`
	Jurisdiction         string          `json:"jurisdiction"`
	RelevantCases        []string        `json:"relevant_cases"`
	LegalConcepts        []string        `json:"legal_concepts"`
	RiskAssessment       *RiskAssessment `json:"risk_assessment"`
	RecommendationType   string          `json:"recommendation_type"`
	Metadata             map[string]string `json:"metadata"`
}

type RiskAssessment struct {
	OverallRiskScore     float32      `json:"overall_risk_score"`
	RiskLevel            string       `json:"risk_level"`
	RiskFactors          []RiskFactor `json:"risk_factors"`
	MitigationStrategies []string     `json:"mitigation_strategies"`
	Confidence           float32      `json:"confidence"`
}

type RiskFactor struct {
	FactorName    string   `json:"factor_name"`
	ImpactScore   float32  `json:"impact_score"`
	Probability   float32  `json:"probability"`
	Description   string   `json:"description"`
	RelatedCases  []string `json:"related_cases"`
}

// Authentication structures
type AuthRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
	Email    string `json:"email,omitempty"`
}

type AuthResponse struct {
	Success   bool   `json:"success"`
	Message   string `json:"message"`
	Token     string `json:"token,omitempty"`
	SessionID string `json:"session_id,omitempty"`
}

type Session struct {
	SessionID string    `json:"session_id"`
	Username  string    `json:"username"`
	CreatedAt time.Time `json:"created_at"`
	ExpiresAt time.Time `json:"expires_at"`
}

// Authentication handler
type AuthHandler struct {
	redisClient *redis.Client
	sessions    map[string]Session
	mu          sync.RWMutex
}

func NewAuthHandler(redisClient *redis.Client) *AuthHandler {
	return &AuthHandler{
		redisClient: redisClient,
		sessions:    make(map[string]Session),
	}
}

func (ah *AuthHandler) generateSessionID() string {
	// Generate random bytes for better entropy
	randomBytes := make([]byte, 16)
	if _, err := crand.Read(randomBytes); err != nil {
		log.Printf("⚠️  Failed to generate secure random bytes: %v", err)
		// Fallback to timestamp-based generation
		randomBytes = []byte(fmt.Sprintf("%d", time.Now().UnixNano()))
	}
	hash := sha256.Sum256([]byte(fmt.Sprintf("%d%x", time.Now().UnixNano(), randomBytes)))
	return hex.EncodeToString(hash[:])[:32]
}

func (ah *AuthHandler) generateToken() string {
	// Generate random bytes for better entropy
	randomBytes := make([]byte, 16)
	if _, err := crand.Read(randomBytes); err != nil {
		log.Printf("⚠️  Failed to generate secure random bytes: %v", err)
		// Fallback to timestamp-based generation
		randomBytes = []byte(fmt.Sprintf("%d", time.Now().UnixNano()))
	}
	hash := sha256.Sum256([]byte(fmt.Sprintf("%d%x", time.Now().UnixNano(), randomBytes)))
	return hex.EncodeToString(hash[:])
}

func (ah *AuthHandler) HandleRegister(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	if req.Username == "" || req.Password == "" {
		response := AuthResponse{
			Success: false,
			Message: "Username and password required",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	// In production, store user in database with hashed password
	// For demo purposes, we'll just validate the request
	response := AuthResponse{
		Success: true,
		Message: "User registered successfully",
		Token:   ah.generateToken(),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ah *AuthHandler) HandleLogin(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req AuthRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// In production, validate against stored user credentials
	// For demo purposes, accept any non-empty username/password
	if req.Username == "" || req.Password == "" {
		response := AuthResponse{
			Success: false,
			Message: "Invalid credentials",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
		return
	}

	sessionID := ah.generateSessionID()
	session := Session{
		SessionID: sessionID,
		Username:  req.Username,
		CreatedAt: time.Now(),
		ExpiresAt: time.Now().Add(24 * time.Hour),
	}

	ah.mu.Lock()
	ah.sessions[sessionID] = session
	ah.mu.Unlock()

	// Store session in Redis if available
	if ah.redisClient != nil {
		sessionJSON, _ := json.Marshal(session)
		ah.redisClient.Set(context.Background(), "session:"+sessionID, sessionJSON, 24*time.Hour)
	}

	response := AuthResponse{
		Success:   true,
		Message:   "Login successful",
		Token:     ah.generateToken(),
		SessionID: sessionID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ah *AuthHandler) HandleValidateSession(w http.ResponseWriter, r *http.Request) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = r.URL.Query().Get("session_id")
	}

	if sessionID == "" {
		http.Error(w, "Session ID required", http.StatusBadRequest)
		return
	}

	valid := ah.validateSession(sessionID)
	response := map[string]interface{}{
		"valid":      valid,
		"session_id": sessionID,
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ah *AuthHandler) HandleLogout(w http.ResponseWriter, r *http.Request) {
	sessionID := r.Header.Get("X-Session-ID")
	if sessionID == "" {
		sessionID = r.URL.Query().Get("session_id")
	}

	if sessionID != "" {
		ah.mu.Lock()
		delete(ah.sessions, sessionID)
		ah.mu.Unlock()

		// Remove from Redis if available
		if ah.redisClient != nil {
			ah.redisClient.Del(context.Background(), "session:"+sessionID)
		}
	}

	response := AuthResponse{
		Success: true,
		Message: "Logout successful",
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(response)
}

func (ah *AuthHandler) validateSession(sessionID string) bool {
	ah.mu.RLock()
	session, exists := ah.sessions[sessionID]
	ah.mu.RUnlock()

	if !exists && ah.redisClient != nil {
		// Try to get from Redis
		sessionJSON, err := ah.redisClient.Get(context.Background(), "session:"+sessionID).Result()
		if err == nil {
			var redisSession Session
			if json.Unmarshal([]byte(sessionJSON), &redisSession) == nil {
				session = redisSession
				exists = true
				// Cache locally
				ah.mu.Lock()
				ah.sessions[sessionID] = session
				ah.mu.Unlock()
			}
		}
	}

	return exists && time.Now().Before(session.ExpiresAt)
}

func (ah *AuthHandler) RequireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		sessionID := r.Header.Get("X-Session-ID")
		if sessionID == "" {
			sessionID = r.URL.Query().Get("session_id")
		}

		if sessionID == "" || !ah.validateSession(sessionID) {
			http.Error(w, "Authentication required", http.StatusUnauthorized)
			return
		}

		next(w, r)
	}
}

// QUIC Legal AI Server
type LegalAIQuicServer struct {
	redisClient    *redis.Client
	workerPool     chan LegalJob
	results        chan LegalResult
	recommendations chan RecommendationJob
	mu             sync.RWMutex
	vectorDB       *VectorDatabase
	caseDB         *LegalCaseDatabase
}

type LegalJob struct {
	JobID     string                `json:"job_id"`
	Request   LegalDocumentRequest  `json:"request"`
	Operation string                `json:"operation"`
	Timestamp time.Time             `json:"timestamp"`
}

type LegalResult struct {
	JobID      string                 `json:"job_id"`
	Response   LegalDocumentResponse  `json:"response"`
	Status     string                 `json:"status"`
	Metrics    map[string]float64     `json:"metrics"`
	Metadata   map[string]interface{} `json:"metadata"`
}

type RecommendationJob struct {
	JobID     string                `json:"job_id"`
	Request   RecommendationRequest `json:"request"`
	Timestamp time.Time             `json:"timestamp"`
}

// Mock vector database for legal documents
type VectorDatabase struct {
	vectors map[string][]float32
	mu      sync.RWMutex
}

func NewVectorDatabase() *VectorDatabase {
	return &VectorDatabase{
		vectors: make(map[string][]float32),
	}
}

func (vdb *VectorDatabase) Store(id string, vector []float32) {
	vdb.mu.Lock()
	defer vdb.mu.Unlock()
	vdb.vectors[id] = vector
}

func (vdb *VectorDatabase) Search(queryVector []float32, topK int) []SimilarCase {
	vdb.mu.RLock()
	defer vdb.mu.RUnlock()
	
	type similarity struct {
		id    string
		score float32
	}
	
	var similarities []similarity
	for id, vector := range vdb.vectors {
		score := cosineSimilarity(queryVector, vector)
		similarities = append(similarities, similarity{id: id, score: score})
	}
	
	// Sort by similarity (simplified)
	// In production, use proper sorting
	results := make([]SimilarCase, 0, topK)
	for i, sim := range similarities {
		if i >= topK {
			break
		}
		results = append(results, SimilarCase{
			CaseID:         sim.id,
			Title:          fmt.Sprintf("Case %s", sim.id),
			Similarity:     sim.score,
			LegalDomain:    "general",
			Jurisdiction:   "federal",
			RelevanceScore: sim.score,
		})
	}
	
	return results
}

// Mock legal case database
type LegalCaseDatabase struct {
	cases map[string]LegalCase
	mu    sync.RWMutex
}

type LegalCase struct {
	CaseID       string   `json:"case_id"`
	Title        string   `json:"title"`
	Court        string   `json:"court"`
	Year         int32    `json:"year"`
	Jurisdiction string   `json:"jurisdiction"`
	Domain       string   `json:"domain"`
	Facts        []string `json:"facts"`
	Outcome      string   `json:"outcome"`
}

func NewLegalCaseDatabase() *LegalCaseDatabase {
	db := &LegalCaseDatabase{
		cases: make(map[string]LegalCase),
	}
	
	// Add some mock cases
	mockCases := []LegalCase{
		{
			CaseID: "case_001",
			Title: "Contract Dispute - Software Licensing",
			Court: "District Court",
			Year: 2023,
			Jurisdiction: "federal",
			Domain: "contract_law",
			Facts: []string{"software licensing dispute", "breach of contract", "damages claimed"},
			Outcome: "plaintiff_victory",
		},
		{
			CaseID: "case_002", 
			Title: "Employment Discrimination Case",
			Court: "Appeals Court",
			Year: 2022,
			Jurisdiction: "state",
			Domain: "employment_law",
			Facts: []string{"workplace discrimination", "hostile environment", "wrongful termination"},
			Outcome: "settlement",
		},
	}
	
	for _, case_ := range mockCases {
		db.cases[case_.CaseID] = case_
	}
	
	return db
}

// FIXED: Corrected cosine similarity calculation with proper square root
func cosineSimilarity(a, b []float32) float32 {
	if len(a) != len(b) {
		return 0
	}
	
	var dotProduct, normA, normB float32
	for i := 0; i < len(a); i++ {
		dotProduct += a[i] * b[i]
		normA += a[i] * a[i]
		normB += b[i] * b[i]
	}
	
	if normA == 0 || normB == 0 {
		return 0
	}
	
	// FIXED: Added proper square root for vector norms
	return dotProduct / (float32(math.Sqrt(float64(normA))) * float32(math.Sqrt(float64(normB))))
}

func NewLegalAIQuicServer() *LegalAIQuicServer {
	// Initialize Redis client with better error handling
	rdb := redis.NewClient(&redis.Options{
		Addr:     getEnvOrDefault("REDIS_URL", "localhost:6379"),
		Password: getEnvOrDefault("REDIS_PASSWORD", ""),
		DB:       0,
	})
	
	// Test Redis connection
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis connection failed: %v (continuing without Redis)", err)
	} else {
		log.Println("✅ Redis connection established")
	}

	server := &LegalAIQuicServer{
		redisClient:     rdb,
		workerPool:      make(chan LegalJob, 1000),
		results:         make(chan LegalResult, 1000),
		recommendations: make(chan RecommendationJob, 500),
		vectorDB:        NewVectorDatabase(),
		caseDB:          NewLegalCaseDatabase(),
	}

	// Start worker goroutines
	for i := 0; i < 10; i++ {
		go server.legalWorker(i)
	}
	
	// Start recommendation workers
	for i := 0; i < 5; i++ {
		go server.recommendationWorker(i)
	}

	return server
}

func (s *LegalAIQuicServer) legalWorker(workerID int) {
	for job := range s.workerPool {
		startTime := time.Now()
		log.Printf("🔄 Legal Worker %d processing job %s", workerID, job.JobID)

		result := LegalResult{
			JobID:  job.JobID,
			Status: "processing",
			Metrics: make(map[string]float64),
			Metadata: map[string]interface{}{
				"worker_id":  workerID,
				"started_at": startTime,
			},
		}

		// Process legal document
		response := s.processLegalDocument(job.Request)
		result.Response = response
		
		if response.Success {
			result.Status = "completed"
		} else {
			result.Status = "error"
		}
		
		result.Metadata["completed_at"] = time.Now()
		result.Metrics["processing_time"] = time.Since(startTime).Seconds()

		s.results <- result

		// Store result in Redis with error handling
		if s.redisClient != nil {
			resultJSON, err := json.Marshal(result)
			if err == nil {
				err = s.redisClient.Set(context.Background(),
					fmt.Sprintf("legal_result:%s", job.JobID),
					resultJSON,
					time.Hour*24).Err()
				if err != nil {
					log.Printf("⚠️  Redis store failed for job %s: %v", job.JobID, err)
				}
			}
		}

		log.Printf("✅ Legal Worker %d completed job %s in %.2fs", 
			workerID, job.JobID, time.Since(startTime).Seconds())
	}
}

func (s *LegalAIQuicServer) recommendationWorker(workerID int) {
	for job := range s.recommendations {
		startTime := time.Now()
		log.Printf("🎯 Recommendation Worker %d processing job %s", workerID, job.JobID)
		
		response := s.processRecommendations(job.Request)
		
		// Store result in Redis with error handling
		if s.redisClient != nil {
			resultJSON, err := json.Marshal(response)
			if err == nil {
				err = s.redisClient.Set(context.Background(),
					fmt.Sprintf("recommendation_result:%s", job.JobID),
					resultJSON,
					time.Hour*24).Err()
				if err != nil {
					log.Printf("⚠️  Redis store failed for recommendation job %s: %v", job.JobID, err)
				}
			}
		}
			
		log.Printf("✅ Recommendation Worker %d completed job %s in %.2fs", 
			workerID, job.JobID, time.Since(startTime).Seconds())
	}
}

func (s *LegalAIQuicServer) processLegalDocument(req LegalDocumentRequest) LegalDocumentResponse {
	startTime := time.Now()
	response := LegalDocumentResponse{
		DocumentID: req.DocumentID,
		Success:    true,
	}

	// Mock legal document processing
	if req.Options.ExtractEntities {
		response.KeyEntities = []string{"plaintiff", "defendant", "contract", "damages"}
	}
	
	if req.Options.ClassifyDomain {
		response.LegalDomain = "contract_law"
		response.Confidence = 0.85
	}
	
	if req.Options.AnalyzeSentiment {
		response.SentimentScore = 0.2 // Slightly negative (legal disputes tend to be)
	}
	
	response.ComplexityScore = 7
	response.Summary = fmt.Sprintf("Legal document analysis for %s completed", req.Filename)
	response.LegalConcepts = []string{"breach of contract", "damages", "legal remedy"}
	
	if req.Options.GenerateEmbedding {
		// Generate mock embedding
		embedding := make([]float32, 384)
		for i := range embedding {
			embedding[i] = float32(i) * 0.001
		}
		response.Embedding = embedding
		
		// Store in vector DB
		s.vectorDB.Store(req.DocumentID, embedding)
	}
	
	if req.Options.FindSimilar && len(response.Embedding) > 0 {
		response.SimilarCases = s.vectorDB.Search(response.Embedding, 5)
	}
	
	if req.Options.RiskAssessment {
		response.RiskAssessment = &RiskAssessment{
			OverallRiskScore: 0.6,
			RiskLevel:       "medium",
			RiskFactors: []RiskFactor{
				{
					FactorName:  "Contract Complexity",
					ImpactScore: 0.7,
					Probability: 0.8,
					Description: "Complex contractual terms may lead to disputes",
				},
			},
			MitigationStrategies: []string{"Legal review", "Clear documentation"},
			Confidence:          0.75,
		}
	}
	
	response.ProcessingTimeMs = time.Since(startTime).Milliseconds()
	return response
}

func (s *LegalAIQuicServer) processRecommendations(req RecommendationRequest) RecommendationResponse {
	startTime := time.Now()
	
	// Mock recommendation generation
	recommendations := []LegalRecommendation{
		{
			ID:              "rec_001",
			Title:           "Similar Contract Dispute Precedent",
			Description:     "Review similar case with favorable outcome",
			ConfidenceScore: 0.85,
			LegalDomain:     req.LegalDomain,
			Jurisdiction:    req.Jurisdiction,
			RelevantCases:   []string{"case_001"},
			LegalConcepts:   []string{"contract interpretation", "damages calculation"},
			RecommendationType: "precedent",
		},
		{
			ID:              "rec_002", 
			Title:           "Risk Mitigation Strategy",
			Description:     "Proactive measures to reduce litigation risk",
			ConfidenceScore: 0.72,
			LegalDomain:     req.LegalDomain,
			Jurisdiction:    req.Jurisdiction,
			RecommendationType: "strategy",
		},
	}
	
	return RecommendationResponse{
		Recommendations:  recommendations,
		TotalCount:      int32(len(recommendations)),
		ConfidenceScore: 0.785,
		ProcessingTimeMs: time.Since(startTime).Milliseconds(),
		Success:         true,
	}
}

// HTTP/3 handlers
func (s *LegalAIQuicServer) handleDocumentAnalysis(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req LegalDocumentRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Generate job ID
	jobID := fmt.Sprintf("legal_%d", time.Now().UnixNano())
	job := LegalJob{
		JobID:     jobID,
		Request:   req,
		Operation: "document_analysis",
		Timestamp: time.Now(),
	}

	// Add to worker pool
	select {
	case s.workerPool <- job:
		response := map[string]interface{}{
			"job_id": jobID,
			"status": "queued",
			"message": "Legal document analysis queued",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	default:
		http.Error(w, "Worker pool full", http.StatusServiceUnavailable)
	}
}

func (s *LegalAIQuicServer) handleRecommendations(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	var req RecommendationRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		http.Error(w, "Invalid JSON", http.StatusBadRequest)
		return
	}

	// Generate job ID
	jobID := fmt.Sprintf("rec_%d", time.Now().UnixNano())
	job := RecommendationJob{
		JobID:     jobID,
		Request:   req,
		Timestamp: time.Now(),
	}

	// Add to recommendation worker pool
	select {
	case s.recommendations <- job:
		response := map[string]interface{}{
			"job_id": jobID,
			"status": "queued",
			"message": "Legal recommendations queued",
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(response)
	default:
		http.Error(w, "Recommendation pool full", http.StatusServiceUnavailable)
	}
}

func (s *LegalAIQuicServer) handleResult(w http.ResponseWriter, r *http.Request) {
	jobID := r.URL.Query().Get("job_id")
	if jobID == "" {
		http.Error(w, "Missing job_id parameter", http.StatusBadRequest)
		return
	}

	// Check both legal and recommendation results
	var resultKey string
	if strings.HasPrefix(jobID, "legal_") {
		resultKey = fmt.Sprintf("legal_result:%s", jobID)
	} else if strings.HasPrefix(jobID, "rec_") {
		resultKey = fmt.Sprintf("recommendation_result:%s", jobID)
	} else {
		http.Error(w, "Invalid job_id format", http.StatusBadRequest)
		return
	}

	// Get result from Redis with error handling
	if s.redisClient == nil {
		http.Error(w, "Redis unavailable", http.StatusServiceUnavailable)
		return
	}

	resultJSON, err := s.redisClient.Get(context.Background(), resultKey).Result()
	if err != nil {
		if err == redis.Nil {
			http.Error(w, "Job not found or still processing", http.StatusNotFound)
		} else {
			log.Printf("⚠️  Redis get error for job %s: %v", jobID, err)
			http.Error(w, "Redis error", http.StatusInternalServerError)
		}
		return
	}

	w.Header().Set("Content-Type", "application/json")
	w.Write([]byte(resultJSON))
}

func (s *LegalAIQuicServer) handleHealth(w http.ResponseWriter, r *http.Request) {
	redisStatus := "disconnected"
	if s.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := s.redisClient.Ping(ctx).Err(); err == nil {
			redisStatus = "connected"
		}
	}

	status := map[string]interface{}{
		"status":           "healthy",
		"timestamp":        time.Now(),
		"service":          "Legal AI QUIC Server",
		"redis_status":     redisStatus,
		"worker_pools": map[string]interface{}{
			"legal_workers": map[string]interface{}{
				"capacity":     cap(s.workerPool),
				"queued_jobs":  len(s.workerPool),
			},
			"recommendation_workers": map[string]interface{}{
				"capacity":     cap(s.recommendations),
				"queued_jobs":  len(s.recommendations),
			},
		},
		"vector_db_documents": len(s.vectorDB.vectors),
		"case_db_entries":    len(s.caseDB.cases),
	}

	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(status)
}

func generateTLSConfig() *tls.Config {
	key, err := rsa.GenerateKey(crand.Reader, 2048)
	if err != nil {
		log.Fatal(err)
	}

	template := x509.Certificate{
		SerialNumber: big.NewInt(1),
		Subject: pkix.Name{
			CommonName: "localhost",
		},
		NotBefore:   time.Now(),
		NotAfter:    time.Now().Add(365 * 24 * time.Hour),
		KeyUsage:    x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage: []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		IPAddresses: []net.IP{net.IPv4(127, 0, 0, 1)},
	}

	certDER, err := x509.CreateCertificate(crand.Reader, &template, &template, &key.PublicKey, key)
	if err != nil {
		log.Fatal(err)
	}

	return &tls.Config{
		Certificates: []tls.Certificate{
			{
				Certificate: [][]byte{certDER},
				PrivateKey:  key,
			},
		},
		NextProtos: []string{http3.NextProtoH3},
	}
}

func getEnvOrDefault(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

// findAvailablePort tries to find an available port starting from the preferred port
func findAvailablePort(preferredPort string) string {
	for port := parsePortOrDefault(preferredPort, 4433); port < 5000; port++ {
		addr := fmt.Sprintf(":%d", port)
		ln, err := net.Listen("tcp", addr)
		if err == nil {
			ln.Close()
			return fmt.Sprintf("%d", port)
		}
	}
	return preferredPort // fallback
}

func parsePortOrDefault(portStr string, defaultPort int) int {
	if portStr == "" {
		return defaultPort
	}

	port, err := strconv.Atoi(portStr)
	if err != nil {
		log.Printf("⚠️  Invalid port '%s', using default %d", portStr, defaultPort)
		return defaultPort
	}

	// Validate port range
	if port < 1024 || port > 65535 {
		log.Printf("⚠️  Port %d out of valid range (1024-65535), using default %d", port, defaultPort)
		return defaultPort
	}

	return port
}

func main() {
	// Configure logging with better format
	log.SetFlags(log.LstdFlags | log.Lshortfile)
	log.Println("🔧 Initializing Legal AI QUIC Server...")

	// Initialize server with error handling
	server := NewLegalAIQuicServer()
	if server == nil {
		log.Fatal("❌ Failed to initialize Legal AI QUIC Server")
	}

	// Create auth handler with error handling
	authHandler := NewAuthHandler(server.redisClient)
	if authHandler == nil {
		log.Fatal("❌ Failed to initialize authentication handler")
	}

	// Setup HTTP/3 routes with CORS support
	mux := http.NewServeMux()

	// Add CORS middleware wrapper
	corsWrapper := func(next http.HandlerFunc) http.HandlerFunc {
		return func(w http.ResponseWriter, r *http.Request) {
			w.Header().Set("Access-Control-Allow-Origin", "*")
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-Session-ID")

			if r.Method == "OPTIONS" {
				w.WriteHeader(http.StatusOK)
				return
			}

			next(w, r)
		}
	}

	// Authentication routes with CORS
	mux.HandleFunc("/auth/register", corsWrapper(authHandler.HandleRegister))
	mux.HandleFunc("/auth/login", corsWrapper(authHandler.HandleLogin))
	mux.HandleFunc("/auth/validate", corsWrapper(authHandler.HandleValidateSession))
	mux.HandleFunc("/auth/logout", corsWrapper(authHandler.HandleLogout))

	// Protected legal AI routes with CORS and auth
	mux.HandleFunc("/legal/analyze", corsWrapper(authHandler.RequireAuth(server.handleDocumentAnalysis)))
	mux.HandleFunc("/legal/recommend", corsWrapper(authHandler.RequireAuth(server.handleRecommendations)))
	mux.HandleFunc("/legal/result", corsWrapper(server.handleResult))
	mux.HandleFunc("/health", corsWrapper(server.handleHealth))

	// Add root handler for service info
	mux.HandleFunc("/", corsWrapper(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/" {
			http.NotFound(w, r)
			return
		}

		info := map[string]interface{}{
			"service":     "Legal AI QUIC Server",
			"version":     "1.0.0",
			"status":      "running",
			"protocol":    "HTTP/3 over QUIC",
			"endpoints": []string{
				"POST /auth/register",
				"POST /auth/login",
				"POST /auth/logout",
				"GET  /auth/validate",
				"POST /legal/analyze",
				"POST /legal/recommend",
				"GET  /legal/result",
				"GET  /health",
			},
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(info)
	}))

	// Improved port handling with validation
	preferredPort := getEnvOrDefault("QUIC_PORT", "4433")
	port := findAvailablePort(preferredPort)

	// Generate TLS config with validation
	tlsConfig := generateTLSConfig()
	if tlsConfig == nil {
		log.Fatal("❌ Failed to generate TLS configuration")
	}

	// Start QUIC/HTTP3 server with enhanced configuration
	quicServer := &http3.Server{
		Handler:   mux,
		Addr:      ":" + port,
		TLSConfig: tlsConfig,
	}

	// Enhanced startup logging
	log.Println("🚀 Legal AI QUIC Server starting...")
	log.Printf("📡 Listening on port: %s (HTTP/3 over QUIC)", port)
	log.Printf("🔒 TLS: Self-signed certificate generated")

	// Log Redis connection status
	redisStatus := "disconnected"
	if server.redisClient != nil {
		ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
		defer cancel()
		if err := server.redisClient.Ping(ctx).Err(); err == nil {
			redisStatus = "connected"
		}
	}
	log.Printf("🗄️  Redis: %s", redisStatus)

	log.Println("📚 Vector database initialized")
	log.Println("⚖️  Legal case database loaded")
	log.Println("⚡ Worker pools ready:")
	log.Printf("   - Legal analysis workers: %d (queue: %d/%d)",
		10, len(server.workerPool), cap(server.workerPool))
	log.Printf("   - Recommendation workers: %d (queue: %d/%d)",
		5, len(server.recommendations), cap(server.recommendations))

	log.Println("🌐 API Endpoints available:")
	log.Printf("   - POST /auth/register     (User Registration)")
	log.Printf("   - POST /auth/login        (User Login)")
	log.Printf("   - POST /auth/logout       (User Logout)")
	log.Printf("   - GET  /auth/validate     (Session Validation)")
	log.Printf("   - POST /legal/analyze     (Document Analysis - Protected)")
	log.Printf("   - POST /legal/recommend   (Legal Recommendations - Protected)")
	log.Printf("   - GET  /legal/result      (Job Results)")
	log.Printf("   - GET  /health            (Server Health Check)")
	log.Printf("   - GET  /                  (Service Information)")

	log.Println("✅ Legal AI QUIC Server ready for connections!")

	// Start server with comprehensive error handling
	if err := quicServer.ListenAndServe(); err != nil {
		log.Printf("❌ QUIC server startup failed: %v", err)
		log.Println("💡 Troubleshooting suggestions:")
		log.Printf("   - Verify port %s is not in use: lsof -i :%s", port, port)
		log.Println("   - Check if QUIC/HTTP3 is supported in your environment")
		log.Println("   - Try a different port: QUIC_PORT=4434 ./legal-ai-quic-server-fixed")
		log.Println("   - Ensure proper firewall configuration")
		log.Fatal("❌ Unable to start Legal AI QUIC server")
	}
}