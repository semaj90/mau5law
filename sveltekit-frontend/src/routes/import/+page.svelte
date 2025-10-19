<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { browser } from '$app/environment';
  import Tooltip from '$lib/components/ui/Tooltip.svelte';
  // Prefer the single canonical Button entry (keeps casing consistent)
  import Button from '$lib/components/ui/Button.svelte';
  import { notifications } from '$lib/stores/unified';
  import { AlertCircle, CheckCircle, Database, Download, Eye, FileText, Upload, Users, X } from 'lucide-svelte';
  // Import the new CollapsibleErrorSection component
  import CollapsibleErrorSection from '$lib/components/CollapsibleErrorSection.svelte';

  // Define a type for the Button component's props.
  // This is a local workaround to satisfy TypeScript in this file,
  // assuming the Button component itself accepts these props but its
  // type definitions are not correctly inferred or exported.
  type ButtonProps = {
    variant?: 'default' | 'ghost' | 'link' | 'primary' | 'secondary' | 'destructive' | 'outline';
    size?: 'default' | 'sm' | 'lg' | 'icon';
    disabled?: boolean;
    'aria-busy'?: boolean; // Added aria-busy to cover all used props
    // Add other common props if they are used and cause errors
    // e.g., type?: 'button' | 'submit' | 'reset';
    //       href?: string;
  };

  // Extend the default Svelte component type with our custom props.
  // This allows us to use the Button component directly with these props
  // without needing `svelte:component` or `as any` on each prop.
  // This is still a workaround for a potentially missing or incorrect type definition
  // in the Button.svelte component itself.
  type TypedButton = typeof Button & {
    new (...args: any[]): import('svelte').SvelteComponent<ButtonProps>;
  };

  // Cast the imported Button to our custom typed version.
  const ButtonComponent: TypedButton = Button as TypedButton;

  // Import state
  let importFile: File | null = $state(null);
  let importType = $state('all');
  let overwriteExisting = $state(false);
  let isImporting = $state(false);
  // importResults:
  // - results.errors: array of record-level errors (e.g., failed rows in CSV/JSON)
  // - error: top-level import error (e.g., file parse failure, server error)
  let importResults: {
    success: boolean;
    message: string;
    data?: unknown;
    results?: {
      imported: number;
      updated: number;
      skipped: number;
      errors: string[]; // Record-level errors (per row/record)
    };
    error?: string; // Top-level import error (whole operation failed)
  } | null = $state(null);
  type CsvPreview = { type: 'csv', data: string[] };
  type JsonPreview = { type: 'json', data: unknown };
  type XmlPreview = { type: 'xml', data: string };
  type BasePreview = { name: string; size: number; type: string; content?: string; raw?: string };
  let filePreview: (BasePreview & (CsvPreview | JsonPreview | XmlPreview)) | null = $state(null);
  let dragActive = $state(false);
  // File input reference
  let fileInput: HTMLInputElement = $state();
  // Supported file types
  const supportedTypes = [
    { value: 'all', label: 'Complete Export (All Data)', icon: Database },
    { value: 'cases', label: 'Cases Only', icon: FileText },
    { value: 'evidence', label: 'Evidence Only', icon: FileText },
    { value: 'participants', label: 'Participants Only', icon: Users },
  ];
  // Example data formats
  const exampleFormats = {
    cases: {
      json: `[
  {
    "id": "optional-existing-id",
    "title": "Case Title",
    "description": "Case description",
    "status": "active|closed|pending",
    "priority": "low|medium|high|urgent",
    "created_at": "2024-01-01T00:00:00Z"
  }
  ]`,
      csv: `title,description,status,priority
  "Fraud Investigation","Corporate fraud case","active","high"
  "Theft Case","Retail theft investigation","pending","medium"`,
    },
    evidence: {
      json: `[
  {
    "case_id": "case-uuid",
    "type": "document|photo|video|audio|other",
    "description": "Evidence description",
    "file_path": "optional-file-path",
    "metadata": {"key": "value"}
  }
  ]`,
      csv: `case_id,type,description,file_path
  "case-uuid","document","Contract document","/files/contract.pdf"
  "case-uuid","photo","Crime scene photo","/files/scene.jpg"`,
    },
  };
  $effect(() => {
    // Add drag and drop event listeners
    if (browser) {
      document.addEventListener('dragover', handleDragOver);
      document.addEventListener('drop', handleDrop);
      document.addEventListener('dragleave', handleDragLeave);
      return () => {
        document.removeEventListener('dragover', handleDragOver);
        document.removeEventListener('drop', handleDrop);
        document.removeEventListener('dragleave', handleDragLeave);
      };
    }
    return () => {}; // Return empty cleanup function if not in browser
  });
  function handleDragOver(e: DragEvent) {
    e.preventDefault();
    dragActive = true;
  }
  function handleDragLeave(e: DragEvent) {
    e.preventDefault();
    if (!e.relatedTarget) {
      dragActive = false;
    }
  }
  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragActive = false;
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  }
  function handleFileInput(e: Event) {
    const target = e.target as HTMLInputElement;
    const file = target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }
  async function handleFileSelect(file: File) {
    importFile = file;
    importResults = null;
    // Validate file type
    const validTypes = ['application/json', 'text/csv', 'application/xml', 'text/xml'];
    if (
      !validTypes.includes(file.type) &&
      !file.name.endsWith('.json') &&
      !file.name.endsWith('.csv') &&
      !file.name.endsWith('.xml')
    ) {
      pushNotificationPayload({
        type: 'error',
        title: 'Invalid File Type',
        message: 'Please select a JSON, CSV, or XML file',
      });
      importFile = null;
      return;
    }
    // Generate file preview
    try {
      const content = await file.text();
      if (file.type === 'application/json' || file.name.endsWith('.json')) {
        filePreview = {
          name: file.name,
          size: file.size,
          type: 'json',
          data: JSON.parse(content),
          raw: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        };
      } else if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        const lines = content.split('\n').map(line => line.trim()).filter(line => line);
        filePreview = {
          name: file.name,
          size: file.size,
          type: 'csv',
          data: lines,
          raw: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        };
      } else {
        filePreview = {
          name: file.name,
          size: file.size,
          type: 'xml',
          data: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
          raw: content.substring(0, 500) + (content.length > 500 ? '...' : ''),
        };
      }
    } catch (error) {
      pushNotificationPayload({
        type: 'error',
        title: 'Parse Error',
        message: 'Failed to parse file. Please check the format.',
      });
      importFile = null;
      filePreview = null;
    }
  }
  async function performImport() {
    if (!importFile) return;
    isImporting = true;
    importResults = null;
    try {
      const formData = new FormData();
      formData.append('file', importFile);
      formData.append('type', importType);
      formData.append('overwrite', overwriteExisting.toString());
      const response = await fetch('/api/import', {
        method: 'POST',
        body: formData,
      });
      const result = (await response.json()) as unknown;
      if (response.ok) {
        importResults = result as typeof importResults;
        pushNotificationPayload({
          type: 'success',
          message: 'Import completed successfully',
        });
      } else {
        // Safely extract possible error message from the response object
        let errorMsg = 'Import failed';
        if (result && typeof result === 'object') {
          const r = result as Record<string, any>;
          if (typeof r.error === 'string' && r.error.trim().length > 0) errorMsg = r.error;
          else if (typeof r.message === 'string' && r.message.trim().length > 0) errorMsg = r.message;
        }
        importResults = { success: false, message: errorMsg, error: errorMsg }; // Populate importResults for display
        pushNotificationPayload({
          type: 'error',
          title: 'Import Failed',
          message: errorMsg,
        });
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Import error:', error);
        pushNotificationPayload({
          type: 'error',
          title: 'Import Failed',
          message: error.message,
        });
        importResults = { success: false, message: error.message, error: error.message }; // Populate importResults for display
      } else {
        // Log unexpected error objects for diagnostics
        console.error('Import error (unexpected object):', error);
        const unexpectedErrorMsg = 'Import failed (unexpected error object).';
        pushNotificationPayload({
          type: 'error',
          title: 'Import Failed',
          message: unexpectedErrorMsg,
        });
        importResults = { success: false, message: unexpectedErrorMsg, error: unexpectedErrorMsg }; // Populate importResults for display
      }
    } finally {
      isImporting = false;
    }
  }
  function clearImport() {
    importFile = null;
    filePreview = null;
    importResults = null;
    if (fileInput) fileInput.value = '';
  }
  function downloadExampleTemplate(type: string, format: string) {
    const data = exampleFormats[type as keyof typeof exampleFormats];
    if (!data) return;
    const content = data[format as keyof typeof data];
    const blob = new Blob([content], {
      type: format === 'json' ? 'application/json' : 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `example-${type}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
  // --- Safe notification helper (added) ---
  type NotificationPayload = {
    type: 'success' | 'error' | 'info' | 'warning';
    title?: string;
    message?: string;
  };

  // Assuming the notifications store from '$lib/stores/unified' has an 'add' method
  // that accepts a payload with 'type', 'title', and 'message'.
  // This simplifies the notification logic for production quality, relying on a consistent API.
  function pushNotificationPayload(payload: NotificationPayload) {
    // Define a local type for the notifications store that includes the 'add' method.
    // This is a local type definition to satisfy TypeScript in this file.
    // The ideal fix would be to correctly type the 'notifications' store in '$lib/stores/unified.ts'.
    interface NotificationStoreWithAdd {
      subscribe: (run: (value: any) => void, invalidate?: () => void) => () => void;
      add: (payload: NotificationPayload) => void;
      // Add other methods if they are used and cause type errors, e.g.,
      // toggleDesktopNotification: () => void;
    }

    // Cast notifications to the interface that includes 'add'
    (notifications as unknown as NotificationStoreWithAdd).add({
      type: payload.type,
      title: payload.title,
      message: payload.message || 'An unexpected event occurred.', // Ensure message is always a string
    });
  }
</script>

<svelte:head>
  <title>Data Import - Legal Case Management</title>
  <meta name="description" content="Import cases, evidence, and participant data from JSON, CSV, or XML files" />
</svelte:head>
<div class="space-y-4">
  <!-- Header -->
  <div class="space-y-4">
    <h1>
      <Upload />
      Data Import
    </h1>
    <p>Import cases, evidence, and participant data from JSON, CSV, or XML files</p>
  </div>
  <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
    <!-- Main Import Panel -->
    <div class="md:col-span-2 space-y-4">
      <!-- File Upload Section -->
      <div class="space-y-4">
        <h2>
          <FileText />
          Select Import File
        </h2>
        <!-- Drag and Drop Area -->
        <div
          class="flex flex-col items-center justify-center p-6 border-2 border-dashed rounded-lg text-center transition-colors duration-200 min-h-[150px]"
          class:border-blue-400={dragActive}
          class:bg-blue-50={dragActive}
          class:border-gray-300={!dragActive}
        >
          {#if importFile}
            {@const currentFile = importFile} <!-- Explicitly narrow type for compiler -->
            <div class="flex items-center justify-between w-full p-2">
              <div class="flex items-center gap-2">
                <FileText class="h-5 w-5 text-gray-500" />
                <div>
                  <p class="font-medium">{currentFile.name}</p>
                  <p class="text-sm text-gray-500">
                    {(currentFile.size / 1024).toFixed(1)} KB • {currentFile.type || 'Unknown type'}
                  </p>
                </div>
              </div>
              <div class="flex gap-2">
                <Tooltip content="Preview file contents">
                  <ButtonComponent variant="ghost" size="sm" disabled={!filePreview}>
                    <Eye class="h-4 w-4" />
                    Preview
                  </ButtonComponent>
                </Tooltip>
                <Tooltip content="Remove selected file">
                  <ButtonComponent variant="ghost" size="sm" on:click={() => clearImport()}>
                    <X class="h-4 w-4" />
                    Remove
                  </ButtonComponent>
                </Tooltip>
              </div>
            </div>
          {:else}
            <div class="space-y-2">
              <Upload class="mx-auto h-8 w-8 text-gray-400" />
              <div>
                <p class="text-lg font-medium">Drop your file here</p>
                <p class="text-sm text-gray-500">or click to browse</p>
              </div>
              <ButtonComponent variant="ghost" on:click={() => fileInput?.click()}>Select File</ButtonComponent>
            </div>
          {/if}
        </div>
        <!-- Hidden file input -->
        <input
          bind:this={fileInput}
          type="file"
          accept=".json,.csv,.xml"
          onchange={handleFileInput}
          class="hidden"
          aria-label="Select import file"
        />
        <!-- Import Options -->
        {#if importFile}
          <div class="space-y-4 p-4 border rounded-lg">
            <div>
              <label for="import-type" class="block text-sm font-medium text-gray-700"> Import Type </label>
              <select id="import-type" bind:value={importType} class="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md">
                {#each supportedTypes as type}
                  <option value={type.value}>{type.label}</option>
                {/each}
              </select>
            </div>
            <div class="flex items-center gap-2">
              <input id="overwrite" type="checkbox" bind:checked={overwriteExisting} class="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded" />
              <label for="overwrite" class="text-sm font-medium text-gray-700"> Overwrite existing records with same ID </label>
              <Tooltip
                content="If enabled, existing records with matching IDs will be updated. Otherwise, they will be skipped."
              >
                <AlertCircle class="h-4 w-4 text-gray-400" />
              </Tooltip>
            </div>
          </div>
        {/if}
      </div>
      <!-- File Preview Section -->
      {#if filePreview}
        <div class="space-y-4 p-4 border rounded-lg">
          <h3>
            <Eye class="h-5 w-5" />
            File Preview
          </h3>
          {#if filePreview.type === 'json'}
            <div class="bg-gray-50 p-3 rounded-md overflow-auto max-h-60">
              <pre class="text-sm">{JSON.stringify(filePreview.data, null, 2)}</pre>
            </div>
          {:else if filePreview.type === 'csv'}
            <div class="bg-gray-50 p-3 rounded-md overflow-auto max-h-60">
              <table class="min-w-full divide-y divide-gray-200">
                <thead class="bg-gray-100">
                  <tr>
                    {#each (filePreview.data[0]?.split(',') ?? []) as header}
                      <th class="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {header.replace(/"/g, '')}
                      </th>
                    {/each}
                  </tr>
                </thead>
                <tbody class="bg-white divide-y divide-gray-200">
                  {#each (filePreview.data as string[]) as row, i}
                    {#if i > 0} <!-- Skip header row for data -->
                      <tr>
                        {#each row.split(',') as cell}
                          <td class="px-3 py-2 whitespace-nowrap text-sm text-gray-900">{cell.replace(/"/g, '')}</td>
                        {/each}
                      </tr>
                    {/if}
                  {/each}
                </tbody>
              </table>
            </div>
          {:else}
            <div class="bg-gray-50 p-3 rounded-md overflow-auto max-h-60">
              <pre class="text-sm">{filePreview.raw ?? ''}</pre>
            </div>
          {/if}
        </div>
      {/if}
      <!-- Import Results -->
      {#if importResults}
        <div class="space-y-4 p-4 border rounded-lg">
          <h3>
            {#if importResults.success}
              <CheckCircle class="h-5 w-5 text-green-500" />
            {:else}
              <AlertCircle class="h-5 w-5 text-red-500" />
            {/if}
            Import Results
          </h3>
          {#if importResults.success}
            <div class="grid grid-cols-3 gap-4 text-center">
              <div class="p-2 border border-indigo-200 shadow-sm rounded-md">
                <div class="text-2xl font-bold text-indigo-600">
                  {importResults.results?.imported ?? 0}
                </div>
                <div class="text-sm text-gray-500">Imported</div>
              </div>
              <div class="p-2 border border-blue-200 shadow-sm rounded-md">
                <div class="text-2xl font-bold text-blue-600">
                  {importResults.results?.updated ?? 0}
                </div>
                <div class="text-sm text-gray-500">Updated</div>
              </div>
              <div class="p-2 border border-gray-300 shadow-sm rounded-md">
                <div class="text-2xl font-bold text-gray-600">
                  {importResults.results?.skipped ?? 0}
                </div>
                <div class="text-sm text-gray-500">Skipped</div>
              </div>
            </div>
            {#if (importResults.results?.errors?.length ?? 0) > 0}
              <!-- @ts-ignore -->
              <CollapsibleErrorSection errors={importResults.results?.errors ?? []} />
            {/if}
            {#if importResults.error}
              <div class="text-red-600 text-sm">
                <p>{importResults.error}</p>
              </div>
            {/if}
          {:else if importResults.error}
            <div class="text-red-600 text-sm">
              <p>{importResults.error}</p>
            </div>
          {/if}
        </div>
      {/if}
      <!-- Action Buttons -->
      {#if importFile}
        <div class="flex gap-2 justify-end">
          <ButtonComponent on:click={() => performImport()} disabled={isImporting} aria-busy={isImporting}>
            {#if isImporting}
              <div class="i-lucide-loader-2 animate-spin mr-2"></div>
              Importing...
            {:else}
              <Upload class="h-4 w-4 mr-2" />
              Import Data
            {/if}
          </ButtonComponent>
          <Tooltip content="Clear current import and start over">
            <ButtonComponent variant="ghost" on:click={() => clearImport()}>
              <X class="h-4 w-4 mr-2" />
              Cancel
            </ButtonComponent>
          </Tooltip>
        </div>
      {/if}
    </div>
    <!-- Sidebar -->
    <div class="space-y-4">
      <!-- Example Templates -->
      <div class="space-y-4 p-4 border rounded-lg">
        <h3>
          <Download class="h-5 w-5" />
          Example Templates
        </h3>
        <div class="space-y-4">
          <div>
            <h4 class="font-medium">Cases</h4>
            <div class="flex gap-2 mt-2">
              <Tooltip content="Download JSON example for cases">
                <!-- @ts-ignore -->
                <ButtonComponent
                  variant="ghost"
                  size="sm"
                  on:click={() => downloadExampleTemplate('cases', 'json')}
                >
                  JSON
                </ButtonComponent>
              </Tooltip>
              <Tooltip content="Download CSV example for cases">
                <!-- @ts-ignore -->
                <ButtonComponent
                  variant="ghost"
                  size="sm"
                  on:click={() => downloadExampleTemplate('cases', 'csv')}
                >
                  CSV
                </ButtonComponent>
              </Tooltip>
            </div>
          </div>
          <div>
            <h4 class="font-medium">Evidence</h4>
            <div class="flex gap-2 mt-2">
              <Tooltip content="Download JSON example for evidence">
                <!-- @ts-ignore -->
                <ButtonComponent
                  variant="ghost"
                  size="sm"
                  on:click={() => downloadExampleTemplate('evidence', 'json')}
                >
                  JSON
                </ButtonComponent>
              </Tooltip>
              <Tooltip content="Download CSV example for evidence">
                <!-- @ts-ignore -->
                <ButtonComponent
                  variant="ghost"
                  size="sm"
                  on:click={() => downloadExampleTemplate('evidence', 'csv')}
                >
                  CSV
                </ButtonComponent>
              </Tooltip>
            </div>
          </div>
        </div>
      </div>
      <!-- Format Guidelines -->
      <div class="space-y-4 p-4 border rounded-lg">
        <h3>Import Guidelines</h3>
        <ul class="list-disc pl-5 space-y-2 text-sm text-gray-700">
          <li>• Use JSON for complex data with nested objects</li>
          <li>• Use CSV for simple tabular data</li>
          <li>• Include all required fields for each record</li>
          <li>• IDs are optional for new records</li>
          <li>• Dates should be in ISO 8601 format</li>
          <li>• Maximum file size: 10MB</li>
        </ul>
      </div>
      <!-- Quick Actions -->
      <div class="space-y-4 p-4 border rounded-lg">
        <h3>Quick Actions</h3>
        <div class="space-y-2">
          <!-- Replaced Button with <a> for navigation, applying button-like styles -->
          <a href="/export" class="flex items-center w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <Download class="h-4 w-4 mr-2" />
            Export Data
          </a>
          <a href="/cases" class="flex items-center w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <Database class="h-4 w-4 mr-2" />
            View Cases
          </a>
          <a href="/evidence" class="flex items-center w-full justify-start px-3 py-2 text-sm font-medium text-gray-700 rounded-md hover:bg-gray-100 transition-colors duration-200">
            <FileText class="h-4 w-4 mr-2" />
            View Evidence
          </a>
        </div>
      </div>
    </div>
  </div>
</div>

<style>
  /* Example UnoCSS drag and drop styles */
  /* border-blue-400, bg-blue-50, border-gray-300 are already used via class bindings above */
  /* Add any additional custom styles here if needed */
</style>





