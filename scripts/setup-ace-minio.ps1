# Setup MinIO buckets for ACE Web Ingestion (PowerShell version)
# Creates 3 buckets: ace-web-raw, ace-web-derived, ace-eval-logs
# Idempotent - safe to run multiple times

$ErrorActionPreference = "Stop"

Write-Host "🪣 Setting up MinIO buckets for ACE Web Ingestion..." -ForegroundColor Cyan
Write-Host ""

# Configuration
$MINIO_ENDPOINT = if ($env:MINIO_ENDPOINT) { $env:MINIO_ENDPOINT } else { "localhost:9000" }
$MINIO_ACCESS_KEY = if ($env:MINIO_ACCESS_KEY) { $env:MINIO_ACCESS_KEY } else { "minioadmin" }
$MINIO_SECRET_KEY = if ($env:MINIO_SECRET_KEY) { $env:MINIO_SECRET_KEY } else { "minioadmin" }
$MINIO_ALIAS = "local"

# Check if mc (MinIO Client) is installed
if (-not (Get-Command mc -ErrorAction SilentlyContinue)) {
  Write-Host "❌ ERROR: MinIO Client (mc) is not installed" -ForegroundColor Red
  Write-Host ""
  Write-Host "Install instructions for Windows:"
  Write-Host "  1. Download from: https://dl.min.io/client/mc/release/windows-amd64/mc.exe"
  Write-Host "  2. Place mc.exe in a directory in your PATH"
  Write-Host "  3. Or run: choco install minio-client"
  Write-Host ""
  exit 1
}

Write-Host "✅ MinIO Client (mc) is installed" -ForegroundColor Green
Write-Host ""

# Setup MinIO alias
Write-Host "🔧 Configuring MinIO alias '$MINIO_ALIAS'..." -ForegroundColor Yellow
mc alias set $MINIO_ALIAS "http://$MINIO_ENDPOINT" $MINIO_ACCESS_KEY $MINIO_SECRET_KEY --api S3v4 2>&1 | Out-Null

# Test connection
try {
  mc admin info $MINIO_ALIAS 2>&1 | Out-Null
  Write-Host "✅ Connected to MinIO at $MINIO_ENDPOINT" -ForegroundColor Green
} catch {
  Write-Host "❌ ERROR: Cannot connect to MinIO at $MINIO_ENDPOINT" -ForegroundColor Red
  Write-Host "   Make sure MinIO is running and credentials are correct"
  exit 1
}

Write-Host ""

# Define buckets
$buckets = @(
  @{ Name = "ace-web-raw"; Description = "Raw web content (HTML, markdown, search results)" },
  @{ Name = "ace-web-derived"; Description = "Derived content (summaries, chunks, entities)" },
  @{ Name = "ace-eval-logs"; Description = "Evaluation logs (errors, rate limits, gate results)" }
)

# Create buckets
Write-Host "📦 Creating buckets..." -ForegroundColor Cyan
foreach ($bucket in $buckets) {
  $bucketName = $bucket.Name

  # Check if bucket exists
  $exists = mc ls "$MINIO_ALIAS/$bucketName" 2>&1
  if ($LASTEXITCODE -eq 0) {
    Write-Host "  ✓ Bucket '$bucketName' already exists (skipping)" -ForegroundColor Gray
  } else {
    # Create bucket
    mc mb "$MINIO_ALIAS/$bucketName" 2>&1 | Out-Null
    Write-Host "  ✅ Created bucket '$bucketName'" -ForegroundColor Green
  }
}

Write-Host ""

# Verify buckets
Write-Host "🔍 Verifying buckets..." -ForegroundColor Cyan
$bucketList = mc ls $MINIO_ALIAS 2>&1 | Select-String -Pattern "ace-web-raw|ace-web-derived|ace-eval-logs"
$bucketCount = ($bucketList | Measure-Object).Count

if ($bucketCount -eq 3) {
  Write-Host "✅ All 3 ACE buckets are present" -ForegroundColor Green
} else {
  Write-Host "⚠️  WARNING: Expected 3 buckets, found $bucketCount" -ForegroundColor Yellow
}

Write-Host ""

# Display bucket list
Write-Host "📋 ACE MinIO Buckets:" -ForegroundColor Cyan
mc ls $MINIO_ALIAS | Select-String -Pattern "ace-web-raw|ace-web-derived|ace-eval-logs"

Write-Host ""

# Create sample directory structure
Write-Host "📁 Creating sample directory structure..." -ForegroundColor Cyan

# Helper function to create .keep files
function Create-KeepFile {
  param($path, $content)
  $content | mc pipe $path 2>&1 | Out-Null
}

# ace-web-raw structure
Create-KeepFile "$MINIO_ALIAS/ace-web-raw/search/.keep" "Sample search result"
Create-KeepFile "$MINIO_ALIAS/ace-web-raw/crawl/.keep" "Sample crawl data"
Create-KeepFile "$MINIO_ALIAS/ace-web-raw/assets/.keep" "Sample assets"

# ace-web-derived structure
Create-KeepFile "$MINIO_ALIAS/ace-web-derived/summary/.keep" "Sample summary"
Create-KeepFile "$MINIO_ALIAS/ace-web-derived/chunks/.keep" "Sample chunks"

# ace-eval-logs structure
Create-KeepFile "$MINIO_ALIAS/ace-eval-logs/crawl_errors/.keep" "Sample error log"
Create-KeepFile "$MINIO_ALIAS/ace-eval-logs/rate_limits/.keep" "Sample rate limit log"
Create-KeepFile "$MINIO_ALIAS/ace-eval-logs/gate_logs/.keep" "Sample gate log"

Write-Host "✅ Directory structure created" -ForegroundColor Green
Write-Host ""

# Display bucket structure
Write-Host "📂 Bucket Structure:" -ForegroundColor Cyan
Write-Host ""
Write-Host "ace-web-raw/"
Write-Host "├── search/          # Search result snapshots"
Write-Host "├── crawl/           # Raw HTML and cleaned markdown"
Write-Host "└── assets/          # Images, PDFs, etc."
Write-Host ""
Write-Host "ace-web-derived/"
Write-Host "├── summary/         # Document summaries with entities/relations"
Write-Host "└── chunks/          # Chunk text + metadata (JSONL)"
Write-Host ""
Write-Host "ace-eval-logs/"
Write-Host "├── crawl_errors/    # Crawl failure logs"
Write-Host "├── rate_limits/     # Rate limit events"
Write-Host "└── gate_logs/       # Quality gate results"
Write-Host ""

Write-Host "🎉 MinIO setup complete!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Bucket Summary:" -ForegroundColor Cyan
mc ls $MINIO_ALIAS | Select-String -Pattern "ace-web-raw|ace-web-derived|ace-eval-logs"
Write-Host ""
Write-Host "🔗 MinIO Console: http://$MINIO_ENDPOINT" -ForegroundColor Cyan
Write-Host "   Username: $MINIO_ACCESS_KEY"
Write-Host "   Password: $MINIO_SECRET_KEY"
