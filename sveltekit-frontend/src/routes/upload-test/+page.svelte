<script lang="ts">
	import { superForm } from 'sveltekit-superforms/client';
	import { zodClient } from 'sveltekit-superforms/adapters';
	import { uploadSchema } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/schemas/upload';
	import type { PageData } from './$types // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5'; // Import the PageData type

	export let data: PageData; // Apply the PageData type to the data prop

	const { form, errors, message, enhance } = superForm(data.form, {
		validators: zodClient(uploadSchema),
		taintedMessage: null
	});
</script>

<h1>File Upload Test</h1>

{#if $message // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5}
	<div class="message">{$message // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5}</div>
{/if}

<form method="POST" action="/api/upload" use:enhance>
	<div>
		<label for="file">File</label>
		<input type="file" name="file" bind:files={$form // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5.file} />
		{#if $errors // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5.file}
			<div class="error">{$errors // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5.file}</div>
		{/if}
	</div>
	<button type="submit">Upload</button>
</form>

<style>
	.error {
		color: red;
	}
	.message {
		padding: 1em;
		margin: 1em 0;
		border: 1px solid #ccc;
		border-radius: 4px;
	}
</style>