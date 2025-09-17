#!/usr/bin/env python3
"""
Pure PyTorch QLoRA Pipeline for Legal AI (Windows Compatible)
No TensorRT-LLM required - Still fast inference with optimizations
"""

import torch
from transformers import (
    AutoTokenizer,
    AutoModelForCausalLM,
    TrainingArguments,
    Trainer,
    BitsAndBytesConfig
)
from peft import LoraConfig, get_peft_model, prepare_model_for_kbit_training, PeftModel
from datasets import Dataset
import json
import time

def setup_qlora_model(model_name="google/gemma-2-2b"):
    """Setup Q4 quantized model with LoRA adapters"""

    print(f"🚀 Loading {model_name} with 4-bit quantization...")

    # 4-bit quantization config
    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    # Load quantized model
    model = AutoModelForCausalLM.from_pretrained(
        model_name,
        quantization_config=bnb_config,
        torch_dtype=torch.float16,
        device_map="auto",
        trust_remote_code=True
    )

    tokenizer = AutoTokenizer.from_pretrained(model_name)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    # Prepare for QLoRA
    model = prepare_model_for_kbit_training(model)

    # LoRA config for legal domain
    lora_config = LoraConfig(
        r=16,                    # Low rank
        lora_alpha=32,           # LoRA scaling
        target_modules=[         # Target attention layers
            "q_proj", "k_proj", "v_proj", "o_proj",
            "gate_proj", "up_proj", "down_proj"
        ],
        lora_dropout=0.1,
        bias="none",
        task_type="CAUSAL_LM"
    )

    # Apply LoRA
    model = get_peft_model(model, lora_config)

    trainable_params = sum(p.numel() for p in model.parameters() if p.requires_grad)
    total_params = sum(p.numel() for p in model.parameters())
    print(f"🎯 Trainable: {trainable_params:,} | Total: {total_params:,} | Ratio: {100 * trainable_params / total_params:.2f}%")

    return model, tokenizer

def create_legal_dataset():
    """Create sample legal training data"""

    legal_examples = [
        {
            "instruction": "Analyze this contract clause for potential risks",
            "input": "The contractor shall deliver all work product no later than December 31, 2024, time being of the essence.",
            "output": "This clause contains a hard deadline with 'time being of the essence' language, making timely delivery a material condition. Risk: Any delay, however minor, could constitute a material breach allowing termination and damages claims."
        },
        {
            "instruction": "Summarize the key legal precedent",
            "input": "In Smith v. Jones (2023), the court held that software licensing agreements must clearly specify usage restrictions to be enforceable.",
            "output": "Smith v. Jones establishes that software license enforceability requires explicit usage restrictions. Precedent: Vague or implied restrictions are unenforceable. Impact: Software licenses must contain clear, specific usage terms."
        },
        {
            "instruction": "Identify legal issues in this document",
            "input": "Employment Agreement: Employee agrees to work exclusively for Company and shall not compete for 5 years post-termination in any industry.",
            "output": "Issues identified: 1) Overly broad non-compete (5 years, any industry) likely unenforceable, 2) Lack of geographic limitation, 3) No consideration for restriction, 4) Potential restraint of trade violation. Recommendation: Narrow scope, time, and geography."
        },
        {
            "instruction": "Review this liability clause",
            "input": "Company shall not be liable for any damages whatsoever, including but not limited to direct, indirect, incidental, or consequential damages.",
            "output": "This is an extremely broad liability waiver that may be unenforceable. Issues: 1) 'Whatsoever' language too broad, 2) No carve-outs for gross negligence/willful misconduct, 3) May violate consumer protection laws, 4) Consider limiting to specific damage types and circumstances."
        },
        {
            "instruction": "Analyze this intellectual property clause",
            "input": "All work product, including ideas, concepts, and inventions developed during employment, shall be the exclusive property of the Company.",
            "output": "This IP assignment clause is overly broad and may include personal inventions. Issues: 1) 'All work product' without scope limitation, 2) 'Ideas and concepts' too vague, 3) May capture personal projects, 4) Consider limiting to work-related inventions and company time/resources."
        }
    ]

    def format_prompt(example):
        return f"""### Instruction:
{example['instruction']}

### Input:
{example['input']}

### Response:
{example['output']}<|endoftext|>"""

    formatted_data = [{"text": format_prompt(ex)} for ex in legal_examples]
    return Dataset.from_list(formatted_data)

def train_qlora_model():
    """Main training function"""

    print("🚀 Setting up QLoRA model...")
    model, tokenizer = setup_qlora_model()

    print("📚 Creating legal dataset...")
    dataset = create_legal_dataset()

    def tokenize_function(examples):
        return tokenizer(
            examples["text"],
            truncation=True,
            padding="max_length",
            max_length=512,
            return_tensors="pt"
        )

    tokenized_dataset = dataset.map(tokenize_function, batched=True)

    # Training arguments optimized for RTX 3060 Ti
    training_args = TrainingArguments(
        output_dir="./qlora_legal_model",
        per_device_train_batch_size=1,      # Small batch for 8GB VRAM
        gradient_accumulation_steps=4,       # Effective batch size = 4
        num_train_epochs=3,
        learning_rate=2e-4,
        fp16=True,                          # Mixed precision
        logging_steps=10,
        save_strategy="epoch",
        dataloader_pin_memory=False,        # Reduce memory usage
        remove_unused_columns=False,
        warmup_steps=10,
        save_total_limit=1,                 # Keep only latest checkpoint
    )

    # Trainer
    trainer = Trainer(
        model=model,
        args=training_args,
        train_dataset=tokenized_dataset,
        tokenizer=tokenizer,
    )

    print("🔥 Starting QLoRA training...")
    start_time = time.time()
    trainer.train()
    training_time = time.time() - start_time

    print(f"✅ Training completed in {training_time:.1f} seconds")
    print("💾 Saving LoRA adapters...")
    model.save_pretrained("./qlora_legal_adapters")
    tokenizer.save_pretrained("./qlora_legal_adapters")

    return model, tokenizer

