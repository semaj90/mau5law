/**
 * Enhanced Error Handler Store for Legal AI Platform
 *
 * Comprehensive error handling and monitoring system with legal-specific
 * error management, audit trails, and compliance reporting.
 *
 * Features:
 * - Legal document error tracking
 * - Compliance violation monitoring
 * - Chain of custody error management
 * - Attorney-client privilege error protection
 * - Evidence handling error tracking
 * - Court filing error management
 * - Case management error handling
 * - Performance and audit analytics
 *
 * @author Legal AI Platform Team
 * @version 2.1.0
 * @lastModified 2025-01-20
 */

import { writable, readable, derived, get } from 'svelte/store';
import { browser } from '$app/environment';
import type { Writable, Readable } from 'svelte/store';

// ===== TYPE DEFINITIONS =====

export interface ErrorDetails {
  id: string;
  code?: string;
  message: string;
  details?: string;
  timestamp: Date;
  context?: Record<string, any>;
  stack?: string;
  retry?: () => Promise<void>;
  severity: ErrorSeverity;
  category: ErrorCategory;
  legalContext?: LegalErrorContext;
  compliance?: ComplianceViolation;
  chain_of_custody_error?: boolean;
  privileged_content_exposed?: boolean;
  case_id?: string;
  document_id?: string;
  evidence_id?: string;
  user_id?: string;
}

export interface UserFriendlyError {
  id: string;
  title: string;
  message: string;
  suggestion?: string;
  canRetry?: boolean;
  showDetails?: boolean;
  severity: ErrorSeverity;
  category: ErrorCategory;
  legalGuidance?: string;
  complianceAlert?: boolean;
  requiresLegalReview?: boolean;
  timestamp: Date;
  actions?: ErrorAction[];
}

export interface ErrorAction {
  label: string;
  action: () => Promise<void> | void;
  type: 'primary' | 'secondary' | 'danger';
  requiresConfirmation?: boolean;
}

export interface LegalErrorContext {
  case_type?: 'civil' | 'criminal' | 'corporate' | 'intellectual_property' | 'family' | 'administrative';
  jurisdiction?: string;
  confidentiality_level?: 'public' | 'confidential' | 'privileged' | 'attorney_client' | 'work_product';
  compliance_requirements?: string[];
  affected_parties?: string[];
  potential_sanctions?: string[];
  reporting_required?: boolean;
  retention_period?: number; // days
}

export interface ComplianceViolation {
  regulation: string; // e.g., 'FRCP 26', 'GDPR Article 32', 'HIPAA 164.306'
  violation_type: 'data_breach' | 'access_violation' | 'retention_violation' | 'disclosure_violation' | 'procedural_violation';
  severity: 'low' | 'medium' | 'high' | 'critical';
  required_actions: string[];
  notification_required: boolean;
  notification_timeline?: string; // e.g., '72 hours', '30 days'
  potential_penalties?: string[];
}

export type ErrorSeverity = 'info' | 'warning' | 'error' | 'critical' | 'security' | 'compliance';
export type ErrorCategory =
  | 'network'
  | 'authentication'
  | 'authorization'
  | 'validation'
  | 'file_upload'
  | 'legal_document'
  | 'evidence_handling'
  | 'case_management'
  | 'compliance'
  | 'security'
  | 'chain_of_custody'
  | 'privilege_protection'
  | 'court_filing'
  | 'client_communication'
  | 'database'
  | 'ai_processing'
  | 'system';

export interface ErrorStats {
  total: number;
  byCode: Record<string, number>;
  byCategory: Record<ErrorCategory, number>;
  bySeverity: Record<ErrorSeverity, number>;
  byLegalContext: Record<string, number>;
  complianceViolations: number;
  chainOfCustodyErrors: number;
  privilegeViolations: number;
  recent: ErrorDetails[];
  last24Hours: number;
  last7Days: number;
  last30Days: number;
  trends: {
    increasing: ErrorCategory[];
    decreasing: ErrorCategory[];
    stable: ErrorCategory[];
  };
}

export interface ErrorFilter {
  severity?: ErrorSeverity[];
  category?: ErrorCategory[];
  timeRange?: {
    start: Date;
    end: Date;
  };
  legalContext?: {
    case_type?: string[];
    confidentiality_level?: string[];
    jurisdiction?: string[];
  };
  complianceOnly?: boolean;
  chainOfCustodyOnly?: boolean;
  privilegeViolationsOnly?: boolean;
}

export interface ErrorNotificationSettings {
  enableNotifications: boolean;
  severityThreshold: ErrorSeverity;
  complianceAlerts: boolean;
  chainOfCustodyAlerts: boolean;
  privilegeViolationAlerts: boolean;
  emailNotifications: boolean;
  slackIntegration: boolean;
  retentionDays: number;
}

