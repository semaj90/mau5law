package main

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gorilla/mux"
	"github.com/gorilla/websocket"
	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
	"github.com/rs/cors"
)

// Streaming PDF Processor with Hierarchical Chunking
// Port 8103 - Handles 200+ page legal documents efficiently
// Features: MinIO streaming, sentence-aware chunking, hierarchical summarization

type StreamingProcessor struct {
	minioClient *minio.Client
	logger      *log.Logger
	upgrader    websocket.Upgrader
}

type ChunkMetadata struct {
	ChunkID       string    `json:"chunk_id"`
	DocumentID    string    `json:"document_id"`
	PageRange     string    `json:"page_range"`
	StartOffset   int64     `json:"start_offset"`
	EndOffset     int64     `json:"end_offset"`
	TokenCount    int       `json:"token_count"`
	SentenceCount int       `json:"sentence_count"`
	ChunkType     string    `json:"chunk_type"` // paragraph, section, page, overlap
	CreatedAt     time.Time `json:"created_at"`
}

type ProcessedChunk struct {
	Metadata      ChunkMetadata          `json:"metadata"`
	Content       string                 `json:"content"`
	Entities      []LegalEntity          `json:"entities,omitempty"`
	Embedding     []float32              `json:"embedding,omitempty"`
	LocalSummary  string                 `json:"local_summary,omitempty"`
	Relationships []LegalRelationship    `json:"relationships,omitempty"`
	Attributes    map[string]interface{} `json:"attributes"`
}

type LegalEntity struct {
	ID         string                 `json:"id"`
	Type       string                 `json:"type"`
	Text       string                 `json:"text"`
	Confidence float64                `json:"confidence"`
	StartPos   int                    `json:"start_pos"`
	EndPos     int                    `json:"end_pos"`
	Attributes map[string]interface{} `json:"attributes"`
}

type LegalRelationship struct {
	ID         string                 `json:"id"`
	FromEntity string                 `json:"from_entity"`
	ToEntity   string                 `json:"to_entity"`
	Type       string                 `json:"type"`
	Confidence float64                `json:"confidence"`
	Attributes map[string]interface{} `json:"attributes"`
}

type StreamingRequest struct {
	DocumentID   string                 `json:"document_id"`
	MinIOPath    string                 `json:"minio_path"`
	ChunkSize    int                    `json:"chunk_size"`    // tokens per chunk
	OverlapSize  int                    `json:"overlap_size"`  // overlap between chunks
	ProcessingOptions map[string]bool   `json:"processing_options"`
	Metadata     map[string]interface{} `json:"metadata"`
}

type StreamingResponse struct {
	DocumentID    string           `json:"document_id"`
	TotalChunks   int              `json:"total_chunks"`
	ProcessedChunks int            `json:"processed_chunks"`
	CurrentChunk  *ProcessedChunk  `json:"current_chunk,omitempty"`
	Status        string           `json:"status"`
	Progress      float64          `json:"progress"`
	Timestamp     time.Time        `json:"timestamp"`
	Error         string           `json:"error,omitempty"`
}

type HierarchicalSummary struct {
	DocumentID      string                   `json:"document_id"`
	ExecutiveSummary string                   `json:"executive_summary"`
	SectionSummaries []SectionSummary         `json:"section_summaries"`
	GlobalSummary   string                   `json:"global_summary"`
	KeyEntities     []LegalEntity            `json:"key_entities"`
	CriticalFindings []string                 `json:"critical_findings"`
	LegalPrecedents []string                 `json:"legal_precedents"`
	Metadata        map[string]interface{}   `json:"metadata"`
	CreatedAt       time.Time                `json:"created_at"`
}

type SectionSummary struct {
	SectionTitle string    `json:"section_title"`
	PageRange    string    `json:"page_range"`
	Summary      string    `json:"summary"`
	KeyPoints    []string  `json:"key_points"`
	Entities     []string  `json:"entities"`
	TokenCount   int       `json:"token_count"`
}

