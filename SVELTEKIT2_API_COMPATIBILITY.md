# SvelteKit 2 API Route Compatibility Guide

## Overview

This guide ensures all API routes are fully compatible with SvelteKit 2 and follow best practices for production deployment.

## SvelteKit 2 API Route Structure

### File Organization

```
src/routes/api/
├── auth/
│   ├── login/
│   │   └── +server.ts
│   ├── logout/
│   │   └── +server.ts
│   └── profile/
│       └── +server.ts
├── cases/
│   ├── +server.ts (list, create)
│   └── [id]/
│       └── +server.ts (get, update, delete)
└── health/
    └── +server.ts
```

### Basic Route Template

```typescript
import { json, type RequestEvent } from '@sveltejs/kit';

/**
 * GET /api/example
 * Description: Example endpoint
 */
export async function GET(event: RequestEvent) {
  try {
    // Verify authentication if required
    const session = await event.locals.auth?.();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Implement handler logic
    const data = { message: 'Success' };

    return json(data, { status: 200 });
  } catch (error) {
    console.error('GET /api/example error:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/example
 * Description: Create example
 */
export async function POST(event: RequestEvent) {
  try {
    // Verify authentication
    const session = await event.locals.auth?.();
    if (!session?.user) {
      return json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const body = await event.request.json();

    // Validate input
    if (!body.name) {
      return json({ error: 'Missing required field: name' }, { status: 400 });
    }

    // Implement handler logic
    const result = { id: 1, ...body };

    return json(result, { status: 201 });
  } catch (error) {
    console.error('POST /api/example error:', error);
    return json(
      {
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
```

## HTTP Methods

### GET - Retrieve Data

```typescript
export async function GET(event: RequestEvent) {
  try {
    const { id } = event.params;
    const { search, limit } = event.url.searchParams;

    // Fetch data
    const data = await db.query('SELECT * FROM items WHERE id = $1', [id]);

    if (!data) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    return json(data);
  } catch (error) {
    return json({ error: 'Server error' }, { status: 500 });
  }
}
```

### POST - Create Data

```typescript
export async function POST(event: RequestEvent) {
  try {
    const body = await event.request.json();

    // Validate
    if (!body.name) {
      return json({ error: 'Missing name' }, { status: 400 });
    }

    // Create
    const result = await db.query(
      'INSERT INTO items (name) VALUES ($1) RETURNING *',
      [body.name]
    );

    return json(result, { status: 201 });
  } catch (error) {
    return json({ error: 'Server error' }, { status: 500 });
  }
}
```

### PUT - Update Data

```typescript
export async function PUT(event: RequestEvent) {
  try {
    const { id } = event.params;
    const body = await event.request.json();

    // Update
    const result = await db.query(
      'UPDATE items SET name = $1 WHERE id = $2 RETURNING *',
      [body.name, id]
    );

    if (!result) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    return json(result);
  } catch (error) {
    return json({ error: 'Server error' }, { status: 500 });
  }
}
```

### DELETE - Remove Data

```typescript
export async function DELETE(event: RequestEvent) {
  try {
    const { id } = event.params;

    // Delete
    const result = await db.query('DELETE FROM items WHERE id = $1', [id]);

    if (!result) {
      return json({ error: 'Not found' }, { status: 404 });
    }

    return json({ success: true });
  } catch (error) {
    return json({ error: 'Server error' }, { status: 500 });
  }
}
```

### PATCH - Partial Update

```typescript
export async function PATCH(event: RequestEvent) {
  try {
    const { id } = event.params;
    const body = await event.request.json();

    // Partial update
    const updates = Object.entries(body)
      .map(([key, value], i) => `${key} = $${i + 1}`)
      .join(', ');

    const result = await db.query(
      `UPDATE items SET ${updates} WHERE id = $${Object.keys(body).length + 1} RETURNING *`,
      [...Object.values(body), id]
    );

    return json(result);
  } catch (error) {
    return json({ error: 'Server error' }, { status: 500 });
  }
}
```

## Request Handling

### Parse JSON Body

```typescript
const body = await event.request.json();
```

### Parse Form Data

```typescript
const formData = await event.request.formData();
const file = formData.get('file') as File;
```

### Parse URL Parameters

```typescript
const { id } = event.params;
```

### Parse Query Parameters

```typescript
const { search, limit } = event.url.searchParams;
const searchValue = search || '';
const limitValue = parseInt(limit || '10');
```

### Get Headers

```typescript
const contentType = event.request.headers.get('content-type');
const authorization = event.request.headers.get('authorization');
```

## Response Handling

### JSON Response

```typescript
return json({ data: 'value' }, { status: 200 });
```

### Custom Headers

```typescript
return json(
  { data: 'value' },
  {
    status: 200,
    headers: {
      'X-Custom-Header': 'value',
      'Cache-Control': 'max-age=3600',
    },
  }
);
```

### Streaming Response

```typescript
const stream = fs.createReadStream('file.txt');
return new Response(stream);
```

### File Download

```typescript
return new Response(fileContent, {
  headers: {
    'Content-Type': 'application/octet-stream',
    'Content-Disposition': 'attachment; filename="file.txt"',
  },
});
```

## Authentication & Authorization

### Check Authentication

```typescript
const session = await event.locals.auth?.();
if (!session?.user) {
  return json({ error: 'Unauthorized' }, { status: 401 });
}
```

### Check Authorization

```typescript
if (session.user.role !== 'admin') {
  return json({ error: 'Forbidden' }, { status: 403 });
}
```

### Check Ownership

