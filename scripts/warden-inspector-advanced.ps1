param(
    [string]$feature = "Hybrid search",
    [string]$root = "C:\Users\james\Videos\deeds-web-app"
)

Write-Host "🔎 Warden Inspector - Advanced Mode" -ForegroundColor Cyan
Write-Host "Feature: $feature" -ForegroundColor Yellow
Write-Host ""

# Redis cache key
$redisKey = "warden:inspector:$($feature -replace ' ', '_')"

# Feature to search pattern mapping
$queries = @{
    "API routes"              = "routes/api"
    "DB schema"               = "schema"
    "OCR pipeline"            = "tesseract|ocr|paddle|pdf"
    "MiniLM reranker"         = "rerank|onnx|embedding|cross-encoder"
    "Hybrid search"           = "pgvector|es|bm25|qdrant"
    "Autoencoder CUDA"        = "latent|128|TensorRT|cuBLAS"
    "Gemma legal summaries"   = "holdings|citation|gemma"
    "Evidence ingestion"      = "upload|minio|sha256|chain-of-custody"
    "Timeline"                = "timeline|audit|log"
    "Neo4j citations"         = "pageRank|neo4j|citation"
}

$pattern = $queries[$feature]

if (-not $pattern) {
    Write-Host "❌ Unknown feature: $feature" -ForegroundColor Red
    exit 1
}

Write-Host "🔍 Searching for pattern: $pattern" -ForegroundColor Yellow
Write-Host ""

# Search for files
$files = @()
try {
    $searchResults = rg --files-with-matches $pattern "$root" 2>$null
    if ($searchResults) {
        $files = $searchResults -split "`n" | Where-Object { $_ -ne "" }
    }
} catch {
    Write-Host "⚠️ ripgrep not found, using Get-ChildItem fallback" -ForegroundColor Yellow
    $files = Get-ChildItem -Path $root -Recurse -File -ErrorAction SilentlyContinue |
        Where-Object { $_.FullName -match $pattern } |
        Select-Object -ExpandProperty FullName
}

Write-Host "✅ Found $($files.Count) files" -ForegroundColor Green
Write-Host ""

# Build output
$fileList = @()
foreach ($file in $files) {
    $relativePath = $file -replace [regex]::Escape($root), ""
    $fileList += @{
        path = $relativePath
        size = (Get-Item $file -ErrorAction SilentlyContinue).Length
        type = [System.IO.Path]::GetExtension($file)
    }
}

$output = @{
    feature = $feature
    pattern = $pattern
    timestamp = (Get-Date).ToString("o")
    files = $fileList
}

# Output as JSON
$json = $output | ConvertTo-Json -Depth 10
Write-Host $json

# Log to file
$timestamp = (Get-Date).ToString("yyyy-MM-dd_HH-mm-ss")
$logDir = "$root/logs/inspector"
if (-not (Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir -Force | Out-Null
}
$logFile = "$logDir/warden-inspector_${feature}_$timestamp.txt"
$json | Out-File -FilePath $logFile -Encoding UTF8
Write-Host ""
Write-Host "📝 Results logged to: $logFile" -ForegroundColor Green

# Try to cache in Redis (optional)
try {
    $redisCmd = "redis-cli SETEX $redisKey 3600 '$($json -replace "'", "''")'"
    Invoke-Expression $redisCmd -ErrorAction SilentlyContinue
    Write-Host "⚡ Cached in Redis for 1 hour" -ForegroundColor Cyan
} catch {
    # Redis not available, continue without caching
}
