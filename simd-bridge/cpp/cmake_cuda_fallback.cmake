# Optional CMake snippet: call from your main CMakeLists if needed.
# Example: include("cmake_cuda_fallback.cmake")
if(NOT DEFINED CUDA_TOOLKIT_ROOT_DIR OR "${CUDA_TOOLKIT_ROOT_DIR}" STREQUAL "")
  message(STATUS "CUDA not detected -- adding nvcc fallback flags to avoid linking libdevice")
  # These flags instruct nvcc not to try to use CUDA includes/libdevice.
  # Merge/apply them only when you still build .cu files with system nvcc but want CPU-only behavior.
  set(CMAKE_CUDA_FLAGS "${CMAKE_CUDA_FLAGS} -nocudainc -nocudalib" CACHE STRING "nvcc fallback flags" FORCE)
endif()
