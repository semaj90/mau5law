#!/usr/bin/env python3
"""Lightweight validation of a built TensorRT-LLM engine.
Starts trtllm-serve (if not already) or uses python API (future) and runs a probe prompt.
"""
import argparse, subprocess, time, json, os, sys, socket
from pathlib import Path

def port_free(port:int)->bool:
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port))!=0

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--engine', required=True, help='Engine directory or plan path')
    ap.add_argument('--prompt', required=True, help='Probe prompt')
    ap.add_argument('--port', type=int, default=8084)
    args = ap.parse_args()

    # If directory given assume trtllm-build output with engine.plan inside
    engine_path = Path(args.engine)
    if engine_path.is_dir():
        # naive search
        plans = list(engine_path.glob('*.plan'))
        if not plans:
            print('No .plan file found in engine directory', file=sys.stderr)
            sys.exit(2)
        plan = plans[0]
    else:
        plan = engine_path

    # Start server if port free
    server_proc = None
    if port_free(args.port):
        print('Launching trtllm-serve...')
        server_proc = subprocess.Popen(['trtllm-serve','--engine_dir', str(plan.parent), '--port', str(args.port)])
        time.sleep(3)

    payload = {
        'model': 'gemma3-legal-trt',
        'prompt': args.prompt,
        'max_tokens': 128,
        'temperature': 0.2,
        'stream': False
    }
    import requests
    t0=time.time()
    r = requests.post(f'http://127.0.0.1:{args.port}/api/generate', json=payload, timeout=120)
    latency_ms=(time.time()-t0)*1000
    if r.status_code!=200:
        print('Request failed', r.status_code, r.text)
        if server_proc: server_proc.terminate()
        sys.exit(3)
    try:
        data=r.json()
    except Exception:
        print('Non-JSON response, raw:\n'+r.text[:500])
        if server_proc: server_proc.terminate()
        sys.exit(4)
    print(json.dumps({'latency_ms':latency_ms,'response_preview':data.get('response','')[:200]}, indent=2))
    if server_proc: server_proc.terminate()

if __name__=='__main__':
    main()
