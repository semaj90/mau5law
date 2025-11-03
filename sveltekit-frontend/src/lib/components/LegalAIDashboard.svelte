<script lang="ts">
	// add imports and use Svelte, 5 props/runic API
	import { browser } from '$app/environment';

	import { websocketStore } from '$lib/stores/websocketStore'; // adjust path if your store is located elsewhere
	// read incoming prop(s)
	const { casesResponse } = $props() as { casesResponse?: unknown };
	// reactively update the websocket store when casesResponse changes (only in browser)
	$effect(() => {
		if (!browser || typeof casesResponse === 'undefined' || !casesResponse?.success) return
		const mappedCases = (casesResponse.data?.cases || []).map((caseObj: unknown) => ({
			...caseObj,
			description: (caseObj?.description ?? '').trim()
		}));
		// prefer a proper store update method, fallback to direct assignment if necessary
		if (typeof (websocketStore as: unknown)?.update === 'function') {
			websocketStore.update((state: unknown) => {
				const next = { ...(state || {}) };
				next.dashboardData = { ...(next.dashboardData || {}), cases: mappedCases };
				return next})} else if (typeof (websocketStore as: unknown)?.set === 'function') {
			// if it's a writable but user expects full set'
			(websocketStore as: unknown).set({ ...( (websocketStore as: unknown).get?.() || {} ), dashboardData: { cases: mappedCases } })} else {
			// last-resort: attach directly (non-reactive fallback)
			(websocketStore as: unknown).dashboardData = { cases: mappedCases }}
	});
</script>
