/**
 * Gemma3 Legal Model Configuration
 * Optimized for RTX 3060 Ti and legal document analysis
 */

export interface Gemma3LegalConfig {
  model: {
    name: string;
    version: string;
    size: string;
    context_length: number;
    gpu_layers: number;
    memory_requirement: string;
  };
  generation: {
    temperature: number;
    top_p: number;
    top_k: number;
    repeat_penalty: number;
    max_tokens: number;
    stop_sequences: string[];
  };
  legal_prompts: {
    contract_analysis: string;
    case_summary: string;
    document_review: string;
    precedent_search: string;
    compliance_check: string;
    risk_assessment: string;
  };
  gpu_optimization: {
    enable_gpu: boolean;
    gpu_memory_fraction: number;
    batch_size: number;
    parallel_requests: number;
    quantization: 'int8' | 'int4' | 'fp16' | 'fp32';
    tensor_parallel: boolean;
  };
  rag_integration: {
    enable_rag: boolean;
    vector_db: 'postgresql' | 'qdrant';
    embedding_model: string;
    similarity_threshold: number;
    max_context_chunks: number;
    rerank_results: boolean;
  };
  legal_domains: {
    contract_law: boolean;
    criminal_law: boolean;
    corporate_law: boolean;
    intellectual_property: boolean;
    employment_law: boolean;
    real_estate: boolean;
    family_law: boolean;
    tax_law: boolean;
  };
}

export const GEMMA3_LEGAL_CONFIG: Gemma3LegalConfig = {
  model: {
    name: 'gemma3-legal',
    version: 'latest',
    size: '7.3GB',
    context_length: 8192,
    gpu_layers: 35, // Optimized for RTX 3060 Ti (8GB VRAM)
    memory_requirement: '7.3GB'
  },
  
  generation: {
    temperature: 0.1, // Low for factual legal analysis
    top_p: 0.9,
    top_k: 40,
    repeat_penalty: 1.1,
    max_tokens: 2048,
    stop_sequences: [
      '\n\n---',
      '\nUser:',
      '\nHuman:',
      '\n\nNote:'
    ]
  },

  legal_prompts: {
    contract_analysis: `You are a senior legal analyst specializing in contract review. Analyze the following contract with attention to:

1. Key Terms & Obligations
2. Risk Factors & Liabilities
3. Compliance Issues
4. Termination Clauses
5. Dispute Resolution
6. Recommendations

Contract to analyze:
{document}

Provide a comprehensive analysis with specific legal citations where applicable.`,

    case_summary: `You are a legal research assistant. Create a comprehensive case summary including:

1. Case Facts
2. Legal Issues
3. Court Holdings
4. Legal Reasoning
5. Precedential Value
6. Related Cases

Case materials:
{document}

Provide a structured summary suitable for legal research databases.`,

    document_review: `You are a document review specialist. Review the following legal document for:

1. Privilege Issues
2. Responsiveness to Discovery
3. Confidentiality Concerns
4. Relevance Rating
5. Key Information Extraction
6. Follow-up Actions

Document:
{document}

Provide detailed review notes with confidence ratings.`,

    precedent_search: `You are a legal research expert. Search for relevant legal precedents based on:

Query: {query}
Context: {context}

Find and analyze:
1. Directly applicable cases
2. Analogous precedents
3. Distinguishable cases
4. Jurisdictional variations
5. Recent developments
6. Practical implications

Provide detailed precedent analysis with citation formats.`,

    compliance_check: `You are a compliance officer. Review the following for regulatory compliance:

1. Applicable Regulations
2. Compliance Gaps
3. Risk Assessment
4. Remediation Steps
5. Monitoring Requirements
6. Documentation Needs

Materials to review:
{document}

Provide comprehensive compliance assessment.`,

    risk_assessment: `You are a legal risk analyst. Assess legal risks in:

1. Liability Exposure
2. Regulatory Risks
3. Contractual Risks
4. Litigation Probability
5. Financial Impact
6. Mitigation Strategies

Subject matter:
{document}

Provide detailed risk matrix with severity and likelihood ratings.`
  },

  gpu_optimization: {
    enable_gpu: true,
    gpu_memory_fraction: 0.85, // Use 85% of RTX 3060 Ti memory
    batch_size: 8,
    parallel_requests: 4,
    quantization: 'int8', // Balance between speed and quality
    tensor_parallel: false // Single GPU setup
  },

  rag_integration: {
    enable_rag: true,
    vector_db: 'postgresql', // Use pgvector
    embedding_model: 'nomic-embed-text',
    similarity_threshold: 0.7,
    max_context_chunks: 10,
    rerank_results: true
  },

  legal_domains: {
    contract_law: true,
    criminal_law: true,
    corporate_law: true,
    intellectual_property: true,
    employment_law: true,
    real_estate: true,
    family_law: false, // Specialized domain
    tax_law: false     // Specialized domain
  }
};

