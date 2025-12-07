<script lang="ts">
  export let risk: 'low' | 'medium' | 'high' = 'medium';
  export let status: 'active' | 'pending' | 'closed' = 'active';
</script>

<div class="flex gap-1">
  <span
    class={risk === 'high'
      ? 'pill-red'
      : risk === 'medium'
        ? 'pill-yellow'
        : 'pill-green'}
  >
    {risk}
  </span>
  <span
    class={status === 'closed'
      ? 'tag bg-black text-sand'
      : status === 'pending'
        ? 'pill-yellow'
        : 'pill-green'}
  >
    {status}
  </span>
</div>
