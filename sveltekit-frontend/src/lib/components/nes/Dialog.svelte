<script lang="ts">
  export let open: boolean = false;
  export let message: string = 'Are you sure?';
  export let onConfirm: () => void = () => {};
  export let onCancel: () => void = () => {};
</script>

{#if open}
  <dialog class="nes-dialog is-rounded" open>
    <form method="dialog">
      <p class="title">Confirm</p>
      <p>{message}</p>
      <menu class="dialog-menu">
        <button type="button" class="nes-btn" on:click={onCancel}>Cancel</button>
        <button type="button" class="nes-btn is-primary" on:click={onConfirm}>OK</button>
      </menu>
    </form>
  </dialog>
{/if}
