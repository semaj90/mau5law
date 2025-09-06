import type { SavedNote } from "$lib/stores/saved-notes";

// Tauri-specific utilities for desktop app integration
// Conditional imports to support both web and desktop environments

let invoke: any;
let appDataDir: any;
let join: any;
let writeTextFile: any;
let readTextFile: any;
let exists: any;

async function initializeTauri(): Promise<any> {
  try {
    // Note: In Tauri v2, core functions are in different modules
    const { invoke: tauriInvoke } = await import("@tauri-apps/api/core");
    const pathModule = await import("@tauri-apps/api/path");
    
    invoke = tauriInvoke;
    appDataDir = pathModule.appDataDir;
    join = pathModule.join;
    
    // File system operations require @tauri-apps/plugin-fs plugin in Tauri v2
    // For now, these will use fallbacks
    throw new Error("Tauri v2 filesystem plugin not configured");
  } catch (error: any) {
    console.warn("Tauri not available - desktop features disabled");
    // Provide fallback implementations
    invoke = () => Promise.reject(new Error("Tauri not available"));
    appDataDir = () => Promise.reject(new Error("Tauri not available"));
    join = () => Promise.reject(new Error("Tauri not available"));
    writeTextFile = () => Promise.reject(new Error("Tauri not available"));
    readTextFile = () => Promise.reject(new Error("Tauri not available"));
    exists = () => Promise.reject(new Error("Tauri not available"));
  }
}

// Initialize Tauri when module loads
initializeTauri();


export interface TauriNoteExport {
  id: string;
  title: string;
  content: string;
  format: "markdown" | "html" | "json";
  filePath: string;
}
class TauriNotesService {
  private static instance: TauriNotesService;

