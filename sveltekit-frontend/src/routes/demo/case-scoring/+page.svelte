<!--
  Demo page for Case Scoring Dashboard
  Uses mock data to demonstrate functionality
-->

<script lang="ts">
  import CaseScoringDashboard from '$lib/components/ai/CaseScoringDashboard.svelte';
</script>

<svelte:head>
  <title>Case Scoring Dashboard Demo - Legal AI Platform</title>
  <meta name="description" content="Interactive demo of AI-powered case scoring and risk analysis" />
</svelte:head>

<div class="demo-page">
  <div class="demo-header">
    <h1>Case Scoring Dashboard Demo</h1>
    <p class="demo-description">
      This demo showcases the AI-powered case scoring system with realistic mock data.
      The dashboard analyzes case risk factors, provides scoring algorithms, and generates
      actionable recommendations for legal professionals.
    </p>
    
    <div class="demo-features">
      <h2>Features Demonstrated:</h2>
      <ul>
        <li>✅ Real-time case scoring with confidence levels</li>
        <li>✅ Interactive filtering by risk level and priority</li>
        <li>✅ Detailed factor analysis and recommendations</li>
        <li>✅ Responsive design with Svelte 5 runes</li>
        <li>✅ Modal dialogs for detailed case analysis</li>
        <li>✅ Mock data simulation with realistic legal scenarios</li>
      </ul>
    </div>
  </div>

  <main class="demo-content">
    <CaseScoringDashboard />
  </main>

  <footer class="demo-footer">
    <p>
      <strong>Note:</strong> This is a demonstration using mock data. 
      Real implementation would connect to AI scoring APIs and case management systems.
    </p>
  </footer>
</div>

<style>
  .demo-page {
    min-height: 100vh;
    background: linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%);
  }

  .demo-header {
    background: white;
    border-bottom: 1px solid #e2e8f0;
    padding: 2rem;
    margin-bottom: 2rem;
  }

  .demo-header h1 {
    font-size: 2.5rem;
    font-weight: 700;
    color: #1e293b;
    margin: 0 0 1rem 0;
    text-align: center;
  }

  .demo-description {
    font-size: 1.125rem;
    color: #475569;
    text-align: center;
    max-width: 800px;
    margin: 0 auto 2rem auto;
    line-height: 1.6;
  }

  .demo-features {
    max-width: 600px;
    margin: 0 auto;
    background: #f8fafc;
    padding: 1.5rem;
    border-radius: 0.75rem;
    border: 1px solid #e2e8f0;
  }

  .demo-features h2 {
    font-size: 1.25rem;
    font-weight: 600;
    color: #1e293b;
    margin: 0 0 1rem 0;
  }

  .demo-features ul {
    list-style: none;
    padding: 0;
    margin: 0;
  }

  .demo-features li {
    padding: 0.5rem 0;
    font-size: 0.875rem;
    color: #475569;
  }

  .demo-content {
    max-width: 100%;
    padding: 0 1rem;
  }

  .demo-footer {
    margin-top: 3rem;
    padding: 2rem;
    text-align: center;
    background: white;
    border-top: 1px solid #e2e8f0;
  }

  .demo-footer p {
    color: #64748b;
    font-size: 0.875rem;
    margin: 0;
  }

  @media (max-width: 768px) {
    .demo-header {
      padding: 1rem;
    }
    
    .demo-header h1 {
      font-size: 1.875rem;
    }
    
    .demo-description {
      font-size: 1rem;
    }
    
    .demo-features {
      margin: 1rem;
      padding: 1rem;
    }
  }
</style>