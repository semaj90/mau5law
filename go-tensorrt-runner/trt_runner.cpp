#include "trt_runner.h"
#include <fstream>
#include <vector>
#include <string>
#include <iostream>

static nvinfer1::ICudaEngine* engine = nullptr;
static nvinfer1::IRuntime* runtime = nullptr;

void loadEngine(const char* path) {
    std::ifstream f(path, std::ios::binary);
    std::vector<char> data((std::istreambuf_iterator<char>(f)), {});
    runtime = nvinfer1::createInferRuntime(nvinfer1::ILogger::Severity::kWARNING);
    engine = runtime->deserializeCudaEngine(data.data(), data.size());
    std::cout << "Engine loaded successfully" << std::endl;
}

const char* runInference(const char* text) {
    // TODO: Implement actual inference
    return "TensorRT inference OK";
}