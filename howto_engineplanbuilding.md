# How to Build a TensorRT Engine Plan

This guide outlines the process for building a TensorRT engine plan, based on the project's scripts and configuration patterns. The engine plan is a highly optimized version of a model, serialized for fast inference performance on NVIDIA GPUs.

The process failed for you previously, resulting in a frozen UI and no `engine.plan` file. This is often due to configuration errors, resource limitations (memory), or using the wrong build script for your environment.

## Step 1: Define the Engine Configuration

The foundation of a successful build is the `EngineConfig`. The function `create_engine_config` in the codebase is responsible for assembling this configuration from various sources.

A correct configuration requires specifying details about the model, the hardware, and the desired inference features. Key configuration objects include:

-   **`ModelConfig`**: Defines the core model details, such as:
    -   The base model from Hugging Face (`model_hf_config`).
    -   Data type/precision (`dtype`, e.g., `float16`, `bfloat16`).
    -   Quantization method (`quantization`, e.g., `bitsandbytes`).
    -   Maximum model length (`max_model_len`).

-   **`ParallelConfig`**: Manages distributed setup.
    -   `tensor_parallel_size`: The number of GPUs to split the model across.
    -   `pipeline_parallel_size`: The number of stages in the model pipeline.

-   **`CacheConfig`**: Controls the Key-Value (KV) cache.
    -   `gpu_memory_utilization`: The fraction of GPU memory to allocate.
    -   `block_size`: The size of a single cache block.

-   **`SchedulerConfig`**: Manages how requests are batched and processed.
    -   `max_num_seqs`: Maximum number of sequences in a batch.
    -   `max_num_batched_tokens`: Maximum tokens in a batch.

-   **Specialized Configs**: Optional features are enabled via these:
    -   `SpeculativeConfig`: For speculative decoding.
    -   `LoRAConfig`: For enabling LoRA adapters.
    -   `VisionLanguageConfig`: For multimodal models.

**Recommendation:** Before starting a build, ensure all parameters within the `create_engine_config` function are set correctly for your target model and hardware. An incorrect setting here is a common cause of build failures.

## Step 2: Execute the Build Script

The project contains numerous scripts for building engines. You must choose the one that matches your environment.

**Primary Build Scripts:**

-   `scripts/build-tensorrt-engines-rtx8gb.ps1`: This appears to be a specific, high-level script for building engines on a system with an 8GB RTX GPU. **This is a good starting point.**
-   `build_gemma_trt.sh`: For building Gemma models.
-   `build_tensorrt_from_gguf.sh`: For converting models from GGUF format.

**Execution:**

Run the appropriate script from your shell. For example:

```powershell
./scripts/build-tensorrt-engines-rtx8gb.ps1
```

The script will take the configuration from Step 1 and use TensorRT to build and optimize the model. This process can be time-consuming and memory-intensive.

## Step 3: Locate and Use the Engine Plan

If the build is successful, it will produce an `engine.plan` or similarly named `.plan`/`.engine` file. This file is the final artifact.

The built engine is then typically loaded by a service for inference, as suggested by the existence of `scripts/start-rtx8gb-service.ps1`.

## Troubleshooting

-   **Frozen UI / No Output File**: If the build process freezes or fails to produce a file, monitor system resources (GPU memory, RAM) during the build. It's likely you are running out of memory.
-   **Check Logs**: The build scripts should output logs. Look for any error messages from TensorRT, CUDA, or the model loader.
-   **Cleanup**: Use `tools/cleanup-dev.ps1` to remove any partial or corrupted build artifacts before trying again.
