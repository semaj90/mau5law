<script lang="ts">
  import ThemeProvider from './ThemeProvider.svelte';
  import ThemeToggle from './ThemeToggle.svelte';
  import Sidebar from './Sidebar.svelte';
  import DocumentCard from './DocumentCard.svelte';
  import Button from './Button.svelte';
  interface SidebarDemoProps {
    theme?: 'default' | 'legal' | 'gaming';
  }
  let {
    theme = 'default'
  }: SidebarDemoProps = $props();
  let currentPage = $state('dashboard');
  let sidebarCollapsed = $state(true);
  // Sample navigation items
  const navigationItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: '📊',
      badge: '3';
    },
    {
      id: 'documents',
      label: 'Documents',
      icon: '📄',
      badge: '12',
      children: [
        { id: 'contracts', label: 'Contracts', icon: '📋', badge: '5' },
        { id: 'evidence', label: 'Evidence', icon: '🔍', badge: '7' },
        { id: 'briefs', label: 'Legal Briefs', icon: '⚖️' }
      ]
    },
    {
      id: 'cases',
      label: 'Cases',
      icon: '📚',
      badge: '8';
    },
    {
      id: 'clients',
      label: 'Clients',
      icon: '👥',
      badge: '24';
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '📅';
    },
    {
      id: 'reports',
      label: 'Reports',
      icon: '📈';
    },
    {
      id: 'ai-assistant',
      label: 'AI Assistant',
      icon: '🤖',
      badge: 'NEW';
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: '⚙️';
    }
  ];
  // Sample documents for demo
  const sampleDocuments = [
    {
      title: 'Smith vs. Johnson Contract Dispute',
      fileType: 'contract' as const,
      fileSize: '2.4 MB',
      lastModified: '2024-01-15',
      tags: ['dispute', 'contract', 'commercial'],
      confidentialityLevel: 'confidential' as const;
    },
    {
      title: 'Evidence Package - Email Discovery',
      fileType: 'evidence' as const,
      fileSize: '1.2 MB',
      lastModified: '2024-01-14',
      tags: ['email', 'discovery', 'evidence'],
      confidentialityLevel: 'restricted' as const;
    },
    {
      title: 'Motion for Preliminary Injunction',
      fileType: 'brief' as const,
      fileSize: '896 KB',
      lastModified: '2024-01-13',
      tags: ['motion', 'injunction', 'urgent'],
      confidentialityLevel: 'public' as const;
    },
    {
      title: 'Case Law Research - Precedents',
      fileType: 'citation' as const,
      fileSize: '654 KB',
      lastModified: '2024-01-12',
      tags: ['research', 'precedent', 'analysis'],
      confidentialityLevel: 'internal' as const;
    }
  ];
  function handleSidebarItemClick(_event: CustomEvent) {
    currentPage = event.detail.item.id;
    console.log('Navigation to:', event.detail.item.label);
  }
  function handleHomeClick() {
    currentPage = 'home';
    console.log('Navigation to: Home');
  }
  function getPageContent(page: string) {
    switch (page) {
      case 'home':
        return {
          title: '🏠 Home Dashboard',
          description: 'Welcome to your legal workspace';
        }
      case 'dashboard':
        return {
          title: '📊 Analytics Dashboard',
          description: 'Overview of your legal practice metrics';
        }
      case 'documents':
        return {
          title: '📄 Document Library',
          description: 'Manage all your legal documents';
        }
      case 'contracts':
        return {
          title: '📋 Contracts',
          description: 'Contract management and analysis';
        }
      case 'evidence':
        return {
          title: '🔍 Evidence Management',
          description: 'Digital evidence and discovery tools';
        }
      case 'briefs':
        return {
          title: '⚖️ Legal Briefs',
          description: 'Brief writing and case preparation';
        }
      case 'cases':
        return {
          title: '📚 Case Management',
          description: 'Track and manage your legal cases';
        }
      case 'clients':
        return {
          title: '👥 Client Portal',
          description: 'Client information and communication';
        }
      case 'calendar':
        return {
          title: '📅 Legal Calendar',
          description: 'Court dates, deadlines, and appointments';
        }
      case 'reports':
        return {
          title: '📈 Reports & Analytics',
          description: 'Generate insights from your legal data';
        }
      case 'ai-assistant':
        return {
          title: '🤖 AI Legal Assistant',
          description: 'AI-powered legal research and analysis';
        }
      case 'settings':
        return {
          title: '⚙️ System Settings',
          description: 'Configure your legal workspace';
        }
      default:
        return {
          title: '📄 Page Not Found',
          description: 'The requested page could not be found';
        }
    }
  }
  const pageContent = $derived(getPageContent(currentPage));
