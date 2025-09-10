
/**
 * Complete Routes Configuration for YoRHa Navigation
 * Comprehensive mapping of all available demo routes and features
 */

export interface RouteDefinition {
  id: string;
  label: string;
  route: string;
  icon: string;
  description: string;
  category: 'main' | 'demo' | 'admin' | 'dev' | 'ai' | 'legal' | 'utilities' | 'auth' | 'system';
  status: 'active' | 'beta' | 'experimental' | 'deprecated' | 'development';
  tags: string[];
}

export const allRoutes: RouteDefinition[] = [
  // === MAIN OPERATIONS ===
  {
    id: 'command-center',
    label: 'Command Center',
    route: '/',
    icon: '⚡',
    description: 'Enhanced RAG System with AI Model Orchestration',
    category: 'main',
    status: 'active',
    tags: ['rag', 'ai', 'orchestration']
  },
  {
    id: 'cases',
    label: 'Case Management',
    route: '/cases',
    icon: '📁',
    description: 'Legal case management with AI analysis',
    category: 'main',
    status: 'active',
    tags: ['legal', 'cases', 'management']
  },
  {
    id: 'evidence',
    label: 'Evidence Analysis',
    route: '/evidence',
    icon: '🔍',
    description: 'Digital evidence processing with OCR and AI',
    category: 'main',
    status: 'active',
    tags: ['evidence', 'ocr', 'analysis']
  },
  {
    id: 'detective',
    label: 'YoRHa Detective Center',
    route: '/yorha/detective',
    icon: '🕵️',
    description: 'YoRHa-themed detective command center with case management',
    category: 'main',
    status: 'active',
    tags: ['detective', 'yorha', 'cases', 'command-center']
  },
  {
    id: 'persons',
    label: 'Persons of Interest',
    route: '/detective',
    icon: '👤',
    description: 'Person tracking and relationship mapping',
    category: 'main',
    status: 'active',
    tags: ['detective', 'persons', 'tracking']
  },
  {
    id: 'ai-assistant',
    label: 'AI Assistant',
    route: '/ai-assistant',
    icon: '🤖',
    description: 'Multi-agent AI assistant with specialized legal knowledge',
    category: 'ai',
    status: 'active',
    tags: ['ai', 'assistant', 'legal']
  },
  {
    id: 'search',
    label: 'Legal Search',
    route: '/search',
    icon: '🔎',
    description: 'Semantic search across legal documents and case law',
    category: 'main',
    status: 'active',
    tags: ['search', 'semantic', 'legal']
  },
  {
    id: 'documents',
    label: 'Document Processing',
    route: '/legal/documents',
    icon: '📄',
    description: 'Legal document analysis and processing',
    category: 'legal',
    status: 'active',
    tags: ['documents', 'legal', 'processing']
  },
  {
    id: 'reports',
    label: 'Report Generation',
    route: '/reports',
    icon: '📊',
    description: 'Automated report generation with AI insights',
    category: 'main',
    status: 'active',
    tags: ['reports', 'generation', 'ai']
  },
  {
    id: 'memory',
    label: 'Memory Dashboard',
    route: '/memory-dashboard',
    icon: '🧠',
    description: 'AI memory and context management',
    category: 'ai',
    status: 'active',
    tags: ['memory', 'ai', 'context']
  },
  {
    id: 'chat',
    label: 'AI Chat Interface',
    route: '/chat',
    icon: '💬',
    description: 'Interactive chat with legal AI models',
    category: 'ai',
    status: 'active',
    tags: ['chat', 'ai', 'conversation']
  },

  // === AI DEMONSTRATIONS ===
  {
    id: 'demo-overview',
    label: 'Demo Overview',
    route: '/demo',
    icon: '🎯',
    description: 'Overview of all AI demonstrations and capabilities',
    category: 'demo',
    status: 'active',
    tags: ['demo', 'overview', 'ai']
  },
  {
    id: 'demo-ai-assistant',
    label: 'AI Assistant Demo',
    route: '/demo/ai-assistant',
    icon: '🤖',
    description: 'Advanced AI assistant with legal specialization',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'assistant', 'demo']
  },
  {
    id: 'demo-ai-complete-test',
    label: 'AI Complete Test',
    route: '/demo/ai-complete-test',
    icon: '🧪',
    description: 'Comprehensive AI system testing interface',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'testing', 'complete']
  },
  {
    id: 'demo-ai-dashboard',
    label: 'AI Dashboard',
    route: '/demo/ai-dashboard',
    icon: '📊',
    description: 'Real-time AI performance and analytics dashboard',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'dashboard', 'analytics']
  },
  {
    id: 'demo-ai-integration',
    label: 'AI Integration Demo',
    route: '/demo/ai-integration',
    icon: '🔗',
    description: 'Multi-service AI integration showcase',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'integration', 'showcase']
  },
  {
    id: 'demo-ai-pipeline',
    label: 'AI Pipeline',
    route: '/demo/ai-pipeline',
    icon: '⚙️',
    description: 'AI processing pipeline visualization',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'pipeline', 'processing']
  },
  {
    id: 'demo-ai-summary',
    label: 'AI Document Summary',
    route: '/demo/ai-summary',
    icon: '📝',
    description: 'Intelligent document summarization with AI',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'summary', 'documents']
  },
  {
    id: 'demo-ai-test',
    label: 'AI Testing Suite',
    route: '/demo/ai-test',
    icon: '🔬',
    description: 'AI model testing and evaluation tools',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'testing', 'evaluation']
  },
  {
    id: 'demo-component-gallery',
    label: 'Component Gallery',
    route: '/demo/component-gallery',
    icon: '🎨',
    description: 'Showcase of UI components and design patterns',
    category: 'demo',
    status: 'active',
    tags: ['components', 'ui', 'gallery']
  },
  {
    id: 'demo-document-ai',
    label: 'Document AI',
    route: '/demo/document-ai',
    icon: '📑',
    description: 'AI-powered document analysis and extraction',
    category: 'demo',
    status: 'active',
    tags: ['document', 'ai', 'analysis']
  },
  {
    id: 'demo-enhanced-rag-semantic',
    label: 'Enhanced RAG Semantic',
    route: '/demo/enhanced-rag-semantic',
    icon: '🧠',
    description: 'Advanced semantic search with RAG architecture',
    category: 'demo',
    status: 'active',
    tags: ['rag', 'semantic', 'enhanced']
  },
  {
    id: 'demo-enhanced-semantic-architecture',
    label: 'Semantic Architecture',
    route: '/demo/enhanced-semantic-architecture',
    icon: '🏗️',
    description: 'Advanced semantic processing architecture',
    category: 'demo',
    status: 'active',
    tags: ['semantic', 'architecture', 'advanced']
  },
  {
    id: 'demo-gpu-legal-ai',
    label: 'GPU Legal AI',
    route: '/demo/gpu-legal-ai',
    icon: '🚀',
    description: 'GPU-accelerated legal AI processing',
    category: 'demo',
    status: 'active',
    tags: ['gpu', 'legal', 'ai']
  },
  {
    id: 'demo-inline-suggestions',
    label: 'Inline AI Suggestions',
    route: '/demo/inline-suggestions',
    icon: '💡',
    description: 'Real-time AI suggestions and completions',
    category: 'demo',
    status: 'active',
    tags: ['ai', 'suggestions', 'inline']
  },
  {
    id: 'demo-langextract-ollama',
    label: 'LangExtract Ollama',
    route: '/demo/langextract-ollama',
    icon: '🔤',
    description: 'Language extraction with Ollama integration',
    category: 'demo',
    status: 'active',
    tags: ['language', 'extraction', 'ollama']
  },
  {
    id: 'demo-legal-ai-complete',
    label: 'Complete Legal AI',
    route: '/demo/legal-ai-complete',
    icon: '⚖️',
    description: 'Complete legal AI system demonstration',
    category: 'demo',
    status: 'active',
    tags: ['legal', 'ai', 'complete']
  },
  {
    id: 'demo-live-agents',
    label: 'Live AI Agents',
    route: '/demo/live-agents',
    icon: '🤖',
    description: 'Real-time multi-agent AI coordination',
    category: 'demo',
    status: 'active',
    tags: ['agents', 'live', 'coordination']
  },
  {
    id: 'demo-neural-sprite-engine',
    label: 'Neural Sprite Engine',
    route: '/demo/neural-sprite-engine',
    icon: '🎮',
    description: 'Neural network-powered sprite rendering',
    category: 'demo',
    status: 'experimental',
    tags: ['neural', 'sprite', 'engine']
  },
  {
    id: 'demo-notes',
    label: 'AI Note Taking',
    route: '/demo/notes',
    icon: '📝',
    description: 'Intelligent note-taking with AI enhancement',
    category: 'demo',
    status: 'active',
    tags: ['notes', 'ai', 'taking']
  },
  {
    id: 'demo-phase5',
    label: 'Phase 5 Demo',
    route: '/demo/phase5',
    icon: '🚀',
    description: 'Phase 5 development milestone demonstration',
    category: 'demo',
    status: 'active',
    tags: ['phase5', 'milestone', 'demo']
  },
  {
    id: 'demo-professional-editor',
    label: 'Professional Editor',
    route: '/demo/professional-editor',
    icon: '✏️',
    description: 'Professional document editing with AI assistance',
    category: 'demo',
    status: 'active',
    tags: ['editor', 'professional', 'ai']
  },
  {
    id: 'demo-simple-test',
    label: 'Simple Test Interface',
    route: '/demo/simple-test',
    icon: '🔍',
    description: 'Simple testing interface for quick validation',
    category: 'demo',
    status: 'active',
    tags: ['simple', 'test', 'interface']
  },
  {
    id: 'demo-system-summary',
    label: 'System Summary',
    route: '/demo/system-summary',
    icon: '📋',
    description: 'Comprehensive system status and metrics',
    category: 'demo',
    status: 'active',
    tags: ['system', 'summary', 'metrics']
  },
  {
    id: 'demo-unified-architecture',
    label: 'Unified Architecture',
    route: '/demo/unified-architecture',
    icon: '🏛️',
    description: 'Unified system architecture demonstration',
    category: 'demo',
    status: 'active',
    tags: ['unified', 'architecture', 'system']
  },
  {
    id: 'demo-unocss-svelte5',
    label: 'UnoCSS + Svelte 5',
    route: '/demo/unocss-svelte5',
    icon: '🎨',
    description: 'UnoCSS styling with Svelte 5 features',
    category: 'demo',
    status: 'active',
    tags: ['unocss', 'svelte5', 'styling']
  },
  {
    id: 'demo-vector-intelligence',
    label: 'Vector Intelligence',
    route: '/demo/vector-intelligence',
    icon: '🧮',
    description: 'Vector-based intelligence and similarity search',
    category: 'demo',
    status: 'active',
    tags: ['vector', 'intelligence', 'search']
  },
  {
    id: 'demo-vector-search',
    label: 'Vector Search',
    route: '/demo/vector-search',
    icon: '🔍',
    description: 'Advanced vector similarity search interface',
    category: 'demo',
    status: 'active',
    tags: ['vector', 'search', 'similarity']
  },
  {
    id: 'demo-webgpu-acceleration',
    label: 'WebGPU Acceleration',
    route: '/demo/webgpu-acceleration',
    icon: '⚡',
    description: 'WebGPU-accelerated AI processing',
    category: 'demo',
    status: 'experimental',
    tags: ['webgpu', 'acceleration', 'ai']
  },
  {
    id: 'demo-yorha-tables',
    label: 'YoRHa Tables',
    route: '/demo/yorha-tables',
    icon: '📊',
    description: 'YoRHa-themed data tables and visualization',
    category: 'demo',
    status: 'active',
    tags: ['yorha', 'tables', 'visualization']
  },

  // === DEVELOPER TOOLS ===
  {
    id: 'dev-mcp-tools',
    label: 'MCP Tools',
    route: '/dev/mcp-tools',
    icon: '🔧',
    description: 'Model Context Protocol development tools',
    category: 'dev',
    status: 'active',
    tags: ['mcp', 'tools', 'development']
  },
  {
    id: 'dev-context7-test',
    label: 'Context7 Test',
    route: '/dev/context7-test',
    icon: '🧪',
    description: 'Context7 integration testing interface',
    category: 'dev',
    status: 'active',
    tags: ['context7', 'test', 'integration']
  },
  {
    id: 'dev-copilot-optimizer',
    label: 'Copilot Optimizer',
    route: '/dev/copilot-optimizer',
    icon: '🚁',
    description: 'AI copilot optimization and tuning',
    category: 'dev',
    status: 'active',
    tags: ['copilot', 'optimizer', 'ai']
  },
  {
    id: 'dev-self-prompting',
    label: 'Self-Prompting Demo',
    route: '/dev/self-prompting-demo',
    icon: '🔄',
    description: 'Self-prompting AI system demonstration',
    category: 'dev',
    status: 'experimental',
    tags: ['self-prompting', 'ai', 'demo']
  },
  {
    id: 'dev-vector-search',
    label: 'Vector Search Dev',
    route: '/dev/vector-search-demo',
    icon: '🔍',
    description: 'Vector search development and testing tools',
    category: 'dev',
    status: 'active',
    tags: ['vector', 'search', 'development']
  },
  {
    id: 'dev-dynamic-routing-test',
    label: 'Dynamic Routing Test',
    route: '/dev/dynamic-routing-test',
    icon: '🛣️',
    description: 'Dynamic routing system testing and demonstration',
    category: 'dev',
    status: 'active',
    tags: ['routing', 'dynamic', 'testing']
  },
  {
    id: 'routes-index',
    label: 'Routes Index',
    route: '/routes',
    icon: '🗺️',
    description: 'Complete navigation index of all available routes and APIs',
    category: 'admin',
    status: 'active',
    tags: ['navigation', 'index', 'routes', 'admin', 'api']
  },

  // === ADMINISTRATIVE ===
  {
    id: 'settings',
    label: 'System Settings',
    route: '/settings',
    icon: '⚙️',
    description: 'System configuration and preferences',
    category: 'admin',
    status: 'active',
    tags: ['settings', 'configuration', 'system']
  },
  {
    id: 'security',
    label: 'Security Center',
    route: '/security',
    icon: '🛡️',
    description: 'Security monitoring and access control',
    category: 'admin',
    status: 'active',
    tags: ['security', 'monitoring', 'access']
  },
  {
    id: 'profile',
    label: 'User Profile',
    route: '/profile',
    icon: '👤',
    description: 'User profile management and preferences',
    category: 'admin',
    status: 'active',
    tags: ['profile', 'user', 'management']
  },
  {
    id: 'help',
    label: 'Help & Documentation',
    route: '/help',
    icon: '❓',
    description: 'System help and documentation',
    category: 'admin',
    status: 'active',
    tags: ['help', 'documentation', 'support']
  },

  // === SPECIALIZED INTERFACES ===
  {
    id: 'enhanced-rag',
    label: 'Enhanced RAG Demo',
    route: '/enhanced-ai-demo',
    icon: '🚀',
    description: 'Enhanced RAG system with advanced AI capabilities',
    category: 'demo',
    status: 'active',
    tags: ['rag', 'enhanced', 'ai']
  },
  {
    id: 'context7',
    label: 'Context7 Integration',
    route: '/context7-demo',
    icon: '🔗',
    description: 'Context7 MCP integration demonstration',
    category: 'demo',
    status: 'active',
    tags: ['context7', 'mcp', 'integration']
  },
  {
    id: 'gaming-demo',
    label: 'Gaming Interface',
    route: '/gaming-demo',
    icon: '🎮',
    description: 'Gaming-style interface with NieR Automata theme',
    category: 'demo',
    status: 'active',
    tags: ['gaming', 'interface', 'nier']
  },
  {
    id: 'yorha-dashboard',
    label: 'YoRHa Dashboard',
    route: '/yorha-dashboard',
    icon: '🤖',
    description: 'Complete YoRHa-themed administrative dashboard',
    category: 'demo',
    status: 'active',
    tags: ['yorha', 'dashboard', 'admin']
  },

  // === CRITICAL SYSTEM ORCHESTRATION ROUTES ===
  // Core System Integration
  {
    id: 'ai-demo',
    label: 'AI System Demo',
    route: '/ai-demo',
    icon: '🤖',
    description: 'Primary AI system demonstration and testing',
    category: 'ai',
    status: 'active',
    tags: ['ai', 'demo', 'system', 'integration']
  },
  {
    id: 'dashboard',
    label: 'System Dashboard',
    route: '/dashboard',
    icon: '📊',
    description: 'Central system monitoring and control dashboard',
    category: 'main',
    status: 'active',
    tags: ['dashboard', 'monitoring', 'system']
  },
  {
    id: 'system-status',
    label: 'System Status',
    route: '/system-status',
    icon: '🎯',
    description: 'Real-time system health and performance monitoring',
    category: 'admin',
    status: 'active',
    tags: ['status', 'monitoring', 'health']
  },
  {
    id: 'gpu-demo',
    label: 'GPU Acceleration',
    route: '/gpu-demo',
    icon: '⚡',
    description: 'GPU acceleration demonstration and integration',
    category: 'demo',
    status: 'active',
    tags: ['gpu', 'acceleration', 'performance']
  },
  {
    id: 'semantic-search-demo',
    label: 'Semantic Search',
    route: '/semantic-search-demo',
    icon: '🧠',
    description: 'Advanced semantic search with SSR and debouncing',
    category: 'ai',
    status: 'active',
    tags: ['search', 'semantic', 'ai', 'ssr']
  },
  {
    id: 'webgpu-demo',
    label: 'WebGPU Demo',
    route: '/webgpu-demo',
    icon: '🚀',
    description: 'WebGPU Redis cache optimizer and compute demos',
    category: 'demo',
    status: 'active',
    tags: ['webgpu', 'cache', 'optimization']
  },
  {
    id: 'investigation',
    label: 'Investigation Workspace',
    route: '/investigation',
    icon: '🔍',
    description: 'Legal investigation workspace with AI assistance',
    category: 'legal',
    status: 'active',
    tags: ['investigation', 'workspace', 'legal']
  },
  {
    id: 'rag-demo',
    label: 'RAG System',
    route: '/rag-demo',
    icon: '📚',
    description: 'Retrieval-Augmented Generation system demonstration',
    category: 'ai',
    status: 'active',
    tags: ['rag', 'ai', 'retrieval', 'generation']
  },
  {
    id: 'system-health',
    label: 'System Health',
    route: '/system/health',
    icon: '💚',
    description: 'System health dashboard and diagnostics',
    category: 'admin',
    status: 'active',
    tags: ['health', 'diagnostics', 'system']
  },
  {
    id: 'studio',
    label: 'Development Studio',
    route: '/studio',
    icon: '🛠️',
    description: 'Development studio and testing environment',
    category: 'dev',
    status: 'active',
    tags: ['studio', 'development', 'testing']
  },
  {
    id: 'showcase',
    label: 'Platform Showcase',
    route: '/showcase',
    icon: '✨',
    description: 'Enhanced Legal AI platform showcase',
    category: 'demo',
    status: 'active',
    tags: ['showcase', 'platform', 'demo']
  },
  {
    id: 'validation',
    label: 'System Validation',
    route: '/validation',
    icon: '✅',
    description: 'Legal AI platform integration validation suite',
    category: 'admin',
    status: 'active',
    tags: ['validation', 'integration', 'testing']
  },
  {
    id: 'data-export',
    label: 'Data Export',
    route: '/export',
    icon: '📤',
    description: 'Data export and backup functionality',
    category: 'admin',
    status: 'active',
    tags: ['export', 'data', 'backup']
  },
  {
    id: 'data-import',
    label: 'Data Import',
    route: '/import',
    icon: '📥',
    description: 'Data import and migration tools',
    category: 'admin',
    status: 'active',
    tags: ['import', 'data', 'migration']
  },
  {
    id: 'api-endpoints',
    label: 'API Endpoints',
    route: '/endpoints',
    icon: '🔗',
    description: 'API endpoint monitoring and status',
    category: 'admin',
    status: 'active',
    tags: ['api', 'endpoints', 'monitoring']
  },

  // GPU & Performance Integration
  {
    id: 'webgpu-test',
    label: 'WebGPU Testing',
    route: '/webgpu-test',
    icon: '🔥',
    description: 'WebGPU vector similarity testing suite',
    category: 'dev',
    status: 'active',
    tags: ['webgpu', 'testing', 'vectors']
  },
  {
    id: 'gpu-chat',
    label: 'GPU Chat',
    route: '/gpu-chat',
    icon: '💬',
    description: 'GPU-accelerated chat interface',
    category: 'ai',
    status: 'active',
    tags: ['gpu', 'chat', 'acceleration']
  },
  {
    id: 'cache-demo',
    label: 'Cache System',
    route: '/cache-demo',
    icon: '⚡',
    description: 'GPU cache system demonstration',
    category: 'demo',
    status: 'active',
    tags: ['cache', 'gpu', 'performance']
  },

  // Evidence & Legal Processing
  {
    id: 'evidence-canvas',
    label: 'Evidence Canvas',
    route: '/evidence-canvas',
    icon: '🖼️',
    description: 'Visual evidence analysis and annotation',
    category: 'legal',
    status: 'active',
    tags: ['evidence', 'canvas', 'visual']
  },
  {
    id: 'evidence-editor',
    label: 'Evidence Editor',
    route: '/evidence-editor',
    icon: '✏️',
    description: 'Visual evidence editor and processor',
    category: 'legal',
    status: 'active',
    tags: ['evidence', 'editor', 'processing']
  },
  {
    id: 'report-builder',
    label: 'Report Builder',
    route: '/report-builder',
    icon: '📝',
    description: 'Automated legal report generation',
    category: 'legal',
    status: 'active',
    tags: ['reports', 'builder', 'automation']
  },
  {
    id: 'summarize',
    label: 'Document Summarization',
    route: '/summarize',
    icon: '📄',
    description: 'Legal document summarization with AI',
    category: 'ai',
    status: 'active',
    tags: ['summarization', 'documents', 'ai']
  },

  // AI & Machine Learning
  {
    id: 'ai-test',
    label: 'AI Testing Suite',
    route: '/ai-test',
    icon: '🤖',
    description: 'Enhanced AI Legal Assistant testing',
    category: 'ai',
    status: 'active',
    tags: ['ai', 'testing', 'assistant']
  },
  {
    id: 'ai-summary',
    label: 'AI Summary Generator',
    route: '/ai-summary',
    icon: '📋',
    description: 'AI-powered document summary generation',
    category: 'ai',
    status: 'active',
    tags: ['ai', 'summary', 'generation']
  },
  {
    id: 'assistant',
    label: 'AI Assistant',
    route: '/assistant',
    icon: '🤝',
    description: 'AI Legal Assistant interface',
    category: 'ai',
    status: 'active',
    tags: ['assistant', 'ai', 'legal']
  },

  // Administrative & System
  {
    id: 'upload-system',
    label: 'Upload System',
    route: '/upload',
    icon: '📁',
    description: 'Document upload and processing system',
    category: 'main',
    status: 'active',
    tags: ['upload', 'documents', 'processing']
  },
  {
    id: 'gallery',
    label: 'Media Gallery',
    route: '/gallery',
    icon: '🖼️',
    description: 'Media gallery and file management',
    category: 'admin',
    status: 'active',
    tags: ['gallery', 'media', 'files']
  },
  {
    id: 'storage-audits',
    label: 'Storage Audits',
    route: '/storage/admin/audits',
    icon: '📊',
    description: 'Storage audit logs and monitoring',
    category: 'admin',
    status: 'active',
    tags: ['storage', 'audits', 'monitoring']
  },

  // Testing & Development
  {
    id: 'test-hub',
    label: 'Test Hub',
    route: '/test',
    icon: '🧪',
    description: 'Test navigation hub and suite',
    category: 'dev',
    status: 'active',
    tags: ['testing', 'hub', 'navigation']
  },
  {
    id: 'test-integration',
    label: 'Integration Tests',
    route: '/test/integration',
    icon: '🔗',
    description: 'Integration test suite',
    category: 'dev',
    status: 'active',
    tags: ['integration', 'testing', 'suite']
  },
  {
    id: 'test-crud',
    label: 'CRUD Tests',
    route: '/test/crud',
    icon: '📝',
    description: 'CRUD operations test dashboard',
    category: 'dev',
    status: 'active',
    tags: ['crud', 'testing', 'operations']
  },

  // Legal-Specific Features
  {
    id: 'persons-of-interest',
    label: 'Persons of Interest',
    route: '/persons-of-interest',
    icon: '👥',
    description: 'Persons of interest tracking and management',
    category: 'legal',
    status: 'active',
    tags: ['persons', 'tracking', 'investigation']
  },
  {
    id: 'prosecutor',
    label: 'Prosecutor Dashboard',
    route: '/prosecutor',
    icon: '⚖️',
    description: 'Prosecutor-specific dashboard and tools',
    category: 'legal',
    status: 'active',
    tags: ['prosecutor', 'dashboard', 'legal']
  },
  {
    id: 'laws',
    label: 'Legal Resources',
    route: '/laws',
    icon: '📚',
    description: 'Legal resources and law database',
    category: 'legal',
    status: 'active',
    tags: ['laws', 'resources', 'database']
  },
  {
    id: 'citations',
    label: 'Citations',
    route: '/citations',
    icon: '📑',
    description: 'Legal citations management',
    category: 'legal',
    status: 'active',
    tags: ['citations', 'legal', 'management']
  },
  {
    id: 'saved-citations',
    label: 'Saved Citations',
    route: '/saved-citations',
    icon: '🔖',
    description: 'Saved citations collection',
    category: 'legal',
    status: 'active',
    tags: ['citations', 'saved', 'collection']
  },

  // Advanced Features
  {
    id: 'brain',
    label: 'System Brain Graph',
    route: '/brain',
    icon: '🧠',
    description: 'System brain graph visualization',
    category: 'admin',
    status: 'active',
    tags: ['brain', 'graph', 'visualization']
  },
  {
    id: 'graph',
    label: 'WASM Graph Engine',
    route: '/graph',
    icon: '🕸️',
    description: 'WASM graph engine and visualization',
    category: 'dev',
    status: 'active',
    tags: ['wasm', 'graph', 'engine']
  },
  {
    id: 'simd-ai-demo',
    label: 'SIMD AI Demo',
    route: '/simd-ai-demo',
    icon: '🧬',
    description: 'SIMD AI demo platform',
    category: 'demo',
    status: 'active',
    tags: ['simd', 'ai', 'performance']
  },
  {
    id: 'optimization-dashboard',
    label: 'Optimization Dashboard',
    route: '/optimization-dashboard',
    icon: '⚡',
    description: 'Advanced optimization dashboard',
    category: 'admin',
    status: 'active',
    tags: ['optimization', 'performance', 'dashboard']
  },

  // State Management & Monitoring
  {
    id: 'state-machines',
    label: 'State Machine Registry',
    route: '/state/machines',
    icon: '🔄',
    description: 'State machine registry and monitoring',
    category: 'dev',
    status: 'active',
    tags: ['state', 'machines', 'xstate']
  },
  {
    id: 'status-monitoring',
    label: 'Status Monitoring',
    route: '/status',
    icon: '📊',
    description: 'System status monitoring dashboard',
    category: 'admin',
    status: 'active',
    tags: ['status', 'monitoring', 'metrics']
  },

  // Authentication & User Management
  {
    id: 'login',
    label: 'Login',
    route: '/login',
    icon: '🔐',
    description: 'User authentication and login',
    category: 'admin',
    status: 'active',
    tags: ['auth', 'login', 'security']
  },
  {
    id: 'register',
    label: 'Registration',
    route: '/register',
    icon: '📝',
    description: 'User registration and onboarding',
    category: 'admin',
    status: 'active',
    tags: ['auth', 'registration', 'onboarding']
  },

  // Enhanced Legal Workflows
  {
    id: 'legal-ai-suite',
    label: 'Legal AI Suite',
    route: '/legal-ai-suite',
    icon: '⚖️',
    description: 'Complete Legal AI suite interface',
    category: 'main',
    status: 'active',
    tags: ['legal', 'ai', 'suite', 'comprehensive']
  },
  {
    id: 'enhanced-ai-demo',
    label: 'Enhanced AI Demo',
    route: '/enhanced-ai-demo',
    icon: '🚀',
    description: 'Enhanced RAG Studio demonstration',
    category: 'ai',
    status: 'active',
    tags: ['enhanced', 'rag', 'studio', 'ai']
  },

  // Performance & Diagnostics
  {
    id: 'perf',
    label: 'Performance Monitoring',
    route: '/perf',
    icon: '📈',
    description: 'Performance monitoring and analytics',
    category: 'admin',
    status: 'active',
    tags: ['performance', 'monitoring', 'analytics']
  },
  {
    id: 'proxy',
    label: 'Proxy Diagnostics',
    route: '/proxy',
    icon: '🔄',
    description: 'Proxy diagnostic and debugging tools',
    category: 'dev',
    status: 'active',
    tags: ['proxy', 'diagnostics', 'debugging']
  },

  // YoRHa Extended Features
  {
    id: 'yorha-terminal',
    label: 'YoRHa Terminal',
    route: '/yorha-terminal',
    icon: '💻',
    description: 'YoRHa Legal AI Terminal interface',
    category: 'demo',
    status: 'active',
    tags: ['yorha', 'terminal', 'interface']
  },
  {
    id: 'yorha-analysis',
    label: 'YoRHa Analysis',
    route: '/yorha/analysis',
    icon: '📊',
    description: 'YoRHa analysis dashboard',
    category: 'demo',
    status: 'active',
    tags: ['yorha', 'analysis', 'dashboard']
  },
  {
    id: 'yorha-persons',
    label: 'YoRHa Persons',
    route: '/yorha/persons',
    icon: '👥',
    description: 'YoRHa persons of interest interface',
    category: 'demo',
    status: 'active',
    tags: ['yorha', 'persons', 'interest']
  }
