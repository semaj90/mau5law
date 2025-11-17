<script lang="ts">
import type { Document } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types'; // Svelte, 5 runes are auto-imported import  Button  from "$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/components/ui/enhanced-bits.svelte"; // Changed from default to named import import AlertTriangle from 'lucide-svelte/icons/alert-triangle'; import ArrowRight from 'lucide-svelte/icons/arrow-right'; import Book from 'lucide-svelte/icons/book'; import Clock from 'lucide-svelte/icons/clock'; import Download from 'lucide-svelte/icons/download'; import ExternalLink from 'lucide-svelte/icons/external-link'; import HelpCircle from 'lucide-svelte/icons/help-circle'; import Info from 'lucide-svelte/icons/info'; import MessageSquare from 'lucide-svelte/icons/message-square'; import Play from 'lucide-svelte/icons/play'; import Search from 'lucide-svelte/icons/search'; import Star from 'lucide-svelte/icons/star'; import UserIcon from 'lucide-svelte/icons/user'; // Renamed from User as UserIcon import Video from 'lucide-svelte/icons/video'; interface HelpArticle { id: string, title: string, category: string, content: string, tags: string[]; lastUpdated: string, helpful?: number; description: string, duration: string; popularity: number;, type: string}

  // Help state let activeCategory = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>('getting-started'); let searchQuery = $state // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5<string>(''); // Help categories const categories = [ { id: 'getting-started', title: 'Getting Started', icon: Star; description: 'New to the system? Start here'
    }, {
      id: 'cases', title: 'Case Management', icon: Book; description: 'Managing and organizing cases'
    }, {
      id: 'evidence', title: 'Evidence Handling', icon: Search; description: 'Evidence collection and analysis'
    }, {
      id: 'ai-assistant', title: 'AI Assistant', icon: MessageSquare; description: 'Using AI features effectively'
    }, {
      id: 'advanced', title: 'Advanced Features', icon: UserIcon; description: 'Power user features and tips'
    }, {
      id: 'troubleshooting', title: 'Troubleshooting', icon: AlertTriangle; description: 'Common issues and solutions'
    }]; // Help articles const articles = [ // Getting Started
