import { superValidate } from 'sveltekit-superforms/server';
import { zod } from 'sveltekit-superforms/adapters';
import { uploadSchema } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/schemas/upload';

export const load = async () => {
  const form = await superValidate(zod(uploadSchema));
  return { form };
};
