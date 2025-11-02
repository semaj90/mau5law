<script lang="ts">
  interface Props {
    type?: 'nes-mario' | 'nes-ash' | 'nes-pokeball' | 'nes-bulbasaur' | 'nes-charmander' | 'nes-squirtle';
    size?: 'small' | 'medium' | 'large';
  }
  let { type = 'nes-mario', size = 'medium' }: Props = $props();
</script>
<i class={`${type} is-${size}`}></i>
