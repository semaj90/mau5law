// Enhanced thinking style processor for legal AI
export interface ThinkingAnalysis {
  thinking: string;
  analysis: any;
  confidence: number;
  reasoning_steps: string[];
  metadata: {
    model_used: string;
    processing_time: number;
    thinking_enabled: boolean;
  };
}

// Enhanced analysis with GRPO integration flag
export interface EnhancedThinkingOptions extends AnalysisOptions {
  useGRPO?: boolean;
  enableRecommendations?: boolean;
  userId?: string;
  userRole?: string;
}

export interface AnalysisOptions {
  evidenceId?: string;
  caseId?: string;
  documentType?: 'evidence' | 'case_file' | 'legal_document' | 'ocr_scan';
  analysisType?: 'classification' | 'extraction' | 'reasoning' | 'compliance' | 'chain_of_custody';
  useThinkingStyle?: boolean;
  contextDocuments?: string[];
}

export class ThinkingProcessor {
  
  /**
   * Analyzes a document using the enhanced API endpoint
   */
  static async analyzeDocument(text: string, options: AnalysisOptions = {}): Promise<ThinkingAnalysis> {
    // Check if enhanced GRPO should be used
    const enhancedOptions = options as EnhancedThinkingOptions;
    const useGRPO = enhancedOptions.useGRPO || false;
    
    const endpoint = useGRPO ? '/api/ai/enhanced-grpo' : '/api/analyze';
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        query: text,
        userId: enhancedOptions.userId,
        userRole: enhancedOptions.userRole,
        enableRecommendations: enhancedOptions.enableRecommendations || false,
        ...options
      }),
    });

    if (!response.ok) {
      throw new Error(`Analysis failed: ${response.statusText}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(result.error || 'Analysis failed');
    }

    // Return enhanced analysis if GRPO was used
    if (useGRPO && result.analysis.structured_reasoning) {
      return {
        thinking: result.analysis.thinking || '',
        analysis: result.analysis.response || result.analysis.analysis || result.analysis,
        confidence: result.analysis.confidence,
        reasoning_steps: result.analysis.reasoning_steps || [],
        metadata: {
          ...result.metadata,
          grpo_enhanced: true,
          recommendations_count: result.analysis.recommendations?.length || 0,
          temporal_score: result.analysis.temporal_score,
          structured_reasoning: result.analysis.structured_reasoning
        }
      };
    }

    // Standard analysis response
    return {
      thinking: result.analysis.thinking || '',
      analysis: result.analysis.analysis || result.analysis,
      confidence: result.metadata.confidence,
      reasoning_steps: result.analysis.reasoning_steps || [],
      metadata: result.metadata
    };
  }

  /**
   * Analyzes evidence by ID
   */
  static async analyzeEvidence(evidenceId: string, options: Omit<AnalysisOptions, 'evidenceId'> = {}): Promise<ThinkingAnalysis> {
    return this.analyzeDocument('', { evidenceId, ...options });
  }

  /**
   * Analyzes a case by ID
   */
  static async analyzeCase(caseId: string, options: Omit<AnalysisOptions, 'caseId'> = {}): Promise<ThinkingAnalysis> {
    return this.analyzeDocument('', { caseId, ...options });
  }

  /**
   * Parses a thinking-style response from the API
   */
  static parseThinkingResponse(content: string, useThinking: boolean): ThinkingAnalysis {
    if (!useThinking) {
      return {
        thinking: '',
        analysis: this.extractJSON(content) || { raw_analysis: content },
        confidence: 0.8,
        reasoning_steps: [],
        metadata: {
          model_used: 'quick',
          processing_time: 0,
          thinking_enabled: false
        }
      };
    }

    const thinkingMatch = content.match(/<\|thinking\|>([\s\S]*?)<\/\|thinking\|>/);
    const thinking = thinkingMatch ? thinkingMatch[1].trim() : '';
    
    const afterThinking = content.replace(/<\|thinking\|>[\s\S]*?<\/\|thinking\|>/, '').trim();
    
    return {
      thinking,
      analysis: this.extractJSON(afterThinking) || { raw_analysis: afterThinking },
      confidence: this.calculateConfidence(thinking, afterThinking),
      reasoning_steps: this.extractReasoningSteps(thinking),
      metadata: {
        model_used: 'thinking',
        processing_time: 0,
        thinking_enabled: true
      }
    };
  }

  /**
   * Extracts JSON from text content
   */
  private static extractJSON(text: string): unknown {
    try {
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      return jsonMatch ? JSON.parse(jsonMatch[0]) : null;
    } catch {
      return null;
    }
  }

  /**
   * Calculates confidence score based on thinking depth and analysis quality
   */
  private static calculateConfidence(thinking: string, analysis: string): number {
    let score = 0.6;
    
    // Boost for detailed thinking
    if (thinking.length > 200) score += 0.2;
    if (thinking.includes('evidence') || thinking.includes('analysis')) score += 0.1;
    if (thinking.includes('legal') || thinking.includes('compliance')) score += 0.1;
    
    // Boost for structured analysis
    if (analysis.includes('confidence') || analysis.includes('recommendations')) score += 0.1;
    if (analysis.includes('key_findings') || analysis.includes('legal_implications')) score += 0.1;
    
    return Math.min(0.95, score);
  }

  /**
   * Extracts numbered reasoning steps from thinking content
   */
  private static extractReasoningSteps(thinking: string): string[] {
    return thinking
      .split('\n')
      .filter(line => line.trim().match(/^\d+\./) || line.trim().startsWith('-') || line.trim().startsWith('*'))
      .map(step => step.trim())
      .slice(0, 10); // Limit to 10 steps for UI
  }

  /**
   * Formats thinking content for display
   */
  static formatThinkingContent(thinking: string): string {
    // Add markdown-style formatting for better readability
    return thinking
      .replace(/^(\d+\.\s)/gm, '**$1**')  // Bold numbered steps
      .replace(/^(-\s)/gm, '• ')          // Convert dashes to bullets
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Convert markdown bold to HTML
      .replace(/\n\n/g, '</p><p>')        // Convert double newlines to paragraphs
      .replace(/^(.*)$/gm, '<p>$1</p>');  // Wrap in paragraphs
  }

  /**
   * Gets the appropriate model name based on thinking style
   */
  static getModelName(useThinking: boolean): string {
    return useThinking ? 'legal-gemma3-thinking' : 'gemma3-legal:latest';
  }

  /**
   * Validates analysis results
   */
  static validateAnalysis(analysis: ThinkingAnalysis): boolean {
    return !!(
      analysis &&
      analysis.analysis &&
      typeof analysis.confidence === 'number' &&
      analysis.confidence >= 0 &&
      analysis.confidence <= 1
    );
  }

  /**
   * Gets analysis history for a document
   */
  static async getAnalysisHistory(options: { evidenceId?: string; caseId?: string; limit?: number }): Promise<any[]> {
    const params = new URLSearchParams();
    if (options.evidenceId) params.append('evidenceId', options.evidenceId);
    if (options.caseId) params.append('caseId', options.caseId);
    if (options.limit) params.append('limit', options.limit.toString());

    const response = await fetch(`/api/analyze?${params}`);
    
    if (!response.ok) {
      throw new Error(`Failed to get analysis history: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success ? result.analyses : [];
  }
}

