<script lang="ts">
  export let type: 'nes-mario' | 'nes-ash' | 'nes-pokeball' | 'nes-bulbasaur' | 'nes-charmander' | 'nes-squirtle' = 'nes-mario';
  export let size: 'small' | 'medium' | 'large' = 'medium';
</script>

<i class={`${type} is-${size}`}></i>
