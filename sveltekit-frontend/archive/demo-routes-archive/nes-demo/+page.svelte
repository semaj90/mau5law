<script lang="ts">
  import 'nes.css/css/nes.min.css';
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte';
  import Dialog from '$lib/components/ui/enhanced-bits/Dialog.svelte';
  import Input from '$lib/components/ui/enhanced-bits/Input.svelte';
  import SearchInput from '$lib/components/ui/enhanced-bits/SearchInput.svelte';
  import Card from '$lib/components/ui/enhanced-bits/Card.svelte';

  let dialogOpen = $state(false);
  let searchValue = $state('');
  let inputValue = $state('');
  let checkboxValue = $state(false);
  let radioValue = $state('option1');

  function handleConfirm() {
    alert("Confirmed!");
    dialogOpen = false;
  }

  function handleCancel() {
    alert("Cancelled!");
    dialogOpen = false;
  }

  function handleSearch(query: string) {
    console.log('Searching for:', query);
  }
</script>

<svelte:head>
  <title>NES.css Enhanced-Bits Component Demo</title>
</svelte:head>

<div class="nes-container with-title is-centered">
  <h2 class="title">Enhanced-Bits NES.css Components</h2>
  <p class="nes-text">Legal AI Platform UI Components with NES.css styling</p>

  <!-- Buttons Section -->
  <section class="nes-container with-title is-dark mb-4">
    <h3 class="title">Buttons</h3>
    <div class="button-row">
      <Button
        variant="primary"
        nesStyle={true}
        onclick={() => alert("Primary Clicked")}
      >
        Primary
      </Button>

      <Button
        variant="success"
        nesStyle={true}
        onclick={() => alert("Success Clicked")}
      >
        Success
      </Button>

      <Button
        variant="warning"
        nesStyle={true}
        onclick={() => alert("Warning Clicked")}
      >
        Warning
      </Button>

      <Button
        variant="error"
        nesStyle={true}
        onclick={() => alert("Error Clicked")}
      >
        Error
      </Button>
    </div>

    <div class="button-row mt-2">
      <Button
        variant="legal"
        nesStyle={true}
        size="lg"
        onclick={() => alert("Legal AI Activated")}
      >
        Legal AI
      </Button>

      <Button
        variant="yorha"
        nesStyle={true}
        onclick={() => alert("YoRHa System Online")}
      >
        YoRHa
      </Button>
    </div>
  </section>

  <!-- Cards Section -->
  <section class="nes-container with-title mb-4">
    <h3 class="title">Cards & Containers</h3>

    <div class="cards-grid">
      <Card
        title="Legal Case #2024-001"
        nesStyle={true}
        variant="legal"
      >
        {#snippet children()}
          <p class="nes-text">Corporate fraud investigation involving multiple jurisdictions.</p>
          <div class="case-stats">
            <span class="nes-text is-primary">Status: Active</span>
            <span class="nes-text is-success">Evidence: 23 items</span>
          </div>
        {/snippet}
      </Card>

      <Card
        title="Evidence Analysis"
        nesStyle={true}
        variant="evidence"
      >
        {#snippet children()}
          <p class="nes-text">AI-powered document analysis results.</p>
          <div class="progress-bar">
            <progress class="nes-progress is-success" value="85" max="100"></progress>
            <span class="nes-text">85% Complete</span>
          </div>
        {/snippet}
      </Card>

      <Card
        title="System Metrics"
        nesStyle={true}
        variant="dark"
      >
        {#snippet children()}
          <div class="metrics">
            <div class="metric">
              <span class="nes-text is-warning">CPU:</span>
              <span class="nes-text">45%</span>
            </div>
            <div class="metric">
              <span class="nes-text is-error">Memory:</span>
              <span class="nes-text">78%</span>
            </div>
            <div class="metric">
              <span class="nes-text is-success">Uptime:</span>
              <span class="nes-text">99.8%</span>
            </div>
          </div>
        {/snippet}
      </Card>
    </div>
  </section>

  <!-- Inputs Section -->
  <section class="nes-container with-title mb-4">
    <h3 class="title">Form Inputs</h3>

    <div class="input-group mb-3">
      <label for="regular-input" class="nes-text">Regular Input:</label>
      <Input
        bind:value={inputValue}
        placeholder="Enter text here..."
        nesStyle={true}
        variant="default"
        id="regular-input"
      />
    </div>

    <div class="input-group mb-3">
      <label for="search-input" class="nes-text">Enhanced Search:</label>
      <SearchInput
        bind:value={searchValue}
        placeholder="Search cases, evidence, documents..."
        enableVectorSearch={true}
        enableAISearch={true}
        variant="legal"
        onsearch={handleSearch}
      />
    </div>

    <!-- NES.css Native Form Elements -->
    <div class="form-section">
      <label class="nes-text">
        <input type="checkbox" class="nes-checkbox" bind:checked={checkboxValue} />
        <span>Enable AI Analysis</span>
      </label>

      <div class="radio-group mt-2">
        <label class="nes-text">
          <input type="radio" class="nes-radio" name="priority" value="option1" bind:group={radioValue} />
          <span>High Priority</span>
        </label>
        <label class="nes-text">
          <input type="radio" class="nes-radio" name="priority" value="option2" bind:group={radioValue} />
          <span>Normal Priority</span>
        </label>
        <label class="nes-text">
          <input type="radio" class="nes-radio" name="priority" value="option3" bind:group={radioValue} />
          <span>Low Priority</span>
        </label>
      </div>
    </div>
  </section>

  <!-- Dialog Section -->
  <section class="nes-container with-title mb-4">
    <h3 class="title">Dialog Modal</h3>
    <Button
      variant="primary"
      nesStyle={true}
      onclick={() => dialogOpen = true}
    >
      Open Legal Dialog
    </Button>

    <Dialog
      bind:open={dialogOpen}
      legal={true}
      size="md"
    >
      {#snippet content()}
        <div class="nes-container">
          <h4 class="nes-text">Legal AI Confirmation</h4>
          <p class="nes-text">Do you want to proceed with the AI-powered case analysis?</p>
          <p class="nes-text is-warning">This action will process sensitive legal data.</p>

          <div class="dialog-actions mt-3">
            <Button variant="success" nesStyle={true} onclick={handleConfirm}>
              Confirm Analysis
            </Button>
            <Button variant="error" nesStyle={true} onclick={handleCancel}>
              Cancel
            </Button>
          </div>
        </div>
      {/snippet}
    </Dialog>
  </section>

  <!-- Avatars/Icons Section -->
  <section class="nes-container with-title mb-4">
    <h3 class="title">NES Characters & Icons</h3>
    <div class="avatar-row">
      <i class="nes-ash"></i>
      <i class="nes-pokeball"></i>
      <i class="nes-bulbasaur"></i>
      <i class="nes-charmander"></i>
      <i class="nes-squirtle"></i>
      <i class="nes-kirby"></i>
    </div>
  </section>

  <!-- System Status Section -->
  <section class="nes-container with-title is-dark mb-4">
    <h3 class="title">Legal AI System Status</h3>
    <div class="status-grid">
      <div class="status-item">
        <span class="nes-text">Search Value:</span>
        <span class="nes-text is-success">{searchValue || 'None'}</span>
      </div>
      <div class="status-item">
        <span class="nes-text">Input Value:</span>
        <span class="nes-text is-primary">{inputValue || 'Empty'}</span>
      </div>
      <div class="status-item">
        <span class="nes-text">AI Analysis:</span>
        <span class="nes-text {checkboxValue ? 'is-success' : 'is-error'}">
          {checkboxValue ? 'Enabled' : 'Disabled'}
        </span>
      </div>
      <div class="status-item">
        <span class="nes-text">Priority:</span>
        <span class="nes-text is-warning">{radioValue}</span>
      </div>
    </div>
  </section>
</div>

<style>
  .mb-4 {
    margin-bottom: 2rem;
  }

  .mb-3 {
    margin-bottom: 1.5rem;
  }

  .mt-2 {
    margin-top: 1rem;
  }

  .mt-3 {
    margin-top: 1.5rem;
  }

  .is-centered {
    text-align: center;
  }

  .button-row {
    display: flex;
    gap: 1rem;
    justify-content: center;
    flex-wrap: wrap;
    margin: 1rem 0;
  }

  .input-group {
    text-align: left;
    max-width: 500px;
    margin: 0 auto;
  }

  .form-section {
    text-align: left;
    max-width: 400px;
    margin: 0 auto;
  }

  .radio-group {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .avatar-row {
    display: flex;
    gap: 2rem;
    justify-content: center;
    align-items: center;
    margin: 1rem 0;
  }

  .avatar-row i {
    transform: scale(2);
  }

  .dialog-actions {
    display: flex;
    gap: 1rem;
    justify-content: center;
  }

  .status-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 1rem;
    text-align: left;
  }

  .status-item {
    display: flex;
    justify-content: space-between;
    padding: 0.5rem;
    background: rgba(0, 0, 0, 0.1);
    border-radius: 4px;
  }

  .cards-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
    margin: 1rem 0;
  }

  .case-stats {
    display: flex;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap;
  }

  .progress-bar {
    margin-top: 1rem;
  }

  .metrics {
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  .metric {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
</style>