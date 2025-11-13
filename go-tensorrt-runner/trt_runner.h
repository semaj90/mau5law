#ifndef TRT_RUNNER_H
#define TRT_RUNNER_H

#include <NvInfer.h>
#include <cuda_runtime.h>

#ifdef __cplusplus
extern "C" {
#endif

void loadEngine(const char* path);
const char* runInference(const char* text);

#ifdef __cplusplus
}
#endif

#endif // TRT_RUNNER_H