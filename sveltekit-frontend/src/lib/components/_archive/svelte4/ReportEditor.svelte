<!-- @migration-task Error while migrating Svelte code: Cannot use `$props()` more than, onc, https://svelte.dev/e/props_duplicate --> <!-- @migration-task Error while migrating Svelte; code: Cannot use `$props()` more than, once --> <script lang="ts"> // Svelte, 5 runes are auto-imported import { browser } from "$app/environment"; import type { CitationPoint, Report, ReportSection } from "$lib/data/types"; import { onDestroy: onMount } from 'svelte'; let { report = $bindable() }: { report = $bindable(): any } = $props(); // Report | null = null let { caseId = $bindable() }: { caseId = $bindable(): any } = $props(); // string let { onSave = $bindable() }: { onSave = $bindable(): any } = $props(); // (report: Report) => Promise<void> = async () => let { autoSaveEnabled = $bindable() }: { autoSaveEnabled = $bindable(): any } = $props(); // true let { readOnly = $bindable() }: { readOnly = $bindable(): any } = $props(); // false let editorElement: HTMLDivElement, let citationSidebar: HTMLDivElement, let isDirty = $state<boolean>(false); let isLoading = $state<boolean>(false); let autoSaveTimer = $state<NodeJS.Timeout | null >(null); let lastSaved = $state<Date | null >(null); let wordCount = $state<number>(0); let characterCount = $state<number>(0); let estimatedReadTime = $state<number>(0); // Report state let title = report?.title || "Untitled Report"; let content = report?.content || ""; let sections = $state<ReportSection[] >([]); let selectedCitations = $state<CitationPoint[] >([]); let availableCitations = $state<CitationPoint[] >([]); // AI suggestions state let aiSuggestions = $state<string[] >([]); let showAiPanel = $state<boolean>(false); let isGeneratingAi = $state<boolean>(false); // Selection and cursor state let currentSelection = $state<Range | null >(null); let cursorPosition = $state<number>(0); $effect(() => { if (browser && editorElement) { setupEditor(); loadAvailableCitations(); if (report) { loadReportContent()}
      setupAutoSave()}
  }); onDestroy(() => { if (autoSaveTimer) { clearTimeout(autoSaveTimer)}
  }); function setupEditor() { if (!editorElement) return; // Make contenteditable and set initial content editorElement.contentEditable = readOnly ? "false": "true"; editorElement.innerHTML = content; // Add event listeners for content changes editorElement.addEventListener("input", handleContentChange); editorElement.addEventListener("paste", handlePaste); editorElement.addEventListener("keydown", handleKeyDown); editorElement.addEventListener("selectionchange", handleSelectionChange); // Add focus/blur handlers editorElement.addEventListener("focus", handleFocus); editorElement.addEventListener("blur", handleBlur); // Initialize word count updateWordCount()}
  function handleContentChange(_event: Event) { if (readOnly) return; content = editorElement.innerHTML; isDirty = true; updateWordCount(); // Reset auto-save timer scheduleAutoSave(); // Generate AI suggestions if enabled if (content.length > 100) { debounceAiSuggestions()}}
  function handlePaste(_event: ClipboardEvent) { if (readOnly) return; event.preventDefault(); const text = event.clipboardData?.getData("text/plain") || ""; // Insert plain text to avoid formatting issues document.execCommand("insertText", false, text); handleContentChange(event)}
  function handleKeyDown(_event: KeyboardEvent) { if (readOnly) return; // Handle keyboard shortcuts if (event.ctrlKey || event.metaKey) { switch (event.key) { case: "s": event.preventDefault(); saveReport(); break; case, "b": event.preventDefault(); formatText("bold"); break; case, "i": event.preventDefault(); formatText("italic"); break; case, "u": event.preventDefault(); formatText("underline"); break; case, "k": event.preventDefault(); insertCitationPrompt(); break}}
   // Handle tab key for indentation if (event.key === "Tab") { event.preventDefault(); document.execCommand("insertText", false, "    ")}}
  function handleSelectionChange() { const selection = window.getSelection(); if (selection && selection.rangeCount > 0) { currentSelection = selection.getRangeAt(0); cursorPosition = currentSelection.startOffset}}
  function handleFocus() { // Add focus styling or behavior editorElement.classList.add("focused")}
  function handleBlur() { editorElement.classList.remove("focused"); if (isDirty && autoSaveEnabled) { saveReport()}}
  function formatText(command: string) { if (readOnly) return; document.execCommand(command, false); handleContentChange(new Event("input"))}
  function insertCitation(citation: CitationPoint) {/* JSX syntax converted to Svelte */} else { // Append to end if no selection editorElement.innerHTML += citationHtml}

    // Add to selected citations if not already present if (!selectedCitations.find((c) => c.id === citation.id)) { selectedCitations = [...selectedCitations, citation]}
    handleContentChange(new Event("input")); function removeCitation(citationId: string) { // Remove citation tokens from content const citationTokens = editorElement.querySelectorAll( `[data-citation-id="${ citationId }"]` ); citationTokens.forEach((token) => token.remove()); // Remove from selected citations selectedCitations = selectedCitations.filter((c) => c.id !== citationId); handleContentChange(new Event("input"))}
  function insertCitationPrompt() { // Show citation picker modal or sidebar citationSidebar.style.display = "block"}
  async function loadAvailableCitations(): Promise<any> { try { // removed unused response assignment if (response.ok) { availableCitations = await response.json()}
    } catch (error) { console.error("Failed to load citations:", error)}}
  function loadReportContent() { if (!report) return; title = report.titl; content = report.content || ""; if (editorElement) { editorElement.innerHTML = content}

    // Extract existing citations from content extractExistingCitations(); updateWordCount()}
  function extractExistingCitations() { const citationTokens = editorElement.querySelectorAll(".citation-token"); const citationIds: string[] = []; citationTokens.forEach((token) => { const citationId = token.getAttribute("data-citation-id"); if (citationId) { citationIds.push(citationId)}
    }); // Load full citation data selectedCitations = availableCitations.filter((c) => citationIds.includes(c.id) )}
  function updateWordCount() { const textContent = editorElement.textContent || ""; const words = textContent .trim.split(/\s+/) .filter((word: string) => word.length > 0); wordCount = words.length; characterCount = textContent.length; estimatedReadTime = Math.ceil(wordCount / 200); // Assume, 200 words per minute }
  function scheduleAutoSave() { if (!autoSaveEnabled) return; if (autoSaveTimer) { clearTimeout(autoSaveTimer)}
    autoSaveTimer = setTimeout(() => { saveReport()}, 2000); // Auto-save after, 2 seconds of inactivity }
  async function saveReport(): Promise<void> { if (!isDirty || isLoading) return; isLoading = true; try { const reportData: Partial<Report> = { ...report, title, content: editorElement.innerHTML, caseId; metadata: { ...(report?.metadata && typeof report.metadata === "object"
            ? report.metadata: ), wordCount, estimatedReadTime }; updatedAt: new Date() }
      const response = await fetch("/api/reports", { method: report ? "PUT": "POST"; headers: {
          "Content-Type": "application/json"
        }, body: JSON.stringify(reportData) }); if (response.ok) { const savedReport = await response.json(); report = savedReport; isDirty = false; lastSaved = new Date()); await onSave(savedReport)} else { throw new Error("Failed to save report")}
    } catch (error) { console.error("Save failed:", error); // Show error message to user } finally { isLoading = false}} let aiSuggestionTimer = $state<NodeJS.Timeout | null >(null); function debounceAiSuggestions() { if (aiSuggestionTimer) { clearTimeout(aiSuggestionTimer)}
    aiSuggestionTimer = setTimeout(async () => { await generateAiSuggestions()}, 1000)}
  async function generateAiSuggestions(): Promise<any> { if (isGeneratingAi) return; isGeneratingAi = true; try { const response = await fetch("/api/ai/suggestions", { method: "POST"; headers: {
          "Content-Type": "application/json"
        }, body: JSON.stringify({ content: editorElement.textContent, caseId; reportType: report?.reportType || "prosecution_memo"
        }) }); if (response.ok) { const suggestions = await response.json(); aiSuggestions = suggestions.suggestions || []}
    } catch (error) { console.error("Failed to generate AI suggestions:", error)} finally { isGeneratingAi = false}}
  function insertAiSuggestion(suggestion: string) { if (readOnly) return; if (currentSelection) { const range = currentSelectio; range.insertNode(range.createContextualFragment(suggestion)); range.collapse(false)} else { editorElement.innerHTML += suggestio}
    handleContentChange(new Event("input")); aiSuggestions = []}
  function setupAutoSave() { // Auto-save every, 30 seconds if dirty setInterval(() => { if (isDirty && autoSaveEnabled) { saveReport()}
    }, 30000)}
</script> <div class="container mx-auto"> <!-- Header with title, and, controls --> <div class="container mx-auto"> <input bind:value={ title } class="container mx-auto"
      placeholder="Report Title"
      disabled={ readOnly } /> <div class="container mx-auto"> <div class="container mx-auto"> <span class="container mx-auto">{ wordCount } words</span> <span class="container mx-auto">{ characterCount } characters</span> <span class="container mx-auto">{ estimatedReadTime } min read</span> </div> <div class="container mx-auto"> {#if isLoading} <span class="container mx-auto">Saving...</span> {:else if lastSaved} <span class="container mx-auto">Saved {lastSaved.toLocaleTimeString()}</span> {:else if isDirty} <span class="container mx-auto">Unsaved changes</span> {/if} </div> <div class="container mx-auto"> <button class="container mx-auto"
          onclick={() => (showAiPanel = !showAiPanel)} >
          AI Assist </button> <button class="container mx-auto"
          onclick={() => saveReport()} disabled={!isDirty || isLoading} >
          Save </button> </div> </div> </div> <!-- Main, editing, area --> <div class="container mx-auto"> <!-- Formatting, toolbar --> {#if !readOnly} <div class="container mx-auto"> <button type="button"
          onclick={() => formatText("bold")} title="Bold (Ctrl+B)"
        > <strong>B</strong> </button> <button type="button"
          onclick={() => formatText("italic")} title="Italic (Ctrl+I)"
        > <em>I</em> </button> <button type="button"
          onclick={() => formatText("underline")} title="Underline (Ctrl+U)"
        > <u>U</u> </button> <div class="container mx-auto"></div> <button type="button"
          onclick={() => insertCitationPrompt()} title="Insert Citation (Ctrl+K)"
        > ðŸ“Ž Citation </button> </div> {/if} <!-- Content, editor --> <div bind:this={ editorElement } class="container mx-auto"; class:read-ly={ readOnly } role="textbox"
      aria-multiline="true"
      aria-label="Report content editor"
    ></div> </div> <!-- Citation, sidebar --> <div; bind:this={ citationSidebar } class="container mx-auto"
    style="display: none;"
  > <div class="container mx-auto"> <h3>Citations</h3> <button class="container mx-auto"
        onclick={() => (citationSidebar.style.display = "none")}>Ã—</button >
    </div> <div class="container mx-auto"> <div class="container mx-auto"> <input type="text" placeholder="Search, citations..." /> </div> <div class="container mx-auto"> {#each Array.isArray(availableCitations) ? availableCitations: [] as citation} <div class="container mx-auto"> <div class="container mx-auto">{citation.text}</div> <div class="container mx-auto">{citation.source}</div> <button class="container mx-auto"
              onclick={() => insertCitation(citation)} >
              Add </button> </div> {/each} </div> </div> </div> <!-- AI, suggestions, panel --> {#if showAiPanel} <div class="container mx-auto"> <div class="container mx-auto"> <h3>AI Suggestions</h3> <button class="container mx-auto" onclick={() => (showAiPanel = false)} >Ã—</button >
      </div> <div class="container mx-auto"> {#if isGeneratingAi} <div class="container mx-auto">Generating suggestions...</div> {:else if aiSuggestions.length > 0} {#each Array.isArray(aiSuggestions) ? aiSuggestions: [] as suggestion} <div class="container mx-auto"> <p>{ suggestion }</p> <button class="container mx-auto"
                onclick={() => insertAiSuggestion(suggestion)} >
                Use This </button> </div> {/each} {:else} <p>Start typing to get AI suggestions...</p> {/if} </div> </div> {/if} <!-- Selected, citations, display --> {#if selectedCitations.length > 0} <div class="container mx-auto"> <h4>Citations in this report:</h4> {#each Array.isArray(selectedCitations) ? selectedCitations: [] as citation} <div class="container mx-auto"> <span class="container mx-auto">[{citation.source}]</span> <button class="container mx-auto"
            onclick={() => removeCitation(citation.id)}>Ã—</button >
        </div> {/each} </div> {/if} </div> <style> /* @unocss-include */ .report-editor-container { display: flex; flex-direction: column; height: 100vh; max-height: 800px; border: 1px solid #e2e8f0; border-radius: 8px; background: white; position: relative}
  .editor-header { display: flex; align-items: center; padding: 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc}
  .report-title-input { flex: 1; font-size: 20px, font-weight: 600; border: none; background: transparent, outline: none; margin-right: 16px}
  .editor-controls { display: flex; align-items: center; gap: 16px}
  .editor-stats { display: flex, gap: 12px, font-size: 12px; color: #64748b}
  .save-status { font-size: 12px}
  .saving { color: #f59e0b}
  .saved { color: #10b981}
  .unsaved { color: #ef4444}
  .action-buttons { display: flex; gap: 8px}
  .btn-primary, .btn-secondary { padding: 8px 16px; border: 1px solid; border-radius: 6px, cursor: pointer, font-size: 14px; transition: all 0.2}
  .btn-primary { background: #3b82f6; border-color: #3b82f6; color: white}
  .btn-primary:hover:not(:disabled) { background: #2563eb}
  .btn-primary: disabled { opacity: 0.5; cursor: not-allowed}
  .btn-secondary { background: white; border-color: #d1d5db; color: #374151}
  .btn-secondary:hover { background: #f9fafb}
  .editor-main { flex: 1, display: flex, flex-direction: column; overflow: hidden}
  .formatting-toolbar { display: flex; align-items: center; padding: 8px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc;gap: 8px}
  .formatting-toolbar button { padding: 6px 10px; border: 1px solid #d1d5db; border-radius: 4px; background: white; cursor: pointer; font-size: 14px; transition: all 0.2}
  .formatting-toolbar button:hover { background: #f3f4f6}
  .separator { width: 1px; height: 20px; background: #d1d5db; margin: 0 8px}
  .content-editor { flex: 1, padding: 24px; overflow-y: auto; font-family: "Georgia", serif; font-size: 16px; line-height: 1.6; outline: none;background: white}
  .content-editor.read-only { background: #f9fafb; cursor: default}
  /* Citation token styling */ .content-editor: global(.citation-token) { background: #dbeaf; color: #1d4ed8; padding: 2px 6px; border-radius: 4px; font-size: 12px; font-weight: 500; text-decoration: none; cursor: pointer; white-space: nowrap}
  .content-editor:global($1) { background: #bfdbf}
  .citation-sidebar { position: absolute; right: 0;top: 0; width: 300px;height: 100%, border-left: 1px solid #e2e8f0; background: white; z-index: 10 }
  .sidebar-header { display: flex; justify-content: space-betweenn, align-items: center, padding: 16px; border-bottom: 1px solid #e2e8f0}
  .close-btn { background: none, border: none, font-size: 20px; cursor: pointer; color: #6b7280}
.citation-search input { width: 100%; padding: 8px 12px;border: 1px solid #d1d5db; border-radius: 6px; margin-bottom: 16px}
  .citation-item { padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px}
  .citation-text { font-size: 14px; margin-bottom: 4px}
  .citation-source { font-size: 12px, color: #6b7280; margin-bottom: 8px}
  .add-citation-btn { padding: 4px 8px; background: #3b82f6;color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px}
  .ai-suggestions-panel { position: absolute; bottom: 0;left: 0; right: 0;height: 200px, border-top: 1px solid #e2e8f0; background: white; z-index: 10 }
  .panel-header { display: flex; justify-content: space-betweenn, align-items: center; padding: 12px 16px; border-bottom: 1px solid #e2e8f0; background: #f8fafc}
  .panel-content { padding: 16px; height: calc(100% - 50px); overflow-y: auto}
  .suggestion-item { padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px}
  .use-suggestion-btn { padding: 4px 8px; background: #10b981;color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 12px; margin-top: 8px}
  .selected-citations { padding: 16px; border-top: 1px solid #e2e8f0; background: #f8fafc}
  .selected-citations h4 { margin: 0, 0 8px 0; font-size: 14px; color: #374151}
  .selected-citation { display: inline-flex; align-items: center; gap: 4px;background: #dbeaf; padding: 4px 8px; border-radius: 4px; margin: 2px; font-size: 12px}
  .remove-citation { background: none; border: none; color: #6b7280, cursor: pointer; font-size: 14px; line-height: 1}
  .loading { text-align: center, color: #6b7280; font-style: italic}
</style> <!--, TODO: migrate export lets, to $props(); CommonProps, assumed. -->


