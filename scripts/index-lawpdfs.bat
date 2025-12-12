@echo off
REM Index lawpdfs to RAG System
REM This script indexes all PDF files in the lawpdfs directory

echo.
echo ========================================
echo   Index lawpdfs to RAG System
echo ========================================
echo.

REM Check if lawpdfs directory exists
if not exist "lawpdfs\" (
  echo ERROR: lawpdfs directory not found
  exit /b 1
)

REM Count PDF files
set pdf_count=0
for %%f in (lawpdfs\*.pdf) do set /a pdf_count+=1

echo Found %pdf_count% PDF files in lawpdfs/
echo.

REM Run the TypeScript indexing script
npx tsx scripts/index-lawpdfs-to-rag.ts

if %ERRORLEVEL% EQU 0 (
  echo.
  echo ========================================
  echo   Indexing Complete!
  echo ========================================
) else (
  echo.
  echo ========================================
  echo   Indexing Failed
  echo ========================================
  exit /b %ERRORLEVEL%
)
