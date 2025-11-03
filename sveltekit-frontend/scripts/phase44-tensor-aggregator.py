#!/usr/bin/env python3
"""
Phase 44 CUDA Tensor Aggregator
Loads cached embeddings from Redis and aggregates them into GPU tensors
for fast matrix operations (PCA, clustering, similarity search).

Usage:
    python scripts/phase44-tensor-aggregator.py [--limit 10000] [--output logs/phase44-batch.pt]
"""

import argparse
import json
import redis
import torch
import numpy as np
from datetime import datetime
from pathlib import Path
from tqdm import tqdm

class CUDATensorAggregator:
    def __init__(self, redis_url='redis://localhost:6379', device='cuda', embedding_dim=384):
        self.redis = redis.from_url(redis_url)
        self.device = torch.device(device if torch.cuda.is_available() else 'cpu')
        self.embedding_dim = embedding_dim  # Memory-optimized 384d
        
        if self.device.type == 'cuda':
            print(f"✅ CUDA available: {torch.cuda.get_device_name(0)}")
            print(f"   Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f} GB")
            print(f"   Embedding dimensions: {self.embedding_dim}\n")
        else:
            print(f"⚠️  CUDA not available, using CPU")
            print(f"   Embedding dimensions: {self.embedding_dim}\n")
    
    def load_embeddings_from_redis(self, pattern='ai:embedding:*', limit=None):
        """Load embeddings from Redis cache into GPU tensors"""
        print(f"🔍 Scanning Redis for pattern: {pattern}")
        
        keys = []
        for key in self.redis.scan_iter(pattern):
            keys.append(key.decode())
            if limit and len(keys) >= limit:
                break
        
        print(f"📊 Found {len(keys)} cached embeddings\n")
        
        tensors = []
        metadata = []
        
        print("📥 Loading embeddings to GPU...")
        for key in tqdm(keys):
            try:
                data = self.redis.hgetall(key)
                
                if b'vector' not in data:
                    continue
                
                # Parse vector
                vector = json.loads(data[b'vector'].decode())
                
                # Convert to tensor and move to GPU
                tensor = torch.tensor(vector, dtype=torch.float16, device=self.device)
                tensors.append(tensor)
                
                # Store metadata
                metadata.append({
                    'id': key.decode(),
                    'summary': data.get(b'summary', b'').decode(),
                    'file': data.get(b'file', b'').decode(),
                    'line': data.get(b'line', b'').decode(),
                    'timestamp': data.get(b'timestamp', b'').decode()
                })
                
            except Exception as e:
                print(f"⚠️  Error loading {key}: {e}")
                continue
        
        if not tensors:
            raise ValueError("No valid embeddings found in Redis")
        
        # Stack into matrix
        embedding_matrix = torch.stack(tensors)
        
        print(f"\n✅ Loaded tensor matrix: {embedding_matrix.shape}")
        print(f"   Dtype: {embedding_matrix.dtype}")
        print(f"   Device: {embedding_matrix.device}")
        print(f"   Memory: {embedding_matrix.element_size() * embedding_matrix.nelement() / 1e6:.2f} MB\n")
        
        return embedding_matrix, metadata
    
    def compute_statistics(self, embedding_matrix):
        """Compute GPU-accelerated statistics"""
        print("📊 Computing statistics on GPU...")
        
        stats = {
            'mean': torch.mean(embedding_matrix, dim=0),
            'std': torch.std(embedding_matrix, dim=0),
            'min': torch.min(embedding_matrix, dim=0)[0],
            'max': torch.max(embedding_matrix, dim=0)[0],
        }
        
        print(f"   Mean vector shape: {stats['mean'].shape}")
        print(f"   Std vector shape: {stats['std'].shape}")
        
        return stats
    
    def compute_similarity_matrix(self, embedding_matrix):
        """Compute pairwise cosine similarity matrix on GPU"""
        print("🔢 Computing similarity matrix (GPU-accelerated)...")
        
        # Normalize vectors
        norms = torch.norm(embedding_matrix, dim=1, keepdim=True)
        normalized = embedding_matrix / norms
        
        # Compute similarity (matrix multiplication on GPU)
        similarity = torch.mm(normalized, normalized.t())
        
        print(f"   Similarity matrix shape: {similarity.shape}")
        print(f"   Memory: {similarity.element_size() * similarity.nelement() / 1e6:.2f} MB\n")
        
        return similarity
    
    def find_clusters(self, embedding_matrix, n_clusters=10):
        """Simple k-means clustering on GPU"""
        print(f"🎯 Finding {n_clusters} clusters (GPU-accelerated)...")
        
        from sklearn.cluster import KMeans
        
        # Move to CPU for sklearn (or use torch-based clustering)
        embeddings_cpu = embedding_matrix.cpu().numpy()
        
        kmeans = KMeans(n_clusters=n_clusters, random_state=42)
        labels = kmeans.fit_predict(embeddings_cpu)
        
        print(f"   Cluster distribution:")
        unique, counts = np.unique(labels, return_counts=True)
        for cluster_id, count in zip(unique, counts):
            print(f"     Cluster {cluster_id}: {count} points")
        
        return labels, kmeans.cluster_centers_
    
    def save_tensors(self, embedding_matrix, metadata, output_path, stats=None, similarity=None):
        """Save tensors to disk for later use"""
        print(f"\n💾 Saving tensors to: {output_path}")
        
        save_data = {
            'embedding_matrix': embedding_matrix.cpu(),
            'metadata': metadata,
            'timestamp': datetime.now().isoformat(),
            'shape': list(embedding_matrix.shape),
            'dtype': str(embedding_matrix.dtype)
        }
        
        if stats:
            save_data['stats'] = {k: v.cpu() for k, v in stats.items()}
        
        if similarity is not None:
            # Save only summary stats, full matrix is huge
            save_data['similarity_summary'] = {
                'mean': similarity.mean().item(),
                'std': similarity.std().item(),
                'min': similarity.min().item(),
                'max': similarity.max().item()
            }
        
        torch.save(save_data, output_path)
        
        # Save metadata as JSON
        json_path = Path(output_path).with_suffix('.meta.json')
        with open(json_path, 'w') as f:
            json.dump({
                'count': len(metadata),
                'timestamp': save_data['timestamp'],
                'shape': save_data['shape'],
                'samples': metadata[:10]  # First 10 samples
            }, f, indent=2)
        
        print(f"✅ Saved tensor: {output_path}")
        print(f"✅ Saved metadata: {json_path}\n")
    
    def generate_summary_report(self, embedding_matrix, metadata, stats, output_dir):
        """Generate markdown summary report"""
        report_path = Path(output_dir) / 'phase44-summary.md'
        
        with open(report_path, 'w') as f:
            f.write("# Phase 44 CUDA Tensor Analysis Report\n\n")
            f.write(f"**Generated:** {datetime.now().isoformat()}\n\n")
            
            f.write("## Tensor Statistics\n\n")
            f.write(f"- **Total Embeddings:** {len(metadata):,}\n")
            f.write(f"- **Tensor Shape:** {list(embedding_matrix.shape)}\n")
            f.write(f"- **Data Type:** {embedding_matrix.dtype}\n")
            f.write(f"- **Device:** {embedding_matrix.device}\n")
            f.write(f"- **Memory Usage:** {embedding_matrix.element_size() * embedding_matrix.nelement() / 1e6:.2f} MB\n\n")
            
            f.write("## Embedding Statistics\n\n")
            f.write(f"- **Mean (first 5 dims):** {stats['mean'][:5].cpu().tolist()}\n")
            f.write(f"- **Std (first 5 dims):** {stats['std'][:5].cpu().tolist()}\n")
            f.write(f"- **Min:** {stats['min'].min().item():.4f}\n")
            f.write(f"- **Max:** {stats['max'].max().item():.4f}\n\n")
            
            f.write("## File Distribution\n\n")
            files = [m['file'] for m in metadata if m['file']]
            if files:
                file_counts = {}
                for file in files:
                    file_counts[file] = file_counts.get(file, 0) + 1
                
                sorted_files = sorted(file_counts.items(), key=lambda x: x[1], reverse=True)
                f.write("| File | Count |\n")
                f.write("|------|-------|\n")
                for file, count in sorted_files[:20]:
                    f.write(f"| {file} | {count} |\n")
        
        print(f"✅ Summary report: {report_path}\n")


