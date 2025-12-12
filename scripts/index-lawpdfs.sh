#!/bin/bash
# Index lawpdfs to RAG System
# This script indexes all PDF files in the lawpdfs directory

echo "🚀 Indexing lawpdfs to RAG system..."
echo ""

# Check if lawpdfs directory exists
if [ ! -d "./lawpdfs" ]; then
  echo "❌ Error: lawpdfs directory not found"
  exit 1
fi

# Count PDF files
pdf_count=$(find ./lawpdfs -name "*.pdf" | wc -l)
echo "📚 Found $pdf_count PDF files in lawpdfs/"
echo ""

# Run the TypeScript indexing script
npx tsx scripts/index-lawpdfs-to-rag.ts

exit_code=$?

if [ $exit_code -eq 0 ]; then
  echo "✅ Indexing complete!"
else
  echo "❌ Indexing failed with exit code $exit_code"
fi

exit $exit_code