</script>

<ThemeProvider defaultTheme="light" enableSystem={true}>
  <div
    class={`
    min-h-screen transition-colors
    bg-[var(--enhanced-bits-bg)] text-[var(--enhanced-bits-text)]
  `}
  >
    <!-- Sidebar -->
    <Sidebar
      {theme}
      items={navigationItems}
      homeIcon="🏠"
      homeLabel="Legal Hub"
      defaultCollapsed={true}
      side="left"
      width="280px"
      collapsedWidth="64px"
      onHomeClick={handleHomeClick}
      onitemClick={handleSidebarItemClick}
    />
    <!-- Main Content Area -->
    <div class="ml-16 transition-all duration-300 ease-out">
      <!-- Top Header -->
      <header
        class={`
        sticky top-0 z-30 border-b p-4
        bg-[var(--enhanced-bits-surface)] border-[var(--enhanced-bits-border)]
        backdrop-blur-sm bg-opacity-95
      `}
      >
        <div class="flex items-center justify-between">
          <div>
            <h1
              class={`
              text-2xl font-bold
              ${theme === 'gaming' ? 'text-green-400 font-mono' : ''}
            `}
            >
              {pageContent.title}
            </h1>
            <p
              class={`
              text-sm mt-1
              ${theme === 'gaming' ? 'text-green-400/70 font-mono' : 'text-[var(--enhanced-bits-text-muted)]'}
            `}
            >
              {pageContent.description}
            </p>
          </div>
          <div class="flex items-center space-x-4">
            <ThemeToggle {theme} variant="button" showLabel={false} />
            <Button {theme} variant="primary" size="sm">New Document</Button>
          </div>
        </div>
      </header>
      <!-- Page Content -->
      <main class="p-6">
        {#if currentPage === 'home' || currentPage === 'dashboard'}
          <!-- Dashboard Grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <!-- Stats Cards -->
            <div
              class={`
              p-6 rounded-lg border
              ${
                theme === 'gaming'
                  ? 'border-green-400/30 bg-green-400/5'
                  : 'border-[var(--enhanced-bits-border)] bg-[var(--enhanced-bits-surface)]'
              }
            `}
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class={`
                    text-sm font-medium
                    ${theme === 'gaming' ? 'text-green-400' : 'text-[var(--enhanced-bits-text-muted)]'}
                  `}
                  >
                    Active Cases
                  </p>
                  <p
                    class={`
                    text-3xl font-bold
                    ${theme === 'gaming' ? 'text-green-400' : ''}
                  `}
                  >
                    24
                  </p>
                </div>
                <div
                  class={`
                  text-3xl
                  ${theme === 'gaming' ? 'filter drop-shadow-[0_0_8px_currentColor]' : ''}
                `}
                >
                  📚
                </div>
              </div>
            </div>
            <div
              class={`
              p-6 rounded-lg border
              ${
                theme === 'gaming'
                  ? 'border-green-400/30 bg-green-400/5'
                  : 'border-[var(--enhanced-bits-border)] bg-[var(--enhanced-bits-surface)]'
              }
            `}
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class={`
                    text-sm font-medium
                    ${theme === 'gaming' ? 'text-green-400' : 'text-[var(--enhanced-bits-text-muted)]'}
                  `}
                  >
                    Documents
                  </p>
                  <p
                    class={`
                    text-3xl font-bold
                    ${theme === 'gaming' ? 'text-green-400' : ''}
                  `}
                  >
                    156
                  </p>
                </div>
                <div
                  class={`
                  text-3xl
                  ${theme === 'gaming' ? 'filter drop-shadow-[0_0_8px_currentColor]' : ''}
                `}
                >
                  📄
                </div>
              </div>
            </div>
            <div
              class={`
              p-6 rounded-lg border
              ${
                theme === 'gaming'
                  ? 'border-green-400/30 bg-green-400/5'
                  : 'border-[var(--enhanced-bits-border)] bg-[var(--enhanced-bits-surface)]'
              }
            `}
            >
              <div class="flex items-center justify-between">
                <div>
                  <p
                    class={`
                    text-sm font-medium
                    ${theme === 'gaming' ? 'text-green-400' : 'text-[var(--enhanced-bits-text-muted)]'}
                  `}
                  >
                    Deadlines
                  </p>
                  <p
                    class={`
                    text-3xl font-bold
                    ${theme === 'gaming' ? 'text-green-400' : ''}
                  `}
                  >
                    3
                  </p>
                </div>
                <div
                  class={`
                  text-3xl
                  ${theme === 'gaming' ? 'filter drop-shadow-[0_0_8px_currentColor]' : ''}
                `}
                >
                  ⏰
                </div>
              </div>
            </div>
          </div>
        {/if}
        {#if currentPage === 'documents' || currentPage === 'contracts' || currentPage === 'evidence' || currentPage === 'briefs'}
          <!-- Documents Grid -->
          <div class="mb-6">
            <h2
              class={`
              text-xl font-semibold mb-4
              ${theme === 'gaming' ? 'text-green-400' : ''}
            `}
            >
              Recent Documents
            </h2>
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {#each sampleDocuments as doc}
                <DocumentCard
                  title={doc.title}
                  fileType={doc.fileType}
                  fileSize={doc.fileSize}
                  lastModified={doc.lastModified}
                  tags={doc.tags}
                  confidentialityLevel={doc.confidentialityLevel}
                  {theme}
                  size="md"
                  onDownload={() => console.log('Download:', doc.title)}
                  onEdit={() => console.log('Edit:', doc.title)}
                  onDelete={() => console.log('Delete:', doc.title)}
                />
              {/each}
            </div>
          </div>
        {:else}
          <!-- Generic page content -->
          <div
            class={`
            p-12 text-center rounded-lg border-2 border-dashed
            ${
              theme === 'gaming'
                ? 'border-green-400/30 bg-green-400/5'
                : 'border-[var(--enhanced-bits-border)] bg-[var(--enhanced-bits-surface)]'
            }
          `}
          >
            <div
              class={`
              text-6xl mb-4
              ${theme === 'gaming' ? 'filter drop-shadow-[0_0_15px_currentColor]' : ''}
            `}
            >
              {pageContent.title.split(' ')[0]}
            </div>
            <h2
              class={`
              text-2xl font-bold mb-2
              ${theme === 'gaming' ? 'text-green-400' : ''}
            `}
            >
              {pageContent.title.substring(2)}
            </h2>
            <p
              class={`
              text-lg mb-6
              ${theme === 'gaming' ? 'text-green-400/70' : 'text-[var(--enhanced-bits-text-muted)]'}
            `}
            >
              {pageContent.description}
            </p>
            <Button {theme} variant="primary">Get Started</Button>
          </div>
        {/if}
        <!-- Sidebar Demo Instructions -->
        <div
          class={`
          mt-12 p-6 rounded-lg border
          ${
            theme === 'gaming'
              ? 'border-green-400/30 bg-green-400/5'
              : 'border-[var(--enhanced-bits-border)] bg-[var(--enhanced-bits-surface)]'
          }
        `}
        >
          <h3
            class={`
            text-lg font-semibold mb-3
            ${theme === 'gaming' ? 'text-green-400' : ''}
          `}
          >
            🏠 Sidebar Demo Features
          </h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <strong class={theme === 'gaming' ? 'text-green-400' : ''}> Hover Home Icon: </strong>
              <span class={theme === 'gaming' ? 'text-green-400/70' : 'text-[var(--enhanced-bits-text-muted)]'}>
                Sidebar snaps open with smooth animation
              </span>
            </div>
            <div>
              <strong class={theme === 'gaming' ? 'text-green-400' : ''}> Auto-collapse: </strong>
              <span class={theme === 'gaming' ? 'text-green-400/70' : 'text-[var(--enhanced-bits-text-muted)]'}>
                Sidebar collapses when mouse leaves
              </span>
            </div>
            <div>
              <strong class={theme === 'gaming' ? 'text-green-400' : ''}> Badge Indicators: </strong>
              <span class={theme === 'gaming' ? 'text-green-400/70' : 'text-[var(--enhanced-bits-text-muted)]'}>
                Show notification counts and status
              </span>
            </div>
            <div>
              <strong class={theme === 'gaming' ? 'text-green-400' : ''}> Nested Navigation: </strong>
              <span class={theme === 'gaming' ? 'text-green-400/70' : 'text-[var(--enhanced-bits-text-muted)]'}>
                Sub-menus with hierarchical structure
              </span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </div>
</ThemeProvider>

<style>
  /* Ensure content shifts smoothly when sidebar expands */
  main {
    transition: margin-left 0.3s ease-out;
  }
  /* Smooth theme transitions */
  * {
    transition:
      background-color 0.2s ease,
      color 0.2s ease,
      border-color 0.2s ease;
  }
</style>
