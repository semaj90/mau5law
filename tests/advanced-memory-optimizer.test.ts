import { describe, it, expect } from "vitest";
import { AdvancedMemoryOptimizer } from "../sveltekit-frontend/src/lib/optimization/advanced-memory-optimizer";

describe("AdvancedMemoryOptimizer - k-means (in-process)", () => {
  it("clusters a simple 2-cluster dataset", async () => {
    const optimizer = new AdvancedMemoryOptimizer();
    // Create two clusters of embeddings near 0 and near 10
    const data = [
      ...Array.from({ length: 10 }, (_, i) => ({ embedding: [0 + Math.random() * 0.1, 0 + Math.random() * 0.1] })),
      ...Array.from({ length: 12 }, (_, i) => ({ embedding: [10 + Math.random() * 0.1, 10 + Math.random() * 0.1] }))
    ];
    const clusters = await optimizer.performKMeansClustering(data as any, 2);
    // Expect 2 clusters and sizes roughly 10 and 12
    expect(clusters.length).toBe(2);
    const total = clusters.reduce((s, c) => s + c.size, 0);
    expect(total).toBe(data.length);
    // simple sanity: each cluster must be non-empty
    expect(clusters.every(c => c.size > 0)).toBe(true);
    optimizer.dispose();
  }, 5000);
});

describe("AdvancedMemoryOptimizer - SIMD batch processing", () => {
  it("processes a small batch of documents", async () => {
    const optimizer = new AdvancedMemoryOptimizer();
    // Two tiny JSON doc strings (parser is project's SIMD parser)
    const docs = [
      JSON.stringify({ id: "doc1", content: "This is a short legal document about contracts.", caseNumber: "C1", documentType: "contract" }),
      JSON.stringify({ id: "doc2", content: "Testimony excerpt with evidence references.", caseNumber: "C2", documentType: "testimony" })
    ];
    const processed = await optimizer.processBatchDocumentsSIMD(docs);
    expect(Array.isArray(processed)).toBe(true);
    expect(processed.length).toBe(2);
    expect(processed[0].metadata?.simdOptimized).toBe(true);
    expect(processed[1].metadata?.simdOptimized).toBe(true);
    optimizer.dispose();
  }, 10000);
});
