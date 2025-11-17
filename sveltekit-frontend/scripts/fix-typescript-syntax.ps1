#!/usr/bin/env pwsh
<#
.SYNOPSIS
    Comprehensive TypeScript syntax fixer for corrupted files
.DESCRIPTION
    Fixes common syntax corruption patterns in TypeScript files:
    - Missing semicolons and commas
    - Malformed object literals and function parameters
    - Broken string literals and template literals
    - Incorrect type definitions
.PARAMETER Path
    Path to the TypeScript file to fix
.PARAMETER DryRun
    Show what would be fixed without making changes
.EXAMPLE
    .\fix-typescript-syntax.ps1 -Path "src/lib/services/webgpu-som-error-fixer.ts"
.EXAMPLE
    .\fix-typescript-syntax.ps1 -Path "src/lib/services/webgpu-som-error-fixer.ts" -DryRun
#>

param(
    [Parameter(Mandatory=$true)]
    [string]$Path,

    [switch]$DryRun
)

function Write-Log {
    param([string]$Message, [string]$Level = "INFO")
    $timestamp = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Write-Host "[$timestamp] [$Level] $Message"
}

function Fix-TypeScriptSyntax {
    param([string]$Content)

    $originalContent = $Content
    $fixedContent = $Content

    # Pattern 1: Fix missing semicolons in interface properties
    # Before: id: string, error: string, category: 'typescript'
    # After:  id: string; error: string; category: 'typescript'
    $fixedContent = $fixedContent -replace '([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,;}]+),\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,;}]+),\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([^,;}]+)(?=\s*[;}])', '$1: $2; $3: $4; $5: $6'

    # Pattern 2: Fix malformed optional properties with colon instead of question mark
    # Before: fixed: boolean: fixApplied?: string
    # After:  fixed: boolean; fixApplied?: string
    $fixedContent = $fixedContent -replace ':\s*boolean\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\s*:\s*string', ': boolean; $1?: string'

    # Pattern 3: Fix missing commas in object literals
    # Before: width: number, height: number: depthOrArrayLayers
    # After:  width: number; height: number; depthOrArrayLayers
    $fixedContent = $fixedContent -replace 'width\s*:\s*number\s*,\s*height\s*:\s*number\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)', 'width: number; height: number; $1'

    # Pattern 4: Fix malformed function parameters
    # Before: config: TextureStreamConfig: initialData?: ArrayBuffer
    # After:  config: TextureStreamConfig, initialData?: ArrayBuffer
    $fixedContent = $fixedContent -replace '([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>|\[\]]+)\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>|\[\]]+)', '$1: $2, $3?: $4'

    # Pattern 5: Fix broken template literals
    # Before: `Texture created: ${id }(${textureSize }bytes
    # After:  `Texture created: ${id} (${textureSize} bytes)`
    $fixedContent = $fixedContent -replace '\$\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\s*\(\$\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\}([a-zA-Z]+)', '${$1} (${$2} $3)'

    # Pattern 6: Fix missing closing braces in template literals
    # Before: `Texture created: ${id} (${textureSize} bytes, ${entry.cacheRegion})`
    # After:  `Texture created: ${id} (${textureSize} bytes, ${entry.cacheRegion})`
    $fixedContent = $fixedContent -replace '\$\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\)\s*$', '${$1})'

    # Pattern 7: Fix malformed object property assignments
    # Before: format | config.format: usage | config.usage
    # After:  format: config.format, usage: config.usage
    $fixedContent = $fixedContent -replace 'format\s*\|\s*config\.format\s*:\s*usage\s*\|\s*config\.usage', 'format: config.format, usage: config.usage'

    # Pattern 8: Fix broken array type annotations
    # Before: streamingLatency: [], as number[]
    # After:  streamingLatency: number[]
    $fixedContent = $fixedContent -replace 'streamingLatency\s*:\s*\[\]\s*,\s*as\s*number\[\]', 'streamingLatency: number[]'

    # Pattern 9: Fix malformed private property declarations
    # Before: private: client: RedisClientType
    # After:  private client: RedisClientType
    $fixedContent = $fixedContent -replace 'private\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>|\[\]]+)', 'private $1: $2'

    # Pattern 10: Fix broken Map type annotations
    # Before: texturePool | Map<string, StreamingTextureEntry>
    # After:  texturePool: Map<string, StreamingTextureEntry>
    $fixedContent = $fixedContent -replace '([a-zA-Z_][a-zA-Z0-9_]*)\s*\|\s*Map<', '$1: Map<'

    # Pattern 11: Fix malformed state declarations
    # Before: private isInitialized = $state (false)
    # After:  private isInitialized = $state(false)
    $fixedContent = $fixedContent -replace '\$state\s*\(\s*([a-zA-Z]+)\s*\)', '$state($1)'

    # Pattern 12: Fix broken GPU feature arrays
    # Before: ['texture-compression-bc'] as GPUFeatureName[]
    # After:  ['texture-compression-bc'] as GPUFeatureName[]
    # This one might be correct, but let's check for missing commas

    # Pattern 13: Fix malformed error event listeners
    # Before: addEventListener('uncapturederror', (_event, GPUUncapturedErrorEvent)
    # After:  addEventListener('uncapturederror', (event: GPUUncapturedErrorEvent)
    $fixedContent = $fixedContent -replace 'addEventListener\(''uncapturederror''\s*,\s*\(_event\s*,\s*GPUUncapturedErrorEvent\)', 'addEventListener(''uncapturederror'', (event: GPUUncapturedErrorEvent)'

    # Pattern 14: Fix broken buffer size calculations
    # Before: size, config.dimensions
    # After:  size: config.dimensions
    $fixedContent = $fixedContent -replace 'size\s*,\s*config\.dimensions', 'size: config.dimensions'

    # Pattern 15: Fix malformed texture creation
    # Before: size, config.dimensions, format, config.format
    # After:  size: config.dimensions, format: config.format
    $fixedContent = $fixedContent -replace 'size\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*format\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\.', 'size: $1, format: $2.'

    # Pattern 16: Fix broken metadata objects
    # Before: width: config.dimensions.width, height: config.dimensions.height: format | config.format
    # After:  width: config.dimensions.width, height: config.dimensions.height, format: config.format
    $fixedContent = $fixedContent -replace 'height\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\.height\s*:\s*format\s*\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\.format', 'height: $1.height, format: $2.format'

    # Pattern 17: Fix malformed size calculations
    # Before: size | textureSize,timestamp
    # After:  size: textureSize, timestamp
    $fixedContent = $fixedContent -replace 'size\s*\|\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)', 'size: $1, $2'

    # Pattern 18: Fix broken cache region assignments
    # Before: cacheRegion: this.determineCacheRegion(textureSize) }
    # After:  cacheRegion: this.determineCacheRegion(textureSize) }
    # This might be correct, but check for missing commas

    # Pattern 19: Fix malformed GPU cache store calls
    # Before: store(`texture_${id}`, entry { tags:
    # After:  store(`texture_${id}`, entry, { tags:
    $fixedContent = $fixedContent -replace 'store\(`texture_\$\{id\}`,\s*entry\s*\{\s*tags', 'store(`texture_${id}`, entry, { tags'

    # Pattern 20: Fix broken vertex buffer arrays
    # Before: vertexBuffers: initialData ? [new Float32Array(initialData)] , undefined
    # After:  vertexBuffers: initialData ? [new Float32Array(initialData)] : undefined
    $fixedContent = $fixedContent -replace 'vertexBuffers\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\?\s*\[([^\]]+)\]\s*,\s*undefined', 'vertexBuffers: $1 ? [$2] : undefined'

    # Pattern 21: Fix malformed userId assignments
    # Before: userId :  `texture-streaming-service`
    # After:  userId: `texture-streaming-service`
    $fixedContent = $fixedContent -replace 'userId\s*:\s*`\$\{([a-zA-Z0-9_-]+)\}`', 'userId: `$1`'

    # Pattern 22: Fix broken streaming operations
    # Before: streamTextureData( textureId: string, data: ArrayBuffer
    # After:  streamTextureData(textureId: string, data: ArrayBuffer
    $fixedContent = $fixedContent -replace '([a-zA-Z_][a-zA-Z0-9_]*)\(\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*string\s*,\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:\s*([a-zA-Z_][a-zA-Z0-9_<>|\[\]]+)', '$1($2: string, $3: $4'

    # Pattern 23: Fix malformed options parameters
    # Before: options: { region?: { x: number, y: number, width: number, height: number} mipLevel?: number
    # After:  options: { region?: { x: number; y: number; width: number; height: number }; mipLevel?: number
    $fixedContent = $fixedContent -replace 'region\?\s*:\s*\{\s*x\s*:\s*number\s*,\s*y\s*:\s*number\s*,\s*width\s*:\s*number\s*,\s*height\s*:\s*number\s*\}\s*([a-zA-Z_][a-zA-Z0-9_]*)\?\s*:\s*number', 'region?: { x: number; y: number; width: number; height: number }; $1?: number'

    # Pattern 24: Fix broken staging buffer creation
    # Before: size, processedData.byteLength, usage, GPUBufferUsage.COPY_SRC
    # After:  size: processedData.byteLength, usage: GPUBufferUsage.COPY_SRC
    $fixedContent = $fixedContent -replace 'size\s*,\s*([a-zA-Z_][a-zA-Z0-9_.]*)\.byteLength\s*,\s*usage\s*,\s*([a-zA-Z_][a-zA-Z0-9_.|]+)', 'size: $1.byteLength, usage: $2'

    # Pattern 25: Fix malformed copy operations
    # Before: { buffer: stagingBuffer | bytesPerRow, region.width
    # After:  { buffer: stagingBuffer, bytesPerRow: region.width
    $fixedContent = $fixedContent -replace '\{\s*buffer\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\|\s*bytesPerRow\s*,\s*([a-zA-Z_][a-zA-Z0-9_.]*)\.width', '{ buffer: $1, bytesPerRow: $2.width'

    # Pattern 26: Fix broken texture copy destinations
    # Before: { texture: entry.texture, mipLevel: options.mipLevel || 0, origin: { x: region.x, y: region.y: z: 0 }
    # After:  { texture: entry.texture, mipLevel: options.mipLevel || 0, origin: { x: region.x, y: region.y, z: 0 }
    $fixedContent = $fixedContent -replace 'y\s*:\s*([a-zA-Z_][a-zA-Z0-9_.|]*)\.y\s*:\s*z\s*:\s*0', 'y: $1.y, z: 0'

    # Pattern 27: Fix malformed copy sizes
    # Before: { width: region.width, height: region.height: depthOrArrayLayers: 1 }
    # After:  { width: region.width, height: region.height, depthOrArrayLayers: 1 }
    $fixedContent = $fixedContent -replace 'height\s*:\s*([a-zA-Z_][a-zA-Z0-9_.]*)\.height\s*:\s*([a-zA-Z_][a-zA-Z0-9_]*)', 'height: $1.height, $2'

    # Pattern 28: Fix broken GPU cache updates
    # Before: store(`texture_${textureId}`, entry { tags:
    # After:  store(`texture_${textureId}`, entry, { tags:
    $fixedContent = $fixedContent -replace 'store\(`texture_\$\{([a-zA-Z_][a-zA-Z0-9_]*)\}`,\s*entry\s*\{\s*tags', 'store(`texture_${$1}`, entry, { tags'

    # Pattern 29: Fix malformed format size objects
    # Before: 'r8unorm': 1;rg8unorm': 2
    # After:  'r8unorm': 1, 'rg8unorm': 2
    $fixedContent = $fixedContent -replace "'([a-zA-Z0-9-]+)': (\d+);'([a-zA-Z0-9-]+)': (\d+)", "'`$1': `$2, '`$3': `$4"

    # Pattern 30: Fix broken private method declarations
    # Before: private determineCacheRegion(textureSize, number)
    # After:  private determineCacheRegion(textureSize: number)
    $fixedContent = $fixedContent -replace 'private\s*([a-zA-Z_][a-zA-Z0-9_]*)\(([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*([a-zA-Z_][a-zA-Z0-9_<>|\[\]]+)\)', 'private $1($2: $3)'

    # Pattern 31: Fix malformed return statements
    # Before: return 'PRG_ROM'}else if (textureSize > 1 * 1024 * 1024) { // 1-4MB: Medium textures return 'CHR_ROM'}
    # After:  return 'PRG_ROM'; } else if (textureSize > 1 * 1024 * 1024) { // 1-4MB: Medium textures return 'CHR_ROM'; }
    $fixedContent = $fixedContent -replace 'return\s*''([A-Z_]+)''\s*\}\s*else\s*if\s*\(', 'return ''$1''; } else if ('

    # Pattern 32: Fix broken compression support checks
    # Before: return RTX_3060_TI_CONFIG.features.textureCompression.includes(format)}
    # After:  return RTX_3060_TI_CONFIG.features.textureCompression.includes(format); }
    $fixedContent = $fixedContent -replace 'includes\(([a-zA-Z_][a-zA-Z0-9_]*)\)\s*\}', 'includes($1); }'

    # Pattern 33: Fix malformed compression data handling
    # Before: return data.buffer instanceof ArrayBuffer ? data.buffer :  new ArrayBuffer(data.byteLength)
    # After:  return data.buffer instanceof ArrayBuffer ? data.buffer : new ArrayBuffer(data.byteLength);
    $fixedContent = $fixedContent -replace ':\s*new\s*ArrayBuffer\(([a-zA-Z_][a-zA-Z0-9_.]*)\)', ': new ArrayBuffer($1);'

    # Pattern 34: Fix broken streaming queue optimization
    # Before: console.warn(`âš ï¸ Streaming queue overloaded: ${queueSize }operations`)
    # After:  console.warn(`⚠️ Streaming queue overloaded: ${queueSize} operations`);
    $fixedContent = $fixedContent -replace '\$\{([a-zA-Z_][a-zA-Z0-9_]*)\s*\}([a-zA-Z]+)`\)', '${$1} $2`);'

    # Pattern 35: Fix malformed region stats
    # Before: 'CHR_ROM': 0;CHR_RAM': 0
    # After:  'CHR_ROM': 0, 'CHR_RAM': 0
    $fixedContent = $fixedContent -replace "'([A-Z_]+)': 0;'([A-Z_]+)': 0", "'`$1': 0, '`$2': 0"

    # Pattern 36: Fix broken performance metrics
    # Before: texturesStreamed, this.metrics.texturesStreamed
    # After:  texturesStreamed: this.metrics.texturesStreamed
    $fixedContent = $fixedContent -replace '([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*this\.metrics\.\1', '$1: this.metrics.$1'

    # Pattern 37: Fix malformed memory utilization
    # Before: memoryUtilization: ((this.metrics.totalMemoryUsed / (RTX_3060_TI_CONFIG.memoryBudgetMB * 1024 * 1024)) * 100).toFixed(1) + '%`
    # After:  memoryUtilization: `${((this.metrics.totalMemoryUsed / (RTX_3060_TI_CONFIG.memoryBudgetMB * 1024 * 1024)) * 100).toFixed(1)}%`
    $fixedContent = $fixedContent -replace '\+\s*''%`\s*$', '}%`;'

    # Pattern 38: Fix broken shutdown state
    # Before: this.isInitialized = $state (false)
    # After:  this.isInitialized = $state(false)
    $fixedContent = $fixedContent -replace '\$state\s*\(\s*([a-zA-Z]+)\s*\)', '$state($1)'

    # Pattern 39: Fix malformed export aliases
    # Before: export { WebGPUTextureStreamingService, as WebGPUTextureStreaming }
    # After:  export { WebGPUTextureStreamingService as WebGPUTextureStreaming }
    $fixedContent = $fixedContent -replace 'export\s*\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*,\s*as\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}', 'export { $1 as $2 }'

    return $fixedContent
}

# Main script logic
if (!(Test-Path $Path)) {
    Write-Log "File not found: $Path" "ERROR"
    exit 1
}

$content = Get-Content $Path -Raw -Encoding UTF8
$fixedContent = Fix-TypeScriptSyntax -Content $content

if ($content -eq $fixedContent) {
    Write-Log "No syntax errors found in $Path"
} else {
    if ($DryRun) {
        Write-Log "Would fix syntax errors in $Path (dry run)"
        $diff = Compare-Object ($content -split "`n") ($fixedContent -split "`n") -IncludeEqual
        foreach ($line in $diff) {
            if ($line.SideIndicator -eq "=>") {
                Write-Host "  + $($line.InputObject)" -ForegroundColor Green
            } elseif ($line.SideIndicator -eq "<=") {
                Write-Host "  - $($line.InputObject)" -ForegroundColor Red
            }
        }
    } else {
        $fixedContent | Set-Content $Path -Encoding UTF8
        Write-Log "Fixed syntax errors in $Path"
    }
}