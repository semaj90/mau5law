#!/usr/bin/env python3
"""Convert merged Gemma3 HF model to TensorRT-LLM checkpoint structure.
This wraps tensorrt_llm.convert and adds guard rails.
"""
import argparse, os, sys, subprocess, json, shutil
from pathlib import Path

def check_imports():
    missing = []
    for mod in ['tensorrt_llm','transformers','safetensors']:
        try:
            __import__(mod)
        except ImportError:
            missing.append(mod)
    if missing:
        print('Missing modules: '+ ', '.join(missing), file=sys.stderr)
        sys.exit(1)

def run_convert(hf_model:Path, workspace:Path):
    workspace.mkdir(parents=True, exist_ok=True)
    out_dir = workspace / 'converted'
    cmd = [sys.executable,'-m','tensorrt_llm.convert','--model_dir',str(hf_model),'--output_dir',str(out_dir)]
    print('Running:',' '.join(cmd))
    subprocess.check_call(cmd)
    return out_dir

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--hf-model', required=True, help='Merged HF model directory')
    ap.add_argument('--workspace', required=True, help='Workspace directory')
    args = ap.parse_args()

    hf_model = Path(args.hf_model)
    if not hf_model.exists():
        print('HF model directory missing', file=sys.stderr); sys.exit(1)
    workspace = Path(args.workspace)

    check_imports()
    converted = run_convert(hf_model, workspace)

    manifest = {
        'hf_model': str(hf_model),
        'converted_dir': str(converted),
    }
    with open(workspace / 'conversion_manifest.json','w') as f:
        json.dump(manifest,f,indent=2)
    print('Conversion complete.')

if __name__=='__main__':
    main()
