<!--
  NESMemoryArchitectureExample.svelte
  
  Demonstrates the complete NES Memory Architecture implementation
  Shows practical usage of priority-based memory banking and cache warming
-->

<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { browser } from '$app/environment';
  import Button from '$lib/components/ui/enhanced-bits/Button.svelte';
  import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
  import SSRWebGPULoader from '$lib/components/ui/enhanced-bits/SSRWebGPULoader.svelte';
  
  // NES Memory Architecture imports
  import { 
    calculateDocumentPriority, 
    selectMemoryBank,
    analyzePriority,
    type LegalDocument,
    LEGAL_PRIORITY_WEIGHTS,
    NES_MEMORY_MAP 
  } from '$lib/config/legal-priorities';
  import { componentTextureRegistry } from '$lib/registry/texture-component-registry';
  import { LegalCacheWarmer, WARMING_STRATEGIES, type UserProfile, type CaseContext } from '$lib/services/cache-warmer';
  
  // Demo data
  let cacheWarmer: LegalCacheWarmer;
  let isInitialized = false;
  let registryStats: any = {};
  let warmingStats: any = {};
  let memoryBankData: any = {};
  let isWarming = false;
  let lastWarmingResult: any = null;
  
  // Sample legal documents for demo
  const sampleDocuments: LegalDocument[] = [
    {
      id: 'contract_2024_001',
      type: 'contracts',
      category: 'litigation', 
      urgency: 'critical',
      complexity: 'highly_complex',
      activeReview: true,
      lastAccessed: new Date(Date.now() - 30 * 60 * 1000), // 30 minutes ago
      fileSize: 2.5 * 1024 * 1024, // 2.5MB
      isEvidenceCritical: true
    },
    {
      id: 'evidence_email_chain_042',
      type: 'evidence',
      category: 'criminal',
      urgency: 'high', 
      complexity: 'complex',
      activeReview: true,
      lastAccessed: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      fileSize: 800 * 1024, // 800KB
      isEvidenceCritical: true
    },
    {
      id: 'motion_summary_judgment',
      type: 'motions',
      category: 'litigation',
      urgency: 'medium',
      complexity: 'moderate',
      activeReview: false,
      lastAccessed: new Date(Date.now() - 24 * 60 * 60 * 1000), // 1 day ago
      fileSize: 1.2 * 1024 * 1024, // 1.2MB
      isEvidenceCritical: false
    },
    {
      id: 'correspondence_client_001',
      type: 'correspondence', 
      category: 'corporate',
      urgency: 'low',
      complexity: 'simple',
      activeReview: false,
      lastAccessed: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 1 week ago
      fileSize: 150 * 1024, // 150KB
      isEvidenceCritical: false
    }
  ];
  
  // Sample user profile
  const userProfile: UserProfile = {
    userId: 'legal_user_001',
    practiceAreas: ['litigation', 'criminal', 'corporate'],
    recentCases: ['case_2024_015', 'case_2024_009'],
    preferredDocumentTypes: ['contracts', 'evidence', 'motions'],
    workingStyle: 'litigator',
    memoryPreference: 'performance'
  };
  
  // Sample case context
  const caseContext: CaseContext = {
    caseId: 'case_2024_015',
    caseType: 'litigation',
    urgency: 'high',
    documents: sampleDocuments,
    relatedCases: ['case_2024_009', 'case_2024_012'],
    upcomingDeadlines: [
      new Date(Date.now() + 2 * 24 * 60 * 60 * 1000), // 2 days from now
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)  // 1 week from now
    ]
  };
  
  // Component priorities for demo
  $: documentPriorities = sampleDocuments.map(doc => ({
    document: doc,
    priority: calculateDocumentPriority(doc),
    memoryBank: selectMemoryBank(calculateDocumentPriority(doc)),
    analysis: analyzePriority(doc)
  }));
  
  onMount(async () => {
    if (!browser) return;
    
    try {
      console.log('🎮 Initializing NES Memory Architecture Demo...');
      
      // Initialize cache warmer
      cacheWarmer = new LegalCacheWarmer();
      
      // Register this demo component with texture registry
      const registered = componentTextureRegistry.register('NESMemoryDemo', {
        componentName: 'NESMemoryDemo',
        textureSlots: ['demo_texture_1', 'demo_texture_2'],
        memoryBank: 'CHR_ROM', // Medium priority component
        sharingPolicy: 'shared',
        updateFrequency: 'periodic',
        priority: 150,
        estimatedUsage: 512 * 1024 // 512KB
      });
      
      if (registered) {
        console.log('✅ Demo component registered successfully');
        isInitialized = true;
        
        // Start periodic stats updates
        updateStats();
        const statsInterval = setInterval(updateStats, 2000);
        
        // Cleanup on destroy
        return () => {
          clearInterval(statsInterval);
          componentTextureRegistry.unregister('NESMemoryDemo');
        };
      } else {
        console.error('❌ Failed to register demo component');
      }
      
    } catch (error) {
      console.error('❌ Demo initialization failed:', error);
    }
  });
  
  function updateStats() {
    if (!isInitialized) return;
    
    registryStats = componentTextureRegistry.getStats();
    warmingStats = cacheWarmer?.getWarmingStats() || {};
    
    // Create memory bank visualization data
    memoryBankData = Object.entries(NES_MEMORY_MAP).map(([bank, config]) => {
      const stats = registryStats.memoryBanks?.[bank];
      return {
        bank,
        config,
        stats,
        utilizationPercent: stats ? (stats.usedSize / stats.totalSize) * 100 : 0
      };
    });
  }
  
  async function triggerCacheWarming(strategyName: string) {
    if (!cacheWarmer || isWarming) return;
    
    isWarming = true;
    
    try {
      console.log(`🎮 Starting cache warming with strategy: ${strategyName}`);
      
      // Override strategy for demo
      const strategy = WARMING_STRATEGIES[strategyName];
      if (!strategy) {
        throw new Error(`Unknown strategy: ${strategyName}`);
      }
      
      const result = await cacheWarmer.warmCacheForSession(userProfile, {
        ...caseContext,
        urgency: strategyName === 'litigation_emergency' ? 'critical' : caseContext.urgency
      });
      
      lastWarmingResult = result;
      console.log('✅ Cache warming completed:', result);
      
    } catch (error) {
      console.error('❌ Cache warming failed:', error);
    } finally {
      isWarming = false;
    }
  }
  
  function getMemoryBankColor(bank: string): string {
    const colors = {
      'INTERNAL_RAM': '#00d800',  // Green - fastest
      'CHR_ROM': '#3cbcfc',      // Blue - fast  
      'PRG_ROM': '#fc9838',      // Orange - medium
      'SAVE_RAM': '#7c7c7c'      // Gray - slow
    };
    return colors[bank as keyof typeof colors] || '#000';
  }
  
  function getPriorityColor(priority: number): string {
    if (priority >= 200) return '#ff0000'; // Red - critical
    if (priority >= 150) return '#ff8800'; // Orange - high
    if (priority >= 100) return '#ffff00'; // Yellow - medium
    return '#888888'; // Gray - low
  }
