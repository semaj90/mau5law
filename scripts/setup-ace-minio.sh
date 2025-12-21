#!/bin/bash
# Setup MinIO buckets for ACE Web Ingestion
# Creates 3 buckets: ace-web-raw, ace-web-derived, ace-eval-logs
# Idempotent - safe to run multiple times

set -e

echo "🪣 Setting up MinIO buckets for ACE Web Ingestion..."
echo ""

# Configuration
MINIO_ENDPOINT="${MINIO_ENDPOINT:-localhost:9000}"
MINIO_ACCESS_KEY="${MINIO_ACCESS_KEY:-minioadmin}"
MINIO_SECRET_KEY="${MINIO_SECRET_KEY:-minioadmin}"
MINIO_ALIAS="${MINIO_ALIAS:-local}"

# Check if mc (MinIO Client) is installed
if ! command -v mc &> /dev/null; then
  echo "❌ ERROR: MinIO Client (mc) is not installed"
  echo ""
  echo "Install instructions:"
  echo "  Linux:   wget https://dl.min.io/client/mc/release/linux-amd64/mc && chmod +x mc && sudo mv mc /usr/local/bin/"
  echo "  macOS:   brew install minio/stable/mc"
  echo "  Windows: Download from https://dl.min.io/client/mc/release/windows-amd64/mc.exe"
  echo ""
  exit 1
fi

echo "✅ MinIO Client (mc) is installed"
echo ""

# Setup MinIO alias
echo "🔧 Configuring MinIO alias '$MINIO_ALIAS'..."
mc alias set "$MINIO_ALIAS" "http://$MINIO_ENDPOINT" "$MINIO_ACCESS_KEY" "$MINIO_SECRET_KEY" --api S3v4 2>&1 | grep -v "mc: Configuration written"

# Test connection
if ! mc admin info "$MINIO_ALIAS" &> /dev/null; then
  echo "❌ ERROR: Cannot connect to MinIO at $MINIO_ENDPOINT"
  echo "   Make sure MinIO is running and credentials are correct"
  exit 1
fi

echo "✅ Connected to MinIO at $MINIO_ENDPOINT"
echo ""

# Define buckets
BUCKETS=(
  "ace-web-raw:Raw web content (HTML, markdown, search results)"
  "ace-web-derived:Derived content (summaries, chunks, entities)"
  "ace-eval-logs:Evaluation logs (errors, rate limits, gate results)"
)

# Create buckets
echo "📦 Creating buckets..."
for bucket_info in "${BUCKETS[@]}"; do
  IFS=':' read -r bucket description <<< "$bucket_info"

  # Check if bucket exists
  if mc ls "$MINIO_ALIAS/$bucket" &> /dev/null; then
    echo "  ✓ Bucket '$bucket' already exists (skipping)"
  else
    # Create bucket
    mc mb "$MINIO_ALIAS/$bucket" &> /dev/null
    echo "  ✅ Created bucket '$bucket'"
  fi

  # Set bucket policy to private (default)
  # Note: For production, you may want to set specific policies
  # mc anonymous set none "$MINIO_ALIAS/$bucket" &> /dev/null
done

echo ""

# Verify buckets
echo "🔍 Verifying buckets..."
BUCKET_COUNT=$(mc ls "$MINIO_ALIAS" | grep -E "ace-web-raw|ace-web-derived|ace-eval-logs" | wc -l)

if [ "$BUCKET_COUNT" -eq 3 ]; then
  echo "✅ All 3 ACE buckets are present"
else
  echo "⚠️  WARNING: Expected 3 buckets, found $BUCKET_COUNT"
fi

echo ""

# Display bucket list
echo "📋 ACE MinIO Buckets:"
mc ls "$MINIO_ALIAS" | grep -E "ace-web-raw|ace-web-derived|ace-eval-logs" || echo "  (no ACE buckets found)"

echo ""

# Create sample directory structure (optional)
echo "📁 Creating sample directory structure..."

# ace-web-raw structure
mc ls "$MINIO_ALIAS/ace-web-raw/search/" &> /dev/null || \
  echo "Sample search result" | mc pipe "$MINIO_ALIAS/ace-web-raw/search/.keep" &> /dev/null

mc ls "$MINIO_ALIAS/ace-web-raw/crawl/" &> /dev/null || \
  echo "Sample crawl data" | mc pipe "$MINIO_ALIAS/ace-web-raw/crawl/.keep" &> /dev/null

mc ls "$MINIO_ALIAS/ace-web-raw/assets/" &> /dev/null || \
  echo "Sample assets" | mc pipe "$MINIO_ALIAS/ace-web-raw/assets/.keep" &> /dev/null

# ace-web-derived structure
mc ls "$MINIO_ALIAS/ace-web-derived/summary/" &> /dev/null || \
  echo "Sample summary" | mc pipe "$MINIO_ALIAS/ace-web-derived/summary/.keep" &> /dev/null

mc ls "$MINIO_ALIAS/ace-web-derived/chunks/" &> /dev/null || \
  echo "Sample chunks" | mc pipe "$MINIO_ALIAS/ace-web-derived/chunks/.keep" &> /dev/null

# ace-eval-logs structure
mc ls "$MINIO_ALIAS/ace-eval-logs/crawl_errors/" &> /dev/null || \
  echo "Sample error log" | mc pipe "$MINIO_ALIAS/ace-eval-logs/crawl_errors/.keep" &> /dev/null

mc ls "$MINIO_ALIAS/ace-eval-logs/rate_limits/" &> /dev/null || \
  echo "Sample rate limit log" | mc pipe "$MINIO_ALIAS/ace-eval-logs/rate_limits/.keep" &> /dev/null

mc ls "$MINIO_ALIAS/ace-eval-logs/gate_logs/" &> /dev/null || \
  echo "Sample gate log" | mc pipe "$MINIO_ALIAS/ace-eval-logs/gate_logs/.keep" &> /dev/null

echo "✅ Directory structure created"
echo ""

# Display bucket structure
echo "📂 Bucket Structure:"
echo ""
echo "ace-web-raw/"
echo "├── search/          # Search result snapshots"
echo "├── crawl/           # Raw HTML and cleaned markdown"
echo "└── assets/          # Images, PDFs, etc."
echo ""
echo "ace-web-derived/"
echo "├── summary/         # Document summaries with entities/relations"
echo "└── chunks/          # Chunk text + metadata (JSONL)"
echo ""
echo "ace-eval-logs/"
echo "├── crawl_errors/    # Crawl failure logs"
echo "├── rate_limits/     # Rate limit events"
echo "└── gate_logs/       # Quality gate results"
echo ""

echo "🎉 MinIO setup complete!"
echo ""
echo "📊 Bucket Summary:"
mc ls "$MINIO_ALIAS" | grep -E "ace-web-raw|ace-web-derived|ace-eval-logs"
echo ""
echo "🔗 MinIO Console: http://$MINIO_ENDPOINT"
echo "   Username: $MINIO_ACCESS_KEY"
echo "   Password: $MINIO_SECRET_KEY"
