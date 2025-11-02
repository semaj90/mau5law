# Install pgvector for PostgreSQL 17 - Run as Administrator
# This script copies the precompiled pgvector files to PostgreSQL installation

Write-Host "🚀 Installing pgvector for PostgreSQL 17..." -ForegroundColor Green

# Check if running as Administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "❌ This script must be run as Administrator!" -ForegroundColor Red
    Write-Host "Right-click PowerShell and select 'Run as Administrator'" -ForegroundColor Yellow
    pause
    exit 1
}

$sourceDir = "C:\Users\james\Desktop\deeds-web\deeds-web-app\pgvector-precompiled"
$pgDir = "C:\Program Files\PostgreSQL\17"

# Check if source directory exists
if (!(Test-Path $sourceDir)) {
    Write-Host "❌ Source directory not found: $sourceDir" -ForegroundColor Red
    pause
    exit 1
}

# Check if PostgreSQL directory exists
if (!(Test-Path $pgDir)) {
    Write-Host "❌ PostgreSQL 17 directory not found: $pgDir" -ForegroundColor Red
    pause
    exit 1
}

try {
    # Copy vector.dll to lib directory
    Write-Host "📁 Copying vector.dll to lib directory..."
    Copy-Item "$sourceDir\lib\vector.dll" "$pgDir\lib\vector.dll" -Force
    Write-Host "✅ vector.dll copied successfully"

    # Copy extension files
    Write-Host "📁 Copying extension files..."
    $extensionSource = "$sourceDir\share\extension"
    $extensionDest = "$pgDir\share\extension"
    
    if (!(Test-Path $extensionDest)) {
        New-Item -ItemType Directory -Path $extensionDest -Force
    }
    
    Copy-Item "$extensionSource\*" "$extensionDest\" -Force
    Write-Host "✅ Extension files copied successfully"

    # Copy include files if they exist
    if (Test-Path "$sourceDir\include") {
        Write-Host "📁 Copying include files..."
        $includeSource = "$sourceDir\include"
        $includeDest = "$pgDir\include"
        
        if (!(Test-Path $includeDest)) {
            New-Item -ItemType Directory -Path $includeDest -Force
        }
        
        Copy-Item "$includeSource\*" "$includeDest\" -Recurse -Force
        Write-Host "✅ Include files copied successfully"
    }

    Write-Host ""
    Write-Host "🎉 pgvector installation completed successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart PostgreSQL service"
    Write-Host "2. Connect to your database and run: CREATE EXTENSION vector;"
    Write-Host "3. Test with: SELECT extname,extversion FROM pg_extension WHERE extname='vector';"

} catch {
    Write-Host "❌ Installation failed: $($_.Exception.Message)" -ForegroundColor Red
    pause
    exit 1
}

pause