</script>

<div class="nes-container with-title">
  <p class="title">🎮 NES Memory Architecture Demo</p>
  
  {#if !isInitialized}
    <div class="loading-state">
      <p>⚡ Initializing NES Memory System...</p>
    </div>
  {:else}
    
    <!-- Document Priority Analysis -->
    <div class="demo-section">
      <Card>
        <CardHeader>
          <CardTitle>📊 Document Priority Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="priority-grid">
            {#each documentPriorities as item}
              <div class="priority-card" style:border-color={getPriorityColor(item.priority)}>
                <div class="document-header">
                  <h4>{item.document.type}</h4>
                  <span class="priority-score" style:background={getPriorityColor(item.priority)}>
                    {item.priority}
                  </span>
                </div>
                
                <div class="document-details">
                  <p><strong>Category:</strong> {item.document.category}</p>
                  <p><strong>Urgency:</strong> {item.document.urgency}</p>
                  <p><strong>Memory Bank:</strong> 
                    <span style:color={getMemoryBankColor(item.memoryBank)}>
                      {item.memoryBank}
                    </span>
                  </p>
                  <p><strong>Active Review:</strong> {item.document.activeReview ? '✅' : '❌'}</p>
                </div>
                
                <!-- Texture preview -->
                <div class="texture-preview">
                  <SSRWebGPULoader
                    assetId={item.document.id}
                    width={48}
                    height={48}
                    viewportDistance={item.priority > 150 ? 20 : 60}
                    enableGPU={true}
                  />
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Memory Bank Visualization -->
    <div class="demo-section">
      <Card>
        <CardHeader>
          <CardTitle>🧠 NES Memory Bank Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="memory-banks">
            {#each memoryBankData as bankData}
              <div class="memory-bank">
                <div class="bank-header">
                  <h4 style:color={getMemoryBankColor(bankData.bank)}>
                    {bankData.bank}
                  </h4>
                  <span class="bank-speed">{bankData.config.speed}</span>
                </div>
                
                <div class="bank-stats">
                  <div class="stat-row">
                    <span>Size:</span>
                    <span>{bankData.config.size === Infinity ? '∞' : `${(bankData.config.size / (1024*1024)).toFixed(1)}MB`}</span>
                  </div>
                  <div class="stat-row">
                    <span>Used:</span>
                    <span>{bankData.stats ? `${(bankData.stats.usedSize / 1024).toFixed(1)}KB` : '0KB'}</span>
                  </div>
                  <div class="stat-row">
                    <span>Components:</span>
                    <span>{bankData.stats?.componentCount || 0}</span>
                  </div>
                </div>
                
                <div class="utilization-bar">
                  <div 
                    class="utilization-fill" 
                    style:width="{Math.min(100, bankData.utilizationPercent)}%"
                    style:background={getMemoryBankColor(bankData.bank)}
                  ></div>
                </div>
                
                <div class="bank-description">
                  {bankData.config.description}
                </div>
              </div>
            {/each}
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Cache Warming Controls -->
    <div class="demo-section">
      <Card>
        <CardHeader>
          <CardTitle>🔥 Cache Warming Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="warming-strategies">
            {#each Object.entries(WARMING_STRATEGIES) as [strategyKey, strategy]}
              <div class="strategy-card">
                <h4>{strategy.name}</h4>
                <p>{strategy.description}</p>
                
                <div class="strategy-details">
                  <div class="detail-row">
                    <span>Priority Threshold:</span>
                    <span>{strategy.priorityThreshold}</span>
                  </div>
                  <div class="detail-row">
                    <span>Max Documents:</span>
                    <span>{strategy.maxDocuments}</span>
                  </div>
                  <div class="detail-row">
                    <span>Memory Budget:</span>
                    <span>{(strategy.memoryBudget / 1024).toFixed(1)}KB</span>
                  </div>
                  <div class="detail-row">
                    <span>LOD Levels:</span>
                    <span>{strategy.preloadLODs.join(', ')}</span>
                  </div>
                </div>
                
                <Button 
                  on:click={() => triggerCacheWarming(strategyKey)}
                  disabled={isWarming}
                >
                  {isWarming ? '⚡ Warming...' : 'Start Warming'}
                </Button>
              </div>
            {/each}
          </div>
          
          {#if lastWarmingResult}
            <div class="warming-result">
              <h4>🎯 Last Warming Result</h4>
              <div class="result-stats">
                <div class="stat">
                  <span>Documents Processed:</span>
                  <span>{lastWarmingResult.documentsProcessed}</span>
                </div>
                <div class="stat">
                  <span>Textures Loaded:</span>
                  <span>{lastWarmingResult.texturesLoaded}</span>
                </div>
                <div class="stat">
                  <span>Memory Used:</span>
                  <span>{(lastWarmingResult.memoryUsed / 1024).toFixed(1)}KB</span>
                </div>
                <div class="stat">
                  <span>Processing Time:</span>
                  <span>{lastWarmingResult.processingTime.toFixed(2)}ms</span>
                </div>
                <div class="stat">
                  <span>Hit Rate Improvement:</span>
                  <span>{(lastWarmingResult.cacheHitRateImprovement * 100).toFixed(1)}%</span>
                </div>
                <div class="stat">
                  <span>Strategy:</span>
                  <span>{lastWarmingResult.strategy.name}</span>
                </div>
              </div>
              
              {#if lastWarmingResult.warnings.length > 0}
                <div class="warnings">
                  <h5>⚠️ Warnings:</h5>
                  {#each lastWarmingResult.warnings as warning}
                    <p class="warning">{warning}</p>
                  {/each}
                </div>
              {/if}
            </div>
          {/if}
        </CardContent>
      </Card>
    </div>
    
    <!-- Registry Statistics -->
    <div class="demo-section">
      <Card>
        <CardHeader>
          <CardTitle>📈 Registry Performance Stats</CardTitle>
        </CardHeader>
        <CardContent>
          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-label">Active Components</div>
              <div class="stat-value">{registryStats.activeComponents || 0}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Total Textures</div>
              <div class="stat-value">{registryStats.totalTextures || 0}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Memory Conflicts</div>
              <div class="stat-value">{registryStats.conflicts || 0}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Evictions</div>
              <div class="stat-value">{registryStats.evictions || 0}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Cache Warmings</div>
              <div class="stat-value">{warmingStats.totalWarmings || 0}</div>
            </div>
            
            <div class="stat-card">
              <div class="stat-label">Avg Processing Time</div>
              <div class="stat-value">{(warmingStats.averageProcessingTime || 0).toFixed(1)}ms</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    
  {/if}
</div>

<style>
  .nes-container {
    max-width: 1200px;
    margin: 0 auto;
    padding: 20px;
    font-family: 'Courier New', monospace;
  }
  
  .demo-section {
    margin-bottom: 24px;
  }
  
  .loading-state {
    text-align: center;
    padding: 40px;
    animation: nes-blink 1s infinite;
  }
  
  .priority-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
  }
  
  .priority-card {
    border: 2px solid;
    padding: 12px;
    background: #f8f8f8;
  }
  
  .document-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
  }
  
  .priority-score {
    color: white;
    padding: 4px 8px;
    font-weight: bold;
    font-size: 12px;
  }
  
  .document-details {
    font-size: 12px;
    margin-bottom: 12px;
  }
  
  .document-details p {
    margin: 4px 0;
  }
  
  .texture-preview {
    display: flex;
    justify-content: center;
  }
  
  .memory-banks {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 16px;
  }
  
  .memory-bank {
    border: 2px solid #000;
    padding: 12px;
    background: #fcfcfc;
  }
  
  .bank-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
  }
  
  .bank-speed {
    font-size: 10px;
    text-transform: uppercase;
    background: #000;
    color: white;
    padding: 2px 6px;
  }
  
  .bank-stats {
    margin-bottom: 12px;
  }
  
  .stat-row {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    margin: 4px 0;
  }
  
  .utilization-bar {
    height: 8px;
    background: #e0e0e0;
    border: 1px solid #000;
    margin-bottom: 8px;
  }
  
  .utilization-fill {
    height: 100%;
    transition: width 0.3s ease;
  }
  
  .bank-description {
    font-size: 10px;
    color: #666;
    font-style: italic;
  }
  
  .warming-strategies {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 16px;
    margin-bottom: 20px;
  }
  
  .strategy-card {
    border: 2px solid #000;
    padding: 12px;
    background: #fcfcfc;
  }
  
  .strategy-details {
    margin: 12px 0;
    font-size: 12px;
  }
  
  .detail-row {
    display: flex;
    justify-content: space-between;
    margin: 4px 0;
  }
  
  .warming-result {
    border-top: 2px solid #000;
    padding-top: 16px;
    margin-top: 20px;
  }
  
  .result-stats {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 8px;
    margin: 12px 0;
  }
  
  .stat {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    padding: 4px 0;
    border-bottom: 1px solid #ccc;
  }
  
  .warnings {
    margin-top: 12px;
  }
  
  .warning {
    color: #f83800;
    font-size: 12px;
    margin: 4px 0;
  }
  
  .stats-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
    gap: 12px;
  }
  
  .stat-card {
    text-align: center;
    padding: 12px;
    border: 2px solid #000;
    background: #f0f0f0;
  }
  
  .stat-label {
    font-size: 10px;
    text-transform: uppercase;
    margin-bottom: 8px;
    color: #666;
  }
  
  .stat-value {
    font-size: 18px;
    font-weight: bold;
  }
  
  @keyframes nes-blink {
    0%, 50% { opacity: 1; }
    51%, 100% { opacity: 0.6; }
  }
</style>