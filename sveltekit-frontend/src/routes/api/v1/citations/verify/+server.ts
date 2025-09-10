/*
 * Citation Verification API Route
 * POST /api/v1/citations/verify - Verify citation validity and accuracy
 */

import { json, error, type RequestHandler } from '@sveltejs/kit';
import makeHttpErrorPayload from '$lib/server/api/makeHttpError';
import { db } from '$lib/server/db/connection';
import { citations } from '$lib/server/db/schemas/cases-schema';
import { eq } from 'drizzle-orm';
import { z } from 'zod';

// Verification request schema
const VerificationRequestSchema = z.object({
  citationId: z.string().uuid().optional(),
  citationText: z.string().optional(),
  verificationLevel: z.enum(['basic', 'comprehensive', 'deep']).default('basic'),
  autoUpdate: z.boolean().default(false),
}).refine(data => data.citationId || data.citationText, {
  message: "Either citationId or citationText must be provided"
});

// External API configurations (mock endpoints for demonstration)
const LEGAL_DATABASES = {
  westlaw: 'https://api.westlaw.com/verify',
  lexis: 'https://api.lexisnexis.com/verify',
  justia: 'https://api.justia.com/verify',
  courtlistener: 'https://api.courtlistener.com/verify',
};

/*
 * POST /api/v1/citations/verify
 * Verify citation validity using multiple legal databases
 */
export const POST: RequestHandler = async ({ request, locals }) => {
  try {
    // Check authentication
    if (!locals.session || !locals.user) {
      return error(
        401,
        makeHttpErrorPayload({ message: 'Authentication required', code: 'AUTH_REQUIRED' })
      );
    }

    // Parse request body
    const body = await request.json();
    const { citationId, citationText, verificationLevel, autoUpdate } = VerificationRequestSchema.parse(body);

    let citation = null;
    let citationToVerify = citationText;

    // If citationId provided, get citation from database
    if (citationId) {
      const [dbCitation] = await db.select()
        .from(citations)
        .where(eq(citations.id, citationId))
        .limit(1);

      if (!dbCitation) {
        return error(
          404,
          makeHttpErrorPayload({ message: 'Citation not found', code: 'CITATION_NOT_FOUND' })
        );
      }

      citation = dbCitation;
      citationToVerify = dbCitation.citation;
    }

    if (!citationToVerify) {
      return error(
        400,
        makeHttpErrorPayload({ message: 'No citation text to verify', code: 'MISSING_CITATION_TEXT' })
      );
    }

    console.log(`Verifying citation: ${citationToVerify.substring(0, 100)}...`);

    // Perform verification based on level
    const verificationResult = await performCitationVerification(
      citationToVerify,
      verificationLevel,
      citation
    );

    // Update citation in database if requested and citationId provided
    if (autoUpdate && citationId && citation) {
      await db.update(citations)
        .set({
          verified: verificationResult.isValid,
          metadata: {
            ...citation.metadata,
            verification: {
              ...verificationResult,
              verifiedAt: new Date().toISOString(),
              verifiedBy: locals.user.id,
            },
          },
          updatedAt: new Date(),
        })
        .where(eq(citations.id, citationId));
    }

    return json({
      success: true,
      data: {
        verification: verificationResult,
        citation: citation ? {
          id: citation.id,
          title: citation.title,
          citation: citation.citation,
        } : null,
        updated: autoUpdate && citationId ? true : false,
      },
      meta: {
        userId: locals.user.id,
        citationId: citationId || null,
        verificationLevel,
        timestamp: new Date().toISOString(),
        action: 'citation_verified',
      },
    });

  } catch (err: any) {
    console.error('Citation verification error:', err);

    if (err instanceof z.ZodError) {
      return error(
        400,
        makeHttpErrorPayload({
          message: 'Invalid verification request',
          code: 'INVALID_DATA',
          details: err.errors,
        })
      );
    }

    return error(
      500,
      makeHttpErrorPayload({
        message: 'Failed to verify citation',
        code: 'VERIFICATION_FAILED',
        details: err.message,
      })
    );
  }
};

/*
 * Perform citation verification using multiple methods
 */
async function performCitationVerification(
  citationText: string,
  level: string,
  existingCitation?: any
): Promise<any> {
  const verification = {
    isValid: false,
    confidence: 0,
    sources: [],
    details: {
      format: null,
      accessibility: null,
      accuracy: null,
      completeness: null,
    },
    suggestions: [],
    warnings: [],
    metadata: {
      verificationLevel: level,
      timestamp: new Date().toISOString(),
    },
  };

  try {
    // Basic format validation
    const formatValidation = await validateCitationFormat(citationText);
    verification.details.format = formatValidation;
    verification.confidence += formatValidation.score * 0.3;

    // Database verification (mock implementation)
    if (level === 'comprehensive' || level === 'deep') {
      const databaseVerification = await verifyWithLegalDatabases(citationText);
      verification.sources = databaseVerification.sources;
      verification.details.accessibility = databaseVerification.accessibility;
      verification.confidence += databaseVerification.confidence * 0.4;
    }

    // Content accuracy verification
    if (level === 'deep') {
      const accuracyVerification = await verifyContentAccuracy(citationText, existingCitation);
      verification.details.accuracy = accuracyVerification;
      verification.confidence += accuracyVerification.score * 0.3;
    }

    // Determine overall validity
    verification.isValid = verification.confidence >= 0.7;

    // Generate suggestions and warnings
    verification.suggestions = generateVerificationSuggestions(verification);
    verification.warnings = generateVerificationWarnings(verification);

    return verification;

  } catch (error) {
    console.error('Verification process error:', error);
    return {
      ...verification,
      error: 'Verification process failed',
      details: {
        ...verification.details,
        error: error instanceof Error ? error.message : 'Unknown error',
      },
    };
  }
}