class OptimizedLegalInference:
    """Optimized PyTorch inference without TensorRT-LLM"""

    def __init__(self, base_model="google/gemma-2-2b", adapter_path="./qlora_legal_adapters"):
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.load_model(base_model, adapter_path)

    def load_model(self, base_model, adapter_path):
        """Load model with inference optimizations"""
        print("🚀 Loading optimized model for inference...")

        # Load base model in FP16 for faster inference
        self.model = AutoModelForCausalLM.from_pretrained(
            base_model,
            torch_dtype=torch.float16,
            device_map="auto",
            trust_remote_code=True
        )

        # Load and merge LoRA adapters
        self.model = PeftModel.from_pretrained(self.model, adapter_path)
        print("🔀 Merging LoRA weights for optimal inference...")
        self.model = self.model.merge_and_unload()

        # Inference optimizations
        self.model.eval()
        torch.backends.cudnn.benchmark = True  # Optimize CUDNN

        # Load tokenizer
        self.tokenizer = AutoTokenizer.from_pretrained(adapter_path)
        if self.tokenizer.pad_token is None:
            self.tokenizer.pad_token = self.tokenizer.eos_token

        print("✅ Model ready for optimized inference!")

    @torch.inference_mode()  # Disable gradient computation
    def generate(self, prompt: str, max_length: int = 512, temperature: float = 0.7) -> str:
        """Generate with optimizations"""

        inputs = self.tokenizer(prompt, return_tensors="pt", truncation=True, max_length=2048)
        inputs = {k: v.to(self.device) for k, v in inputs.items()}

        with torch.cuda.amp.autocast():  # Mixed precision inference
            outputs = self.model.generate(
                **inputs,
                max_new_tokens=max_length,
                temperature=temperature,
                do_sample=True,
                top_p=0.9,
                top_k=50,
                repetition_penalty=1.1,
                pad_token_id=self.tokenizer.eos_token_id,
                use_cache=True  # Enable KV cache
            )

        # Decode only the new tokens
        new_tokens = outputs[0][inputs['input_ids'].shape[1]:]
        return self.tokenizer.decode(new_tokens, skip_special_tokens=True)

    def analyze_contract(self, contract_text: str) -> str:
        """Analyze contract for legal issues"""

        prompt = f"""### Instruction:
Analyze this contract clause for potential legal risks and issues.

### Input:
{contract_text}

### Response:
"""
        return self.generate(prompt, max_length=256)

    def legal_qa(self, question: str, context: str = "") -> str:
        """Answer legal questions"""

        prompt = f"""### Instruction:
Answer this legal question based on the provided context.

### Input:
Question: {question}
Context: {context}

### Response:
"""
        return self.generate(prompt, max_length=512)

def benchmark_inference():
    """Benchmark inference speed"""

    print("🧪 Benchmarking inference speed...")
    legal_ai = OptimizedLegalInference()

    test_contract = """
    The contractor shall deliver all work product no later than
    December 31, 2024, time being of the essence. Any delay
    shall result in immediate termination and forfeiture of all payments.
    """

    # Warmup
    legal_ai.analyze_contract("Test contract clause.")

    # Benchmark
    start_time = time.time()
    num_tests = 5

    for i in range(num_tests):
        result = legal_ai.analyze_contract(test_contract)
        print(f"Test {i+1}: {len(result.split())} words")

    total_time = time.time() - start_time
    avg_time = total_time / num_tests

    print(f"\n📊 Benchmark Results:")
    print(f"Average time per inference: {avg_time:.2f}s")
    print(f"Estimated tokens/sec: ~{200/avg_time:.0f}")

    return legal_ai

if __name__ == "__main__":
    import os

    print("🎯 PyTorch QLoRA Legal AI Pipeline")
    print(f"Device: {torch.cuda.get_device_name(0) if torch.cuda.is_available() else 'CPU'}")
    print(f"CUDA Memory: {torch.cuda.get_device_properties(0).total_memory / 1e9:.1f}GB")

    # Step 1: Train (skip if adapters exist)
    if not os.path.exists("./qlora_legal_adapters"):
        print("\n🔥 Training QLoRA model...")
        model, tokenizer = train_qlora_model()
    else:
        print("\n✅ Using existing LoRA adapters")

    # Step 2: Optimized inference
    print("\n🚀 Setting up optimized inference...")
    legal_ai = benchmark_inference()

    # Step 3: Interactive demo
    print("\n🎮 Interactive Legal AI Demo:")
    print("Enter 'quit' to exit")

    while True:
        user_input = input("\n📝 Enter contract text or legal question: ")
        if user_input.lower() in ['quit', 'exit', 'q']:
            break

        start_time = time.time()
        response = legal_ai.analyze_contract(user_input)
        inference_time = time.time() - start_time

        print(f"\n🤖 Legal Analysis:")
        print(response)
        print(f"\n⚡ Generated in {inference_time:.2f}s")