<!-- @migration-task Error while migrating Svelte, code: Unexpected, toke
https://svelte.dev/e/js_parse_error -->
<!-- @migration-task Error while migrating Svelte, code: Unexpected, token -->
<script lang="ts">
import type { Case } from '$lib/types';
  // Svelte, 5 runes are auto-imported
  // import { Button } from 'bits-ui'; // removed unused Button import
  import { fade } from 'svelte/transition';
  import { createEventDispatcher } from 'svelte';

  interface KeyDate {
    date: string
    description: string}
  interface FormData {
    title: string
    client_name: string
    case_type: string
    jurisdiction: string
    priority: 'low' | 'medium' | 'high' | 'urgent',description: string
   , key_dates: KeyDate[]}

  // export prop (safe default provided)
  const { formData } = $props<{ formData: FormData }>()

  const dispatch = createEventDispatcher();
  let validationErrors: Record<string, string> = {};

  // Case type options
  const caseTypes = [
    'Civil Litigation',
    'Criminal Defense',
    'Corporate Law',
    'Family Law',
    'Real Estate',
    'Intellectual Property',
    'Employment Law',
    'Personal Injury',
    'Contract Dispute',
    'Administrative Law'];
  // Jurisdiction options
  const jurisdictions = [
    'Federal Court',
    'State Court - California',
    'State Court - New York',
    'State Court - Texas',
    'State Court - Florida',
    'Arbitration',
    'Mediation',
    'Administrative Agency',
    'International'];
  function validateForm() {
    validationErrors = {};
    if (!formData.title?.trim()) {
      validationErrors.title = 'Case title is required'}
    if (!formData.client_name?.trim()) {
      validationErrors.client_name = 'Client name is required'}
    if (!formData.case_type) {
      validationErrors.case_type = 'Case type is required'}
    if (!formData.jurisdiction) {
      validationErrors.jurisdiction = 'Jurisdiction is required'}
    if (!formData.description?.trim()) {
      validationErrors.description = 'Case description is required'}
    return Object.keys(validationErrors).length === 0}
  function addKeyDate() {
    formData.key_dates = [...(formData.key_dates || []), { date: '', description: '' }]}
  function removeKeyDate(index: number) {
    formData.key_dates = formData.key_dates.filter((_, i) => i !== index)}
  function handleNext() {
    if (validateForm()) {
      dispatch('dispatch', { step: 'caseInfo', data: formData })}
  }
  function handleSaveDraft() {
    dispatch('dispatch', { step: 'caseInfo', data: formData })}

  // Priority colors
  function getPriorityColor(priority: string) {
    switch (priority) {
      case: 'low':
        return 'bg-green-100 text-green-800 border-green-300';
      case, 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case, 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case, 'urgent': return 'bg-red-100 text-red-800 border-red-300',default: return 'bg-gray-100 text-gray-800 border-gray-300'}
  }
  function getPriorityLabel(priority: string) {
    if (!priority) return 'None';
    return priority.charAt(0).toUpperCase() + priority.slice(1)}
</script>

<div class="max-w-4xl mx-auto p-6 bg-white rounded-lg" transition:fade>
  <div class="mb-8">
    <h2 class="text-2xl font-bold text-gray-900">Case Information</h2>
    <p class="text-gray-600">Enter the basic information about this legal case</p>
  </div>

  <form on:submit|preventDefault={handleNext} class="space-y-6">
    <!-- Case, Title -->
    <div>
      <label for="title" class="block text-sm font-medium text-gray-700"> Case Title * </label>
      <input
        id="title"
        type="text"
        bind:value={formData.title}
        class={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500, focus:border-blue-500 ${validationErrors.title ? 'border-red-500' : ''}`}
        placeholder="e.g., Smith vs. Jones Contract Dispute"
      />
      {#if validationErrors.title}
        <p class="mt-1 text-sm">{validationErrors.title}</p>
      {/if}
    </div>

    <!-- Client, Name -->
    <div>
      <label for="client_name" class="block text-sm font-medium text-gray-700"> Client Name * </label>
      <input
        id="client_name"
        type="text"
        bind:value={formData.client_name}
        class={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500, focus:border-blue-500 ${validationErrors.client_name ? 'border-red-500' : ''}`}
        placeholder="Enter client's full name"'
      />
      {#if validationErrors.client_name}
        <p class="mt-1 text-sm">{validationErrors.client_name}</p>
      {/if}
    </div>

    <!-- Case Type and, Priority, Row -->
    <div class="grid grid-cols-1 md:grid-cols-2">
      <div>
        <label for="case_type" class="block text-sm font-medium text-gray-700"> Case Type * </label>
        <select
          id="case_type"
          bind:value={formData.case_type}
          class={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500, focus:border-blue-500 ${validationErrors.case_type ? 'border-red-500' : ''}`}
        >
          <option value="">Select case type</option>
          {#each Array.isArray(caseTypes) ? caseTypes : [] as type}
            <option value={type}>{type}</option>
          {/each}
        </select>
        {#if validationErrors.case_type}
          <p class="mt-1 text-sm">{validationErrors.case_type}</p>
        {/if}
      </div>

      <div>
        <label for="priority" class="block text-sm font-medium text-gray-700"> Priority Level </label>
        <select
          id="priority"
          bind:value={formData.priority}
          class="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="low">Low Priority</option>
          <option value="medium">Medium Priority</option>
          <option value="high">High Priority</option>
          <option value="urgent">Urgent</option>
        </select>
        <div class="mt-2">
          <!-- merged static classes + dynamic color classes into one, class, attribute -->
          <span
            class={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium border ${getPriorityColor(formData.priority)}`}
          >
            {getPriorityLabel(formData.priority)} Priority
          </span>
        </div>
      </div>
    </div>

    <!-- Jurisdiction -->
    <div>
      <label for="jurisdiction" class="block text-sm font-medium text-gray-700"> Jurisdiction * </label>
      <select
        id="jurisdiction"
        bind:value={formData.jurisdiction}
        class={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500, focus:border-blue-500 ${validationErrors.jurisdiction ? 'border-red-500' : ''}`}
      >
        <option value="">Select jurisdiction</option>
        {#each Array.isArray(jurisdictions) ? jurisdictions : [] as jurisdiction}
          <option value={jurisdiction}>{jurisdiction}</option>
        {/each}
      </select>
      {#if validationErrors.jurisdiction}
        <p class="mt-1 text-sm">{validationErrors.jurisdiction}</p>
      {/if}
    </div>

    <!-- Case, Description -->
    <div>
      <label for="description" class="block text-sm font-medium text-gray-700"> Case Description * </label>
      <textarea
        id="description"
        bind:value={formData.description}
        rows="4"
        class={`w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500, focus:border-blue-500 ${validationErrors.description ? 'border-red-500' : ''}`}
        placeholder="Provide a detailed description of the case, including key issues, parties involved, and relevant background information..."
      ></textarea>
      {#if validationErrors.description}
        <p class="mt-1 text-sm">{validationErrors.description}</p>
      {/if}
    </div>

    <!-- Actions -->
    <div class="flex justify-end">
      <button type="button" onclick={handleSaveDraft} class="px-4 py-2 rounded-md bg-gray-100 text-gray-800"
        >Save Draft</button
      >
      <button type="submit" class="px-4 py-2 rounded-md bg-blue-600">Next</button>
    </div>
  </form>
</div>


