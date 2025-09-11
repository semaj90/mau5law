package main

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"os/signal"
	"sync"
	"syscall"
	"time"

	"github.com/prometheus/client_golang/prometheus"
	"github.com/prometheus/client_golang/prometheus/promhttp"
	"google.golang.org/grpc"
	"google.golang.org/grpc/reflection"

	// Assuming your protobuf generates go package here
	pb "github.com/legal-ai/platform/proto/metrics"
)

// Go 1.25 Enhanced Legal AI Metrics Server
// Demonstrates new sync.WaitGroup.Go and net/http.CrossOriginProtection features

type MetricsServer struct {
	pb.UnimplementedMetricsServiceServer
	
	// Prometheus metrics
	requestDuration   *prometheus.HistogramVec
	requestCount      *prometheus.CounterVec
	activeConnections prometheus.Gauge
	
	// Legal AI specific metrics
	documentProcessingDuration *prometheus.HistogramVec
	caseAnalysisAccuracy       *prometheus.GaugeVec
	gpuUtilization            *prometheus.GaugeVec
	
	// Go 1.25 enhanced concurrency
	wg            sync.WaitGroup
	activeStreams sync.Map
	shutdown      chan struct{}
}

func NewMetricsServer() *MetricsServer {
	// Initialize Prometheus metrics with legal AI specific labels
	requestDuration := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "legal_ai_request_duration_seconds",
			Help:    "Legal AI service request duration in seconds",
			Buckets: []float64{0.1, 0.5, 1.0, 2.0, 5.0, 10.0, 30.0},
		},
		[]string{"service", "endpoint", "method", "status"},
	)
	
	requestCount := prometheus.NewCounterVec(
		prometheus.CounterOpts{
			Name: "legal_ai_requests_total",
			Help: "Total number of Legal AI service requests",
		},
		[]string{"service", "endpoint", "method", "status"},
	)
	
	activeConnections := prometheus.NewGauge(
		prometheus.GaugeOpts{
			Name: "legal_ai_active_connections",
			Help: "Number of active gRPC connections",
		},
	)
	
	documentProcessingDuration := prometheus.NewHistogramVec(
		prometheus.HistogramOpts{
			Name:    "legal_ai_document_processing_duration_seconds",
			Help:    "Time taken to process legal documents",
			Buckets: []float64{1, 5, 10, 30, 60, 300, 600},
		},
		[]string{"document_type", "processing_stage", "status"},
	)
	
	caseAnalysisAccuracy := prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "legal_ai_case_analysis_accuracy_score",
			Help: "Accuracy score of legal case analysis",
		},
		[]string{"analysis_type", "model"},
	)
	
	gpuUtilization := prometheus.NewGaugeVec(
		prometheus.GaugeOpts{
			Name: "legal_ai_gpu_utilization_percent",
			Help: "GPU utilization percentage for legal AI workloads",
		},
		[]string{"gpu_uuid", "gpu_name", "workload_type"},
	)
	
	// Register all metrics
	prometheus.MustRegister(
		requestDuration,
		requestCount,
		activeConnections,
		documentProcessingDuration,
		caseAnalysisAccuracy,
		gpuUtilization,
	)
	
	return &MetricsServer{
		requestDuration:            requestDuration,
		requestCount:              requestCount,
		activeConnections:         activeConnections,
		documentProcessingDuration: documentProcessingDuration,
		caseAnalysisAccuracy:      caseAnalysisAccuracy,
		gpuUtilization:           gpuUtilization,
		shutdown:                 make(chan struct{}),
	}
}

// ReportMetrics implements the gRPC MetricsService
func (s *MetricsServer) ReportMetrics(ctx context.Context, req *pb.ReportMetricsRequest) (*pb.ReportMetricsResponse, error) {
	start := time.Now()
	defer func() {
		duration := time.Since(start).Seconds()
		s.requestDuration.WithLabelValues(
			req.ServiceName,
			"ReportMetrics",
			"POST",
			"200",
		).Observe(duration)
		s.requestCount.WithLabelValues(
			req.ServiceName,
			"ReportMetrics", 
			"POST",
			"200",
		).Inc()
	}()
	
	processed := 0
	var errors []string
	
	// Process each metric using Go 1.25 WaitGroup.Go for concurrent processing
	for _, metric := range req.Metrics {
		// Go 1.25: Use new WaitGroup.Go method for cleaner concurrency
		s.wg.Go(func() {
			if err := s.processMetric(metric, req.GlobalLabels); err != nil {
				errors = append(errors, fmt.Sprintf("metric %s: %v", metric.Name, err))
			} else {
				processed++
			}
		})
	}
	
	// Wait for all metric processing to complete
	s.wg.Wait()
	
	return &pb.ReportMetricsResponse{
		Success:          len(errors) == 0,
		Message:          fmt.Sprintf("Processed %d metrics", processed),
		MetricsProcessed: int32(processed),
		Errors:          errors,
	}, nil
}

