#!/usr/bin/env python3
"""Merge Gemma3 LoRA adapters into base model producing a full HF directory.
Requires: transformers, peft, safetensors.
"""
import argparse, os, json, shutil
from pathlib import Path
from transformers import AutoModelForCausalLM, AutoTokenizer
try:
    from peft import PeftModel
except ImportError:
    PeftModel = None

def copy_tokenizer(base_dir:Path, out_dir:Path):
    for name in ['tokenizer.json','tokenizer.model','tokenizer_config.json','special_tokens_map.json','generation_config.json']:
        src = base_dir / name
        if src.exists():
            shutil.copy(src, out_dir / name)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--base', required=True, help='Base Gemma3 HF model path or repo id')
    ap.add_argument('--lora', required=False, help='LoRA adapter path (optional)')
    ap.add_argument('--out', required=True, help='Output merged model directory')
    ap.add_argument('--dtype', default='bfloat16', choices=['float16','bfloat16','float32'])
    args = ap.parse_args()

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    print(f'Loading base model {args.base} ...')
    model = AutoModelForCausalLM.from_pretrained(args.base, torch_dtype=None, low_cpu_mem_usage=True)
    tok = AutoTokenizer.from_pretrained(args.base)

    if args.lora:
        if PeftModel is None:
            raise RuntimeError('peft not installed but --lora provided')
        print(f'Applying LoRA adapter {args.lora} ...')
        model = PeftModel.from_pretrained(model, args.lora)
        print('Merging LoRA weights...')
        model = model.merge_and_unload()

    print('Saving merged model (fp weights) ...')
    model.save_pretrained(out_dir)
    tok.save_pretrained(out_dir)

    meta = { 'base': args.base, 'lora': args.lora, 'dtype': args.dtype }
    with open(out_dir / 'merge_meta.json','w') as f: json.dump(meta,f,indent=2)
    print(f'Merged model written to {out_dir}')

if __name__ == '__main__':
    main()
