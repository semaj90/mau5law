import { json, type RequestHandler } from '@sveltejs/kit';
import { requireAuth } from '$lib/server/auth';
import { authService } from '$lib/server/auth';
import db from '$lib/server/db/drizzle';
import * as schema from '$lib/server/db/schema-postgres';
// Removed unused imports: eq, and, PostgresJsDatabase
import { MinIOService } from '$lib/server/minio';
import { OllamaService } from '$lib/server/ollama';
import { OCRService } from '$lib/server/ocr';
import { EmbeddingService } from '$lib/server/embeddings';
import { RAGService } from '$lib/server/rag';
import { EvidenceDetectiveService } from '$lib/server/evidence-detective';

// Import handler functions
import { getApiInfo } from '$lib/server/api/v1/api-info-handler';
import { getCases, getCase, handleCreateCase } from '$lib/server/api/v1/cases-handlers';
import {
  getDocuments,
  getDocumentOCR,
  getDocument,
  handleDocumentUpload,
} from '$lib/server/api/v1/documents-handlers';
import {
  getEvidence,
  getEvidenceItem,
  handleCreateEvidence,
  handleEvidenceDetective,
} from '$lib/server/api/v1/evidence-handlers';
import { getRAGSessions, handleRAGSearch, handleRAGChat } from '$lib/server/api/v1/rag-handlers';
import { handleEmbed, handleAnalyze } from '$lib/server/api/v1/ai-handlers';
import { handleFileUpload } from '$lib/server/api/v1/file-upload-handler';

// Define UserType based on authService return
interface UserType {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
}

// Removed: const drizzleDb = db as PostgresJsDatabase<typeof schema>; // This will be passed to handlers

// Initialize services
const minioService = new MinIOService();
const ollamaService = new OllamaService();
const ocrService = new OCRService();
const embeddingService = new EmbeddingService();
const ragService = new RAGService();
const evidenceDetectiveService = new EvidenceDetectiveService();

// Authentication handlers
async function handleLogin(request: Request, cookies: any) {
  const { email, password } = await request.json();

  if (!email || !password) {
    return json({ error: 'Email and password required' }, { status: 400 });
  }

  try {
    const user = await authService.login(email, password);
    const session = await authService.createSession(user.id);

    // Set session cookie
    cookies.set('auth_session', session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      session: {
        id: session.id,
        expiresAt: session.expiresAt,
      },
    });
  } catch (error) {
    console.error('Login error:', error); // Use the error variable
    return json({ error: 'Invalid credentials' }, { status: 401 });
  }
}

async function handleRegister(request: Request, cookies: any) {
  const { email, password, firstName, lastName } = await request.json();
  if (!email || !password) {
    return json({ error: 'Email and password required' }, { status: 400 });
  }
  try {
    const user = await authService.register({
      email,
      password,
      firstName,
      lastName,
    });

    const session = await authService.createSession(user.id);

    cookies.set('auth_session', session.id, {
      path: '/',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    });
  } catch (error) {
    console.error('Registration error:', error);
    return json({ error: 'Registration failed' }, { status: 400 });
  }
}

async function handleLogout(request: Request, cookies: any) {
  const sessionId = cookies.get('auth_session');
  if (sessionId) {
    await authService.invalidateSession(sessionId);
  }
  cookies.delete('auth_session', { path: '/' });
  return json({ success: true });
}

export const GET: RequestHandler = async ({ request, url }) => {
  const path = url.pathname.replace('/api/v1', '');

  try {
    // Public endpoints that don't require auth
    if (path === '') {
      return await getApiInfo();
    }

    // Auth-required endpoints
    const { user } = (await requireAuth({ request } as any)) as { user: UserType }; // Capture the user object and type it

    // Cases endpoints
    if (path === '/cases') {
      return await getCases(user, request, db, schema);
    }
    if (path.startsWith('/cases/')) {
      const caseId = path.split('/cases/')[1];
      return await getCase(user, caseId, db, schema);
    }

    // Documents endpoints
    if (path === '/documents') {
      return await getDocuments(user, request, db, schema);
    }
    if (path.startsWith('/documents/')) {
      const documentId = path.split('/documents/')[1];
      if (path.includes('/ocr')) {
        return await getDocumentOCR(user, documentId, db, schema, ocrService);
      }
      return await getDocument(user, documentId, db, schema, minioService);
    }

    // Evidence endpoints
    if (path === '/evidence') {
      return await getEvidence(user, request, db, schema);
    }
    if (path.startsWith('/evidence/')) {
      const evidenceId = path.split('/evidence/')[1];
      return await getEvidenceItem(user, evidenceId, db, schema);
    }

    // RAG sessions
    if (path === '/rag/sessions') {
      return await getRAGSessions(user, request, db, schema);
    }

    return json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error) {
    console.error('API v1 GET error:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};

// Authentication endpoints
export const POST: RequestHandler = async ({ request, url, cookies }) => {
  const path = url.pathname.replace('/api/v1', '');

  try {
    // Auth endpoints
    if (path === '/auth/login') {
      return await handleLogin(request, cookies);
    }
    if (path === '/auth/register') {
      return await handleRegister(request, cookies);
    }
    if (path === '/auth/logout') {
      return await handleLogout(request, cookies);
    }

    // Auth-required endpoints for POST
    const { user } = (await requireAuth({ request } as any)) as { user: UserType }; // Capture the user object and type it

    // File upload endpoints
    if (path === '/files/upload') {
      return await handleFileUpload(request, minioService);
    }

    // Case management endpoints
    if (path === '/cases') {
      return await handleCreateCase(user, request, db, schema);
    }

    // Document endpoints
    if (path === '/documents/upload') {
      return await handleDocumentUpload(user, request, db, schema, minioService);
    }

    // Evidence endpoints
    if (path === '/evidence') {
      return await handleCreateEvidence(user, request, db, schema);
    }
    if (path === '/evidence/detective') {
      return await handleEvidenceDetective(user, request, evidenceDetectiveService);
    }

    // RAG endpoints
    if (path === '/rag/search') {
      return await handleRAGSearch(user, request, ragService);
    }
    if (path === '/rag/chat') {
      return await handleRAGChat(user, request, ragService);
    }

    // AI endpoints
    if (path === '/ai/embed') {
      return await handleEmbed(user, request, embeddingService);
    }
    if (path === '/ai/analyze') {
      return await handleAnalyze(user, request, ollamaService);
    }

    return json({ error: 'Endpoint not found' }, { status: 404 });
  } catch (error: any) {
    // Explicitly type error as any
    console.error('API v1 error:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
};
