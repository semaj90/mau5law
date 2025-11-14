Write-Host "=== YoRHa System Monitor ===" -ForegroundColor Cyan

# -------------------------------
# 1. WSL Disk (ext4.vhdx size)
# -------------------------------
$vhdxFiles = Get-ChildItem "$env:LOCALAPPDATA\Packages" -Recurse -Filter ext4.vhdx -ErrorAction SilentlyContinue

foreach ($vhdx in $vhdxFiles) {
    $sizeGB = [math]::Round($vhdx.Length / 1GB, 2)
    Write-Host "WSL Disk: $($vhdx.FullName) — $sizeGB GB" -ForegroundColor Yellow
}

# -------------------------------
# 2. GPU Memory
# -------------------------------
try {
    $gpuInfo = & nvidia-smi --query-gpu=memory.used,memory.total --format=csv,noheader
    Write-Host "GPU Memory: $gpuInfo" -ForegroundColor Green
} catch {
    Write-Host "NVIDIA-SMI not found." -ForegroundColor Red
}

# -------------------------------
# 3. Docker Storage Usage
# -------------------------------
try {
    $dockerDF = docker system df --format "{{json .}}" | ConvertFrom-Json
    Write-Host "Docker Images: $($dockerDF.ImagesSize)" -ForegroundColor Green
    Write-Host "Docker Containers: $($dockerDF.ContainersSize)" -ForegroundColor Green
    Write-Host "Docker Volumes: $($dockerDF.ContainersSize)" -ForegroundColor Green
} catch {
    Write-Host "Docker not running." -ForegroundColor Red
}

# -------------------------------
# 4. TensorRT Engine Folder Sizes
# -------------------------------
if (Test-Path "./models") {
    $modelSize = (Get-ChildItem ./models -Recurse | Measure-Object Length -Sum).Sum
    $modelSizeGB = "{0:N2}" -f ($modelSize / 1GB)
    Write-Host "TRT/ONNX Models Folder: $modelSizeGB GB" -ForegroundColor Blue
}

# -------------------------------
# 5. Node.js Memory and Cache
# -------------------------------
try {
    $nodeVersion = & node --version 2>$null
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Node.js: $nodeVersion" -ForegroundColor Green

        # Check npm cache size
        $npmCache = & npm config get cache 2>$null
        if (Test-Path $npmCache) {
            $cacheSize = (Get-ChildItem $npmCache -Recurse | Measure-Object Length -Sum).Sum
            $cacheSizeMB = "{0:N2}" -f ($cacheSize / 1MB)
            Write-Host "NPM Cache: $cacheSizeMB MB" -ForegroundColor Yellow
        }
    }
} catch {
    Write-Host "Node.js not found." -ForegroundColor Red
}

# -------------------------------
# 6. Python Virtual Environments
# -------------------------------
$venvPaths = @(
    ".\.venv",
    ".\venv",
    ".\env",
    ".\.venv-phase46"
)

foreach ($venvPath in $venvPaths) {
    if (Test-Path $venvPath) {
        $venvSize = (Get-ChildItem $venvPath -Recurse | Measure-Object Length -Sum).Sum
        $venvSizeGB = "{0:N2}" -f ($venvSize / 1GB)
        Write-Host "Python VENV ($venvPath): $venvSizeGB GB" -ForegroundColor Magenta
    }
}

# -------------------------------
# 7. Build/Output Folders
# -------------------------------
$buildFolders = @(
    ".\build",
    ".\dist",
    ".\.next",
    ".\.svelte-kit",
    ".\node_modules\.cache",
    ".\.cache"
)

foreach ($folder in $buildFolders) {
    if (Test-Path $folder) {
        $folderSize = (Get-ChildItem $folder -Recurse | Measure-Object Length -Sum).Sum
        $folderSizeGB = "{0:N2}" -f ($folderSize / 1GB)
        Write-Host "Build Folder ($folder): $folderSizeGB GB" -ForegroundColor Gray
    }
}

# -------------------------------
# 8. System Memory
# -------------------------------
$memory = Get-CimInstance -ClassName Win32_OperatingSystem
$totalMemoryGB = "{0:N2}" -f ($memory.TotalVisibleMemorySize / 1MB)
$freeMemoryGB = "{0:N2}" -f ($memory.FreePhysicalMemory / 1MB)
$usedMemoryGB = "{0:N2}" -f (($memory.TotalVisibleMemorySize - $memory.FreePhysicalMemory) / 1MB)
Write-Host "System Memory: $usedMemoryGB / $totalMemoryGB GB used" -ForegroundColor Cyan

# -------------------------------
# 9. Disk Space (C: Drive)
# -------------------------------
try {
    $disk = Get-CimInstance -ClassName Win32_LogicalDisk -Filter "DeviceID='C:'"
    if ($disk.Size -gt 0) {
        $freeSpaceGB = "{0:N2}" -f ($disk.FreeSpace / 1GB)
        $totalSpaceGB = "{0:N2}" -f ($disk.Size / 1GB)
        $usedSpaceGB = "{0:N2}" -f (($disk.Size - $disk.FreeSpace) / 1GB)
        Write-Host "C: Drive: $usedSpaceGB / $totalSpaceGB GB used ($freeSpaceGB GB free)" -ForegroundColor White
    } else {
        Write-Host "C: Drive: Unable to read disk information" -ForegroundColor Red
    }
} catch {
    Write-Host "C: Drive: Error reading disk information - $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "============================"
Write-Host "YoRHa Status: Scan Complete" -ForegroundColor Cyan

# -------------------------------
# Warnings and Recommendations
# -------------------------------
$warnings = @()

# Check WSL disk size
foreach ($vhdx in $vhdxFiles) {
    $sizeGB = $vhdx.Length / 1GB
    if ($sizeGB -gt 50) {
        $warnings += "WSL disk is large ($sizeGB GB) - consider cleanup"
    }
}

# Check free disk space
if ($disk -and $disk.Size -gt 0 -and (($disk.FreeSpace / $disk.Size) -lt 0.1)) {
    $warnings += "Low disk space on C: drive (< 10% free)"
}

# Check Docker if running
try {
    $dockerVersion = docker --version 2>$null
    if ($dockerVersion) {
        $warnings += "Docker is running - check for large containers"
    }
} catch {
    # Docker not running, no warning needed
}

if ($warnings.Count -gt 0) {
    Write-Host ""
    Write-Host "⚠️  WARNINGS:" -ForegroundColor Yellow
    foreach ($warning in $warnings) {
        Write-Host "  • $warning" -ForegroundColor Yellow
    }
}