/*
 * Validate citation format
 */
async function validateCitationFormat(citationText: string): Promise<any> {
  const formatChecks = {
    hasCourtName: /v\.|vs\.|versus/i.test(citationText),
    hasYear: /\b(19|20)\d{2}\b/.test(citationText),
    hasVolume: /\b\d+\b/.test(citationText),
    hasReporter: /\b[A-Z]+\.?\s*\d*d?\b/.test(citationText),
    hasPage: /\d+/.test(citationText),
    properCapitalization: /^[A-Z]/.test(citationText.trim()),
  };

  const passedChecks = Object.values(formatChecks).filter(Boolean).length;
  const totalChecks = Object.keys(formatChecks).length;
  const score = passedChecks / totalChecks;

  return {
    score,
    passedChecks,
    totalChecks,
    details: formatChecks,
    isValidFormat: score >= 0.6,
    commonFormat: detectCitationFormat(citationText),
  };
}

/*
 * Verify with legal databases (mock implementation)
 */
async function verifyWithLegalDatabases(citationText: string): Promise<any> {
  // Mock verification results - in production, would call actual legal APIs
  const mockResults = {
    westlaw: { found: true, confidence: 0.92, url: 'https://westlaw.com/result/...' },
    lexis: { found: true, confidence: 0.89, url: 'https://lexisnexis.com/result/...' },
    justia: { found: true, confidence: 0.85, url: 'https://justia.com/result/...' },
    courtlistener: { found: false, confidence: 0, url: null },
  };

  const sources = Object.entries(mockResults)
    .filter(([_, result]) => result.found)
    .map(([source, result]) => ({
      database: source,
      confidence: result.confidence,
      url: result.url,
      verified: true,
    }));

  const averageConfidence = sources.length > 0
    ? sources.reduce((sum, source) => sum + source.confidence, 0) / sources.length
    : 0;

  return {
    sources,
    confidence: averageConfidence,
    accessibility: {
      isAccessible: sources.length > 0,
      availableDatabases: sources.length,
      totalChecked: Object.keys(mockResults).length,
    },
  };
}

/*
 * Verify content accuracy (mock implementation)
 */
async function verifyContentAccuracy(citationText: string, existingCitation?: any): Promise<any> {
  // Mock accuracy verification - would compare with actual case content
  return {
    score: 0.88,
    contentMatch: true,
    quotesVerified: true,
    contextAccurate: true,
    dateConsistent: true,
    jurisdictionMatch: true,
    details: {
      caseTitle: 'verified',
      court: 'verified',
      date: 'verified',
      jurisdiction: 'verified',
      holding: 'verified',
    },
  };
}

/*
 * Detect citation format type
 */
function detectCitationFormat(citationText: string): string {
  if (/\d+\s+U\.S\./.test(citationText)) return 'US Supreme Court';
  if (/\d+\s+F\.\d*d?\s+\d+/.test(citationText)) return 'Federal Reporter';
  if (/\d+\s+F\.\s*Supp/.test(citationText)) return 'Federal Supplement';
  if (/\d+\s+[A-Z]+\.?\s*\d*d?\s+\d+/.test(citationText)) return 'State Reporter';
  if (/\d+\s+U\.S\.C\./.test(citationText)) return 'US Code';
  if (/\d+\s+C\.F\.R\./.test(citationText)) return 'Code of Federal Regulations';
  return 'Unknown/Custom Format';
}

/*
 * Generate verification suggestions
 */
function generateVerificationSuggestions(verification: any): string[] {
  const suggestions = [];

  if (!verification.isValid) {
    suggestions.push('Consider reviewing the citation format for accuracy');
  }

  if (verification.details.format?.score < 0.8) {
    suggestions.push('Citation format may not follow standard conventions');
  }

  if (verification.sources.length === 0) {
    suggestions.push('Citation not found in major legal databases - verify manually');
  }

  if (verification.confidence < 0.8) {
    suggestions.push('Low confidence verification - recommend manual review');
  }

  if (verification.details.accessibility?.availableDatabases < 2) {
    suggestions.push('Limited database coverage - check additional sources');
  }

  return suggestions;
}

/*
 * Generate verification warnings
 */
function generateVerificationWarnings(verification: any): string[] {
  const warnings = [];

  if (verification.confidence < 0.5) {
    warnings.push('WARNING: Very low verification confidence');
  }

  if (verification.sources.length === 0) {
    warnings.push('WARNING: Citation not found in any legal database');
  }

  if (verification.details.format?.score < 0.5) {
    warnings.push('WARNING: Citation format appears to be incorrect');
  }

  if (verification.details.accuracy?.score < 0.7) {
    warnings.push('WARNING: Content accuracy concerns detected');
  }

  return warnings;
}
