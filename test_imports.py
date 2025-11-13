import torch
print("Torch imported successfully")
print(f"Torch version: {torch.__version__}")

# Check if ONNX is available
try:
    import torch.onnx
    print("torch.onnx imported successfully")
except ImportError as e:
    print(f"torch.onnx import failed: {e}")

# Check CUDA
print(f"CUDA available: {torch.cuda.is_available()}")
if torch.cuda.is_available():
    print(f"CUDA device count: {torch.cuda.device_count()}")
    print(f"Current CUDA device: {torch.cuda.current_device()}")