// ===== ENHANCED ERROR HANDLER CLASS =====

class EnhancedErrorHandler {
  private errorStore: Writable<UserFriendlyError | null>;
  private errorHistory: Writable<ErrorDetails[]>;
  private errorStats: Writable<ErrorStats>;
  private notificationSettings: Writable<ErrorNotificationSettings>;
  private activeFilters: Writable<ErrorFilter>;
  private complianceMonitoring: Writable<boolean>;

  constructor() {
    // Initialize stores
    this.errorStore = writable<UserFriendlyError | null>(null);
    this.errorHistory = writable<ErrorDetails[]>([]);
    this.errorStats = writable<ErrorStats>(this.createEmptyStats());
    this.notificationSettings = writable<ErrorNotificationSettings>({
      enableNotifications: true,
      severityThreshold: 'warning',
      complianceAlerts: true,
      chainOfCustodyAlerts: true,
      privilegeViolationAlerts: true,
      emailNotifications: false,
      slackIntegration: false,
      retentionDays: 2555 // 7 years for legal compliance
    });
    this.activeFilters = writable<ErrorFilter>({});
    this.complianceMonitoring = writable<boolean>(true);

    // Load persisted data
    if (browser) {
      this.loadPersistedData();
      this.setupAutoSave();
      this.setupCleanupJob();
    }
  }

  // ===== CORE ERROR HANDLING =====

  handle(
    error: any,
    context?: Record<string, any>,
    retryFn?: () => Promise<void>,
    legalContext?: LegalErrorContext
  ): UserFriendlyError {
    const errorDetails = this.parseError(error, context, legalContext);

    // Add to history
    this.addToHistory(errorDetails);

    // Create user-friendly error
    const userError = this.createUserFriendlyError(errorDetails, retryFn);
    this.errorStore.set(userError);

    // Handle compliance monitoring
    this.checkComplianceViolations(errorDetails);

    // Log and notify
    this.logError(errorDetails);
    this.triggerNotifications(userError, errorDetails);

    // Update statistics
    this.updateStats();

    return userError;
  }

  // ===== SPECIALIZED ERROR HANDLERS =====

  handleLegalDocumentError(
    error: any,
    documentId: string,
    documentType: string,
    confidentialityLevel: string,
    context?: Record<string, any>,
    retryFn?: () => Promise<void>
  ): UserFriendlyError {
    const legalContext: LegalErrorContext = {
      confidentiality_level: confidentialityLevel as any,
      compliance_requirements: ['FRCP 26', 'Local Court Rules'],
      reporting_required: confidentialityLevel === 'privileged' || confidentialityLevel === 'attorney_client',
      retention_period: 2555 // 7 years
    };

    const enhancedContext = {
      ...context,
      document_id: documentId,
      document_type: documentType,
      category: 'legal_document' as ErrorCategory
    };

    return this.handle(error, enhancedContext, retryFn, legalContext);
  }

  handleChainOfCustodyError(
    error: any,
    evidenceId: string,
    caseId: string,
    custodyAction: string,
    context?: Record<string, any>
  ): UserFriendlyError {
    const compliance: ComplianceViolation = {
      regulation: 'Chain of Custody Protocol',
      violation_type: 'procedural_violation',
      severity: 'high',
      required_actions: [
        'Document the custody break',
        'Notify supervising attorney',
        'File amended custody log',
        'Investigate root cause'
      ],
      notification_required: true,
      notification_timeline: '24 hours',
      potential_penalties: ['Evidence exclusion', 'Sanctions', 'Malpractice claim']
    };

    const legalContext: LegalErrorContext = {
      confidentiality_level: 'privileged',
      compliance_requirements: ['FRE 901', 'Local Evidence Rules'],
      reporting_required: true,
      retention_period: 2555
    };

    const enhancedContext = {
      ...context,
      evidence_id: evidenceId,
      case_id: caseId,
      custody_action: custodyAction,
      category: 'chain_of_custody' as ErrorCategory,
      chain_of_custody_error: true
    };

    const errorDetails = this.parseError(error, enhancedContext, legalContext);
    errorDetails.compliance = compliance;

    this.addToHistory(errorDetails);
    const userError = this.createUserFriendlyError(errorDetails);
    this.errorStore.set(userError);

    // Immediate compliance alert
    this.triggerComplianceAlert(errorDetails);

    return userError;
  }

