# scripts/ollama-helpers.psm1

function Get-OllamaEndpoint {
    [CmdletBinding()]
    param(
        [string] $ModelName
    )

    # 1. Base URL
    $endpoint = $env:OLLAMA_ENDPOINT
    if ([string]::IsNullOrWhiteSpace($endpoint)) {
        # Default local Ollama daemon
        $endpoint = "http://localhost:11434"
    }

    # 2. Model name
    if (-not $ModelName -or [string]::IsNullOrWhiteSpace($ModelName)) {
        # Your default legal model
        $ModelName = $env:OLLAMA_MODEL
        if ([string]::IsNullOrWhiteSpace($ModelName)) {
            $ModelName = "gemma3-legal:latest"
        }
    }

    [pscustomobject]@{
        Endpoint  = $endpoint.TrimEnd('/')
        ModelName = $ModelName
    }
}

function Invoke-OllamaAnalysis {
    [CmdletBinding()]
    param(
        [Parameter(Mandatory = $true)]
        [string] $Prompt,             # high-level instruction

        [Parameter(Mandatory = $true)]
        [string] $InputText,          # ripgrep results / code context

        [string] $ModelName
    )

    $cfg = Get-OllamaEndpoint -ModelName $ModelName

    # Ollama "chat" style API: POST /api/chat
    $body = @{
        model    = $cfg.ModelName
        messages = @(
            @{
                role    = "system"
                content = $Prompt
            },
            @{
                role    = "user"
                content = $InputText
            }
        )
        stream = $false
    } | ConvertTo-Json -Depth 6

    $url = "$($cfg.Endpoint)/api/chat"

    try {
        $response = Invoke-RestMethod -Uri $url -Method Post -Body $body -ContentType "application/json"
        # Ollama chat responses come back as {model, created_at, message:{role,content}, done, ...}
        if ($response.message -and $response.message.content) {
            return $response.message.content
        }

        # Fallback for older/other shapes
        return ($response | ConvertTo-Json -Depth 6)
    }
    catch {
        Write-Warning "Failed to call Ollama at $url: $($_.Exception.Message)"
        return $null
    }
}

Export-ModuleMember -Function Get-OllamaEndpoint, Invoke-OllamaAnalysis