<script lang="ts">
  // Simplified BitsUnoDemo for build compatibility
  import { createDialog } from 'melt';
  import { fade } from 'svelte/transition';

  // Create dialog state
  const {
    elements: { trigger: dialogTrigger, overlay: dialogOverlay, content: dialogContent, portalled: dialogPortalled },
    states: { open: dialogOpen }
  } = createDialog();
</script>

<div class="space-y-4">
  <div class="space-y-4">
    <h1 class="text-3xl font-bold">
      Melt UI + UnoCSS Integration Demo
    </h1>
    <p class="text-gray-600">
      Showcasing seamless integration between Melt UI components and UnoCSS utilities
    </p>

    <div class="space-y-4">
      <div class="p-6 border rounded-lg">
        <h3 class="text-xl font-semibold mb-2">
          <span class="mr-2">💬</span>
          Dialog Component
        </h3>
        <p class="text-gray-600 mb-4">Modal dialogs with UnoCSS styling</p>

        <button
          use:melt={$dialogTrigger}
          class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
        >
          Open Dialog
        </button>

        <div use:melt={$dialogPortalled}>
          {#if $dialogOpen}
            <div use:melt={$dialogOverlay} class="fixed inset-0 bg-black bg-opacity-50 z-50" in:fade={{ duration: 150 }} out:fade={{ duration: 150 }}></div>
            <div
              use:melt={$dialogContent}
              class="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white p-6 rounded-lg shadow-lg z-50 max-w-md w-full mx-4"
              in:fade={{ duration: 150 }}
              out:fade={{ duration: 150 }}
            >
              <h2 class="text-xl font-bold mb-4">
                UnoCSS Styled Dialog
              </h2>
              <p class="text-gray-600 mb-6">
                This dialog showcases Melt UI components styled with UnoCSS utility classes for a modern, responsive design.
              </p>

              <div class="flex gap-3 justify-end">
                <button
                  class="px-4 py-2 border border-gray-300 rounded hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  class="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          {/if}
        </div>
      </div>

      <div class="p-6 border rounded-lg">
        <h3 class="text-xl font-semibold mb-4">
          Integration Highlights
        </h3>

        <div class="grid md:grid-cols-2 gap-4">
          <div>
            <h4 class="font-semibold mb-2">Melt UI Features</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>✓ Accessible components out of the box</li>
              <li>✓ Keyboard navigation support</li>
              <li>✓ Customizable with any CSS framework</li>
              <li>✓ Built for Svelte with TypeScript</li>
            </ul>
          </div>

          <div>
            <h4 class="font-semibold mb-2">UnoCSS Benefits</h4>
            <ul class="text-sm text-gray-600 space-y-1">
              <li>✓ Instant CSS generation</li>
              <li>✓ Minimal bundle size</li>
              <li>✓ Flexible theming system</li>
              <li>✓ IDE autocompletion support</li>
            </ul>
          </div>
        </div>
      </div>

      <div class="p-4 bg-green-50 border border-green-200 rounded-lg">
        <div class="flex items-center">
          <span class="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
          Melt UI + UnoCSS Integration Active
        </div>
      </div>
    </div>
  </div>
</div>