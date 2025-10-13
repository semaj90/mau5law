@echo off
setlocal

where nvcc >nul 2>&1
if %errorlevel%==0 (
  echo nvcc found -> building with nvcc
  nvcc -O3 -arch=sm_75 -c som_cache.cu -o som_cache.obj
  lib /OUT:libsom_cache.lib som_cache.obj
  goto :EOF
)

if defined CUDA_PATH (
  echo CUDA_PATH defined but nvcc not on PATH -> attempting nvcc via CUDA_PATH
  "%CUDA_PATH%\bin\nvcc.exe" -O3 -arch=sm_75 -c som_cache.cu -o som_cache.obj 2>nul
  if %errorlevel%==0 (
    lib /OUT:libsom_cache.lib som_cache.obj
    goto :EOF
  )
)

echo No nvcc found -> building CPU-only (NO_CUDA) with cl.exe if available
where cl >nul 2>&1
if %errorlevel%==0 (
  cl /nologo /O2 /DNO_CUDA /EHsc /c som_cache.cu
  lib /OUT:libsom_cache.lib som_cache.obj
  goto :EOF
)

echo No suitable compiler found on PATH. Install Visual Studio (cl.exe) or add nvcc to PATH, or use build.sh with g++.
endlocal