func NewStreamingProcessor() (*StreamingProcessor, error) {
	// MinIO configuration
	endpoint := getEnv("MINIO_ENDPOINT", "localhost:9000")
	accessKey := getEnv("MINIO_ACCESS_KEY", "minioadmin")
	secretKey := getEnv("MINIO_SECRET_KEY", "minioadmin")
	useSSL := getEnv("MINIO_USE_SSL", "false") == "true"

	client, err := minio.New(endpoint, &minio.Options{
		Creds:  credentials.NewStaticV4(accessKey, secretKey, ""),
		Secure: useSSL,
	})
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	logger := log.New(os.Stdout, "[STREAMING-PROCESSOR] ", log.LstdFlags)

	upgrader := websocket.Upgrader{
		CheckOrigin: func(r *http.Request) bool { return true },
	}

	return &StreamingProcessor{
		minioClient: client,
		logger:      logger,
		upgrader:    upgrader,
	}, nil
}

func (sp *StreamingProcessor) StreamDocumentFromMinIO(ctx context.Context, bucketName, objectName string) (io.Reader, error) {
	object, err := sp.minioClient.GetObject(ctx, bucketName, objectName, minio.GetObjectOptions{})
	if err != nil {
		return nil, fmt.Errorf("failed to get object from MinIO: %w", err)
	}

	return object, nil
}

func (sp *StreamingProcessor) SentenceAwareChunker(text string, chunkSize, overlapSize int) []ProcessedChunk {
	// Sentence boundary detection with legal document awareness
	sentenceRegex := regexp.MustCompile(`[.!?]+\s+(?=[A-Z])|(?:\n\s*){2,}|(?:§\s*\d+)|(?:Art\.\s*\d+)`)
	sentences := sentenceRegex.Split(text, -1)

	var chunks []ProcessedChunk
	var currentChunk strings.Builder
	var currentTokens int
	chunkIndex := 0

	for _, sentence := range sentences {
		sentence = strings.TrimSpace(sentence)
		if sentence == "" {
			continue
		}

		// Estimate tokens (rough approximation: 1 token ≈ 4 characters)
		sentenceTokens := len(sentence) / 4

		// Check if adding this sentence would exceed chunk size
		if currentTokens+sentenceTokens > chunkSize && currentTokens > 0 {
			// Create chunk
			chunk := ProcessedChunk{
				Metadata: ChunkMetadata{
					ChunkID:       fmt.Sprintf("chunk_%d", chunkIndex),
					PageRange:     fmt.Sprintf("estimated_%d-%d", chunkIndex*10, (chunkIndex+1)*10),
					TokenCount:    currentTokens,
					SentenceCount: len(strings.Split(currentChunk.String(), ".")),
					ChunkType:     "sentence_aware",
					CreatedAt:     time.Now(),
				},
				Content:    currentChunk.String(),
				Attributes: make(map[string]interface{}),
			}

			chunks = append(chunks, chunk)

			// Start new chunk with overlap
			if overlapSize > 0 {
				overlapText := sp.getLastNTokens(currentChunk.String(), overlapSize)
				currentChunk.Reset()
				currentChunk.WriteString(overlapText)
				currentTokens = len(overlapText) / 4
			} else {
				currentChunk.Reset()
				currentTokens = 0
			}
			chunkIndex++
		}

		currentChunk.WriteString(sentence + ". ")
		currentTokens += sentenceTokens
	}

	// Add final chunk
	if currentTokens > 0 {
		chunk := ProcessedChunk{
			Metadata: ChunkMetadata{
				ChunkID:       fmt.Sprintf("chunk_%d", chunkIndex),
				PageRange:     fmt.Sprintf("estimated_%d-end", chunkIndex*10),
				TokenCount:    currentTokens,
				SentenceCount: len(strings.Split(currentChunk.String(), ".")),
				ChunkType:     "sentence_aware",
				CreatedAt:     time.Now(),
			},
			Content:    currentChunk.String(),
			Attributes: make(map[string]interface{}),
		}
		chunks = append(chunks, chunk)
	}

	return chunks
}

func (sp *StreamingProcessor) getLastNTokens(text string, n int) string {
	words := strings.Fields(text)
	if len(words) <= n {
		return text
	}
	return strings.Join(words[len(words)-n:], " ")
}

