# This script optimizes VS Code for low memory usage and sets up the development environment.

# Set TypeScript Server memory limit to 4 GB
$env:TSSERVER_MAX_OLD_SPACE_SIZE = 4096
Write-Host "TypeScript Server memory limit set to 4 GB."

# Set Node.js heap memory limit to 8 GB
$env:NODE_OPTIONS = "--max-old-space-size=30720"
Write-Host "Node.js heap memory limit set to 8 GB."

# --- Configure x64 MSVC + CUDA 13.0 Toolchain ---
# IMPORTANT: You may need to adjust the path to vcvars64.bat based on your Visual Studio installation.
# This example assumes Visual Studio 2022 Community Edition.
$vsPath = "C:\Program Files\Microsoft Visual Studio\2022\Community\VC\Auxiliary\Build\vcvars64.bat"

# If you have CUDA 13.0 installed, ensure its bin directory is in your PATH.
# Example: $env:Path += ";C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0\bin"

if (Test-Path $vsPath) {
    Write-Host "Setting up MSVC x64 environment..."
    # Call vcvars64.bat to set up the environment variables for MSVC
    # The '&' operator is used to run the batch file and keep its environment changes
    & $vsPath
    Write-Host "MSVC x64 environment configured."
} else {
    Write-Warning "vcvars64.bat not found at '$vsPath'. Please update the script with the correct path to your Visual Studio installation if you need the MSVC toolchain."
}

# Launch VS Code
Write-Host "Launching VS Code with optimized settings..."
code .
