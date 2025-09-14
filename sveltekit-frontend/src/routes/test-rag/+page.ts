import type { PageLoad } from './$types.js';

export const load: PageLoad = async ({ fetch }) => {
	return {
		title: 'Enhanced RAG System Testing'
	};
};