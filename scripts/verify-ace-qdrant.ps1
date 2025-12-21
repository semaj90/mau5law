# Verification script for ACE Qdrant Collection Setup (PowerShell)
# Checks if Qdrant is running and collection is properly configured

$ErrorActionPreference = "Stop"

$QDRANT_URL = if ($env:QDRANT_URL) { $env:QDRANT_URL } else { "http://localhost:6333" }
$COLLECTION_NAME = "ace_chunks"

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "ACE Qdrant Collection Verification" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# Check if Qdrant is running
Write-Host "1. Checking if Qdrant is running..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "$QDRANT_URL/collections" -Method Get -UseBasicParsing -ErrorAction Stop
    Write-Host "   ✓ Qdrant is running at $QDRANT_URL" -ForegroundColor Green
} catch {
    Write-Host "   ✗ Qdrant is not running at $QDRANT_URL" -ForegroundColor Red
    Write-Host "   Start Qdrant with: docker-compose up -d qdrant" -ForegroundColor Yellow
    exit 1
}

Write-Host ""

# Check if collection exists
Write-Host "2. Checking if collection '$COLLECTION_NAME' exists..." -ForegroundColor Yellow
try {
    $collectionResponse = Invoke-WebRequest -Uri "$QDRANT_URL/collections/$COLLECTION_NAME" -Method Get -UseBasicParsing -ErrorAction Stop
    $collectionData = $collectionResponse.Content | ConvertFrom-Json

    if ($collectionData.status -eq "ok") {
        Write-Host "   ✓ Collection '$COLLECTION_NAME' exists" -ForegroundColor Green

        # Extract collection info
        $vectorSize = $collectionData.result.config.params.vectors.size
        $distance = $collectionData.result.config.params.vectors.distance
        $pointsCount = $collectionData.result.points_count

        Write-Host "   - Vector size: $vectorSize" -ForegroundColor Gray
        Write-Host "   - Distance metric: $distance" -ForegroundColor Gray
        Write-Host "   - Points count: $pointsCount" -ForegroundColor Gray

        # Verify configuration
        Write-Host ""
        Write-Host "3. Verifying collection configuration..." -ForegroundColor Yellow

        if ($vectorSize -eq 384) {
            Write-Host "   ✓ Vector dimension is 384" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Vector dimension is $vectorSize (expected 384 for nomic-embed-text)" -ForegroundColor Yellow
        }

        if ($distance -eq "Cosine") {
            Write-Host "   ✓ Distance metric is Cosine" -ForegroundColor Green
        } else {
            Write-Host "   ⚠ Distance metric is $distance (expected Cosine)" -ForegroundColor Yellow
        }
    }
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "   ✗ Collection '$COLLECTION_NAME' does not exist" -ForegroundColor Yellow
        Write-Host "   Collection will be created automatically on first use" -ForegroundColor Gray
        Write-Host "   Or run: npm run ace:setup-qdrant" -ForegroundColor Gray
    } else {
        Write-Host "   ✗ Error checking collection: $($_.Exception.Message)" -ForegroundColor Red
        throw
    }
}

Write-Host ""

# List all collections
Write-Host "4. Available collections:" -ForegroundColor Yellow
try {
    $allCollectionsResponse = Invoke-WebRequest -Uri "$QDRANT_URL/collections" -Method Get -UseBasicParsing -ErrorAction Stop
    $allCollectionsData = $allCollectionsResponse.Content | ConvertFrom-Json

    if ($allCollectionsData.result.collections.Count -gt 0) {
        foreach ($collection in $allCollectionsData.result.collections) {
            Write-Host "   - $($collection.name)" -ForegroundColor Gray
        }
    } else {
        Write-Host "   (no collections found)" -ForegroundColor Gray
    }
} catch {
    Write-Host "   ✗ Error listing collections: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "Verification Complete" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Next steps:" -ForegroundColor Yellow
Write-Host "  1. If collection doesn't exist, it will be created automatically" -ForegroundColor Gray
Write-Host "  2. Test ingestion: npm run ace:test-ingest" -ForegroundColor Gray
Write-Host "  3. Test search: npm run ace:test-search" -ForegroundColor Gray
Write-Host ""
