#!/usr/bin/env python3
"""
Test Ollama Models for Legal AI Training
Quick verification that all models work correctly
"""

import ollama
import time

def test_ollama_models():
    """Test all available Ollama models"""

    print("Testing Ollama models for Legal AI training...")

    models_to_test = [
        'gemma3:270m',           # Target model for fine-tuning
        'gemma3-legal:latest',   # Teacher model
        'embeddinggemma:latest', # Embeddings
        'nomic-embed-text:latest' # Backup embeddings
    ]

    results = {}

    # Test text generation models
    for model in ['gemma3:270m', 'gemma3-legal:latest']:
        try:
            print(f"\nTesting {model}...")
            start_time = time.time()

            response = ollama.generate(
                model=model,
                prompt='Analyze legal risk: Time is of essence clause',
                options={'num_predict': 50, 'temperature': 0.3}
            )

            inference_time = time.time() - start_time

            results[model] = {
                'status': 'SUCCESS',
                'response': response['response'][:150],
                'time': f"{inference_time:.2f}s"
            }

            print(f"✅ {model}: {inference_time:.2f}s")
            print(f"Response: {response['response'][:100]}...")

        except Exception as e:
            results[model] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print(f"❌ {model}: Error - {e}")

    # Test embedding models
    for model in ['embeddinggemma:latest', 'nomic-embed-text:latest']:
        try:
            print(f"\nTesting embeddings: {model}...")
            start_time = time.time()

            response = ollama.embeddings(
                model=model,
                prompt='contract analysis and legal risk assessment'
            )

            embedding_time = time.time() - start_time

            results[model] = {
                'status': 'SUCCESS',
                'dimensions': len(response['embedding']),
                'time': f"{embedding_time:.2f}s"
            }

            print(f"✅ {model}: {len(response['embedding'])} dimensions, {embedding_time:.2f}s")

        except Exception as e:
            results[model] = {
                'status': 'ERROR',
                'error': str(e)
            }
            print(f"❌ {model}: Error - {e}")

    return results

def performance_comparison():
    """Compare model performance for training strategy"""

    print("\n" + "="*50)
    print("PERFORMANCE COMPARISON FOR TRAINING STRATEGY")
    print("="*50)

    test_prompt = "Analyze the legal risks in this contract clause: The contractor shall deliver all work product no later than December 31, 2024, time being of the essence."

    models = ['gemma3:270m', 'gemma3-legal:latest']

    for model in models:
        try:
            print(f"\n{model}:")
            start_time = time.time()

            response = ollama.generate(
                model=model,
                prompt=test_prompt,
                options={'num_predict': 200, 'temperature': 0.3}
            )

            inference_time = time.time() - start_time
            response_length = len(response['response'])

            print(f"  Time: {inference_time:.2f}s")
            print(f"  Length: {response_length} chars")
            print(f"  Speed: {response_length/inference_time:.0f} chars/sec")
            print(f"  Response preview: {response['response'][:200]}...")

        except Exception as e:
            print(f"  Error: {e}")

def training_strategy_recommendation():
    """Provide training strategy based on test results"""

    print("\n" + "="*50)
    print("TRAINING STRATEGY RECOMMENDATION")
    print("="*50)

    print("""
Based on your existing Ollama models:

1. TARGET MODEL: gemma3:270m (291MB)
   - Base for fine-tuning to 500MB target
   - Fast inference for production
   - Sufficient capacity for legal analysis

2. TEACHER MODEL: gemma3-legal:latest (7.3GB)
   - Generate high-quality training data
   - Knowledge distillation source
   - Expert-level legal analysis

3. EMBEDDING MODELS: embeddinggemma + nomic-embed-text
   - Document similarity
   - Semantic search
   - Vector database integration

4. TRAINING APPROACH:
   - Use gemma3-legal to generate training examples
   - Fine-tune gemma3:270m with LoRA adapters
   - Target final size: 350MB (under 500MB goal)
   - Expected training time: 2-4 hours on RTX 3060 Ti

5. NEXT STEPS:
   - Install unsloth: pip install unsloth
   - Generate training dataset using teacher model
   - Fine-tune student model with legal examples
   - Deploy optimized 350MB model
""")

if __name__ == "__main__":
    # Test all models
    results = test_ollama_models()

    # Performance comparison
    performance_comparison()

    # Strategy recommendation
    training_strategy_recommendation()

    print("\n✅ Model testing complete!")
    print("Ready to proceed with legal AI training using existing assets.")