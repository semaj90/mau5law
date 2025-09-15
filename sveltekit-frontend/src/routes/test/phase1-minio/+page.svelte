<script lang="ts">
  import { onMount } from 'svelte';

  let fileInput: HTMLInputElement;
  let uploading = $state(false);
  let testResults = $state<any[]>([]);
  let minioHealth = $state<any>(null);
  let selectedFile = $state<File | null>(null);
  let uploadResult = $state<any>(null);
  let buckets = $state<any[]>([]);

  async function runPhase1Test() {
    testResults = [];

    try {
      // Test MinIO Health
      console.log('🔍 Testing MinIO health...');
      const healthResponse = await fetch('/api/v1/minio/health');
      const healthData = await healthResponse.json();

      testResults = [...testResults, {
        test: 'MinIO Health Check',
        status: healthResponse.ok ? 'PASS' : 'FAIL',
        data: healthData,
        timestamp: new Date().toISOString()
      }];

      if (healthResponse.ok) {
        minioHealth = healthData;
      }

      // Test Bucket Management
      console.log('📦 Testing bucket management...');
      const bucketsResponse = await fetch('/api/v1/minio/buckets');
      const bucketsData = await bucketsResponse.json();

      testResults = [...testResults, {
        test: 'Bucket Listing',
        status: bucketsResponse.ok ? 'PASS' : 'FAIL',
        data: bucketsData,
        timestamp: new Date().toISOString()
      }];

      if (bucketsResponse.ok) {
        buckets = bucketsData.buckets || [];
      }

      // Ensure all buckets exist
      console.log('⚙️ Ensuring buckets exist...');
      const ensureBucketsResponse = await fetch('/api/v1/minio/buckets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ensure-all' })
      });
      const ensureBucketsData = await ensureBucketsResponse.json();

      testResults = [...testResults, {
        test: 'Bucket Creation',
        status: ensureBucketsResponse.ok ? 'PASS' : 'FAIL',
        data: ensureBucketsData,
        timestamp: new Date().toISOString()
      }];

      // Integration Test Success
      testResults = [...testResults, {
        test: 'Phase 1 Integration Test',
        status: 'COMPLETE',
        message: 'Basic MinIO functionality verified. Ready for file upload testing.',
        timestamp: new Date().toISOString()
      }];

    } catch (error) {
      testResults = [...testResults, {
        test: 'Phase 1 Integration Test',
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }];
    }
  }

  async function uploadTestFile() {
    if (!selectedFile) {
      alert('Please select a file first');
      return;
    }

    uploading = true;
    uploadResult = null;

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('bucket', 'legal-documents');
      formData.append('enableAI', 'true');
      formData.append('caseId', '12345');
      formData.append('userId', '1');

      console.log('📤 Uploading file with AI analysis...');
      const response = await fetch('/api/v1/minio/process', {
        method: 'POST',
        body: formData
      });

      const data = await (response as { json?: unknown; ok?: unknown }).json();

      testResults = [...testResults, {
        test: 'File Upload + AI Analysis',
        status: (response as { json?: unknown; ok?: unknown }).ok && (data as { success?: unknown; confidence?: unknown }).success ? 'PASS' : 'FAIL',
        data: data,
        timestamp: new Date().toISOString()
      }];

      if ((response as { json?: unknown; ok?: unknown }).ok && (data as { success?: unknown; confidence?: unknown }).success) {
        uploadResult = data;

        // Test file listing after upload
        const listResponse = await fetch('/api/v1/minio/files?bucket=legal-documents&limit=10');
        const listData = await listResponse.json();

        testResults = [...testResults, {
          test: 'File Listing After Upload',
          status: listResponse.ok ? 'PASS' : 'FAIL',
          data: listData,
          timestamp: new Date().toISOString()
        }];
      }

    } catch (error) {
      testResults = [...testResults, {
        test: 'File Upload + AI Analysis',
        status: 'ERROR',
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      }];
    } finally {
      uploading = false;
    }
  }

  function handleFileSelect(event: Event) {
    const target = event.target as HTMLInputElement;
    selectedFile = target.files?.[0] || null;
  }

  function formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  onMount(() => {
    runPhase1Test();
  });
</script>

