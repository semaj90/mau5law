<script lang="ts">
  import { page } from '$app/stores';
  import { browser } from '$app/environment';
  import { ThemeProvider } from '$lib/components/ui/enhanced-bits';
  import NavBar from '$lib/components/layout/NavBar.svelte';
  import Footer from '$lib/components/layout/Footer.svelte';

  interface Props {
    data: {
      user?: unknown;
      session?: unknown;
    };
    children: any;
  }

  let { data, children }: Props = $props();

  let currentPath = $derived($page.url.pathname);
  let isLandingPage = $derived(currentPath === '/' || currentPath === '/home');
  let isDemoPage = $derived(currentPath.startsWith('/demo'));
  let isShowcasePage = $derived(currentPath.startsWith('/showcase'));
  let sidebarOpen = $state(false);

  // Determine theme based on route
  const pageTheme = $derived(() => {
    if (isDemoPage) return 'yorha';
    if (isShowcasePage) return 'gaming';
    return 'legal';
  });
</script>

<ThemeProvider theme={pageTheme()}>
  <!-- Public pages navbar with full variant -->
  <NavBar
    user={data.user}
    bind:sidebarOpen
    variant="full"
  />

  {#if isLandingPage}
    <!-- Landing page hero layout -->
    <main class="landing-layout">
      <div class="hero-section">
        <div class="hero-content">
          <div class="hero-text">
            <h1 class="hero-title">
              <span class="gradient-text">YoRHa Legal AI</span>
            </h1>
            <p class="hero-subtitle">
              Advanced Legal Intelligence Platform powered by Neural Networks
            </p>
            <div class="hero-features">
              <div class="feature-item">
                <span class="feature-icon">🤖</span>
                <span>AI-Powered Analysis</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">⚖️</span>
                <span>Legal Expertise</span>
              </div>
              <div class="feature-item">
                <span class="feature-icon">🔍</span>
                <span>Evidence Management</span>
              </div>
            </div>
            <div class="hero-actions">
              <a href="/auth/register" class="btn-primary">Get Started</a>
              <a href="/demo" class="btn-secondary">View Demo</a>
            </div>
          </div>
          <div class="hero-visual">
            <div class="neural-network">
              <div class="network-node node-1"></div>
              <div class="network-node node-2"></div>
              <div class="network-node node-3"></div>
              <div class="network-connection connection-1"></div>
              <div class="network-connection connection-2"></div>
              <div class="network-connection connection-3"></div>
            </div>
          </div>
        </div>
      </div>

      <div class="content-section">
        {@render children?.()}
      </div>
    </main>
  {:else}
    <!-- Standard public layout -->
    <main class="public-layout">
      <div class="public-container">
        <div class="public-content">
          {@render children?.()}
        </div>
      </div>
    </main>
  {/if}

  <!-- Footer for all public pages -->
  <Footer />
</ThemeProvider>

<style>
  .landing-layout {
    min-height: calc(100vh - 60px);
  }

  .hero-section {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    min-height: 600px;
    display: flex;
    align-items: center;
    padding: 4rem 2rem;
    position: relative;
    overflow: hidden;
  }

  .hero-content {
    max-width: 1200px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 4rem;
    align-items: center;
  }

  .hero-text {
    color: white;
  }

  .hero-title {
    font-size: 3.5rem;
    font-weight: 800;
    line-height: 1.1;
    margin-bottom: 1.5rem;
  }

  .gradient-text {
    background: linear-gradient(45deg, #FBD38D, #F6E05E, #68D391);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-size: 200% 200%;
    animation: gradient-shift 3s ease-in-out infinite;
  }

  .hero-subtitle {
    font-size: 1.25rem;
    line-height: 1.6;
    margin-bottom: 2rem;
    opacity: 0.9;
  }

  .hero-features {
    display: flex;
    gap: 2rem;
    margin-bottom: 3rem;
  }

  .feature-item {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-size: 0.875rem;
    font-weight: 500;
  }

  .feature-icon {
    font-size: 1.25rem;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
  }

  .btn-primary {
    background: linear-gradient(45deg, #4A90E2, #357ABD);
    color: white;
    padding: 0.875rem 2rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(74, 144, 226, 0.4);
  }

  .btn-primary:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(74, 144, 226, 0.6);
  }

  .btn-secondary {
    background: rgba(255, 255, 255, 0.1);
    color: white;
    padding: 0.875rem 2rem;
    border-radius: 0.5rem;
    text-decoration: none;
    font-weight: 600;
    border: 2px solid rgba(255, 255, 255, 0.3);
    transition: all 0.3s ease;
    backdrop-filter: blur(10px);
  }

  .btn-secondary:hover {
    background: rgba(255, 255, 255, 0.2);
    border-color: rgba(255, 255, 255, 0.5);
    transform: translateY(-2px);
  }

  .hero-visual {
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .neural-network {
    position: relative;
    width: 300px;
    height: 300px;
  }

  .network-node {
    position: absolute;
    width: 60px;
    height: 60px;
    border-radius: 50%;
    background: linear-gradient(45deg, #FBD38D, #F6E05E);
    box-shadow: 0 4px 20px rgba(251, 211, 141, 0.4);
    animation: node-pulse 2s ease-in-out infinite;
  }

  .node-1 {
    top: 20%;
    left: 20%;
    animation-delay: 0s;
  }

  .node-2 {
    top: 60%;
    left: 60%;
    animation-delay: 0.5s;
  }

  .node-3 {
    bottom: 20%;
    right: 20%;
    animation-delay: 1s;
  }

  .network-connection {
    position: absolute;
    height: 2px;
    background: linear-gradient(90deg, transparent, #FBD38D, transparent);
    animation: connection-flow 3s ease-in-out infinite;
  }

  .connection-1 {
    top: 35%;
    left: 25%;
    width: 150px;
    transform: rotate(45deg);
  }

  .connection-2 {
    top: 55%;
    left: 40%;
    width: 100px;
    transform: rotate(-30deg);
    animation-delay: 1s;
  }

  .connection-3 {
    bottom: 35%;
    right: 35%;
    width: 120px;
    transform: rotate(135deg);
    animation-delay: 2s;
  }

  .content-section {
    padding: 4rem 2rem;
    background: var(--color-bg-primary, #FFFFFF);
  }

  .public-layout {
    min-height: calc(100vh - 120px);
    background: var(--color-bg-primary, #F8FAFC);
  }

  .public-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 2rem;
  }

  .public-content {
    background: var(--color-surface, #FFFFFF);
    border-radius: 1rem;
    padding: 2rem;
    box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
  }

  @keyframes gradient-shift {
    0%, 100% {
      background-position: 0% 50%;
    }
    50% {
      background-position: 100% 50%;
    }
  }

  @keyframes node-pulse {
    0%, 100% {
      transform: scale(1);
      opacity: 0.8;
    }
    50% {
      transform: scale(1.1);
      opacity: 1;
    }
  }

  @keyframes connection-flow {
    0% {
      opacity: 0.3;
    }
    50% {
      opacity: 1;
    }
    100% {
      opacity: 0.3;
    }
  }

  @media (max-width: 768px) {
    .hero-content {
      grid-template-columns: 1fr;
      text-align: center;
      gap: 2rem;
    }

    .hero-title {
      font-size: 2.5rem;
    }

    .hero-features {
      flex-direction: column;
      gap: 1rem;
    }

    .hero-actions {
      flex-direction: column;
    }

    .neural-network {
      width: 200px;
      height: 200px;
    }

    .network-node {
      width: 40px;
      height: 40px;
    }

    .public-container {
      padding: 1rem;
    }

    .public-content {
      padding: 1.5rem;
    }
  }
</style>