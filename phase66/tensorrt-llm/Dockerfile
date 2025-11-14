FROM nvcr.io/nvidia/tensorrt-llm/release:latest

RUN apt-get update && apt-get install -y \
    git wget python3 python3-pip python3-dev \
    libglib2.0-0 libgl1 libglx-mesa0 libxext6 libxrender1 \
    && rm -rf /var/lib/apt/lists/*

ENV LD_LIBRARY_PATH=/usr/local/tensorrt/targets/x86_64-linux-gnu/lib:${LD_LIBRARY_PATH}
ENV NVIDIA_TF32_OVERRIDE=0

RUN pip install --no-cache-dir --upgrade pip setuptools wheel
RUN pip install --no-cache-dir \
    tensorrt_llm \
    onnxruntime-gpu \
    onnx \
    numpy \
    safetensors \
    accelerate \
    huggingface-hub \
    sentencepiece \
    protobuf==4.25.3 \
    onnxconverter_common

WORKDIR /workspace
RUN mkdir -p /workspace/models /workspace/python-services
CMD ["/bin/bash"]