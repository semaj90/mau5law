param(
    [Parameter(Mandatory=$true)]
    [string]$SourcePath,

    [Parameter(Mandatory=$true)]
    [string]$ContainerName,

    [Parameter(Mandatory=$true)]
    [string]$DestPath
)

Write-Host "Encoding file as base64..."
$TempBase64 = "$env:TEMP\docker_copy.b64"

# Always encode as raw bytes → base64 avoids Unicode corruption
certutil -encode $SourcePath $TempBase64 | Out-Null

Write-Host "Copying base64 to container..."
docker cp $TempBase64 "${ContainerName}:/tmp/docker_copy.b64"

Write-Host "Decoding inside container..."
docker exec $ContainerName sh -c "base64 -d /tmp/docker_copy.b64 > $DestPath"

Write-Host "Cleaning temporary file..."
Remove-Item $TempBase64 -Force

Write-Host "DONE - File copied to container without corruption!"
Write-Host "Copied: $SourcePath -> ${ContainerName}:$DestPath"