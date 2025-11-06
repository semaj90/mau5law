<#
.SYNOPSIS
  Phase46 Full Pipeline Orchestrator
  Starts backend stack, runs adapter, ingests docs, executes full RAG pipeline.
#>

[CmdletBinding()]
param(
    [string]$DocsDir,
    [int]$AdapterPort = 8092,
    [int]$GraphPort = 8093,
    [string]$ComposeFile
)

$ErrorActionPreference = 'Stop'

function Write-Step {
    param([string]$Message)
    Write-Host "[phase46] $Message"
}

function Wait-ForPort {
    param(
        [int]$Port,
        [string]$Name,
        [int]$TimeoutSeconds = 120
    )

    $elapsed = 0
    while ($true) {
        try {
            $tcp = Test-NetConnection -ComputerName 'localhost' -Port $Port -WarningAction SilentlyContinue
            if ($tcp.TcpTestSucceeded) {
                Write-Step "$Name is accepting connections on port $Port."
                break
            }
        } catch {
            Start-Sleep -Seconds 1
        }

        Start-Sleep -Seconds 2
        $elapsed += 2
        if ($elapsed -ge $TimeoutSeconds) {
            Write-Step "Timeout while waiting for $Name on port $Port. Continuing anyway."
            break
        }
    }
}

function Wait-ForHttp {
    param(
        [string]$Url,
        [string]$Name,
        [int]$TimeoutSeconds = 120
    )

    $elapsed = 0
    while ($true) {
        try {
            $response = Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 5
            if ($response.StatusCode -ge 200 -and $response.StatusCode -lt 400) {
                Write-Step "$Name responded successfully at $Url."
                break
            }
        } catch {
            Start-Sleep -Seconds 2
        }

        $elapsed += 2
        if ($elapsed -ge $TimeoutSeconds) {
            Write-Step "Timeout while waiting for $Name at $Url. Continuing anyway."
            break
        }
    }
}

function Get-ServiceContainerId {
    param([string]$ServiceName, [string]$ComposeFile)
    docker compose -f $ComposeFile ps -q $ServiceName 2>$null
}

function Safe-DockerExec {
    param(
        [string]$ServiceName,
        [string[]]$Command,
        [string]$ComposeFile
    )

    $containerId = Get-ServiceContainerId -ServiceName $ServiceName -ComposeFile $ComposeFile
    if (-not $containerId) {
        Write-Step "Skipping $ServiceName command; service not available."
        return
    }

    docker exec $containerId @Command
}

Write-Step "Orchestration starting..."

