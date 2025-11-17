<script lang="ts">
  import { Card, CardContent } from '$lib // TODO: Verify store subscription is correct for Svelte 5/components/ui/card';
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style lang="postcss">
  .evidence-analysis-page {
    @apply min-h-screen bg-gray-50 dark:bg-gray-900 p-6 space-y-8;
  }
  .page-header {
    @apply text-center mb-8;
  }
  .page-title {
    @apply text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2;
  }
  .page-description {
    @apply text-xl text-gray-600 dark:text-gray-400;
  }
  .feature-cards {
    @apply grid grid-cols-1 md:grid-cols-3 gap-6 mb-8;
  }
  .feature-list {
    @apply space-y-2;
  }
  .feature-list li {
    @apply flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400;
  }
  .feature-list li:before {
    content: '✓';
    @apply text-green-500 font-bold;
  }
  .dashboard-section {
    @apply mb-8;
  }
  :global(.webgpu-demo-section) {
    @apply mb-8;
  }
  .demo-header {
    @apply flex justify-between items-center;
  }
  .webgpu-warning {
    @apply bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-300 dark:border-yellow-700 rounded-lg p-4;
  }
  .webgpu-warning h3 {
    @apply text-lg font-semibold text-yellow-800 dark:text-yellow-200 mb-2;
  }
  .webgpu-warning p {
    @apply text-yellow-700 dark:text-yellow-300 mb-2;
  }
  .webgpu-warning ul {
    @apply space-y-1 text-sm text-yellow-600 dark:text-yellow-400;
  }
  .webgpu-warning code {
    @apply bg-yellow-100 dark:bg-yellow-800 px-2 py-1 rounded text-x;
  }
  .webgpu-demo {
    @apply min-h-96;
  }
  .demo-placeholder {
    @apply bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-900/20 dark:to-purple-900/20 rounded-lg p-8;
  }
  .placeholder-content {
    @apply text-center;
  }
  .placeholder-icon {
    @apply w-16 h-16 text-indigo-500 mx-auto mb-4;
  }
  .placeholder-content h3 {
    @apply text-xl font-semibold text-gray-800 dark:text-gray-200 mb-2;
  }
  .placeholder-content p {
    @apply text-gray-600 dark:text-gray-400 mb-4;
  }
  .demo-features {
    @apply space-y-1 text-sm text-gray-500 dark:text-gray-500;
  }
  .demo-features li:before {
    content: '⚡';
    @apply mr-2;
  }
  :global(.tech-specs) {
    @apply mb-8;
  }
  .specs-grid {
    @apply grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6;
  }
  .spec-item h4 {
    @apply font-semibold text-gray-800 dark:text-gray-200 mb-2;
  }
  .spec-item ul {
    @apply space-y-1 text-sm text-gray-600 dark:text-gray-400;
  }
  .spec-item li {
    @apply flex items-start gap-2;
  }
  .spec-item li:before {
    content: '•';
    @apply text-indigo-500;
  }
</style>
