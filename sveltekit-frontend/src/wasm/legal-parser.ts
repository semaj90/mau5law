/**
 * Legal Document Parser in AssemblyScript
 * Fast client-side JSON parsing + entity/citation extraction
 * Compiles to WebAssembly with SIMD support
 */

// === Memory Management ===
import { allocateVectorMemory, freeVectorMemory } from './vector-operations';

// === Legal Document Structure ===
class LegalDocument {
  id: string = "";
  title: string = "";
  content: string = "";
  documentType: string = "";
  citations: Array<string> = [];
  entities: Array<string> = [];
  caseNumber: string = "";
  court: string = "";
  date: string = "";
  parties: Array<string> = [];
  keywords: Array<string> = [];
  summary: string = "";
  
  constructor() {}
}

class ParseResult {
  success: bool = false;
  documents: Array<LegalDocument> = [];
  totalChunks: i32 = 0;
  processingTime: f32 = 0.0;
  errorMessage: string = "";
  
  constructor() {}
}

// === Global Parser State ===
let globalResult: ParseResult = new ParseResult();
let tempBuffer: usize = 0;
const TEMP_BUFFER_SIZE = 64 * 1024; // 64KB temp buffer

// === Citation Pattern Recognition ===
const CITATION_PATTERNS = [
  "U.S.", "F.3d", "F.2d", "S.Ct.", "L.Ed.2d", "Fed.R.Civ.P.",
  "F.Supp.3d", "F.Supp.2d", "F.Supp.", "F.R.D.", "B.R."
];

const LEGAL_ENTITIES = [
  "court", "judge", "plaintiff", "defendant", "attorney", "counsel",
  "petitioner", "respondent", "appellant", "appellee", "party", "witness"
];

// === Memory Allocator for JS Interface ===
export function allocateMemory(size: i32): usize {
  return heap.alloc(size);
}

export function freeMemory(ptr: usize): void {
  heap.free(ptr);
}

// === String Processing Utilities ===
function charCodeAt(str: string, index: i32): i32 {
  if (index < 0 || index >= str.length) return 0;
  return str.charCodeAt(index);
}

function toLowerCase(str: string): string {
  let result = "";
  for (let i = 0; i < str.length; i++) {
    let char = str.charCodeAt(i);
    if (char >= 65 && char <= 90) {
      char += 32; // Convert to lowercase
    }
    result += String.fromCharCode(char);
  }
  return result;
}

function indexOf(str: string, search: string, start: i32 = 0): i32 {
  if (search.length == 0) return start;
  if (start < 0) start = 0;
  
  for (let i = start; i <= str.length - search.length; i++) {
    let found = true;
    for (let j = 0; j < search.length; j++) {
      if (str.charCodeAt(i + j) != search.charCodeAt(j)) {
        found = false;
        break;
      }
    }
    if (found) return i;
  }
  return -1;
}

function substring(str: string, start: i32, end: i32 = -1): string {
  if (start < 0) start = 0;
  if (end == -1) end = str.length;
  if (end > str.length) end = str.length;
  if (start >= end) return "";
  
  let result = "";
  for (let i = start; i < end; i++) {
    result += String.fromCharCode(str.charCodeAt(i));
  }
  return result;
}

function split(str: string, delimiter: string): Array<string> {
  let result = new Array<string>();
  let start = 0;
  let pos = indexOf(str, delimiter, start);
  
  while (pos >= 0) {
    result.push(substring(str, start, pos));
    start = pos + delimiter.length;
    pos = indexOf(str, delimiter, start);
  }
  
  if (start < str.length) {
    result.push(substring(str, start));
  }
  
  return result;
}

function trim(str: string): string {
  let start = 0;
  let end = str.length;
  
  // Trim leading whitespace
  while (start < end) {
    let char = str.charCodeAt(start);
    if (char != 32 && char != 9 && char != 10 && char != 13) break;
    start++;
  }
  
  // Trim trailing whitespace
  while (end > start) {
    let char = str.charCodeAt(end - 1);
    if (char != 32 && char != 9 && char != 10 && char != 13) break;
    end--;
  }
  
  return substring(str, start, end);
}

// === Citation Extraction ===
function extractCitations(text: string): Array<string> {
  let citations = new Array<string>();
  let lowerText = toLowerCase(text);
  
  for (let i = 0; i < CITATION_PATTERNS.length; i++) {
    let pattern = toLowerCase(CITATION_PATTERNS[i]);
    let pos = indexOf(lowerText, pattern);
    
    while (pos >= 0) {
      // Extract context around citation (30 chars before, 50 after)
      let start = pos - 30;
      if (start < 0) start = 0;
      let end = pos + pattern.length + 50;
      if (end > text.length) end = text.length;
      
      let citation = trim(substring(text, start, end));
      if (citation.length > 10) { // Minimum citation length
        citations.push(citation);
      }
      
      pos = indexOf(lowerText, pattern, pos + 1);
    }
  }
  
  return citations;
}

