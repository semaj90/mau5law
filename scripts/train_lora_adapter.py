#!/usr/bin/env python3
"""
Train QLoRA Adapter for Agentic Tool Calling
Fine-tunes Gemma3 INT4 AWQ engine with legal tool usage patterns
"""

import os
import sys
import json
import argparse
import torch
from pathlib import Path
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    DataCollatorForLanguageModeling
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training
from datasets import load_dataset
from trl import SFTTrainer

def load_training_data(jsonl_path: str):
    """Load JSONL training data"""

    data = []
    with open(jsonl_path, 'r', encoding='utf-8') as f:
        for line in f:
            if line.strip():
                data.append(json.loads(line))

    print(f"📚 Loaded {len(data)} training examples")
    return data

def format_conversation(example):
    """Format conversation for training"""

    messages = example["messages"]

    # Convert to chat format
    formatted_text = ""
    for msg in messages:
        role = msg["role"]
        content = msg["content"]

        if role == "system":
            formatted_text += f"System: {content}\n"
        elif role == "user":
            formatted_text += f"User: {content}\n"
        elif role == "assistant":
            if msg.get("tool_calls"):
                # Include tool calls in assistant response
                tool_calls_text = "\n".join([
                    f"Tool: {call['function']['name']}({call['function']['arguments']})"
                    for call in msg["tool_calls"]
                ])
                formatted_text += f"Assistant: {content}\n{tool_calls_text}\n"
            else:
                formatted_text += f"Assistant: {content}\n"
        elif role == "tool":
            formatted_text += f"Tool Result: {content}\n"

    return {"text": formatted_text.strip()}

def main():
    parser = argparse.ArgumentParser(description="Train QLoRA adapter for agentic tool calling")
    parser.add_argument("--dataset", required=True, help="Path to JSONL training dataset")
    parser.add_argument("--base_model", default="/workspace/gemma3-12b-finetuned-fp16", help="Base model path")
    parser.add_argument("--output_dir", default="/workspace/lora_adapter", help="Output directory")
    parser.add_argument("--num_epochs", type=int, default=3, help="Number of training epochs")
    parser.add_argument("--batch_size", type=int, default=4, help="Batch size")
    parser.add_argument("--learning_rate", type=float, default=2e-4, help="Learning rate")
    parser.add_argument("--lora_r", type=int, default=64, help="LoRA rank")
    parser.add_argument("--lora_alpha", type=int, default=16, help="LoRA alpha")
    parser.add_argument("--max_length", type=int, default=2048, help="Max sequence length")

    args = parser.parse_args()

    print("🎯 Training QLoRA Adapter for Agentic Tool Calling")
    print("=" * 60)
    print(f"Dataset: {args.dataset}")
    print(f"Base Model: {args.base_model}")
    print(f"Output: {args.output_dir}")
    print(f"Epochs: {args.num_epochs}, Batch Size: {args.batch_size}")
    print(f"LoRA Rank: {args.lora_r}, Alpha: {args.lora_alpha}")
    print()

    # Check CUDA availability
    if not torch.cuda.is_available():
        print("❌ CUDA not available. This training requires GPU.")
        return 1

    print("✅ CUDA available, using GPU for training")

    # Load tokenizer - use standard Gemma tokenizer
    print("🔄 Loading Gemma tokenizer...")
    try:
        tokenizer = AutoTokenizer.from_pretrained("google/gemma-2b", trust_remote_code=True)
        print("✅ Loaded tokenizer from google/gemma-2b")
    except Exception as e:
        print(f"❌ Failed to load tokenizer: {e}")
        # Create a simple fallback tokenizer
        from transformers import PreTrainedTokenizerFast
        vocab_size = 32000  # Approximate vocab size
        tokenizer = PreTrainedTokenizerFast(
            tokenizer_file=None,
            vocab_file=None,
            unk_token="<unk>",
            bos_token="<bos>",
            eos_token="<eos>",
            pad_token="<pad>",
            model_max_length=args.max_length
        )
        print("⚠️ Using fallback tokenizer")

    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Load training data
    print("🔄 Loading training data...")
    raw_data = load_training_data(args.dataset)

    # Convert to dataset format
    formatted_data = [format_conversation(ex) for ex in raw_data]

    # Create HuggingFace dataset
    from datasets import Dataset
    dataset = Dataset.from_list(formatted_data)

    # Split into train/val
    split_dataset = dataset.train_test_split(test_size=0.1, seed=42)
    train_dataset = split_dataset["train"]
    val_dataset = split_dataset["test"]

    print(f"📊 Train: {len(train_dataset)}, Val: {len(val_dataset)}")

    # Load base model
    print("🔄 Loading base model...")
    model = AutoModelForCausalLM.from_pretrained(
        args.base_model,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )

    # Prepare for QLoRA
    model = prepare_model_for_kbit_training(model)

    # Configure LoRA
    lora_config = LoraConfig(
        r=args.lora_r,
        lora_alpha=args.lora_alpha,
        target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
        lora_dropout=0.05,
        bias="none",
        task_type="CAUSAL_LM"
    )

    model = get_peft_model(model, lora_config)
    model.print_trainable_parameters()

    # Training arguments
    training_args = TrainingArguments(
        output_dir=args.output_dir,
        num_train_epochs=args.num_epochs,
        per_device_train_batch_size=args.batch_size,
        per_device_eval_batch_size=args.batch_size,
        gradient_accumulation_steps=4,
        learning_rate=args.learning_rate,
        weight_decay=0.01,
        warmup_steps=100,
        logging_steps=10,
        save_steps=500,
        eval_steps=500,
        evaluation_strategy="steps",
        save_strategy="steps",
        load_best_model_at_end=True,
        metric_for_best_model="eval_loss",
        greater_is_better=False,
        fp16=True,
        gradient_checkpointing=True,
        max_grad_norm=0.3,
        dataloader_num_workers=4,
        save_total_limit=3,
    )

    # Data collator
    data_collator = DataCollatorForLanguageModeling(
        tokenizer=tokenizer,
        mlm=False
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=train_dataset,
        eval_dataset=val_dataset,
        data_collator=data_collator,
        tokenizer=tokenizer,
    )

    # Train
    print("🚀 Starting training...")
    trainer.train()

    # Save the adapter
    trainer.save_model()
    print(f"✅ LoRA adapter saved to {args.output_dir}")

    # Evaluate
    print("🔄 Evaluating...")
    eval_results = trainer.evaluate()
    print("📊 Evaluation Results:")
    for key, value in eval_results.items():
        print(f"  {key}: {value:.4f}")

    print("\n🎉 QLoRA Training Complete!")
    print("💡 Next: Merge adapter with base model for inference")
    print("💡 Command: python3 scripts/merge_lora_adapter.py --adapter /workspace/lora_adapter --output /workspace/gemma3_agentic")

    return 0

if __name__ == "__main__":
    sys.exit(main())