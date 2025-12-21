# 🚀 Phase 77: Quick Start Guide

## 📋 What You Have

**Training Dataset:** `combined_training_data.jsonl`
- 107 examples (45 polyglot + 10 gold + 52 enhanced)
- 54.4 KB, Alpaca format
- Coverage: Svelte 5, TypeScript, SvelteKit, Drizzle ORM

**Training Notebook:** `phase77-unsloth-finetuning.ipynb`
- Model: Gemma 3 IT (27B) 4-bit
- Steps: 240 (optimized for 107 examples)
- Exports: GGUF, HuggingFace, PTX

---

## ⚡ 5-Minute Setup

### Step 1: Upload to Google Colab
1. Open https://colab.research.google.com
2. Upload `phase77-unsloth-finetuning.ipynb`
3. Upload `combined_training_data.jsonl` to Files (sidebar)

### Step 2: Select Runtime
- Click **Runtime** → **Change runtime type**
- Select **A100 GPU** (High-RAM)
- Click **Save**

### Step 3: Run Training
- Press **⌘/Ctrl + F9** (Run all)
- Wait ~10-15 minutes
- ☕ Coffee break time!

### Step 4: Download Exports
After training completes:
```bash
# Download from Colab Files:
- gemma3-legal-svelte5.gguf (~7GB)
- gemma3-legal-svelte5-hf/ (folder)
- gemma3-legal-svelte5-ptx/ (folder)
```

---

## 🧪 Local Testing (Ollama)

### Install Model
```bash
cd path/to/downloads

# Create Modelfile
cat > Modelfile << EOF
FROM ./gemma3-legal-svelte5.gguf
TEMPLATE """{{ if .System }}<start_of_turn>system
{{ .System }}<end_of_turn>
{{ end }}{{ if .Prompt }}<start_of_turn>user
{{ .Prompt }}<end_of_turn>
{{ end }}<start_of_turn>model
"""
PARAMETER stop "<start_of_turn>"
PARAMETER stop "<end_of_turn>"
EOF

# Import to Ollama
ollama create gemma3-legal-svelte5 -f Modelfile
```

### Test Migrations
```bash
# Test 1: Basic reactivity
ollama run gemma3-legal-svelte5 "Convert this Svelte 4 to Svelte 5: let count = 0; $: doubled = count * 2;"

# Expected output:
# let count = $state(0);
# let doubled = $derived(count * 2);

# Test 2: Props
ollama run gemma3-legal-svelte5 "Migrate Svelte 4 props to Svelte 5: export let name = 'Guest'; export let age: number;"

# Expected output:
# let { name = 'Guest', age }: { name?: string; age: number } = $props();

# Test 3: Event handler
ollama run gemma3-legal-svelte5 "Convert to Svelte 5 syntax: <button on:click={handleClick}>Submit</button>"

# Expected output:
# <button onclick={handleClick}>Submit</button>
```

---

## 🎯 Example Prompts

### Svelte 5 Migrations
```
"Convert this Svelte 4 component to Svelte 5 with Runes"
"Migrate reactive statement to $derived"
"Replace createEventDispatcher with callback props"
"Update event handler syntax for Svelte 5"
```

### TypeScript Help
```
"Fix this TypeScript error: Property does not exist on type"
"How do I properly type this generic function?"
"Define a discriminated union for type safety"
```

### SvelteKit Patterns
```
"Create a SvelteKit load function with type-safe params"
"Implement a form action with validation"
"Handle errors in SvelteKit with custom error page"
```

### Drizzle ORM
```
"Define a PostgreSQL table schema with Drizzle ORM 0.44"
"Create a one-to-many relation in Drizzle"
"Write a Drizzle query with filters and type safety"
```

---

## 📊 Performance Expectations

### Ollama (GGUF Q4_K_M)
- **Hardware:** 16GB VRAM (RTX 3090, RTX 4080)
- **Speed:** ~20 tokens/sec
- **Use case:** Local development, testing

### TRT-LLM (A100)
- **Hardware:** 48GB VRAM (A100)
- **Speed:** ~150 tokens/sec
- **Use case:** Production API, high throughput

### Modular PTX (RTX 3060 Ti)
- **Hardware:** 8GB VRAM (RTX 3060 Ti)
- **Speed:** ~100 tokens/sec
- **Use case:** Edge inference, cost-effective deployment

---

## 🔧 Troubleshooting

### Issue: "Out of memory" during training
**Solution:** Reduce batch size in notebook
```python
per_device_train_batch_size = 1  # Was 2
gradient_accumulation_steps = 8  # Was 4
```

### Issue: Model generates incorrect syntax
**Solution:** Increase training steps
```python
max_steps = 300  # Was 240
```

### Issue: Ollama model not found
**Solution:** Verify installation
```bash
ollama list | grep gemma3-legal-svelte5
# If missing, recreate with Modelfile
```

### Issue: Slow inference on Ollama
**Solution:** Use GPU acceleration
```bash
# Check GPU availability
nvidia-smi

# Set GPU layers (in Modelfile)
PARAMETER num_gpu 99  # Use all GPU layers
```

---

## 📚 Documentation

- **Training Guide:** [PHASE77_TRAINING_DATASET_COMPLETE.md](PHASE77_TRAINING_DATASET_COMPLETE.md)
- **Analysis Report:** [PHASE77_ANALYSIS_REPORT.md](PHASE77_ANALYSIS_REPORT.md)
- **Gold Dataset:** [GOLD_DATASET_README.md](GOLD_DATASET_README.md)
- **TRT-LLM Guide:** [TRT_LLM_CONVERSION.md](TRT_LLM_CONVERSION.md)
- **Modular Guide:** [MODULAR_PTX_DEPLOYMENT.md](MODULAR_PTX_DEPLOYMENT.md)

---

## 🎓 Training Scripts

```bash
# Generate gold migrations
node scripts/generate-svelte5-gold-data.mjs

# Generate enhanced templates
node scripts/generate-enhanced-training-data.mjs

# Combine all datasets
node scripts/combine-training-data.mjs

# Analyze quality
node scripts/test-migration-quality.mjs

# View statistics
node scripts/analyze-training-data.mjs
```

---

## 🎯 Next Steps

### After Training
1. ✅ Test migration accuracy on held-out examples
2. ✅ Deploy to production (TRT-LLM or Modular)
3. ✅ Integrate with Phase 76 ACE system
4. ✅ Monitor performance metrics

### Future Enhancements
- Add more Svelte 5 transition examples
- Include Svelte 5 snippet patterns
- Expand TypeScript 5.7+ coverage
- Add more SvelteKit SSR patterns

---

## 📞 Support

**Issues?** Check the documentation:
- Training errors → `PHASE77_TRAINING_DATASET_COMPLETE.md`
- Deployment → `TRT_LLM_CONVERSION.md` or `MODULAR_PTX_DEPLOYMENT.md`
- Quality validation → `GOLD_DATASET_README.md`

---

**Ready to fine-tune? Upload to Colab and run the notebook! 🚀**