,
  // Auto-generated missing routes
  {
    id: 'admin-cluster',
    label: 'Cluster',
    route: '/admin/cluster',
    icon: '⚙️',
    description: 'admin cluster functionality',
    category: 'admin',
    status: 'active',
    tags: ['auto-generated', 'admin', 'management']
  },
  {
    id: 'admin-gpu-demo',
    label: 'Gpu Demo',
    route: '/admin/gpu-demo',
    icon: '⚙️',
    description: 'admin gpu demo functionality',
    category: 'admin',
    status: 'active',
    tags: ['auto-generated', 'admin', 'management']
  },
  {
    id: 'admin-users',
    label: 'Users',
    route: '/admin/users',
    icon: '⚙️',
    description: 'admin users functionality',
    category: 'admin',
    status: 'active',
    tags: ['auto-generated', 'admin', 'management']
  },
  {
    id: 'admin-users--userid',
    label: ':user Id',
    route: '/admin/users/:userId',
    icon: '⚙️',
    description: 'admin :user id functionality',
    category: 'admin',
    status: 'active',
    tags: ['auto-generated', 'admin', 'management']
  },
  {
    id: 'ai',
    label: 'Ai',
    route: '/ai',
    icon: '📄',
    description: 'utilities ai functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'ai-upload-demo',
    label: 'Ai Upload Demo',
    route: '/ai-upload-demo',
    icon: '🤖',
    description: 'ai ai upload demo functionality',
    category: 'ai',
    status: 'active',
    tags: ['auto-generated', 'ai', 'intelligence']
  },
  {
    id: 'ai-enhanced-mcp',
    label: 'Enhanced Mcp',
    route: '/ai/enhanced-mcp',
    icon: '🤖',
    description: 'ai enhanced mcp functionality',
    category: 'ai',
    status: 'active',
    tags: ['auto-generated', 'ai', 'intelligence']
  },
  {
    id: 'ai-modular',
    label: 'Modular',
    route: '/ai/modular',
    icon: '🤖',
    description: 'ai modular functionality',
    category: 'ai',
    status: 'active',
    tags: ['auto-generated', 'ai', 'intelligence']
  },
  {
    id: 'ai-orchestrator',
    label: 'Orchestrator',
    route: '/ai/orchestrator',
    icon: '🤖',
    description: 'ai orchestrator functionality',
    category: 'ai',
    status: 'active',
    tags: ['auto-generated', 'ai', 'intelligence']
  },
  {
    id: 'aiassistant',
    label: 'Aiassistant',
    route: '/aiassistant',
    icon: '📄',
    description: 'utilities aiassistant functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'all-routes',
    label: 'All Routes',
    route: '/all-routes',
    icon: '📄',
    description: 'utilities all routes functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'auth',
    label: 'Auth',
    route: '/auth',
    icon: '📄',
    description: 'utilities auth functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'auth-login',
    label: 'Login',
    route: '/auth/login',
    icon: '🔐',
    description: 'auth login functionality',
    category: 'auth',
    status: 'active',
    tags: ['auto-generated', 'authentication', 'security']
  },
  {
    id: 'auth-login-simple',
    label: 'Simple',
    route: '/auth/login/simple',
    icon: '🔐',
    description: 'auth simple functionality',
    category: 'auth',
    status: 'active',
    tags: ['auto-generated', 'authentication', 'security']
  },
  {
    id: 'auth-register',
    label: 'Register',
    route: '/auth/register',
    icon: '🔐',
    description: 'auth register functionality',
    category: 'auth',
    status: 'active',
    tags: ['auto-generated', 'authentication', 'security']
  },
  {
    id: 'auth-test',
    label: 'Test',
    route: '/auth/test',
    icon: '🔐',
    description: 'auth test functionality',
    category: 'auth',
    status: 'active',
    tags: ['auto-generated', 'authentication', 'security']
  },
  {
    id: 'authenticated-crud-test',
    label: 'Authenticated Crud Test',
    route: '/authenticated-crud-test',
    icon: '📄',
    description: 'utilities authenticated crud test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'bits-uno-demo',
    label: 'Bits Uno Demo',
    route: '/bits-uno-demo',
    icon: '🎮',
    description: 'demo bits uno demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'cache-redis-admin',
    label: 'Redis Admin',
    route: '/cache/redis-admin',
    icon: '🔧',
    description: 'system redis admin functionality',
    category: 'system',
    status: 'active',
    tags: ['auto-generated', 'cache', 'performance']
  },
  {
    id: 'canvas-demo',
    label: 'Canvas Demo',
    route: '/canvas-demo',
    icon: '🎮',
    description: 'demo canvas demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'cases--caseid-rag',
    label: 'Rag',
    route: '/cases/:caseId/rag',
    icon: '⚖️',
    description: 'legal rag functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'cases--id',
    label: ':id',
    route: '/cases/:id',
    icon: '⚖️',
    description: 'legal :id functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'cases--id-canvas',
    label: 'Canvas',
    route: '/cases/:id/canvas',
    icon: '⚖️',
    description: 'legal canvas functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'cases--id-enhanced',
    label: 'Enhanced',
    route: '/cases/:id/enhanced',
    icon: '⚖️',
    description: 'legal enhanced functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'cases-create',
    label: 'Create',
    route: '/cases/create',
    icon: '⚖️',
    description: 'legal create functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'cases-new',
    label: 'New',
    route: '/cases/new',
    icon: '⚖️',
    description: 'legal new functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'chat-demo',
    label: 'Chat Demo',
    route: '/chat-demo',
    icon: '🎮',
    description: 'demo chat demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'compiler-ai-demo',
    label: 'Compiler Ai Demo',
    route: '/compiler-ai-demo',
    icon: '🎮',
    description: 'demo compiler ai demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'context7-demodisabled',
    label: 'Context7 Demo.disabled',
    route: '/context7-demo.disabled',
    icon: '🎮',
    description: 'demo context7 demo.disabled functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'copilot-autonomous',
    label: 'Autonomous',
    route: '/copilot/autonomous',
    icon: '📄',
    description: 'utilities autonomous functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'crud-dashboard',
    label: 'Crud Dashboard',
    route: '/crud-dashboard',
    icon: '📄',
    description: 'utilities crud dashboard functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'cuda-streaming',
    label: 'Cuda Streaming',
    route: '/cuda-streaming',
    icon: '📄',
    description: 'utilities cuda streaming functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dashboard-cases',
    label: 'Cases',
    route: '/dashboard/cases',
    icon: '⚖️',
    description: 'legal cases functionality',
    category: 'legal',
    status: 'active',
    tags: ['auto-generated', 'legal', 'cases']
  },
  {
    id: 'dashboard-search',
    label: 'Search',
    route: '/dashboard/search',
    icon: '📄',
    description: 'utilities search functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'demo-bits-ui',
    label: 'Bits Ui',
    route: '/demo/bits-ui',
    icon: '🎮',
    description: 'demo bits ui functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-chat-stream',
    label: 'Chat Stream',
    route: '/demo/chat-stream',
    icon: '🎮',
    description: 'demo chat stream functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-clean-architecture',
    label: 'Clean Architecture',
    route: '/demo/clean-architecture',
    icon: '🎮',
    description: 'demo clean architecture functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-complete-integration',
    label: 'Complete Integration',
    route: '/demo/complete-integration',
    icon: '🎮',
    description: 'demo complete integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-crud-integration',
    label: 'Crud Integration',
    route: '/demo/crud-integration',
    icon: '🎮',
    description: 'demo crud integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-cuda-minio-upload',
    label: 'Cuda Minio Upload',
    route: '/demo/cuda-minio-upload',
    icon: '🎮',
    description: 'demo cuda minio upload functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-cuda-rtx-integration',
    label: 'Cuda Rtx Integration',
    route: '/demo/cuda-rtx-integration',
    icon: '🎮',
    description: 'demo cuda rtx integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-cyber-elephant',
    label: 'Cyber Elephant',
    route: '/demo/cyber-elephant',
    icon: '🎮',
    description: 'demo cyber elephant functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-document-upload-gpu',
    label: 'Document Upload Gpu',
    route: '/demo/document-upload-gpu',
    icon: '🎮',
    description: 'demo document upload gpu functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-drag-drop',
    label: 'Drag Drop',
    route: '/demo/drag-drop',
    icon: '🎮',
    description: 'demo drag drop functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-editor-test',
    label: 'Editor Test',
    route: '/demo/editor-test',
    icon: '🎮',
    description: 'demo editor test functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-embedding-chat',
    label: 'Embedding Chat',
    route: '/demo/embedding-chat',
    icon: '🎮',
    description: 'demo embedding chat functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-enhanced-rag-demo',
    label: 'Enhanced Rag Demo',
    route: '/demo/enhanced-rag-demo',
    icon: '🎮',
    description: 'demo enhanced rag demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-full-stack-integration',
    label: 'Full Stack Integration',
    route: '/demo/full-stack-integration',
    icon: '🎮',
    description: 'demo full stack integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gaming-evolution-16bit',
    label: '16bit',
    route: '/demo/gaming-evolution/16bit',
    icon: '🎮',
    description: 'demo 16bit functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gaming-evolution-8bit',
    label: '8bit',
    route: '/demo/gaming-evolution/8bit',
    icon: '🎮',
    description: 'demo 8bit functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gaming-evolution-n64',
    label: 'N64',
    route: '/demo/gaming-evolution/n64',
    icon: '🎮',
    description: 'demo n64 functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-glyph-generator',
    label: 'Glyph Generator',
    route: '/demo/glyph-generator',
    icon: '🎮',
    description: 'demo glyph generator functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-acceleration',
    label: 'Gpu Acceleration',
    route: '/demo/gpu-acceleration',
    icon: '🎮',
    description: 'demo gpu acceleration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-assistant',
    label: 'Gpu Assistant',
    route: '/demo/gpu-assistant',
    icon: '🎮',
    description: 'demo gpu assistant functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-cache-integration',
    label: 'Gpu Cache Integration',
    route: '/demo/gpu-cache-integration',
    icon: '🎮',
    description: 'demo gpu cache integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-chat',
    label: 'Gpu Chat',
    route: '/demo/gpu-chat',
    icon: '🎮',
    description: 'demo gpu chat functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-inference',
    label: 'Gpu Inference',
    route: '/demo/gpu-inference',
    icon: '🎮',
    description: 'demo gpu inference functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-gpu-legal-ai-lawpdfs',
    label: 'Lawpdfs',
    route: '/demo/gpu-legal-ai/lawpdfs',
    icon: '🎮',
    description: 'demo lawpdfs functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-headless-ui-showcase',
    label: 'Headless Ui Showcase',
    route: '/demo/headless-ui-showcase',
    icon: '🎮',
    description: 'demo headless ui showcase functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-hybrid-cache-architecture',
    label: 'Hybrid Cache Architecture',
    route: '/demo/hybrid-cache-architecture',
    icon: '🎮',
    description: 'demo hybrid cache architecture functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-hybrid-legal-analysis',
    label: 'Hybrid Legal Analysis',
    route: '/demo/hybrid-legal-analysis',
    icon: '🎮',
    description: 'demo hybrid legal analysis functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-instant-search',
    label: 'Instant Search',
    route: '/demo/instant-search',
    icon: '🎮',
    description: 'demo instant search functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-integrated-system',
    label: 'Integrated System',
    route: '/demo/integrated-system',
    icon: '🎮',
    description: 'demo integrated system functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-lazy-loading',
    label: 'Lazy Loading',
    route: '/demo/lazy-loading',
    icon: '🎮',
    description: 'demo lazy loading functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-legal-ai-platform',
    label: 'Legal Ai Platform',
    route: '/demo/legal-ai-platform',
    icon: '🎮',
    description: 'demo legal ai platform functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-legal-components',
    label: 'Legal Components',
    route: '/demo/legal-components',
    icon: '🎮',
    description: 'demo legal components functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-legal-search',
    label: 'Legal Search',
    route: '/demo/legal-search',
    icon: '🎮',
    description: 'demo legal search functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-nes-bits-ui',
    label: 'Nes Bits Ui',
    route: '/demo/nes-bits-ui',
    icon: '🎮',
    description: 'demo nes bits ui functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-nes-yorha-3d',
    label: 'Nes Yorha 3d',
    route: '/demo/nes-yorha-3d',
    icon: '🎮',
    description: 'demo nes yorha 3d functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-nes-yorha-hybrid',
    label: 'Nes Yorha Hybrid',
    route: '/demo/nes-yorha-hybrid',
    icon: '🎮',
    description: 'demo nes yorha hybrid functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-neural-sprite',
    label: 'Neural Sprite',
    route: '/demo/neural-sprite',
    icon: '🎮',
    description: 'demo neural sprite functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-observability',
    label: 'Observability',
    route: '/demo/observability',
    icon: '🎮',
    description: 'demo observability functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-ollama-integration',
    label: 'Ollama Integration',
    route: '/demo/ollama-integration',
    icon: '🎮',
    description: 'demo ollama integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-phase14',
    label: 'Phase14',
    route: '/demo/phase14',
    icon: '🎮',
    description: 'demo phase14 functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-productivity-ai-integration',
    label: 'Productivity Ai Integration',
    route: '/demo/productivity-ai-integration',
    icon: '🎮',
    description: 'demo productivity ai integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-progressive-gaming-ui',
    label: 'Progressive Gaming Ui',
    route: '/demo/progressive-gaming-ui',
    icon: '🎮',
    description: 'demo progressive gaming ui functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-ps1-effects-advanced',
    label: 'Ps1 Effects Advanced',
    route: '/demo/ps1-effects-advanced',
    icon: '🎮',
    description: 'demo ps1 effects advanced functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-ps1-stories',
    label: 'Ps1 Stories',
    route: '/demo/ps1-stories',
    icon: '🎮',
    description: 'demo ps1 stories functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-rag-integration',
    label: 'Rag Integration',
    route: '/demo/rag-integration',
    icon: '🎮',
    description: 'demo rag integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-real-time-search',
    label: 'Real Time Search',
    route: '/demo/real-time-search',
    icon: '🎮',
    description: 'demo real time search functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-recommendation-system',
    label: 'Recommendation System',
    route: '/demo/recommendation-system',
    icon: '🎮',
    description: 'demo recommendation system functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-retro-gpu-metrics',
    label: 'Retro Gpu Metrics',
    route: '/demo/retro-gpu-metrics',
    icon: '🎮',
    description: 'demo retro gpu metrics functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-semantic-3d',
    label: 'Semantic 3d',
    route: '/demo/semantic-3d',
    icon: '🎮',
    description: 'demo semantic 3d functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-semantic-search',
    label: 'Semantic Search',
    route: '/demo/semantic-search',
    icon: '🎮',
    description: 'demo semantic search functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-shader-cache',
    label: 'Shader Cache',
    route: '/demo/shader-cache',
    icon: '🎮',
    description: 'demo shader cache functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-simd-glyphs',
    label: 'Simd Glyphs',
    route: '/demo/simd-glyphs',
    icon: '🎮',
    description: 'demo simd glyphs functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-streaming-workflow',
    label: 'Streaming Workflow',
    route: '/demo/streaming-workflow',
    icon: '🎮',
    description: 'demo streaming workflow functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-system-integration',
    label: 'System Integration',
    route: '/demo/system-integration',
    icon: '🎮',
    description: 'demo system integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-ui-components',
    label: 'Ui Components',
    route: '/demo/ui-components',
    icon: '🎮',
    description: 'demo ui components functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-unified-integration',
    label: 'Unified Integration',
    route: '/demo/unified-integration',
    icon: '🎮',
    description: 'demo unified integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-unified-vector',
    label: 'Unified Vector',
    route: '/demo/unified-vector',
    icon: '🎮',
    description: 'demo unified vector functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-vector-pipeline',
    label: 'Vector Pipeline',
    route: '/demo/vector-pipeline',
    icon: '🎮',
    description: 'demo vector pipeline functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-wasm-parser',
    label: 'Wasm Parser',
    route: '/demo/wasm-parser',
    icon: '🎮',
    description: 'demo wasm parser functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-webasm-ai-complete',
    label: 'Webasm Ai Complete',
    route: '/demo/webasm-ai-complete',
    icon: '🎮',
    description: 'demo webasm ai complete functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-webgpu-graph',
    label: 'Webgpu Graph',
    route: '/demo/webgpu-graph',
    icon: '🎮',
    description: 'demo webgpu graph functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-webgpu-quantization',
    label: 'Webgpu Quantization',
    route: '/demo/webgpu-quantization',
    icon: '🎮',
    description: 'demo webgpu quantization functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-webgpu-webasm-integration',
    label: 'Webgpu Webasm Integration',
    route: '/demo/webgpu-webasm-integration',
    icon: '🎮',
    description: 'demo webgpu webasm integration functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demo-xstate-auth',
    label: 'Xstate Auth',
    route: '/demo/xstate-auth',
    icon: '🎮',
    description: 'demo xstate auth functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'demos',
    label: 'Demos',
    route: '/demos',
    icon: '📄',
    description: 'utilities demos functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'demos-ingest-assistant',
    label: 'Ingest Assistant',
    route: '/demos/ingest-assistant',
    icon: '📄',
    description: 'utilities ingest assistant functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'demos-ingest-simple',
    label: 'Ingest Simple',
    route: '/demos/ingest-simple',
    icon: '📄',
    description: 'utilities ingest simple functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'demos-nes-auth',
    label: 'Nes Auth',
    route: '/demos/nes-auth',
    icon: '📄',
    description: 'utilities nes auth functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'detective-canvas',
    label: 'Canvas',
    route: '/detective/canvas',
    icon: '📄',
    description: 'utilities canvas functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-demo',
    label: 'Dev Demo',
    route: '/dev-demo',
    icon: '🎮',
    description: 'demo dev demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'dev-ai-setup',
    label: 'Ai Setup',
    route: '/dev/ai-setup',
    icon: '🤖',
    description: 'ai ai setup functionality',
    category: 'ai',
    status: 'active',
    tags: ['auto-generated', 'ai', 'intelligence']
  },
  {
    id: 'dev-cache-demo',
    label: 'Cache Demo',
    route: '/dev/cache-demo',
    icon: '🎮',
    description: 'demo cache demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'dev-enhanced-processor',
    label: 'Enhanced Processor',
    route: '/dev/enhanced-processor',
    icon: '📄',
    description: 'utilities enhanced processor functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-gpu-tiling',
    label: 'Gpu Tiling',
    route: '/dev/gpu-tiling',
    icon: '🔧',
    description: 'system gpu tiling functionality',
    category: 'system',
    status: 'active',
    tags: ['auto-generated', 'gpu', 'performance']
  },
  {
    id: 'dev-ingest-status',
    label: 'Ingest Status',
    route: '/dev/ingest-status',
    icon: '📄',
    description: 'utilities ingest status functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-ingestion-dashboard',
    label: 'Ingestion Dashboard',
    route: '/dev/ingestion-dashboard',
    icon: '📄',
    description: 'utilities ingestion dashboard functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-metrics',
    label: 'Metrics',
    route: '/dev/metrics',
    icon: '📄',
    description: 'utilities metrics functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-pgvector-test',
    label: 'Pgvector Test',
    route: '/dev/pgvector-test',
    icon: '📄',
    description: 'utilities pgvector test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-suggestions',
    label: 'Suggestions',
    route: '/dev/suggestions',
    icon: '📄',
    description: 'utilities suggestions functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'dev-tensor-demo',
    label: 'Tensor Demo',
    route: '/dev/tensor-demo',
    icon: '🎮',
    description: 'demo tensor demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'dev-vite-error-demo',
    label: 'Vite Error Demo',
    route: '/dev/vite-error-demo',
    icon: '🎮',
    description: 'demo vite error demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'dev-webgpu-diagnostics',
    label: 'Webgpu Diagnostics',
    route: '/dev/webgpu-diagnostics',
    icon: '🔧',
    description: 'system webgpu diagnostics functionality',
    category: 'system',
    status: 'active',
    tags: ['auto-generated', 'gpu', 'performance']
  },
  {
    id: 'document-editor-demo',
    label: 'Document Editor Demo',
    route: '/document-editor-demo',
    icon: '🎮',
    description: 'demo document editor demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'editor',
    label: 'Editor',
    route: '/editor',
    icon: '📄',
    description: 'utilities editor functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'enhanced',
    label: 'Enhanced',
    route: '/enhanced',
    icon: '📄',
    description: 'utilities enhanced functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidence-analyze',
    label: 'Analyze',
    route: '/evidence/analyze',
    icon: '📄',
    description: 'utilities analyze functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidence-hash',
    label: 'Hash',
    route: '/evidence/hash',
    icon: '📄',
    description: 'utilities hash functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidence-manage',
    label: 'Manage',
    route: '/evidence/manage',
    icon: '📄',
    description: 'utilities manage functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidence-realtime',
    label: 'Realtime',
    route: '/evidence/realtime',
    icon: '📄',
    description: 'utilities realtime functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidence-upload',
    label: 'Upload',
    route: '/evidence/upload',
    icon: '📄',
    description: 'utilities upload functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'evidenceboard',
    label: 'Evidenceboard',
    route: '/evidenceboard',
    icon: '📄',
    description: 'utilities evidenceboard functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'examples-svelte5',
    label: 'Svelte5',
    route: '/examples/svelte5',
    icon: '📄',
    description: 'utilities svelte5 functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'frameworks-demo',
    label: 'Frameworks Demo',
    route: '/frameworks-demo',
    icon: '🎮',
    description: 'demo frameworks demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'golden-ratio-demo',
    label: 'Golden Ratio Demo',
    route: '/golden-ratio-demo',
    icon: '🎮',
    description: 'demo golden ratio demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'interactive-canvas',
    label: 'Interactive Canvas',
    route: '/interactive-canvas',
    icon: '📄',
    description: 'utilities interactive canvas functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'law',
    label: 'Law',
    route: '/law',
    icon: '📄',
    description: 'utilities law functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'local-ai-demo',
    label: 'Local Ai Demo',
    route: '/local-ai-demo',
    icon: '🎮',
    description: 'demo local ai demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'logout',
    label: 'Logout',
    route: '/logout',
    icon: '📄',
    description: 'utilities logout functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'modern-demo',
    label: 'Modern Demo',
    route: '/modern-demo',
    icon: '🎮',
    description: 'demo modern demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'neural-topology-demo',
    label: 'Neural Topology Demo',
    route: '/neural-topology-demo',
    icon: '🎮',
    description: 'demo neural topology demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'nier-showcase',
    label: 'Nier Showcase',
    route: '/nier-showcase',
    icon: '📄',
    description: 'utilities nier showcase functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'original-home',
    label: 'Original Home',
    route: '/original-home',
    icon: '📄',
    description: 'utilities original home functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'persons',
    label: 'Persons',
    route: '/persons',
    icon: '📄',
    description: 'utilities persons functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'phase13-demo',
    label: 'Phase13 Demo',
    route: '/phase13-demo',
    icon: '🎮',
    description: 'demo phase13 demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'pipeline-demo',
    label: 'Pipeline Demo',
    route: '/pipeline-demo',
    icon: '🎮',
    description: 'demo pipeline demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'poi',
    label: 'Poi',
    route: '/poi',
    icon: '📄',
    description: 'utilities poi functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'rag',
    label: 'Rag',
    route: '/rag',
    icon: '📄',
    description: 'utilities rag functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'recommendations-demo',
    label: 'Recommendations Demo',
    route: '/recommendations-demo',
    icon: '🎮',
    description: 'demo recommendations demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'shadersearch',
    label: 'Shader_search',
    route: '/shader_search',
    icon: '📄',
    description: 'utilities shader_search functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'simple',
    label: 'Simple',
    route: '/simple',
    icon: '📄',
    description: 'utilities simple functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'simple-test',
    label: 'Simple Test',
    route: '/simple-test',
    icon: '📄',
    description: 'utilities simple test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'simple-upload-test',
    label: 'Simple Upload Test',
    route: '/simple-upload-test',
    icon: '📄',
    description: 'utilities simple upload test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'state-persistence',
    label: 'Persistence',
    route: '/state/persistence',
    icon: '📄',
    description: 'utilities persistence functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'state-transitions',
    label: 'Transitions',
    route: '/state/transitions',
    icon: '📄',
    description: 'utilities transitions functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'test-ai-ask',
    label: 'Test Ai Ask',
    route: '/test-ai-ask',
    icon: '🔬',
    description: 'dev test ai ask functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-ai-assistant',
    label: 'Test Ai Assistant',
    route: '/test-ai-assistant',
    icon: '🔬',
    description: 'dev test ai assistant functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-button',
    label: 'Test Button',
    route: '/test-button',
    icon: '🔬',
    description: 'dev test button functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-buttons',
    label: 'Test Buttons',
    route: '/test-buttons',
    icon: '🔬',
    description: 'dev test buttons functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-case',
    label: 'Test Case',
    route: '/test-case',
    icon: '🔬',
    description: 'dev test case functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-components',
    label: 'Test Components',
    route: '/test-components',
    icon: '🔬',
    description: 'dev test components functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-crud',
    label: 'Test Crud',
    route: '/test-crud',
    icon: '🔬',
    description: 'dev test crud functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-embedding',
    label: 'Test Embedding',
    route: '/test-embedding',
    icon: '🔬',
    description: 'dev test embedding functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-enhanced-actions',
    label: 'Test Enhanced Actions',
    route: '/test-enhanced-actions',
    icon: '🔬',
    description: 'dev test enhanced actions functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-enhanced-upload',
    label: 'Test Enhanced Upload',
    route: '/test-enhanced-upload',
    icon: '🔬',
    description: 'dev test enhanced upload functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-forms',
    label: 'Test Forms',
    route: '/test-forms',
    icon: '🔬',
    description: 'dev test forms functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-gemma3',
    label: 'Test Gemma3',
    route: '/test-gemma3',
    icon: '🔬',
    description: 'dev test gemma3 functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-gpu-cache',
    label: 'Test Gpu Cache',
    route: '/test-gpu-cache',
    icon: '🔬',
    description: 'dev test gpu cache functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-gpu-metrics',
    label: 'Test Gpu Metrics',
    route: '/test-gpu-metrics',
    icon: '🔬',
    description: 'dev test gpu metrics functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-integration',
    label: 'Test Integration',
    route: '/test-integration',
    icon: '🔬',
    description: 'dev test integration functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-simple',
    label: 'Test Simple',
    route: '/test-simple',
    icon: '🔬',
    description: 'dev test simple functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-svelte5',
    label: 'Test Svelte5',
    route: '/test-svelte5',
    icon: '🔬',
    description: 'dev test svelte5 functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-upload',
    label: 'Test Upload',
    route: '/test-upload',
    icon: '🔬',
    description: 'dev test upload functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-xstate',
    label: 'Test Xstate',
    route: '/test-xstate',
    icon: '🔬',
    description: 'dev test xstate functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-gallery-api',
    label: 'Gallery Api',
    route: '/test/gallery-api',
    icon: '🔬',
    description: 'dev gallery api functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-n64-button',
    label: 'N64 Button',
    route: '/test/n64-button',
    icon: '🔬',
    description: 'dev n64 button functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-n64-legal-progress',
    label: 'N64 Legal Progress',
    route: '/test/n64-legal-progress',
    icon: '🔬',
    description: 'dev n64 legal progress functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-status',
    label: 'Status',
    route: '/test/status',
    icon: '🔬',
    description: 'dev status functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'test-webasm-langchain',
    label: 'Webasm Langchain',
    route: '/test/webasm-langchain',
    icon: '🔬',
    description: 'dev webasm langchain functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'text-editor',
    label: 'Text Editor',
    route: '/text-editor',
    icon: '📄',
    description: 'utilities text editor functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'ui-demo',
    label: 'Ui Demo',
    route: '/ui-demo',
    icon: '🎮',
    description: 'demo ui demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'upload-test',
    label: 'Upload Test',
    route: '/upload-test',
    icon: '📄',
    description: 'utilities upload test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'w1',
    label: 'W1',
    route: '/w1',
    icon: '📄',
    description: 'utilities w1 functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'wasm-gpu-demo',
    label: 'Wasm Gpu Demo',
    route: '/wasm-gpu-demo',
    icon: '🎮',
    description: 'demo wasm gpu demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'windows-gguf-demo',
    label: 'Windows Gguf Demo',
    route: '/windows-gguf-demo',
    icon: '🎮',
    description: 'demo windows gguf demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'yorha',
    label: 'Yorha',
    route: '/yorha',
    icon: '📄',
    description: 'utilities yorha functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-command-center',
    label: 'Yorha Command Center',
    route: '/yorha-command-center',
    icon: '📄',
    description: 'utilities yorha command center functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-demo',
    label: 'Yorha Demo',
    route: '/yorha-demo',
    icon: '🎮',
    description: 'demo yorha demo functionality',
    category: 'demo',
    status: 'active',
    tags: ['auto-generated', 'demo', 'showcase']
  },
  {
    id: 'yorha-home',
    label: 'Yorha Home',
    route: '/yorha-home',
    icon: '📄',
    description: 'utilities yorha home functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-simple',
    label: 'Yorha Simple',
    route: '/yorha-simple',
    icon: '📄',
    description: 'utilities yorha simple functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-test',
    label: 'Yorha Test',
    route: '/yorha-test',
    icon: '📄',
    description: 'utilities yorha test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-api-test',
    label: 'Api Test',
    route: '/yorha/api-test',
    icon: '📄',
    description: 'utilities api test functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-components',
    label: 'Components',
    route: '/yorha/components',
    icon: '📄',
    description: 'utilities components functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-dashboard',
    label: 'Dashboard',
    route: '/yorha/dashboard',
    icon: '📄',
    description: 'utilities dashboard functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  },
  {
    id: 'yorha-detective-test',
    label: 'Test',
    route: '/yorha/detective/test',
    icon: '🔬',
    description: 'dev test functionality',
    category: 'dev',
    status: 'development',
    tags: ['auto-generated', 'testing', 'development']
  },
  {
    id: 'yorha-terminal',
    label: 'Terminal',
    route: '/yorha/terminal',
    icon: '📄',
    description: 'utilities terminal functionality',
    category: 'utilities',
    status: 'active',
    tags: ['auto-generated']
  }
,
  // Auto-generated missing routes

];