/**
 * Utility functions for working with legal document analysis
 */
export const LegalAnalysisUtils = {
  
  /**
   * Determines the appropriate analysis type for a document
   */
  getAnalysisType(documentType: string, evidenceType?: string): string {
    if (evidenceType === 'chain_of_custody') return 'chain_of_custody';
    if (documentType === 'evidence') return 'classification';
    if (documentType === 'legal_document') return 'compliance';
    if (documentType === 'ocr_scan') return 'extraction';
    return 'reasoning';
  },

  /**
   * Gets the confidence level description
   */
  getConfidenceLabel(confidence: number): { label: string; color: string } {
    if (confidence >= 0.9) return { label: 'Very High', color: '#10b981' };
    if (confidence >= 0.8) return { label: 'High', color: '#3b82f6' };
    if (confidence >= 0.7) return { label: 'Good', color: '#f59e0b' };
    if (confidence >= 0.6) return { label: 'Fair', color: '#ef4444' };
    return { label: 'Low', color: '#6b7280' };
  },

  /**
   * Formats processing time for display
   */
  formatProcessingTime(ms: number): string {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${(ms / 60000).toFixed(1)}m`;
  },

  /**
   * Extracts key legal terms from analysis
   */
  extractLegalTerms(analysis: any): string[] {
    const text = JSON.stringify(analysis).toLowerCase();
    const legalTerms = [
      'evidence', 'witness', 'testimony', 'defendant', 'plaintiff', 'motion',
      'warrant', 'probable cause', 'constitutional', 'admissible', 'hearsay',
      'chain of custody', 'authentication', 'objection', 'sustained', 'overruled'
    ];
    
    return legalTerms.filter(term => text.includes(term));
  }
};

/**
 * Document analysis result from thinking processor
 */
export interface DocumentAnalysisResult {
  id: string;
  document_type: string;
  analysis_type: string;
  key_findings: string[];
  legal_implications: string[];
  recommendations: string[];
  confidence: number;
  risk_assessment?: {
    level: 'low' | 'medium' | 'high';
    factors: string[];
  };
  compliance_status?: {
    compliant: boolean;
    violations: string[];
    recommendations: string[];
  };
  chain_of_custody?: {
    complete: boolean;
    gaps: string[];
    verification_status: string;
  };
}

/**
 * Quick analysis shortcuts for common operations
 */
export const QuickAnalysis = {
  
  /**
   * Quick evidence classification
   */
  async classifyEvidence(evidenceId: string, useThinking = false): Promise<ThinkingAnalysis> {
    return ThinkingProcessor.analyzeEvidence(evidenceId, {
      analysisType: 'classification',
      useThinkingStyle: useThinking
    });
  },

  /**
   * Quick chain of custody verification
   */
  async verifyChainOfCustody(evidenceId: string, useThinking = true): Promise<ThinkingAnalysis> {
    return ThinkingProcessor.analyzeEvidence(evidenceId, {
      analysisType: 'chain_of_custody',
      useThinkingStyle: useThinking // Default to thinking style for custody verification
    });
  },

  /**
   * Quick case strength assessment
   */
  async assessCaseStrength(caseId: string, useThinking = true): Promise<ThinkingAnalysis> {
    return ThinkingProcessor.analyzeCase(caseId, {
      analysisType: 'reasoning',
      useThinkingStyle: useThinking
    });
  },

  /**
   * Quick document compliance check
   */
  async checkCompliance(text: string, useThinking = false): Promise<ThinkingAnalysis> {
    return ThinkingProcessor.analyzeDocument(text, {
      documentType: 'legal_document',
      analysisType: 'compliance',
      useThinkingStyle: useThinking
    });
  }
};
