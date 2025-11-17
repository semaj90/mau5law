# cmake + cuDNN quick todo

## 1. Verify cuDNN is available in PyTorch

```powershell
python -c "import torch; print(torch.backends.cudnn.is_available()); print(torch.backends.cudnn.version())"
```

- `True` / `91002` confirms cuDNN 9.1 is usable.
- `False` / `None` means you need the cuDNN DLLs in your CUDA `bin/` (e.g. `C:\Program Files\NVIDIA GPU Computing Toolkit\CUDA\v13.0\bin`).

## 2. Configure cpp-ast-exporter with LibTorch + cuDNN

`cpp-ast-exporter/CMakeLists.txt` already clears `CMAKE_CUDA_ARCHITECTURES`, sets `TORCH_CUDA_ARCH_LIST "8.6"`, and looks for cuDNN under `C:/Program Files/NVIDIA/CUDNN/v9.16` by default. Run CMake with that root explicitly so the cache picks it up:

```powershell
cmake -S cpp-ast-exporter -B build -DCUDNN_ROOT="C:/Program Files/NVIDIA/CUDNN/v9.16"
```

Useful notes:

- If you install cuDNN elsewhere, change the `-DCUDNN_ROOT=` path.
- The script automatically adds both `include/13.0` and `lib/13.0/x64` subfolders so no manual copy is needed.
- Remaining warnings about `libnvrtc.so` shorthash are harmless (they come from LibTorch).

## 3. Build the project

```powershell
cmake --build build --config Release
```

or open `build/ASTGraphExporter.sln` in Visual Studio and build the desired config.

## 4. If cuDNN still is not found

1. Ensure `cudnn.h` exists under `C:\Program Files\NVIDIA\CUDNN\v9.16\include\13.0`.
2. Ensure the matching libraries (`cudnn64_9.lib`, etc.) live in `... \lib\13.0\x64`.
3. Re-run the CMake configure step after any path change so the cache refreshes.

Following these steps keeps PyTorch happy about architectures, surfaces the intended `sm_86` NVCC flags, and wires cuDNN into the build.***
