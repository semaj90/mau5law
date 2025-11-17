// Re-export Document API service from canonical location // Added to satisfy imports expecting: '$lib // TODO: Verify store subscription is correct for Svelte 5/api/documentApi'
export * from '$lib // TODO: Verify store subscription is correct for Svelte 5/services/documentApi';
import { DocumentApiService } from '$lib // TODO: Verify store subscription is correct for Svelte 5/services/documentApi';
export default new DocumentApiService();
