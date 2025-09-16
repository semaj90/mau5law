#!/usr/bin/env python3
"""
Convert our working Q4_K_M PyTorch model to TensorRT
Simple direct conversion script
"""

import torch
import tensorrt as trt
import numpy as np
import time
import json
from pathlib import Path

# Import our working model
import sys
sys.path.append('.')
from simple_q4km_legal_ai import SimpleLegalAIModel, LegalAIProcessor

def convert_pytorch_to_tensorrt(pytorch_model, input_shape, output_path):
    """Convert PyTorch model to TensorRT engine"""

    print("Converting PyTorch Q4_K_M model to TensorRT...")

    # Set up TensorRT
    logger = trt.Logger(trt.Logger.INFO)
    builder = trt.Builder(logger)

    # Create network
    network = builder.create_network(1 << int(trt.NetworkDefinitionCreationFlag.EXPLICIT_BATCH))
    config = builder.create_builder_config()

    # Set memory limit (2GB)
    config.memory_pool_limit[trt.MemoryPoolType.WORKSPACE] = 2 << 30

    # Enable FP16 precision
    config.set_flag(trt.BuilderFlag.FP16)

    print(f"Input shape: {input_shape}")

    # Add input tensor
    input_tensor = network.add_input("input_ids", trt.DataType.INT32, input_shape[1:])

    # Export PyTorch model to ONNX first
    dummy_input = torch.randint(0, 1000, input_shape, dtype=torch.int32)

    # Create ONNX file
    onnx_path = Path(output_path).with_suffix('.onnx')

    print(f"Exporting to ONNX: {onnx_path}")

    pytorch_model.eval()
    with torch.no_grad():
        torch.onnx.export(
            pytorch_model,
            dummy_input,
            str(onnx_path),
            input_names=['input_ids'],
            output_names=['embeddings', 'classification'],
            dynamic_axes={
                'input_ids': {0: 'batch_size'},
                'embeddings': {0: 'batch_size'},
                'classification': {0: 'batch_size'}
            },
            opset_version=17,
            do_constant_folding=True
        )

    print("ONNX export completed!")

    # Parse ONNX to TensorRT
    parser = trt.OnnxParser(network, logger)

    print(f"Parsing ONNX file...")
    with open(onnx_path, 'rb') as model:
        if not parser.parse(model.read()):
            print("ONNX parsing failed!")
            for error in range(parser.num_errors):
                print(parser.get_error(error))
            return None

    print("ONNX parsing successful!")

    # Create optimization profile
    profile = builder.create_optimization_profile()
    profile.set_shape("input_ids", (1, 128), (4, 256), (8, 512))
    config.add_optimization_profile(profile)

    # Build engine
    print("Building TensorRT engine (this may take a few minutes)...")
    start_time = time.time()

    serialized_engine = builder.build_serialized_network(network, config)

    if not serialized_engine:
        print("Engine build failed!")
        return None

    build_time = time.time() - start_time
    print(f"Engine built successfully in {build_time:.2f} seconds!")

    # Save engine
    engine_path = Path(output_path).with_suffix('.trt')
    with open(engine_path, 'wb') as f:
        f.write(serialized_engine)

    print(f"TensorRT engine saved to: {engine_path}")

    # Save metadata
    metadata = {
        'input_shape': input_shape,
        'build_time_seconds': build_time,
        'tensorrt_version': trt.__version__,
        'pytorch_version': torch.__version__,
        'optimization_level': 'FP16',
        'engine_size_mb': len(serialized_engine) / (1024 * 1024)
    }

    metadata_path = Path(output_path).with_suffix('.json')
    with open(metadata_path, 'w') as f:
        json.dump(metadata, f, indent=2)

    return engine_path, metadata

def benchmark_tensorrt_engine(engine_path, input_shape, num_runs=50):
    """Benchmark TensorRT engine performance"""

    print(f"Benchmarking TensorRT engine...")

    # Load engine
    logger = trt.Logger(trt.Logger.WARNING)
    runtime = trt.Runtime(logger)

    with open(engine_path, 'rb') as f:
        engine_data = f.read()

    engine = runtime.deserialize_cuda_engine(engine_data)
    context = engine.create_execution_context()

    # Set input shape
    context.set_input_shape("input_ids", input_shape)

    # Allocate GPU memory
    import pycuda.driver as cuda
    import pycuda.autoinit

    # Calculate sizes
    input_size = np.prod(input_shape) * 4  # INT32
    embeddings_size = input_shape[0] * 768 * 4  # FP32
    classification_size = input_shape[0] * 5 * 4  # FP32

    # Allocate device memory
    d_input = cuda.mem_alloc(input_size)
    d_embeddings = cuda.mem_alloc(embeddings_size)
    d_classification = cuda.mem_alloc(classification_size)

    bindings = [int(d_input), int(d_embeddings), int(d_classification)]

    # Create test input
    h_input = np.random.randint(0, 1000, input_shape, dtype=np.int32)

    # Copy input to GPU
    cuda.memcpy_htod(d_input, h_input)

    # Warmup
    for _ in range(5):
        context.execute_v2(bindings)

    # Benchmark
    cuda.Context.synchronize()
    start_time = time.perf_counter()

    for _ in range(num_runs):
        context.execute_v2(bindings)

    cuda.Context.synchronize()
    end_time = time.perf_counter()

    avg_time_ms = (end_time - start_time) * 1000 / num_runs
    throughput = input_shape[0] * input_shape[1] * num_runs / (end_time - start_time)

    print(f"TensorRT Performance:")
    print(f"  Average time: {avg_time_ms:.2f}ms")
    print(f"  Throughput: {throughput:.1f} tokens/sec")

    return {
        'avg_time_ms': avg_time_ms,
        'throughput_tokens_per_sec': throughput,
        'input_shape': input_shape
    }

