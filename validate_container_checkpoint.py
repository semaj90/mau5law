#!/usr/bin/env python3
import torch
import safetensors.torch as st
import json

print('🔍 Validating consolidated Gemma3 checkpoint:')
print('=' * 50)

# Load config
with open('consolidated_checkpoint/config.json', 'r') as f:
    config = json.load(f)
    print('Model config:', config.get('model_type', 'unknown'))
    print('Layers:', config.get('num_hidden_layers', 'unknown'))
    print('Hidden size:', config.get('hidden_size', 'unknown'))
    print('Vocab size:', config.get('vocab_size', 'unknown'))

# Validate safetensors
try:
    with st.safe_open('consolidated_checkpoint/model.safetensors', framework='pt', device='cpu') as f:
        keys = list(f.keys())
        print('\nValid safetensors file')
        print('Total tensors:', len(keys))

        embed_keys = [k for k in keys if 'embed_tokens' in k]
        if embed_keys:
            embed_tensor = f.get_tensor(embed_keys[0])
            vocab_size, hidden_size = embed_tensor.shape
            print('Embeddings:', vocab_size, 'vocab,', hidden_size, 'hidden')

            if hidden_size == 4096:
                print('✅ Correct dimensions for Gemma3 text model!')
            else:
                print('⚠️ Unexpected hidden size:', hidden_size)

        # Check layers
        layer_keys = [k for k in keys if 'layers' in k and 'weight' in k]
        layer_nums = set()
        for k in layer_keys:
            if '.layers.' in k:
                parts = k.split('.layers.')[1].split('.')
                if parts:
                    try:
                        layer_nums.add(int(parts[0]))
                    except:
                        pass
        print('Transformer layers:', len(layer_nums))

except Exception as e:
    print('❌ Error:', e)