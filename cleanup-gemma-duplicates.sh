#!/bin/bash
# Safe cleanup of duplicate Gemma models
# Run with: wsl bash -c "bash /mnt/c/Users/james/Videos/deeds-web-app/cleanup-gemma-duplicates.sh"

echo "=== GEMMA MODEL CLEANUP PLAN ==="
echo "You have 44 Gemma3 directories using ~180GB+"
echo ""

# Verified working models to KEEP
echo "✅ KEEP THESE (verified working):"
echo "  - gemma3_complete (29GB) - Contains working rank0.safetensors + gemma3_traced.pt"
echo "  - gemma3_checkpoint_fixed (28GB) - Contains 5-part model files"
echo ""

# Large duplicates that appear to be redundant
echo "⚠️  PROBABLE DUPLICATES (safe to remove):"
echo "  - gemma3_trtllm_checkpoint (19GB)"
echo "  - gemma3_trt_ready (19GB)"
echo "  - gemma3_clean_checkpoint (19GB)"
echo "  - gemma3_checkpoint_backup (15GB) - backup of checkpoint_fixed"
echo "  - gemma3_checkpoint_hf (14GB)"
echo "  - gemma3_awq4 (9GB) - duplicate of awq4_working"
echo "  - gemma3_quantized_pytorch (9.2GB)"
echo ""

# Empty/small directories
echo "❌ EMPTY/INCOMPLETE (safe to remove):"
for dir in ~/gemma3*; do
    if [ -d "$dir" ]; then
        size=$(du -s "$dir" 2>/dev/null | cut -f1)
        # If less than 100MB (100000 KB)
        if [ $size -lt 100000 ]; then
            basename "$dir"
        fi
    fi
done

echo ""
echo "📊 SPACE TO RECLAIM: ~120GB"
echo ""
echo "To execute cleanup, run:"
echo "wsl bash -c 'bash /mnt/c/Users/james/Videos/deeds-web-app/do-cleanup.sh'"