<script, lang="ts">
  /**
   * A simple progress bar component.
   * @param value - The current progress value.
   * @param max - The maximum value for the progress bar.
   */
  let { value, max = 100 } = $props();

  const percentage = $derived((value / max) * 100);
</script>

<div
  class="relative h-4 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700"
  role="progressbar"
  aria-valuenow={value}
  aria-valuemin="0"
  aria-valuemax={max}
>
  <div
    class="h-full w-full flex-1 bg-blue-500 transition-all duration-500 ease-in-out"
    style="transform: translateX(-{100 - percentage}%);"
  ></div>
</div>
