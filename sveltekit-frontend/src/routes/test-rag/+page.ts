import type { PageLoad } from './$types';

export const load: PageLoad = async ({ fetch }) => {
	return {
		title: 'Enhanced RAG System Testing'
	};
};