Push-Location (Join-Path $PSScriptRoot '..')
try {
    if (-not $DocsDir) {
        $DocsDir = Join-Path $PWD 'web_docs'
    }

    if (-not $ComposeFile) {
        $ComposeFile = Join-Path $PWD 'docker-compose-vector-384.yml'
    }

    if (-not (Test-Path $DocsDir)) {
        Write-Step "Docs directory missing at $DocsDir. Creating it."
        New-Item -ItemType Directory -Path $DocsDir -Force | Out-Null
    }

    if (-not (Test-Path $ComposeFile)) {
        throw "Compose file '$ComposeFile' not found. Provide the correct -ComposeFile path."
    }

    $serviceDefinitions = @(
        [pscustomobject]@{ Name = 'redis'; Display = 'Redis'; Health = 'port'; Port = 6379 },
        [pscustomobject]@{ Name = 'postgres'; Display = 'Postgres'; Health = 'port'; Port = 5432 },
        [pscustomobject]@{ Name = 'neo4j'; Display = 'Neo4j'; Health = 'port'; Port = 7687 },
        [pscustomobject]@{ Name = 'minio'; Display = 'MinIO'; Health = 'port'; Port = 9000 },
        [pscustomobject]@{ Name = 'qdrant'; Display = 'Qdrant'; Health = 'http'; Url = 'http://localhost:6333/health' }
    )

    $previousErrorPreference = $ErrorActionPreference
    $ErrorActionPreference = 'Continue'
    try {
        $availableServices = docker compose -f $ComposeFile config --services 2>$null | Where-Object { $_ } | ForEach-Object { $_.Trim() }
    } finally {
        $ErrorActionPreference = $previousErrorPreference
    }

    if (-not $availableServices) {
        throw "No services found in compose file '$ComposeFile'."
    }

    $servicesToManage = $serviceDefinitions | Where-Object { $availableServices -contains $_.Name }
    if (-not ($servicesToManage | Where-Object { $_.Name -in @('redis','postgres') })) {
        throw "Compose file '$ComposeFile' must include at least redis and postgres services for the pipeline."
    }

    $startNames = @($servicesToManage | Select-Object -ExpandProperty Name)
    Write-Step ("Starting Docker services: {0}" -f ($startNames -join ', '))
    docker compose -f $ComposeFile up -d $startNames | Out-Null

    Write-Step "Waiting for core services to report ready..."
    foreach ($svc in $servicesToManage) {
        switch ($svc.Health) {
            'port' { Wait-ForPort -Port $svc.Port -Name $svc.Display }
            'http' { Wait-ForHttp -Url $svc.Url -Name $svc.Display }
        }
    }

    $adapterPath = Join-Path (Join-Path $PWD '.venv-phase46') 'Scripts\python.exe'
    if (-not (Test-Path $adapterPath)) {
        throw "Python executable not found at $adapterPath. Ensure .venv-phase46 is created."
    }

    if ($servicesToManage.Name -contains 'minio') {
        Write-Step "Ensuring MinIO bucket 'web_docs' exists..."
        Safe-DockerExec -ServiceName 'minio' -ComposeFile $ComposeFile -Command @('mc','alias','set','local','http://localhost:9000','minioadmin','minioadmin') | Out-Null
        Safe-DockerExec -ServiceName 'minio' -ComposeFile $ComposeFile -Command @('mc','mb','local/web_docs') | Out-Null
    } else {
        Write-Step "MinIO service not present in compose; skipping bucket setup."
    }

    Write-Step "Starting Python adapter on port $AdapterPort..."
    $adapter = Start-UvicornProcess -PythonPath $adapterPath -Module 'python-services.doc_ingest:app' -Port $AdapterPort -Environment @{
        PHASE46_CACHE_DIR = (Join-Path (Join-Path $PWD 'cache') 'phase46_adapter')
    }
    Start-Sleep -Seconds 3

    Write-Step "Starting Phase47 graph analyzer on port $GraphPort..."
    $graph = Start-UvicornProcess -PythonPath $adapterPath -Module 'go-microservice.cmd.phase47_graph_analyzer:app' -Port $GraphPort -Environment @{
        QDRANT_URL = 'http://localhost:6333'
        NEO4J_HTTP = 'http://localhost:8088'
    }
    Start-Sleep -Seconds 5

    $files = Get-ChildItem -Path $DocsDir -File
    if ($files.Count -eq 0) {
        Write-Step "No files found in $DocsDir. Skipping ingestion upload step."
    } else {
        foreach ($file in $files) {
            Write-Step ("Uploading {0}..." -f $file.Name)
            try {
                Invoke-RestMethod -Uri "http://127.0.0.1:$AdapterPort/upload" -Method Post -Form @{
                    file = Get-Item $file.FullName
                    source = 'typescript'
                } | Out-Null
            } catch {
                Write-Warning ("Failed to upload {0}: {1}" -f $file.Name, $_)
            }
        }

        Write-Step ("Uploaded {0} document(s) to adapter." -f $files.Count)
    }

    Write-Step "Generating Phase47 AST cache via ts-morph..."
    try {
        & npx.cmd tsx go-microservice/cmd/phase47_astgraph.ts
    } catch {
        Write-Warning "AST cache generation failed: $_"
    }

    Write-Step "Running Phase46 full pipeline via npm..."
    $env:PHASE46_PIPELINE_AGENTIC = '1'
    $env:PHASE47_GRAPH_URL = "http://127.0.0.1:$GraphPort"
    try {
        & npm.cmd run phase46-full-pipeline
    } finally {
        Remove-Item Env:PHASE46_PIPELINE_AGENTIC -ErrorAction SilentlyContinue
        Remove-Item Env:PHASE47_GRAPH_URL -ErrorAction SilentlyContinue
    }

    Write-Step "Collecting status metrics..."
    if ($servicesToManage.Name -contains 'redis') {
        try {
            Safe-DockerExec -ServiceName 'redis' -ComposeFile $ComposeFile -Command @('redis-cli','dbsize')
        } catch {
            Write-Warning "Redis status check failed: $_"
        }
    }

    if ($servicesToManage.Name -contains 'postgres') {
        try {
            Safe-DockerExec -ServiceName 'postgres' -ComposeFile $ComposeFile -Command @('psql','-U','legal_admin','-d','legal_ai_db','-c','SELECT COUNT(*) FROM document_embeddings;')
        } catch {
            Write-Warning "Postgres status check failed: $_"
        }
    }

    if ($servicesToManage.Name -contains 'neo4j') {
        try {
            Safe-DockerExec -ServiceName 'neo4j' -ComposeFile $ComposeFile -Command @('cypher-shell','-u','neo4j','-p','123456',"MATCH (d:Document)-[r:RELATED]->() RETURN COUNT(r);")
        } catch {
            Write-Warning "Neo4j status check failed: $_"
        }
    } else {
        Write-Step "Neo4j service not present; skipping graph verification query."
    }

    Write-Step "Phase46/47 pipeline complete."
    if ($null -ne $adapter) {
        Write-Step "Adapter PID: $($adapter.Id)"
        Write-Step "Stop the adapter when finished with: Stop-Process -Id $($adapter.Id)"
    } else {
        Write-Step "Adapter process information was not captured."
    }

    if ($null -ne $graph) {
        Write-Step "Graph analyzer PID: $($graph.Id)"
        Write-Step "Stop the analyzer when finished with: Stop-Process -Id $($graph.Id)"
    }
} finally {
    Pop-Location
}
function Start-UvicornProcess {
    param(
        [string]$PythonPath,
        [string]$Module,
        [int]$Port,
        [hashtable]$Environment = @{}
    )

    $argumentList = @(
        '-m','uvicorn',
        $Module,
        '--host','0.0.0.0',
        '--port',$Port
    )

    if ($Environment.Count -gt 0) {
        return Start-Process -FilePath $PythonPath -ArgumentList $argumentList -PassThru -NoNewWindow -WorkingDirectory $PWD -Environment $Environment
    }

    return Start-Process -FilePath $PythonPath -ArgumentList $argumentList -PassThru -NoNewWindow -WorkingDirectory $PWD
}
