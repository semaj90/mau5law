<script lang="ts">
  import { ArrowRight } from 'lucide-svelte';
</script>

<section class="min-h-screen bg-beige text-noir font-ui p-6">
  <header class="mb-6">
    <h1 class="text-3xl tracking-wide">YoRHa Command Dashboard</h1>
    <p class="text-sm opacity-70">Central Intelligence Overview</p>
  </header>

  <section class="grid grid-cols-3 gap-4">
    <article class="border-1 border-noir p-3">
      <header class="text-xs uppercase tracking-wide mb-1 opacity-70">Active Cases</header>
      <strong class="text-2xl">3</strong>
    </article>

    <article class="border-1 border-noir p-3">
      <header class="text-xs uppercase tracking-wide mb-1 opacity-70">Evidence Items</header>
      <strong class="text-2xl">27</strong>
    </article>

    <article class="border-1 border-noir p-3">
      <header class="text-xs uppercase tracking-wide mb-1 opacity-70">Persons of Interest</header>
      <strong class="text-2xl">8</strong>
    </article>
  </section>

  <section class="mt-6 border-t border-noir pt-4">
    <header class="text-xs uppercase tracking-wide mb-2 opacity-70">Navigate</header>
    <div class="flex gap-3">
      <a href="/command" class="flex items-center gap-2 border-1 border-noir px-4 py-2 text-sm hover:bg-noir hover:text-beige">
        Enter Command Center <ArrowRight class="w-4 h-4"/>
      </a>
    </div>
  </section>
</section>