func (sp *StreamingProcessor) ProcessChunkWithPython(chunk *ProcessedChunk) error {
	// Call Python OCR + NER + Embedding service
	payload := map[string]interface{}{
		"chunk_id": chunk.Metadata.ChunkID,
		"content":  chunk.Content,
		"options": map[string]bool{
			"extract_entities": true,
			"generate_embedding": true,
			"local_summary": true,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("failed to marshal chunk data: %w", err)
	}

	// Call Python service (assuming it's running on port 8888)
	resp, err := http.Post("http://localhost:8888/process-chunk", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return fmt.Errorf("failed to call Python service: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("Python service returned status %d", resp.StatusCode)
	}

	var result struct {
		Entities      []LegalEntity       `json:"entities"`
		Embedding     []float32           `json:"embedding"`
		LocalSummary  string              `json:"local_summary"`
		Relationships []LegalRelationship `json:"relationships"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("failed to decode Python response: %w", err)
	}

	// Update chunk with processed data
	chunk.Entities = result.Entities
	chunk.Embedding = result.Embedding
	chunk.LocalSummary = result.LocalSummary
	chunk.Relationships = result.Relationships

	return nil
}

func (sp *StreamingProcessor) CreateHierarchicalSummary(chunks []ProcessedChunk, documentID string) (*HierarchicalSummary, error) {
	// Aggregate local summaries into section summaries
	var sectionSummaries []SectionSummary
	var allEntities []LegalEntity
	var globalSummaryContent strings.Builder

	// Group chunks into sections (every 10 chunks = 1 section for example)
	sectionSize := 10
	for i := 0; i < len(chunks); i += sectionSize {
		end := i + sectionSize
		if end > len(chunks) {
			end = len(chunks)
		}

		sectionChunks := chunks[i:end]
		var sectionContent strings.Builder
		var sectionEntities []string
		var totalTokens int

		for _, chunk := range sectionChunks {
			sectionContent.WriteString(chunk.LocalSummary + " ")
			totalTokens += chunk.Metadata.TokenCount

			for _, entity := range chunk.Entities {
				sectionEntities = append(sectionEntities, entity.Text)
				allEntities = append(allEntities, entity)
			}
		}

		// Generate section summary using Gemma3
		sectionSummary, err := sp.callGemma3Summarizer(sectionContent.String(), "section")
		if err != nil {
			sp.logger.Printf("Warning: Failed to generate section summary: %v", err)
			sectionSummary = "Summary generation failed"
		}

		section := SectionSummary{
			SectionTitle: fmt.Sprintf("Section %d", (i/sectionSize)+1),
			PageRange:    fmt.Sprintf("%d-%d", i*10, end*10),
			Summary:      sectionSummary,
			KeyPoints:    sp.extractKeyPoints(sectionContent.String()),
			Entities:     sp.deduplicateStrings(sectionEntities),
			TokenCount:   totalTokens,
		}

		sectionSummaries = append(sectionSummaries, section)
		globalSummaryContent.WriteString(sectionSummary + " ")
	}

	// Generate global summary from section summaries
	globalSummary, err := sp.callGemma3Summarizer(globalSummaryContent.String(), "global")
	if err != nil {
		sp.logger.Printf("Warning: Failed to generate global summary: %v", err)
		globalSummary = "Global summary generation failed"
	}

	// Generate executive summary (ultra-concise)
	executiveSummary, err := sp.callGemma3Summarizer(globalSummary, "executive")
	if err != nil {
		sp.logger.Printf("Warning: Failed to generate executive summary: %v", err)
		executiveSummary = "Executive summary generation failed"
	}

	return &HierarchicalSummary{
		DocumentID:       documentID,
		ExecutiveSummary: executiveSummary,
		SectionSummaries: sectionSummaries,
		GlobalSummary:    globalSummary,
		KeyEntities:      sp.deduplicateEntities(allEntities),
		CriticalFindings: sp.extractCriticalFindings(globalSummary),
		LegalPrecedents:  sp.extractLegalPrecedents(globalSummary),
		Metadata: map[string]interface{}{
			"total_sections": len(sectionSummaries),
			"total_chunks":   len(chunks),
			"processing_time": time.Now(),
		},
		CreatedAt: time.Now(),
	}, nil
}

func (sp *StreamingProcessor) callGemma3Summarizer(content, summaryType string) (string, error) {
	prompt := sp.buildSummaryPrompt(content, summaryType)

	payload := map[string]interface{}{
		"model":  "gemma3:latest",
		"prompt": prompt,
		"stream": false,
		"options": map[string]interface{}{
			"temperature": 0.3,
			"top_p":       0.9,
			"max_tokens":  500,
		},
	}

	jsonData, err := json.Marshal(payload)
	if err != nil {
		return "", err
	}

	resp, err := http.Post("http://localhost:11434/api/generate", "application/json", bytes.NewBuffer(jsonData))
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	var result struct {
		Response string `json:"response"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}

	return result.Response, nil
}

func (sp *StreamingProcessor) buildSummaryPrompt(content, summaryType string) string {
	switch summaryType {
	case "section":
		return fmt.Sprintf(`Summarize this legal document section in 2-3 sentences, focusing on key legal concepts, entities, and obligations:

%s

Summary:`, content)

	case "global":
		return fmt.Sprintf(`Create a comprehensive summary of this legal document based on the section summaries below. Include key parties, main obligations, important dates, and legal implications:

%s

Comprehensive Summary:`, content)

	case "executive":
		return fmt.Sprintf(`Create a 1-paragraph executive summary for legal professionals from this content:

%s

Executive Summary:`, content)

	default:
		return fmt.Sprintf(`Summarize the following legal content:

%s

Summary:`, content)
	}
}

func (sp *StreamingProcessor) extractKeyPoints(text string) []string {
	// Simple key point extraction using regex patterns
	patterns := []string{
		`(?i)(shall|must|required|obligated|liable).*?[.!?]`,
		`(?i)(party|plaintiff|defendant|appellant).*?[.!?]`,
		`(?i)(damages?|compensation|penalty).*?[.!?]`,
		`(?i)(contract|agreement|statute|law).*?[.!?]`,
	}

	var keyPoints []string
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(text, -1)
		keyPoints = append(keyPoints, matches...)
	}

	// Limit to top 5 key points
	if len(keyPoints) > 5 {
		keyPoints = keyPoints[:5]
	}

	return keyPoints
}

func (sp *StreamingProcessor) extractCriticalFindings(text string) []string {
	patterns := []string{
		`(?i)(violation|breach|damages|liability|penalty).*?[.!?]`,
		`(?i)(ruled|held|decided|judgment).*?[.!?]`,
		`(?i)(guilty|liable|responsible|at fault).*?[.!?]`,
	}

	var findings []string
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(text, -1)
		findings = append(findings, matches...)
	}

	return sp.deduplicateStrings(findings)
}

