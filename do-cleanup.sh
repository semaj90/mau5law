#!/bin/bash
# Execute Gemma model cleanup - removes duplicates while keeping working models

echo "=== STARTING GEMMA MODEL CLEANUP ==="
echo "Keeping: gemma3_complete and gemma3_checkpoint_fixed"
echo ""

# Remove large duplicates
echo "Removing large duplicates..."
rm -rf ~/gemma3_trtllm_checkpoint
rm -rf ~/gemma3_trt_ready
rm -rf ~/gemma3_clean_checkpoint
rm -rf ~/gemma3_checkpoint_backup
rm -rf ~/gemma3_checkpoint_hf
rm -rf ~/gemma3_awq4  # Keep awq4_working instead
rm -rf ~/gemma3_quantized_pytorch

# Remove empty/small directories
echo "Removing empty directories..."
for dir in ~/gemma3*; do
    if [ -d "$dir" ]; then
        # Skip the ones we want to keep
        if [[ "$dir" == *"gemma3_complete"* ]] || [[ "$dir" == *"gemma3_checkpoint_fixed"* ]] || [[ "$dir" == *"gemma3_awq4_working"* ]]; then
            continue
        fi

        size=$(du -s "$dir" 2>/dev/null | cut -f1)
        # If less than 100MB (100000 KB), remove it
        if [ $size -lt 100000 ]; then
            echo "  Removing: $(basename $dir)"
            rm -rf "$dir"
        fi
    fi
done

echo ""
echo "✅ Cleanup complete!"
echo "Kept: gemma3_complete, gemma3_checkpoint_fixed, gemma3_awq4_working"
echo ""
echo "Now run WSL compact to reclaim disk space:"
echo "1. Exit WSL: exit"
echo "2. In PowerShell (as Admin): wsl --shutdown"
echo "3. Run: diskpart /s compact-ubuntu.txt"