  handlePrivilegeViolation(
    error: any,
    documentId: string,
    caseId: string,
    exposedContent: string,
    context?: Record<string, any>
  ): UserFriendlyError {
    const compliance: ComplianceViolation = {
      regulation: 'Attorney-Client Privilege Protection',
      violation_type: 'disclosure_violation',
      severity: 'critical',
      required_actions: [
        'Immediate content quarantine',
        'Notify all parties of exposure',
        'File emergency motion for protective order',
        'Conduct privilege review',
        'Implement remedial measures'
      ],
      notification_required: true,
      notification_timeline: 'Immediate',
      potential_penalties: ['Privilege waiver', 'Sanctions', 'Malpractice claim', 'Disciplinary action']
    };

    const legalContext: LegalErrorContext = {
      confidentiality_level: 'attorney_client',
      compliance_requirements: ['MRPC 1.6', 'FRCP 26(b)(3)', 'Local Privilege Rules'],
      reporting_required: true,
      potential_sanctions: ['Privilege waiver', 'Case dismissal'],
      retention_period: 2555
    };

    const enhancedContext = {
      ...context,
      document_id: documentId,
      case_id: caseId,
      exposed_content: exposedContent,
      category: 'privilege_protection' as ErrorCategory,
      privileged_content_exposed: true
    };

    const errorDetails = this.parseError(error, enhancedContext, legalContext);
    errorDetails.compliance = compliance;
    errorDetails.severity = 'critical';

    this.addToHistory(errorDetails);
    const userError = this.createUserFriendlyError(errorDetails);
    this.errorStore.set(userError);

    // Emergency privilege violation protocol
    this.triggerPrivilegeViolationProtocol(errorDetails);

    return userError;
  }

  handleCourtFilingError(
    error: any,
    filingType: string,
    docketNumber: string,
    deadline: Date,
    context?: Record<string, any>,
    retryFn?: () => Promise<void>
  ): UserFriendlyError {
    const isUrgent = deadline && new Date() > new Date(deadline.getTime() - 24 * 60 * 60 * 1000); // Within 24 hours

    const legalContext: LegalErrorContext = {
      compliance_requirements: ['Court Filing Rules', 'Electronic Filing Requirements'],
      reporting_required: isUrgent,
      potential_sanctions: isUrgent ? ['Default judgment', 'Sanctions', 'Dismissal'] : ['Late filing fees'],
      retention_period: 2555
    };

    const enhancedContext = {
      ...context,
      filing_type: filingType,
      docket_number: docketNumber,
      deadline: deadline,
      is_urgent: isUrgent,
      category: 'court_filing' as ErrorCategory
    };

    return this.handle(error, enhancedContext, retryFn, legalContext);
  }

  // ===== STANDARD ERROR HANDLERS =====

  handleApiError(
    response: Response,
    context?: Record<string, any>,
    retryFn?: () => Promise<void>
  ): UserFriendlyError {
    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      code: `HTTP_${response.status}`,
      message: response.statusText || "API request failed",
      details: `${response.status} ${response.statusText}`,
      timestamp: new Date(),
      severity: this.mapHttpStatusToSeverity(response.status),
      category: 'network',
      context: {
        url: response.url,
        status: response.status,
        ...context,
      },
    };

    const userError = this.createUserFriendlyError(errorDetails, retryFn);
    this.errorStore.set(userError);
    this.addToHistory(errorDetails);
    this.updateStats();

