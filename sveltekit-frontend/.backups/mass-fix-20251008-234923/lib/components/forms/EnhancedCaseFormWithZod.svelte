<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<!--
  Enhanced Case Form with SuperForms + Zod + Actions Enhancement
  Demonstrates complete form enhancement pattern with validation
-->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { enhance } from '$app/forms';
  import { superForm } from 'sveltekit-superforms/client';
  import { zod } from 'sveltekit-superforms/adapters';
  import { z } from 'zod';
  import { writable } from 'svelte/store';
  import type { Writable } from 'svelte/store';
  import Button from '$lib/components/ui/Button.svelte';
  import { Label } from '$lib/components/ui/label';
  import { Textarea } from '$lib/components/ui/textarea';
  import { Checkbox } from '$lib/components/ui/checkbox';
  // Import Card component constructors (named exports — module has no default export)
  import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '$lib/components/ui/card';
  // Removed broken select module import. Using native <select> instead.
  import {
    AlertCircle,
    Loader2,
    Save,
    CheckCircle,
    Upload,
    FileText,
    Calendar,
    Users,
    Scale
  } from 'lucide-svelte';
  import { caseFormSchema, type CaseForm } from '$lib/schemas/forms';
  import { createCaseCreationForm } from '$lib/forms/superforms-xstate-integration';
  import type { SuperValidated } from 'sveltekit-superforms';
  // Svelte 5 Props Interface
  interface Props {
    data?: unknown; // SuperValidated<CaseForm>
    submitAction?: string;
    editMode?: boolean;
    enableAutoSave?: boolean;
    enableRealTimeValidation?: boolean;
    onsubmit?: (_event: { data: CaseForm }) => void;
    onsuccess?: (_event: { caseItem: unknown }) => void;
    onerror?: (_event: { message: string }) => void;
    ondraft?: (_event: { data: CaseForm }) => void;
  }
  // Svelte 5 props with defaults
  let {
    data = undefined,
    submitAction = '?/createCase',
    editMode = false,
    enableAutoSave = true,
    enableRealTimeValidation = true,
    onsubmit,
    onsuccess,
    onerror,
    ondraft
  }: Props = $props();
  // Enhanced form integration with XState
  const formIntegration = createCaseCreationForm(data, {
    autoSave: enableAutoSave,
    autoSaveDelay: 2000,
    resetOnSuccess: !editMode,
    onSubmit: async (formData) => {
      if (onsubmit) onsubmit({ data: formData as CaseForm });
    },
    onSuccess: (result) => {
      if (onsuccess) onsuccess({ caseItem: result });
    },
    // Replace onError to normalize unknown -> string
    onError: (error: unknown) => {
      const message = formatError(error);
      if (onerror) onerror({ message });
      componentError = new Error(message);
    }
  });
  const { form: rawForm, errors, enhance: formEnhance, submitting, message, delayed } = formIntegration.form;
  const form = rawForm as unknown as Writable<CaseForm>;
  // SuperForm may not expose isValid/isSubmitting/progress — derive locals instead
  // replace the invalid destructure:
  // const { isValid, isSubmitting, progress } = formIntegration.form;

  // local reactive values (Svelte 5 runes) — not Svelte stores
  let isValid = $state(true);
  let progress = $state(0);

  // keep validation in sync: consider the real-time validation status and errors
  $effect(() => {
    // if real-time validation is enabled use validationStatus
    if (enableRealTimeValidation) {
      isValid = validationStatus === 'valid';
    } else {
      // fallback: treat as valid when there are no reported errors
      isValid = Object.keys($errors || {}).length === 0;
    }
  });

  // animate a simple progress indicator while submitting
  $effect(() => {
    if ($submitting) {
      // start a lightweight progress animation
      progress = 5;
      const iv = setInterval(() => {
        if (progress < 90) progress = Math.min(90, progress + Math.random() * 12);
      }, 300);
      return () => clearInterval(iv);
    } else {
      // when submission ends, show completion briefly then reset
      if (progress > 0) {
        const to = setTimeout(() => {
          progress = 0;
        }, 600);
        return () => clearTimeout(to);
      }
    }
  });
  // Local state using Svelte 5 runes
  let showAdvanced = $state(false);
  let uploadedFiles = $state<File[]>([]);
  let validationStatus = $state<'idle' | 'validating' | 'valid' | 'invalid'>('idle');
  let componentError = $state<Error | null>(null);
  // Priority levels with colors
  const priorityLevels = [
    { value: 'low', label: 'Low Priority', color: 'text-green-600' },
    { value: 'medium', label: 'Medium Priority', color: 'text-yellow-600' },
    { value: 'high', label: 'High Priority', color: 'text-red-600' }
  ];
  // Status options
  const statusOptions = [
    { value: 'draft', label: 'Draft', description: 'Case is being prepared' },
    { value: 'active', label: 'Active', description: 'Case is under investigation' },
    { value: 'pending', label: 'Pending', description: 'Awaiting review or action' },
    { value: 'closed', label: 'Closed', description: 'Case is completed' }
  ];
  // Enhanced form validation with real-time feedback
  $effect(() => {
    if (enableRealTimeValidation && $form) {
      validationStatus = 'validating';
      const validationResult = caseFormSchema.safeParse($form);
      setTimeout(() => {
        validationStatus = validationResult.success ? 'valid' : 'invalid';
      }, 300);
    }
  });
  // Auto-save indicator
  let lastSaved = $state<Date | null>(null);
  let isAutoSaving = $state(false);
  // Enhanced file upload handler
  function handleFileUpload(event: Event) {
    const target = event.target as HTMLInputElement | null;
    if (target?.files) {
      uploadedFiles = [...uploadedFiles, ...Array.from(target.files)];
    }
  }
  // Remove uploaded file
  function removeFile(index: number) {
    uploadedFiles = uploadedFiles.filter((_, i) => i !== index);
  }
  // Format file size
  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
  // Enhanced form submission with progress tracking
  // Svelte Action: accept node so Svelte can call the action with the form element
  function createEnhancedSubmit(node?: HTMLFormElement) {
    // When Svelte calls the action it will pass the node; pass node along to enhance
    return enhance(node, ({ formData }) => {
      // Add uploaded files to form data
      uploadedFiles.forEach((file, index) => {
        formData.append(`attachments[${index}]`, file);
      });
      // Add metadata as a JSON string
      formData.append(
        'metadata',
        JSON.stringify({
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'server',
          validationStatus,
          autoSaved: lastSaved !== null
        })
      );

      return async ({ result, update }) => {
        if (result?.type === 'success') {
          if (onsuccess) onsuccess({ caseItem: result.data });
          if (!editMode) {
            uploadedFiles = [];
            lastSaved = null;
          }
        } else {
          // Safely construct an error message by narrowing on the discriminant 'type'
          let errorMsg = 'Submission failed';
          if (result?.type === 'error') {
            // result is narrowed to { type: 'error'; error: any }
            const err = result.error;
            errorMsg = err?.message ?? String(err) ?? errorMsg;
          } else if (result?.type === 'failure') {
            // result is narrowed to { type: 'failure'; data?: Record<string, unknown> }
            const data = result.data;
            // Prefer a 'message' property in data, otherwise stringify the payload
            if (data && typeof data === 'object' && 'message' in data) {
              // @ts-ignore - runtime check above ensures access is safe
              errorMsg = (data as any).message ?? JSON.stringify(data) ?? errorMsg;
            } else {
              errorMsg = JSON.stringify(data) ?? errorMsg;
            }
          } else if (result?.type === 'redirect') {
            // result is narrowed to { type: 'redirect'; location: string }
            // Provide a helpful message when a redirect occurs
            // @ts-ignore - access for runtime info
            errorMsg = `Redirected to ${(result as any).location}`;
          } else {
            // Fallback for unknown shapes
            try {
              errorMsg = JSON.stringify(result) || String(result) || errorMsg;
            } catch {
              errorMsg = String(result) || errorMsg;
            }
          }

          if (onerror) onerror({ message: errorMsg });
          componentError = new Error(errorMsg);
        }
        await update();
      };
    });
  }

  // Add a safe error formatter for unknown values
  function formatError(e: unknown): string {
    if (e instanceof Error) return e.message;
    if (typeof e === 'string') return e;
    try {
      return JSON.stringify(e) || String(e);
    } catch {
      return String(e);
    }
  }
