<!-- NieR: Automata Themed Rich Text Editor using bits-ui -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  interface Props {
    content?: string;
    placeholder?: string;
  }
  let { content = '', placeholder = 'Initialize data input...' }: Props = $props();

  import { Editor } from '@tiptap/core';
  import StarterKit from '@tiptap/starter-kit';

  // Use InstanceType<typeof Editor> to get the Editor instance type from the runtime constructor
  let editor = $state<InstanceType<typeof Editor> | null>(null);
  let editorElement: HTMLElement | null = null;

  // Selected font for the editor (native select)
  let selectedFont = $state<string>('Inter');

  $effect(() => {
    if (!editorElement) return;

    editor = new Editor({
      element: editorElement,
      extensions: [StarterKit],
      content,
      editorProps: {
        attributes: {
          class: 'nier-editor-content focus:outline-none',
          placeholder: placeholder,
        },
      },
    });

    // apply initial selected font to ProseMirror container if present
    const applyFont = () => {
      const pm = editorElement?.querySelector('.ProseMirror') as HTMLElement | null;
      if (pm && selectedFont) pm.style.fontFamily = selectedFont;
    };

    applyFont();

    // watch selectedFont changes (Svelte $effect will re-run when selectedFont changes)
    return () => {
      editor?.destroy();
    };
  });

  // Ensure font re-applies when user changes it
  $effect(() => {
    if (!editorElement) return;
    const pm = editorElement.querySelector('.ProseMirror') as HTMLElement | null;
    if (pm) pm.style.fontFamily = selectedFont;
  });

  const fontOptions = [
    { value: 'JetBrains Mono', label: 'JetBrains Mono' },
    { value: 'Courier New', label: 'Courier New' },
    { value: 'Inter', label: 'Inter' },
  ];
</script>

<div class="nier-panel">
  <!-- Toolbar -->
  <div class="nier-toolbar">
    <div class="nier-toolbar-group">
      <!-- Replaced custom ButtonRoot with native button -->
      <button type="button" class="nier-toolbar-btn bits-btn" aria-label="Undo" onclick={() => editor?.commands.undo()}>
        ↶
      </button>
      <button type="button" class="nier-toolbar-btn bits-btn" aria-label="Redo" onclick={() => editor?.commands.redo()}>
        ↷
      </button>
    </div>

    <!-- simple visual separator to replace Separator component -->
    <div class="nier-toolbar-separator"></div>

    <div class="nier-toolbar-group">
      <!-- Native select replacing custom Select components -->
      <label class="sr-only" for="font-select">Font</label>
      <select
        id="font-select"
        class="nier-select"
        bind:value={selectedFont}
        onchange={() => {
          // font application handled by $effect above
        }}
      >
        {#each fontOptions as font}
          <option value={font.value}>{font.label}</option>
        {/each}
      </select>
    </div>

    <div class="nier-toolbar-separator"></div>

    <div class="nier-toolbar-group">
      <button
        type="button"
        class="nier-toolbar-btn bits-btn"
        class:active={editor?.isActive('bold')}
        onclick={() => editor?.chain().focus().toggleBold().run()}
      >
        <strong>B</strong>
      </button>
      <button
        type="button"
        class="nier-toolbar-btn bits-btn"
        class:active={editor?.isActive('italic')}
        onclick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <em>I</em>
      </button>
    </div>
  </div>

  <!-- Editor -->
  <div class="nier-editor">
    <div bind:this={editorElement}></div>
  </div>

  <!-- Status Bar -->
  <div class="nier-status-bar">
    <span>STATUS: OPERATIONAL</span>
    <span>DATA INTEGRITY: 100%</span>
  </div>
</div>

<style>
  /* @unocss-include */
  /* @import '../styles/nier-design-system.css'; */
</style>
