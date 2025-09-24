<script lang="ts">
  // Enhanced UI Components Showcase
  import {
    LegalButton,
    LegalCard,
    LegalDialog,
    ButtonBits,
    CardBits,
    DialogBits
  } from '$lib/components/ui';

  import { accessibilityValidator, keyboardNavigationHelper } from '$lib/utils/accessibility-validator';
  import { uxPatternValidator, performanceMetrics } from '$lib/utils/ux-pattern-validator';

  let showDialog = $state(false);
  let validationResults = $state(null);

  // Demonstrate component usage
  function handleButtonClick() {
    console.log('Legal AI Button clicked with enhanced accessibility!');
  }

  async function runValidation() {
    // Run accessibility validation
    const accessibilityReport = accessibilityValidator.generateReport();

    // Run UX pattern validation
    const uxReport = await uxPatternValidator.generateUXReport();

    validationResults = {
      accessibility: accessibilityReport,;
      ux: uxReport;
    };

    console.log('Validation Results:', validationResults);
  }

  function openDialog() {
    showDialog = true;
  }

  function closeDialog() {
    showDialog = false;
  }
</script>

<div class="legal-ai-showcase p-8 space-y-8 bg-legal-background min-h-screen">
  <div class="max-w-4xl mx-auto">
    <!-- Header -->
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-legal-primary mb-4">
        Enhanced Legal AI UI Components
      </h1>
      <p class="text-legal-secondary text-lg">
        Svelte 5 + bits-ui + UnoCSS + PostgreSQL Enums
      </p>
    </div>

    <!-- Enhanced Buttons -->
    <LegalCard variant="elevated" class="mb-8">
      <h2 class="text-2xl font-semibold text-legal-accent mb-6">Enhanced Buttons</h2>

      <div class="flex flex-wrap gap-4 mb-6">
        <LegalButton variant="primary" onclick={handleButtonClick}>
          Primary Legal Action
        </LegalButton>

        <LegalButton variant="secondary" onclick={handleButtonClick}>
          Secondary Action
        </LegalButton>

        <LegalButton variant="outline" onclick={handleButtonClick}>
          Outline Style
        </LegalButton>

        <LegalButton variant="ghost" onclick={openDialog}>
          Open Dialog
        </LegalButton>
      </div>

      <div class="flex flex-wrap gap-4">
        <LegalButton variant="primary" size="sm" onclick={handleButtonClick}>
          Small Button
        </LegalButton>

        <LegalButton variant="primary" size="lg" loading onclick={handleButtonClick}>
          Loading State
        </LegalButton>

        <LegalButton variant="primary" disabled onclick={handleButtonClick}>
          Disabled Button
        </LegalButton>
      </div>
    </LegalCard>

    <!-- Enhanced Cards -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
      <LegalCard variant="default" hover>
        <h3 class="text-xl font-semibold text-legal-accent mb-2">Default Card</h3>
        <p class="text-legal-secondary">
          Standard card with hover effects and legal AI theming.
        </p>
      </LegalCard>

      <LegalCard variant="elevated" hover>
        <h3 class="text-xl font-semibold text-legal-accent mb-2">Elevated Card</h3>
        <p class="text-legal-secondary">
          Enhanced shadow and border styling for important content.
        </p>
      </LegalCard>

      <LegalCard variant="outlined" hover>
        <h3 class="text-xl font-semibold text-legal-accent mb-2">Outlined Card</h3>
        <p class="text-legal-secondary">
          Transparent background with accent border.
        </p>
      </LegalCard>
    </div>

    <!-- Validation Tools -->
    <LegalCard variant="filled" class="mb-8">
      <h2 class="text-2xl font-semibold text-legal-accent mb-6">UX & Accessibility Validation</h2>

      <div class="flex gap-4 mb-6">
        <LegalButton variant="info" onclick={runValidation}>
          Run Full Validation
        </LegalButton>

        <LegalButton variant="warning" onclick={() => accessibilityValidator.startLiveValidation()}>
          Start Live Monitoring
        </LegalButton>
      </div>

      {#if validationResults}
        <div class="space-y-4">
          <div class="bg-legal-surface/30 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-legal-accent mb-2">Accessibility Score</h3>
            <p class="text-legal-secondary">
              {validationResults.accessibility.summary.total - validationResults.accessibility.summary.errors}
              / {validationResults.accessibility.summary.total} checks passed
            </p>
          </div>

          <div class="bg-legal-surface/30 p-4 rounded-lg">
            <h3 class="text-lg font-semibold text-legal-accent mb-2">UX Pattern Score</h3>
            <p class="text-legal-secondary">
              {validationResults.ux.summary.scorePercentage}% compliance
            </p>
          </div>
        </div>
      {/if}
    </LegalCard>

    <!-- Database Integration Example -->
    <LegalCard variant="elevated" class="mb-8">
      <h2 class="text-2xl font-semibold text-legal-accent mb-6">Database Integration</h2>

      <div class="bg-legal-surface/20 p-4 rounded-lg">
        <h3 class="text-lg font-semibold text-legal-accent mb-2">PostgreSQL Enums Applied</h3>
        <ul class="text-legal-secondary space-y-1">
          <li>✅ user_role: prosecutor, detective, admin, analyst, paralegal</li>
          <li>✅ case_status: open, in_progress, pending_review, closed, archived</li>
          <li>✅ evidence_type: physical, digital, testimonial, documentary, scientific</li>
          <li>✅ priority_level: low, medium, high, critical, urgent</li>
        </ul>
      </div>
    </LegalCard>
  </div>
</div>

<!-- Enhanced Dialog -->
<LegalDialog
  bind:open={showDialog}
  title="Enhanced Legal AI Dialog"
  description="This dialog demonstrates proper accessibility patterns and legal AI theming."
  size="lg"
>
  <div class="space-y-4">
    <p class="text-legal-secondary">
      This dialog component includes:
    </p>

    <ul class="text-legal-secondary space-y-2 list-disc list-inside">
      <li>Proper ARIA attributes for accessibility</li>
      <li>Focus trap for keyboard navigation</li>
      <li>Escape key handling</li>
      <li>Legal AI theme integration</li>
      <li>Smooth animations with backdrop blur</li>
    </ul>

    <div class="flex gap-4 mt-6">
      <LegalButton variant="primary" onclick={closeDialog}>
        Confirm Action
      </LegalButton>

      <LegalButton variant="secondary" onclick={closeDialog}>
        Cancel
      </LegalButton>
    </div>
  </div>
</LegalDialog>

<style>
  .legal-ai-showcase {;
    font-family: var(--legal-ai-font-family-sans, 'Inter', sans-serif);
  }
</style>