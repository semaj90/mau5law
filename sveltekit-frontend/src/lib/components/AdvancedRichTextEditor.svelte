<script lang="ts">
  import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'
  // Svelte 5 runes are auto-imported with Advanced Rich Text Editor/Google Slides/Photoshop-like Features
  import { onMount, onDestroy } from 'svelte';
  import { Editor as TiptapEditor } from "@tiptap/core";
  import Color from "@tiptap/extension-color";
  import FontFamily from "@tiptap/extension-font-family";
  import Highlight from "@tiptap/extension-highlight";
  import Image from "@tiptap/extension-image";
  import Placeholder from "@tiptap/extension-placeholder";
  import Table from "@tiptap/extension-table";
  import TableCell from "@tiptap/extension-table-cell";
  import TableHeader from "@tiptap/extension-table-header";
  import TableRow from "@tiptap/extension-table-row";
  import TextAlign from "@tiptap/extension-text-align";
  import TextStyle from "@tiptap/extension-text-style";
  import Typography from "@tiptap/extension-typography";
  import Underline from "@tiptap/extension-underline"; // Added Underline extension import
  import StarterKit from "@tiptap/starter-kit";
  import {
    AlignCenter,
    AlignJustify,
    AlignLeft,
    AlignRight,
    Bold,
    ChevronDown,
    Code,
    Download,
    Eye,
    EyeOff,
    Grid,
    Highlighter,
    Image as ImageIcon,
    Italic,
    List,
    ListOrdered,
    Quote,
    Redo,
    Save,
    Strikethrough,
    Table as TableIcon,
    Type,
    Underline as UnderlineIcon, // Renamed to avoid conflict
    Undo,
    Upload,
    ZoomIn,
    ZoomOut,
  } from "lucide-svelte";

  // Import LokiJS client functions
  import { saveDraft, loadDraft } from '$lib/client/db/loki-client';

  // Svelte 5 props
  let {
    content = $bindable(),
    placeholder = "Start writing your legal report...",
    autosave = true,
    reportId = "",
    caseId = ""
  }: {
    content?: any;
    placeholder?: string;
    autosave?: boolean;
    reportId?: string;
    caseId?: string;
  } = $props();

  // typed editor and elements
  let editor: InstanceType<typeof TiptapEditor> | null = $state(null);
  let editorElement: HTMLElement | null;
  let isFullscreen = $state(false);
  let errorMessage = $state('');
  let currentZoom = $state(100);
  let showGrid = $state(false);
  let showRuler = $state(true);
  let wordCount = $state(0);
  let characterCount = $state(0);

  // Auto-save timeout typed to be compatible with browser/node
  let autoSaveTimeout: ReturnType<typeof setTimeout> | null = null;

  // Editor state stores
  // define editor state shape for TypeScript
  type EditorState = {
    canUndo: boolean;
    canRedo: boolean;
    isBold: boolean;
    isItalic: boolean;
    isUnderline: boolean;
    isStrike: boolean;
    currentAlignment: string;
    currentColor: string;
    currentHighlight: string;
    currentFontFamily: string;
    currentFontSize: number;
    isTable: boolean;
    isCode: boolean;
    isList: boolean;
    isOrderedList: boolean;
    isQuote: boolean;
  };

  const defaultEditorState: EditorState = {
    canUndo: false,
    canRedo: false,
    isBold: false,
    isItalic: false,
    isUnderline: false,
    isStrike: false,
    currentAlignment: "left",
    currentColor: "#000000",
    currentHighlight: "",
    currentFontFamily: "Inter",
    currentFontSize: 16,
    isTable: false,
    isCode: false,
    isList: false,
    isOrderedList: false,
    isQuote: false,
  };

  // local plain object used in template for property access
  let state: EditorState = $state(defaultEditorState);

  // Color palettes for quick access
  const colorPalettes = {
    text: [
      "#000000",
      "#374151",
      "#6b7280",
      "#ef4444",
      "#f97316",
      "#eab308",
      "#22c55e",
      "#3b82f6",
      "#8b5cf6",
      "#ec4899",
    ],
    highlight: [
      "transparent",
      "#fef3c7",
      "#dcfce7",
      "#dbeafe",
      "#e0e7ff",
      "#f3e8ff",
      "#fce7f3",
      "#fed7d7",
      "#f0f9ff",
    ],
    legal: [
      "#1e40af",
      "#7c2d12",
      "#991b1b",
      "#365314",
      "#581c87",
      "#831843",
      "#92400e",
      "#166534",
    ],
  };
  // Font options
  const fontFamilies = [
    "Inter",
    "Times New Roman",
    "Arial",
    "Helvetica",
    "Georgia",
    "Verdana",
    "Courier New",
    "Roboto",
    "Open Sans",
    "Lato",
    "Merriweather",
  ];
  // Auto-save functionality
  onMount(() => {
    const draft = loadDraft(reportId, caseId);
    if (draft && !content) {
      content = draft.content; // Update the bindable prop
      wordCount = draft.wordCount;
      characterCount = draft.characterCount;
    }
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
      autoSaveTimeout = null;
    }
  });

  // Initialize editor only after editorElement is bound
  $effect(() => {
    if (editorElement && !editor) {
      initializeEditor();
    }
  });

  // Top-level $effect for keyboard shortcuts, reacting to editor initialization
  $effect(() => {
    if (!editor) return; // Only set up shortcuts when editor is initialized

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case "s":
            e.preventDefault();
            saveContent(editor); // editor is guaranteed to be non-null here
            break;
          case "z":
            if (e.shiftKey) {
              editor.commands.redo();
            } else {
              editor.commands.undo();
            }
            break;
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  });

  function initializeEditor() {
    editor = new TiptapEditor({
      element: editorElement,
      extensions: [
        StarterKit.configure({
          history: {
            depth: 100,
          },
        }),
        Underline, // Added Underline extension
        Image.configure({
          inline: true,
          allowBase64: true,
        }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Highlight.configure({
          multicolor: true,
        }),
        Typography,
        Placeholder.configure({
          placeholder: placeholder, // Corrected semicolon to comma
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        TextStyle,
        Color,
        FontFamily.configure({
          types: ["textStyle"],
        }),
      ],
      content: content, // Corrected semicolon to comma
      onTransaction: () => updateEditorState(),
      onUpdate: ({ editor: currentEditorInstance }: { editor: InstanceType<typeof TiptapEditor> | null }) => {
        updateWordCount(currentEditorInstance);
        if (autosave) {
          scheduleAutoSave(currentEditorInstance);
        }
      },
      editorProps: {
        attributes: {
          class:
            "prose prose-lg max-w-none focus:outline-none min-h-[400px] p-6",
        },
      },
    });
  }
  function updateEditorState() {
    if (!editor) return;
    state = {
      canUndo: editor.can.undo(),
      canRedo: editor.can.redo(),
      isBold: editor.isActive("bold"),
      isItalic: editor.isActive("italic"),
      isUnderline: editor.isActive("underline"),
      isStrike: editor.isActive("strike"),
      currentAlignment: editor.isActive({ textAlign: "center" })
        ? "center"
        : editor.isActive({ textAlign: "right" })
          ? "right"
          : editor.isActive({ textAlign: "justify" })
            ? "justify"
            : "left",
      currentColor: editor.getAttributes('textStyle').color || "#000000", // Corrected getAttributes call
      currentHighlight: editor.getAttributes('highlight').color || "", // Corrected getAttributes call
      currentFontFamily:
        editor.getAttributes('textStyle').fontFamily || "Inter", // Corrected getAttributes call
      currentFontSize: editor.getAttributes('textStyle').fontSize || 16, // Corrected getAttributes call
      isTable: editor.isActive("table"),
      isCode: editor.isActive("code"),
      isList: editor.isActive("bulletList"),
      isOrderedList: editor.isActive("orderedList"),
      isQuote: editor.isActive("blockquote"),
    };
  }

  // typed functions accepting the editor instance
  function updateWordCount(editorInstance: InstanceType<typeof TiptapEditor> | null): void {
    if (!editorInstance) return;
    const text = editorInstance.getText();
    wordCount = text.split(' ').filter((word: string) => word.length > 0).length;
    characterCount = text.length;
  }

  function scheduleAutoSave(editorInstance: InstanceType<typeof TiptapEditor> | null): void {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
      saveContent(editorInstance);
    }, 2000);
  }

  async function saveContent(editorInstance: InstanceType<typeof TiptapEditor> | null): Promise<void> {
    if (!editorInstance) return;
    const jsonContent = editorInstance.getJSON(); // Renamed to avoid conflict with prop 'content'
    const html = editorInstance.getHTML();
    // Update the bindable prop to reflect the latest content
    content = jsonContent;

    // Save offline immediately (Loki)
    saveDraft({ reportId, caseId, content: jsonContent, html, wordCount, characterCount });

    try {
      const response = await fetch("/api/reports/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          caseId,
          content: jsonContent, // Use jsonContent here
          html,
          // wordCount, // Removed from fetch body as per prompt example
          // characterCount, // Removed from fetch body as per prompt example
        }),
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      showSaveIndicator();
    } catch (error: any) {
      console.warn("Server save failed, kept local draft", error); // Changed to console.warn as per prompt
      errorMessage = error && error.message ? error.message : 'An error occurred';
    }
  }

  function showSaveIndicator() {
    // Implement visual save indicator
    const indicator = document.createElement("div");
    indicator.textContent = "Saved";
    indicator.className =
      "fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50";
    document.body.appendChild(indicator);
    setTimeout(() => {
      document.body.removeChild(indicator);
    }, 2000);
  }
  // Removed the setupKeyboardShortcuts function as it's now a top-level $effect
  // function setupKeyboardShortcuts() {
  // $effect(() => {
  //   const handleKeyDown = (e: KeyboardEvent) => { // Corrected effect syntax
  //     if (e.ctrlKey || e.metaKey) {
  //       switch (e.key) {
  //         case "s":
  //           e.preventDefault();
  //           if (editor) { // Ensure editor is initialized before saving
  //             saveContent(editor);
  //           }
  //           break;
  //         case "z":
  //           if (e.shiftKey) {
  //             editor?.commands.redo();
  //           } else {
  //             editor?.commands.undo();
  //           }
  //           break;
  //       }
  //     }
  //   };
  //   document.addEventListener("keydown", handleKeyDown);
  //   return () => {
  //     document.removeEventListener('keydown', handleKeyDown);
  //   };
  // });
  // }
  // Toolbar actions
  function toggleBold() {
    editor?.chain().focus().toggleBold().run();
  }
  function toggleItalic() {
    editor?.chain().focus().toggleItalic().run();
  }
  function toggleUnderline() { // Corrected function signature
    editor?.chain().focus().toggleUnderline().run(); // Corrected command
  }
  function toggleStrike() {
    editor?.chain().focus().toggleStrike().run();
  }
  function setAlignment(align: string) { // Corrected function signature
    editor?.chain().focus().setTextAlign(align).run(); // Corrected command
  }
  function setTextColor(color: string) { // Corrected function signature
    editor?.chain().focus().setColor(color).run(); // Corrected command
  }
  function setHighlight(color: string) { // Corrected function signature
    if (color === "transparent") {
      editor?.chain().focus().unsetHighlight().run();
    } else {
      editor?.chain().focus().setHighlight({ color }).run(); // Corrected command
    }
  }
  function setFontFamily(family: string) { // Corrected function signature
    editor?.chain().focus().setFontFamily(family).run(); // Corrected command
  }
  function insertTable() { // Corrected function signature
    editor
      ?.chain().focus()
      .insertTable({ rows: 3, cols: 3, withHeaderRow: true }) // Added default table dimensions
      .run();
  }
  function insertImage() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = "image/*";
    input.onchange=(e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const src = e.target?.result as string;
          editor?.chain().focus().setImage({ src }).run(); // Corrected command
        }
        reader.readAsDataURL(file);
      }
    }
    input.click();
  }
  function toggleFullscreen() {
    isFullscreen = !isFullscreen; // Corrected typo
    if (isFullscreen) {
      document.documentElement.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  }
  function adjustZoom(delta: number) {
    currentZoom = Math.max(50, Math.min(200, currentZoom + delta));
    if (editor?.view.dom) {
      (editor.view.dom as HTMLElement).style.zoom = `${currentZoom}%`;
    }
  }
  function exportDocument(format: "html" | "json" | "pdf") {
    if (!editor) return;
    const content = format === "json" ? editor.getJSON() : editor.getHTML();
    const blob = new Blob([JSON.stringify(content, null, 2)], {
      type: format === "json" ? "application/json" : "text/html",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `report-${reportId}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  }
  /**
   * Opens a file picker dialog to import a document into the editor.
   * Supports JSON (TipTap format) and HTML files; attempts JSON parse first, falls back to HTML if parsing fails.
   */
  function importDocument() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,.html";
    input.onchange=(e) => {
      const file = (e.target as HTMLInputElement)?.files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (e) => {
          try {
            const content = JSON.parse(e.target?.result as string);
            editor?.commands.setContent(content);
          } catch {
            // If not JSON, treat as HTML
            editor?.commands.setContent(e.target?.result as string);
          }
        }
        reader.readAsText(file);
      }
    }
  }
  // Reactive statements
  // 'state' is updated via the editorState subscription above and used in the template.
</script>


<ErrorBoundary>
  <div
    class="mx-auto px-4 max-w-7xl min-h-[500px] border border-gray-300 rounded-lg overflow-hidden bg-white"
    class:fixed={isFullscreen}
    class:inset-0={isFullscreen}
    class:z-50={isFullscreen}
  >
    <!-- Main Toolbar -->
    <div
      class="flex flex-wrap items-center justify-between gap-2 p-2 border-b border-gray-200 bg-white sticky top-0 z-10"
    >
      <!-- File Operations -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => saveContent(editor)}
          title="Save (Ctrl+S)"
        >
          <Save size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => importDocument()}
          title="Import Document"
        >
          <Upload size="18" />
        </button>
        <div class="relative group">
          <button
            aria-label="Button"
            class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Download size="18" />
            <ChevronDown size="14" />
          </button>
          <div
            class="absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-md py-1 z-20 min-w-[150px] hidden group-hover:block"
          >
            <button
              aria-label="Action button"
              class="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-gray-100"
              on:click={() => exportDocument("html")}>Export as HTML</button
            >
            <button
              aria-label="Action button"
              class="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-gray-100"
              on:click={() => exportDocument("json")}>Export as JSON</button
            >
            <button
              aria-label="Action button"
              class="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-gray-100"
              on:click={() => exportDocument("pdf")}>Export as PDF</button
            >
          </div>
        </div>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Undo/Redo -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:disabled={!state.canUndo}
          on:click={() => editor?.commands.undo()}
          title="Undo (Ctrl+Z)"
        >
          <Undo size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:disabled={!state.canRedo}
          on:click={() => editor?.commands.redo()}
          title="Redo (Ctrl+Shift+Z)"
        >
          <Redo size="18" />
        </button>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Text Formatting -->
      <div class="flex items-center gap-1">
        <div class="font-selector">
          <select
            class="border border-gray-300 rounded-md px-2 py-1 text-sm"
            value={state.currentFontFamily}
            on:change={(e) => { e.preventDefault(); setFontFamily((e.target as HTMLSelectElement).value); }}
          >
            {#each fontFamilies as font}
              <option value={font}>{font}</option>
            {/each}
          </select>
        </div>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isBold}
          class:text-blue-700={state.isBold}
          on:click={() => toggleBold()}
          title="Bold (Ctrl+B)"
        >
          <Bold size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isItalic}
          class:text-blue-700={state.isItalic}
          on:click={() => toggleItalic()}
          title="Italic (Ctrl+I)"
        >
          <Italic size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isUnderline}
          class:text-blue-700={state.isUnderline}
          on:click={() => toggleUnderline()}
          title="Underline (Ctrl+U)"
        >
          <UnderlineIcon size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isStrike}
          class:text-blue-700={state.isStrike}
          on:click={() => toggleStrike()}
          title="Strikethrough"
        >
          <Strikethrough size="18" />
        </button>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Color Tools -->
      <div class="flex items-center gap-1">
        <div
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed relative"
        >
          <input
            type="color"
            class="absolute inset-0 opacity-0 cursor-pointer"
            value={state.currentColor}
            on:input={(e) => setTextColor((e.target as HTMLInputElement).value)}
            title="Text Color"
          />
          <!-- The browser's default color input swatch will correctly display the selected color based on the 'value' attribute. -->
          <Type size="18" />
        </div>
        <div class="relative group">
          <button
            aria-label="Button"
            class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
          >
            <Highlighter size="18" />
            <ChevronDown size="14" />
          </button>
          <div
            class="absolute top-full left-0 bg-white border border-gray-200 rounded-md shadow-md py-1 z-20 min-w-[150px] hidden group-hover:block grid grid-cols-5 gap-1 p-2 min-w-[200px]"
          >
            {#each colorPalettes.highlight as color}
              <button
                aria-label={color === "transparent"
                  ? "Remove highlight"
                  : `Highlight with ${color}`}
                class="w-6 h-6 rounded-md border border-gray-300 cursor-pointer"
                style="background-color: {color}"
                on:click={() => setHighlight(color)}
                title={color === "transparent"
                  ? "Remove highlight"
                  : `Highlight with ${color}`}
              ></button>
            {/each}
          </div>
        </div>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Alignment -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.currentAlignment === "left"}
          class:text-blue-700={state.currentAlignment === "left"}
          on:click={() => setAlignment("left")}
          title="Align Left"
        >
          <AlignLeft size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.currentAlignment === "center"}
          class:text-blue-700={state.currentAlignment === "center"}
          on:click={() => setAlignment("center")}
          title="Align Center"
        >
          <AlignCenter size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.currentAlignment === "right"}
          class:text-blue-700={state.currentAlignment === "right"}
          on:click={() => setAlignment("right")}
          title="Align Right"
        >
          <AlignRight size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.currentAlignment === "justify"}
          class:text-blue-700={state.currentAlignment === "justify"}
          on:click={() => setAlignment("justify")}
          title="Align Justify"
        >
          <AlignJustify size="18" />
        </button>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Lists & Blockquote -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isList}
          class:text-blue-700={state.isList}
          on:click={() => editor?.chain().focus().toggleBulletList().run()}
          title="Bullet List"
        >
          <List size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isOrderedList}
          class:text-blue-700={state.isOrderedList}
          on:click={() => editor?.chain().focus().toggleOrderedList().run()}
          title="Numbered List"
        >
          <ListOrdered size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isQuote}
          class:text-blue-700={state.isQuote}
          on:click={() => editor?.chain().focus().toggleBlockquote().run()}
          title="Quote"
        >
          <Quote size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={state.isCode}
          class:text-blue-700={state.isCode}
          on:click={() => editor?.chain().focus().toggleCode().run()}
          title="Code"
        >
          <Code size="18" />
        </button>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- Insert Elements -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => insertImage()}
          title="Insert Image"
        >
          <ImageIcon size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => insertTable()}
          title="Insert Table"
        >
          <TableIcon size="18" />
        </button>
      </div>
      <div class="w-px h-6 bg-gray-300 mx-1"></div>
      <!-- View Controls -->
      <div class="flex items-center gap-1">
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => adjustZoom(-10)}
          title="Zoom Out"
        >
          <ZoomOut size="18" />
        </button>
        <span class="text-sm text-gray-600 min-w-10 text-center"
          >{currentZoom}%</span
        >
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => adjustZoom(10)}
          title="Zoom In"
        >
          <ZoomIn size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          class:bg-blue-100={showGrid}
          class:text-blue-700={showGrid}
          on:click={() => (showGrid = !showGrid)}
          title="Toggle Grid"
        >
          <Grid size="18" />
        </button>
        <button
          aria-label="Action button"
          class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
          on:click={() => toggleFullscreen()}
          title="Toggle Fullscreen"
        >
          {#if isFullscreen}
            <EyeOff size="18" />
          {:else}
            <Eye size="18" />
          {/if}
        </button>
      </div>
    </div>
    <!-- Secondary Toolbar for Advanced Features -->
    <div
      class="flex items-center justify-between gap-2 p-2 border-b border-gray-200 bg-gray-50 text-sm text-gray-600"
    >
      <div class="flex items-center gap-1">
        Words: <span class="font-medium text-gray-800">{wordCount}</span> | Characters:
        <span class="font-medium text-gray-800">{characterCount}</span>
      </div>
      <div class="flex-grow"></div>
      {#if autosave}
        <div class="text-xs text-gray-500">Auto-save enabled</div>
      {/if}
    </div>
    <!-- Ruler (if enabled) -->
    {#if showRuler}
      <div
        class="h-6 w-full bg-gray-100 border-b border-gray-200 flex items-center relative overflow-hidden bg-[repeating-linear-gradient(90deg,transparent,transparent_10px,#e5e7eb_10px,#e5e7eb_11px)]"
      >
        {#each Array(20) as _, i}
          <div
            class="absolute h-full border-l border-gray-400 flex flex-col justify-end items-center"
            style="left: {i * 50}px"
          >
            {#if i % 2 === 0}
              <span class="text-xs text-gray-600 -mb-1">{i}</span>
            {/if}
          </div>
        {/each}
      </div>
    {/if}
    <!-- Editor Container -->
    <div
      class="flex flex-col flex-1 overflow-auto min-h-[400px]"
      class:bg-[linear-gradient(to_right,#f3f4f6_1px,transparent_1px),linear-gradient(to_bottom,#f3f4f6_1px,transparent_1px)]={showGrid}
      class:bg-size-[20px_20px]={showGrid}
    >
      <div bind:this={editorElement} class="flex-grow p-6 min-h-full"></div>
    </div>
  </div>
  <!-- All styles have been moved to UnoCSS classes in the markup. -->
</ErrorBoundary>