def main():
    """Main conversion and benchmark"""

    print("Q4_K_M PyTorch to TensorRT Converter")
    print("=" * 40)

    # Check prerequisites
    print(f"TensorRT version: {trt.__version__}")
    print(f"PyTorch version: {torch.__version__}")
    print(f"CUDA available: {torch.cuda.is_available()}")

    if not torch.cuda.is_available():
        print("CUDA not available, cannot run TensorRT conversion")
        return

    # Load our trained model
    print("\nLoading Q4_K_M model...")
    model_path = "./legal_ai_output/legal_ai_model.pt"

    if not Path(model_path).exists():
        print(f"Model not found at {model_path}")
        print("Please run simple-q4km-legal-ai.py first to create the model")
        return

    # Create model and load weights
    device = torch.device("cuda")
    model = SimpleLegalAIModel().to(device)
    model.load_state_dict(torch.load(model_path, map_location=device))
    model.eval()

    print(f"Model loaded with {sum(p.numel() for p in model.parameters())} parameters")

    # Define input shape (batch_size, sequence_length)
    input_shape = (1, 512)  # Start with single batch, 512 tokens

    # Convert to TensorRT
    try:
        engine_path, metadata = convert_pytorch_to_tensorrt(
            model, input_shape, "./legal_ai_output/q4km_tensorrt_engine"
        )

        print(f"\nConversion successful!")
        print(f"Engine size: {metadata['engine_size_mb']:.1f} MB")
        print(f"Build time: {metadata['build_time_seconds']:.1f} seconds")

        # Benchmark TensorRT vs PyTorch
        print("\n" + "=" * 40)
        print("Performance Comparison")
        print("=" * 40)

        # Benchmark PyTorch
        print("\nBenchmarking PyTorch model...")
        processor = LegalAIProcessor()

        # Create test document
        test_doc = {
            'title': 'Performance Test Document',
            'text': 'This is a test legal document for performance benchmarking. ' * 20
        }

        # PyTorch warmup
        for _ in range(5):
            processor.process_document(test_doc['title'], test_doc['text'])

        # PyTorch benchmark
        start_time = time.perf_counter()
        num_runs = 50

        for _ in range(num_runs):
            result = processor.process_document(test_doc['title'], test_doc['text'])

        end_time = time.perf_counter()

        pytorch_avg_ms = (end_time - start_time) * 1000 / num_runs
        pytorch_throughput = result['token_count'] * num_runs / (end_time - start_time)

        print(f"PyTorch Performance:")
        print(f"  Average time: {pytorch_avg_ms:.2f}ms")
        print(f"  Throughput: {pytorch_throughput:.1f} tokens/sec")

        # Benchmark TensorRT
        print(f"\nBenchmarking TensorRT engine...")
        tensorrt_results = benchmark_tensorrt_engine(engine_path, input_shape)

        # Calculate speedup
        speedup = pytorch_avg_ms / tensorrt_results['avg_time_ms']

        print(f"\nSpeedup Analysis:")
        print(f"  TensorRT vs PyTorch: {speedup:.2f}x faster")
        print(f"  Latency reduction: {pytorch_avg_ms - tensorrt_results['avg_time_ms']:.2f}ms")

        # Save results
        comparison_results = {
            'pytorch': {
                'avg_time_ms': pytorch_avg_ms,
                'throughput_tokens_per_sec': pytorch_throughput
            },
            'tensorrt': tensorrt_results,
            'speedup_factor': speedup,
            'conversion_metadata': metadata
        }

        results_path = "./legal_ai_output/tensorrt_comparison.json"
        with open(results_path, 'w') as f:
            json.dump(comparison_results, f, indent=2)

        print(f"\nResults saved to: {results_path}")
        print("\nTensorRT conversion and benchmarking complete!")

    except Exception as e:
        print(f"Conversion failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()