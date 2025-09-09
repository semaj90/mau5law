<script>
  import { onDestroy } from 'svelte';

  let file = null;
  let previewUrl = '';
  let error = '';

  function onFileChange(event) {
	error = '';
	const f = event.target.files && event.target.files[0];
	if (!f) {
	  file = null;
	  updatePreview();
	  return;
	}
	if (!f.type.startsWith('image/')) {
	  file = null;
	  error = 'Please select an image file.';
	  updatePreview();
	  return;
	}
	file = f;
	updatePreview();
  }

  function updatePreview() {
	if (previewUrl) {
	  try { URL.revokeObjectURL(previewUrl); } catch (e) {}
	  previewUrl = '';
	}
	if (file) {
	  previewUrl = URL.createObjectURL(file);
	}
  }

  onDestroy(() => {
	if (previewUrl) {
	  try { URL.revokeObjectURL(previewUrl); } catch (e) {}
	}
  });
</script>

<style>
  .container {
	max-width: 720px;
	margin: 1rem auto;
	padding: 1rem;
  }
  img.preview {
	max-width: 100%;
	height: auto;
	border: 1px solid #ddd;
	margin-top: 0.5rem;
  }
  .error {
	color: #b00020;
	margin-top: 0.5rem;
  }
</style>

<div class="container">
  <h1>Neural Sprite — Demo</h1>
  <p>Select an image to preview. This basic page avoids runtime errors and demonstrates a file input + preview.</p>

  <input type="file" accept="image/*" onchange="{onFileChange}" />

  {#if error}
	<div class="error">{error}</div>
  {/if}

  {#if previewUrl}
	<div>
	  <h2>Preview</h2>
	  <img class="preview" src="{previewUrl}" alt="Selected preview" />
	</div>
  {/if}
</div>
