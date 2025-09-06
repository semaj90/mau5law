
// Optional Tauri import - fallback for web environments
let invoke: any;

async function initializeTauri(): Promise<any> {
  try {
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    invoke = tauriInvoke;
  } catch (error: any) {
    console.warn("Tauri not available - using fallback implementations");
    invoke = () => Promise.reject(new Error("Tauri not available"));
  }
}

// Initialize on first use
let tauriInitialized = false;

export async function getAvailableModels(): Promise<string[]> {
  if (!tauriInitialized) {
    await initializeTauri();
    tauriInitialized = true;
  }
  return await invoke("list_llm_models") as Promise<string[]>;
}

export async function runInference(
  model: string,
  prompt: string,
): Promise<string> {
  if (!tauriInitialized) {
    await initializeTauri();  
    tauriInitialized = true;
  }
  return await invoke("run_llm_inference", { model, prompt }) as Promise<string>;
}