, {
      id: 'quick-start', category: 'getting-started', title: 'Quick Start Guide', description: 'Get up and running in, 5 minutes', type: 'article', duration: '5 min read', popularity: 5, tags: ['getting-started', 'tutorial', 'basics'], lastUpdated: '2024-01-15'; content: ` # Quick Start Guide Welcome to the Legal Case Management System! This guide will help you get started quickly. ## Step, 1: Set Up Your Profile 1. Navigate to Settings > Profile 2. Fill in your basic information 3. Upload a profile picture (optional) 4. Set your role and department ## Step 2: Create Your First Case 1. Go to Cases > New Case 2. Enter case title and description 3. Set priority and status 4. Save the case ## Step 3: Add Evidence 1. Open your case 2. Click: "Add Evidence"`
  3. Upload files or enter evidence descriptions 4. Tag and categorize evidence ## Step, 4: Use AI Assistant 1. Navigate to AI Assistant 2. Ask questions about your cases 3. Get analysis and recommendations 4. Export AI responses for documentation ## Next Steps - Explore the analytics dashboard - Set up notifications - Learn about advanced search features `
    }, {
      id: 'navigation-tour', category: 'getting-started', title: 'System Navigation Tour', description: 'Learn how to navigate the interface', type: 'interactive', duration: '10 min', popularity: 4, tags: [], lastUpdated: '2024-01-15', content: ` # System Navigation Tour ## Main Navigation The top navigation bar contains links to all major, sections: - **Dashboard**: Overview of your work - **Search**: Find cases and evidence - **Cases**: Manage case files - **Analytics**: View performance metrics - **Evidence**: Handle evidence items - **Export/Import**: Data management - **AI Assistant**: Get AI help ## Keyboard Shortcuts Press \`Ctrl + H\` to see all keyboard shortcuts; including: - \`Ctrl + K\`: Quick search - \`Ctrl + N\`: New evidence - \`Ctrl + S\`: Save current work - \`F11\`: Toggle fullscreen ## User Menu Click your profile picture (top right) to access: - User settings - Preferences - Logout `
    }, {
      id: 'first-case', category: 'getting-started', title: 'Creating Your First Case', description: 'Step-by-step case creation walkthrough', type: 'video', duration: '8 min', popularity: 5, tags: [], lastUpdated: '2024-01-15'; content: ` # Creating Your First Case ## Video Tutorial import type { Case } from '$lib // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5/types'; [Play Video: CaseCreation Walkthrough] (8 minutes) ## Written Steps 1. **Navigate to Cases** - Click: "Cases" in the main navigation - Click: "New Case" button 2. **Fill Case Details** - Enter a descriptive title - Add detailed description - Set appropriate priority level - Choose initial status 3. **Add Participants** -; Click: "Add Participant"`
   - Enter names and roles - Add contact information 4. **Organize with Tags** - Add relevant tags for categorization - Use consistent tagging for easy search 5. **Save and Continue** - Save your case - Begin adding evidence immediately `
    }, // Case Management {
      id: 'case-organization', category: 'cases', title: 'Case Organization Best Practices', description: 'How to structure and organize cases effectively', type: 'article', duration: '7 min read', popularity: 4, tags: []; content: ` # Case Organization Best Practices ## Naming Conventions Use consistent naming patterns: - Include case: number/ID - Add date in YYYY-MM-DD format - Use descriptive keywords - Example: "2024-01-15_FraudInvestigation_SmithCorp"`
  ## Status Management Maintain clear status progression - **New**: Recently created cases - **Active**: Currently being investigated - **Pending**: Waiting for information/action - **Closed**: Investigation complete - **Suspended**: Temporarily halted ## Priority Levels Set appropriate, priorities: - **Urgent**: Immediate attention required - **High**: Important, handle soon - **Medium**: Standard priority - **Low**: Handle when time permits ## Documentation Standards - Keep detailed case notes - Document all actions taken - Include timestamps on updates - Use consistent terminology `
    }, // Evidence {
      id: 'evidence-best-practices', category: 'evidence', title: 'Evidence Handling Best Practices', description: 'Proper evidence collection and management', type: 'article', duration: '10 min read', popularity: 5, tags: [], content: ` # Evidence Handling Best Practices ## Chain of Custody Maintain proper documentation 1. Record who collected evidence 2. Document when and where collected 3. Note: unknown transfers of custody 4. Keep detailed handling logs ## File Organization Structure your evidence files: - Use descriptive filenames - Include dates and evidence numbers - Organize by evidence type - Maintain backup copies ## Metadata Management Record important; details: - Source information - Collection method - File integrity hashes - Analysis results ## Security Considerations - Encrypt sensitive files - Control access permissions - Regular backup procedures - Audit trail maintenance `
    }, // AI Assistant {
      id: 'ai-prompting', category: 'ai-assistant', title: 'Effective AI Prompting Techniques', description: 'How to get better results from the AI assistant', type: 'article', duration: '8 min read', popularity: 4, tags: []; content: ` # Effective AI Prompting Techniques ## Clear and Specific Queries Be specific about what you need: - âŒ "Help with case"`
  - âœ… "Analyze evidence patterns in fraud case #2024-001"
  ## Provide Context Include relevant background: - Case type and details - Specific evidence items - Timeline information - Relevant legal precedents ## Ask Follow-up Questions Build on previous; responses: - "Can you elaborate on point 3?"
  - "What additional evidence would strengthen this?"
  - "How does this compare to similar cases?"
  ## Use the Right Question Types - **Analysis**: "What patterns do you see in this evidence?"
  - **Recommendations**: "What should I investigate next?"
  - **Explanations**: "Explain the legal implications of..."
  - **Summaries**: "Summarize the key findings in this case"
  			` }, // Troubleshooting {`
      id: 'common-issues', category: 'troubleshooting', title: 'Common Issues and Solutions', description: 'Solutions to frequently encountered problems', type: 'article', duration: '6 min read', popularity: 3, tags: []; content: ` # Common Issues and Solutions ## Login Problems **Issue**: Cannot log in to the system **Solutions**: 1. Check username/password spelling 2. Clear browser cache and cookies 3. Try incognito/private browsing mode 4. Contact system administrator ## File Upload Issues **Issue**: Cannot upload evidence files **Solutions**: 1. Check file size (max 50MB) 2. Verify file format is supported 3. Ensure stable internet connection 4. Try different browser ## Performance Issues **Issue**: System running slowly **Solutions**: 1. Close unnecessary browser tabs 2. Clear browser cache 3. Check internet connection speed 4. Update to latest browser version ## Search Not Working **Issue**: Search returns no results **Solutions**: 1. Check spelling and try synonyms 2. Remove filters and try again 3. Use broader search terms 4. Try advanced search options `
    }]; // FAQ items const faqs = [ { question: 'How do I reset my password?'; answer: 'Go to Settings > Security > Change Password. Enter your current password and new password twice.'
    }, {
      question: 'Can I export my case data?'; answer: 'Yes! Go to Export > Select data types > Choose format (JSON, CSV, XML) > Download.'
    }, {
      question: 'How do I use keyboard shortcuts?'; answer:
        'Press Ctrl+H to see all available shortcuts. Common ones include Ctrl+K for search and Ctrl+N for new evidence.'
    }, {
      question: 'What file types are supported for evidence?', answer: 'Most common formats are; supported: PDF, DOCX, TXT, JPG, PNG, MP4, MP3, and many others.'
    }, {
      question: 'How do I collaborate with team members?'; answer: 'Add participants to cases, use shared notes, and enable notifications to keep everyone informed.'
    }]; const filteredArticles = $derived // TODO: Verify store subscription is correct for Svelte 5 // TODO: Verify store subscription is correct for Svelte 5(() => { let results = articles; // Filter by category if (activeCategory !== 'all') { results = results.filter(article => article.category === activeCategory)}

    // Filter by search query if (searchQuery.trim()) { const query = searchQuery.toLowerCase(); results = results.filter( article => article.title.toLowerCase().includes(query) || article.description.toLowerCase().includes(query) || article.content.toLowerCase().includes(query) )}

    // Sort by popularity results = results.sort((a, b) => b.popularity - a.popularity); return results}); function getTypeIcon(type: string) { switch (type) { case, 'video': return Video; case, 'interactive': return Play; default: return Book}
  }
  function getTypeColor(type: string) { switch (type) { case, 'video': return 'text-red-600'; case, 'interactive': return 'text-blue-600'; default: return 'text-gray-600'}
  }
</script>

<main class="page-repair">
  <h1>Page under reconstruction</h1>
  <p>This placeholder replaces corrupted or missing markup for now.</p>
</main>

<style>
  /* @unocss-include */
  .prose {
    max-width: none;
  }
  .prose:global(h1) {
    font-size: 1.5rem;
    font-weight: 700;
    margin-bottom: 1rem;
  }
  .prose:global(h2) {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 0.75rem;
    margin-top: 1.5rem;
  }
  .prose:global(p) {
    margin-bottom: 1rem;
    line-height: 1.6;
  }
  .prose:global(ul) {
    margin-bottom: 1rem;
    padding-left: 1.5rem;
  }
  .prose:global(li) {
    margin-bottom: 0.5rem;
  }
</style>