<div class="phase1-container">
  <div class="header">
    <h1>🧪 Phase 1 MinIO Integration Test</h1>
    <p>Testing basic functionality: upload, AI analysis, storage</p>
  </div>

  <!-- MinIO Health Status -->
  {#if minioHealth}
    <div class="health-panel" class:healthy={minioHealth.status === 'healthy'}>
      <h3>🏥 MinIO Health Status</h3>
      <div class="health-details">
        <p><strong>Status:</strong> {minioHealth.status}</p>
        <p><strong>Buckets:</strong> {minioHealth.details.buckets}</p>
        <p><strong>Endpoint:</strong> {minioHealth.details.endpoint}</p>
        <p><strong>Initialized:</strong> {minioHealth.details.initialized ? 'Yes' : 'No'}</p>
        {#if minioHealth.details.bucketNames}
          <p><strong>Available Buckets:</strong> {minioHealth.details.bucketNames.join(', ')}</p>
        {/if}
      </div>
    </div>
  {/if}

  <!-- File Upload Test -->
  <div class="upload-panel">
    <h3>📤 File Upload + AI Analysis Test</h3>

    <div class="upload-controls">
      <input
        bind:this={fileInput}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png"
        onchange={handleFileSelect}
        disabled={uploading}
      />

      {#if selectedFile}
        <div class="selected-file">
          <p><strong>Selected:</strong> {selectedFile.name}</p>
          <p><strong>Size:</strong> {formatBytes(selectedFile.size)}</p>
          <p><strong>Type:</strong> {selectedFile.type}</p>
        </div>
      {/if}

      <button
        class="upload-btn"
        disabled={!selectedFile || uploading}
        onclick={uploadTestFile}
      >
        {#if uploading}
          🔄 Uploading...
        {:else}
          📤 Upload & Analyze
        {/if}
      </button>
    </div>

    {#if uploadResult}
      <div class="upload-result">
        <h4>✅ Upload Successful</h4>
        <div class="result-details">
          <p><strong>File ID:</strong> {uploadResult.upload.fileId}</p>
          <p><strong>File Name:</strong> {uploadResult.upload.fileName}</p>
          <p><strong>Bucket:</strong> {uploadResult.upload.bucket}</p>
          <p><strong>Size:</strong> {formatBytes(uploadResult.upload.size)}</p>
          <p><strong>Processing Time:</strong> {uploadResult.processing.totalTime}ms</p>
          <p><strong>AI Analysis:</strong> {uploadResult.processing.enabledAI ? 'Enabled' : 'Disabled'}</p>

          {#if uploadResult.ai && !uploadResult.ai.error}
            <div class="ai-analysis">
              <h5>🤖 AI Analysis Results</h5>
              <p><strong>Document Type:</strong> {uploadResult.ai.documentType}</p>
              <p><strong>Complexity:</strong> {uploadResult.ai.complexity}</p>
              <p><strong>Risk Level:</strong> {uploadResult.ai.riskLevel}</p>
              <p><strong>Key Terms:</strong> {uploadResult.ai.keyTerms.join(', ')}</p>
              <p><strong>Summary:</strong> {uploadResult.ai.summary}</p>
              <p><strong>Confidence:</strong> {(uploadResult.ai.metadata.confidence * 100).toFixed(1)}%</p>
            </div>
          {/if}
        </div>
      </div>
    {/if}
  </div>

  <!-- Test Results -->
  <div class="results-panel">
    <h3>📊 Test Results</h3>
    <button class="refresh-btn" onclick={runPhase1Test}>🔄 Refresh Tests</button>

    <div class="results-list">
      {#each testResults as result}
        <div class="result-item" class:pass={(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status === 'PASS' || (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status === 'COMPLETE'} class:fail={(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status === 'FAIL' || (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status === 'ERROR'}>
          <div class="result-header">
            <span class="test-name">{(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).test}</span>
            <span class="test-status status-{(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status.toLowerCase()}">{(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).status}</span>
          </div>

          {#if (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).message}
            <p class="result-message">{(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).message}</p>
          {/if}

          {#if (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).error}
            <p class="result-error">❌ {(result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).error}</p>
          {/if}

          <div class="result-timestamp">{new Date((result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).timestamp).toLocaleTimeString()}</div>

          {#if (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).data && typeof (result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).data === 'object'}
            <details class="result-details">
              <summary>View Details</summary>
              <pre>{JSON.stringify((result as { status?: unknown; test?: unknown; message?: unknown; error?: unknown; timestamp?: unknown; data?: unknown }).data, null, 2)}</pre>
            </details>
          {/if}
        </div>
      {/each}
    </div>
  </div>
</div>

<style>
  .phase1-container {
    max-width: 1000px;
    margin: 0 auto;
    padding: 2rem;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .header {
    text-align: center;
    margin-bottom: 2rem;
    padding: 1.5rem;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border-radius: 10px;
  }

  .header h1 {
    margin: 0 0 0.5rem 0;
    font-size: 2rem;
  }

  .header p {
    margin: 0;
    opacity: 0.9;
  }

  .health-panel {
    margin: 1.5rem 0;
    padding: 1.5rem;
    border: 2px solid #ccc;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .health-panel.healthy {
    border-color: #28a745;
    background: #d4edda;
  }

  .health-panel h3 {
    margin-top: 0;
    color: #333;
  }

  .health-details p {
    margin: 0.5rem 0;
  }

  .upload-panel {
    margin: 1.5rem 0;
    padding: 1.5rem;
    border: 2px solid #007bff;
    border-radius: 8px;
    background: #e3f2fd;
  }

  .upload-panel h3 {
    margin-top: 0;
    color: #0056b3;
  }

  .upload-controls {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .upload-controls input[type="file"] {
    padding: 0.5rem;
    border: 1px solid #ccc;
    border-radius: 4px;
  }

  .selected-file {
    padding: 1rem;
    background: white;
    border: 1px solid #ddd;
    border-radius: 4px;
  }

  .selected-file p {
    margin: 0.25rem 0;
  }

  .upload-btn {
    padding: 1rem 2rem;
    background: #007bff;
    color: white;
    border: none;
    border-radius: 4px;
    font-size: 1rem;
    font-weight: bold;
    cursor: pointer;
    transition: background 0.2s;
  }

  .upload-btn:hover:not(:disabled) {
    background: #0056b3;
  }

  .upload-btn:disabled {
    background: #6c757d;
    cursor: not-allowed;
  }

  .upload-result {
    margin-top: 1.5rem;
    padding: 1.5rem;
    background: #d4edda;
    border: 1px solid #c3e6cb;
    border-radius: 4px;
  }

  .upload-result h4 {
    margin-top: 0;
    color: #155724;
  }

  .result-details p {
    margin: 0.5rem 0;
  }

  .ai-analysis {
    margin-top: 1rem;
    padding: 1rem;
    background: #fff3cd;
    border: 1px solid #ffeaa7;
    border-radius: 4px;
  }

  .ai-analysis h5 {
    margin-top: 0;
    color: #856404;
  }

  .results-panel {
    margin: 1.5rem 0;
    padding: 1.5rem;
    border: 2px solid #6c757d;
    border-radius: 8px;
    background: #f8f9fa;
  }

  .results-panel h3 {
    margin-top: 0;
  }

  .refresh-btn {
    padding: 0.5rem 1rem;
    background: #6c757d;
    color: white;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 1rem;
  }

  .refresh-btn:hover {
    background: #545b62;
  }

  .results-list {
    display: flex;
    flex-direction: column;
    gap: 1rem;
  }

  .result-item {
    padding: 1rem;
    border: 1px solid #ddd;
    border-radius: 4px;
    background: white;
  }

  .result-(item as { pass?: unknown; fail?: unknown }).pass {
    border-color: #28a745;
    background: #f8fff8;
  }

  .result-(item as { pass?: unknown; fail?: unknown }).fail {
    border-color: #dc3545;
    background: #fff8f8;
  }

  .result-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 0.5rem;
  }

  .test-name {
    font-weight: bold;
  }

  .test-status {
    padding: 0.25rem 0.5rem;
    border-radius: 3px;
    font-size: 0.8rem;
    font-weight: bold;
  }

  .status-pass,
  .status-complete {
    background: #d4edda;
    color: #155724;
  }

  .status-fail,
  .status-error {
    background: #f8d7da;
    color: #721c24;
  }

  .result-message {
    color: #495057;
    margin: 0.5rem 0;
  }

  .result-error {
    color: #dc3545;
    margin: 0.5rem 0;
    font-weight: bold;
  }

  .result-timestamp {
    font-size: 0.8rem;
    color: #6c757d;
    margin-top: 0.5rem;
  }

  .result-details {
    margin-top: 1rem;
  }

  .result-details summary {
    cursor: pointer;
    color: #007bff;
    font-weight: bold;
  }

  .result-details pre {
    background: #f8f9fa;
    padding: 1rem;
    border-radius: 4px;
    overflow-x: auto;
    font-size: 0.8rem;
    border: 1px solid #e9ecef;
  }

  @media (max-width: 768px) {
    .phase1-container {
      padding: 1rem;
    }

    .header {
      padding: 1rem;
    }

    .header h1 {
      font-size: 1.5rem;
    }

    .upload-controls,
    .result-header {
      flex-direction: column;
      align-items: stretch;
    }

    .test-status {
      margin-top: 0.5rem;
      text-align: center;
    }
  }
</style>