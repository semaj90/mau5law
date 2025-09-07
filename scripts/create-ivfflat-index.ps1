<#
.SYNOPSIS
  Create a pgvector IVFFLAT index on a given table.column with the chosen metric.

.PARAMETER ConnectionString
  PostgreSQL connection string, e.g. postgresql://user:pass@localhost:5432/db

.PARAMETER Table
  Target table name (e.g. document_chunks)

.PARAMETER Column
  Target vector column name (default: embedding)

.PARAMETER Metric
  Distance metric: cosine | l2 | ip (inner product). Default: cosine

.PARAMETER Lists
  IVFFLAT lists parameter (default: 100)

.EXAMPLE
  ./create-ivfflat-index.ps1 -ConnectionString "postgresql://postgres:postgres@localhost:5432/legal_ai_db" -Table document_chunks -Column embedding -Metric cosine -Lists 100

.NOTES
  Attempts to locate psql automatically. Requires PostgreSQL client tools installed.
#>

param(
  [Parameter(Mandatory=$true)] [string]$ConnectionString,
  [Parameter(Mandatory=$true)] [string]$Table,
  [string]$Column = 'embedding',
  [ValidateSet('cosine','l2','ip')] [string]$Metric = 'cosine',
  [int]$Lists = 100
)

$ErrorActionPreference = 'Stop'

function Find-Psql {
  $candidates = @(
    "$env:ProgramFiles\PostgreSQL\17\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\16\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\15\bin\psql.exe",
    "$env:ProgramFiles\PostgreSQL\14\bin\psql.exe",
    "psql.exe",
    "psql"
  )
  foreach ($p in $candidates) { if (Get-Command $p -ErrorAction SilentlyContinue) { return (Get-Command $p).Source } }
  throw "psql not found. Please ensure PostgreSQL client tools are installed and psql is on PATH."
}

function Get-OpClass([string]$metric) {
  switch ($metric) {
    'cosine' { return 'vector_cosine_ops' }
    'l2'     { return 'vector_l2_ops' }
    'ip'     { return 'vector_ip_ops' }
    default  { return 'vector_cosine_ops' }
  }
}

function Get-IndexName([string]$table,[string]$column,[string]$metric) {
  return ("idx_{0}_{1}_ivfflat_{2}" -f $table.ToLower(), $column.ToLower(), $metric.ToLower())
}

Write-Host "🔧 Creating IVFFLAT index on $Table.$Column (metric=$Metric, lists=$Lists)" -ForegroundColor Cyan

$psql = Find-Psql
$opclass = Get-OpClass $Metric
$indexName = Get-IndexName $Table $Column $Metric

$sql = @"
CREATE EXTENSION IF NOT EXISTS vector;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = '$indexName'
  ) THEN
    EXECUTE format('CREATE INDEX %I ON %I USING ivfflat (%I $opclass) WITH (lists = %s);', '$indexName', '$Table', '$Column', '$Lists');
  END IF;
END$$;
ANALYZE $Table;
"@

& $psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname "$ConnectionString" --command "$sql" | Out-String | Write-Output

# Verify
$verifySql = "SELECT indexname, tablename FROM pg_indexes WHERE indexname = '$indexName';"
$verifyOut = & $psql --no-psqlrc --set ON_ERROR_STOP=1 --dbname "$ConnectionString" --tuples-only --no-align --command "$verifySql"

if ($verifyOut -and $verifyOut.Trim().Length -gt 0) {
  Write-Host "✅ Created/verified index: $indexName on $Table.$Column" -ForegroundColor Green
  exit 0
} else {
  Write-Host "❌ Failed to verify index: $indexName" -ForegroundColor Red
  exit 1
}
