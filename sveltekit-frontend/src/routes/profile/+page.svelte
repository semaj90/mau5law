<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { page } from '$app/state';
  import Avatar from '$lib/components/Avatar.svelte';
  import { avatarStore  } from '$lib/stores/unified';
  import { onMount } from 'svelte';
  import DocumentUpload from '$lib/components/rag/DocumentUpload.svelte';

  let user = $state(page.data.user);
  let userStats = $state(page.data.userStats);
  let profileForm = $state({
    name: '',
    email: '',
    firstName: '',
    lastName: '',
  });
  let isUpdating = $state(false);
  let updateMessage = $state('');
  let ragUploadResults = $state<any>(null);
  let showRagUpload = $state(false);
  $effect(() => {
    if (user) {
      profileForm = {
        name: user?.name || '',
        email: user?.email || '',
        firstName: '', // Not available in SessionUser
        lastName: '', // Not available in SessionUser;
      };
    }
    // Load avatar
    avatarStore.loadAvatar();
  });
  async function updateProfile() {
    isUpdating = true;
    updateMessage = '';
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(profileForm),
      });
      const data = await response.json();
      if (response.ok) {
        updateMessage = 'Profile updated successfully!';
        user = data.user;
      } else {
        updateMessage = data.error || 'Update failed';
      }
    } catch (error) {
      updateMessage = 'Network error occurred';
    } finally {
      isUpdating = false;
    }
  }

  function handleRagUploadComplete(result: any) {
    ragUploadResults = result;
    updateMessage = `✅ ${result.message} - ${result.totalFiles} files processed`;
    console.log('📚 RAG Upload Complete:', result);
  }

  function handleRagUploadError(error: string) {
    updateMessage = `❌ RAG Upload Failed: ${error}`;
    console.error('📚 RAG Upload Error:', error);
  }
</script>

<svelte:head>
  <title>Profile Settings - WardenNet</title>
