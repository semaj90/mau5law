#!/bin/bash
# Fix Windows CRLF line endings to Unix LF for Docker containers

echo "🔧 Fixing CRLF line endings to LF for container compatibility..."

# Files with CRLF that need fixing
files_to_fix=(
    "start-triton-legal-ai.sh"
    "go-microservice/tensorrt/scripts/start-q4km-stack.sh"
    "go-microservice/tensorrt/start_gpu_lifecycle.sh"
    "start-docker-auth.sh"
    "dev-start.sh"
    "start-hybrid-dev.sh"
    "tensorrt-legal/build.sh"
    "services/go-simd-service/start.sh"
)

# Check if dos2unix is available
if ! command -v dos2unix &> /dev/null; then
    echo "Installing dos2unix..."
    if command -v apt &> /dev/null; then
        sudo apt update && sudo apt install -y dos2unix
    elif command -v yum &> /dev/null; then
        sudo yum install -y dos2unix
    elif command -v brew &> /dev/null; then
        brew install dos2unix
    else
        echo "❌ Cannot install dos2unix. Please install it manually."
        exit 1
    fi
fi

# Fix each file
fixed_count=0
for file in "${files_to_fix[@]}"; do
    if [ -f "$file" ]; then
        echo "Fixing: $file"
        dos2unix "$file" 2>/dev/null
        chmod +x "$file" 2>/dev/null
        ((fixed_count++))
    else
        echo "⚠ File not found: $file"
    fi
done

echo "✅ Fixed $fixed_count files with CRLF→LF conversion"
echo "🐳 Your containers should now start properly!"

# Also fix any other shell scripts that might have issues
echo "🔍 Checking for other .sh files with CRLF..."
find . -name "*.sh" -type f -exec file {} \; | grep -i crlf | while read -r line; do
    filename=$(echo "$line" | cut -d: -f1)
    echo "Found CRLF in: $filename"
    dos2unix "$filename" 2>/dev/null
    chmod +x "$filename" 2>/dev/null
done

echo "🎉 All line endings fixed! Container startup should work now."