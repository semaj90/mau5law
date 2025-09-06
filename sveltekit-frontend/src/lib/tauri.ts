
// Tauri API integration for desktop app
// Environment detection
export const isTauri = typeof window !== "undefined" && "__TAURI__" in window;
;
// Dynamic imports to avoid SSR issues
let tauriInvoke: any = null;
let tauriListen: any = null;

// Lazy load Tauri APIs only when needed and in browser
async function loadTauriAPI(): Promise<any> {
  if (typeof window === "undefined" || !isTauri || tauriInvoke) return;

  try {
    const { invoke } = await import("@tauri-apps/api/core");
    const { listen } = await import("@tauri-apps/api/event");
    tauriInvoke = invoke;
    tauriListen = listen;
  } catch (error: any) {
    console.warn("Failed to load Tauri APIs:", error);
  }
}
// Database operations via Tauri commands
export class TauriAPI {
  // Cases
  static async getCases() {
    if (!isTauri) {
      // Fallback to web API
      const response = await fetch("/api/cases");
      return response.json();
    }
    await loadTauriAPI();
    return tauriInvoke?.("get_cases");
  }
  static async createCase(caseData: any) {
    if (!isTauri) {
      // Fallback to web API
      const response = await fetch("/api/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(caseData),
      });
      return response.json();
    }
    await loadTauriAPI();
    return tauriInvoke?.("create_case", {
      title: caseData.title,
      description: caseData.description,
    });
  }
  // Reports
  static async getReports() {
    if (!isTauri) {
      // Fallback to web API
      const response = await fetch("/api/reports");
      return response.json();
    }
    await loadTauriAPI();
    return tauriInvoke?.("get_reports");
  }
  static async createReport(reportData: any) {
    if (!isTauri) {
      // Fallback to web API
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(reportData),
      });
      return response.json();
    }
    await loadTauriAPI();
    return tauriInvoke?.("create_report", {
      title: reportData.title,
      content: reportData.content,
      summary: reportData.summary,
    });
  }
  // LLM operations
  static async listLLMModels() {
    if (!isTauri) {
      // Return empty array or call web API if available
      return [];
    }
    await loadTauriAPI();
    return tauriInvoke?.("list_llm_models");
  }
  static async runLLMInference(model: string, prompt: string) {
    if (!isTauri) {
      // Fallback to web API or return error
      throw new Error("LLM inference only available in desktop app");
    }
    await loadTauriAPI();
    return tauriInvoke?.("run_llm_inference", { model, prompt });
  }
  static async uploadLLMModel(filePath: string) {
    if (!isTauri) {
      throw new Error("LLM model upload only available in desktop app");
    }
    await loadTauriAPI();
    return tauriInvoke?.("upload_llm_model", { filePath });
  }
  // Authentication - always use web API since it handles sessions
  static async login(email: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    return response.json();
  }
  static async register(userData: any) {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userData),
    });
    return response.json();
  }
  static async logout() {
    const response = await fetch("/api/auth/logout", {
      method: "POST",
    });
    return response.ok;
  }
  static async getUserProfile() {
    const response = await fetch("/api/user/profile");
    return response.json();
  }
  // File operations
  static async uploadAvatar(file: File) {
    const formData = new FormData();
    formData.append("avatar", file);

    const response = await fetch("/api/user/avatar/upload", {
      method: "POST",
      body: formData,
    });
    return response.json();
  }
}
// Event listeners for Tauri events
export async function setupTauriEventListeners(): Promise<any> {
  if (!isTauri) return;

  await loadTauriAPI();
  if (!tauriListen) return;

  tauriListen("tauri://close-requested", () => {
    console.log("App close requested");
  });

  tauriListen("tauri://window-resized", (event: any) => {
    console.log("Window resized:", event.payload);
  });
}
// Initialize Tauri integration
export async function initializeTauri(): Promise<any> {
  if (isTauri) {
    console.log("Running in Tauri desktop app");
    await setupTauriEventListeners();
  } else {
    console.log("Running in web browser");
  }
}
export default TauriAPI;
