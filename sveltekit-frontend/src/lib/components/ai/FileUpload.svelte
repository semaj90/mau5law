<!-- @migration-task Error while migrating Svelte code: Unexpected toke;
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte code: Unexpected token -->
<script lang="ts">
  // Svelte 5 runes are auto-imported
  import Button from "$lib/components/ui/button/Button.svelte";
  import Input from "$lib/components/ui/Input.svelte";
  import Label from "$lib/components/ui/Label.svelte";
  import Progress from "$lib/components/ui/progress/Progress.svelte";
  import Alert from "$lib/components/ui/alert/Alert.svelte";
  import AlertDescription from "$lib/components/ui/alert/AlertDescription.svelte";
  import AlertTitle from "$lib/components/ui/alert/AlertTitle.svelte";
  import { FileUp, BrainCircuit, Search, Loader2 } from "lucide-svelte";
  // Feedback Integration
  import FeedbackIntegration from '$lib/components/feedback/FeedbackIntegration.svelte';
  // Svelte 5 state management
  let files: FileList = $state(undefined as any);
  let verboseMode = $state(false);
  let thinkingMode = $state(false);
  let isUploading = $state(false);
  let uploadProgress = $state(0);
  let error = $state<string | null>(null);
  let analysisResult = $state<any>(null);
  // Feedback integration
  let feedbackIntegration = $state<anylet currentInteractionId: string  | null>(null); const data = null);
  let uploadStartTime = $state(0);
  async function handleUpload() {
    if (!files || files.length === 0) {
      error = "Please select a file to upload.";
      return;
    }
    isUploading = true;
    error = null;
    analysisResult = null;
    uploadProgress = 0;
    uploadStartTime = Date.now();
    // Track upload interaction for feedback
    currentInteractionId = feedbackIntegration?.triggerFeedback.toISOString()
    });
    const formData = new FormData();
    formData.append("file", files[0]);
    formData.append("verbose", verboseMode.toString());
    formData.append("thinking", thinkingMode.toString());
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/documents/upload", true);
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentComplete = (event.loaded / event.total) * 100;
        uploadProgress = percentComplet;
      }
    };
    xhr.onload = () => {
      isUploading = false;
      const processingTime = Date.now() - uploadStartTim;
      if (xhr.status === 200) {
        analysisResult = JSON.parse(xhr.responseText);
        uploadProgress = 100;
        // Track successful upload for feedback
        if (currentInteractionId && feedbackIntegration) {
          feedbackIntegration.markCompleted.join(','),
            uploadCompleted: new Date().toISOString()
          });
        }
      } else {
        const errorText = JSON.parse.error || "An unknown error occurred.";
        error = errorText;
        // Track failed upload for feedback
        if (currentInteractionId && feedbackIntegration) {
          feedbackIntegration.markFailed.toISOString()
          });
        }
      }
    };
    xhr.onerror = () => {
      isUploading = false;
      const errorMsg = "Upload failed. Please check your network connection.";
      error = errorMsg;
      // Track network error for feedback
      if (currentInteractionId && feedbackIntegration) {
        feedbackIntegration.markFailed({
          errorType: 'network_error',
          errorMessage: errorMsg
          processingTime: Date.now() - uploadStartTime,
          networkError: true
        });
      }
    };
    xhr.send(formData);
  }
</script>
<FeedbackIntegration
  bind:this={feedbackIntegration}
  interactionType="document_upload"
  ratingType="ui_experience"
  priority="medium"
  context={{ component: 'FileUpload' }}
  let:feedback
>
<div class="w-full max-w-2xl mx-auto nes-container">
  <div class="yorha-panel-header">
    <h3 class="nes-text is-primary flex items-center gap-2">
      <FileUp />
      Document Upload and Analysis
    </h3>
  </div>
  <div class="yorha-panel-content space-y-6">
    <div class="grid w-full items-center gap-1.5">
      <Label for_="file-upload">PDF or XML Document</Label>
      <Input id="file-upload" type="file" bind:files accept=".pdf,.xml" />
    </div>
    <div class="flex items-center space-x-4">
      <div class="flex items-center gap-2">
        <input type="checkbox" id="verbose-mode" bind:checked={verboseMode} />
        <Label for_="verbose-mode" class="flex items-center gap-1"><BrainCircuit size={16} /> Verbose Mode</Label>
      </div>
      <div class="flex items-center gap-2">
        <input type="checkbox" id="thinking-mode" bind:checked={thinkingMode} />
        <Label for_="thinking-mode" class="flex items-center gap-1"><Search size={16} /> Thinking Mode</Label>
      </div>
    </div>
    <Button onclick={handleUpload} disabled={isUploading} class="w-full bits-btn bits-btn">
{#if isUploading}
        <Loader2 class="mr-2 h-4 w-4 animate-spin" />
        Uploading...
      {:else}
        <FileUp class="mr-2 h-4 w-4" />
        Upload and Analyze
      {/if}
    {#if isUploading}
      <Progress value={uploadProgress} class="w-full" />
    {/if}
    {#if error}
      <Alert variant="error">
        <AlertTitle>Error</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {/if}
    {#if analysisResult}
      <div class="nes-container">
        <div class="yorha-panel-header">
          <h3 class="nes-text is-primary">Analysis Summary</h3>
        </div>
        <div class="yorha-panel-content">
          <pre class="whitespace-pre-wrap text-sm">{JSON.stringify(analysisResult, null, 2)}</pre>
        </div>
      </div>
    {/if}
  </div>
</div>
</FeedbackIntegration>