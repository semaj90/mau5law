param([string]$root = "C:\Users\james\Videos\deeds-web-app")

Write-Host "WardenNet Inspector Running..." -ForegroundColor Cyan
Write-Host ""

Write-Host "API Endpoint Discovery" -ForegroundColor Yellow
$endpoints = Get-ChildItem -Path $root -Recurse -Filter "+server.ts" -ErrorAction SilentlyContinue
Write-Host "Found $($endpoints.Count) API endpoints" -ForegroundColor Green

Write-Host ""
Write-Host "Drizzle ORM + pgvector Verification" -ForegroundColor Yellow
$schemaFiles = Get-ChildItem -Path "$root\sveltekit-frontend\src\lib\server\db" -Filter "schema*.ts" -ErrorAction SilentlyContinue
Write-Host "Found $($schemaFiles.Count) Drizzle schema files" -ForegroundColor Green

Write-Host ""
Write-Host "pgvector Column Detection" -ForegroundColor Yellow
$vectorUsage = @()
Get-ChildItem -Path "$root\sveltekit-frontend\src\lib\server\db" -Filter "*.ts" -ErrorAction SilentlyContinue | ForEach-Object {
    $content = Get-Content $_.FullName -Raw
    if ($content -match "vector|embedding|pgvector") {
        $vectorUsage += $_.Name
    }
}
Write-Host "Found $($vectorUsage.Count) files with pgvector usage" -ForegroundColor Green

Write-Host ""
Write-Host "Database User Verification" -ForegroundColor Yellow
$envFiles = Get-ChildItem -Path $root -Recurse -Filter ".env*" -ErrorAction SilentlyContinue
Write-Host "Found $($envFiles.Count) environment files" -ForegroundColor Green

Write-Host ""
Write-Host "Qdrant Vector Store Health" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:6333/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "Qdrant is online" -ForegroundColor Green
} catch {
    Write-Host "Qdrant not reachable" -ForegroundColor Red
}

Write-Host ""
Write-Host "Go Hybrid Search Orchestrator" -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:8080/health" -TimeoutSec 3 -ErrorAction Stop
    Write-Host "Go service is online" -ForegroundColor Green
} catch {
    Write-Host "Go service not reachable" -ForegroundColor Red
}

Write-Host ""
Write-Host "GPU Worker Services" -ForegroundColor Yellow
$services = @(
    "http://localhost:8081/health",
    "http://localhost:8090/health",
    "http://localhost:8092/health",
    "http://localhost:8098/health"
)

$onlineCount = 0
foreach ($svc in $services) {
    try {
        $response = Invoke-WebRequest -Uri $svc -TimeoutSec 2 -ErrorAction Stop
        $onlineCount++
    } catch {
        # Service offline
    }
}
Write-Host "GPU services online: $onlineCount / $($services.Count)" -ForegroundColor Green

Write-Host ""
Write-Host "SvelteKit Route Structure" -ForegroundColor Yellow
$routeDir = "$root\sveltekit-frontend\src\routes"
if (Test-Path $routeDir) {
    $routes = Get-ChildItem -Path $routeDir -Recurse -Filter "+page.svelte" -ErrorAction SilentlyContinue
    $apiRoutes = Get-ChildItem -Path $routeDir -Recurse -Filter "+server.ts" -ErrorAction SilentlyContinue
    Write-Host "Page routes: $($routes.Count), API endpoints: $($apiRoutes.Count)" -ForegroundColor Green
}

Write-Host ""
Write-Host "Critical Dependencies" -ForegroundColor Yellow
$packageJson = "$root\sveltekit-frontend\package.json"
if (Test-Path $packageJson) {
    $content = Get-Content $packageJson -Raw
    $deps = @('svelte', 'sveltekit', 'drizzle-orm', 'pg', 'zod', 'typescript')
    $foundCount = 0
    foreach ($dep in $deps) {
        if ($content -match $dep) {
            $foundCount++
        }
    }
    Write-Host "Found $foundCount / $($deps.Count) critical dependencies" -ForegroundColor Green
}

Write-Host ""
Write-Host "WardenNet Inspection Complete!" -ForegroundColor Green