// Helper functions for route management
export function getRoutesByCategory(category: RouteDefinition['category']): RouteDefinition[] {
  return allRoutes.filter(route => route.category === category);
}

export function getActiveRoutes(): RouteDefinition[] {
  return allRoutes.filter(route => route.status === 'active');
}

export function searchRoutes(query: string): RouteDefinition[] {
  const lowerQuery = query.toLowerCase();
  return allRoutes.filter(route =>
    route.label.toLowerCase().includes(lowerQuery) ||
    route.description.toLowerCase().includes(lowerQuery) ||
    route.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

export function getRouteById(id: string): RouteDefinition | undefined {
  return allRoutes.find(route => route.id === id);
}

export function getRoutesByTag(tag: string): RouteDefinition[] {
  return allRoutes.filter(route => route.tags.includes(tag));
}

// Route categories with metadata
export const routeCategories = {
  main: {
    label: 'CORE OPERATIONS',
    icon: '⚡',
    description: 'Primary system operations and tools',
    color: '#ffbf00'
  },
  demo: {
    label: 'AI DEMONSTRATIONS',
    icon: '🎯',
    description: 'AI capabilities and technology showcases',
    color: '#00ff41'
  },
  ai: {
    label: 'AI SYSTEMS',
    icon: '🤖',
    description: 'Artificial intelligence tools and interfaces',
    color: '#ff6b6b'
  },
  legal: {
    label: 'LEGAL OPERATIONS',
    icon: '⚖️',
    description: 'Legal-specific tools and workflows',
    color: '#4ecdc4'
  },
  dev: {
    label: 'DEVELOPMENT TOOLS',
    icon: '🔧',
    description: 'Development and debugging utilities',
    color: '#a78bfa'
  },
  admin: {
    label: 'ADMINISTRATION',
    icon: '⚙️',
    description: 'System administration and configuration',
    color: '#fb7185'
  }
};

// Statistics for dashboard
export const routeStats = {
  total: allRoutes.length,
  active: getActiveRoutes().length,
  experimental: allRoutes.filter(r => r.status === 'experimental').length,
  beta: allRoutes.filter(r => r.status === 'beta').length,
  deprecated: allRoutes.filter(r => r.status === 'deprecated').length,
  byCategory: Object.keys(routeCategories).reduce((acc, category) => {
    acc[category] = getRoutesByCategory(category as RouteDefinition['category']).length;
    return acc;
  }, {} as Record<string, number>)
};

// Additional interfaces and types for compatibility
export interface DynamicRouteConfig {
  path: string;
  component?: any;
  metadata?: Record<string, any>;
}

export interface GeneratedRoute {
  path: string;
  handler: any;
  config: DynamicRouteConfig;
}

export interface NavigationGuard {
  name: string;
  condition: (route: RouteDefinition) => boolean;
}

// Route registry for dynamic route management
export const routeRegistry = new Map<string, RouteDefinition>();
// Initialize route registry
allRoutes.forEach(route => {
  routeRegistry.set(route.id, route);
});

// Dynamic route management functions
export function getRoute(id: string): RouteDefinition | undefined {
  return routeRegistry.get(id) || getRouteById(id);
}

export function getAllDynamicRoutes(): RouteDefinition[] {
  return Array.from(routeRegistry.values());
}

export function registerDynamicRoute(config: DynamicRouteConfig): GeneratedRoute {
  return {
    path: config.path,
    handler: config.component,
    config
  };
}