func (sp *StreamingProcessor) extractLegalPrecedents(text string) []string {
	patterns := []string{
		`\b\w+\s+v\.?\s+\w+.*?\d{1,4}\b`,
		`\b\d+\s+U\.S\.C?\.\s*§?\s*\d+`,
		`\b\d+\s+F\.\d+d?\s+\d+`,
	}

	var precedents []string
	for _, pattern := range patterns {
		re := regexp.MustCompile(pattern)
		matches := re.FindAllString(text, -1)
		precedents = append(precedents, matches...)
	}

	return sp.deduplicateStrings(precedents)
}

func (sp *StreamingProcessor) deduplicateStrings(items []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, item := range items {
		if !seen[item] {
			seen[item] = true
			result = append(result, item)
		}
	}

	return result
}

func (sp *StreamingProcessor) deduplicateEntities(entities []LegalEntity) []LegalEntity {
	seen := make(map[string]bool)
	var result []LegalEntity

	for _, entity := range entities {
		key := entity.Type + ":" + entity.Text
		if !seen[key] {
			seen[key] = true
			result = append(result, entity)
		}
	}

	return result
}

// HTTP Handlers

func (sp *StreamingProcessor) handleStreamingProcess(w http.ResponseWriter, r *http.Request) {
	conn, err := sp.upgrader.Upgrade(w, r, nil)
	if err != nil {
		sp.logger.Printf("WebSocket upgrade failed: %v", err)
		return
	}
	defer conn.Close()

	var req StreamingRequest
	if err := conn.ReadJSON(&req); err != nil {
		sp.logger.Printf("Failed to read request: %v", err)
		return
	}

	ctx := context.Background()

	// Stream document from MinIO
	reader, err := sp.StreamDocumentFromMinIO(ctx, "legal-documents", req.MinIOPath)
	if err != nil {
		conn.WriteJSON(StreamingResponse{
			Status: "error",
			Error:  fmt.Sprintf("Failed to stream from MinIO: %v", err),
		})
		return
	}

	// Read content (for PDFs, this would integrate with OCR)
	content, err := io.ReadAll(reader)
	if err != nil {
		conn.WriteJSON(StreamingResponse{
			Status: "error",
			Error:  fmt.Sprintf("Failed to read content: %v", err),
		})
		return
	}

	// Create sentence-aware chunks
	chunks := sp.SentenceAwareChunker(string(content), req.ChunkSize, req.OverlapSize)

	// Process chunks with streaming updates
	for chunkIndex, chunk := range chunks {
		chunk.Metadata.DocumentID = req.DocumentID

		// Process chunk with Python services
		if err := sp.ProcessChunkWithPython(&chunk); err != nil {
			sp.logger.Printf("Warning: Failed to process chunk %s: %v", chunk.Metadata.ChunkID, err)
		}

		// Send progress update
		progress := float64(chunkIndex+1) / float64(len(chunks)) * 100
		response := StreamingResponse{
			DocumentID:      req.DocumentID,
			TotalChunks:     len(chunks),
			ProcessedChunks: chunkIndex + 1,
			CurrentChunk:    &chunk,
			Status:          "processing",
			Progress:        progress,
			Timestamp:       time.Now(),
		}

		if err := conn.WriteJSON(response); err != nil {
			sp.logger.Printf("Failed to send progress update: %v", err)
			return
		}

		// Store chunk in PostgreSQL + Neo4j here
		// ... (database operations)
	}

	// Create hierarchical summary
	_, err = sp.CreateHierarchicalSummary(chunks, req.DocumentID)
	if err != nil {
		sp.logger.Printf("Failed to create hierarchical summary: %v", err)
	}

	// Final response
	finalResponse := StreamingResponse{
		DocumentID:      req.DocumentID,
		TotalChunks:     len(chunks),
		ProcessedChunks: len(chunks),
		Status:          "completed",
		Progress:        100.0,
		Timestamp:       time.Now(),
	}

	conn.WriteJSON(finalResponse)
	sp.logger.Printf("Completed processing document %s with %d chunks", req.DocumentID, len(chunks))
}

