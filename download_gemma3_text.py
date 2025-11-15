#!/usr/bin/env python3
import os
from huggingface_hub import snapshot_download
from transformers import AutoTokenizer, Gemma3ForCausalLM
import torch

def download_official_gemma3():
    model_id = "google/gemma-3-12b-it"
    local_dir = "/workspace/models/gemma3-12b-official"

    print(f"Downloading {model_id} to {local_dir}")

    snapshot_download(
        repo_id=model_id,
        local_dir=local_dir,
        local_dir_use_symlinks=False,
        token=os.environ.get("HF_TOKEN")
    )

    print("Download complete. Verifying...")

    model = Gemma3ForCausalLM.from_pretrained(
        local_dir,
        device_map="cpu",
        torch_dtype=torch.float16
    )

    tokenizer = AutoTokenizer.from_pretrained(local_dir)

    print(f"Model loaded successfully!")
    print(f"Hidden size: {model.config.hidden_size}")
    print(f"Num layers: {model.config.num_hidden_layers}")
    print(f"Vocab size: {model.config.vocab_size}")

    return local_dir

if __name__ == "__main__":
    download_official_gemma3()
