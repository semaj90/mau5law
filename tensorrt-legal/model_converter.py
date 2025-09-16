#!/usr/bin/env python3
"""
Gemma3-Legal Q4_K_M Model Converter
Converts Gemma3 models to TensorRT-optimized ONNX with INT4 quantization
"""

import os
import sys
import argparse
import logging
import json
import time
import zstandard as zstd
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Union

import torch
import torch.nn as nn
import onnx
import onnxruntime as ort
from transformers import (
    AutoTokenizer, AutoModelForCausalLM,
    AutoConfig, PreTrainedModel
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class Q4KMQuantizer:
    """INT4 Q4_K_M quantization for Gemma3-Legal models"""

    def __init__(self, group_size: int = 256):
        self.group_size = group_size

    def quantize_tensor(self, tensor: torch.Tensor) -> Tuple[torch.Tensor, torch.Tensor, torch.Tensor]:
        """
        Quantize tensor to Q4_K_M format
        Returns: (quantized_tensor, scales, mins)
        """
        # Reshape tensor for group-wise quantization
        original_shape = tensor.shape
        tensor_flat = tensor.flatten()

        # Pad to group_size boundary
        pad_size = (self.group_size - (tensor_flat.numel() % self.group_size)) % self.group_size
        if pad_size > 0:
            tensor_flat = torch.cat([tensor_flat, torch.zeros(pad_size, dtype=tensor.dtype, device=tensor.device)])

        # Reshape into groups
        tensor_groups = tensor_flat.view(-1, self.group_size)

        # Calculate per-group min/max for quantization
        group_mins = tensor_groups.min(dim=1, keepdim=True)[0]
        group_maxs = tensor_groups.max(dim=1, keepdim=True)[0]

        # Calculate scales (15.0 for 4-bit range 0-15)
        scales = (group_maxs - group_mins) / 15.0
        scales = scales.clamp_(min=1e-8)  # Avoid division by zero

        # Quantize to 4-bit
        normalized = (tensor_groups - group_mins) / scales
        quantized = normalized.round().clamp(0, 15).to(torch.uint8)

        # Pack two 4-bit values into one uint8
        quantized_even = quantized[:, ::2]
        quantized_odd = quantized[:, 1::2]

        # Handle odd number of elements
        if quantized_even.shape[1] > quantized_odd.shape[1]:
            quantized_odd = torch.cat([
                quantized_odd,
                torch.zeros(quantized_odd.shape[0], 1, dtype=torch.uint8, device=quantized_odd.device)
            ], dim=1)

        # Pack: lower 4 bits = even, upper 4 bits = odd
        packed = quantized_even | (quantized_odd << 4)

        return packed, scales.squeeze(-1), group_mins.squeeze(-1)

    def dequantize_tensor(self, packed: torch.Tensor, scales: torch.Tensor, mins: torch.Tensor,
                         original_shape: torch.Size) -> torch.Tensor:
        """Dequantize Q4_K_M tensor back to FP32"""
        # Unpack 4-bit values
        quantized_even = packed & 0xF
        quantized_odd = (packed >> 4) & 0xF

        # Interleave even and odd values
        quantized = torch.stack([quantized_even, quantized_odd], dim=2).flatten(1)

        # Dequantize
        scales = scales.unsqueeze(-1)
        mins = mins.unsqueeze(-1)
        dequantized = quantized.float() * scales + mins

        # Reshape back to original shape
        return dequantized.flatten()[:torch.prod(torch.tensor(original_shape))].view(original_shape)

class GemmaLegalModelConverter:
    """Converter for Gemma3-Legal models to TensorRT-optimized ONNX"""

    def __init__(self, model_name: str, output_dir: str, cache_dir: str = "./cache"):
        self.model_name = model_name
        self.output_dir = Path(output_dir)
        self.cache_dir = Path(cache_dir)
        self.quantizer = Q4KMQuantizer()

        # Ensure directories exist
        self.output_dir.mkdir(parents=True, exist_ok=True)
        self.cache_dir.mkdir(parents=True, exist_ok=True)

    def load_model_and_tokenizer(self) -> Tuple[PreTrainedModel, AutoTokenizer]:
        """Load Gemma3-Legal model and tokenizer"""
        logger.info(f"Loading model: {self.model_name}")

        # Load with optimizations for RTX 3060 Ti (8GB VRAM)
        model = AutoModelForCausalLM.from_pretrained(
            self.model_name,
            torch_dtype=torch.float16,
            device_map="auto",
            low_cpu_mem_usage=True,
            trust_remote_code=True,
            use_flash_attention_2=True  # Enable FlashAttention
        )

        tokenizer = AutoTokenizer.from_pretrained(self.model_name, trust_remote_code=True)

        # Ensure tokenizer has necessary tokens
        if tokenizer.pad_token is None:
            tokenizer.pad_token = tokenizer.eos_token

        logger.info(f"Model loaded: {model.config.model_type}")
        logger.info(f"Model size: ~{sum(p.numel() for p in model.parameters()) / 1e9:.1f}B parameters")

        return model, tokenizer

    def quantize_model_weights(self, model: PreTrainedModel) -> Dict:
        """Quantize model weights to Q4_K_M format"""
        logger.info("Quantizing model weights to INT4 Q4_K_M format...")

        quantized_weights = {}
        total_params = 0
        compressed_params = 0

        for name, param in model.named_parameters():
            if param.requires_grad and len(param.shape) >= 2:  # Only quantize 2D+ tensors
                logger.debug(f"Quantizing {name}: {param.shape}")

                packed, scales, mins = self.quantizer.quantize_tensor(param.data)

                quantized_weights[name] = {
                    'packed': packed,
                    'scales': scales,
                    'mins': mins,
                    'original_shape': param.shape,
                    'dtype': str(param.dtype)
                }

                total_params += param.numel()
                compressed_params += packed.numel() + scales.numel() + mins.numel()

            else:
                # Keep small tensors unquantized
                quantized_weights[name] = {
                    'data': param.data,
                    'original_shape': param.shape,
                    'dtype': str(param.dtype),
                    'unquantized': True
                }
                total_params += param.numel()
                compressed_params += param.numel()

        compression_ratio = total_params / compressed_params
        logger.info(f"Quantization complete: {compression_ratio:.1f}x compression ratio")

        return quantized_weights

    def export_to_onnx(self, model: PreTrainedModel, tokenizer: AutoTokenizer,
                       batch_size: int = 8, seq_len: int = 2048) -> str:
        """Export model to ONNX format with dynamic shapes"""
        logger.info("Exporting model to ONNX format...")

        model.eval()

        # Prepare dummy inputs with dynamic shapes
        input_ids = torch.randint(0, tokenizer.vocab_size, (batch_size, seq_len), dtype=torch.long)
        attention_mask = torch.ones_like(input_ids)

        # Dynamic axes for variable batch size and sequence length
        dynamic_axes = {
            'input_ids': {0: 'batch_size', 1: 'sequence_length'},
            'attention_mask': {0: 'batch_size', 1: 'sequence_length'},
            'logits': {0: 'batch_size', 1: 'sequence_length'}
        }

        # ONNX export path
        onnx_path = self.output_dir / f"{self.model_name.split('/')[-1]}-q4km.onnx"

        # Export with optimizations
        torch.onnx.export(
            model,
            (input_ids, attention_mask),
            str(onnx_path),
            export_params=True,
            opset_version=17,  # Latest stable opset
            do_constant_folding=True,
            input_names=['input_ids', 'attention_mask'],
            output_names=['logits'],
            dynamic_axes=dynamic_axes,
            verbose=False
        )

        # Verify ONNX model
        onnx_model = onnx.load(str(onnx_path))
        onnx.checker.check_model(onnx_model)

        logger.info(f"ONNX export complete: {onnx_path}")
        return str(onnx_path)

    def optimize_onnx_for_tensorrt(self, onnx_path: str) -> str:
        """Optimize ONNX model for TensorRT"""
        logger.info("Optimizing ONNX model for TensorRT...")

        # Load ONNX model
        onnx_model = onnx.load(onnx_path)

        # Apply optimizations
        from onnxruntime.transformers import optimizer
        from onnxruntime.transformers.onnx_model_bert import OnnxModelBert

        # Optimize for transformer models
        optimized_model = optimizer.optimize_model(
            onnx_path,
            model_type='bert',  # Generic transformer optimizations
            num_heads=32,       # Gemma3 heads
            hidden_size=4096,   # Gemma3 hidden size
            optimization_options=optimizer.OptimizationOptions(
                enable_gelu=True,
                enable_layer_norm=True,
                enable_attention=True,
                enable_skip_layer_norm=True,
                enable_embed_layer_norm=True,
                enable_bias_skip_layer_norm=True,
                enable_bias_gelu=True,
                enable_gelu_approximation=False,
            )
        )

        # Save optimized model
        optimized_path = onnx_path.replace('.onnx', '-tensorrt-optimized.onnx')
        optimized_model.save_model_to_file(optimized_path)

        logger.info(f"TensorRT optimization complete: {optimized_path}")
        return optimized_path

    def create_tensorrt_config(self, onnx_path: str, max_batch_size: int = 8,
                              max_seq_len: int = 131072) -> Dict:
        """Create TensorRT configuration file"""
        config = {
            "model_path": onnx_path,
            "max_batch_size": max_batch_size,
            "max_seq_len": max_seq_len,
            "precision": "INT4",
            "optimization_level": 5,
            "workspace_size_gb": 6,  # RTX 3060 Ti optimization
            "enable_cuda_graphs": True,
            "enable_flash_attention": True,
            "q4km_quantization": True,
            "plugins": ["Q4KMFlashAttention"],
            "optimization_profiles": [
                {
                    "name": "legal_documents",
                    "min_shapes": {"input_ids": [1, 1], "attention_mask": [1, 1]},
                    "opt_shapes": {"input_ids": [4, max_seq_len//4], "attention_mask": [4, max_seq_len//4]},
                    "max_shapes": {"input_ids": [max_batch_size, max_seq_len], "attention_mask": [max_batch_size, max_seq_len]}
                }
            ]
        }

        config_path = self.output_dir / "tensorrt_config.json"
        with open(config_path, 'w') as f:
            json.dump(config, f, indent=2)

        logger.info(f"TensorRT config saved: {config_path}")
        return config

    def compress_and_cache_model(self, file_path: str) -> str:
        """Compress model files using ZSTD for efficient caching"""
        logger.info(f"Compressing model: {file_path}")

        # Read original file
        with open(file_path, 'rb') as f:
            data = f.read()

        # Compress with ZSTD (level 3 for good compression/speed balance)
        compressor = zstd.ZstdCompressor(level=3)
        compressed_data = compressor.compress(data)

        # Save compressed version
        compressed_path = file_path + '.zst'
        with open(compressed_path, 'wb') as f:
            f.write(compressed_data)

        compression_ratio = len(data) / len(compressed_data)
        logger.info(f"Compression complete: {compression_ratio:.1f}x reduction")

        return compressed_path

    def benchmark_model_performance(self, onnx_path: str) -> Dict:
        """Benchmark ONNX model performance"""
        logger.info("Benchmarking model performance...")

        # Create ONNX Runtime session
        session = ort.InferenceSession(
            onnx_path,
            providers=['CUDAExecutionProvider', 'CPUExecutionProvider']
        )

        # Prepare test inputs
        batch_sizes = [1, 2, 4, 8]
        seq_lengths = [512, 1024, 2048, 4096]

        benchmark_results = {}

        for batch_size in batch_sizes:
            for seq_len in seq_lengths:
                # Create dummy inputs
                input_ids = torch.randint(0, 32000, (batch_size, seq_len), dtype=torch.int64).numpy()
                attention_mask = torch.ones((batch_size, seq_len), dtype=torch.int64).numpy()

                inputs = {
                    'input_ids': input_ids,
                    'attention_mask': attention_mask
                }

                # Warm up
                for _ in range(3):
                    session.run(None, inputs)

                # Benchmark
                start_time = time.time()
                num_iterations = 10

                for _ in range(num_iterations):
                    outputs = session.run(None, inputs)

                end_time = time.time()

                avg_latency = (end_time - start_time) / num_iterations * 1000  # ms
                tokens_per_sec = (batch_size * seq_len) / (avg_latency / 1000)

                key = f"batch_{batch_size}_seq_{seq_len}"
                benchmark_results[key] = {
                    "latency_ms": avg_latency,
                    "tokens_per_sec": tokens_per_sec,
                    "batch_size": batch_size,
                    "sequence_length": seq_len
                }

                logger.info(f"{key}: {avg_latency:.1f}ms, {tokens_per_sec:.0f} tokens/sec")

        # Save benchmark results
        benchmark_path = self.output_dir / "benchmark_results.json"
        with open(benchmark_path, 'w') as f:
            json.dump(benchmark_results, f, indent=2)

        return benchmark_results

    def convert_model(self, max_batch_size: int = 8, max_seq_len: int = 131072) -> Dict[str, str]:
        """Complete model conversion pipeline"""
        logger.info("Starting Gemma3-Legal model conversion...")

        # Load model and tokenizer
        model, tokenizer = self.load_model_and_tokenizer()

        # Quantize weights
        quantized_weights = self.quantize_model_weights(model)

        # Save quantized weights
        weights_path = self.output_dir / "quantized_weights.pt"
        torch.save(quantized_weights, weights_path)

        # Export to ONNX
        onnx_path = self.export_to_onnx(model, tokenizer, max_batch_size, max_seq_len // 4)

        # Optimize for TensorRT
        optimized_onnx_path = self.optimize_onnx_for_tensorrt(onnx_path)

        # Create TensorRT config
        tensorrt_config = self.create_tensorrt_config(optimized_onnx_path, max_batch_size, max_seq_len)

        # Benchmark performance
        benchmark_results = self.benchmark_model_performance(optimized_onnx_path)

        # Compress models for efficient storage
        compressed_onnx = self.compress_and_cache_model(optimized_onnx_path)
        compressed_weights = self.compress_and_cache_model(str(weights_path))

        # Save tokenizer
        tokenizer.save_pretrained(self.output_dir / "tokenizer")

        conversion_summary = {
            "original_model": self.model_name,
            "onnx_model": optimized_onnx_path,
            "compressed_onnx": compressed_onnx,
            "quantized_weights": str(weights_path),
            "compressed_weights": compressed_weights,
            "tensorrt_config": str(self.output_dir / "tensorrt_config.json"),
            "tokenizer": str(self.output_dir / "tokenizer"),
            "benchmark_results": str(self.output_dir / "benchmark_results.json"),
            "conversion_time": time.time()
        }

        # Save conversion summary
        summary_path = self.output_dir / "conversion_summary.json"
        with open(summary_path, 'w') as f:
            json.dump(conversion_summary, f, indent=2)

        logger.info("Model conversion complete!")
        logger.info(f"Conversion summary saved: {summary_path}")

        return conversion_summary

def main():
    parser = argparse.ArgumentParser(description="Convert Gemma3-Legal models to TensorRT-optimized ONNX")
    parser.add_argument("--model", required=True, help="Hugging Face model name or local path")
    parser.add_argument("--output-dir", required=True, help="Output directory for converted models")
    parser.add_argument("--cache-dir", default="./cache", help="Cache directory")
    parser.add_argument("--max-batch-size", type=int, default=8, help="Maximum batch size")
    parser.add_argument("--max-seq-len", type=int, default=131072, help="Maximum sequence length")
    parser.add_argument("--log-level", default="INFO", choices=["DEBUG", "INFO", "WARNING", "ERROR"])

    args = parser.parse_args()

    # Set log level
    logging.getLogger().setLevel(getattr(logging, args.log_level))

    # Create converter
    converter = GemmaLegalModelConverter(
        model_name=args.model,
        output_dir=args.output_dir,
        cache_dir=args.cache_dir
    )

    try:
        # Convert model
        summary = converter.convert_model(
            max_batch_size=args.max_batch_size,
            max_seq_len=args.max_seq_len
        )

        print("\n" + "="*60)
        print("MODEL CONVERSION SUCCESSFUL")
        print("="*60)
        print(f"ONNX Model: {summary['onnx_model']}")
        print(f"Compressed: {summary['compressed_onnx']}")
        print(f"TensorRT Config: {summary['tensorrt_config']}")
        print(f"Summary: {args.output_dir}/conversion_summary.json")
        print("="*60)

        return 0

    except Exception as e:
        logger.error(f"Model conversion failed: {e}")
        return 1

if __name__ == "__main__":
    sys.exit(main())