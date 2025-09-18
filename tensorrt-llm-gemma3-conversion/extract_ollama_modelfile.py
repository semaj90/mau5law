#!/usr/bin/env python3
import argparse, json, subprocess, re, sys

def parse_modelfile(raw:str):
    base_model = None
    lora_paths = []
    tokenizer = None
    for line in raw.splitlines():
        l = line.strip()
        if l.lower().startswith('from '):
            # FROM <base>
            parts = l.split(maxsplit=1)
            if len(parts)==2:
                base_model = parts[1]
        if l.lower().startswith('adapter '):
            # adapter <path or url>
            m = re.split(r'\s+', l, maxsplit=1)
            if len(m)==2:
                lora_paths.append(m[1])
        if 'tokenizer' in l.lower() and ('tokenizer.json' in l or 'tokenizer.model' in l):
            tokenizer = 'present'
    return {
        'base_model': base_model,
        'adapters': lora_paths,
        'tokenizer_present': bool(tokenizer),
        'raw_lines': [r for r in raw.splitlines() if r.strip()]
    }

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--model', required=True, help='Ollama model tag, e.g. gemma3-legal:latest')
    ap.add_argument('--out', required=True, help='Output JSON meta path')
    args = ap.parse_args()

    try:
        raw = subprocess.check_output(['ollama', 'show', args.model, '--modelfile'], text=True)
    except subprocess.CalledProcessError as e:
        print(f'Failed to run ollama show: {e}', file=sys.stderr)
        sys.exit(1)

    meta = parse_modelfile(raw)
    meta['source_model'] = args.model
    with open(args.out,'w') as f:
        json.dump(meta,f,indent=2)
    print(f'Wrote meta to {args.out}')

if __name__=='__main__':
    main()