// Legal entity extraction patterns
export const LEGAL_ENTITY_PATTERNS = {
  parties: [
    /\b(plaintiff|defendant|appellant|appellee|petitioner|respondent)\b/gi,
    /\b([A-Z][a-z]+ (?:v\.|vs\.|versus) [A-Z][a-z]+)\b/g,
    /\b([A-Z][A-Za-z\s&,.]+ (?:Inc\.|LLC|Corp\.|Corporation|Company|Co\.))\b/g
  ],
  
  dates: [
    /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
    /\b([A-Z][a-z]+ \d{1,2}, \d{4})\b/g,
    /\b(\d{4}-\d{2}-\d{2})\b/g
  ],
  
  citations: [
    /\b(\d+ [A-Z][a-z.]+ \d+(?:, \d+)? \(\d{4}\))\b/g,
    /\b(\d+ U\.S\.C\. (?:§ )?\d+(?:\([a-z0-9]+\))?)\b/g,
    /\b(\d+ C\.F\.R\. (?:§ )?\d+(?:\.\d+)?)\b/g
  ],
  
  amounts: [
    /\$[\d,]+(?:\.\d{2})?/g,
    /\b(\d+(?:,\d{3})*) dollars?\b/gi
  ],
  
  clauses: [
    /\b(indemnification|limitation of liability|force majeure|termination|confidentiality|non-disclosure)\b/gi,
    /\b(warranty|representation|covenant|agreement|obligation)\b/gi
  ]
};

// Performance optimization settings
export const PERFORMANCE_CONFIG = {
  // Model loading optimization
  model_loading: {
    preload: true,
    keep_alive: '30m',
    offload_kqv: true,
    flash_attention: true
  },
  
  // Memory management
  memory: {
    mlock: true,
    mmap: true,
    numa: false, // Single GPU setup
    low_vram: false // RTX 3060 Ti has sufficient VRAM
  },
  
  // Inference optimization
  inference: {
    use_fast_tokenizer: true,
    use_cache: true,
    cache_size: '2GB',
    beam_search: false, // Use sampling for legal creativity
    early_stopping: true
  },
  
  // Multi-threading
  threading: {
    num_threads: 8, // Match CPU cores
    num_gpu_layers: 35,
    num_batch: 512,
    num_predict: 2048
  }
};

// API integration endpoints
export const API_ENDPOINTS = {
  ollama: {
    base_url: 'http://localhost:11434',
    generate: '/api/generate',
    chat: '/api/chat',
    embeddings: '/api/embeddings',
    models: '/api/tags'
  },
  
  enhanced_rag: {
    base_url: 'http://localhost:8094',
    query: '/api/v1/rag',
    search: '/api/v1/search',
    index: '/api/v1/index',
    health: '/health'
  },
  
  legal_services: {
    base_url: 'grpc://localhost:50051',
    analyze: '/legal.v1.LegalService/Analyze',
    review: '/legal.v1.LegalService/Review',
    search: '/legal.v1.LegalService/Search'
  }
};

// Prompt templates for specific legal tasks
export const PROMPT_TEMPLATES = {
  contract_clause_extraction: `Extract all clauses from this contract and categorize them:

{document}

Format as JSON with categories: payment, termination, liability, confidentiality, warranty, other.`,

  due_diligence_checklist: `Create a due diligence checklist for this transaction:

{document}

Include: corporate structure, financial records, contracts, litigation, IP, employment, regulatory compliance.`,

  compliance_gap_analysis: `Identify compliance gaps in these documents against {regulation}:

{document}

Provide: gap description, risk level, remediation steps, timeline.`,

  litigation_timeline: `Create a litigation timeline from these case materials:

{document}

Include: key dates, deadlines, milestones, dependencies.`,

  contract_risk_scoring: `Score contract risks on a scale of 1-10:

{document}

Evaluate: financial risk, legal risk, operational risk, reputational risk.`
};

export default GEMMA3_LEGAL_CONFIG;