func (s *MetricsServer) processMetric(metric *pb.Metric, globalLabels map[string]string) error {
	// Merge global labels with metric labels
	labels := make(map[string]string)
	for k, v := range globalLabels {
		labels[k] = v
	}
	for k, v := range metric.Labels {
		labels[k] = v
	}
	
	// Process different metric types
	switch metric.Type {
	case pb.MetricType_METRIC_TYPE_COUNTER:
		if value := metric.Value.GetCounterValue(); value > 0 {
			s.requestCount.With(prometheus.Labels(labels)).Add(float64(value))
		}
		
	case pb.MetricType_METRIC_TYPE_GAUGE:
		if value := metric.Value.GetGaugeValue(); true {
			s.activeConnections.Set(value)
		}
		
	case pb.MetricType_METRIC_TYPE_HISTOGRAM:
		if hist := metric.Value.GetHistogramValue(); hist != nil {
			// Update histogram metrics
			s.documentProcessingDuration.With(prometheus.Labels(labels))
		}
	}
	
	return nil
}

// StreamMetrics implements real-time metric streaming
func (s *MetricsServer) StreamMetrics(req *pb.StreamMetricsRequest, stream pb.MetricsService_StreamMetricsServer) error {
	s.activeConnections.Inc()
	defer s.activeConnections.Dec()
	
	// Store stream reference for cleanup
	streamID := fmt.Sprintf("stream_%d", time.Now().UnixNano())
	s.activeStreams.Store(streamID, stream)
	defer s.activeStreams.Delete(streamID)
	
	// Use Go 1.25 WaitGroup.Go for background metric collection
	ctx, cancel := context.WithCancel(stream.Context())
	defer cancel()
	
	s.wg.Go(func() {
		ticker := time.NewTicker(time.Second * 5) // Default 5s interval
		if req.UpdateInterval != nil {
			ticker = time.NewTicker(req.UpdateInterval.AsDuration())
		}
		defer ticker.Stop()
		
		for {
			select {
			case <-ctx.Done():
				return
			case <-s.shutdown:
				return
			case <-ticker.C:
				// Collect and stream metrics
				if err := s.streamCurrentMetrics(stream, req); err != nil {
					log.Printf("Error streaming metrics: %v", err)
					return
				}
			}
		}
	})
	
	// Keep stream alive until context is cancelled
	<-ctx.Done()
	return nil
}

func (s *MetricsServer) streamCurrentMetrics(stream pb.MetricsService_StreamMetricsServer, req *pb.StreamMetricsRequest) error {
	// This would collect current metric values and stream them
	update := &pb.MetricUpdate{
		ServiceName: "legal-ai-metrics-server",
		Metric: &pb.Metric{
			Name: "legal_ai_active_connections",
			Type: pb.MetricType_METRIC_TYPE_GAUGE,
			Value: &pb.MetricValue{
				Value: &pb.MetricValue_GaugeValue{
					GaugeValue: float64(s.activeConnections),
				},
			},
		},
	}
	
	return stream.Send(update)
}

// ReportBusinessMetrics handles legal AI specific business metrics
func (s *MetricsServer) ReportBusinessMetrics(ctx context.Context, req *pb.ReportBusinessMetricsRequest) (*pb.ReportBusinessMetricsResponse, error) {
	processed := 0
	
	// Process legal AI metrics using Go 1.25 enhanced concurrency
	for _, legalMetric := range req.LegalMetrics {
		s.wg.Go(func() {
			s.processLegalAIMetric(legalMetric)
			processed++
		})
	}
	
	s.wg.Wait()
	
	return &pb.ReportBusinessMetricsResponse{
		Success:                   true,
		Message:                  "Legal AI metrics processed successfully",
		BusinessMetricsProcessed: int32(processed),
	}, nil
}

