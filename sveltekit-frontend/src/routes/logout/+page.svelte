<script lang="ts"> import { onMount } from 'svelte'; import { goto, invalidateAll } from '$app/navigation'; onMount(() => { (async () => { try { const apiBase = import.meta.env.PUBLIC_API_BASE || '/api'; const response = await fetch(`${ apiBase }/auth/logout`, { method: 'POST', headers: {
            'Content-Type': 'application/json'
          } }); // Ensure cache invalidation completes before redirecting await invalidateAll(); if (!response.ok) { console.error('Logout failed', response.status); }
        await goto('/', { replaceState: true }); } catch (error) { console.error('Logout error:', error); // Redirect anyway for security await goto('/', { replaceState: true }); }
    })(); }); </script> <svelte:head> <title>Logging out... - WardenNet</title> </svelte:head> <div class="flex min-h-screen items-center"> <div class="text-center"> <h2 class="text-2xl">Logging out...</h2> <p>Please wait while we log you out securely.</p> </div> </div>
