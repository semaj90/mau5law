cmake_minimum_required(VERSION 3.18)
project(tensorbridge LANGUAGES C CXX)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_POSITION_INDEPENDENT_CODE ON)

find_package(CUDA QUIET)
if(CUDA_FOUND)
  enable_language(CUDA)
  message(STATUS "CUDA found: ${CUDA_VERSION}")
else()
  message(WARNING "CUDA not found; som_cache.cu will be a stubbed fallback.")
endif()

include_directories(${CMAKE_CURRENT_SOURCE_DIR}/include)

add_library(tensorbridge SHARED
  tensor_bridge.cc
  som_cache.cu
)

target_compile_definitions(tensorbridge PRIVATE BUILDING_TENSORBRIDGE)

find_package(PkgConfig QUIET)
pkg_check_modules(SIMDJSON simdjson QUIET)
if(SIMDJSON_FOUND)
  include_directories(${SIMDJSON_INCLUDE_DIRS})
  target_link_libraries(tensorbridge PRIVATE ${SIMDJSON_LIBRARIES})
endif()

install(TARGETS tensorbridge LIBRARY DESTINATION lib)
