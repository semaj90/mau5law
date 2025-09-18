<script lang="ts">
  export let title: string = 'Card Title';
  export let content: string = 'This is a NES.css styled card component.';
</script>

<section class="nes-container with-title is-dark">
  <h3 class="title">{title}</h3>
  <p>{content}</p>
</section>
