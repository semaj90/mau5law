#!/usr/bin/env node
/**
 * 📚 Generate Latest Library Documentation
 * Direct execution to provide the documentation content
 */

class DocumentationGenerator {
  constructor() {
    this.docs = new Map();
  }

  async generate() {
    console.log('🔍 Generating latest library documentation...\n');

    // WebGPU Documentation
    this.docs.set('webgpu', {
      content: `
# WebGPU Types and APIs - Latest Specification

## Core Interfaces

### GPUDevice
\`\`\`typescript
interface GPUDevice extends EventTarget {
  readonly adapter: GPUAdapter;
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly queue: GPUQueue;

  createBuffer(descriptor: GPUBufferDescriptor): GPUBuffer;
  createTexture(descriptor: GPUTextureDescriptor): GPUTexture;
  createCommandEncoder(descriptor?: GPUCommandEncoderDescriptor): GPUCommandEncoder;
  createRenderPipeline(descriptor: GPURenderPipelineDescriptor): GPURenderPipeline;
  createComputePipeline(descriptor: GPUComputePipelineDescriptor): GPUComputePipeline;

  destroy(): void;
  pushErrorScope(filter: GPUErrorFilter): void;
  popErrorScope(): Promise<GPUError | null>;
}
\`\`\`

### GPUAdapter
\`\`\`typescript
interface GPUAdapter {
  readonly features: GPUSupportedFeatures;
  readonly limits: GPUSupportedLimits;
  readonly info: GPUAdapterInfo;

  requestDevice(descriptor?: GPUDeviceDescriptor): Promise<GPUDevice | null>;
  requestAdapterInfo(): Promise<GPUAdapterInfo>;
}
\`\`\`

### GPUBuffer
\`\`\`typescript
interface GPUBuffer extends GPUObjectBase {
  readonly size: number;
  readonly usage: GPUBufferUsageFlags;
  readonly mapState: GPUBufferMapState;

  mapAsync(mode: GPUMapModeFlags, offset?: number, size?: number): Promise<void>;
  getMappedRange(offset?: number, size?: number): ArrayBuffer;
  unmap(): void;
  destroy(): void;
}
\`\`\`

### GPUTexture
\`\`\`typescript
interface GPUTexture extends GPUObjectBase {
  readonly width: number;
  readonly height: number;
  readonly depthOrArrayLayers: number;
  readonly mipLevelCount: number;
  readonly sampleCount: number;
  readonly dimension: GPUTextureDimension;
  readonly format: GPUTextureFormat;
  readonly usage: GPUTextureUsageFlags;

  createView(descriptor?: GPUTextureViewDescriptor): GPUTextureView;
  destroy(): void;
}
\`\`\`

## Best Practices for API Routes

1. **GPU Resource Management**: Always clean up GPU resources with \`destroy()\`
2. **Error Handling**: Use \`pushErrorScope\` and \`popErrorScope\` for error management
3. **Type Safety**: Use proper TypeScript interfaces from @webgpu/types
4. **Memory Management**: Monitor buffer usage and cleanup appropriately
5. **Async Patterns**: Handle GPU operations asynchronously with proper error catching

## Modern WebGPU Patterns for SvelteKit

\`\`\`typescript
// In your API route (+server.ts)
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ request }) => {
  if (!globalThis.navigator?.gpu) {
    return new Response('WebGPU not supported', { status: 400 });
  }

  try {
    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
      return new Response('No WebGPU adapter found', { status: 500 });
    }

    const device = await adapter.requestDevice({
      requiredFeatures: ['timestamp-query'] as const,
      requiredLimits: {
        maxBufferSize: 1024 * 1024 * 100
      }
    });

    // Use device for GPU operations
    const buffer = device.createBuffer({
      size: 1024,
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST
    });

    // Always cleanup
    buffer.destroy();
    device.destroy();

    return Response.json({ success: true });
  } catch (error) {
    return new Response(\`WebGPU error: \${error.message}\`, { status: 500 });
  }
};
\`\`\`
      `,
      topics: ['GPUDevice', 'GPUAdapter', 'GPUBuffer', 'GPUTexture', 'typescript-definitions', 'api-routes']
    });

    // XState v5 Documentation
    this.docs.set('xstate', {
      content: `
# XState v5 - Modern State Management

## Core API Changes from v4

### createMachine (Enhanced in v5)
\`\`\`typescript
import { createMachine, createActor } from 'xstate';

const toggleMachine = createMachine({
  id: 'toggle',
  initial: 'inactive',
  context: {
    count: 0
  },
  states: {
    inactive: {
      on: {
        TOGGLE: {
          target: 'active',
          actions: assign({
            count: ({ context }) => context.count + 1
          })
        }
      }
    },
    active: {
      on: {
        TOGGLE: 'inactive'
      }
    }
  }
});
\`\`\`

### createActor (Replaces interpret)
\`\`\`typescript
// v5 Pattern - createActor
const actor = createActor(toggleMachine);

// Start the actor
actor.start();

// Subscribe to state changes
const subscription = actor.subscribe(state => {
  console.log('Current state:', state.value);
  console.log('Context:', state.context);
});

// Send events
actor.send({ type: 'TOGGLE' });

// Cleanup
subscription.unsubscribe();
actor.stop();
\`\`\`

### Context Management with assign
\`\`\`typescript
import { createMachine, assign } from 'xstate';

const counterMachine = createMachine({
  context: {
    count: 0,
    user: null
  },
  initial: 'idle',
  states: {
    idle: {
      on: {
        INCREMENT: {
          actions: assign({
            // Function form (recommended)
            count: ({ context }) => context.count + 1
          })
        },
        SET_USER: {
          actions: assign({
            // Direct value assignment
            user: ({ event }) => event.user
          })
        },
        RESET: {
          actions: assign({
            count: 0,
            user: null
          })
        }
      }
    }
  }
});
\`\`\`

### Guards and Actions
\`\`\`typescript
import { createMachine, assign } from 'xstate';

const authMachine = createMachine({
  context: {
    attempts: 0,
    user: null
  },
  initial: 'loggedOut',
  states: {
    loggedOut: {
      on: {
        LOGIN: {
          target: 'loggingIn',
          guard: ({ context }) => context.attempts < 3
        }
      }
    },
    loggingIn: {
      invoke: {
        src: 'loginService',
        onDone: {
          target: 'loggedIn',
          actions: assign({
            user: ({ event }) => event.output,
            attempts: 0
          })
        },
        onError: {
          target: 'loggedOut',
          actions: assign({
            attempts: ({ context }) => context.attempts + 1
          })
        }
      }
    },
    loggedIn: {
      on: {
        LOGOUT: 'loggedOut'
      }
    }
  }
});
\`\`\`

## Migration Guide from v4 to v5

### Key Changes:
1. **\`interpret\` → \`createActor\`**: New actor creation API
2. **Enhanced TypeScript**: Better type inference and safety
3. **Improved Context**: More flexible context assignment
4. **Actor Model**: Enhanced actor system for concurrent processes
5. **Simplified API**: More consistent naming and patterns

### Migration Steps:
\`\`\`typescript
// v4 (Old)
import { interpret } from 'xstate';
const service = interpret(machine).start();

// v5 (New)
import { createActor } from 'xstate';
const actor = createActor(machine).start();
\`\`\`

## SvelteKit Integration Patterns

### Store Integration
\`\`\`typescript
// stores/authMachine.ts
import { createMachine, createActor } from 'xstate';
import { writable, readable } from 'svelte/store';

export const authMachine = createMachine({...});

// Create actor
export const authActor = createActor(authMachine);

// Svelte store integration
export const authState = readable(authActor.getSnapshot(), (set) => {
  const subscription = authActor.subscribe(state => {
    set(state);
  });

  authActor.start();

  return () => {
    subscription.unsubscribe();
    authActor.stop();
  };
});

// Helper stores
export const isLoggedIn = derived(authState, $state => $state.matches('loggedIn'));
export const user = derived(authState, $state => $state.context.user);
\`\`\`

### Component Usage
\`\`\`svelte
<!-- Auth.svelte -->
<script>
  import { authState, authActor, isLoggedIn, user } from '$lib/stores/authMachine';

  function login() {
    authActor.send({ type: 'LOGIN' });
  }

  function logout() {
    authActor.send({ type: 'LOGOUT' });
  }
</script>

{#if $isLoggedIn}
  <p>Welcome, {$user?.name}!</p>
  <button on:click={logout}>Logout</button>
{:else}
  <button on:click={login}>Login</button>
{/if}

<pre>State: {JSON.stringify($authState.value, null, 2)}</pre>
\`\`\`

### API Route Integration
\`\`\`typescript
// routes/api/auth/+server.ts
import type { RequestHandler } from './$types';
import { createActor } from 'xstate';
import { authMachine } from '$lib/machines/auth';

export const POST: RequestHandler = async ({ request }) => {
  const { action, ...data } = await request.json();

  // Create temporary actor for server-side logic
  const actor = createActor(authMachine).start();

  try {
    actor.send({ type: action, ...data });
    const finalState = actor.getSnapshot();

    return Response.json({
      success: true,
      state: finalState.value,
      context: finalState.context
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message
    }, { status: 400 });
  } finally {
    actor.stop();
  }
};
\`\`\`
      `,
      topics: ['createMachine', 'createActor', 'assign', 'v5-migration', 'typescript-patterns', 'state-management']
    });

    // SvelteKit Documentation
    this.docs.set('sveltekit', {
      content: `
# SvelteKit 2 - Server Routes and API Patterns

## API Route Structure

### Basic API Route (+server.ts)
\`\`\`typescript
import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, params, locals }) => {
  try {
    const data = await fetchData(params.id);

    if (!data) {
      return error(404, 'Not found');
    }

    return json(data);
  } catch (err) {
    console.error('GET error:', err);
    return error(500, 'Internal server error');
  }
};

export const POST: RequestHandler = async ({ request, params }) => {
  try {
    const body = await request.json();

    // Validate request body
    if (!body.name) {
      return error(400, 'Name is required');
    }

    const result = await createData(body);

    return json(result, { status: 201 });
  } catch (err) {
    console.error('POST error:', err);
    return error(500, 'Failed to create data');
  }
};

export const PUT: RequestHandler = async ({ request, params }) => {
  try {
    const body = await request.json();
    const updated = await updateData(params.id, body);

    return json(updated);
  } catch (err) {
    return error(500, 'Failed to update data');
  }
};

export const DELETE: RequestHandler = async ({ params }) => {
  try {
    await deleteData(params.id);
    return new Response(null, { status: 204 });
  } catch (err) {
    return error(500, 'Failed to delete data');
  }
};
\`\`\`

### Advanced Request Handling
\`\`\`typescript
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

export const POST: RequestHandler = async ({ request, url, getClientAddress }) => {
  // Get client IP
  const clientIP = getClientAddress();

  // Handle different content types
  const contentType = request.headers.get('content-type');

  let data;
  if (contentType?.includes('application/json')) {
    data = await request.json();
  } else if (contentType?.includes('application/x-www-form-urlencoded')) {
    const formData = await request.formData();
    data = Object.fromEntries(formData);
  } else if (contentType?.includes('multipart/form-data')) {
    const formData = await request.formData();
    data = {
      fields: Object.fromEntries(formData),
      files: formData.getAll('files')
    };
  } else {
    return error(415, 'Unsupported content type');
  }

  // Process data with client info
  const result = await processData(data, { clientIP });

  return json(result);
};
\`\`\`

## Load Functions

### Page Server Load (+page.server.ts)
\`\`\`typescript
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, url, locals, depends }) => {
  // Mark dependencies for invalidation
  depends('app:user-data');

  try {
    // Server-only operations
    const user = await getUserById(params.id);

    if (!user) {
      return error(404, 'User not found');
    }

    // Filter sensitive data
    const safeUser = {
      id: user.id,
      name: user.name,
      email: user.email
      // Don't include password, etc.
    };

    // Additional data loading
    const posts = await getUserPosts(user.id);
    const settings = await getUserSettings(user.id);

    return {
      user: safeUser,
      posts,
      settings
    };
  } catch (err) {
    console.error('Load error:', err);
    return error(500, 'Failed to load user data');
  }
};
\`\`\`

### Universal Load (+page.ts)
\`\`\`typescript
import type { PageLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageLoad = async ({ params, fetch, parent }) => {
  try {
    // Access parent data
    const parentData = await parent();

    // Client-side fetch (works on both server and client)
    const response = await fetch(\`/api/data/\${params.id}\`);

    if (!response.ok) {
      return error(response.status, 'Failed to fetch data');
    }

    const data = await response.json();

    return {
      data,
      parentData
    };
  } catch (err) {
    console.error('Universal load error:', err);
    return error(500, 'Load failed');
  }
};
\`\`\`

## Form Actions

### Basic Form Actions (+page.server.ts)
\`\`\`typescript
import type { Actions, PageServerLoad } from './$types';
import { fail, redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async () => {
  return {
    form: null
  };
};

export const actions: Actions = {
  // Default action
  default: async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name')?.toString();
    const email = formData.get('email')?.toString();

    // Validation
    const errors: Record<string, string> = {};

    if (!name) {
      errors.name = 'Name is required';
    }

    if (!email) {
      errors.email = 'Email is required';
    } else if (!/^[^@]+@[^@]+\\.[^@]+$/.test(email)) {
      errors.email = 'Invalid email format';
    }

    if (Object.keys(errors).length > 0) {
      return fail(400, { name, email, errors });
    }

    try {
      await createUser({ name, email });
      return { success: true, name, email };
    } catch (err) {
      return fail(500, { name, email, errors: { general: 'Failed to create user' } });
    }
  },

  // Named actions
  update: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();
    const name = formData.get('name')?.toString();

    if (!id || !name) {
      return fail(400, { errors: { general: 'Missing required fields' } });
    }

    try {
      await updateUser(id, { name });
      return { success: true, updated: true };
    } catch (err) {
      return fail(500, { errors: { general: 'Update failed' } });
    }
  },

  delete: async ({ request }) => {
    const formData = await request.formData();
    const id = formData.get('id')?.toString();

    if (!id) {
      return fail(400, { errors: { general: 'ID required' } });
    }

    try {
      await deleteUser(id);
      throw redirect(302, '/users');
    } catch (err) {
      if (err instanceof Response) throw err; // Re-throw redirects
      return fail(500, { errors: { general: 'Delete failed' } });
    }
  }
};
\`\`\`

## TypeScript Integration Best Practices

### Request Event Typing
\`\`\`typescript
import type { RequestEvent } from '@sveltejs/kit';

// Extend for custom properties
interface CustomRequestEvent extends RequestEvent {
  params: {
    id: string;
    slug?: string;
  };
  locals: {
    user?: {
      id: string;
      role: string;
    };
  };
}

export const GET: RequestHandler = async ({ params, locals }: CustomRequestEvent) => {
  // params.id is now typed as string
  // locals.user is optional but typed
};
\`\`\`

### Generic Response Types
\`\`\`typescript
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    message: string;
    code?: string;
  };
  meta?: {
    total?: number;
    page?: number;
    timestamp: string;
  };
}

function createApiResponse<T>(data: T): ApiResponse<T> {
  return {
    success: true,
    data,
    meta: {
      timestamp: new Date().toISOString()
    }
  };
}

export const GET: RequestHandler = async ({ params }) => {
  const user = await getUser(params.id);
  const response = createApiResponse(user);
  return json(response);
};
\`\`\`

### Error Handling Patterns
\`\`\`typescript
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public code?: string
  ) {
    super(message);
  }
}

async function handleApiRequest(handler: () => Promise<any>): Promise<Response> {
  try {
    const result = await handler();
    return json({ success: true, data: result });
  } catch (err) {
    if (err instanceof ApiError) {
      return json({
        success: false,
        error: {
          message: err.message,
          code: err.code
        }
      }, { status: err.status });
    }

    console.error('Unexpected error:', err);
    return json({
      success: false,
      error: { message: 'Internal server error' }
    }, { status: 500 });
  }
}

export const GET: RequestHandler = async ({ params }) => {
  return handleApiRequest(async () => {
    const user = await getUser(params.id);
    if (!user) {
      throw new ApiError(404, 'User not found', 'USER_NOT_FOUND');
    }
    return user;
  });
};
\`\`\`

## Advanced Patterns

### Middleware Pattern
\`\`\`typescript
// lib/middleware.ts
import type { RequestHandler } from '@sveltejs/kit';
import { error } from '@sveltejs/kit';

export function withAuth(handler: RequestHandler): RequestHandler {
  return async (event) => {
    const token = event.request.headers.get('authorization');

    if (!token) {
      return error(401, 'Unauthorized');
    }

    try {
      const user = await verifyToken(token);
      event.locals.user = user;
      return handler(event);
    } catch (err) {
      return error(401, 'Invalid token');
    }
  };
}

// Usage in route
export const GET = withAuth(async ({ locals }) => {
  // locals.user is guaranteed to exist
  return json({ user: locals.user });
});
\`\`\`

### Streaming Responses
\`\`\`typescript
export const GET: RequestHandler = async ({ url }) => {
  const query = url.searchParams.get('q');

  if (!query) {
    return error(400, 'Query required');
  }

  const stream = new ReadableStream({
    start(controller) {
      searchDatabase(query, (result) => {
        const chunk = JSON.stringify(result) + '\\n';
        controller.enqueue(new TextEncoder().encode(chunk));
      }).then(() => {
        controller.close();
      }).catch((err) => {
        controller.error(err);
      });
    }
  });

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson',
      'cache-control': 'no-cache'
    }
  });
};
\`\`\`
      `,
      topics: ['server-routes', 'load-functions', 'form-actions', 'api-endpoints', 'request-event', 'typescript-integration']
    });

    // TypeScript Documentation
    this.docs.set('typescript', {
      content: `
# Modern TypeScript Best Practices for API Routes

## Module Resolution and Imports

### Type-Only Imports (Performance Optimization)
\`\`\`typescript
// ✅ Type-only imports (faster compilation, better bundling)
import type { RequestHandler, PageServerLoad } from './$types';
import type { RequestEvent } from '@sveltejs/kit';
import type { User, ApiResponse } from '$lib/types';

// ✅ Runtime imports
import { json, error, redirect } from '@sveltejs/kit';
import { db } from '$lib/database';
import { validateUser } from '$lib/validation';

// ❌ Avoid mixing types with runtime imports
import { RequestHandler, json } from '@sveltejs/kit';
\`\`\`

### Generated Types (./$types)
\`\`\`typescript
// Always use generated types from SvelteKit
import type {
  RequestHandler,
  PageServerLoad,
  Actions
} from './$types';

// Generated types provide:
// - Proper parameter typing
// - Return type validation
// - Route-specific context
\`\`\`

## Declaration Files and Global Types

### App Types (src/app.d.ts)
\`\`\`typescript
// See https://kit.svelte.dev/docs/types#app
declare global {
  namespace App {
    interface Error {
      code?: string;
      details?: Record<string, any>;
    }

    interface Locals {
      user?: {
        id: string;
        email: string;
        role: 'admin' | 'user';
      };
      session?: {
        id: string;
        expiresAt: Date;
      };
    }

    interface PageData {
      user?: App.Locals['user'];
      flash?: {
        type: 'success' | 'error' | 'warning';
        message: string;
      };
    }

    interface PageState {
      // Client-side page state
    }

    interface Platform {
      // Platform-specific properties (Cloudflare, etc.)
    }
  }
}

export {};
\`\`\`

### Custom Type Declarations
\`\`\`typescript
// lib/types/api.d.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  meta?: ResponseMeta;
}

export interface ApiError {
  message: string;
  code?: string;
  field?: string;
  details?: Record<string, any>;
}

export interface ResponseMeta {
  timestamp: string;
  version?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    hasNext: boolean;
  };
}

// Database types
export interface DatabaseUser {
  id: string;
  email: string;
  password_hash: string;
  created_at: Date;
  updated_at: Date;
}

// API transformation types
export interface ApiUser {
  id: string;
  email: string;
  createdAt: string;
  updatedAt: string;
}

// Utility types
export type CreateUserData = Pick<DatabaseUser, 'email'> & {
  password: string;
};

export type UpdateUserData = Partial<Pick<DatabaseUser, 'email'>>;
\`\`\`

## API Route Error Resolution

### Common Import Issues and Solutions

#### Problem: RequestHandler Import Error
\`\`\`typescript
// ❌ Common mistake
import { RequestHandler } from '@sveltejs/kit';

// ✅ Correct approach
import type { RequestHandler } from './$types';
\`\`\`

#### Problem: Missing Type Definitions
\`\`\`typescript
// ❌ Untyped parameters
export const GET = async ({ params, url }) => {
  // params and url are 'any'
};

// ✅ Properly typed
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  // params and url are properly typed
  const id: string = params.id;
  const search: string | null = url.searchParams.get('q');
};
\`\`\`

#### Problem: Response Type Issues
\`\`\`typescript
// ❌ Inconsistent return types
export const GET = async ({ params }) => {
  if (condition) {
    return json({ data: 'success' });
  }
  return error(400, 'Bad request'); // Type mismatch
};

// ✅ Consistent typing with Response
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params }) => {
  if (condition) {
    return json({ data: 'success' });
  }
  return error(400, 'Bad request'); // Both return Response
};
\`\`\`

### Type-Safe API Handlers

#### Generic API Response Handler
\`\`\`typescript
import type { RequestHandler } from './$types';
import { json, error } from '@sveltejs/kit';

interface ApiResult<T> {
  data: T;
  status?: number;
}

interface ApiError {
  message: string;
  code?: string;
  status: number;
}

function createApiHandler<T>(
  handler: (event: Parameters<RequestHandler>[0]) => Promise<ApiResult<T>>
): RequestHandler {
  return async (event) => {
    try {
      const result = await handler(event);
      return json(result.data, { status: result.status || 200 });
    } catch (err) {
      if (err && typeof err === 'object' && 'status' in err) {
        const apiErr = err as ApiError;
        return error(apiErr.status, apiErr.message);
      }
      console.error('API handler error:', err);
      return error(500, 'Internal server error');
    }
  };
}

// Usage
export const GET = createApiHandler<User[]>(async ({ params }) => {
  const users = await getUsersByCategory(params.category);
  return { data: users };
});
\`\`\`

#### Type-Safe Form Processing
\`\`\`typescript
import type { Actions } from './$types';
import { fail } from '@sveltejs/kit';

// Form validation types
interface FormField<T> {
  value: T;
  error?: string;
}

interface FormState<T> {
  fields: T;
  errors: Record<keyof T, string>;
  valid: boolean;
}

function validateForm<T extends Record<string, any>>(
  formData: FormData,
  validators: Record<keyof T, (value: string | null) => { valid: boolean; error?: string; value?: any }>
): FormState<T> {
  const fields = {} as T;
  const errors = {} as Record<keyof T, string>;
  let valid = true;

  for (const [key, validator] of Object.entries(validators)) {
    const rawValue = formData.get(key as string)?.toString() || null;
    const result = validator(rawValue);

    if (result.valid) {
      fields[key as keyof T] = result.value;
    } else {
      errors[key as keyof T] = result.error || 'Invalid value';
      valid = false;
    }
  }

  return { fields, errors, valid };
}

// Usage in actions
export const actions: Actions = {
  create: async ({ request }) => {
    const formData = await request.formData();

    const validation = validateForm(formData, {
      name: (value) => ({
        valid: !!value && value.length > 2,
        error: !value ? 'Name required' : value.length <= 2 ? 'Name too short' : undefined,
        value
      }),
      email: (value) => ({
        valid: !!value && /^[^@]+@[^@]+\\.[^@]+$/.test(value),
        error: !value ? 'Email required' : 'Invalid email format',
        value
      })
    });

    if (!validation.valid) {
      return fail(400, {
        data: validation.fields,
        errors: validation.errors
      });
    }

    try {
      const user = await createUser(validation.fields);
      return { success: true, user };
    } catch (err) {
      return fail(500, {
        data: validation.fields,
        errors: { general: 'Failed to create user' }
      });
    }
  }
};
\`\`\`

## Configuration Best Practices

### TypeScript Configuration (tsconfig.json)
\`\`\`json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    // Module resolution
    "moduleResolution": "bundler",
    "module": "ESNext",
    "target": "ES2022",

    // Strict settings
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "exactOptionalPropertyTypes": true,

    // Import/export settings
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "forceConsistentCasingInFileNames": true,

    // Performance
    "skipLibCheck": true,
    "incremental": true,

    // Path mapping
    "baseUrl": ".",
    "paths": {
      "$lib": ["./src/lib"],
      "$lib/*": ["./src/lib/*"],
      "$app/*": ["./.svelte-kit/runtime/app/*"]
    }
  },
  "include": [
    "src/**/*.d.ts",
    "src/**/*.ts",
    "src/**/*.js",
    "src/**/*.svelte"
  ]
}
\`\`\`

### ESLint Configuration for TypeScript
\`\`\`json
{
  "extends": [
    "eslint:recommended",
    "@typescript-eslint/recommended",
    "@typescript-eslint/recommended-requiring-type-checking"
  ],
  "parser": "@typescript-eslint/parser",
  "parserOptions": {
    "project": "./tsconfig.json"
  },
  "rules": {
    "@typescript-eslint/no-unused-vars": ["error", { "argsIgnorePattern": "^_" }],
    "@typescript-eslint/prefer-nullish-coalescing": "error",
    "@typescript-eslint/prefer-optional-chain": "error",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
\`\`\`

## Advanced TypeScript Patterns

### Conditional Types for API Responses
\`\`\`typescript
// Conditional response types based on method
type ApiResponse<T, M extends string> = M extends 'GET'
  ? { data: T }
  : M extends 'POST'
    ? { created: T; id: string }
    : M extends 'PUT'
      ? { updated: T }
      : { success: boolean };

function createTypedHandler<T, M extends 'GET' | 'POST' | 'PUT'>(
  method: M,
  handler: () => Promise<T>
): RequestHandler {
  return async () => {
    const data = await handler();

    switch (method) {
      case 'GET':
        return json({ data } as ApiResponse<T, M>);
      case 'POST':
        return json({ created: data, id: crypto.randomUUID() } as ApiResponse<T, M>);
      case 'PUT':
        return json({ updated: data } as ApiResponse<T, M>);
      default:
        return json({ success: true } as ApiResponse<T, M>);
    }
  };
}
\`\`\`

### Branded Types for IDs
\`\`\`typescript
// Create branded types for different ID types
declare const __brand: unique symbol;
type Brand<T, B> = T & { [__brand]: B };

type UserId = Brand<string, 'UserId'>;
type PostId = Brand<string, 'PostId'>;

function createUserId(id: string): UserId {
  return id as UserId;
}

function createPostId(id: string): PostId {
  return id as PostId;
}

// Usage prevents mixing up different ID types
export const GET: RequestHandler = async ({ params }) => {
  const userId = createUserId(params.userId);
  const postId = createPostId(params.postId);

  // TypeScript will prevent you from passing userId where PostId is expected
  const post = await getPost(postId); // ✅
  // const post = await getPost(userId); // ❌ TypeScript error
};
\`\`\`

### Error Handling with Result Types
\`\`\`typescript
// Result type for better error handling
type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };

async function safeApiCall<T>(
  operation: () => Promise<T>
): Promise<Result<T>> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error')
    };
  }
}

// Usage in API routes
export const GET: RequestHandler = async ({ params }) => {
  const result = await safeApiCall(() => getUserById(params.id));

  if (!result.success) {
    return error(500, result.error.message);
  }

  return json(result.data);
};
\`\`\`
      `,
      topics: ['module-resolution', 'type-imports', 'declaration-files', 'error-fixing', 'best-practices', 'api-routes']
    });

    return this.docs;
  }

  displaySummary() {
    console.log('\n📚 DOCUMENTATION SUMMARY');
    console.log('========================');
    console.log(`Generated: ${new Date().toISOString()}`);
    console.log(`Libraries documented: ${this.docs.size}\n`);

    for (const [library, doc] of this.docs) {
      console.log(`📖 ${library.toUpperCase()}`);
      console.log(`   Topics: ${doc.topics.join(', ')}`);
      console.log(`   Content: ${doc.content.length} characters`);
      console.log('');
    }

    console.log('✅ All documentation generated successfully!');
    console.log('\nThis documentation includes:');
    console.log('• Latest WebGPU TypeScript definitions and API patterns');
    console.log('• XState v5 migration guide and modern patterns');
    console.log('• SvelteKit 2 server routes and TypeScript integration');
    console.log('• Modern TypeScript best practices for API error resolution');
  }
}

// Main execution
async function main() {
  const generator = new DocumentationGenerator();
  await generator.generate();
  generator.displaySummary();
  return generator.docs;
}

main().catch(console.error);