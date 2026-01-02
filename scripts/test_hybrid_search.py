#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Test hybrid search (Qdrant + pgvector + BM25)
"""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8')

import psycopg2
import requests
import numpy as np

def get_embedding(text: str) -> list:
    """Generate embedding via Ollama"""
    response = requests.post(
        "http://localhost:11434/api/embeddings",
        json={
            "model": "embeddinggemma:latest",
            "prompt": text
        }
    )
    return response.json()['embedding']

def test_hybrid_search():
    """Test hybrid vector + BM25 search"""
    conn = psycopg2.connect(
        dbname="legal",
        user="user",
        password="pass",
        host="localhost",
        port="5434"
    )

    # Test query
    query_text = "Svelte 5 runes and state management"
    print(f"Query: {query_text}")
    print()

    # Get embedding
    print("Generating embedding...")
    embedding = get_embedding(query_text)
    print(f"Embedding dimension: {len(embedding)}")
    print()

    # Insert a test chunk if table is empty
    cursor = conn.cursor()
    cursor.execute("SELECT COUNT(*) FROM kb_chunks_hybrid")
    count = cursor.fetchone()[0]

    if count == 0:
        print("Inserting test chunk...")
        test_embedding = get_embedding("Svelte 5 introduces runes like $state for reactive state management")

        cursor.execute("""
            INSERT INTO kb_chunks_hybrid
            (doc_id, source, path, section, chunk_index, chunk_id, text, embedding, tags)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            "svelte5_docs",
            "docs",
            "/docs/svelte5/runes",
            "state_management",
            0,
            "svelte5_runes_001",
            "Svelte 5 introduces runes like $state for reactive state management. Use $state() to create reactive variables.",
            '[' + ','.join(map(str, test_embedding)) + ']',
            ['svelte5', 'runes', 'state']
        ))
        conn.commit()
        print("Test chunk inserted")
        print()

    # Test vector-only search
    print("=== Vector-only search ===")
    embedding_str = '[' + ','.join(map(str, embedding)) + ']'
    cursor.execute(f"""
        SELECT
            chunk_id,
            section,
            text,
            1 - (embedding <=> '{embedding_str}'::vector) AS cos_sim
        FROM kb_chunks_hybrid
        ORDER BY cos_sim DESC
        LIMIT 3
    """)

    for row in cursor.fetchall():
        chunk_id, section, text, cos_sim = row
        print(f"ID: {chunk_id}")
        print(f"Section: {section}")
        print(f"Similarity: {cos_sim:.4f}")
        print(f"Text: {text[:100]}...")
        print()

    # Test BM25-only search
    print("=== BM25-only search ===")
    cursor.execute("""
        SELECT
            chunk_id,
            section,
            text,
            ts_rank_cd(to_tsvector('english', text), websearch_to_tsquery('english', %s)) AS bm25
        FROM kb_chunks_hybrid
        WHERE to_tsvector('english', text) @@ websearch_to_tsquery('english', %s)
        ORDER BY bm25 DESC
        LIMIT 3
    """, (query_text, query_text))

    for row in cursor.fetchall():
        chunk_id, section, text, bm25 = row
        print(f"ID: {chunk_id}")
        print(f"Section: {section}")
        print(f"BM25: {bm25:.4f}")
        print(f"Text: {text[:100]}...")
        print()

    # Test hybrid search
    print("=== Hybrid search (0.7 vector + 0.3 BM25) ===")
    cursor.execute(f"""
        SELECT
            chunk_id,
            section,
            text,
            (1 - (embedding <=> '{embedding_str}'::vector)) AS cos_sim,
            ts_rank_cd(to_tsvector('english', text), websearch_to_tsquery('english', %s)) AS bm25,
            (
                (1 - (embedding <=> '{embedding_str}'::vector)) * 0.7 +
                ts_rank_cd(to_tsvector('english', text), websearch_to_tsquery('english', %s)) * 0.3
            ) AS hybrid_score
        FROM kb_chunks_hybrid
        ORDER BY hybrid_score DESC
        LIMIT 3
    """, (query_text, query_text))

    for row in cursor.fetchall():
        chunk_id, section, text, cos_sim, bm25, hybrid = row
        print(f"ID: {chunk_id}")
        print(f"Section: {section}")
        print(f"Vector: {cos_sim:.4f} | BM25: {bm25:.4f} | Hybrid: {hybrid:.4f}")
        print(f"Text: {text[:100]}...")
        print()

    cursor.close()
    conn.close()

    print("[OK] Hybrid search test complete!")

if __name__ == "__main__":
    test_hybrid_search()
