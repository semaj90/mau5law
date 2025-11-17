from safetensors.torch import load_file, save_file
src = r'.\tensorrt_build\input\rank0.safetensors'
dst = r'.\tensorrt_build\input\rank0_fixed.safetensors'
print('Loading:', src)
tensors = load_file(src, device='cpu')
print('Total tensors:', len(tensors))
if 'lm_head.weight' in tensors:
    print('lm_head.weight already exists')
else:
    vocab_key = 'transformer.vocab_embedding.weight'
    if vocab_key not in tensors:
        raise RuntimeError('Missing ' + vocab_key)
    tensors['lm_head.weight'] = tensors[vocab_key].clone()
    print('Added lm_head.weight from', vocab_key)
print('Saving to:', dst)
save_file(tensors, dst)
