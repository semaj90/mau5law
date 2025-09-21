<!-- MinIO Integration Test Page -->
<script lang="ts">
  interface UploadResult {
    success: boolean;
    document_id: string;
    object_path: string;
    size: number;
    content_type: string;
    uploaded_at: string;
    etag?: string;
    error?: string;
  }

  let files: FileList | null = $state(null);
  let dragOver = $state(false);
  let uploading = $state(false);
  let uploadProgress = $state(0);
  let uploadResult: UploadResult | null = $state(null);
  let error = $state('');
  let healthStatus: any = $state(null);
  let objectList: any = $state(null);
  let fileInput: HTMLInputElement;

  // Health check
  async function checkHealth() {
    try {
      const response = await fetch('/api/minio/health');
      healthStatus = await response.json();
      error = '';
    } catch (err) {
      error = `Health check failed: ${err}`;
      healthStatus = null;
    }
  }

  // List objects
  async function listObjects() {
    try {
      const response = await fetch('/api/minio/list');
      objectList = await response.json();
      error = '';
    } catch (err) {
      error = `List failed: ${err}`;
      objectList = null;
    }
  }

  // File upload
  async function handleUpload() {
    if (!files || files.length === 0) {
      error = 'Please select a file first';
      return;
    }

    uploading = true;
    uploadProgress = 0;
    error = '';
    uploadResult = null;

    try {
      const formData = new FormData();
      formData.append('document', files[0]);
      formData.append('case_id', 'test-case-' + Date.now());
      formData.append('document_type', 'test');
      formData.append('priority', '128');

      // Simulate progress
      const progressInterval = setInterval(() => {
        if (uploadProgress < 90) {
          uploadProgress += Math.random() * 10;
        }
      }, 100);

      const response = await fetch('/api/minio/upload', {
        method: 'POST',
        body: formData
      });

      clearInterval(progressInterval);
      uploadProgress = 100;

      const result = await response.json();

      if (response.ok && result.success) {
        uploadResult = result;
        files = null; // Clear selection
      } else {
        error = result.error || 'Upload failed';
      }
    } catch (err) {
      error = `Upload failed: ${err}`;
    } finally {
      uploading = false;
      uploadProgress = 0;
    }
  }

  // Drag and drop handlers
  function handleDrop(event: DragEvent) {
    event.preventDefault();
    dragOver = false;
    files = event.dataTransfer?.files || null;
  }

  function handleDragOver(event: DragEvent) {
    event.preventDefault();
    dragOver = true;
  }

  function handleDragLeave() {
    dragOver = false;
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    files = target.files;
  }

  function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Auto-check health on mount
  checkHealth();
</script>

