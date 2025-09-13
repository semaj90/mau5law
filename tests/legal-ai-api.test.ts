/**
 * Legal AI Backend API Unit Tests
 * Tests the workflow API endpoints directly
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { dev } from '$app/environment';

const API_BASE = dev ? 'http://localhost:5173' : 'http://localhost:4173';

describe('Legal AI Workflow API Tests', () => {
  let caseId: string;

  beforeAll(async () => {
    console.log('🧪 Starting Legal AI API Tests...');
  });

  afterAll(async () => {
    console.log('✅ Legal AI API Tests completed');
  });

  it('should create a legal case', async () => {
    console.log('📁 Testing case creation...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create_case',
        data: {
          title: 'Test Case #2025-091',
          description: 'Automated test case for legal AI system',
          userId: 'test_user_123',
          priority: 'high',
          category: 'criminal',
          jurisdiction: 'Test Court'
        }
      })
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.case).toBeDefined();
    expect(result.case.id).toBeDefined();
    expect(result.case.title).toBe('Test Case #2025-091');

    caseId = result.case.id;
    console.log(`✅ Case created with ID: ${caseId}`);
  });

  it('should upload evidence to case', async () => {
    expect(caseId).toBeDefined();
    console.log('📄 Testing evidence upload...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'upload_evidence',
        data: {
          caseId: caseId,
          userId: 'test_user_123',
          files: [
            {
              name: 'test_document.pdf',
              type: 'application/pdf',
              content: 'base64_content_here',
              description: 'Test legal document'
            }
          ],
          canvasPositions: [{ x: 100, y: 100 }]
        }
      })
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.results).toBeDefined();
    expect(Array.isArray(result.results)).toBe(true);

    console.log('✅ Evidence uploaded successfully');
  });

  it('should update canvas positions', async () => {
    expect(caseId).toBeDefined();
    console.log('🎨 Testing canvas position updates...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'update_canvas_positions',
        data: {
          caseId: caseId,
          userId: 'test_user_123',
          evidencePositions: {
            'evidence_1': { x: 200, y: 150 },
            'evidence_2': { x: 300, y: 250 }
          }
        }
      })
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);

    console.log('✅ Canvas positions updated successfully');
  });

  it('should generate timeline', async () => {
    expect(caseId).toBeDefined();
    console.log('⏱️ Testing timeline generation...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'generate_timeline',
        data: {
          caseId: caseId,
          userId: 'test_user_123'
        }
      })
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.timeline).toBeDefined();
    expect(Array.isArray(result.timeline)).toBe(true);

    console.log(`✅ Timeline generated with ${result.timeline.length} events`);
  });

  it('should perform RAG chat with case', async () => {
    expect(caseId).toBeDefined();
    console.log('💬 Testing RAG chat...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'chat_with_case',
        data: {
          caseId: caseId,
          userId: 'test_user_123',
          query: 'What evidence was uploaded to this case?'
        }
      })
    });

    expect(response.status).toBe(200);

    const result = await response.json();
    expect(result.success).toBe(true);
    expect(result.response).toBeDefined();
    expect(typeof result.response).toBe('string');

    console.log('✅ RAG chat completed successfully');
  });

  it('should handle invalid actions gracefully', async () => {
    console.log('🛡️ Testing error handling...');

    const response = await fetch(`${API_BASE}/api/demo/legal-workflow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'invalid_action',
        data: {}
      })
    });

    expect(response.status).toBe(500);

    const result = await response.json();
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();

    console.log('✅ Error handling verified');
  });
});