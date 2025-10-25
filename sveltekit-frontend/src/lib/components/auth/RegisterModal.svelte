<script lang="ts">
  // Replace local dialog import with Bits UI Dialog and keep lucide + svelte types
	import * as Dialog from 'bits-ui'; // Use namespace import so Dialog.Root / Dialog.Portal etc. are available
  import { X } from 'lucide-svelte';
  import type { Snippet } from 'svelte';

  // Svelte 5 runes are auto-imported
  interface Props {
    onsuccess?: () => void;
    open?: boolean;
  }
  let { onsuccess, open = $bindable() }: Props = $props();
  let email = $state('');
  let password = $state('');
  let confirmPassword = $state('');
  let loading = $state(false);
  let error = $state('');
  let termsAccepted = $state(false);
  async function handleRegister(event: Event) {
    // Added event parameter
    event.preventDefault(); // Explicitly prevent default form submission
    if (!termsAccepted) {
      error = 'You must accept the terms and conditions to register.';
      return;
    }
    loading = true;
    error = '';
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, confirmPassword }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Registration failed');
      onsuccess?.();
      open = false;
    } catch (e) {
      error = e instanceof Error ? e.message : 'Registration failed';
    } finally {
      loading = false;
    }
  }
  function closeModal() {
    open = false;
  }

  // NOTE: UnoCSS should be imported globally in +layout.svelte, not per-component
  // to avoid FOUC and overhead (see Bits UI best practices in copilot-instructions.md)
</script>

<!-- Replace root markup to use Dialog.Portal and Dialog.Close asChild -->
<Dialog.Root bind:open={open}>
	<Dialog.Portal>
		<Dialog.Overlay class="fixed inset-0 bg-black/80 z-50" />

		<Dialog.Content
			class="fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border border-border bg-background p-6 shadow-lg duration-200 sm:rounded-lg md:w-full"
			aria-describedby="register-description"
		>
			<!-- Top-right close control using asChild -->
			<Dialog.Close asChild>
				<button aria-label="Close" class="absolute right-4 top-4 rounded p-1 hover:bg-muted/5">
					<X class="h-4 w-4" />
				</button>
			</Dialog.Close>

			<!-- Title -->
			<Dialog.Title class="text-lg font-semibold leading-none tracking-tight">Register</Dialog.Title>
			<!-- Description -->
			<Dialog.Description id="register-description" class="text-sm text-muted-foreground">
				Create a new account to access the legal AI platform.
			</Dialog.Description>

			{#if error}
				<div class="text-destructive text-sm">{error}</div>
			{/if}

			<form class="flex flex-col gap-3.5" onsubmit={handleRegister}>
				<label class="flex flex-col gap-1 text-sm font-medium">
					<span>Email</span>
					<input
						type="email"
						bind:value={email}
						required
						autocomplete="email"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</label>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span>Password</span>
					<input
						type="password"
						bind:value={password}
						required
						autocomplete="new-password"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</label>

				<label class="flex flex-col gap-1 text-sm font-medium">
					<span>Confirm Password</span>
					<input
						type="password"
						bind:value={confirmPassword}
						required
						autocomplete="new-password"
						class="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
					/>
				</label>

				<div class="items-top flex space-x-2 pt-2">
					<input
						type="checkbox"
						id="terms"
						bind:checked={termsAccepted}
						class="peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
					/>
					<div class="grid gap-1.5 leading-none">
						<label
							for="terms"
							class="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
						>
							Accept terms and conditions
						</label>
						<p class="text-sm text-muted-foreground">
							You agree to our <a href="/terms" class="underline hover:text-primary">Terms of Service</a> and
							<a href="/privacy" class="underline hover:text-primary">Privacy Policy</a>.
						</p>
					</div>
				</div>

				<div class="mt-2 flex justify-end gap-3">
					<!-- Cancel button -->
					<button
						type="button"
						onclick={closeModal}
						class="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-muted text-muted-foreground h-9 px-4 py-2"
					>
						Cancel
					</button>

					<!-- Fixed submit button -->
					<button
						type="submit"
						disabled={loading || !termsAccepted}
						class="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground shadow hover:bg-primary/90 h-9 px-4 py-2"
					>
						{#if loading}
							<span class="mr-2 text-sm">Loading…</span>
						{/if}
						Register
					</button>
				</div>
			</form>

		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
</Dialog.Root>
