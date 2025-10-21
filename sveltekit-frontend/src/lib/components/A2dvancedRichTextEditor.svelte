<!-- Consider wrapping this component in an ErrorBoundary for better error handling -->
<!-- import ErrorBoundary from '$lib/components/ErrorBoundary.svelte'; -->
<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!-- Advanced Rich Text Editor with Google Slides/Photoshop-like Features -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
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
  import { get, writable } from "svelte/store";
  import { onMount, onDestroy } from 'svelte';

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

  // --- Replaced misuse of $state with plain variables ---
  let editor: InstanceType<typeof TiptapEditor> | null = null;
  let editorElement: HTMLElement | null = null;
  let isFullscreen = false;
  let errorMessage = '';
  let isLoading = false;
  let currentZoom = 100;
  let showGrid = false;
  let showRuler = true;
  let wordCount = 0;
  let characterCount = 0;

  // Editor state stores
  const editorState = writable({
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
  });

  // keyboard handler reference for cleanup
  let _handleKeyDown: ((e: KeyboardEvent) => void) | null = null;

  onMount(() => {
    initializeEditor();
    setupKeyboardShortcuts();
  });

  onDestroy(() => {
    if (editor) {
      editor.destroy();
    }
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    if (_handleKeyDown) {
      document.removeEventListener('keydown', _handleKeyDown);
      _handleKeyDown = null;
    }
  });
  function initializeEditor() {
    editor = new TiptapEditor({
      element: editorElement, // Corrected semicolon to comma
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
      onTransaction () => updateEditorState(), // Corrected syntax
      onUpdate: ({ editor: currentEditorInstance }: { editor: InstanceType<typeof TiptapEditor> }) => { // Corrected type annotation
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
    editorState.set({ // Corrected set method call
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
    });
  }
  function updateWordCount(editorInstance: InstanceType<typeof TiptapEditor>) {
    if (!editorInstance) return; // Add null check for safety
    const text = editorInstance.getText(); // Use the passed instance
    wordCount = text.split(' ').filter((word: string) => word.length > 0).length; // Corrected split call
    characterCount = text.length;
  }
  function scheduleAutoSave(editorInstance: InstanceType<typeof TiptapEditor>) {
    if (autoSaveTimeout) {
      clearTimeout(autoSaveTimeout);
    }
    autoSaveTimeout = setTimeout(() => {
      saveContent(editorInstance);
    }, 2000);
  }
  async function saveContent(editorInstance: InstanceType<typeof TiptapEditor>) {
    if (!editorInstance) return; // Add null check for safety
    isLoading = true; // Set loading state
    const content = editorInstance.getJSON();
    const html = editorInstance.getHTML();
    try {
      const response = await fetch("/api/reports/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          reportId,
          caseId,
          content,
          html,
          wordCount,
          characterCount,
        }), // Corrected closing parenthesis
      });
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      // Show save indicator
      showSaveIndicator();
    } catch (error) {
      console.error("Auto-save failed:", error);
      errorMessage = error instanceof Error ? error.message: 'An error occurred';
    } finally {
      isLoading = false; // Reset loading state
    }
  }
  function showSaveIndicator() {
    // Implement visual save indicator
    const indicator = document.createElement("div");
    indicator.textContent = "Saved";
    indicator.className = // Corrected 'class' to 'className'
      "fixed top-4 right-4 bg-green-500 text-white px-3 py-1 rounded text-sm z-50";
    document.body.appendChild(indicator);
    setTimeout(() => {
      document.body.removeChild(indicator);
    }, 2000);
  }
  function setupKeyboardShortcuts() {
    // plain DOM listener instead of $effect
    _handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
          case "s":
            e.preventDefault();
            if (editor) {
              saveContent(editor);
            }
            break;
          case "z":
            if (e.shiftKey) {
              editor?.commands.redo?.();
            } else {
              editor?.commands.undo?.();
            }
            break;
        }
      }
    };
    document.addEventListener("keydown", _handleKeyDown);
  }
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
    input.click();
  }
  // Exported functions for parent component access
  export function setContent(content: string) {
    if (editor) {
      editor.commands.setContent(content);
    }
  }
  export function getContent() {
    return editor ? editor.getHTML() : "";
  }
  export function getJSON() {
    return editor ? editor.getJSON() : null;
  }