func (sp *StreamingProcessor) handleHealth(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "application/json")
	json.NewEncoder(w).Encode(map[string]interface{}{
		"service":   "streaming-pdf-processor",
		"status":    "healthy",
		"timestamp": time.Now(),
		"capabilities": map[string]bool{
			"minio_streaming":        true,
			"sentence_aware_chunking": true,
			"hierarchical_summarization": true,
			"python_integration":     true,
			"websocket_streaming":    true,
		},
	})
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func main() {
	processor, err := NewStreamingProcessor()
	if err != nil {
		log.Fatalf("Failed to initialize streaming processor: %v", err)
	}

	r := mux.NewRouter()

	// Streaming endpoints
	r.HandleFunc("/api/v1/stream/process", processor.handleStreamingProcess)
	r.HandleFunc("/api/v1/health", processor.handleHealth).Methods("GET")

	// Enable CORS
	c := cors.New(cors.Options{
		AllowedOrigins: []string{"*"},
		AllowedMethods: []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"*"},
	})

	handler := c.Handler(r)

	port := getEnv("PORT", "8103")
	processor.logger.Printf("Streaming PDF Processor starting on port %s", port)
	processor.logger.Printf("Endpoints:")
	processor.logger.Printf("  WS  /api/v1/stream/process - Stream process 200+ page documents")
	processor.logger.Printf("  GET /api/v1/health - Service health check")

	log.Fatal(http.ListenAndServe(":"+port, handler))
}