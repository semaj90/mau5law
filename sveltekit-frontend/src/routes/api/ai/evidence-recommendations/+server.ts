import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';

/**
 * Smart Evidence Recommendations API
 * Uses gemma3-legal model to analyze evidence and provide AI-powered recommendations
 */
export const POST: RequestHandler = async ({ request, locals }) => {
	try {
		const { evidenceId, caseId, context } = await request.json();

		if (!evidenceId) {
			throw error(400, 'Evidence ID is required');
		}

		// Get evidence data from database
		const evidenceData = await getEvidenceData(evidenceId, locals.user?.id);
		if (!evidenceData) {
			throw error(404, 'Evidence not found');
		}

		// Get related case context
		const caseContext = caseId ? await getCaseContext(caseId, locals.user?.id) : null;

		// Generate AI recommendations using gemma3-legal
		const recommendations = await generateEvidenceRecommendations(evidenceData, caseContext, context);

		return json({
			success: true,
			data: {
				evidenceId,
				recommendations,
				generatedAt: new Date().toISOString(),
				model: 'gemma3-legal:latest'
			}
		});

	} catch (err) {
		console.error('Smart evidence recommendations error:', err);
		throw error(500, err instanceof Error ? err.message : 'Failed to generate recommendations');
	}
};

/**
 * Get evidence data from database
 */
async function getEvidenceData(evidenceId: string, userId?: string) {
	// This would query the evidence table
	// For now, return mock data
	return {
		id: evidenceId,
		title: 'Sample Evidence Document',
		description: 'A legal document containing contract terms',
		evidenceType: 'document',
		tags: ['contract', 'liability', 'terms'],
		aiSummary: 'This document outlines contractual obligations and liability clauses.',
		content: 'Sample content for analysis...'
	};
}

/**
 * Get case context for better recommendations
 */
async function getCaseContext(caseId: string, userId?: string) {
	// This would query the cases table and related evidence
	return {
		id: caseId,
		title: 'Contract Dispute Case',
		caseType: 'civil',
		description: 'Dispute over contract terms and breach of agreement'
	};
}

/**
 * Generate AI-powered evidence recommendations using gemma3-legal
 */
async function generateEvidenceRecommendations(evidenceData: any, caseContext: any, additionalContext?: string) {
	const prompt = buildRecommendationPrompt(evidenceData, caseContext, additionalContext);

	try {
		// Call Ollama API with gemma3-legal model
		const response = await fetch('http://localhost:11434/api/generate', {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json'
			},
			body: JSON.stringify({
				model: 'gemma3-legal:latest',
				prompt: prompt,
				stream: false,
				options: {
					temperature: 0.3,
					num_predict: 500
				}
			})
		});

		if (!response.ok) {
			throw new Error(`Ollama API error: ${response.status}`);
		}

		const result = await response.json();
		const aiResponse = result.response;

		// Parse AI response into structured recommendations
		return parseRecommendations(aiResponse);

	} catch (err) {
		console.error('AI recommendation generation failed:', err);
		// Fallback to basic recommendations
		return generateFallbackRecommendations(evidenceData);
	}
}

/**
 * Build the AI prompt for evidence recommendations
 */
function buildRecommendationPrompt(evidenceData: any, caseContext: any, additionalContext?: string): string {
	return `You are an expert legal AI assistant analyzing evidence for a case. Provide smart recommendations for the following evidence:

EVIDENCE DETAILS:
- Title: ${evidenceData.title}
- Type: ${evidenceData.evidenceType}
- Description: ${evidenceData.description}
- Tags: ${evidenceData.tags?.join(', ') || 'None'}
- AI Summary: ${evidenceData.aiSummary || 'Not available'}

${caseContext ? `CASE CONTEXT:
- Case Title: ${caseContext.title}
- Case Type: ${caseContext.caseType}
- Case Description: ${caseContext.description}
` : ''}

${additionalContext ? `ADDITIONAL CONTEXT: ${additionalContext}` : ''}

Based on your legal expertise, provide 3-5 specific, actionable recommendations for how this evidence should be used in the case. Consider:

1. Legal strategy implications
2. Evidence admissibility concerns
3. Potential counter-arguments
4. Related legal precedents or statutes
5. Discovery or deposition opportunities

Format your response as a JSON array of recommendation objects with the following structure:
[
  {
    "type": "strategy|admissibility|discovery|precedent",
    "priority": "high|medium|low",
    "title": "Brief title",
    "description": "Detailed explanation",
    "actionItems": ["Specific action 1", "Specific action 2"]
  }
]

Ensure recommendations are practical and legally sound.`;
}

/**
 * Parse AI response into structured recommendations
 */
function parseRecommendations(aiResponse: string) {
	try {
		// Try to extract JSON from the response
		const jsonMatch = aiResponse.match(/\[[\s\S]*\]/);
		if (jsonMatch) {
			const recommendations = JSON.parse(jsonMatch[0]);
			return recommendations.map((rec: any, index: number) => ({
				id: `rec_${index + 1}`,
				...rec,
				confidence: 0.85, // AI confidence score
				generatedAt: new Date().toISOString()
			}));
		}
	} catch (err) {
		console.error('Failed to parse AI recommendations:', err);
	}

	// Fallback: parse as text recommendations
	return parseTextRecommendations(aiResponse);
}

/**
 * Parse text-based recommendations if JSON parsing fails
 */
function parseTextRecommendations(text: string) {
	const lines = text.split('\n').filter(line => line.trim().length > 0);
	const recommendations = [];

	for (let i = 0; i < Math.min(lines.length, 5); i++) {
		const line = lines[i].trim();
		if (line.length > 10) {
			recommendations.push({
				id: `rec_${i + 1}`,
				type: 'strategy',
				priority: 'medium',
				title: `Recommendation ${i + 1}`,
				description: line,
				actionItems: ['Review with legal team', 'Document in case notes'],
				confidence: 0.7,
				generatedAt: new Date().toISOString()
			});
		}
	}

	return recommendations;
}

/**
 * Generate fallback recommendations if AI fails
 */
function generateFallbackRecommendations(evidenceData: any) {
	return [
		{
			id: 'rec_fallback_1',
			type: 'strategy',
			priority: 'medium',
			title: 'Document Review Required',
			description: `Review ${evidenceData.title} for relevance to case strategy and potential legal arguments.`,
			actionItems: [
				'Schedule document review meeting',
				'Flag key sections for attorney review',
				'Cross-reference with case timeline'
			],
			confidence: 0.6,
			generatedAt: new Date().toISOString()
		},
		{
			id: 'rec_fallback_2',
			type: 'admissibility',
			priority: 'high',
			title: 'Verify Admissibility',
			description: 'Ensure this evidence meets all legal standards for admissibility in court proceedings.',
			actionItems: [
				'Check chain of custody',
				'Verify authentication requirements',
				'Prepare foundation testimony if needed'
			],
			confidence: 0.6,
			generatedAt: new Date().toISOString()
		}
	];
}</content>
<parameter name="filePath">c:\Users\james\Videos\deeds-web-app\sveltekit-frontend\src\routes\api\ai\evidence-recommendations\+server.ts