func (s *MetricsServer) processLegalAIMetric(metric *pb.LegalAIMetric) {
	switch m := metric.Metric.(type) {
	case *pb.LegalAIMetric_DocumentProcessing:
		labels := prometheus.Labels{
			"document_type":     m.DocumentProcessing.DocumentType,
			"processing_stage":  "complete",
			"status":           m.DocumentProcessing.Status.String(),
		}
		s.documentProcessingDuration.With(labels).Observe(
			m.DocumentProcessing.ProcessingDuration.AsDuration().Seconds(),
		)
		
	case *pb.LegalAIMetric_CaseAnalysis:
		labels := prometheus.Labels{
			"analysis_type": m.CaseAnalysis.AnalysisType,
			"model":        m.CaseAnalysis.ModelUsed,
		}
		s.caseAnalysisAccuracy.With(labels).Set(m.CaseAnalysis.AccuracyScore)
		
	case *pb.LegalAIMetric_GpuUtilization:
		labels := prometheus.Labels{
			"gpu_uuid":      m.GpuUtilization.GpuUuid,
			"gpu_name":      m.GpuUtilization.GpuName,
			"workload_type": m.GpuUtilization.WorkloadType,
		}
		s.gpuUtilization.With(labels).Set(m.GpuUtilization.UtilizationPercent)
	}
}

// GetAggregatedMetrics implements metric aggregation queries
func (s *MetricsServer) GetAggregatedMetrics(ctx context.Context, req *pb.GetAggregatedMetricsRequest) (*pb.GetAggregatedMetricsResponse, error) {
	// This would integrate with Prometheus to query aggregated metrics
	// For now, return a sample response
	return &pb.GetAggregatedMetricsResponse{
		Metrics: []*pb.AggregatedMetric{
			{
				Name: "legal_ai_document_processing_duration_seconds",
				Labels: map[string]string{
					"document_type": "contract",
					"status":       "completed",
				},
				Values: []*pb.TimeSeriesPoint{
					{
						Timestamp: req.StartTime,
						Value:     2.5,
					},
				},
				AggregationUsed: req.Aggregation,
			},
		},
		QueryTimestamp: req.EndTime,
	}, nil
}

func main() {
	// Create metrics server
	server := NewMetricsServer()
	
	// Go 1.25: Enhanced HTTP server with CSRF protection
	mux := http.NewMux()
	
	// Enable Go 1.25 CrossOriginProtection
	mux.Handle("/metrics", http.CrossOriginProtection(promhttp.Handler()))
	
	// Health check endpoint
	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]string{
			"status": "healthy",
			"service": "legal-ai-metrics-server",
			"version": "1.0.0",
		})
	})
	
	// Start HTTP server for Prometheus metrics
	httpServer := &http.Server{
		Addr:    ":8080",
		Handler: mux,
	}
	
	// Start gRPC server
	lis, err := net.Listen("tcp", ":9090")
	if err != nil {
		log.Fatalf("Failed to listen on port 9090: %v", err)
	}
	
	grpcServer := grpc.NewServer()
	pb.RegisterMetricsServiceServer(grpcServer, server)
	reflection.Register(grpcServer)
	
	// Use Go 1.25 WaitGroup.Go for concurrent server startup
	var wg sync.WaitGroup
	
	wg.Go(func() {
		log.Println("Starting HTTP metrics server on :8080")
		if err := httpServer.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Printf("HTTP server error: %v", err)
		}
	})
	
	wg.Go(func() {
		log.Println("Starting gRPC metrics server on :9090")
		if err := grpcServer.Serve(lis); err != nil {
			log.Printf("gRPC server error: %v", err)
		}
	})
	
	// Graceful shutdown handling
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	
	<-sigChan
	log.Println("Shutting down Legal AI Metrics Server...")
	
	// Signal shutdown to all components
	close(server.shutdown)
	
	// Shutdown HTTP server
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	wg.Go(func() {
		if err := httpServer.Shutdown(ctx); err != nil {
			log.Printf("HTTP server shutdown error: %v", err)
		}
	})
	
	wg.Go(func() {
		grpcServer.GracefulStop()
	})
	
	// Wait for all shutdowns to complete
	wg.Wait()
	log.Println("Legal AI Metrics Server stopped")
}