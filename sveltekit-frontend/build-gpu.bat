@echo off
echo Building WardenNet GPU Components...
cd /d "%~dp0"

if not exist build mkdir build
cd build

echo Configuring with CMake...
cmake .. -DCMAKE_BUILD_TYPE=Release -DCMAKE_TOOLCHAIN_FILE=C:/vcpkg/scripts/buildsystems/vcpkg.cmake -DVCPKG_TARGET_TRIPLET=x64-windows -DCMAKE_CUDA_ARCHITECTURES=86 -DCMAKE_CUDA_FLAGS="-use_fast_math -lineinfo" -DCMAKE_CXX_FLAGS_RELEASE="/O2 /arch:AVX2" -G "Visual Studio 17 2022" -A x64

if %ERRORLEVEL% neq 0 (
    echo CMake configuration failed!
    pause
    exit /b 1
)

echo Building...
cmake --build . --config Release --parallel

if %ERRORLEVEL% neq 0 (
    echo Build failed!
    pause
    exit /b 1
)

echo Build completed successfully!
echo Check build/Release/ for output files
pause