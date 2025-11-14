import { json } from "@sveltejs/kit";
import { getOllamaEndpoint } from "$utils/ollama";

export async function POST({ request }) {
  try {
    const { narrative, evidence, caseId } = await request.json();

    if (!narrative && !evidence) {
      return json({ error: 'Either narrative or evidence must be provided' }, { status: 400 });
    }

    const base = await getOllamaEndpoint();

    const evidenceText = evidence ? evidence.map((e: any) =>
      `${e.title}: ${e.description || e.content || 'No description available'}`
    ).join('\n\n') : '';

    const fullContext = narrative ?
      `${narrative}\n\nEvidence:\n${evidenceText}` :
      evidenceText;

    const res = await fetch(`${base}/api/chat`, {
      method: "POST",
      body: JSON.stringify({
        model: "gemma3-legal:latest",
        messages: [
          {
            role: "system",
            content: `You are a professional police report writer. Generate a comprehensive, formal police report following standard law enforcement format.

Include the following sections:
1. INCIDENT SUMMARY - Brief overview of what occurred
2. REPORTING PARTY - Who reported the incident and their contact info
3. PARTIES INVOLVED - All individuals mentioned with roles and descriptions
4. EVENT TIMELINE - Chronological sequence of events
5. LOCATION DETAILS - Where the incident occurred
6. EVIDENCE COLLECTED - List of all evidence with descriptions
7. WITNESS STATEMENTS - Any witness information available
8. OFFICER OBSERVATIONS - Additional context and observations
9. KNOWN RISKS - Any safety concerns or ongoing threats
10. ALLEGED CRIMES - Specific criminal charges being considered
11. NEXT STEPS - Recommended investigative actions

Use formal, objective language. Be thorough but concise. Format with clear section headers.`
          },
          {
            role: "user",
            content: `Generate a police report based on this information:\n\n${fullContext}`
          }
        ],
        stream: false
      }),
      headers: { "Content-Type": "application/json" }
    });

    if (!res.ok) {
      throw new Error(`Ollama API error: ${res.status}`);
    }

    const result = await res.json();

    // Extract the report content
    const reportContent = result.message?.content || result.content || '';

    // Structure the response
    const structuredReport = {
      id: `report_${Date.now()}`,
      caseId: caseId || null,
      generatedAt: new Date().toISOString(),
      type: 'police_report',
      content: reportContent,
      sections: parseReportSections(reportContent),
      metadata: {
        narrativeProvided: !!narrative,
        evidenceCount: evidence?.length || 0,
        model: 'gemma3-legal:latest'
      }
    };

    return json(structuredReport);
  } catch (error) {
    console.error('Error generating police report:', error);
    return json({ error: 'Failed to generate police report' }, { status: 500 });
  }
}

function parseReportSections(content: string) {
  const sections = [];
  const lines = content.split('\n');

  let currentSection = null;
  let currentContent = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Check if this is a section header (all caps, ends with colon, etc.)
    if (trimmed.match(/^[A-Z\s]+:?\s*$/) && trimmed.length > 3) {
      // Save previous section
      if (currentSection) {
        sections.push({
          title: currentSection,
          content: currentContent.join('\n').trim()
        });
      }

      // Start new section
      currentSection = trimmed.replace(/:$/, '');
      currentContent = [];
    } else if (currentSection) {
      currentContent.push(line);
    }
  }

  // Add final section
  if (currentSection) {
    sections.push({
      title: currentSection,
      content: currentContent.join('\n').trim()
    });
  }

  return sections;
}