</script>
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
        onclick={() => saveContent(editor)}
        title="Save (Ctrl+S)"
      >
        <Save size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => importDocument()}
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
            onclick={() => exportDocument("html")}>Export as HTML</button
          >
          <button
            aria-label="Action button"
            class="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-gray-100"
            onclick={() => exportDocument("json")}>Export as JSON</button
          >
          <button
            aria-label="Action button"
            class="w-full text-left px-3 py-2 bg-transparent border-none cursor-pointer transition-colors duration-200 hover:bg-gray-100"
            onclick={() => exportDocument("pdf")}>Export as PDF</button
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
        class:disabled={!$editorState.canUndo}
        onclick={() => editor?.commands.undo()}
        title="Undo (Ctrl+Z)"
      >
        <Undo size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:disabled={!$editorState.canRedo}
        onclick={() => editor?.commands.redo()}
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
          bind:value={$editorState.currentFontFamily}
          onchange={(e) => setFontFamily((e.target as HTMLSelectElement).value)}
        >
          {#each fontFamilies as font}
            <option value={font}>{font}</option>
          {/each}
        </select>
      </div>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isBold}
        class:text-blue-700={$editorState.isBold}
        onclick={() => toggleBold()}
        title="Bold (Ctrl+B)"
      >
        <Bold size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isItalic}
        class:text-blue-700={$editorState.isItalic}
        onclick={() => toggleItalic()}
        title="Italic (Ctrl+I)"
      >
        <Italic size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isUnderline}
        class:text-blue-700={$editorState.isUnderline}
        onclick={() => toggleUnderline()}
        title="Underline (Ctrl+U)"
      >
        <UnderlineIcon size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isStrike}
        class:text-blue-700={$editorState.isStrike}
        onclick={() => toggleStrike()}
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
          bind:value={$editorState.currentColor}
          onchange={(e) => setTextColor((e.target as HTMLInputElement).value)}
          title="Text Color"
        />
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
              onclick={() => setHighlight(color)}
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
        class:bg-blue-100={$editorState.currentAlignment === "left"}
        class:text-blue-700={$editorState.currentAlignment === "left"}
        onclick={() => setAlignment("left")}
        title="Align Left"
      >
        <AlignLeft size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.currentAlignment === "center"}
        class:text-blue-700={$editorState.currentAlignment === "center"}
        onclick={() => setAlignment("center")}
        title="Align Center"
      >
        <AlignCenter size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.currentAlignment === "right"}
        class:text-blue-700={$editorState.currentAlignment === "right"}
        onclick={() => setAlignment("right")}
        title="Align Right"
      >
        <AlignRight size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.currentAlignment === "justify"}
        class:text-blue-700={$editorState.currentAlignment === "justify"}
        onclick={() => setAlignment("justify")}
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
        class:bg-blue-100={$editorState.isList}
        class:text-blue-700={$editorState.isList}
        onclick={() => editor?.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isOrderedList}
        class:text-blue-700={$editorState.isOrderedList}
        onclick={() => editor?.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isQuote}
        class:text-blue-700={$editorState.isQuote}
        onclick={() => editor?.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={$editorState.isCode}
        class:text-blue-700={$editorState.isCode}
        onclick={() => editor?.chain().focus().toggleCode().run()}
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
        onclick={() => insertImage()}
        title="Insert Image"
      >
        <ImageIcon size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => insertTable()}
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
        onclick={() => adjustZoom(-10)}
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
        onclick={() => adjustZoom(10)}
        title="Zoom In"
      >
        <ZoomIn size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        class:bg-blue-100={showGrid}
        class:text-blue-700={showGrid}
        onclick={() => (showGrid = !showGrid)}
        title="Toggle Grid"
      >
        <Grid size="18" />
      </button>
      <button
        aria-label="Action button"
        class="p-2 rounded-md border-none bg-transparent cursor-pointer flex items-center justify-center min-w-9 h-9 transition-colors duration-200 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
        onclick={() => toggleFullscreen()}
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
    {#if isLoading}
      <div class="text-xs text-blue-500 flex items-center gap-1">
        <svg class="animate-spin h-4 w-4 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        Saving...
      </div>
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