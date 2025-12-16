param([string]$Root = "src", [switch]$DryRun)

$ErrorActionPreference = "Stop"

$files = Get-ChildItem -Path $Root -Recurse -Filter *.svelte -File

function Slug([string]$s) {
  ($s.ToLower() -replace "[^a-z0-9]+","_" -replace "^_+|_+$","")
}

foreach ($f in $files) {
  $p = $f.FullName
  try {
    $content = Get-Content $p
    if ($null -eq $content) { continue }
    $txt = [string]::Join("`n", $content)
  } catch {
    continue
  }

  if ([string]::IsNullOrEmpty($txt)) { continue }

  # Match: <label ...>Text</label> (optional whitespace/newlines) <Input ...>
  $rx = [regex]::new('(<label\b([^>]*)>)([^<\r\n][^<]*?)(</label>\s*)(<Input\b(?![^>]*\bid=)([^>]*)>)', 'IgnoreCase')

  $changed = $false
  $txt2 = $rx.Replace($txt, {
    param($m)
    $labelOpen = $m.Groups[1].Value
    $labelAttrs = $m.Groups[2].Value
    $labelText = $m.Groups[3].Value.Trim()
    $labelClose = $m.Groups[4].Value
    $inputOpen = $m.Groups[5].Value
    $inputAttrs = $m.Groups[6].Value

    $id = Slug($labelText)
    if ([string]::IsNullOrWhiteSpace($id)) { $id = "field" }

    # add for= if missing
    if ($labelOpen -notmatch '\bfor=') {
      $labelOpen = $labelOpen.TrimEnd(">") + " for=`"$id`">"
    }

    # add id= to Input if missing
    $newInput = "<Input id=`"$id`"$inputAttrs>"

    return "$labelOpen$labelText</label>`n$newInput"
  })

  if ($txt2 -ne $txt) {
    Write-Host "Fixed: $p"
    if (-not $DryRun) { Set-Content -Path $p -Value $txt2 -NoNewline }
  }
}