<div class="test-container">
  <h1>MinIO Integration Test</h1>

  <!-- Health Check Section -->
  <section class="test-section">
    <h2>Health Check</h2>
    <button onclick={checkHealth} class="test-button">Check MinIO Health</button>

    {#if healthStatus}
      <div class="status-display success">
        <h3>✅ MinIO Status: {healthStatus.status}</h3>
        <div class="status-details">
          <p><strong>Endpoint:</strong> {healthStatus.endpoint}</p>
          <p><strong>Bucket:</strong> {healthStatus.bucket?.name}</p>
          <p><strong>Bucket Exists:</strong> {healthStatus.bucket?.exists ? 'Yes' : 'No'}</p>
          <p><strong>Object Count:</strong> {healthStatus.bucket?.objectCount}</p>
          <p><strong>Timestamp:</strong> {new Date(healthStatus.timestamp).toLocaleString()}</p>
        </div>
      </div>
    {/if}
  </section>

  <!-- File Upload Section -->
  <section class="test-section">
    <h2>File Upload Test</h2>

    <div
      class="upload-zone"
      class:drag-over={dragOver}
      class:has-files={files && files.length > 0}
      ondrop={handleDrop}
      ondragover={handleDragOver}
      ondragleave={handleDragLeave}
    >
      <input
        type="file"
        onchange={handleFileSelect}
        style="display: none"
        bind:this={fileInput}
      />

      {#if files && files.length > 0}
        <div class="file-info">
          <p><strong>Selected:</strong> {files[0].name}</p>
          <p><strong>Size:</strong> {formatFileSize(files[0].size)}</p>
          <p><strong>Type:</strong> {files[0].type}</p>
        </div>
      {:else}
        <div class="upload-prompt">
          <p>Drag and drop a file here, or <button onclick={() => fileInput.click()}>browse</button></p>
          <p class="hint">Supports PDF, Word, images, and text files</p>
        </div>
      {/if}
    </div>

    {#if uploading}
      <div class="progress-bar">
        <div class="progress-fill" style="width: {uploadProgress}%"></div>
        <p>Uploading... {Math.round(uploadProgress)}%</p>
      </div>
    {/if}

    <div class="upload-actions">
      <button
        onclick={handleUpload}
        disabled={!files || files.length === 0 || uploading}
        class="test-button primary"
      >
        {uploading ? 'Uploading...' : 'Upload to MinIO'}
      </button>

      {#if files}
        <button onclick={() => files = null} class="test-button secondary">
          Clear Selection
        </button>
      {/if}
    </div>

    {#if uploadResult}
      <div class="status-display success">
        <h3>✅ Upload Successful!</h3>
        <div class="status-details">
          <p><strong>Document ID:</strong> {uploadResult.document_id}</p>
          <p><strong>Object Path:</strong> {uploadResult.object_path}</p>
          <p><strong>Size:</strong> {formatFileSize(uploadResult.size)}</p>
          <p><strong>Content Type:</strong> {uploadResult.content_type}</p>
          <p><strong>ETag:</strong> {uploadResult.etag}</p>
          <p><strong>Uploaded At:</strong> {new Date(uploadResult.uploaded_at).toLocaleString()}</p>
        </div>
      </div>
    {/if}
  </section>

  <!-- List Objects Section -->
  <section class="test-section">
    <h2>Object List</h2>
    <button onclick={listObjects} class="test-button">List MinIO Objects</button>

    {#if objectList}
      <div class="status-display">
        <h3>📁 Objects in bucket: {objectList.bucket}</h3>
        <p><strong>Total Objects:</strong> {objectList.totalObjects}</p>

        {#if objectList.objects && objectList.objects.length > 0}
          <div class="object-list">
            {#each objectList.objects as obj}
              <div class="object-item">
                <div class="object-name">{obj.name}</div>
                <div class="object-details">
                  <span>Size: {formatFileSize(obj.size)}</span>
                  <span>Modified: {new Date(obj.lastModified).toLocaleDateString()}</span>
                </div>
              </div>
            {/each}
          </div>
        {:else}
          <p>No objects found in bucket</p>
        {/if}
      </div>
    {/if}
  </section>

  <!-- Error Display -->
  {#if error}
    <div class="status-display error">
      <h3>❌ Error</h3>
      <p>{error}</p>
    </div>
  {/if}
</div>

<style>
  .test-container {
    max-width: 800px;
    margin: 2rem auto;
    padding: 2rem;
    font-family: system-ui, sans-serif;
  }

  .test-section {
    margin-bottom: 3rem;
    padding: 1.5rem;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    background: #f8fafc;
  }

  .test-section h2 {
    margin-top: 0;
    margin-bottom: 1rem;
    color: #1a365d;
  }

  .test-button {
    padding: 0.75rem 1.5rem;
    border: 1px solid #cbd5e0;
    border-radius: 6px;
    background: white;
    color: #2d3748;
    cursor: pointer;
    font-size: 0.875rem;
    font-weight: 500;
    transition: all 0.2s;
  }

  .test-button:hover {
    background: #f7fafc;
    border-color: #a0aec0;
  }

  .test-button.primary {
    background: #3182ce;
    color: white;
    border-color: #3182ce;
  }

  .test-button.primary:hover:not(:disabled) {
    background: #2c5282;
  }

  .test-button.secondary {
    background: #e2e8f0;
    color: #4a5568;
  }

  .test-button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
  }

  .upload-zone {
    border: 2px dashed #cbd5e0;
    border-radius: 8px;
    padding: 2rem;
    text-align: center;
    margin: 1rem 0;
    cursor: pointer;
    transition: all 0.2s;
  }

  .upload-zone:hover,
  .upload-zone.drag-over {
    border-color: #3182ce;
    background: #ebf8ff;
  }

  .upload-zone.has-files {
    border-style: solid;
    border-color: #38a169;
    background: #f0fff4;
  }

  .upload-prompt button {
    color: #3182ce;
    text-decoration: underline;
    background: none;
    border: none;
    cursor: pointer;
  }

  .hint {
    font-size: 0.875rem;
    color: #718096;
    margin-top: 0.5rem;
  }

  .file-info {
    text-align: left;
  }

  .upload-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
  }

  .progress-bar {
    margin: 1rem 0;
  }

  .progress-fill {
    height: 8px;
    background: #3182ce;
    border-radius: 4px;
    transition: width 0.3s ease;
  }

  .progress-bar p {
    text-align: center;
    margin-top: 0.5rem;
    font-size: 0.875rem;
    color: #4a5568;
  }

  .status-display {
    margin-top: 1rem;
    padding: 1rem;
    border-radius: 6px;
    border: 1px solid #e2e8f0;
    background: white;
  }

  .status-display.success {
    border-color: #38a169;
    background: #f0fff4;
  }

  .status-display.error {
    border-color: #e53e3e;
    background: #fed7d7;
  }

  .status-display h3 {
    margin-top: 0;
    margin-bottom: 1rem;
  }

  .status-details p {
    margin: 0.5rem 0;
    font-size: 0.875rem;
  }

  .object-list {
    margin-top: 1rem;
  }

  .object-item {
    padding: 0.75rem;
    border: 1px solid #e2e8f0;
    border-radius: 4px;
    margin-bottom: 0.5rem;
    background: white;
  }

  .object-name {
    font-weight: 600;
    margin-bottom: 0.25rem;
  }

  .object-details {
    font-size: 0.875rem;
    color: #718096;
  }

  .object-details span {
    margin-right: 1rem;
  }
</style>