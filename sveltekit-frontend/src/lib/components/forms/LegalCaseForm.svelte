<script lang="ts">
  import {
    ButtonBits,
    CardBits,
    InputBits,
    SelectBits,
    TabsBits,
    TooltipBits
  } from '$lib/components/ui/bits-ui';

  // Form state using Svelte 5 runes
  let formData = $state({
    caseTitle: '',
    caseNumber: '',
    clientName: '',
    practiceArea: '',
    jurisdiction: '',
    courtLevel: '',
    priority: '',
    description: '',
    assignedAttorney: '',
    estimatedHours: '',
    budget: '',
    deadline: ''
  });

  let formErrors = $state<Record<string, string>>({});
  let isSubmitting = $state(false);
  let activeTab = $state('basic');

  // Form validation
  function validateForm(): boolean {
    const errors: Record<string, string> = {};

    if (!formData.caseTitle.trim()) {
      errors.caseTitle = 'Case title is required';
    }

    if (!formData.clientName.trim()) {
      errors.clientName = 'Client name is required';
    }

    if (!formData.practiceArea) {
      errors.practiceArea = 'Practice area must be selected';
    }

    if (!formData.jurisdiction) {
      errors.jurisdiction = 'Jurisdiction must be selected';
    }

    if (!formData.deadline) {
      errors.deadline = 'Deadline is required';
    }

    formErrors = errors;
    return Object.keys(errors).length === 0;
  }

  // Form submission
  async function handleSubmit() {
    if (!validateForm()) {
      return;
    }

    isSubmitting = true;
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));

      console.log('Form submitted:', formData);

      // Reset form on success
      formData = {
        caseTitle: '',
        caseNumber: '',
        clientName: '',
        practiceArea: '',
        jurisdiction: '',
        courtLevel: '',
        priority: '',
        description: '',
        assignedAttorney: '',
        estimatedHours: '',
        budget: '',
        deadline: ''
      };

      alert('✅ Legal case created successfully!');
    } catch (error) {
      console.error('Form submission error:', error);
      alert('❌ Failed to create case. Please try again.');
    } finally {
      isSubmitting = false;
    }
  }

  // Sample data for select options
  const practiceAreas = [
    { value: 'corporate', label: '🏢 Corporate Law' },
    { value: 'litigation', label: '⚖️ Litigation' },
    { value: 'intellectual-property', label: '🧠 Intellectual Property' },
    { value: 'real-estate', label: '🏠 Real Estate' },
    { value: 'employment', label: '👥 Employment Law' },
    { value: 'criminal', label: '🚔 Criminal Law' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Family Law' },
    { value: 'tax', label: '💰 Tax Law' }
  ];

  const jurisdictions = [
    { value: 'federal', label: '🇺🇸 Federal' },
    { value: 'state-ca', label: '🐻 California' },
    { value: 'state-ny', label: '🗽 New York' },
    { value: 'state-tx', label: '🤠 Texas' },
    { value: 'state-fl', label: '🌴 Florida' },
    { value: 'international', label: '🌍 International' }
  ];

  const courtLevels = [
    { value: 'district', label: '🏛️ District Court' },
    { value: 'appellate', label: '⚖️ Appellate Court' },
    { value: 'supreme', label: '🏛️ Supreme Court' },
    { value: 'administrative', label: '📋 Administrative' }
  ];

  const priorities = [
    { value: 'low', label: '🟢 Low Priority' },
    { value: 'medium', label: '🟡 Medium Priority' },
    { value: 'high', label: '🟠 High Priority' },
    { value: 'urgent', label: '🔴 Urgent' }
  ];

  const attorneys = [
    { value: 'attorney-1', label: '👨‍💼 John Smith, Esq.' },
    { value: 'attorney-2', label: '👩‍💼 Sarah Johnson, Esq.' },
    { value: 'attorney-3', label: '👨‍💼 Michael Brown, Esq.' },
    { value: 'attorney-4', label: '👩‍💼 Emily Davis, Esq.' }
  ];

  const tabItems = [
    { value: 'basic', label: '📋 Basic Info' },
    { value: 'details', label: '📝 Case Details' },
    { value: 'assignment', label: '👥 Assignment' },
    { value: 'review', label: '✅ Review' }
  ];

  // Computed validation status
  let isFormValid = $derived(() => {
    return formData.caseTitle.trim() &&
           formData.clientName.trim() &&
           formData.practiceArea &&
           formData.jurisdiction &&
           formData.deadline;
  });

  // Progress calculation
  let formProgress = $derived(() => {
    const totalFields = 12;
    const filledFields = Object.values(formData).filter(value => value.trim()).length;
    return Math.round((filledFields / totalFields) * 100);
  });
</script>

<CardBits variant="elevated" padding="lg" class="legal-case-form">
  <div class="form-header">
    <h2 class="form-title">⚖️ Create New Legal Case</h2>
    <div class="form-progress">
      <div class="progress-bar">
        <div class="progress-fill" style="width: {formProgress}%"></div>
      </div>
      <span class="progress-text">{formProgress}% Complete</span>
    </div>
  </div>

  <TabsBits
    tabs={tabItems}
    bind:value={activeTab}
    variant="underline"
    size="md"
    class="form-tabs"
  >
    {#if activeTab === 'basic'}
      <div class="tab-content">
        <div class="form-grid">
          <div class="form-field">
            <InputBits
              label="📋 Case Title"
              placeholder="Enter case title..."
              bind:value={formData.caseTitle}
              error={!!formErrors.caseTitle}
              errorMessage={formErrors.caseTitle}
              description="A descriptive title for the legal case"
              required
            />
          </div>

          <div class="form-field">
            <InputBits
              label="🔢 Case Number"
              placeholder="CASE-2024-001"
              bind:value={formData.caseNumber}
              description="Optional internal case tracking number"
            />
          </div>

          <div class="form-field">
            <InputBits
              label="👤 Client Name"
              placeholder="Enter client name..."
              bind:value={formData.clientName}
              error={!!formErrors.clientName}
              errorMessage={formErrors.clientName}
              description="Primary client or organization name"
              required
            />
          </div>

          <div class="form-field">
            <SelectBits
              label="⚖️ Practice Area"
              placeholder="Select practice area..."
              options={practiceAreas}
              bind:selected={formData.practiceArea}
              error={!!formErrors.practiceArea}
              errorMessage={formErrors.practiceArea}
              description="Primary area of law for this case"
            />
          </div>
        </div>
      </div>
    {:else if activeTab === 'details'}
      <div class="tab-content">
        <div class="form-grid">
          <div class="form-field">
            <SelectBits
              label="🏛️ Jurisdiction"
              placeholder="Select jurisdiction..."
              options={jurisdictions}
              bind:selected={formData.jurisdiction}
              error={!!formErrors.jurisdiction}
              errorMessage={formErrors.jurisdiction}
              description="Legal jurisdiction for the case"
            />
          </div>

          <div class="form-field">
            <SelectBits
              label="⚖️ Court Level"
              placeholder="Select court level..."
              options={courtLevels}
              bind:selected={formData.courtLevel}
              description="Court level if applicable"
            />
          </div>

          <div class="form-field">
            <SelectBits
              label="🚨 Priority Level"
              placeholder="Select priority..."
              options={priorities}
              bind:selected={formData.priority}
              description="Case priority and urgency level"
            />
          </div>

          <div class="form-field full-width">
            <label for="description" class="field-label">📄 Case Description</label>
            <textarea
              id="description"
              bind:value={formData.description}
              placeholder="Provide a detailed description of the case..."
              class="form-textarea"
              rows="4"
            ></textarea>
            <p class="field-description">Comprehensive description of the legal matter</p>
          </div>
        </div>
      </div>
    {:else if activeTab === 'assignment'}
      <div class="tab-content">
        <div class="form-grid">
          <div class="form-field">
            <SelectBits
              label="👨‍💼 Assigned Attorney"
              placeholder="Select attorney..."
              options={attorneys}
              bind:selected={formData.assignedAttorney}
              description="Primary attorney responsible for the case"
            />
          </div>

          <div class="form-field">
            <InputBits
              label="⏱️ Estimated Hours"
              placeholder="Enter estimated hours..."
              bind:value={formData.estimatedHours}
              type="number"
              description="Estimated total hours for case completion"
            />
          </div>

          <div class="form-field">
            <InputBits
              label="💰 Budget"
              placeholder="Enter budget amount..."
              bind:value={formData.budget}
              type="number"
              description="Total budget allocated for the case"
            />
          </div>

          <div class="form-field">
            <InputBits
              label="📅 Deadline"
              bind:value={formData.deadline}
              type="date"
              error={!!formErrors.deadline}
              errorMessage={formErrors.deadline}
              description="Final deadline for case completion"
              required
            />
          </div>
        </div>
      </div>
    {:else if activeTab === 'review'}
      <div class="tab-content">
        <div class="review-section">
          <h3 class="review-title">📋 Case Summary</h3>

          <div class="review-grid">
            <div class="review-item">
              <strong>Case Title:</strong>
              <span>{formData.caseTitle || 'Not specified'}</span>
            </div>

            <div class="review-item">
              <strong>Client:</strong>
              <span>{formData.clientName || 'Not specified'}</span>
            </div>

            <div class="review-item">
              <strong>Practice Area:</strong>
              <span>{practiceAreas.find(area => area.value === formData.practiceArea)?.label || 'Not selected'}</span>
            </div>

            <div class="review-item">
              <strong>Jurisdiction:</strong>
              <span>{jurisdictions.find(j => j.value === formData.jurisdiction)?.label || 'Not selected'}</span>
            </div>

            <div class="review-item">
              <strong>Priority:</strong>
              <span>{priorities.find(p => p.value === formData.priority)?.label || 'Not selected'}</span>
            </div>

            <div class="review-item">
              <strong>Deadline:</strong>
              <span>{formData.deadline || 'Not specified'}</span>
            </div>
          </div>

          {#if formData.description}
            <div class="review-description">
              <strong>Description:</strong>
              <p>{formData.description}</p>
            </div>
          {/if}

          <div class="validation-status">
            {#if isFormValid}
              <div class="status-valid">
                ✅ Form is complete and ready for submission
              </div>
            {:else}
              <div class="status-invalid">
                ⚠️ Please complete all required fields before submitting
              </div>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </TabsBits>

  <div class="form-actions">
    <div class="action-buttons">
      <TooltipBits content="Clear all form data">
        <ButtonBits
          variant="ghost"
          onclick={() => {
            if (confirm('Are you sure you want to clear all form data?')) {
              formData = {
                caseTitle: '',
                caseNumber: '',
                clientName: '',
                practiceArea: '',
                jurisdiction: '',
                courtLevel: '',
                priority: '',
                description: '',
                assignedAttorney: '',
                estimatedHours: '',
                budget: '',
                deadline: ''
              };
              formErrors = {};
            }
          }}
        >
          🗑️ Clear Form
        </ButtonBits>
      </TooltipBits>

      <TooltipBits content={isFormValid ? 'Submit the legal case' : 'Complete required fields first'}>
        <ButtonBits
          variant="primary"
          loading={isSubmitting}
          disabled={!isFormValid || isSubmitting}
          onclick={handleSubmit}
        >
          {isSubmitting ? '⏳ Creating Case...' : '⚖️ Create Case'}
        </ButtonBits>
      </TooltipBits>
    </div>
  </div>
</CardBits>

<style>
  .legal-case-form {
    max-width: 800px;
    margin: 0 auto;
  }

  .form-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 2rem;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .form-title {
    font-size: 1.5rem;
    font-weight: 600;
    color: var(--legal-ai-text-primary, #f1f5f9);
  }

  .form-progress {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  .progress-bar {
    width: 120px;
    height: 8px;
    background: var(--legal-ai-surface-secondary, #334155);
    border-radius: 4px;
    overflow: hidden;
  }

  .progress-fill {
    height: 100%;
    background: linear-gradient(90deg, #f59e0b, #d97706);
    transition: width 0.3s ease;
  }

  .progress-text {
    font-size: 0.875rem;
    color: var(--legal-ai-text-secondary, #94a3b8);
    font-weight: 500;
  }

  .form-tabs {
    margin-bottom: 2rem;
  }

  .tab-content {
    padding: 1.5rem 0;
  }

  .form-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 1.5rem;
  }

  .form-field {
    display: flex;
    flex-direction: column;
  }

  .form-field.full-width {
    grid-column: 1 / -1;
  }

  .field-label {
    font-size: 0.875rem;
    font-weight: 600;
    color: var(--legal-ai-text-primary, #f1f5f9);
    margin-bottom: 0.5rem;
  }

  .form-textarea {
    padding: 0.75rem;
    border: 2px solid var(--legal-ai-border, #475569);
    border-radius: 0.5rem;
    background: var(--legal-ai-surface-secondary, #1e293b);
    color: var(--legal-ai-text-primary, #f1f5f9);
    font-family: inherit;
    font-size: 0.875rem;
    transition: border-color 0.2s ease;
    resize: vertical;
  }

  .form-textarea:focus {
    outline: none;
    border-color: var(--legal-ai-primary, #f59e0b);
    box-shadow: 0 0 0 3px rgba(245, 158, 11, 0.1);
  }

  .field-description {
    font-size: 0.75rem;
    color: var(--legal-ai-text-tertiary, #64748b);
    margin-top: 0.25rem;
  }

  .review-section {
    padding: 1rem 0;
  }

  .review-title {
    font-size: 1.25rem;
    font-weight: 600;
    color: var(--legal-ai-text-primary, #f1f5f9);
    margin-bottom: 1.5rem;
  }

  .review-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;
    margin-bottom: 1.5rem;
  }

  .review-item {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    background: var(--legal-ai-surface-secondary, #1e293b);
    border-radius: 0.5rem;
    border-left: 3px solid var(--legal-ai-primary, #f59e0b);
  }

  .review-item strong {
    font-size: 0.875rem;
    color: var(--legal-ai-text-secondary, #94a3b8);
  }

  .review-item span {
    font-size: 0.9rem;
    color: var(--legal-ai-text-primary, #f1f5f9);
    font-weight: 500;
  }

  .review-description {
    margin-bottom: 1.5rem;
    padding: 1rem;
    background: var(--legal-ai-surface-secondary, #1e293b);
    border-radius: 0.5rem;
    border-left: 3px solid var(--legal-ai-accent, #06b6d4);
  }

  .review-description strong {
    display: block;
    font-size: 0.875rem;
    color: var(--legal-ai-text-secondary, #94a3b8);
    margin-bottom: 0.5rem;
  }

  .review-description p {
    color: var(--legal-ai-text-primary, #f1f5f9);
    line-height: 1.5;
    margin: 0;
  }

  .validation-status {
    padding: 1rem;
    border-radius: 0.5rem;
    text-align: center;
    font-weight: 500;
  }

  .status-valid {
    background: rgba(34, 197, 94, 0.1);
    color: #22c55e;
    border: 1px solid rgba(34, 197, 94, 0.2);
  }

  .status-invalid {
    background: rgba(245, 158, 11, 0.1);
    color: #f59e0b;
    border: 1px solid rgba(245, 158, 11, 0.2);
  }

  .form-actions {
    margin-top: 2rem;
    padding-top: 1.5rem;
    border-top: 1px solid var(--legal-ai-border, #475569);
  }

  .action-buttons {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
    flex-wrap: wrap;
  }

  @media (max-width: 640px) {
    .form-header {
      flex-direction: column;
      align-items: flex-start;
    }

    .form-grid {
      grid-template-columns: 1fr;
    }

    .review-grid {
      grid-template-columns: 1fr;
    }

    .action-buttons {
      justify-content: stretch;
    }

    .action-buttons :global(button) {
      flex: 1;
    }
  }
</style>