// === Entity Extraction ===
function extractEntities(text: string): Array<string> {
  let entities = new Array<string>();
  let lowerText = toLowerCase(text);
  let words = split(lowerText, " ");
  
  for (let i = 0; i < words.length; i++) {
    let word = trim(words[i]);
    
    for (let j = 0; j < LEGAL_ENTITIES.length; j++) {
      if (word == LEGAL_ENTITIES[j]) {
        // Get context - next 1-2 words might be names
        let entity = word;
        if (i + 1 < words.length) {
          let nextWord = trim(words[i + 1]);
          if (nextWord.length > 2) {
            entity += " " + nextWord;
          }
        }
        entities.push(entity);
        break;
      }
    }
  }
  
  return entities;
}

// === Keyword Extraction ===
function extractKeywords(text: string): Array<string> {
  let keywords = new Array<string>();
  let lowerText = toLowerCase(text);
  
  // Common legal keywords
  const LEGAL_KEYWORDS = [
    "contract", "agreement", "breach", "damages", "liability", "negligence",
    "statute", "regulation", "precedent", "jurisdiction", "evidence", "testimony",
    "motion", "appeal", "judgment", "verdict", "settlement", "arbitration"
  ];
  
  for (let i = 0; i < LEGAL_KEYWORDS.length; i++) {
    if (indexOf(lowerText, LEGAL_KEYWORDS[i]) >= 0) {
      keywords.push(LEGAL_KEYWORDS[i]);
    }
  }
  
  return keywords;
}

// === Document Type Detection ===
function detectDocumentType(content: string): string {
  let lowerContent = toLowerCase(content);
  
  if (indexOf(lowerContent, "contract") >= 0 || indexOf(lowerContent, "agreement") >= 0) {
    return "contract";
  } else if (indexOf(lowerContent, "motion") >= 0 || indexOf(lowerContent, "petition") >= 0) {
    return "motion";
  } else if (indexOf(lowerContent, "brief") >= 0 || indexOf(lowerContent, "memorandum") >= 0) {
    return "brief";
  } else if (indexOf(lowerContent, "judgment") >= 0 || indexOf(lowerContent, "order") >= 0) {
    return "judgment";
  } else if (indexOf(lowerContent, "deposition") >= 0 || indexOf(lowerContent, "transcript") >= 0) {
    return "transcript";
  } else {
    return "document";
  }
}

// === Summary Generation ===
function generateSummary(content: string): string {
  // Extract first 200 characters as basic summary
  if (content.length <= 200) return content;
  
  let summary = substring(content, 0, 200);
  let lastSpace = summary.lastIndexOf(" ");
  if (lastSpace > 150) {
    summary = substring(summary, 0, lastSpace) + "...";
  }
  
  return summary;
}

// === Main Parsing Functions ===

/**
 * Parse a single legal document from JSON string
 */
function parseLegalDocument(jsonText: string): LegalDocument {
  let doc = new LegalDocument();
  
  // Simple JSON parsing - extract key fields
  // In a full implementation, you'd use a proper JSON parser
  
  // Extract basic fields using pattern matching
  let idMatch = indexOf(jsonText, '"id"');
  if (idMatch >= 0) {
    let start = indexOf(jsonText, '"', idMatch + 4) + 1;
    let end = indexOf(jsonText, '"', start);
    if (end > start) {
      doc.id = substring(jsonText, start, end);
    }
  }
  
  let titleMatch = indexOf(jsonText, '"title"');
  if (titleMatch >= 0) {
    let start = indexOf(jsonText, '"', titleMatch + 7) + 1;
    let end = indexOf(jsonText, '"', start);
    if (end > start) {
      doc.title = substring(jsonText, start, end);
    }
  }
  
  let contentMatch = indexOf(jsonText, '"content"');
  if (contentMatch >= 0) {
    let start = indexOf(jsonText, '"', contentMatch + 9) + 1;
    let end = indexOf(jsonText, '"', start);
    if (end > start) {
      doc.content = substring(jsonText, start, end);
    }
  }
  
  // Process extracted content
  if (doc.content.length > 0) {
    doc.documentType = detectDocumentType(doc.content);
    doc.citations = extractCitations(doc.content);
    doc.entities = extractEntities(doc.content);
    doc.keywords = extractKeywords(doc.content);
    doc.summary = generateSummary(doc.content);
  }
  
  return doc;
}

/**
 * Main parsing entry point - called from JavaScript
 */
