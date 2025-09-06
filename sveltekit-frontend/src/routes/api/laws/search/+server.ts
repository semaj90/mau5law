import { URL } from "url";
import type { RequestHandler } from './$types';


// Mock legal database - in production this would connect to a real legal database
const mockLegalDatabase = [
  {
    id: 'ca-pen-187',
    title: 'California Penal Code Section 187 - Murder',
    description: 'Defines murder as the unlawful killing of a human being, or a fetus, with malice aforethought.',
    jurisdiction: 'california',
    category: 'criminal',
    code: 'PEN § 187',
    lastUpdated: '2023-01-01',
    fullText: 'Murder is the unlawful killing of a human being, or a fetus, with malice aforethought...',
    fullTextUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=187&lawCode=PEN',
    keywords: ['murder', 'homicide', 'killing', 'malice', 'unlawful', 'criminal'],
    relatedSections: ['PEN § 188', 'PEN § 189', 'PEN § 190']
  },
  {
    id: 'ca-pen-211',
    title: 'California Penal Code Section 211 - Robbery',
    description: 'Defines robbery as the felonious taking of personal property in the possession of another, from his person or immediate presence.',
    jurisdiction: 'california',
    category: 'criminal',
    code: 'PEN § 211',
    lastUpdated: '2023-01-01',
    fullText: 'Robbery is the felonious taking of personal property in the possession of another...',
    fullTextUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=211&lawCode=PEN',
    keywords: ['robbery', 'theft', 'felonious', 'taking', 'personal property', 'force', 'fear'],
    relatedSections: ['PEN § 212', 'PEN § 213']
  },
  {
    id: 'ca-civ-1550',
    title: 'California Civil Code Section 1550 - Contract Essentials',
    description: 'Lists the essential elements required for a valid contract under California law.',
    jurisdiction: 'california',
    category: 'civil',
    code: 'CIV § 1550',
    lastUpdated: '2023-01-01',
    fullText: 'It is essential to the existence of a contract that there should be: 1. Parties capable of contracting...',
    fullTextUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=1550&lawCode=CIV',
    keywords: ['contract', 'agreement', 'parties', 'consideration', 'lawful', 'consent'],
    relatedSections: ['CIV § 1551', 'CIV § 1552', 'CIV § 1565']
  },
  {
    id: 'ca-evid-352',
    title: 'California Evidence Code Section 352 - Discretion to Exclude Evidence',
    description: 'Grants courts discretion to exclude evidence if its probative value is substantially outweighed by prejudicial effect.',
    jurisdiction: 'california',
    category: 'procedural',
    code: 'EVID § 352',
    lastUpdated: '2023-01-01',
    fullText: 'The court in its discretion may exclude evidence if its probative value is substantially outweighed...',
    fullTextUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=352&lawCode=EVID',
    keywords: ['evidence', 'probative', 'prejudicial', 'discretion', 'exclude', 'court'],
    relatedSections: ['EVID § 351', 'EVID § 353', 'EVID § 354']
  },
  {
    id: 'federal-const-4th',
    title: 'Fourth Amendment to the U.S. Constitution',
    description: 'Protects against unreasonable searches and seizures by government authorities.',
    jurisdiction: 'federal',
    category: 'constitutional',
    code: 'U.S. Const. Amend. IV',
    lastUpdated: '1791-12-15',
    fullText: 'The right of the people to be secure in their persons, houses, papers, and effects...',
    fullTextUrl: 'https://constitution.congress.gov/constitution/amendment-4/',
    keywords: ['search', 'seizure', 'warrant', 'probable cause', 'unreasonable', 'privacy'],
    relatedSections: ['U.S. Const. Amend. V', 'U.S. Const. Amend. VI']
  },
  {
    id: 'ca-corp-204',
    title: 'California Corporations Code Section 204 - Articles of Incorporation',
    description: 'Specifies the required contents of articles of incorporation for California corporations.',
    jurisdiction: 'california',
    category: 'corporate',
    code: 'CORP § 204',
    lastUpdated: '2023-01-01',
    fullText: 'The articles of incorporation shall set forth: (a) The name of the corporation...',
    fullTextUrl: 'https://leginfo.legislature.ca.gov/faces/codes_displaySection.xhtml?sectionNum=204&lawCode=CORP',
    keywords: ['corporation', 'articles', 'incorporation', 'business', 'entity', 'filing'],
    relatedSections: ['CORP § 200', 'CORP § 201', 'CORP § 202']
  }
];

export const GET: RequestHandler = async ({ url }) => {
  try {
    const query = url.searchParams.get('q') || '';
    const jurisdiction = url.searchParams.get('jurisdiction') || 'all';
    const category = url.searchParams.get('category') || 'all';
    const limit = parseInt(url.searchParams.get('limit') || '20');

    let results = [...mockLegalDatabase];

    // Filter by jurisdiction
    if (jurisdiction !== 'all') {
      results = results.filter(law => law.jurisdiction === jurisdiction);
    }

    // Filter by category
    if (category !== 'all') {
      results = results.filter(law => law.category === category);
    }

    // Search by query (simple text search)
    if (query.trim()) {
      const searchTerm = query.toLowerCase();
      results = results.filter(law => {
        return (
          law.title.toLowerCase().includes(searchTerm) ||
          law.description.toLowerCase().includes(searchTerm) ||
          law.code.toLowerCase().includes(searchTerm) ||
          law.keywords.some(keyword => keyword.toLowerCase().includes(searchTerm))
        );
      });

      // Sort by relevance (simple scoring)
      results.sort((a, b) => {
        const aScore = calculateRelevanceScore(a, searchTerm);
        const bScore = calculateRelevanceScore(b, searchTerm);
        return bScore - aScore;
      });
    }

    // Limit results
    results = results.slice(0, limit);

    return json({
      success: true,
      laws: results,
      count: results.length,
      query,
      filters: { jurisdiction, category },
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Laws search error:', error);
    return json(
      { 
        success: false, 
        error: 'Search failed',
        laws: [],
        count: 0 
      }, 
      { status: 500 }
    );
  }
};

function calculateRelevanceScore(law: any, searchTerm: string): number {
  let score = 0;

  // Title match gets highest score
  if (law.title.toLowerCase().includes(searchTerm)) {
    score += 10;
  }

  // Code match gets high score
  if (law.code.toLowerCase().includes(searchTerm)) {
    score += 8;
  }

  // Description match gets medium score
  if (law.description.toLowerCase().includes(searchTerm)) {
    score += 5;
  }

  // Keyword matches get lower score
  law.keywords.forEach((keyword: string) => {
    if (keyword.toLowerCase().includes(searchTerm)) {
      score += 2;
    }
  });

  // Exact keyword match gets bonus
  if (law.keywords.includes(searchTerm)) {
    score += 5;
  }

  return score;
}

// For integration with vector search in the future
async function performVectorSearch(query: string, jurisdiction: string, category: string): Promise<any> {
  try {
    // This would use your existing vector search endpoint
    const response = await fetch('/api/ai/vector-search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        type: 'legal',
        filters: { jurisdiction, category },
        limit: 10
      })
    });

    if (response.ok) {
      const result = await response.json();
      return result.results || [];
    }
  } catch (error: any) {
    console.error('Vector search error:', error);
  }
  
  return [];
}