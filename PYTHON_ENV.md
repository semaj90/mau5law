# Python Environment - CRITICAL

**ALWAYS use venv Python (not global):**
```
C:\Users\james\Videos\deeds-web-app\.venv\Scripts\python.exe
```

**Python Version:** 3.13.5 (venv) - works with PyTorch 2.8.0

## GPU Stack (Verified Working)
- **GPU:** RTX 3060 (12GB VRAM, sm_86)
- **CUDA Toolkit:** 13.0 (`C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0`)
- **PyTorch:** 2.8.0+cu128 (CUDA 12.8 runtime from wheel)
- **cuDNN:** v9.16 (`C:\Program Files\NVIDIA\CUDNN\v9.16`)
- **LibTorch:** 2.9.0+cu130 (C++ builds)

**CUDA Version Explained:**
- CUDA Toolkit 13.0 = Installed on system (cuBLAS, cuDNN native ops)
- CUDA 12.8 = PyTorch runtime (bundled in torch wheel)
- CUDA 13.0 = LibTorch C++ (for future native modules)

This is normal - PyTorch wheels bundle their own CUDA runtime.

## Verify Setup
```powershell
cd C:\Users\james\Videos\deeds-web-app
.venv\Scripts\activate
python -c "import torch; print(f'PyTorch: {torch.__version__}'); print(f'CUDA: {torch.cuda.is_available()}'); print(f'Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else \"N/A\"}')"
```

Expected output:
```
PyTorch: 2.8.0+cu128
CUDA: True
Device: NVIDIA GeForce RTX 3060
```

## Phase 72
```powershell
cd sveltekit-frontend
npm run phase72:auto-iterate  # Uses .venv Python automatically
```

Logs: `logs/phase72/*.jsonl`

