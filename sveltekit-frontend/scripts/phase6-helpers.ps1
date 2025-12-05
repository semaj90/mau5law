# Phase 6 PowerShell Helpers
# Quick ad-hoc checks for core machines and routes

Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Phase 6 PowerShell Helpers" -ForegroundColor Cyan
Write-Host "═══════════════════════════════════════════════════════════" -ForegroundColor Cyan

# Core machines list
$machines = @(
  "legalFormMachine",
  "caseManagementMachine",
  "documentUploadMachine",
  "legalDocumentProcessingMachine",
  "evidenceProcessingMachine",
  "app-machine",
  "async-rabbitmq-state-manager",
  "crewAIOrchestrationMachine",
  "embedding-worker",
  "utf8-fp32-converter"
)

# Function 1: Show everywhere a core machine is imported
function Find-MachineUsages {
  param(
    [Parameter(Mandatory=$false)]
    [string]$MachineName
  )

  if ($MachineName) {
    Write-Host "`n=== $MachineName ===" -ForegroundColor Yellow
    rg $MachineName src -n --type ts --type svelte
  } else {
    foreach ($m in $machines) {
      Write-Host "`n=== $m ===" -ForegroundColor Yellow
      rg $m src -n --type ts --type svelte --max-count 5
    }
  }
}

# Function 2: List all Svelte files under core route folders
function Get-CoreRouteFiles {
  Write-Host "`n📁 Core Route Files:" -ForegroundColor Cyan

  Get-ChildItem -Recurse `
    -Path "src/routes/cases", `
          "src/routes/evidence", `
          "src/routes/legal", `
          "src/routes/dashboard" `
    -Include "*+page.svelte","*+layout.svelte","*+page.ts","*+layout.ts" `
    -ErrorAction SilentlyContinue |
    Select-Object FullName
}

# Function 3: Check TypeScript errors in core machines
function Test-CoreMachines {
  Write-Host "`n🧪 TypeScript Check: Core Machines Only" -ForegroundColor Green

  $machineFiles = @(
    "src/lib/state/legalFormMachine.ts",
    "src/lib/state/caseManagementMachine.ts",
    "src/lib/state/documentUploadMachine.ts",
    "src/lib/state/legalDocumentProcessingMachine.ts",
    "src/lib/state/evidenceProcessingMachine.ts",
    "src/lib/state/app-machine.ts",
    "src/lib/state/async-rabbitmq-state-manager.ts",
    "src/lib/state/crewAIOrchestrationMachine.ts",
    "src/lib/workers/embedding-worker.ts",
    "src/lib/text/utf8-fp32-converter.ts"
  )

  npx tsc --noEmit --skipLibCheck @machineFiles
}

# Function 4: Find XState patterns
function Find-XStatePatterns {
  Write-Host "`n🔍 XState Usage Patterns:" -ForegroundColor Magenta

  Write-Host "`n→ Old pattern (createMachine<Context, Event>):" -ForegroundColor Yellow
  rg "createMachine<" src/lib/state --type ts -n

  Write-Host "`n→ New pattern (setup().createMachine):" -ForegroundColor Green
  rg "setup\(\)\.createMachine" src/lib/state --type ts -n

  Write-Host "`n→ fromPromise actors:" -ForegroundColor Cyan
  rg "fromPromise" src/lib/state --type ts -n
}

# Function 5: Quick error scan (top 10)
function Get-QuickErrors {
  Write-Host "`n⚠️  Quick Error Scan (First 10):" -ForegroundColor Red

  npx tsc --noEmit --skipLibCheck 2>&1 | Select-Object -First 10
}

# Main menu
Write-Host "`nAvailable Commands:" -ForegroundColor White
Write-Host "  1. Find-MachineUsages [-MachineName 'legalFormMachine']" -ForegroundColor Gray
Write-Host "  2. Get-CoreRouteFiles" -ForegroundColor Gray
Write-Host "  3. Test-CoreMachines" -ForegroundColor Gray
Write-Host "  4. Find-XStatePatterns" -ForegroundColor Gray
Write-Host "  5. Get-QuickErrors" -ForegroundColor Gray
Write-Host "`nExample: Find-MachineUsages -MachineName 'caseManagementMachine'" -ForegroundColor DarkGray
Write-Host "═══════════════════════════════════════════════════════════`n" -ForegroundColor Cyan