def main():
    parser = argparse.ArgumentParser(description='Phase 44 CUDA Tensor Aggregator')
    parser.add_argument('--limit', type=int, default=10000, help='Max embeddings to load')
    parser.add_argument('--output', default='logs/phase44-batch.pt', help='Output tensor file')
    parser.add_argument('--redis-url', default='redis://localhost:6379', help='Redis URL')
    parser.add_argument('--embedding-dim', type=int, default=384, help='Embedding dimensions (384 or 768)')
    parser.add_argument('--compute-similarity', action='store_true', help='Compute similarity matrix')
    parser.add_argument('--cluster', type=int, help='Number of clusters for k-means')
    
    args = parser.parse_args()
    
    print("╔════════════════════════════════════════════════════════╗")
    print("║        PHASE 44 CUDA TENSOR AGGREGATION                ║")
    print("╚════════════════════════════════════════════════════════╝\n")
    
    aggregator = CUDATensorAggregator(redis_url=args.redis_url, embedding_dim=args.embedding_dim)
    
    # Load embeddings
    embedding_matrix, metadata = aggregator.load_embeddings_from_redis(limit=args.limit)
    
    # Compute statistics
    stats = aggregator.compute_statistics(embedding_matrix)
    
    # Optional: compute similarity matrix
    similarity = None
    if args.compute_similarity:
        similarity = aggregator.compute_similarity_matrix(embedding_matrix)
    
    # Optional: clustering
    if args.cluster:
        labels, centers = aggregator.find_clusters(embedding_matrix, n_clusters=args.cluster)
        # Add cluster labels to metadata
        for i, label in enumerate(labels):
            metadata[i]['cluster'] = int(label)
    
    # Save tensors
    output_dir = Path(args.output).parent
    output_dir.mkdir(parents=True, exist_ok=True)
    
    aggregator.save_tensors(embedding_matrix, metadata, args.output, stats, similarity)
    
    # Generate report
    aggregator.generate_summary_report(embedding_matrix, metadata, stats, output_dir)
    
    print("✅ Phase 44 tensor aggregation complete!\n")


if __name__ == '__main__':
    main()