    return userError;
  }

  handleNetworkError(
    error: any,
    context?: Record<string, any>,
    retryFn?: () => Promise<void>
  ): UserFriendlyError {
    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      code: "NETWORK_ERROR",
      message: "Network connection failed",
      details: error instanceof Error ? error.message : "Unknown network error",
      timestamp: new Date(),
      severity: 'error',
      category: 'network',
      context: {
        type: "network",
        ...context,
      },
    };

    const userError: UserFriendlyError = {
      id: errorDetails.id,
      title: "Connection Problem",
      message: "Unable to connect to the server. Please check your internet connection.",
      suggestion: "Try refreshing the page or check your network connection.",
      canRetry: !!retryFn,
      severity: 'error',
      category: 'network',
      timestamp: new Date(),
    };

    this.errorStore.set(userError);
    this.addToHistory(errorDetails);
    this.updateStats();

    return userError;
  }

  handleValidationError(
    errors: Record<string, string[]> | string[],
    context?: Record<string, any>
  ): UserFriendlyError {
    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      code: "VALIDATION_ERROR",
      message: "Validation failed",
      details: Array.isArray(errors)
        ? errors.join(", ")
        : Object.entries(errors)
            .map(([field, msgs]) => `${field}: ${msgs.join(", ")}`)
            .join("; "),
      timestamp: new Date(),
      severity: 'warning',
      category: 'validation',
      context: {
        type: "validation",
        errors,
        ...context,
      },
    };

    const userError: UserFriendlyError = {
      id: errorDetails.id,
      title: "Validation Error",
      message: "Please check the form and correct any errors.",
      suggestion: errorDetails.details,
      canRetry: false,
      severity: 'warning',
      category: 'validation',
      timestamp: new Date(),
    };

    this.errorStore.set(userError);
    this.addToHistory(errorDetails);
    this.updateStats();

    return userError;
  }

  handleAuthError(context?: Record<string, any>): UserFriendlyError {
    const errorDetails: ErrorDetails = {
      id: this.generateErrorId(),
      code: "AUTH_ERROR",
      message: "Authentication required",
      details: "User session has expired or is invalid",
      timestamp: new Date(),
      severity: 'warning',
      category: 'authentication',
      context: {
        type: "authentication",
        ...context,
      },
    };

    const userError: UserFriendlyError = {
      id: errorDetails.id,
      title: "Authentication Required",
      message: "Your session has expired. Please log in again.",
      suggestion: "Click to redirect to login page.",
      canRetry: false,
      severity: 'warning',
      category: 'authentication',
      timestamp: new Date(),
    };

    this.errorStore.set(userError);
    this.addToHistory(errorDetails);
    this.updateStats();

    return userError;
  }

  // ===== UTILITY METHODS =====

  clear(): void {
    this.errorStore.set(null);
  }

  clearHistory(): void {
    this.errorHistory.set([]);
    this.updateStats();
    this.persistData();
  }

  getErrorStats(): ErrorStats {
    return get(this.errorStats);
  }

  getFilteredErrors(filter: ErrorFilter): ErrorDetails[] {
    const history = get(this.errorHistory);
    return this.applyFilter(history, filter);
  }

  setNotificationSettings(settings: Partial<ErrorNotificationSettings>): void {
    this.notificationSettings.update(current => ({ ...current, ...settings }));
    this.persistData();
  }

  exportErrorReport(filter?: ErrorFilter): string {
    const errors = filter ? this.getFilteredErrors(filter) : get(this.errorHistory);
    const stats = this.getErrorStats();

    const report = {
      generated: new Date().toISOString(),
      stats,
      errors: errors.map(error => ({
        ...error,
        timestamp: error.timestamp.toISOString()
      })),
      compliance_summary: {
        total_violations: stats.complianceViolations,
        chain_of_custody_errors: stats.chainOfCustodyErrors,
        privilege_violations: stats.privilegeViolations
      }
    };

    return JSON.stringify(report, null, 2);
  }

  // ===== PRIVATE METHODS =====

  private parseError(
    error: any,
    context?: Record<string, any>,
    legalContext?: LegalErrorContext
  ): ErrorDetails {
    let message = "An unknown error occurred";
    let details = "";
    let stack = "";
    let severity: ErrorSeverity = 'error';
    let category: ErrorCategory = 'system';

    if (error instanceof Error) {
      message = error.message;
      details = error.toString();
      stack = error.stack || "";
    } else if (typeof error === "string") {
      message = error;
      details = error;
    } else if (error && typeof error === "object") {
      message = (error as any).message || (error as any).error || "Object error";
      details = JSON.stringify(error);
    }

    // Determine category and severity from context
    if (context?.category) {
      category = context.category;
    }

    if (context?.severity) {
      severity = context.severity;
    } else {
      severity = this.determineSeverity(message, context, legalContext);
    }

    return {
      id: this.generateErrorId(),
      message,
      details,
      stack,
      timestamp: new Date(),
      context,
      severity,
      category,
      legalContext,
      chain_of_custody_error: context?.chain_of_custody_error || false,
      privileged_content_exposed: context?.privileged_content_exposed || false,
      case_id: context?.case_id,
      document_id: context?.document_id,
      evidence_id: context?.evidence_id,
      user_id: context?.user_id
    };
  }

  private createUserFriendlyError(
    errorDetails: ErrorDetails,
    retryFn?: () => Promise<void>
  ): UserFriendlyError {
    const { message, details, context, category, legalContext, compliance } = errorDetails;

    // Legal-specific error handling
    if (category === 'chain_of_custody') {
      return {
        id: errorDetails.id,
        title: "Chain of Custody Violation",
        message: "A break in the chain of custody has been detected.",
        suggestion: "Immediate action required. Contact supervising attorney.",
        canRetry: false,
        severity: 'critical',
        category,
        legalGuidance: "This error may affect evidence admissibility. Document all actions taken.",
        complianceAlert: true,
        requiresLegalReview: true,
        timestamp: errorDetails.timestamp,
        actions: [
          {
            label: "Contact Attorney",
            action: () => this.contactSupervisingAttorney(errorDetails),
            type: 'danger',
            requiresConfirmation: true
          },
          {
            label: "Document Incident",
            action: () => this.documentCustodyIncident(errorDetails),
            type: 'primary'
          }
        ]
      };
    }

    if (category === 'privilege_protection') {
      return {
        id: errorDetails.id,
        title: "Privilege Violation - CRITICAL",
        message: "Privileged content may have been exposed.",
        suggestion: "IMMEDIATE ACTION REQUIRED - Implement privilege protection protocol.",
        canRetry: false,
        severity: 'critical',
        category,
        legalGuidance: "Potential privilege waiver. Emergency protective measures activated.",
        complianceAlert: true,
        requiresLegalReview: true,
        timestamp: errorDetails.timestamp,
        actions: [
          {
            label: "Emergency Protocol",
            action: () => this.activatePrivilegeProtectionProtocol(errorDetails),
            type: 'danger',
            requiresConfirmation: true
          }
        ]
      };
    }

    // Standard error patterns with legal enhancements
    if (message.includes("fetch") || message.includes("network") || message.includes("connection")) {
      return {
        id: errorDetails.id,
        title: "Connection Problem",
        message: "Unable to connect to the server.",
        suggestion: "Please check your internet connection and try again.",
        canRetry: !!retryFn,
        severity: 'error',
        category: 'network',
        timestamp: errorDetails.timestamp
      };
    }

    // Default user-friendly error
    return {
      id: errorDetails.id,
      title: this.getCategoryTitle(category),
      message: message || "An unexpected error occurred.",
      suggestion: "Please try again. If the problem persists, contact support.",
      canRetry: !!retryFn,
      severity: errorDetails.severity,
      category,
      timestamp: errorDetails.timestamp,
      showDetails: errorDetails.severity === 'critical',
      legalGuidance: legalContext ? this.generateLegalGuidance(legalContext, compliance) : undefined,
      complianceAlert: !!compliance,
      requiresLegalReview: errorDetails.severity === 'critical' || !!compliance
    };
  }

  private addToHistory(errorDetails: ErrorDetails): void {
    this.errorHistory.update(history => [
      errorDetails,
      ...history.slice(0, 999) // Keep last 1000 errors
    ]);
  }

  private updateStats(): void {
    const history = get(this.errorHistory);
    const stats = this.calculateStats(history);
    this.errorStats.set(stats);
  }

  private calculateStats(history: ErrorDetails[]): ErrorStats {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const stats: ErrorStats = {
      total: history.length,
      byCode: {},
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byLegalContext: {},
      complianceViolations: 0,
      chainOfCustodyErrors: 0,
      privilegeViolations: 0,
      recent: history.slice(0, 10),
      last24Hours: 0,
      last7Days: 0,
      last30Days: 0,
      trends: {
        increasing: [],
        decreasing: [],
        stable: []
      }
    };

    history.forEach(error => {
      // Count by code
      if (error.code) {
        stats.byCode[error.code] = (stats.byCode[error.code] || 0) + 1;
      }

      // Count by category
      stats.byCategory[error.category] = (stats.byCategory[error.category] || 0) + 1;

      // Count by severity
      stats.bySeverity[error.severity] = (stats.bySeverity[error.severity] || 0) + 1;

      // Count by legal context
      if (error.legalContext?.case_type) {
        stats.byLegalContext[error.legalContext.case_type] =
          (stats.byLegalContext[error.legalContext.case_type] || 0) + 1;
      }

      // Special counts
      if (error.compliance) stats.complianceViolations++;
      if (error.chain_of_custody_error) stats.chainOfCustodyErrors++;
      if (error.privileged_content_exposed) stats.privilegeViolations++;

      // Time-based counts
      if (error.timestamp >= oneDayAgo) stats.last24Hours++;
      if (error.timestamp >= sevenDaysAgo) stats.last7Days++;
      if (error.timestamp >= thirtyDaysAgo) stats.last30Days++;
    });

    return stats;
  }

  private createEmptyStats(): ErrorStats {
    return {
      total: 0,
      byCode: {},
      byCategory: {} as Record<ErrorCategory, number>,
      bySeverity: {} as Record<ErrorSeverity, number>,
      byLegalContext: {},
      complianceViolations: 0,
      chainOfCustodyErrors: 0,
      privilegeViolations: 0,
      recent: [],
      last24Hours: 0,
      last7Days: 0,
      last30Days: 0,
      trends: {
        increasing: [],
        decreasing: [],
        stable: []
      }
    };
  }

  private determineSeverity(
    message: string,
    context?: Record<string, any>,
    legalContext?: LegalErrorContext
  ): ErrorSeverity {
    // Critical legal issues
    if (context?.privileged_content_exposed || context?.chain_of_custody_error) {
      return 'critical';
    }

    // Compliance violations
    if (legalContext?.compliance_requirements || context?.compliance_violation) {
      return 'compliance';
    }

    // Security issues
    if (message.includes('security') || message.includes('unauthorized') || message.includes('breach')) {
      return 'security';
    }

    // Server errors
    if (message.includes('500') || message.includes('server error')) {
      return 'error';
    }

    // Client errors
    if (message.includes('400') || message.includes('validation')) {
      return 'warning';
    }

    return 'error';
  }

  private getCategoryTitle(category: ErrorCategory): string {
    const titles: Record<ErrorCategory, string> = {
      network: 'Connection Problem',
      authentication: 'Authentication Required',
      authorization: 'Permission Denied',
      validation: 'Validation Error',
      file_upload: 'Upload Failed',
      legal_document: 'Document Error',
      evidence_handling: 'Evidence Error',
      case_management: 'Case Management Error',
      compliance: 'Compliance Violation',
      security: 'Security Alert',
      chain_of_custody: 'Chain of Custody Violation',
      privilege_protection: 'Privilege Violation',
      court_filing: 'Court Filing Error',
      client_communication: 'Client Communication Error',
      database: 'Database Error',
      ai_processing: 'AI Processing Error',
      system: 'System Error'
    };

    return titles[category] || 'Error';
  }

  private generateLegalGuidance(legalContext: LegalErrorContext, compliance?: ComplianceViolation): string {
    let guidance = '';

    if (compliance) {
      guidance += `Compliance Violation: ${compliance.regulation}. `;
      guidance += `Required actions: ${compliance.required_actions.join(', ')}. `;

      if (compliance.notification_required) {
        guidance += `Notification required within ${compliance.notification_timeline}. `;
      }
    }

    if (legalContext.reporting_required) {
      guidance += 'This incident requires legal reporting. ';
    }

    if (legalContext.potential_sanctions?.length) {
      guidance += `Potential sanctions: ${legalContext.potential_sanctions.join(', ')}. `;
    }

    return guidance.trim() || 'Consult supervising attorney for guidance.';
  }

  private mapHttpStatusToSeverity(status: number): ErrorSeverity {
    if (status >= 500) return 'error';
    if (status === 403 || status === 401) return 'security';
    if (status >= 400) return 'warning';
    return 'info';
  }

  private generateErrorId(): string {
    return `err_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private logError(errorDetails: ErrorDetails): void {
    if (!browser) return;

    const logLevel = this.getLogLevel(errorDetails.severity);
    const logMethod = console[logLevel] || console.error;

    console.group(`🚨 Error Handler - ${errorDetails.severity.toUpperCase()}`);
    logMethod("ID:", errorDetails.id);
    logMethod("Message:", errorDetails.message);
    if (errorDetails.code) logMethod("Code:", errorDetails.code);
    if (errorDetails.details) logMethod("Details:", errorDetails.details);
    if (errorDetails.context) logMethod("Context:", errorDetails.context);
    if (errorDetails.legalContext) logMethod("Legal Context:", errorDetails.legalContext);
    if (errorDetails.compliance) logMethod("Compliance:", errorDetails.compliance);
    if (errorDetails.stack) logMethod("Stack:", errorDetails.stack);
    console.groupEnd();
  }

  private getLogLevel(severity: ErrorSeverity): 'error' | 'warn' | 'info' {
    switch (severity) {
      case 'critical':
      case 'security':
      case 'error':
        return 'error';
      case 'warning':
      case 'compliance':
        return 'warn';
      default:
        return 'info';
    }
  }

  private checkComplianceViolations(errorDetails: ErrorDetails): void {
    const settings = get(this.notificationSettings);
    const isMonitoring = get(this.complianceMonitoring);

    if (!isMonitoring || !settings.complianceAlerts) return;

    if (errorDetails.compliance || errorDetails.chain_of_custody_error || errorDetails.privileged_content_exposed) {
      this.triggerComplianceAlert(errorDetails);
    }
  }

  private triggerNotifications(userError: UserFriendlyError, errorDetails: ErrorDetails): void {
    const settings = get(this.notificationSettings);

    if (!settings.enableNotifications) return;

    // Check severity threshold
    const severityLevels = ['info', 'warning', 'error', 'critical', 'security', 'compliance'];
    const errorSeverityIndex = severityLevels.indexOf(errorDetails.severity);
    const thresholdIndex = severityLevels.indexOf(settings.severityThreshold);

    if (errorSeverityIndex < thresholdIndex) return;

    // Trigger appropriate notifications
    if (browser && 'Notification' in window && Notification.permission === 'granted') {
      new Notification(userError.title, {
        body: userError.message,
        icon: this.getNotificationIcon(errorDetails.severity)
      });
    }
  }

  private triggerComplianceAlert(errorDetails: ErrorDetails): void {
    console.error('🚨 COMPLIANCE ALERT 🚨', {
      id: errorDetails.id,
      violation: errorDetails.compliance,
      timestamp: errorDetails.timestamp,
      context: errorDetails.context
    });

    // In production, this would trigger:
    // - Email notifications to legal team
    // - Slack alerts
    // - Compliance dashboard updates
    // - Audit log entries
  }

  private triggerPrivilegeViolationProtocol(errorDetails: ErrorDetails): void {
    console.error('🚨 PRIVILEGE VIOLATION - EMERGENCY PROTOCOL ACTIVATED 🚨', {
      id: errorDetails.id,
      timestamp: errorDetails.timestamp,
      context: errorDetails.context
    });

    // Emergency protocol would include:
    // - Immediate content quarantine
    // - Attorney notification
    // - Privilege log documentation
    // - Protective order preparation
  }

  private async contactSupervisingAttorney(errorDetails: ErrorDetails): Promise<void> {
    // Implementation would integrate with firm's communication system
    console.log('Contacting supervising attorney for error:', errorDetails.id);
  }

  private async documentCustodyIncident(errorDetails: ErrorDetails): Promise<void> {
    // Implementation would create incident report
    console.log('Documenting custody incident for error:', errorDetails.id);
  }

  private async activatePrivilegeProtectionProtocol(errorDetails: ErrorDetails): Promise<void> {
    // Implementation would activate emergency privilege protection
    console.log('Activating privilege protection protocol for error:', errorDetails.id);
  }

  private getNotificationIcon(severity: ErrorSeverity): string {
    const icons: Record<ErrorSeverity, string> = {
      info: '/icons/info.png',
      warning: '/icons/warning.png',
      error: '/icons/error.png',
      critical: '/icons/critical.png',
      security: '/icons/security.png',
      compliance: '/icons/compliance.png'
    };
    return icons[severity] || '/icons/error.png';
  }

  private applyFilter(errors: ErrorDetails[], filter: ErrorFilter): ErrorDetails[] {
    return errors.filter(error => {
      // Severity filter
      if (filter.severity && !filter.severity.includes(error.severity)) {
        return false;
      }

      // Category filter
      if (filter.category && !filter.category.includes(error.category)) {
        return false;
      }

      // Time range filter
      if (filter.timeRange) {
        if (error.timestamp < filter.timeRange.start || error.timestamp > filter.timeRange.end) {
          return false;
        }
      }

      // Legal context filters
      if (filter.legalContext) {
        if (filter.legalContext.case_type &&
            !filter.legalContext.case_type.includes(error.legalContext?.case_type || '')) {
          return false;
        }
        if (filter.legalContext.confidentiality_level &&
            !filter.legalContext.confidentiality_level.includes(error.legalContext?.confidentiality_level || '')) {
          return false;
        }
        if (filter.legalContext.jurisdiction &&
            !filter.legalContext.jurisdiction.includes(error.legalContext?.jurisdiction || '')) {
          return false;
        }
      }

      // Special filters
      if (filter.complianceOnly && !error.compliance) {
        return false;
      }

      if (filter.chainOfCustodyOnly && !error.chain_of_custody_error) {
        return false;
      }

      if (filter.privilegeViolationsOnly && !error.privileged_content_exposed) {
        return false;
      }

      return true;
    });
  }

  private loadPersistedData(): void {
    try {
      const settings = localStorage.getItem('legal-ai-error-settings');
      if (settings) {
        this.notificationSettings.set(JSON.parse(settings));
      }

      const history = localStorage.getItem('legal-ai-error-history');
      if (history) {
        const parsedHistory = JSON.parse(history).map((error: any) => ({
          ...error,
          timestamp: new Date(error.timestamp)
        }));
        this.errorHistory.set(parsedHistory);
        this.updateStats();
      }
    } catch (e: any) {
      console.warn('Failed to load persisted error data:', e);
    }
  }

  private persistData(): void {
    try {
      const settings = get(this.notificationSettings);
      localStorage.setItem('legal-ai-error-settings', JSON.stringify(settings));

      const history = get(this.errorHistory);
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - settings.retentionDays);

      const filteredHistory = history.filter(error => error.timestamp >= retentionDate);
      localStorage.setItem('legal-ai-error-history', JSON.stringify(filteredHistory));
    } catch (e: any) {
      console.warn('Failed to persist error data:', e);
    }
  }

  private setupAutoSave(): void {
    // Auto-save every 5 minutes
    setInterval(() => {
      this.persistData();
    }, 5 * 60 * 1000);
  }

  private setupCleanupJob(): void {
    // Clean up old errors daily
    setInterval(() => {
      const settings = get(this.notificationSettings);
      const retentionDate = new Date();
      retentionDate.setDate(retentionDate.getDate() - settings.retentionDays);

      this.errorHistory.update(history =>
        history.filter(error => error.timestamp >= retentionDate)
      );
      this.updateStats();
      this.persistData();
    }, 24 * 60 * 60 * 1000); // Daily
  }

  // ===== STORE SUBSCRIPTIONS =====

  get subscribe() {
    return this.errorStore.subscribe;
  }

  get subscribeHistory() {
    return this.errorHistory.subscribe;
  }

  get subscribeStats() {
    return this.errorStats.subscribe;
  }

  get subscribeSettings() {
    return this.notificationSettings.subscribe;
  }
}

// ===== SINGLETON INSTANCE =====

export const enhancedErrorHandler = new EnhancedErrorHandler();
// ===== CONVENIENCE FUNCTIONS =====

export function handleError(
  error: any,
  context?: Record<string, any>,
  retryFn?: () => Promise<void>,
  legalContext?: LegalErrorContext
): UserFriendlyError {
  return enhancedErrorHandler.handle(error, context, retryFn, legalContext);
}

export function handleApiError(
  response: Response,
  context?: Record<string, any>,
  retryFn?: () => Promise<void>
): UserFriendlyError {
  return enhancedErrorHandler.handleApiError(response, context, retryFn);
}

export function handleNetworkError(
  error: any,
  context?: Record<string, any>,
  retryFn?: () => Promise<void>
): UserFriendlyError {
  return enhancedErrorHandler.handleNetworkError(error, context, retryFn);
}

export function handleValidationError(
  errors: Record<string, string[]> | string[],
  context?: Record<string, any>
): UserFriendlyError {
  return enhancedErrorHandler.handleValidationError(errors, context);
}

export function handleAuthError(context?: Record<string, any>): UserFriendlyError {
  return enhancedErrorHandler.handleAuthError(context);
}

export function handleLegalDocumentError(
  error: any,
  documentId: string,
  documentType: string,
  confidentialityLevel: string,
  context?: Record<string, any>,
  retryFn?: () => Promise<void>
): UserFriendlyError {
  return enhancedErrorHandler.handleLegalDocumentError(
    error, documentId, documentType, confidentialityLevel, context, retryFn
  );
}

export function handleChainOfCustodyError(
  error: any,
  evidenceId: string,
  caseId: string,
  custodyAction: string,
  context?: Record<string, any>
): UserFriendlyError {
  return enhancedErrorHandler.handleChainOfCustodyError(error, evidenceId, caseId, custodyAction, context);
}

export function handlePrivilegeViolation(
  error: any,
  documentId: string,
  caseId: string,
  exposedContent: string,
  context?: Record<string, any>
): UserFriendlyError {
  return enhancedErrorHandler.handlePrivilegeViolation(error, documentId, caseId, exposedContent, context);
}

export function handleCourtFilingError(
  error: any,
  filingType: string,
  docketNumber: string,
  deadline: Date,
  context?: Record<string, any>,
  retryFn?: () => Promise<void>
): UserFriendlyError {
  return enhancedErrorHandler.handleCourtFilingError(error, filingType, docketNumber, deadline, context, retryFn);
}

export function clearError(): void {
  enhancedErrorHandler.clear();
}

export function clearErrorHistory(): void {
  enhancedErrorHandler.clearHistory();
}

export function getErrorStats(): ErrorStats {
  return enhancedErrorHandler.getErrorStats();
}

export function getFilteredErrors(filter: ErrorFilter): ErrorDetails[] {
  return enhancedErrorHandler.getFilteredErrors(filter);
}

export function exportErrorReport(filter?: ErrorFilter): string {
  return enhancedErrorHandler.exportErrorReport(filter);
}

export function setErrorNotificationSettings(settings: Partial<ErrorNotificationSettings>): void {
  enhancedErrorHandler.setNotificationSettings(settings);
}

// ===== STORE EXPORTS =====

export const currentError = enhancedErrorHandler;
export const errorHistory = enhancedErrorHandler;
export const errorStats = enhancedErrorHandler;
// ===== DERIVED STORES =====

// Use underlying readable stores instead of subscribe methods
const _historyStore = (enhancedErrorHandler as any).errorHistory as import('svelte/store').Readable<ErrorDetails[]>;
const _statsStore = (enhancedErrorHandler as any).errorStats as import('svelte/store').Readable<ErrorStats>;

export const criticalErrors = derived(_historyStore, (history) =>
  history.filter(error =>
    error.severity === 'critical' ||
    error.compliance ||
    error.chain_of_custody_error ||
    error.privileged_content_exposed
  )
);

export const complianceViolations = derived(_historyStore, (history) => history.filter(error => !!error.compliance));

export const chainOfCustodyErrors = derived(_historyStore, (history) => history.filter(error => error.chain_of_custody_error));

export const privilegeViolations = derived(_historyStore, (history) => history.filter(error => error.privileged_content_exposed));

export const recentErrors = derived(_historyStore, (history) => {
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  return history.filter(error => error.timestamp >= oneDayAgo);
});

export const errorTrends = derived(_statsStore, (stats) => stats.trends);
