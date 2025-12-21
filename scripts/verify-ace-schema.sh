#!/bin/bash
# Verification script for ACE Web Ingestion schema
# Tests that all tables and indexes were created successfully

set -e

echo "🔍 Verifying ACE Web Ingestion Schema..."
echo ""

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "❌ ERROR: DATABASE_URL environment variable is not set"
  exit 1
fi

echo "✅ DATABASE_URL is set"
echo ""

# Check pgvector extension
echo "📦 Checking pgvector extension..."
PGVECTOR_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_extension WHERE extname = 'vector';")
if [ "$PGVECTOR_CHECK" -eq 1 ]; then
  echo "✅ pgvector extension is enabled"
else
  echo "❌ pgvector extension is NOT enabled"
  exit 1
fi
echo ""

# Check tables exist
echo "📋 Checking ACE tables..."
TABLES=("ace_sources" "ace_docs" "ace_chunks" "ace_entities" "ace_edges")

for table in "${TABLES[@]}"; do
  TABLE_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_name = '$table';")
  if [ "$TABLE_CHECK" -eq 1 ]; then
    echo "✅ Table $table exists"
  else
    echo "❌ Table $table does NOT exist"
    exit 1
  fi
done
echo ""

# Check indexes
echo "🔍 Checking indexes..."
INDEXES=(
  "ace_sources_url_idx"
  "ace_sources_domain_idx"
  "ace_sources_status_idx"
  "ace_docs_source_idx"
  "ace_docs_fetched_idx"
  "ace_chunks_doc_idx"
  "ace_chunks_embedding_idx"
  "ace_entities_doc_idx"
  "ace_entities_entity_idx"
  "ace_entities_type_idx"
  "ace_edges_src_idx"
  "ace_edges_dst_idx"
  "ace_edges_rel_idx"
  "ace_edges_doc_idx"
)

for index in "${INDEXES[@]}"; do
  INDEX_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM pg_indexes WHERE indexname = '$index';")
  if [ "$INDEX_CHECK" -eq 1 ]; then
    echo "✅ Index $index exists"
  else
    echo "❌ Index $index does NOT exist"
    exit 1
  fi
done
echo ""

# Check vector column
echo "🔢 Checking vector column..."
VECTOR_CHECK=$(psql "$DATABASE_URL" -t -c "SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'ace_chunks' AND column_name = 'embedding' AND udt_name = 'vector';")
if [ "$VECTOR_CHECK" -eq 1 ]; then
  echo "✅ Vector column (embedding) exists with correct type"
else
  echo "❌ Vector column (embedding) does NOT exist or has wrong type"
  exit 1
fi
echo ""

echo "🎉 All checks passed! ACE Web Ingestion schema is correctly installed."
echo ""
echo "📊 Table Summary:"
psql "$DATABASE_URL" -c "\dt ace_*"