  static getInstance(): TauriNotesService {
    if (!TauriNotesService.instance) {
      TauriNotesService.instance = new TauriNotesService();
    }
    return TauriNotesService.instance;
  }
  // Render markdown to HTML using Rust backend
  async renderMarkdownToHtml(markdown: string): Promise<string> {
    try {
      return await invoke("render_markdown_to_html", { markdown });
    } catch (error: any) {
      console.error("Failed to render markdown via Tauri:", error);
      throw new Error(`Markdown rendering failed: ${error}`);
    }
  }
  // Save note to local file system
  async saveNoteToFile(
    note: SavedNote,
    format: "markdown" | "html" | "json" = "markdown",
  ): Promise<string> {
    try {
      const appDataPath = await appDataDir();
      const notesDir = await join(appDataPath, "notes");

      // Ensure notes directory exists
      await this.ensureDirectoryExists(notesDir);

      let content: string;
      let extension: string;

      switch (format) {
        case "html":
          content =
            note.html || (await this.renderMarkdownToHtml(note.markdown));
          extension = "html";
          break;
        case "json":
          content = JSON.stringify(note, null, 2);
          extension = "json";
          break;
        default:
          content = note.markdown || note.content;
          extension = "md";
      }
      const filename = `${note.id}-${this.sanitizeFilename(note.title)}.${extension}`;
      const filePath = await join(notesDir, filename);

      await writeTextFile(filePath, content);

      return filePath;
    } catch (error: any) {
      console.error("Failed to save note to file:", error);
      throw new Error(`File save failed: ${error}`);
    }
  }
  // Load note from local file system
  async loadNoteFromFile(filePath: string): Promise<SavedNote | null> {
    try {
      const fileExists = await exists(filePath);
      if (!fileExists) {
        return null;
      }
      const content = await readTextFile(filePath);

      // Determine format by file extension
      if (filePath.endsWith(".json")) {
        return JSON.parse(content) as SavedNote;
      } else if (filePath.endsWith(".md")) {
        // Create a basic note structure from markdown
        const lines = content.split("\n");
        const title = lines[0]?.replace(/^#\s*/, "") || "Untitled";
        const markdown = content;

        return {
          id: this.generateId(),
          title,
          content: markdown,
          markdown,
          html: "",
          contentJson: null,
          noteType: "general",
          tags: [],
          userId: "desktop-user",
          savedAt: new Date(),
        };
      }
      return null;
    } catch (error: any) {
      console.error("Failed to load note from file:", error);
      return null;
    }
  }
  // Export multiple notes to a single file
  async exportNotesToFile(
    notes: SavedNote[],
    format: "markdown" | "html" | "json" = "markdown",
  ): Promise<string> {
    try {
      const appDataPath = await appDataDir();
      const timestamp = new Date()
        .toISOString()
        .slice(0, 19)
        .replace(/:/g, "-");

      let content: string;
      let extension: string;
      let filename: string;

      switch (format) {
        case "html":
          content = await this.notesToHtml(notes);
          extension = "html";
          filename = `notes-export-${timestamp}.${extension}`;
          break;
        case "json":
          content = JSON.stringify(notes, null, 2);
          extension = "json";
          filename = `notes-export-${timestamp}.${extension}`;
          break;
        default:
          content = this.notesToMarkdown(notes);
          extension = "md";
          filename = `notes-export-${timestamp}.${extension}`;
      }
      const filePath = await join(appDataPath, filename);
      await writeTextFile(filePath, content);

      return filePath;
    } catch (error: any) {
      console.error("Failed to export notes:", error);
      throw new Error(`Export failed: ${error}`);
    }
  }
  // Generate PDF from notes (requires Rust backend implementation)
  async generatePdfFromNotes(notes: SavedNote[]): Promise<string> {
    try {
      const html = await this.notesToHtml(notes);
      return await invoke("generate_pdf_from_html", { html });
    } catch (error: any) {
      console.error("Failed to generate PDF:", error);
      throw new Error(`PDF generation failed: ${error}`);
    }
  }
  // Search notes locally using Rust backend for better performance
  async searchNotesLocally(
    query: string,
    notes: SavedNote[],
  ): Promise<SavedNote[]> {
    try {
      const searchData = notes.map((note) => ({
        id: note.id,
        title: note.title,
        content: note.content,
        markdown: note.markdown,
        tags: note.tags,
      }));

      const results = await invoke("search_notes", {
        query,
        notes: searchData,
      });
      return results as SavedNote[];
    } catch (error: any) {
      console.warn("Rust search failed, falling back to JavaScript:", error);
      // Fallback to client-side search
      return notes.filter(
        (note) =>
          note.title.toLowerCase().includes(query.toLowerCase()) ||
          note.content.toLowerCase().includes(query.toLowerCase()) ||
          note.tags.some((tag) =>
            tag.toLowerCase().includes(query.toLowerCase()),
          ),
      );
    }
  }
  // Private helper methods
  private async ensureDirectoryExists(path: string): Promise<void> {
    try {
      await invoke("ensure_directory_exists", { path });
    } catch (error: any) {
      console.warn("Failed to ensure directory exists:", error);
    }
  }
  private sanitizeFilename(filename: string): string {
    return filename
      .replace(/[^\w\s-]/g, "") // Remove special characters
      .replace(/\s+/g, "-") // Replace spaces with hyphens
      .toLowerCase()
      .slice(0, 50); // Limit length
  }
  private generateId(): string {
    return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
  private notesToMarkdown(notes: SavedNote[]): string {
    return notes
      .map((note) => {
        const header = `# ${note.title}\n\n`;
        const metadata = `**Created:** ${note.savedAt.toLocaleDateString()}\n**Type:** ${note.noteType}\n**Tags:** ${note.tags.join(", ")}\n\n`;
        const content = note.markdown || note.content;
        const separator = "\n\n---\n\n";

        return header + metadata + content + separator;
      })
      .join("");
  }
  private async notesToHtml(notes: SavedNote[]): Promise<string> {
    const htmlParts = await Promise.all(
      notes.map(async (note) => {
        const title = `<h1>${note.title}</h1>`;
        const metadata = `
        <div class="note-metadata">
          <p><strong>Created:</strong> ${note.savedAt.toLocaleDateString()}</p>
          <p><strong>Type:</strong> ${note.noteType}</p>
          <p><strong>Tags:</strong> ${note.tags.join(", ")}</p>
        </div>
      `;

        let content = note.html;
        if (!content && note.markdown) {
          content = await this.renderMarkdownToHtml(note.markdown);
        }
        if (!content) {
          content = `<pre>${note.content}</pre>`;
        }
        return `
        <div class="note">
          ${title}
          ${metadata}
          <div class="note-content">${content}</div>
          <hr />
        </div>
      `;
      }),
    );

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Exported Notes</title>
        <style>
          body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; }
          .note { margin-bottom: 40px; }
          .note-metadata { background: #f5f5f5; padding: 10px; border-radius: 5px; margin: 10px 0; }
          .note-content { margin: 20px 0; }
          hr { border: none; border-top: 1px solid #ddd; margin: 40px 0; }
        </style>
      </head>
      <body>
        <h1>Exported Notes</h1>
        <p>Generated on ${new Date().toLocaleString()}</p>
        ${htmlParts.join("")}
      </body>
      </html>
    `;
  }
}
// Export singleton instance
export const tauriNotesService = TauriNotesService.getInstance();
;
// Convenience functions for use in Svelte components
export async function renderMarkdownInTauri(markdown: string): Promise<string> {
  return await tauriNotesService.renderMarkdownToHtml(markdown);
}
export async function saveNoteLocally(
  note: SavedNote,
  format: "markdown" | "html" | "json" = "markdown",
): Promise<string> {
  return await tauriNotesService.saveNoteToFile(note, format);
}
export async function exportNotesLocally(
  notes: SavedNote[],
  format: "markdown" | "html" | "json" = "markdown",
): Promise<string> {
  return await tauriNotesService.exportNotesToFile(notes, format);
}
export async function generateNotesPdf(notes: SavedNote[]): Promise<string> {
  return await tauriNotesService.generatePdfFromNotes(notes);
}