</script>

{#if !componentError}
  <Card class="w-full max-w-4xl mx-auto">
    <CardHeader>
      <div class="flex items-center justify-between">
        <div class="flex items-center space-x-3">
          <Scale class="h-6 w-6 text-primary" />
          <div>
            <CardTitle class="text-xl">
              {editMode ? 'Edit Case' : 'Create New Case'}
            </CardTitle>
            <CardDescription>
              {editMode ? 'Update case information and evidence' : 'Enter case details and upload evidence'}
            </CardDescription>
          </div>
        </div>
        <!-- Progress indicator -->
        {#if progress > 0}
          <div class="flex items-center space-x-2">
            <div class="w-20 bg-gray-200 rounded-full h-2">
              <div class="bg-primary h-2 rounded-full transition-all duration-300" style="width: {progress}%"></div>
            </div>
            <span class="text-sm nes-text is-disabled">{Math.round(progress)}%</span>
          </div>
        {/if}
      </div>
    </CardHeader>
    <CardContent>
      <!-- Auto-save status -->
      {#if enableAutoSave && (lastSaved || isAutoSaving)}
        <div class="mb-4 p-3 bg-muted rounded-md flex items-center justify-between">
          <div class="flex items-center space-x-2">
            {#if isAutoSaving}
              <Loader2 class="h-4 w-4 animate-spin" />
              <span class="text-sm">Auto-saving...</span>
            {:else if lastSaved}
              <Save class="h-4 w-4 text-green-600" />
              <span class="text-sm">Last saved: {lastSaved.toLocaleTimeString()}</span>
            {/if}
          </div>
          <!-- Real-time validation status -->
          {#if enableRealTimeValidation}
            <div class="flex items-center space-x-2">
              {#if validationStatus === 'validating'}
                <Loader2 class="h-4 w-4 animate-spin text-yellow-600" />
                <span class="text-sm text-yellow-600">Validating...</span>
              {:else if validationStatus === 'valid'}
                <CheckCircle class="h-4 w-4 text-green-600" />
                <span class="text-sm text-green-600">Valid</span>
              {:else if validationStatus === 'invalid'}
                <AlertCircle class="h-4 w-4 text-red-600" />
                <span class="text-sm text-red-600">Issues found</span>
              {/if}
            </div>
          {/if}
        </div>
      {/if}
      <form
        method="POST"
        action={submitAction}
        use:createEnhancedSubmit
        enctype="multipart/form-data"
        class="space-y-6"
      >
        <!-- Basic Information -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
          <!-- Case Number -->
          <div class="space-y-2">
            <Label for="caseNumber" class="flex items-center space-x-2">
              <FileText class="h-4 w-4" />
              <span>Case Number *</span>
            </Label>
            <input
              id="caseNumber"
              name="caseNumber"
              placeholder="ABC-2024-123456"
              bind:value={$form.caseNumber}
              aria-invalid={$errors.caseNumber ? 'true' : undefined}
              class={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring ${$errors.caseNumber ? 'border-destructive' : ''}`}
            />
            {#if $errors.caseNumber}
              <p class="text-sm text-destructive flex items-center space-x-1">
                <AlertCircle class="h-3 w-3" />
                <span>{$errors.caseNumber[0]}</span>
              </p>
            {/if}
          </div>
          <!-- Priority -->
          <div class="space-y-2">
            <Label for="priority" class="flex items-center space-x-2">
              <AlertCircle class="h-4 w-4" />
              <span>Priority Level *</span>
            </Label>
            <select
              id="priority"
              name="priority"
              bind:value={$form.priority}
              class={$errors.priority ? 'border-destructive' : ''}
            >
              <option value="" disabled selected hidden>Select priority</option>
              {#each priorityLevels as priority}
                <option value={priority.value} class={priority.color}>{priority.label}</option>
              {/each}
            </select>
            {#if $errors.priority}
              <p class="text-sm text-destructive">{$errors.priority[0]}</p>
            {/if}
          </div>
        </div>
        <!-- Title -->
        <div class="space-y-2">
          <Label for="title">Case Title *</Label>
          <input
            id="title"
            name="title"
            placeholder="Enter a descriptive case title"
            bind:value={$form.title}
            aria-invalid={$errors.title ? 'true' : undefined}
            class={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring ${$errors.title ? 'border-destructive' : ''}`}
          />
          {#if $errors.title}
            <p class="text-sm text-destructive">{$errors.title[0]}</p>
          {/if}
        </div>
        <!-- Description -->
        <div class="space-y-2">
          <Label for="description">Description</Label>
          <textarea
            id="description"
            name="description"
            placeholder="Provide detailed case description (optional)"
            bind:value={$form.description}
            rows="4"
            aria-invalid={$errors.description ? 'true' : undefined}
            class={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring ${$errors.description ? 'border-destructive' : ''}`}
          ></textarea>
          {#if $errors.description}
            <p class="text-sm text-destructive">{$errors.description[0]}</p>
          {/if}
          <p class="text-sm nes-text is-disabled">
            {$form.description?.length || 0}/1000 characters
          </p>
        </div>
        <!-- Advanced Options -->
        <div class="border-t pt-6">
          <Button type="button" variant="ghost" onclick={() => (showAdvanced = !showAdvanced)} class="mb-4">
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </Button>
          {#if showAdvanced}
            <div class="space-y-6 border-l-2 border-muted pl-6">
              <!-- Status and Assignment -->
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <!-- Status -->
                <div class="space-y-2">
                  <Label for="status">Case Status</Label>
                  <select id="status" name="status" bind:value={$form.status}>
                    <option value="" disabled selected hidden>Select status</option>
                    {#each statusOptions as status}
                      <option value={status.value}>
                        {status.label} — {status.description}
                      </option>
                    {/each}
                  </select>
                </div>
                <!-- Due Date -->
                <div class="space-y-2">
                  <Label for="dueDate" class="flex items-center space-x-2">
                    <Calendar class="h-4 w-4" />
                    <span>Due Date</span>
                  </Label>
                  <input
                    id="dueDate"
                    name="dueDate"
                    type="datetime-local"
                    bind:value={$form.dueDate}
                    aria-invalid={$errors.dueDate ? 'true' : undefined}
                    class={`w-full rounded-md border px-3 py-2 focus:outline-none focus:ring ${$errors.dueDate ? 'border-destructive' : ''}`}
                  />
                  {#if $errors.dueDate}
                    <p class="text-sm text-destructive">{$errors.dueDate[0]}</p>
                  {/if}
                </div>
              </div>
              <!-- Tags -->
              <div class="space-y-2">
                <Label for="tags">Tags (max 10)</Label>
                <!-- use native input to avoid SvelteComponentTyped constructor/type mismatch -->
                <input
                  id="tags"
                  name="tags"
                  type="text"
                  placeholder="Enter tags separated by commas"
                  bind:value={$form.tags}
                  class="w-full rounded-md border px-3 py-2 focus:outline-none focus:ring"
                  aria-invalid={$errors.tags ? 'true' : undefined}
                />
                <p class="text-sm nes-text is-disabled">Use tags to categorize and organize cases</p>
              </div>
              <!-- Options -->
              <div class="flex flex-col space-y-3">
                <div class="flex items-center space-x-2">
                  <input id="isConfidential" name="isConfidential" type="checkbox" bind:checked={$form.isConfidential} class="h-4 w-4" />
                  <Label for="isConfidential">Mark as confidential</Label>
                </div>
                <div class="flex items-center space-x-2">
                  <input id="notifyAssignee" name="notifyAssignee" type="checkbox" bind:checked={$form.notifyAssignee} class="h-4 w-4" />
                  <Label for="notifyAssignee">Notify assignee when case is updated</Label>
                </div>
              </div>
            </div>
          {/if}
        </div>
        <!-- File Upload Section -->
        <div class="border-t pt-6">
          <div class="space-y-4">
            <div class="flex items-center space-x-2">
              <Upload class="h-5 w-5" />
              <Label class="text-base font-medium">Case Documents</Label>
            </div>
            <!-- File Upload Input -->
            <div class="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
              <div class="text-center">
                <Upload class="mx-auto h-12 w-12 nes-text is-disabled/50" />
                <div class="mt-4">
                  <Label for="file-upload" class="cursor-pointer">
                    <span class="text-sm font-medium text-primary">Upload files</span>
                    <input
                      id="file-upload"
                      type="file"
                      multiple
                      accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
                      onchange={handleFileUpload}
                      class="sr-only"
                    />
                  </Label>
                  <p class="text-sm nes-text is-disabled">or drag and drop</p>
                </div>
                <p class="text-xs nes-text is-disabled mt-2">PDF, DOC, DOCX, TXT, JPG, PNG up to 10MB each</p>
              </div>
            </div>
            <!-- Uploaded Files List -->
            {#if uploadedFiles.length > 0}
              <div class="space-y-2">
                <h4 class="text-sm font-medium">Uploaded Files ({uploadedFiles.length})</h4>
                <div class="space-y-2">
                  {#each uploadedFiles as file, index}
                    <div class="flex items-center justify-between p-3 bg-muted rounded-md">
                      <div class="flex items-center space-x-3">
                        <FileText class="h-4 w-4 nes-text is-disabled" />
                        <div>
                          <p class="text-sm font-medium">{file.name}</p>
                          <p class="text-xs nes-text is-disabled">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      <Button type="button" variant="ghost" size="sm" onclick={() => removeFile(index)}>Remove</Button>
                    </div>
                  {/each}
                </div>
              </div>
            {/if}
          </div>
        </div>
        <!-- Form Actions -->
        <div class="flex items-center justify-between pt-6 border-t">
          <div class="flex items-center space-x-4">
            {#if enableAutoSave && !editMode}
              <Button
                type="button"
                variant="ghost"
                onclick={() => {
                  if (ondraft) ondraft({ data: $form });
                }}
              >
                Save as Draft
              </Button>
            {/if}
          </div>
          <div class="flex items-center space-x-3">
            <Button type="button" variant="ghost">Cancel</Button>
            <Button type="submit" disabled={$submitting || !isValid} class="min-w-[120px]">
              {#if $submitting}
                <Loader2 class="mr-2 h-4 w-4 animate-spin" />
                {editMode ? 'Updating...' : 'Creating...'}
              {:else}
                {editMode ? 'Update Case' : 'Create Case'}
              {/if}
            </Button>
          </div>
        </div>
      </form>
    </CardContent>
  </Card>
{/if}
{#if componentError}
  <div class="error-boundary bg-red-50 border border-red-200 rounded-lg p-6 m-4">
    <h2 class="text-lg font-semibold text-red-800 mb-2">Form Error</h2>
    <p class="text-red-700 mb-4">The case form encountered an error:</p>
    <p class="text-red-600 font-mono text-sm mb-4 bg-red-100 p-2 rounded">{componentError.message}</p>
    <Button
      onclick={() => {
        componentError = null;
      }}
      variant="ghost"
      class="border-red-300 text-red-700 hover:bg-red-50"
    >
      Dismiss Error
    </Button>
  </div>
{/if}

<style lang="postcss">
  /*$$__STYLE_CONTENT__$$*/
</style>