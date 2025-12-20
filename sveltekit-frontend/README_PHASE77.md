# Phase 77: Fine-Tuning Workflow

You have successfully generated the training data (`polyglot_training_data.jsonl`). Now it's time to fine-tune the model using Google Colab.

## Steps

1.  **Open Google Colab**: [https://colab.research.google.com/](https://colab.research.google.com/)
2.  **Upload Notebook**: Upload the `phase77-unsloth-finetuning.ipynb` file located in this directory.
3.  **Set Runtime**: Go to `Runtime` > `Change runtime type` and select **T4 GPU** (or better).
4.  **Upload Data**: Click the folder icon on the left sidebar and upload `polyglot_training_data.jsonl`.
5.  **Run All**: Execute all cells in the notebook.
6.  **Download Model**: The last cell will trigger a download of `gemma3-legal-svelte5-unsloth.Q4_K_M.gguf`.

## After Fine-Tuning

Once you have the `.gguf` file:

1.  Move it to your project folder.
2.  Create a Modelfile:
    ```dockerfile
    FROM ./gemma3-legal-svelte5-unsloth.Q4_K_M.gguf
    SYSTEM "You are an expert Svelte 5 developer."
    ```
3.  Create the Ollama model:
    ```powershell
    ollama create gemma3-legal-svelte5 -f Modelfile
    ```
4.  Update your `.env` file to use the new model:
    ```env
    OLLAMA_MODEL=gemma3-legal-svelte5
    ```