export function parseDocuments(jsonPtr: usize, jsonLength: i32): bool {
  if (jsonLength <= 0) {
    globalResult.success = false;
    globalResult.errorMessage = "Empty JSON input";
    return false;
  }
  
  let startTime = Date.now();
  globalResult = new ParseResult();
  
  // Convert memory to string
  let jsonText = "";
  for (let i = 0; i < jsonLength; i++) {
    jsonText += String.fromCharCode(load<u8>(jsonPtr + i));
  }
  
  // Basic validation
  if (jsonText.length == 0) {
    globalResult.success = false;
    globalResult.errorMessage = "Empty JSON text";
    return false;
  }
  
  // Check if it's an array or single document
  if (jsonText.charCodeAt(0) == 91) { // '[' - JSON array
    // Simple array parsing - split by '},{' pattern
    let docs = split(jsonText, "},{");
    
    for (let i = 0; i < docs.length; i++) {
      let docJson = docs[i];
      
      // Fix array boundaries
      if (i == 0) {
        docJson = substring(docJson, 1); // Remove leading '['
      }
      if (i == docs.length - 1) {
        docJson = substring(docJson, 0, docJson.length - 1); // Remove trailing ']'
      }
      
      // Ensure proper JSON object format
      if (docJson.charCodeAt(0) != 123) docJson = "{" + docJson; // Add leading '{'
      if (docJson.charCodeAt(docJson.length - 1) != 125) docJson = docJson + "}"; // Add trailing '}'
      
      let doc = parseLegalDocument(docJson);
      globalResult.documents.push(doc);
      globalResult.totalChunks++;
    }
  } else {
    // Single document
    let doc = parseLegalDocument(jsonText);
    globalResult.documents.push(doc);
    globalResult.totalChunks = 1;
  }
  
  globalResult.success = true;
  globalResult.processingTime = f32(Date.now() - startTime);
  
  return globalResult.success;
}

/**
 * Get parsing results count
 */
export function getResultCount(): i32 {
  return globalResult.documents.length;
}

/**
 * Get processing time
 */
export function getProcessingTime(): f32 {
  return globalResult.processingTime;
}

/**
 * Get a parsed document by index (returns JSON string pointer)
 */
export function getDocument(index: i32, outputPtr: usize, maxLength: i32): i32 {
  if (index < 0 || index >= globalResult.documents.length) {
    return 0;
  }
  
  let doc = globalResult.documents[index];
  
  // Create JSON string manually
  let json = "{";
  json += '"id":"' + doc.id + '",';
  json += '"title":"' + doc.title + '",';
  json += '"content":"' + doc.content + '",';
  json += '"documentType":"' + doc.documentType + '",';
  json += '"caseNumber":"' + doc.caseNumber + '",';
  json += '"court":"' + doc.court + '",';
  json += '"date":"' + doc.date + '",';
  json += '"summary":"' + doc.summary + '",';
  
  // Add arrays
  json += '"citations":[';
  for (let i = 0; i < doc.citations.length; i++) {
    if (i > 0) json += ",";
    json += '"' + doc.citations[i] + '"';
  }
  json += '],';
  
  json += '"entities":[';
  for (let i = 0; i < doc.entities.length; i++) {
    if (i > 0) json += ",";
    json += '"' + doc.entities[i] + '"';
  }
  json += '],';
  
  json += '"keywords":[';
  for (let i = 0; i < doc.keywords.length; i++) {
    if (i > 0) json += ",";
    json += '"' + doc.keywords[i] + '"';
  }
  json += '],';
  
  json += '"parties":[';
  for (let i = 0; i < doc.parties.length; i++) {
    if (i > 0) json += ",";
    json += '"' + doc.parties[i] + '"';
  }
  json += ']';
  
  json += "}";
  
  // Copy to output buffer
  let copyLength = json.length;
  if (copyLength > maxLength - 1) {
    copyLength = maxLength - 1;
  }
  
  for (let i = 0; i < copyLength; i++) {
    store<u8>(outputPtr + i, json.charCodeAt(i));
  }
  store<u8>(outputPtr + copyLength, 0); // Null terminator
  
  return copyLength;
}

/**
 * Initialize temporary buffers
 */
export function initializeParser(): bool {
  if (tempBuffer == 0) {
    tempBuffer = heap.alloc(TEMP_BUFFER_SIZE);
  }
  return tempBuffer != 0;
}

/**
 * Cleanup parser resources
 */
export function cleanupParser(): void {
  if (tempBuffer != 0) {
    heap.free(tempBuffer);
    tempBuffer = 0;
  }
  globalResult = new ParseResult();
}

/**
 * Get memory usage statistics
 */
export function getMemoryUsage(): i32 {
  return memory.size() * 65536; // Convert pages to bytes
}