import { expect, test } from '@playwright/test';

test.describe('API Integration Tests', () => {
  test.describe('POI API Endpoints', () => {
    test('should fetch POIs list', async ({ request }) => {
      const response = await request.get('/api/pois');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
    });

    test('should create new POI', async ({ request }) => {
      const newPoi = {
        name: 'Test POI',
        aliases: ['Test Alias'],
        dateOfBirth: '1990-01-01',
        address: '123 Test St',
        phone: '(555) 123-4567',
        email: 'test@example.com',
        status: 'person_of_interest',
        priority: 'medium',
        threatLevel: 'low',
        physicalDescription: {
          height: "5'10\"",
          weight: '170 lbs',
          hair: 'Brown',
          eyes: 'Blue',
          distinguishingMarks: 'Test mark'
        },
        profileData: {
          modusOperandi: 'Test MO',
          knownHabits: ['Testing'],
          associates: ['Test Associate']
        },
        lastKnownLocation: 'Test Location',
        lastSeen: '2024-01-01',
        dangerLevel: 5,
        notes: 'Test notes'
      };

      const response = await request.post('/api/pois', {
        data: newPoi
      });

      expect(response.ok()).toBeTruthy();

      const createdPoi = await response.json();
      expect(createdPoi.id).toBeDefined();
      expect(createdPoi.name).toBe('Test POI');
    });

    test('should update POI', async ({ request }) => {
      // First create a POI
      const createResponse = await request.post('/api/pois', {
        data: {
          name: 'Update Test POI',
          status: 'witness'
        }
      });
      const createdPoi = await createResponse.json();

      // Then update it
      const updateResponse = await request.put(`/api/pois/${createdPoi.id}`, {
        data: {
          name: 'Updated POI Name',
          status: 'suspect'
        }
      });

      expect(updateResponse.ok()).toBeTruthy();

      const updatedPoi = await updateResponse.json();
      expect(updatedPoi.name).toBe('Updated POI Name');
      expect(updatedPoi.status).toBe('suspect');
    });

    test('should delete POI', async ({ request }) => {
      // Create POI first
      const createResponse = await request.post('/api/pois', {
        data: { name: 'Delete Test POI' }
      });
      const createdPoi = await createResponse.json();

      // Delete it
      const deleteResponse = await request.delete(`/api/pois/${createdPoi.id}`);
      expect(deleteResponse.ok()).toBeTruthy();
    });
  });

  test.describe('Routes API Endpoints', () => {
    test('should fetch routes list', async ({ request }) => {
      const response = await request.get('/api/routes');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(Array.isArray(data)).toBeTruthy();
      expect(data.length).toBeGreaterThan(0);

      // Check route structure
      const firstRoute = data[0];
      expect(firstRoute.id).toBeDefined();
      expect(firstRoute.path).toBeDefined();
    });

    test('should log route interactions', async ({ request }) => {
      // Get first route
      const routesResponse = await request.get('/api/routes');
      const routes = await routesResponse.json();
      const firstRoute = routes[0];

      // Log an interaction
      const interactionResponse = await request.post(`/api/routes/${firstRoute.id}/interactions`, {
        data: {
          interaction_type: 'view',
          metadata: { test: true }
        }
      });

      expect(interactionResponse.ok()).toBeTruthy();
    });

    test('should fetch route analysis history', async ({ request }) => {
      // Get first route
      const routesResponse = await request.get('/api/routes');
      const routes = await routesResponse.json();
      const firstRoute = routes[0];

      // Fetch analysis history
      const analysisResponse = await request.get(`/api/routes/${firstRoute.id}/analysis`);
      expect(analysisResponse.ok()).toBeTruthy();

      const analysis = await analysisResponse.json();
      // Analysis might be empty, but should return valid response
      expect(analysis).toBeDefined();
    });
  });

  test.describe('Error Analysis API', () => {
    test('should fetch error analysis data', async ({ request }) => {
      const response = await request.get('/api/errors/analysis');
      expect(response.ok()).toBeTruthy();

      const data = await response.json();
      expect(data).toBeDefined();
    });

    test('should handle error reporting', async ({ request }) => {
      const errorData = {
        message: 'Test error',
        stack: 'Test stack trace',
        route: '/test-route',
        timestamp: new Date().toISOString()
      };

      const response = await request.post('/api/errors/report', {
        data: errorData
      });

      expect(response.ok()).toBeTruthy();
    });
  });

  test.describe('Health Check Endpoints', () => {
    test('should check database health', async ({ request }) => {
      const response = await request.get('/api/health/database');
      expect(response.ok()).toBeTruthy();

      const health = await response.json();
      expect(health.status).toBeDefined();
    });

    test('should check Redis health', async ({ request }) => {
      const response = await request.get('/api/health/redis');
      expect(response.ok()).toBeTruthy();

      const health = await response.json();
      expect(health.status).toBeDefined();
    });

    test('should check Ollama health', async ({ request }) => {
      const response = await request.get('/api/health/ollama');
      expect(response.ok()).toBeTruthy();

      const health = await response.json();
      expect(health.status).toBeDefined();
    });
  });

  test.describe('File Upload API', () => {
    test('should handle file upload', async ({ request }) => {
      // Create a test file
      const testFile = Buffer.from('Test file content');
      const blob = new Blob([testFile], { type: 'text/plain' });

      const response = await request.post('/api/upload', {
        multipart: {
          file: {
            name: 'test.txt',
            mimeType: 'text/plain',
            buffer: testFile
          }
        }
      });

      expect(response.ok()).toBeTruthy();
    });
  });
});