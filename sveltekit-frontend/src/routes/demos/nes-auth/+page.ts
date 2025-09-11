import type { PageLoad } from './$types';
import type { ChatMessage, Recommendation } from '$lib/components/ui/enhanced-bits/types';

export const load: PageLoad = async () => {
  // Example static data; replace with real fetches if needed
  const chat: ChatMessage[] = [
    { id: '1', role: 'system', content: 'Welcome to NES Auth demo.' },
    { id: '2', role: 'user', content: 'How do I register?' },
    { id: '3', role: 'assistant', content: 'Click the Register button and fill the form.' }
  ];
  const recommendations: Recommendation[] = [
    { id: 'r1', title: 'Security Tip', description: 'Use a strong password.' }
  ];
  return { chat, recommendations };
};
