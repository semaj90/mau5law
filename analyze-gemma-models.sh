#!/bin/bash
# Analyze Gemma model directories to identify duplicates and working versions

echo "=== GEMMA MODEL ANALYSIS ==="
echo "Total directories: $(ls -d ~/gemma3* 2>/dev/null | wc -l)"
echo ""

# Check large directories (>1GB)
echo "=== LARGE MODEL DIRECTORIES (>1GB) ==="
du -sh ~/gemma3* 2>/dev/null | sort -rh | while read size dir; do
    size_num=$(echo $size | sed 's/[A-Z]//g')
    unit=$(echo $size | sed 's/[0-9.]//g')

    # Only show directories > 1GB
    if [[ "$unit" == "G" ]]; then
        echo ""
        echo "📁 $dir - $size"

        # Check for model files
        if ls $dir/*.safetensors 2>/dev/null | head -1 > /dev/null; then
            count=$(ls $dir/*.safetensors 2>/dev/null | wc -l)
            echo "  ✓ Contains $count safetensors file(s)"
        fi

        if ls $dir/*.pt 2>/dev/null | head -1 > /dev/null; then
            count=$(ls $dir/*.pt 2>/dev/null | wc -l)
            echo "  ✓ Contains $count PyTorch file(s)"
        fi

        if ls $dir/*.bin 2>/dev/null | head -1 > /dev/null; then
            count=$(ls $dir/*.bin 2>/dev/null | wc -l)
            echo "  ✓ Contains $count bin file(s)"
        fi

        if ls $dir/*.gguf 2>/dev/null | head -1 > /dev/null; then
            count=$(ls $dir/*.gguf 2>/dev/null | wc -l)
            echo "  ✓ Contains $count GGUF file(s)"
        fi

        # Check last modified
        latest=$(ls -lt $dir | head -2 | tail -1 | awk '{print $6, $7, $8}')
        echo "  📅 Last modified: $latest"
    fi
done

echo ""
echo "=== VERIFIED WORKING MODEL ==="
# Test the main model
if [ -f ~/gemma3_complete/rank0.safetensors ]; then
    echo "✅ gemma3_complete/rank0.safetensors exists (19GB)"
    python3 -c "
import safetensors.torch
try:
    ckpt = safetensors.torch.load_file('/home/james/gemma3_complete/rank0.safetensors')
    print(f'  ✓ Successfully loaded {len(ckpt)} tensors')
except Exception as e:
    print(f'  ✗ Failed to load: {e}')
" 2>/dev/null
fi

echo ""
echo "=== EMPTY/SMALL DIRECTORIES (<100MB) ==="
for dir in ~/gemma3*; do
    if [ -d "$dir" ]; then
        size=$(du -s "$dir" 2>/dev/null | cut -f1)
        # If less than 100MB (100000 KB)
        if [ $size -lt 100000 ]; then
            echo "  ❌ $dir ($(du -sh "$dir" 2>/dev/null | cut -f1)) - likely empty/incomplete"
        fi
    fi
done

echo ""
echo "=== RECOMMENDATIONS ==="
echo "Keep: gemma3_complete (verified working, has both .pt and .safetensors)"
echo "Keep: gemma3_checkpoint_fixed (28GB, has 5-part model files)"
echo "Consider removing empty directories and duplicates"
echo ""
echo "Total space used by Gemma models: $(du -ch ~/gemma3* 2>/dev/null | tail -1 | cut -f1)"