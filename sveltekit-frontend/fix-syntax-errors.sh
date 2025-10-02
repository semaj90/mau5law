#!/bin/bash
# Fix all syntax errors by running build in loop
max_iterations=20
iteration=0

while [ $iteration -lt $max_iterations ]; do
  echo "=== Iteration $((iteration+1)) ===" 
  
  # Run build and capture first error
  build_output=$(npx vite build 2>&1)
  
  # Check if build succeeded
  if echo "$build_output" | grep -q "✓.*built in"; then
    echo "✅ Build succeeded!"
    exit 0
  fi
  
  # Extract error file and line
  error_file=$(echo "$build_output" | grep -oP 'C:/[^:]+\.ts(?=:\d+:)' | head -1)
  
  if [ -z "$error_file" ]; then
    echo "❌ Could not parse error, stopping"
    echo "$build_output" | tail -20
    exit 1
  fi
  
  echo "Found error in: $error_file"
  echo "$build_output" | grep "ERROR:" | head -3
  
  iteration=$((iteration+1))
done

echo "❌ Max iterations reached"
exit 1
