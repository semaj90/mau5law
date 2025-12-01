@echo off
REM Start MinIO SIMD Service on port 8096
set MINIO_SIMD_PORT=8096
set MINIO_ENDPOINT=localhost:9000
set MINIO_ACCESS_KEY=minioadmin
set MINIO_SECRET_KEY=minioadmin
set MINIO_USE_SSL=false

echo Starting MinIO SIMD Service on port %MINIO_SIMD_PORT%...
echo MinIO endpoint: %MINIO_ENDPOINT%

REM Check if executable exists, if not build it
if not exist "..\..\go-services\simd-json-accelerator\minio-simd-service.exe" (
    echo Building MinIO SIMD service...
    cd ..\..\go-services\simd-json-accelerator
    go build -o minio-simd-service.exe minio-simd-service.go
    cd ..\..\sveltekit-frontend\scripts
)

start "MinIO SIMD Service" /B ..\..\go-services\simd-json-accelerator\minio-simd-service.exe
timeout /t 3 /nobreak >nul
echo.
echo ✅ MinIO SIMD Service started
echo 📡 Health: http://localhost:%MINIO_SIMD_PORT%/health
echo 📦 Chunks: http://localhost:%MINIO_SIMD_PORT%/api/chunks
echo 📂 Evidence: http://localhost:%MINIO_SIMD_PORT%/api/evidence
