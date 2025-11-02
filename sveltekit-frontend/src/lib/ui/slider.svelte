<script lang="ts">
  import {
    Slider, // Correct named import for Slider
    SliderRange,
    SliderThumb,
    SliderTrack
  } from 'bits-ui';

  type $$Props = Slider.Props;
  type $$Events = Slider.Events;

  const { value } = $props<{ value: $$Props['value'] }>() // Default to a single value slider
  const { min } = $props<{ min: $$Props['min'] }>()
  const { max } = $props<{ max: $$Props['max'] }>()
  const { step } = $props<{ step: $$Props['step'] }>()
  const { orientation } = $props<{ orientation: $$Props['orientation'] }>()
  const { disabled } = $props<{ disabled: $$Props['disabled'] }>()

  // Pass through all other props to the primitive root
  let { ...$$restProps } = $$props;
</script>

<Slider.Root
  bind:value
  {min}
  {max}
  {step}
  {orientation}
  {disabled}
  class="relative flex w-full touch-none select-none items-center"
  {...rest}
>
  <SliderTrack
    class="relative h-2 w-full grow overflow-hidden rounded-full bg-secondary"
  >
    <SliderRange class="absolute h-full" />
  </SliderTrack>
  {#each value as _, i}
    <SliderThumb
      class="block h-5 w-5 rounded-full border-2 border-primary bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none"
    />
  {/each}
</Slider.Root>
