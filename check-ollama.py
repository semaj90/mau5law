#!/usr/bin/env python3
"""
Check Ollama status and available models
"""
import requests
import json

def check_ollama():
    try:
        response = requests.get('http://localhost:11434/api/tags', timeout=5)
        if response.status_code == 200:
            data = response.json()
            models = data.get('models', [])

            print("=== Ollama Status: RUNNING ===")
            print(f"Total models: {len(models)}")

            # Check for embeddinggemma models
            gemma_models = [m for m in models if 'embeddinggemma' in m.get('name', '').lower()]
            if gemma_models:
                print(f"\nFound {len(gemma_models)} embeddinggemma models:")
                for model in gemma_models:
                    name = model.get('name')
                    size = model.get('size', 0)
                    size_gb = size / (1024**3) if size else 0
                    print(f"  - {name}: {size_gb:.2f} GB")
            else:
                print("\nNo embeddinggemma models found.")
                print("To pull embeddinggemma:latest, run:")
                print("  ollama pull embeddinggemma:latest")

            print("\nAll available models:")
            for model in models:
                name = model.get('name')
                size = model.get('size', 0)
                size_gb = size / (1024**3) if size else 0
                print(f"  - {name}: {size_gb:.2f} GB")
        else:
            print("Ollama not running or not accessible on localhost:11434")
            print("Make sure Ollama is installed and running:")
            print("  1. Install Ollama: https://ollama.com/download")
            print("  2. Start Ollama service")
            print("  3. Pull models: ollama pull embeddinggemma:latest")

    except requests.exceptions.RequestException as e:
        print(f"Error connecting to Ollama: {e}")
        print("Make sure Ollama is running on localhost:11434")

if __name__ == "__main__":
    check_ollama()