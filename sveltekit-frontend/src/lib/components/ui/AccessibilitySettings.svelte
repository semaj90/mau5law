<script lang="ts">
  // Svelte 5 runes are auto-imported
  import { accessibilityService } from '$lib/services/accessibility-service';
  import { Settings, Eye, Type } from 'lucide-svelte';
  import Button from '$lib/components/ui/bits/button';
  // Props (runes style)
  let { isOpen = $bindable(false) } = $props();
  // Local reactive state wrapper of service config
  let config = $state(accessibilityService.getConfig());
  function refresh() {
    config = accessibilityService.getConfig();
  }
  function updateFontSize(size: typeof config.fontSize) {
    accessibilityService.setFontSize(size);
    refresh();
  }
  function toggleHighContrast() {
    accessibilityService.toggleHighContrast();
    refresh();
  }
  function toggleReducedMotion() {
    accessibilityService.toggleReducedMotion();
    refresh();
  }
  function updateConfig(key: keyof typeof config, value: unknown) {
    accessibilityService.updateConfig({ [key]: value });
    refresh();
  }
</script>
{#if isOpen}
  <div
    class="accessibility-settings fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
    role="dialog"
    aria-labelledby="accessibility-title"
    aria-modal="true"
  >
    <div class="bg-white dark:bg-gray-900 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
      <!-- Header -->
      <div class="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
        <div class="flex items-center gap-3">
          <Settings class="w-6 h-6 text-blue-600 dark:text-blue-400" />
          <h2 id="accessibility-title" class="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Accessibility Settings
          </h2>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onclick={() =>
isOpen = false}
          aria-label="Close accessibility settings"
          class="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ×
        </Button>
      </div>
      <!-- Content -->
      <div class="p-6 space-y-6">
        <!-- Visual Settings -->
        <section>
          <h3 class="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            <Eye class="w-5 h-5" />
            Visual Settings
          </h3>
          <div class="space-y-4">
            <!-- Font Size -->
            <div>
              <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Type class="w-4 h-4 inline mr-1" />
                Font Size
              </label>
              <div class="grid grid-cols-4 gap-2">
                {#each ['small', 'normal', 'large', 'extra-large'] as size}
                  <button
                    class="px-3 py-2 text-sm border rounded-lg transition-colors
                      {config.fontSize === size
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-500'}"
                    onclick={() => updateFontSize(size)}
                    aria-pressed={config.fontSize === size}
                  >
                    {size.charAt(0).toUpperCase() + size.slice(1).replace('-', ' ')}
                      </button>
                {/each}
              </div>
            </div>
            <!-- High Contrast -->
            <div class="flex items-center justify-between">
              <label for="high-contrast" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                High Contrast Mode
              </label>
              <button
                id="high-contrast"
                role="switch"
                aria-checked={config.enableHighContrast}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  {config.enableHighContrast ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                onclick={toggleHighContrast}
              >
                <span class="sr-only">Enable high contrast mode</span>
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    {config.enableHighContrast ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </div>
            </div>
            <!-- Reduced Motion -->
            <div class="flex items-center justify-between">
              <label for="reduced-motion" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Reduce Motion
              </label>
              <button
                id="reduced-motion"
                role="switch"
                aria-checked={config.enableReducedMotion}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  {config.enableReducedMotion ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                onclick={toggleReducedMotion}
              >
                <span class="sr-only">Reduce motion and animations</span>
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    {config.enableReducedMotion ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </button>
            </div>
          </div>
        </section>
        <!-- Navigation Settings -->
        <section>
          <h3 class="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            <Keyboard class="w-5 h-5" />
            Navigation Settings
          </h3>
          <div class="space-y-4">
            <!-- Keyboard Navigation -->
            <div class="flex items-center justify-between">
              <label for="keyboard-nav" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Enhanced Keyboard Navigation
              </label>
              <button
                id="keyboard-nav"
                role="switch"
                aria-checked={config.enableKeyboardNavigation}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  {config.enableKeyboardNavigation ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                onclick={() => updateConfig('enableKeyboardNavigation', !config.enableKeyboardNavigation)}
              >
                <span class="sr-only">Enable enhanced keyboard navigation</span>
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    {config.enableKeyboardNavigation ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </button>
            </div>
            <!-- Focus Management -->
            <div class="flex items-center justify-between">
              <label for="focus-management" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Smart Focus Management
              </label>
              <button
                id="focus-management"
                role="switch"
                aria-checked={config.focusManagement}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  {config.focusManagement ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                onclick={() => updateConfig('focusManagement', !config.focusManagement)}
              >
                <span class="sr-only">Enable smart focus management</span>
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    {config.focusManagement ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </button>
            </div>
          </div>
        </section>
        <!-- Screen Reader Settings -->
        <section>
          <h3 class="flex items-center gap-2 text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            <Volume2 class="w-5 h-5" />
            Screen Reader Settings
          </h3>
          <div class="space-y-4">
            <!-- Screen Reader Announcements -->
            <div class="flex items-center justify-between">
              <label for="screen-reader" class="text-sm font-medium text-gray-700 dark:text-gray-300">
                Screen Reader Announcements
              </label>
              <button
                id="screen-reader"
                role="switch"
                aria-checked={config.enableScreenReaderAnnouncements}
                class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors
                  {config.enableScreenReaderAnnouncements ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'}"
                onclick={() => updateConfig('enableScreenReaderAnnouncements', !config.enableScreenReaderAnnouncements)}
              >
                <span class="sr-only">Enable screen reader announcements</span>
                <span
                  class="inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                    {config.enableScreenReaderAnnouncements ? 'translate-x-6' : 'translate-x-1'}"
                ></span>
              </button>
            </div>
          </div>
        </section>
        <!-- Keyboard Shortcuts -->
        <section>
          <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
            Keyboard Shortcuts
          </h3>
          <div class="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
            <dl class="space-y-2 text-sm">
              <div class="flex justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Skip to main content:</dt>
                <dd class="font-mono text-gray-900 dark:text-gray-100">Alt + S</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Show accessibility help:</dt>
                <dd class="font-mono text-gray-900 dark:text-gray-100">F1</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Close modals:</dt>
                <dd class="font-mono text-gray-900 dark:text-gray-100">Escape</dd>
              </div>
              <div class="flex justify-between">
                <dt class="text-gray-600 dark:text-gray-400">Navigate elements:</dt>
                <dd class="font-mono text-gray-900 dark:text-gray-100">Tab / Shift+Tab</dd>
              </div>
            </dl>
          </div>
        </section>
      </div>
      <!-- Footer -->
      <div class="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-700">
        <Button variant="ghost" onclick={() => isOpen = false}>
          Close
                    </div>
      </div>
    </div>
  </div>
{/if}
<style>
  .accessibility-settings {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen',
      'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
  }
</style>