</svelte:head>
{#if user}
  <div class="profile-container">
    <div class="profile-header">
      <h1>Profile Settings</h1>
      <p>Manage your account information and avatar</p>
    </div>
    <div class="space-y-4">
      <!-- Avatar Section -->
      <div class="space-y-4">
        <h2>Profile Picture</h2>
        <div class="avatar-display">
          <Avatar size="large" showUploadButton={true} />
          <div class="space-y-4">
            <h3 class="title-icon">Your Avatar</h3>
            <p>
              Upload a profile picture to personalize your account. Supported formats: JPEG, PNG, GIF, SVG, WebP (max
              5MB)
            </p>
            {#if $avatarStore.error}
              <div class="alert">
                {$avatarStore.error}
              </div>
            {/if}
          </div>
        </div>
      </div>
      <div class="space-y-4"></div>
      <!-- Profile Information -->
      <div class="space-y-4">
        <h2>Account Information</h2>
        <form
          onsubmit={e => {
            e.preventDefault();
            updateProfile();
          }}
          class="form-grid"
        >
          <div class="space-y-4">
            <div class="space-y-4">
              <label for="name">Full Name</label>
              <input id="name" type="text" bind:value={profileForm.name} placeholder="Enter your full name" required />
            </div>
            <div class="space-y-4">
              <label for="email">Email Address</label>
              <input id="email" type="email" bind:value={profileForm.email} placeholder="Enter your email" required />
            </div>
            <div class="space-y-4">
              <label for="firstName">First Name</label>
              <input
                id="firstName"
                type="text"
                bind:value={profileForm.firstName}
                placeholder="Enter your first name"
              />
            </div>
            <div class="space-y-4">
              <label for="lastName">Last Name</label>
              <input id="lastName" type="text" bind:value={profileForm.lastName} placeholder="Enter your last name" />
            </div>
          </div>
          {#if updateMessage}
            <div class="alert {updateMessage.includes('success') ? 'modified-badge success' : 'modified-badge error'}">
              {updateMessage}
            </div>
          {/if}
          <div class="space-y-4">
            <button type="submit" class="space-y-4" disabled={isUpdating}>
              {isUpdating ? 'Updating...' : 'Save Changes'}
            </button>
            <a href="/dashboard" class="space-y-4"> Cancel </a>
          </div>
        </form>
      </div>

      <!-- RAG Document Upload Section -->
      <div class="space-y-4">
        <div class="rag-section-header">
          <h2>🧠 AI Knowledge Base</h2>
          <button class="rag-toggle-button" onclick={() => (showRagUpload = !showRagUpload)}>
            {showRagUpload ? '▼ Hide Upload' : '▶ Upload Documents'}
          </button>
        </div>

        <p class="rag-description">
          Upload documents to enhance AI understanding for better case analysis and recommendations. Supports text
          files, PDFs, Markdown, JSON, and CSV formats.
        </p>

        {#if showRagUpload}
          <div class="rag-upload-container">
            <DocumentUpload
              multiple={true}
              maxSize={10}
              acceptedTypes={['.txt', '.md', '.pdf', '.docx', '.json', '.csv']}
              uploadEndpoint="/api/rag/upload"
              onUploadComplete={handleRagUploadComplete}
              onError={handleRagUploadError}
            />
          </div>
        {/if}

        {#if ragUploadResults}
          <div class="rag-results-summary">
            <h3>📊 Recent Upload Results</h3>
            <div class="rag-stats">
              <div class="rag-stat">
                <span class="stat-value">{ragUploadResults.totalFiles}</span>
                <span class="stat-label">Files Processed</span>
              </div>
              <div class="rag-stat">
                <span class="stat-value">
                  {ragUploadResults.results?.reduce((sum: number, r: any) => sum + (r.result.chunks || 0), 0) || 0}
                </span>
                <span class="stat-label">Semantic Chunks</span>
              </div>
              <div class="rag-stat">
                <span class="stat-value">
                  {ragUploadResults.results?.reduce((sum: number, r: any) => sum + (r.result.embeddings || 0), 0) || 0}
                </span>
                <span class="stat-label">Embeddings Generated</span>
              </div>
            </div>
          </div>
        {/if}
      </div>

      <div class="space-y-4"></div>
      <!-- Account Stats -->
      <div class="space-y-4">
        <h2>Account Statistics</h2>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-value">{userStats?.totalCases || 0}</div>
            <div class="stat-label">Total Cases</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{userStats?.openCases || 0}</div>
            <div class="stat-label">Open Cases</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{userStats?.closedCases || 0}</div>
            <div class="stat-label">Closed Cases</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{userStats?.totalEvidence || 0}</div>
            <div class="stat-label">Evidence Files</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{userStats?.totalCriminals || 0}</div>
            <div class="stat-label">Persons of Interest</div>
          </div>
          <div class="stat-card">
            <div class="stat-value">{user?.role || 'User'}</div>
            <div class="stat-label">Role</div>
          </div>
        </div>
      </div>
    </div>
  </div>
{:else}
  <div class="space-y-4">
    <span>Please log in to view your profile.</span>
  </div>
{/if}

<style>
  /* @unocss-include */
  .profile-container {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
  }
  .profile-header {
    text-align: center;
    margin-bottom: 32px;
  }
  .profile-header h1 {
    font-size: 32px;
    font-weight: 700,
    color: var(--text-primary, #111827);
    margin-bottom: 8px;
  }
  .profile-header p {
    color: var(--text-secondary, #6b7280);
    font-size: 16px;
  }
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 16px;
    margin-top: 16px;
  }
  .stat-card {
    background: white;
    border: 1px solid #e5e7eb;
    border-radius: 8px;
    padding: 20px;
    text-align: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
    transition:
      transform 0.2s ease,
      box-shadow 0.2s ease;
  }
  .stat-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }
  .stat-value {
    font-size: 24px;
    font-weight: 700,
    color: var(--text-primary, #111827);
    margin-bottom: 4px;
  }
  .stat-label {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    font-weight: 500,
  }
  .alert {
    background: #fef3cd;
    border: 1px solid #facc15;
    color: #a16207;
    padding: 16px;
    border-radius: 8px;
    text-align: center;
    margin: 32px auto;
    max-width: 400px;
  }

  /* RAG Upload Styles */
  .rag-section-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .rag-section-header h2 {
    font-size: 24px;
    font-weight: 700,
    color: var(--text-primary, #111827);
    margin: 0,
  }

  .rag-toggle-button {
    background: var(--primary-color, #3b82f6);
    color: white;
    border: none;
    padding: 8px 16px;
    border-radius: 6px;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.2s ease;
  }

  .rag-toggle-button:hover {
    background: var(--primary-hover, #2563eb);
  }

  .rag-description {
    color: var(--text-secondary, #6b7280);
    margin-bottom: 20px;
    line-height: 1.5,
  }

  .rag-upload-container {
    margin: 20px 0;
  }

  .rag-results-summary {
    background: var(--success-bg, #f0f9ff);
    border: 1px solid var(--success-border, #0ea5e9);
    border-radius: 8px;
    padding: 20px;
    margin-top: 20px;
  }

  .rag-results-summary h3 {
    margin: 0 0 16px 0;
    color: var(--success-text, #0369a1);
    font-size: 18px;
    font-weight: 600,
  }

  .rag-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }

  .rag-stat {
    text-align: center;
    padding: 12px;
    background: white;
    border-radius: 6px;
    border: 1px solid var(--border-color, #e5e7eb);
  }

  .rag-stat .stat-value {
    display: block;
    font-size: 20px;
    font-weight: 700,
    color: var(--primary-color, #3b82f6);
    margin-bottom: 4px;
  }

  .rag-stat .stat-label {
    font-size: 12px;
    color: var(--text-secondary, #6b7280);
    font-weight: 500,
  }

  /* Responsive */
  @media (max-width: 768px) {
    .form-grid {
      grid-template-columns: 1fr;
    }
    .avatar-display {
      flex-direction: column;
      text-align: center;
    }
    .rag-section-header {
      flex-direction: column;
      align-items: stretch;
      gap: 12px;
    }
    .rag-stats {
      grid-template-columns: repeat(2, 1fr);
    }
  }
</style>