```typescript
const item = await db.query('SELECT * FROM items WHERE id = $1', [id]);
if (item.userId !== session.user.id) {
  return json({ error: 'Forbidden' }, { status: 403 });
}
```

## Error Handling

### Standard Error Response

```typescript
try {
  // Implementation
} catch (error) {
  console.error('Error:', error);
  return json(
    {
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    },
    { status: 500 }
  );
}
```

### Validation Error

```typescript
if (!body.email || !body.password) {
  return json(
    {
      error: 'Validation error',
      fields: {
        email: !body.email ? 'Required' : null,
        password: !body.password ? 'Required' : null,
      },
    },
    { status: 400 }
  );
}
```

### Not Found Error

```typescript
const item = await db.query('SELECT * FROM items WHERE id = $1', [id]);
if (!item) {
  return json({ error: 'Not found' }, { status: 404 });
}
```

### Conflict Error

```typescript
const existing = await db.query('SELECT * FROM items WHERE email = $1', [email]);
if (existing) {
  return json({ error: 'Email already exists' }, { status: 409 });
}
```

## Logging & Monitoring

### Request Logging

```typescript
console.log(`${event.request.method} ${event.url.pathname}`);
console.log('Headers:', Object.fromEntries(event.request.headers));
console.log('Body:', body);
```

### Performance Monitoring

```typescript
const startTime = Date.now();
try {
  // Implementation
} finally {
  const duration = Date.now() - startTime;
  console.log(`Request completed in ${duration}ms`);
}
```

### Error Logging

```typescript
catch (error) {
  console.error('Error:', {
    method: event.request.method,
    path: event.url.pathname,
    error: error instanceof Error ? error.message : 'Unknown error',
    stack: error instanceof Error ? error.stack : undefined,
  });
}
```

## Type Safety

### Request Event Type

```typescript
import { type RequestEvent } from '@sveltejs/kit';

export async function GET(event: RequestEvent) {
  // event.request: Request
  // event.params: Record<string, string>
  // event.url: URL
  // event.locals: App.Locals
}
```

### Response Types

```typescript
import { json, error, redirect } from '@sveltejs/kit';

// JSON response
return json({ data: 'value' });

// Error response
return error(404, 'Not found');

// Redirect
return redirect(302, '/login');
```

## CORS Configuration

### Enable CORS

```typescript
export async function GET(event: RequestEvent) {
  const response = json({ data: 'value' });

  response.headers.set('Access-Control-Allow-Origin', '*');
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE');
  response.headers.set('Access-Control-Allow-Headers', 'Content-Type');

  return response;
}
```

### Handle Preflight

```typescript
export async function OPTIONS(event: RequestEvent) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
```

## Rate Limiting

### Simple Rate Limiting

```typescript
const rateLimitMap = new Map<string, number[]>();

export async function GET(event: RequestEvent) {
  const ip = event.getClientAddress();
  const now = Date.now();
  const timestamps = rateLimitMap.get(ip) || [];

  // Remove old timestamps
  const recent = timestamps.filter((t) => now - t < 60000);

  if (recent.length > 100) {
    return json({ error: 'Rate limit exceeded' }, { status: 429 });
  }

  recent.push(now);
  rateLimitMap.set(ip, recent);

  return json({ data: 'value' });
}
```

## Caching

### Cache Control Headers

```typescript
return json(
  { data: 'value' },
  {
    headers: {
      'Cache-Control': 'public, max-age=3600',
      'ETag': '"abc123"',
    },
  }
);
```

### Conditional Requests

```typescript
const etag = event.request.headers.get('if-none-match');
if (etag === '"abc123"') {
  return new Response(null, { status: 304 });
}
```

## Testing

### Unit Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { GET } from './+server';

describe('GET /api/example', () => {
  it('should return data', async () => {
    const event = {
      request: new Request('http://localhost/api/example'),
      params: {},
      url: new URL('http://localhost/api/example'),
      locals: { auth: async () => ({ user: { id: 1 } }) },
    };

    const response = await GET(event as any);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data).toHaveProperty('data');
  });
});
```

## Common Patterns

### Pagination

```typescript
const page = parseInt(event.url.searchParams.get('page') || '1');
const limit = parseInt(event.url.searchParams.get('limit') || '10');
const offset = (page - 1) * limit;

const items = await db.query(
  'SELECT * FROM items LIMIT $1 OFFSET $2',
  [limit, offset]
);

return json({
  items,
  page,
  limit,
  total: await db.query('SELECT COUNT(*) FROM items'),
});
```

### Filtering

```typescript
const { category, status } = event.url.searchParams;

let query = 'SELECT * FROM items WHERE 1=1';
const params: any[] = [];

if (category) {
  query += ` AND category = $${params.length + 1}`;
  params.push(category);
}

if (status) {
  query += ` AND status = $${params.length + 1}`;
  params.push(status);
}

const items = await db.query(query, params);
return json(items);
```

### Sorting

```typescript
const { sortBy = 'created_at', order = 'desc' } = event.url.searchParams;

const items = await db.query(
  `SELECT * FROM items ORDER BY ${sortBy} ${order.toUpperCase()}`
);

return json(items);
```

## Production Checklist

- [ ] All routes use `+server.ts` pattern
- [ ] All routes export proper HTTP methods
- [ ] All routes have error handling
- [ ] All routes validate input
- [ ] All routes check authentication
- [ ] All routes have proper logging
- [ ] All routes return correct status codes
- [ ] All routes have CORS headers
- [ ] All routes are type-safe
- [ ] All routes are tested

---

Last Updated: 2025-12-14
