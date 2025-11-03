package main

import (
	"context"
	"crypto/sha256"
	"encoding/base64"
	"log"
	"net"
	"time"

	pb "semanticcache/proto" // Adjust this import path based on your Go module setup

	"github.com/go-redis/redis/v9"
	"google.golang.org/grpc"
)

type server struct {
    pb.UnimplementedVectorCacheServiceServer
    rdb *redis.Client
}

// hashEmbedding generates a deterministic hash for an embedding vector.
// It quantizes floats to 3 decimal places for stable hashing across systems.
func hashEmbedding(vec []float32) string {
    buf := make([]byte, len(vec)*4)
    for i, f := range vec {
        // Quantize to 3 decimal places for stable hashing, then convert to int32 bits
        bits := int32(f * 1000)
        buf[i*4+0] = byte(bits)
        buf[i*4+1] = byte(bits >> 8)
        buf[i*4+2] = byte(bits >> 16)
        buf[i*4+3] = byte(bits >> 24)
    }
    sum := sha256.Sum256(buf)
    // Use first 16 bytes of hash for a shorter, yet sufficiently unique key
    return "semantic_cache:" + base64.RawURLEncoding.EncodeToString(sum[:16])
}

// Lookup handles gRPC requests to find an embedding in the cache.
func (s *server) Lookup(ctx context.Context, req *pb.EmbedLookupRequest) (*pb.EmbedLookupResponse, error) {
    key := hashEmbedding(req.Embedding)
    val, err := s.rdb.Get(ctx, key).Result()
    if err == redis.Nil {
        return &pb.EmbedLookupResponse{Hit: false}, nil
    } else if err != nil {
        log.Printf("Redis GET error for key %s: %v", key, err)
        return nil, err
    }
    return &pb.EmbedLookupResponse{
        Hit: true,
        Entry: &pb.CacheEntry{
            Key: key, ValueJson: val, Similarity: 1.0, // Assuming 1.0 similarity for exact hash match
        },
    }, nil
}

// Store handles gRPC requests to store an embedding and its response in the cache.
func (s *server) Store(ctx context.Context, req *pb.EmbedStoreRequest) (*pb.EmbedStoreResponse, error) {
    key := hashEmbedding(req.Embedding)
    ttl := time.Duration(req.TtlSeconds) * time.Second
    err := s.rdb.Set(ctx, key, req.ValueJson, ttl).Err()
    if err != nil {
        log.Printf("Redis SET error for key %s: %v", key, err)
        return &pb.EmbedStoreResponse{Success: false, Key: key}, err
    }
    log.Printf("Stored semantic cache entry for key: %s with TTL: %v", key, ttl)
    return &pb.EmbedStoreResponse{Success: true, Key: key}, nil
}

func main() {
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    rdb := redis.NewClient(&redis.Options{Addr: "redis:6379"})
    // Ping Redis to ensure connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    _, err = rdb.Ping(ctx).Result()
    if err != nil {
        log.Fatalf("Failed to connect to Redis: %v", err)
    }
    log.Println("✅ Connected to Redis")

    grpcServer := grpc.NewServer()
    pb.RegisterVectorCacheServiceServer(grpcServer, &server{rdb: rdb})

    log.Println("🧩 VectorCache gRPC Server running on :50051")
    if err := grpcServer.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}