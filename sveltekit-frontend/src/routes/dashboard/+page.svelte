<!--
  Enhanced Dashboard Overview - Modern SvelteKit 2 + Drizzle ORM + pgvector
  Real-time analytics, vector search insights, system monitoring
-->
<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';
  // Modern UI Components
  import * as Card from '$lib/components/ui/card';
  import {
    Button
  } from '$lib/components/ui/enhanced-bits';;
  import { Progress } from '$lib/components/ui/progress';
  import { Badge } from '$lib/components/ui/badge';
  // Icons
  import { 
    TrendingUp, TrendingDown, Users, Search, 
    Database, Zap, Clock, AlertCircle,
    ChevronRight, Activity, Eye, Target,
    FileText, Shield, Cpu, BarChart3
  } from 'lucide-svelte';
  // Real-time dashboard data
  let dashboardData = $state({
    // Legal Case Metrics
    totalCases: 1247,
    activeCases: 89,
    closedCasesThisMonth: 156,
    caseGrowth: 12.5,
    // Vector Search Analytics  
    totalVectorQueries: 23589,
    avgQueryTime: 45, // ms
    searchAccuracy: 94.2,
    popularSearchTerms: [
      { term: 'contract breach', count: 456 },
      { term: 'evidence analysis', count: 389 },
      { term: 'precedent search', count: 234 },
      { term: 'liability', count: 198 }
    ],
    // AI Processing Stats
    aiTasksToday: 1834,
    aiTasksCompleted: 1756,
    aiProcessingTime: 2.3, // avg seconds
    aiAccuracy: 96.8,
    // System Health
    systemLoad: 67,
    databaseConnections: 23,
    apiResponseTime: 156, // ms
    uptime: '99.98%',
    // Recent Activity
    recentActivities: [
      {
        id: 1,
        type: 'case_created',
        title: 'New caseItem: Smith v. Johnson Contract Dispute',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 min ago
        user: 'Attorney Johnson',
        status: 'active'
      },
      {
        id: 2,
        type: 'vector_search',
        title: 'Vector search completed: "intellectual property"',
        timestamp: new Date(Date.now() - 1000 * 60 * 12), // 12 min ago
        user: 'Legal Researcher',
        status: 'completed'
      },
      {
        id: 3,
        type: 'ai_analysis',
        title: 'AI document analysis finished',
        timestamp: new Date(Date.now() - 1000 * 60 * 18), // 18 min ago
        user: 'System',
        status: 'completed'
      },
      {
        id: 4,
        type: 'evidence_upload',
        title: 'Evidence uploaded: Contract_v2.pdf',
        timestamp: new Date(Date.now() - 1000 * 60 * 25), // 25 min ago
        user: 'Paralegal Smith',
        status: 'processing'
      }
    ]
  });
  // Quick action buttons
  const quickActions = [
    {
      title: 'New Case',
      description: 'Create a new legal case',
      icon: FileText,
      href: '/dashboard/cases/new',
      color: 'bg-blue-500'
    },
    {
      title: 'Vector Search',
      description: 'Search legal documents',
      icon: Search,
      href: '/dashboard/search',
      color: 'bg-purple-500'
    },
    {
      title: 'Upload Evidence',
      description: 'Add case evidence',
      icon: Shield,
      href: '/dashboard/evidence/upload',
      color: 'bg-green-500'
    },
    {
      title: 'AI Analysis',
      description: 'Run AI document analysis',
      icon: Zap,
      href: '/dashboard/ai/analyze',
      color: 'bg-orange-500'
    }
  ];
  // Utility functions
  function formatRelativeTime(date: Date): string {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  }
  function getActivityIcon(type: string) {
    switch (type) {
      case 'case_created': return FileText;
      case 'vector_search': return Search;
      case 'ai_analysis': return Zap;
      case 'evidence_upload': return Shield;
      default: return Activity;
    }
  }
  function getStatusColor(status: string): string {
    switch (status) {
      case 'active': return 'bg-blue-500';
      case 'completed': return 'bg-green-500';
      case 'processing': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }
  // Real-time updates simulation
  onMount(() => {
    const interval = setInterval(() => {
      // Simulate real-time metrics updates
      dashboardData.systemLoad = Math.floor(Math.random() * 30) + 50;
      dashboardData.apiResponseTime = Math.floor(Math.random() * 50) + 120;
      dashboardData.databaseConnections = Math.floor(Math.random() * 10) + 18;
    }, 3000);
    return () => clearInterval(interval);
  });
</script>

<!-- Dashboard Overview -->
<div class="space-y-6">
  <!-- Welcome Header -->
  <div class="flex items-center justify-between">
    <div>
      <h1 class="text-3xl font-bold text-nier-text-primary">Dashboard Overview</h1>
      <p class="text-nier-text-muted mt-1">Welcome back to your Legal AI Command Center</p>
    </div>
    <div class="flex items-center gap-2">
      <Badge variant="outline" class="text-green-600 border-green-600">
        <Activity class="w-3 h-3 mr-1" />
        System Healthy
      </Badge>
      <Button class="bits-btn" variant="outline" size="sm">
        <BarChart3 class="w-4 h-4 mr-2" />
        Export Report
      </Button>
    </div>
  </div>
  
  <!-- Key Metrics Grid -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
    <!-- Total Cases -->
    <Card.Root class="p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-nier-text-muted">Total Cases</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-2xl font-bold text-nier-text-primary">{dashboardData.totalCases}</span>
            <Badge variant="secondary" class="text-xs text-green-600">
              <TrendingUp class="w-3 h-3 mr-1" />
              +{dashboardData.caseGrowth}%
            </Badge>
          </div>
        </div>
        <div class="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <FileText class="w-6 h-6 text-blue-500" />
        </div>
      </div>
      <Progress value={(dashboardData.activeCases / dashboardData.totalCases) * 100} class="mt-4" />
      <p class="text-xs text-nier-text-muted mt-2">{dashboardData.activeCases} active cases</p>
    </Card>
    
    <!-- Vector Queries -->
    <Card.Root class="p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-nier-text-muted">Vector Queries</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-2xl font-bold text-nier-text-primary">{dashboardData.totalVectorQueries.toLocaleString()}</span>
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{dashboardData.avgQueryTime}ms avg</span>
          </div>
        </div>
        <div class="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center">
          <Search class="w-6 h-6 text-purple-500" />
        </div>
      </div>
      <Progress value={dashboardData.searchAccuracy} class="mt-4" />
      <p class="text-xs text-nier-text-muted mt-2">{dashboardData.searchAccuracy}% accuracy rate</p>
    </Card>
    
    <!-- AI Processing -->
    <Card.Root class="p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-nier-text-muted">AI Tasks Today</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-2xl font-bold text-nier-text-primary">{dashboardData.aiTasksCompleted}</span>
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{dashboardData.aiProcessingTime}s avg</span>
          </div>
        </div>
        <div class="w-12 h-12 bg-orange-500/10 rounded-lg flex items-center justify-center">
          <Zap class="w-6 h-6 text-orange-500" />
        </div>
      </div>
      <Progress value={(dashboardData.aiTasksCompleted / dashboardData.aiTasksToday) * 100} class="mt-4" />
      <p class="text-xs text-nier-text-muted mt-2">{dashboardData.aiAccuracy}% accuracy rate</p>
    </Card>
    
    <!-- System Health -->
    <Card.Root class="p-6">
      <div class="flex items-center justify-between">
        <div>
          <p class="text-sm font-medium text-nier-text-muted">System Load</p>
          <div class="flex items-center gap-2 mt-2">
            <span class="text-2xl font-bold text-nier-text-primary">{dashboardData.systemLoad}%</span>
            <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{dashboardData.uptime} uptime</span>
          </div>
        </div>
        <div class="w-12 h-12 bg-green-500/10 rounded-lg flex items-center justify-center">
          <Cpu class="w-6 h-6 text-green-500" />
        </div>
      </div>
      <Progress value={dashboardData.systemLoad} class="mt-4" />
      <p class="text-xs text-nier-text-muted mt-2">{dashboardData.databaseConnections} DB connections</p>
    </Card>
  </div>
  
  <!-- Quick Actions -->
  <Card.Root class="p-6">
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <Target class="w-5 h-5" />
        Quick Actions
      </Card.Title>
      <Card.Description>
        Common tasks and workflows
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {#each quickActions as action}
          <button
            onclick={() => goto(action.href)}
            class="group p-4 border border-nier-border-muted rounded-lg hover:bg-nier-bg-tertiary 
                   transition-all hover:border-nier-accent-warm text-left"
          >
            <div class="flex items-center gap-3 mb-2">
              <div class="w-10 h-10 {action.color} rounded-lg flex items-center justify-center">
                {@render action.icon({ class: "w-5 h-5 text-white" })}
              </div>
              <ChevronRight class="w-4 h-4 text-nier-text-muted group-hover:text-nier-accent-warm transition-colors ml-auto" />
            </div>
            <h3 class="font-medium text-nier-text-primary group-hover:text-nier-accent-warm transition-colors">
              {action.title}
            </h3>
            <p class="text-sm text-nier-text-muted mt-1">
              {action.description}
            </p>
          </button>
        {/each}
      </div>
    </CardContent>
  </Card>
  
  <!-- Two Column Layout -->
  <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
    <!-- Recent Activity -->
    <div class="lg:col-span-2">
      <Card.Root class="h-fit">
        <Card.Header>
          <Card.Title class="flex items-center gap-2">
            <Clock class="w-5 h-5" />
            Recent Activity
          </Card.Title>
          <Card.Description>
            Latest system events and user actions
          </Card.Description>
        </Card.Header>
        <Card.Content>
          <div class="space-y-4">
            {#each dashboardData.recentActivities as activity (activity.id)}
              <div class="flex items-start gap-4 p-3 rounded-lg hover:bg-nier-bg-tertiary transition-colors">
                <div class="w-8 h-8 bg-nier-bg-secondary rounded-lg flex items-center justify-center flex-shrink-0">
                  {@render getActivityIcon(activity.type)({ class: "w-4 h-4 text-nier-text-primary" })}
                </div>
                <div class="flex-1 min-w-0">
                  <p class="text-sm font-medium text-nier-text-primary truncate">
                    {activity.title}
                  </p>
                  <div class="flex items-center gap-2 mt-1">
                    <span class="text-xs text-nier-text-muted">
                      {activity.user}
                    </span>
                    <span class="text-xs text-nier-text-muted">•</span>
                    <span class="text-xs text-nier-text-muted">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </div>
                <div class="w-2 h-2 rounded-full {getStatusColor(activity.status)} flex-shrink-0"></div>
              </div>
            {/each}
          </div>
          <div class="mt-4 text-center">
            <Button class="bits-btn" variant="outline" size="sm">
              View All Activity
              <ChevronRight class="w-4 h-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
    
    <!-- Popular Search Terms -->
    <Card.Root class="h-fit">
      <Card.Header>
        <Card.Title class="flex items-center gap-2">
          <Eye class="w-5 h-5" />
          Popular Searches
        </Card.Title>
        <Card.Description>
          Most searched terms today
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div class="space-y-3">
          {#each dashboardData.popularSearchTerms as term, index (term.term)}
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-3">
                <div class="w-6 h-6 bg-nier-accent-warm/10 text-nier-accent-warm rounded text-xs font-bold flex items-center justify-center">
                  {index + 1}
                </div>
                <span class="text-sm font-medium text-nier-text-primary">
                  {term.term}
                </span>
              </div>
              <span class="px-2 py-1 rounded text-xs font-medium bg-gray-200 text-gray-700">{term.count}</span>
            </div>
          {/each}
        </div>
      </CardContent>
    </Card>
  </div>
  
  <!-- Performance Chart Placeholder -->
  <Card.Root>
    <Card.Header>
      <Card.Title class="flex items-center gap-2">
        <BarChart3 class="w-5 h-5" />
        Performance Metrics
      </Card.Title>
      <Card.Description>
        System performance over the last 6 hours
      </Card.Description>
    </Card.Header>
    <Card.Content>
      <div class="h-64 flex items-center justify-center border-2 border-dashed border-nier-border-muted rounded-lg">
        <div class="text-center">
          <BarChart3 class="w-12 h-12 text-nier-text-muted mx-auto mb-2" />
          <p class="text-nier-text-muted">Performance chart will be rendered here</p>
          <p class="text-xs text-nier-text-muted mt-1">Integrate Chart.js or D3 for visualization</p>
        </div>
      </div>
    </CardContent>
  </Card>
</div>

