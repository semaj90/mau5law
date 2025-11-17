<script lang="ts">
  import { invalidateAll } from '$app // TODO: Verify store subscription is correct for Svelte 5/navigation';

  type IncidentForm = {
    victimName: string;
    reporterEmail: string;
    dateTime: string;
    location: string;
    narrative: string;
    suspectDescription: string;
    immediateNeeds: string;
  };

  const form = $state // TODO: Verify store subscription is correct for Svelte 5<IncidentForm>({
    victimName: '',
    reporterEmail: '',
    dateTime: '',
    location: '',
    narrative: '',
    suspectDescription: '',
    immediateNeeds: ''
  });

  let currentStep = $state // TODO: Verify store subscription is correct for Svelte 5(1);
  let isSubmitting = $state // TODO: Verify store subscription is correct for Svelte 5(false);
  let aiOutput = $state // TODO: Verify store subscription is correct for Svelte 5<string | null>(null);
  let errorMessage = $state // TODO: Verify store subscription is correct for Svelte 5<string | null>(null);

  const steps = [
    { id: 1, title: 'Victim & Reporter' },
    { id: 2, title: 'Incident Details' },
    { id: 3, title: 'Needs & Submit' }
  ];

  function nextStep() {
    if (currentStep < steps.length) currentStep += 1;
  }

  function prevStep() {
    if (currentStep > 1) currentStep -= 1;
  }

  async function submitStatement() {
    if (!form.narrative.trim()) {
      errorMessage = 'Narrative is required before submitting.';
      return;
    }
    errorMessage = null;
    isSubmitting = true;
    aiOutput = null;

    try {
      const res = await fetch('/api/victims/statement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          narrative: form.narrative,
          incident: {
            dateTime: form.dateTime,
            location: form.location
          },
          suspect: {
            description: form.suspectDescription ?? ''
          },
          wishes: form.immediateNeeds
        })
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error ?? 'Failed to generate statement');
      }

      aiOutput = data.result;
      await invalidateAll();
    } catch (error) {
      console.error(error);
      errorMessage = 'Unable to refine statement right now.';
    } finally {
      isSubmitting = false;
    }
  }
</script>

<section class="page-wrapper">
  <header class="nes-container is-dark header">
    <div>
      <p class="title">Victim Statement Wizard</p>
      <p class="muted">Guided intake + Phoenix refinement</p>
    </div>
    <div class="stepper">
      {#each steps as stepObj}
        <div class={`step ${currentStep === stepObj.id ? 'active' : ''}`}>
          <span>{stepObj.id}</span>
          <p>{stepObj.title}</p>
        </div>
      {/each}
    </div>
  </header>

  <div class="form-container nes-container is-dark">
    {#if currentStep === 1}
      <div class="form-grid">
        <label class="field">
          <span>Victim Name (optional)</span>
          <input class="nes-input" bind:value={form.victimName} placeholder="Jane Doe" />
        </label>

        <label class="field">
          <span>Reporter Email</span>
          <input
            class="nes-input"
            type="email"
            bind:value={form.reporterEmail}
            placeholder="assistant@district.attorney"
          />
        </label>
      </div>

      <div class="actions">
        <button class="nes-btn is-primary" onclick={nextStep}>Next</button>
      </div>
    {/if}

    {#if currentStep === 2}
      <div class="form-grid">
        <label class="field">
          <span>Incident Date & Time</span>
          <input class="nes-input" type="datetime-local" bind:value={form.dateTime} />
        </label>

        <label class="field">
          <span>Incident Location</span>
          <input class="nes-input" bind:value={form.location} placeholder="123 Market St." />
        </label>
      </div>

      <label class="field">
        <span>Victim Narrative</span>
        <textarea
          class="nes-textarea"
          rows="6"
          bind:value={form.narrative}
          placeholder="Describe what happened in the victim's own words."
        ></textarea>
      </label>

      <div class="actions">
        <button class="nes-btn" onclick={prevStep}>Back</button>
        <button class="nes-btn is-primary" onclick={nextStep}>Next</button>
      </div>
    {/if}

    {#if currentStep === 3}
      <label class="field">
        <span>Suspect Description</span>
        <textarea
          class="nes-textarea"
          rows="4"
          bind:value={form.suspectDescription}
          placeholder="Physical description, relationships, known history..."
        ></textarea>
      </label>

      <label class="field">
        <span>Immediate Needs / Safety Concerns</span>
        <textarea
          class="nes-textarea"
          rows="3"
          bind:value={form.immediateNeeds}
          placeholder="Medical, shelter, protective orders, counseling, interpreter..."
        ></textarea>
      </label>

      {#if errorMessage}
        <p class="error-text">{errorMessage}</p>
      {/if}

      <div class="actions">
        <button class="nes-btn" onclick={prevStep}>Back</button>
        <button class="nes-btn is-success" disabled={isSubmitting} onclick={submitStatement}>
          {isSubmitting ? 'Generating…' : 'Generate Statement'}
        </button>
      </div>
    {/if}
  </div>

  {#if aiOutput}
    <section class="nes-container is-dark output-panel">
      <header>
        <p class="title">Phoenix-Pro Statement</p>
        <p class="muted">Structured result from Gemma3-Legal</p>
      </header>
      <pre>{aiOutput}</pre>
    </section>
  {/if}
</section>

<style>
  .page-wrapper {
    min-height: 100vh;
    padding: 1.5rem;
    display: flex;
    flex-direction: column;
    gap: 1.5rem;
    background: radial-gradient(circle at top, #0f172a, #020617);
    color: #f8fafc;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }

  .muted {
    color: #94a3b8;
    margin: 0;
  }

  .form-container {
    padding: 1.5rem;
    border-radius: 1rem;
    border: 1px solid rgba(103, 232, 249, 0.2);
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 1rem;
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: 0.4rem;
  }

  .actions {
    margin-top: 1.5rem;
    display: flex;
    justify-content: flex-end;
    gap: 0.75rem;
  }

  .stepper {
    display: flex;
    gap: 1rem;
  }

  .step {
    text-align: center;
    opacity: 0.5;
  }

  .step.active {
    opacity: 1;
  }

  .step span {
    display: inline-flex;
    width: 2rem;
    height: 2rem;
    align-items: center;
    justify-content: center;
    border-radius: 9999px;
    border: 1px solid rgba(103, 232, 249, 0.6);
  }

  .output-panel pre {
    max-height: 360px;
    overflow-y: auto;
    background: rgba(15, 23, 42, 0.85);
    padding: 1rem;
    border-radius: 0.75rem;
    color: #f1f5f9;
  }

  .error-text {
    color: #f87171;
    margin: 0.5rem 0;
  }

  @media (max-width: 720px) {
    .header {
      flex-direction: column;
      gap: 1rem;
      align-items: flex-start;
    }

    .actions {
      flex-direction: column;
      align-items: stretch;
    }
  }
</style>
