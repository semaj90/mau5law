# 1_14_TypeFixes README - TypeScript Error Resolution Implementation Guide

## Overview

This README provides a comprehensive implementation guide for resolving extensive TypeScript compilation errors in the SvelteKit frontend codebase. Based on the systematic analysis conducted on November 14, 2025, this document outlines the step-by-step process to fix hundreds of TypeScript errors that are currently preventing successful compilation and runtime execution.

## Prerequisites

Before implementing the type fixes, ensure you have:

- **Node.js 18+** and **npm** installed
- **SvelteKit** project set up and running
- **TypeScript 5.x** configured
- Access to the codebase with write permissions
- **VS Code** or another TypeScript-compatible IDE (recommended)

## Current State Assessment

### Error Categories Identified

1. **Missing Type Imports/Exports** - High impact, prevents compilation
2. **Incompatible Type Assignments** - High impact, breaks type safety
3. **Missing Method Implementations** - Medium impact, clear error messages
4. **Module Resolution Issues** - High impact, prevents bundling
5. **Interface/Type Mismatches** - Medium-High impact, type safety violations

### Baseline Metrics
- **Total Errors**: Hundreds across the codebase
- **Affected Files**: ~200+ TypeScript/Svelte files
- **Critical Blockers**: Application startup and core functionality
- **Build Status**: `npm run check` exits with code 1

## How-To Guide: Systematic Type Fix Implementation

### Phase 1: Environment Setup and Assessment

#### Step 1.1: Verify Current Error State
```bash
# Check current TypeScript errors
npm run check

# Count total errors
npm run check 2>&1 | grep -c "error TS"

# Get detailed error breakdown
npm run check 2>&1 | head -50
```

#### Step 1.2: Create Type Fix Branch
```bash
# Create dedicated branch for type fixes
git checkout -b typescript-fixes-1_14

# Set up error tracking
mkdir -p docs/type-fixes
echo "# Type Fix Progress" > docs/type-fixes/progress.md
```

#### Step 1.3: Configure TypeScript for Strict Mode
Update [`tsconfig.json`](tsconfig.json ):
```json
{
  "extends": "./.svelte-kit/tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noImplicitThis": true,
    "noUnusedLocals": false,  // Temporarily disabled for easier fixes
    "noUnusedParameters": false,  // Temporarily disabled
    "exactOptionalPropertyTypes": true,
    "noImplicitOverride": true,
    "noPropertyAccessFromIndexSignature": false,  // Temporarily disabled
    "noUncheckedIndexedAccess": false  // Temporarily disabled
  }
}
```

### Phase 2: Priority-Based Error Resolution

#### Step 2.1: Fix Critical Startup Blockers (High Priority)

**Target Files:**
- [`src/routes/+page.svelte`](src/routes/+page.svelte )
- [`sveltekit-frontend/src/routes/+layout.svelte`](sveltekit-frontend/src/routes/+layout.svelte )
- [`sveltekit-frontend/src/lib/stores/app-store.ts`](sveltekit-frontend/src/lib/stores/app-store.ts )
- [`sveltekit-frontend/src/lib/server/db/drizzle.ts`](sveltekit-frontend/src/lib/server/db/drizzle.ts )

**Common Fixes:**

1. **Missing Import Errors:**
```typescript
// Before
const user = getCurrentUser();

// After
import type { User } from '$lib/types/user';
const user: User = getCurrentUser();
```

2. **Type Assignment Issues:**
```typescript
// Before
const data = await fetch('/api/data');

// After
const data: ApiResponse = await fetch('/api/data');
```

#### Step 2.2: Resolve Component Type Errors (Medium Priority)

**Target Directory:** [`src/lib/components`](src/lib/components )

**Implementation Pattern:**
```typescript
// For Svelte components with props
<script lang="ts">
  let {
    data,
    onAction
  } = $props<{
    data: ComponentData;
    onAction: (action: ActionType) => void;
  }>();
</script>
```

#### Step 2.3: Fix API Route Type Issues (Medium Priority)

**Target Directory:** [`src/routes/api`](src/routes/api )

**Common Patterns:**
```typescript
// API route handlers
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, url }) => {
  // Properly typed parameters
  const id = params.id as string;

  // Return typed responses
  return json({ data: result } satisfies ApiResponse);
};
```

### Phase 3: Systematic Error Resolution Strategy

#### Step 3.1: Batch Processing Approach

**Process 10-15 files at a time:**
```bash
# Create working batches
find src -name "*.ts" -o -name "*.svelte" | head -15 > batch_1.txt

# Check errors for specific batch
npx tsc --noEmit $(cat batch_1.txt)
```

#### Step 3.2: Error Pattern Matching and Fixes

**Pattern 1: Import Resolution**
```bash
# Find missing imports
npm run check 2>&1 | grep "Cannot find name" | head -10

# Fix by adding proper imports
import type { TypeName } from '$lib/types/filename';
```

**Pattern 2: Type Assignment**
```bash
# Find assignment errors
npm run check 2>&1 | grep "not assignable" | head -10

# Fix with explicit typing
const variable: CorrectType = value;
```

**Pattern 3: Interface Compliance**
```bash
# Find interface mismatches
npm run check 2>&1 | grep "missing the following properties" | head -10

# Complete interface implementation
interface CompleteInterface {
  requiredProperty: Type;
  optionalProperty?: Type;
}
```

#### Step 3.3: Incremental Testing

**After each batch:**
```bash
# Run type check
npm run check

# Track progress
echo "Batch X completed - $(date)" >> docs/type-fixes/progress.md

# Commit fixes
git add .
git commit -m "fix: resolve TypeScript errors in batch X"
```

### Phase 4: Advanced Type System Implementation

#### Step 4.1: Generic Type Definitions

Create reusable type definitions in [`src/lib/types`](src/lib/types ):

```typescript
// src/lib/types/api.ts
export interface ApiResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}
```

#### Step 4.2: Utility Types

```typescript
// src/lib/types/utils.ts
export type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};
```

#### Step 4.3: Component Props Types

```typescript
// For complex components
export interface ComponentProps {
  data: DataType;
  config?: ConfigType;
  onAction: (action: ActionType) => void;
  loading?: boolean;
}
```

### Phase 5: Validation and Quality Assurance

#### Step 5.1: Comprehensive Testing

```bash
# Full type check
npm run check

# Build verification
npm run build

# Runtime testing
npm run dev
```

#### Step 5.2: Error Regression Prevention

**Add pre-commit hooks:**
```bash
# .husky/pre-commit
#!/bin/sh
npm run check
```

**ESLint configuration for TypeScript:**
```json
// .eslintrc.json
{
  "extends": ["eslint:recommended", "@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn"
  }
}
```

#### Step 5.3: Documentation Updates

Update component and API documentation with proper TypeScript examples:

```typescript
/**
 * Component description
 * @param props - Component properties
 * @param props.data - The data to display
 * @param props.onAction - Callback for user actions
 */
export interface ComponentProps {
  data: DataType;
  onAction: (action: ActionType) => void;
}
```

## Modern Library Migration Guides

### Svelte 5 Migration & Automatic Fixing

#### Svelte 5 Breaking Changes & Fixes

**1. Event Handler Migration (on:click → onclick)**
```typescript
// Before (Svelte 4)
<button on:click={handleClick}>Click me</button>

// After (Svelte 5)
<button onclick={handleClick}>Click me</button>

// Auto-fix script
npx svelte-migrate svelte-5 --yes
```

**2. Component Props with $props()**
```typescript
// Before (Svelte 4)
<script lang="ts">
  export let data: DataType;
  export let onAction: (action: ActionType) => void;
</script>

// After (Svelte 5)
<script lang="ts">
  let { data, onAction } = $props<{
    data: DataType;
    onAction: (action: ActionType) => void;
  }>();
</script>
```

**3. Reactive Statements Migration**
```typescript
// Before (Svelte 4)
$: doubled = count * 2;

// After (Svelte 5)
let doubled = $derived(count * 2);
```

**4. Store Usage Updates**
```typescript
// Before (Svelte 4)
import { writable } from 'svelte/store';
const count = writable(0);

// After (Svelte 5) - No changes needed for basic stores
import { writable } from 'svelte/store';
const count = writable(0);
```

#### Automatic Svelte 5 Migration Commands
```bash
# Install migration tool
npm install -g @sveltejs/migrate

# Run automated migration
npx @sveltejs/migrate svelte-5

# Fix common issues automatically
npx svelte-check --fail-on-warnings=false --output json | \
  jq '.errors[] | select(.message | contains("on:"))' | \
  xargs -I {} sh -c 'echo "Fix: {}"'
```

### Bits-ui v2 Migration & Automatic Fixing

#### Bits-ui v2 Breaking Changes

**Status**: Bits-ui v2.14.2 is already installed. Migration involves updating component usage patterns, not import paths.

**Key Changes in Bits-ui v2:**

1. **Import Paths**: Remain the same (`import { Button } from 'bits-ui'`)
2. **Props API Changes**:
   - `el` prop → `ref` prop
   - `asChild` prop → `child` snippet
   - Transition props removed (use `child` snippet + `forceMount`)
   - `let:` directives → `children`/`child` snippet props

**Component-Specific Changes:**

- **Button**: Removed `builders` prop, use `child` snippet for custom elements
- **Dialog**: Must wrap `Dialog.Content` in `Dialog.Portal` for portalling, `AlertDialog.Action` no longer auto-closes
- **Checkbox**: `checked` is `boolean` only, `indeterminate` separate prop, `Checkbox.Indicator` removed → use `children` snippet
- **Select/Combobox**: `multiple` → `type` prop (`'single'` or `'multiple'`), `selected` → `value` prop, content must be wrapped in `*Portal`
- **Accordion**: `multiple` → `type` prop, transition props removed
- **Menus**: `*RadioIndicator`/`*CheckboxIndicator` removed → use `children` snippet, `*Menu.Label` → `*Menu.GroupHeading`
- **Tooltip**: New required `Tooltip.Provider` component
- **Slider**: New required `type` prop, new `onValueCommit` prop

**1. Component Import Path Changes**
```typescript
// Import paths stay the same in v2
import { Button } from 'bits-ui';
import { Dialog } from 'bits-ui';
import { Select } from 'bits-ui';
```

**2. Props API Changes**
```typescript
// Before (v1) - el prop
<Button el={buttonRef}>Click me</Button>

// After (v2) - ref prop
<Button ref={buttonRef}>Click me</Button>

// Before (v1) - asChild prop
<Button asChild><a href="/link">Link</a></Button>

// After (v2) - child snippet
<Button child={{ el: 'a', href: '/link' }}>Link</Button>
```

**3. Event Handler Updates**
```typescript
// Before (v1 + Svelte 4)
<Button on:click={handleClick}>Click me</Button>

// After (v2 + Svelte 5)
<Button onclick={handleClick}>Click me</Button>
```

#### Automatic Bits-ui Migration
```bash
# Bits-ui v2.14.2 already installed
npm list bits-ui

# No migration command available - manual migration required
# Update component usage patterns according to migration guide
```

#### Current Status:
- ✅ Bits-ui v2.14.2 installed
- ✅ Import paths corrected (reverted incorrect v1→v2 path changes)
- ✅ Component usage patterns identified for future updates
- 🔄 TypeScript errors remain (primarily in type definition files)
- ⏳ Component usage patterns need updating (ref props, child snippets, etc.)

**Migration Progress Summary:**
- **Completed**: Import path corrections, README documentation updates
- **Remaining**: Component prop updates (el→ref, asChild→child, etc.), Svelte 5 event handlers
- **Next Steps**: Manual component-by-component updates according to migration guide

### 📋 Next Steps for Complete Migration:

#### Component-by-Component Updates: Update individual component usage to v2 patterns:
- Replace `el` props with `ref` props
- Convert `asChild` props to `child` snippets
- Update event handlers for Svelte 5 compatibility
- Add required `Tooltip.Provider` components
- Update Select/Combobox `multiple` → `type` props

#### Svelte 5 Migration: Run the automated Svelte 5 migration to handle event handler changes (on:click → onclick)

#### Testing: Verify all components work correctly after migration

### Drizzle-ORM 0.44 Migration & Automatic Fixing

#### Drizzle v0.44 Breaking Changes

**1. Schema Definition Updates**
```typescript
// Before (v0.43)
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name'),
});

// After (v0.44)
import { pgTable, serial, text } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
});
```

**2. Query API Changes**
```typescript
// Before (v0.43)
const result = await db.select().from(users);

// After (v0.44) - More explicit typing
const result: User[] = await db.select().from(users);
```

**3. Migration API Updates**
```typescript
// Before (v0.43)
import { migrate } from 'drizzle-orm/node-postgres/migrator';

// After (v0.44)
import { migrate } from 'drizzle-orm/postgres-js/migrator';
```

#### Automatic Drizzle Migration
```bash
# Update to latest version
npm install drizzle-orm@0.44 drizzle-kit@latest

# Generate new migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Update schema files automatically
find src -name "*schema.ts" | \
  xargs sed -i "s/\.notNull()/\.notNull()/g"
```

#### Automatic Drizzle Migration
```bash
# Update to latest version
npm install drizzle-orm@0.44 drizzle-kit@latest

# Generate new migrations
npx drizzle-kit generate

# Run migrations
npx drizzle-kit migrate

# Update schema files automatically
find src -name "*schema.ts" | \
  xargs sed -i "s/\.notNull()/\.notNull()/g"
```

### XState v5 Migration & Best Practices

#### XState v5 Breaking Changes

**Status**: XState v5 introduces major API changes focused on better TypeScript support and simplified state machine definitions.

**Key Changes in XState v5:**

1. **Machine Creation**: `createMachine` → `setup()` function with actors
2. **State Definition**: Object-based states → functional approach
3. **Actions**: String actions → object-based actions with `assign()`
4. **Context**: Direct context access → `assign()` function
5. **Events**: Event creators → typed event objects
6. **Actors**: New actor system for complex state management

**1. Machine Creation Migration**
```typescript
// Before (v4)
import { createMachine, interpret } from 'xstate';

const machine = createMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: { actions: 'increment' }
      }
    }
  }
}, {
  actions: {
    increment: assign({ count: (ctx) => ctx.count + 1 })
  }
});

// After (v5)
import { setup, assign } from 'xstate';

const counterMachine = setup({
  types: {
    context: {} as { count: number },
    events: {} as { type: 'INCREMENT' } | { type: 'DECREMENT' }
  },
  actions: {
    increment: assign({ count: ({ context }) => context.count + 1 }),
    decrement: assign({ count: ({ context }) => context.count - 1 })
  }
}).createMachine({
  id: 'counter',
  initial: 'idle',
  context: { count: 0 },
  states: {
    idle: {
      on: {
        INCREMENT: { actions: 'increment' },
        DECREMENT: { actions: 'decrement' }
      }
    }
  }
});
```

**2. Actor System Usage**
```typescript
// Using actors in v5
import { createActor } from 'xstate';

const actor = createActor(counterMachine);
actor.start();

actor.send({ type: 'INCREMENT' });
console.log(actor.getSnapshot().context.count); // 1
```

**3. Event Typing**
```typescript
// Strongly typed events
type CounterEvent =
  | { type: 'INCREMENT' }
  | { type: 'DECREMENT' }
  | { type: 'RESET'; value: number };

const machine = setup({
  types: {
    events: {} as CounterEvent
  }
}).createMachine(/* ... */);
```

#### XState v5 Best Practices

**1. Type-Safe State Machines**
```typescript
import { setup, assign } from 'xstate';

type User = {
  id: string;
  name: string;
  email: string;
};

type AuthContext = {
  user: User | null;
  error: string | null;
};

type AuthEvent =
  | { type: 'LOGIN'; email: string; password: string }
  | { type: 'LOGOUT' }
  | { type: 'LOGIN_SUCCESS'; user: User }
  | { type: 'LOGIN_ERROR'; error: string };

const authMachine = setup({
  types: {
    context: {} as AuthContext,
    events: {} as AuthEvent
  },
  actions: {
    setUser: assign({
      user: ({ event }) => {
        if (event.type === 'LOGIN_SUCCESS') {
          return event.user;
        }
        return null;
      }
    }),
    setError: assign({
      error: ({ event }) => {
        if (event.type === 'LOGIN_ERROR') {
          return event.error;
        }
        return null;
      }
    }),
    clearError: assign({ error: null })
  },
  guards: {
    isLoggedIn: ({ context }) => context.user !== null
  }
}).createMachine({
  id: 'auth',
  initial: 'unauthenticated',
  context: {
    user: null,
    error: null
  },
  states: {
    unauthenticated: {
      on: {
        LOGIN: 'authenticating'
      }
    },
    authenticating: {
      on: {
        LOGIN_SUCCESS: {
          target: 'authenticated',
          actions: ['setUser', 'clearError']
        },
        LOGIN_ERROR: {
          target: 'unauthenticated',
          actions: 'setError'
        }
      }
    },
    authenticated: {
      on: {
        LOGOUT: {
          target: 'unauthenticated',
          actions: assign({ user: null })
        }
      }
    }
  }
});
```

**2. Actor Composition**
```typescript
// Composing multiple actors
const parentMachine = setup({
  types: {
    context: {} as { auth: Actor<typeof authMachine>; counter: Actor<typeof counterMachine> }
  },
  actors: {
    authActor: authMachine,
    counterActor: counterMachine
  }
}).createMachine({
  context: ({ spawn }) => ({
    auth: spawn('authActor'),
    counter: spawn('counterActor')
  })
});
```

**3. Reactive State Integration with Svelte**
```typescript
// Integrating XState with Svelte runes
<script lang="ts">
  import { createActor } from 'xstate';
  import { authMachine } from '$lib/machines/auth';

  let authActor = $state(createActor(authMachine));
  let authState = $derived(authActor.getSnapshot());

  $effect(() => {
    authActor.start();
    return () => authActor.stop();
  });

  function login(email: string, password: string) {
    authActor.send({ type: 'LOGIN', email, password });
  }

  function logout() {
    authActor.send({ type: 'LOGOUT' });
  }
</script>

{#if authState.matches('authenticated')}
  <p>Welcome, {authState.context.user?.name}!</p>
  <button onclick={logout}>Logout</button>
{:else}
  <button onclick={() => login('user@example.com', 'password')}>
    Login
  </button>
{/if}
```

#### Automatic XState Migration
```bash
# Install XState v5
npm install xstate@latest

# Use codemods for migration (if available)
npx @xstate/cli migrate

# Manual migration steps:
# 1. Replace createMachine with setup().createMachine
# 2. Convert string actions to object actions with assign()
# 3. Update context access patterns
# 4. Add proper TypeScript types
```

### RabbitMQ Integration & Best Practices

#### RabbitMQ Setup and Configuration

**1. Docker Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  rabbitmq:
    image: rabbitmq:3-management-alpine
    container_name: legal-ai-rabbitmq
    environment:
      RABBITMQ_DEFAULT_USER: admin
      RABBITMQ_DEFAULT_PASS: password123
      RABBITMQ_DEFAULT_VHOST: /
    ports:
      - "5672:5672"   # AMQP port
      - "15672:15672" # Management UI
    volumes:
      - rabbitmq_data:/var/lib/rabbitmq
    healthcheck:
      test: ["CMD", "rabbitmq-diagnostics", "ping"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  rabbitmq_data:
```

**2. TypeScript Client Setup**
```typescript
// src/lib/messaging/rabbitmq.ts
import * as amqp from 'amqplib';

export class RabbitMQClient {
  private connection: amqp.Connection | null = null;
  private channel: amqp.Channel | null = null;

  async connect(url: string = 'amqp://admin:password123@localhost:5672') {
    try {
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      console.log('Connected to RabbitMQ');
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error);
      throw error;
    }
  }

  async publish(queue: string, message: any) {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.channel.assertQueue(queue, { durable: true });
    this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)), {
      persistent: true
    });
  }

  async consume(queue: string, handler: (message: any) => Promise<void>) {
    if (!this.channel) throw new Error('Channel not initialized');

    await this.channel.assertQueue(queue, { durable: true });

    this.channel.consume(queue, async (msg) => {
      if (msg) {
        try {
          const content = JSON.parse(msg.content.toString());
          await handler(content);
          this.channel!.ack(msg);
        } catch (error) {
          console.error('Error processing message:', error);
          this.channel!.nack(msg, false, false);
        }
      }
    });
  }

  async close() {
    if (this.channel) await this.channel.close();
    if (this.connection) await this.connection.close();
  }
}
```

**3. Message Patterns**

**Publisher-Subscriber Pattern:**
```typescript
// Publisher
const publisher = new RabbitMQClient();
await publisher.connect();

await publisher.publish('legal-documents', {
  type: 'DOCUMENT_UPLOADED',
  documentId: 'doc-123',
  userId: 'user-456',
  timestamp: new Date().toISOString()
});

// Subscriber
const subscriber = new RabbitMQClient();
await subscriber.connect();

await subscriber.consume('legal-documents', async (message) => {
  console.log('Processing document:', message.documentId);
  // Process document analysis, indexing, etc.
});
```

**Request-Reply Pattern:**
```typescript
// Request
async function analyzeDocument(documentId: string) {
  const client = new RabbitMQClient();
  await client.connect();

  const correlationId = generateId();
  const replyQueue = await client.channel!.assertQueue('', { exclusive: true });

  return new Promise((resolve) => {
    client.channel!.consume(replyQueue.queue, (msg) => {
      if (msg && msg.properties.correlationId === correlationId) {
        resolve(JSON.parse(msg.content.toString()));
        client.channel!.ack(msg);
      }
    }, { noAck: false });

    client.channel!.sendToQueue('document-analysis', Buffer.from(JSON.stringify({
      documentId,
      analysisType: 'full'
    })), {
      correlationId,
      replyTo: replyQueue.queue
    });
  });
}
```

#### RabbitMQ Best Practices

**1. Connection Management**
```typescript
// Connection pooling and retry logic
class RabbitMQConnectionPool {
  private pool: RabbitMQClient[] = [];
  private maxConnections = 10;

  async getConnection(): Promise<RabbitMQClient> {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }

    const client = new RabbitMQClient();
    await this.connectWithRetry(client);
    return client;
  }

  private async connectWithRetry(client: RabbitMQClient, retries = 3) {
    for (let i = 0; i < retries; i++) {
      try {
        await client.connect();
        return;
      } catch (error) {
        if (i === retries - 1) throw error;
        await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  releaseConnection(client: RabbitMQClient) {
    if (this.pool.length < this.maxConnections) {
      this.pool.push(client);
    } else {
      client.close();
    }
  }
}
```

**2. Message Reliability**
```typescript
// Dead letter queues and error handling
await channel.assertQueue('document-processing', {
  durable: true,
  deadLetterExchange: 'dlx',
  deadLetterRoutingKey: 'failed-documents'
});

await channel.assertExchange('dlx', 'direct', { durable: true });
await channel.assertQueue('failed-documents', { durable: true });
await channel.bindQueue('failed-documents', 'dlx', 'failed-documents');
```

**3. Monitoring and Health Checks**
```typescript
// Health check endpoint
export async function checkRabbitMQHealth(): Promise<boolean> {
  try {
    const client = new RabbitMQClient();
    await client.connect();
    await client.close();
    return true;
  } catch {
    return false;
  }
}
```

### Neo4j Graph Database Integration

#### Neo4j Setup and Configuration

**1. Docker Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  neo4j:
    image: neo4j:5.15-enterprise
    container_name: legal-ai-neo4j
    environment:
      NEO4J_AUTH: neo4j/password123
      NEO4J_PLUGINS: '["graph-data-science"]'
      NEO4J_dbms_security_procedures_unrestricted: 'gds.*'
    ports:
      - "7474:7474"   # HTTP
      - "7687:7687"   # Bolt
    volumes:
      - neo4j_data:/data
      - neo4j_logs:/logs
    healthcheck:
      test: ["CMD", "cypher-shell", "-u", "neo4j", "-p", "password123", "MATCH () RETURN count(*)"]
      interval: 30s
      timeout: 10s
      retries: 5

volumes:
  neo4j_data:
  neo4j_logs:
```

**2. TypeScript Driver Setup**
```typescript
// src/lib/database/neo4j.ts
import neo4j, { Driver, Session, Result } from 'neo4j-driver';

export class Neo4jClient {
  private driver: Driver;

  constructor(uri: string, user: string, password: string) {
    this.driver = neo4j.driver(uri, neo4j.auth.basic(user, password));
  }

  async verifyConnectivity(): Promise<boolean> {
    try {
      await this.driver.verifyConnectivity();
      return true;
    } catch {
      return false;
    }
  }

  async run(query: string, params: Record<string, any> = {}): Promise<Result> {
    const session = this.driver.session();
    try {
      return await session.run(query, params);
    } finally {
      await session.close();
    }
  }

  async close() {
    await this.driver.close();
  }

  // Legal document relationship queries
  async createDocumentNode(document: {
    id: string;
    title: string;
    content: string;
    type: string;
    createdAt: Date;
  }) {
    const query = `
      CREATE (d:Document {
        id: $id,
        title: $title,
        content: $content,
        type: $type,
        createdAt: $createdAt
      })
      RETURN d
    `;

    return this.run(query, {
      id: document.id,
      title: document.title,
      content: document.content,
      type: document.type,
      createdAt: document.createdAt.toISOString()
    });
  }

  async createEntityNode(entity: {
    id: string;
    name: string;
    type: string;
    properties: Record<string, any>;
  }) {
    const query = `
      CREATE (e:Entity {
        id: $id,
        name: $name,
        type: $type,
        properties: $properties
      })
      RETURN e
    `;

    return this.run(query, {
      id: entity.id,
      name: entity.name,
      type: entity.type,
      properties: JSON.stringify(entity.properties)
    });
  }

  async createRelationship(
    fromId: string,
    toId: string,
    relationshipType: string,
    properties: Record<string, any> = {}
  ) {
    const query = `
      MATCH (a {id: $fromId}), (b {id: $toId})
      CREATE (a)-[r:${relationshipType} $properties]->(b)
      RETURN r
    `;

    return this.run(query, {
      fromId,
      toId,
      properties
    });
  }

  async findRelatedDocuments(entityId: string, depth: number = 2) {
    const query = `
      MATCH (e:Entity {id: $entityId})-[r*1..${depth}]-(d:Document)
      RETURN DISTINCT d, collect(r) as relationships
      ORDER BY d.createdAt DESC
    `;

    return this.run(query, { entityId });
  }

  async searchDocumentsByEntityPattern(pattern: string) {
    const query = `
      MATCH (d:Document)-[r]-(e:Entity)
      WHERE e.name =~ $pattern OR e.type =~ $pattern
      RETURN d, e, r
      ORDER BY d.createdAt DESC
      LIMIT 50
    `;

    return this.run(query, { pattern: `(?i).*${pattern}.*` });
  }
}
```

#### Neo4j Best Practices

**1. Schema Design for Legal Documents**
```cypher
// Create constraints
CREATE CONSTRAINT document_id IF NOT EXISTS FOR (d:Document) REQUIRE d.id IS UNIQUE;
CREATE CONSTRAINT entity_id IF NOT EXISTS FOR (e:Entity) REQUIRE e.id IS UNIQUE;

// Create indexes
CREATE INDEX document_type IF NOT EXISTS FOR (d:Document) ON (d.type);
CREATE INDEX document_created IF NOT EXISTS FOR (d:Document) ON (d.createdAt);
CREATE INDEX entity_type IF NOT EXISTS FOR (e:Entity) ON (e.type);
```

**2. Legal Document Graph Patterns**
```typescript
// Contract analysis relationships
await neo4j.createEntityNode({
  id: 'party-a',
  name: 'ABC Corporation',
  type: 'LegalEntity',
  properties: { jurisdiction: 'Delaware', role: 'Contractor' }
});

await neo4j.createEntityNode({
  id: 'party-b',
  name: 'XYZ Services LLC',
  type: 'LegalEntity',
  properties: { jurisdiction: 'California', role: 'ServiceProvider' }
});

await neo4j.createRelationship(
  'contract-123',
  'party-a',
  'HAS_PARTY',
  { role: 'Contractor', obligations: ['Payment', 'Performance'] }
);

await neo4j.createRelationship(
  'contract-123',
  'party-b',
  'HAS_PARTY',
  { role: 'ServiceProvider', obligations: ['Delivery', 'Warranty'] }
);
```

**3. Query Optimization**
```typescript
// Use parameters to avoid injection and enable query plan caching
const result = await neo4j.run(
  'MATCH (d:Document) WHERE d.type = $type RETURN d LIMIT $limit',
  { type: 'contract', limit: 100 }
);

// Use indexes effectively
const optimizedQuery = `
  MATCH (d:Document)-[:MENTIONS]->(e:Entity)
  WHERE d.type = $docType AND e.type = $entityType
  USING INDEX d:Document(type)
  USING INDEX e:Entity(type)
  RETURN d, e
`;
```

### MinIO Object Storage Integration

#### MinIO Setup and Configuration

**1. Docker Setup**
```yaml
# docker-compose.yml
version: '3.8'
services:
  minio:
    image: minio/minio:latest
    container_name: legal-ai-minio
    environment:
      MINIO_ACCESS_KEY: legalaiadmin
      MINIO_SECRET_KEY: legalaiadmin123
      MINIO_REGION: us-east-1
    ports:
      - "9000:9000"   # API
      - "9001:9001"   # Console
    volumes:
      - minio_data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  minio_data:
```

**2. TypeScript Client Setup**
```typescript
// src/lib/storage/minio.ts
import * as Minio from 'minio';

export class MinIOClient {
  private client: Minio.Client;

  constructor(config: {
    endPoint: string;
    port: number;
    useSSL: boolean;
    accessKey: string;
    secretKey: string;
  }) {
    this.client = new Minio.Client(config);
  }

  async ensureBucket(bucketName: string): Promise<void> {
    const exists = await this.client.bucketExists(bucketName);
    if (!exists) {
      await this.client.makeBucket(bucketName, 'us-east-1');
      console.log(`Created bucket: ${bucketName}`);
    }
  }

  async uploadFile(
    bucketName: string,
    objectName: string,
    filePath: string,
    metaData: Record<string, string> = {}
  ): Promise<string> {
    const etag = await this.client.fPutObject(bucketName, objectName, filePath, metaData);
    return etag;
  }

  async uploadBuffer(
    bucketName: string,
    objectName: string,
    buffer: Buffer,
    metaData: Record<string, string> = {}
  ): Promise<string> {
    const etag = await this.client.putObject(bucketName, objectName, buffer, metaData);
    return etag;
  }

  async downloadFile(bucketName: string, objectName: string, filePath: string): Promise<void> {
    await this.client.fGetObject(bucketName, objectName, filePath);
  }

  async getFileStream(bucketName: string, objectName: string): Promise<NodeJS.ReadableStream> {
    return this.client.getObject(bucketName, objectName);
  }

  async deleteFile(bucketName: string, objectName: string): Promise<void> {
    await this.client.removeObject(bucketName, objectName);
  }

  async listFiles(bucketName: string, prefix?: string): Promise<Minio.BucketItem[]> {
    const stream = this.client.listObjectsV2(bucketName, prefix);
    return new Promise((resolve, reject) => {
      const objects: Minio.BucketItem[] = [];
      stream.on('data', (obj) => objects.push(obj));
      stream.on('end', () => resolve(objects));
      stream.on('error', reject);
    });
  }

  async getPresignedUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 24 * 60 * 60 // 24 hours
  ): Promise<string> {
    return this.client.presignedGetObject(bucketName, objectName, expiry);
  }

  async getPresignedPutUrl(
    bucketName: string,
    objectName: string,
    expiry: number = 60 * 60 // 1 hour
  ): Promise<string> {
    return this.client.presignedPutObject(bucketName, objectName, expiry);
  }
}
```

#### MinIO Best Practices

**1. Bucket Organization**
```typescript
// Organize buckets by document type and access level
const BUCKETS = {
  LEGAL_DOCUMENTS: 'legal-documents',
  CONTRACTS: 'contracts',
  EVIDENCE: 'evidence',
  TEMPORARY: 'temp-files',
  BACKUPS: 'backups'
} as const;

// Create structured object names
function createObjectName(documentId: string, version: number, fileName: string): string {
  return `documents/${documentId}/v${version}/${fileName}`;
}

// Usage
const objectName = createObjectName('contract-123', 1, 'nda.pdf');
// Result: "documents/contract-123/v1/nda.pdf"
```

**2. Document Versioning**
```typescript
class DocumentStorageService {
  constructor(private minio: MinIOClient) {}

  async storeDocumentVersion(
    documentId: string,
    version: number,
    file: Buffer,
    metadata: {
      contentType: string;
      originalName: string;
      uploadedBy: string;
      checksum: string;
    }
  ): Promise<string> {
    const bucket = BUCKETS.LEGAL_DOCUMENTS;
    const objectName = createObjectName(documentId, version, metadata.originalName);

    const objectMetadata = {
      'content-type': metadata.contentType,
      'x-amz-meta-uploaded-by': metadata.uploadedBy,
      'x-amz-meta-checksum': metadata.checksum,
      'x-amz-meta-version': version.toString(),
      'x-amz-meta-document-id': documentId
    };

    await this.minio.uploadBuffer(bucket, objectName, file, objectMetadata);
    return objectName;
  }

  async getDocumentVersions(documentId: string): Promise<Array<{
    version: number;
    objectName: string;
    uploadedAt: Date;
    size: number;
  }>> {
    const bucket = BUCKETS.LEGAL_DOCUMENTS;
    const prefix = `documents/${documentId}/`;

    const objects = await this.minio.listFiles(bucket, prefix);

    return objects
      .filter(obj => obj.name)
      .map(obj => ({
        version: parseInt(obj.name!.split('/')[2].substring(1)),
        objectName: obj.name!,
        uploadedAt: obj.lastModified,
        size: obj.size
      }))
      .sort((a, b) => b.version - a.version);
  }
}
```

**3. Security and Access Control**
```typescript
// Generate secure, time-limited access URLs
async function createSecureDocumentLink(
  documentId: string,
  version: number,
  fileName: string,
  userPermissions: string[]
): Promise<string> {
  // Check user permissions before generating URL
  if (!userPermissions.includes('document:read')) {
    throw new Error('Insufficient permissions');
  }

  const bucket = BUCKETS.LEGAL_DOCUMENTS;
  const objectName = createObjectName(documentId, version, fileName);

  // Generate presigned URL with short expiry
  return minio.getPresignedUrl(bucket, objectName, 15 * 60); // 15 minutes
}

// Audit logging for document access
async function logDocumentAccess(
  documentId: string,
  userId: string,
  action: 'view' | 'download' | 'upload',
  ipAddress: string
) {
  await auditLogger.log({
    timestamp: new Date(),
    documentId,
    userId,
    action,
    ipAddress,
    userAgent: navigator.userAgent
  });
}
```

### gRPC Integration & Web Search Capabilities

#### gRPC Setup for Web Applications

**1. Protocol Buffer Definitions**
```protobuf
// proto/legal_service.proto
syntax = "proto3";

package legal_service;

service LegalAnalysisService {
  rpc AnalyzeDocument(AnalyzeDocumentRequest) returns (AnalyzeDocumentResponse);
  rpc ExtractEntities(ExtractEntitiesRequest) returns (ExtractEntitiesResponse);
  rpc SearchLegalDocuments(SearchRequest) returns (SearchResponse);
  rpc StreamAnalysis(StreamAnalysisRequest) returns (stream AnalysisChunk);
}

message AnalyzeDocumentRequest {
  string document_id = 1;
  string content = 2;
  AnalysisType analysis_type = 3;
  map<string, string> metadata = 4;
}

message AnalyzeDocumentResponse {
  string document_id = 1;
  repeated Entity entities = 2;
  repeated Clause clauses = 3;
  RiskAssessment risk_assessment = 4;
  double confidence_score = 5;
}

message Entity {
  string id = 1;
  string name = 2;
  EntityType type = 3;
  map<string, string> properties = 4;
}

enum EntityType {
  PERSON = 0;
  ORGANIZATION = 1;
  CONTRACT = 2;
  DATE = 3;
  AMOUNT = 4;
}

message SearchRequest {
  string query = 1;
  repeated string document_types = 2;
  DateRange date_range = 3;
  int32 limit = 4;
  int32 offset = 5;
  repeated string entity_filters = 6;
}

message SearchResponse {
  repeated SearchResult results = 1;
  int32 total_count = 2;
  SearchMetadata metadata = 3;
}

message SearchResult {
  string document_id = 1;
  string title = 2;
  string excerpt = 3;
  double relevance_score = 4;
  repeated MatchedEntity matched_entities = 5;
  string document_type = 6;
  string created_at = 7;
}

enum AnalysisType {
  FULL_ANALYSIS = 0;
  ENTITY_EXTRACTION = 1;
  CLAUSE_ANALYSIS = 2;
  RISK_ASSESSMENT = 3;
}
```

**2. TypeScript gRPC Client Setup**
```typescript
// src/lib/grpc/legal-service.ts
import { grpc } from '@improbable-eng/grpc-web';
import { LegalAnalysisService } from '../proto/legal_service_pb';
import { AnalyzeDocumentRequest, SearchRequest } from '../proto/legal_service_pb';

export class LegalServiceClient {
  private client: LegalAnalysisService;

  constructor(endpoint: string = 'http://localhost:8080') {
    this.client = new LegalAnalysisService(endpoint, {
      transport: grpc.CrossBrowserHttpTransport({})
    });
  }

  async analyzeDocument(
    documentId: string,
    content: string,
    analysisType: 'FULL_ANALYSIS' | 'ENTITY_EXTRACTION' | 'CLAUSE_ANALYSIS' | 'RISK_ASSESSMENT' = 'FULL_ANALYSIS'
  ): Promise<any> {
    const request = new AnalyzeDocumentRequest();
    request.setDocumentId(documentId);
    request.setContent(content);
    request.setAnalysisType(this.mapAnalysisType(analysisType));

    return new Promise((resolve, reject) => {
      this.client.analyzeDocument(request, {}, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.convertResponse(response));
        }
      });
    });
  }

  async searchDocuments(
    query: string,
    options: {
      documentTypes?: string[];
      limit?: number;
      offset?: number;
      entityFilters?: string[];
    } = {}
  ): Promise<any> {
    const request = new SearchRequest();
    request.setQuery(query);

    if (options.documentTypes) {
      request.setDocumentTypesList(options.documentTypes);
    }

    if (options.limit) {
      request.setLimit(options.limit);
    }

    if (options.offset) {
      request.setOffset(options.offset);
    }

    if (options.entityFilters) {
      request.setEntityFiltersList(options.entityFilters);
    }

    return new Promise((resolve, reject) => {
      this.client.searchLegalDocuments(request, {}, (err, response) => {
        if (err) {
          reject(err);
        } else {
          resolve(this.convertSearchResponse(response));
        }
      });
    });
  }

  // Streaming analysis for large documents
  streamAnalysis(
    documentId: string,
    content: string,
    onChunk: (chunk: any) => void,
    onComplete: () => void,
    onError: (error: any) => void
  ) {
    const request = new StreamAnalysisRequest();
    request.setDocumentId(documentId);
    request.setContent(content);

    const stream = this.client.streamAnalysis(request, {});

    stream.on('data', (chunk) => {
      onChunk(this.convertAnalysisChunk(chunk));
    });

    stream.on('end', onComplete);
    stream.on('error', onError);

    return stream;
  }

  private mapAnalysisType(type: string): number {
    const types = {
      'FULL_ANALYSIS': 0,
      'ENTITY_EXTRACTION': 1,
      'CLAUSE_ANALYSIS': 2,
      'RISK_ASSESSMENT': 3
    };
    return types[type as keyof typeof types] || 0;
  }

  private convertResponse(response: any): any {
    return {
      documentId: response.getDocumentId(),
      entities: response.getEntitiesList().map(this.convertEntity),
      clauses: response.getClausesList().map(this.convertClause),
      riskAssessment: this.convertRiskAssessment(response.getRiskAssessment()),
      confidenceScore: response.getConfidenceScore()
    };
  }

  private convertEntity(entity: any): any {
    return {
      id: entity.getId(),
      name: entity.getName(),
      type: this.convertEntityType(entity.getType()),
      properties: entity.getPropertiesMap()
    };
  }

  private convertEntityType(type: number): string {
    const types = ['PERSON', 'ORGANIZATION', 'CONTRACT', 'DATE', 'AMOUNT'];
    return types[type] || 'UNKNOWN';
  }

  private convertSearchResponse(response: any): any {
    return {
      results: response.getResultsList().map(this.convertSearchResult),
      totalCount: response.getTotalCount(),
      metadata: this.convertSearchMetadata(response.getMetadata())
    };
  }

  private convertSearchResult(result: any): any {
    return {
      documentId: result.getDocumentId(),
      title: result.getTitle(),
      excerpt: result.getExcerpt(),
      relevanceScore: result.getRelevanceScore(),
      matchedEntities: result.getMatchedEntitiesList().map(this.convertMatchedEntity),
      documentType: result.getDocumentType(),
      createdAt: result.getCreatedAt()
    };
  }

  private convertAnalysisChunk(chunk: any): any {
    // Convert streaming analysis chunk
    return {
      chunkId: chunk.getChunkId(),
      entities: chunk.getEntitiesList().map(this.convertEntity),
      progress: chunk.getProgress(),
      isComplete: chunk.getIsComplete()
    };
  }
}
```

#### gRPC Best Practices for Web Applications

**1. Error Handling and Retries**
```typescript
class ResilientGrpcClient {
  private retryAttempts = 3;
  private retryDelay = 1000; // ms

  async executeWithRetry<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    let lastError: any;

    for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        console.warn(`${operationName} attempt ${attempt} failed:`, error);

        if (attempt < this.retryAttempts) {
          await new Promise(resolve => setTimeout(resolve, this.retryDelay * attempt));
        }
      }
    }

    throw new Error(`${operationName} failed after ${this.retryAttempts} attempts: ${lastError.message}`);
  }

  async analyzeDocument(documentId: string, content: string) {
    return this.executeWithRetry(
      () => this.client.analyzeDocument(documentId, content),
      'Document Analysis'
    );
  }
}
```

**2. Streaming and Progress Tracking**
```typescript
// Progress-aware document analysis
function analyzeLargeDocument(
  documentId: string,
  content: string,
  onProgress: (progress: number) => void
): Promise<any> {
  return new Promise((resolve, reject) => {
    const results: any[] = [];
    let totalProgress = 0;

    const stream = grpcClient.streamAnalysis(
      documentId,
      content,
      (chunk) => {
        results.push(chunk);
        totalProgress = Math.max(totalProgress, chunk.progress);
        onProgress(totalProgress);
      },
      () => {
        // Combine all chunks into final result
        const finalResult = results.reduce((acc, chunk) => ({
          ...acc,
          entities: [...(acc.entities || []), ...chunk.entities]
        }), {});
        resolve(finalResult);
      },
      (error) => {
        reject(error);
      }
    );

    // Add timeout
    setTimeout(() => {
      stream.cancel();
      reject(new Error('Analysis timeout'));
    }, 300000); // 5 minutes
  });
}
```

**3. Integration with Svelte Stores**
```typescript
// src/lib/stores/legal-analysis.ts
import { writable } from 'svelte/store';
import { LegalServiceClient } from '$lib/grpc/legal-service';

interface AnalysisState {
  isLoading: boolean;
  results: any | null;
  error: string | null;
  progress: number;
}

function createAnalysisStore() {
  const { subscribe, set, update } = writable<AnalysisState>({
    isLoading: false,
    results: null,
    error: null,
    progress: 0
  });

  const client = new LegalServiceClient();

  return {
    subscribe,
    analyzeDocument: async (documentId: string, content: string) => {
      update(state => ({ ...state, isLoading: true, error: null, progress: 0 }));

      try {
        const results = await analyzeLargeDocument(
          documentId,
          content,
          (progress) => {
            update(state => ({ ...state, progress }));
          }
        );

        set({
          isLoading: false,
          results,
          error: null,
          progress: 100
        });
      } catch (error) {
        set({
          isLoading: false,
          results: null,
          error: error.message,
          progress: 0
        });
      }
    },
    reset: () => set({
      isLoading: false,
      results: null,
      error: null,
      progress: 0
    })
  };
}

export const analysisStore = createAnalysisStore();
```

**4. Web Search Integration**
```typescript
// Advanced legal document search with gRPC
async function searchLegalDocuments(
  query: string,
  filters: {
    documentTypes?: string[];
    dateRange?: { start: Date; end: Date };
    jurisdictions?: string[];
    entityTypes?: string[];
  }
): Promise<SearchResult[]> {
  const searchRequest = {
    query,
    documentTypes: filters.documentTypes,
    dateRange: filters.dateRange ? {
      startDate: filters.dateRange.start.toISOString(),
      endDate: filters.dateRange.end.toISOString()
    } : undefined,
    entityFilters: filters.entityTypes,
    limit: 50
  };

  try {
    const response = await grpcClient.searchDocuments(query, searchRequest);

    // Enhance results with additional metadata
    return response.results.map(result => ({
      ...result,
      // Add relevance highlighting
      highlightedExcerpt: highlightSearchTerms(result.excerpt, query),
      // Add document preview URL
      previewUrl: generatePreviewUrl(result.documentId),
      // Add related documents
      relatedDocuments: await findRelatedDocuments(result.documentId)
    }));
  } catch (error) {
    console.error('Search failed:', error);
    throw new Error('Legal document search failed');
  }
}

// Fuzzy search with typo tolerance
async function fuzzySearch(query: string): Promise<SearchResult[]> {
  const variations = generateSearchVariations(query);

  const searchPromises = variations.map(variation =>
    searchLegalDocuments(variation, {}).catch(() => [])
  );

  const results = await Promise.all(searchPromises);
  const allResults = results.flat();

  // Remove duplicates and sort by relevance
  return deduplicateAndSortResults(allResults);
}
```

### Import Error Resolution Strategies

## Implementation Timeline

### Week 1: Foundation (Days 1-2)
- [ ] Environment setup and baseline assessment
- [ ] TypeScript configuration updates
- [ ] Priority file identification

### Week 2: Critical Fixes (Days 3-7)
- [ ] Fix high-priority startup blockers
- [ ] Resolve core component errors
- [ ] Implement essential API route types

### Week 3: Systematic Resolution (Days 8-12)
- [ ] Batch processing of remaining errors
- [ ] Generic type system implementation
- [ ] Utility type creation

### Week 4: Validation & Polish (Days 13-14)
- [ ] Comprehensive testing
- [ ] Documentation updates
- [ ] Quality assurance

## Success Metrics

- [ ] **Zero TypeScript Errors**: `npm run check` returns exit code 0
- [ ] **Successful Build**: `npm run build` completes without errors
- [ ] **Runtime Stability**: Application starts and functions correctly
- [ ] **Type Coverage**: >90% of codebase properly typed
- [ ] **Maintainability**: Clear type definitions and documentation

## Troubleshooting Common Issues

### Issue: Circular Import Dependencies
**Solution:** Restructure imports or use type-only imports
```typescript
// Use type-only imports to break circular dependencies
import type { TypeA } from './moduleA';
```

### Issue: Generic Type Inference Problems
**Solution:** Provide explicit type parameters
```typescript
// Instead of: const result = process(data);
// Use: const result = process<DataType>(data);
```

### Issue: Complex Union Types
**Solution:** Use discriminated unions with type guards
```typescript
type Action =
  | { type: 'CREATE'; payload: CreatePayload }
  | { type: 'UPDATE'; payload: UpdatePayload };

function handleAction(action: Action) {
  switch (action.type) {
    case 'CREATE': /* handle create */ break;
    case 'UPDATE': /* handle update */ break;
  }
}
```

## Tools and Resources

### Development Tools
- **TypeScript Compiler**: `npx tsc --noEmit`
- **ESLint**: `npx eslint src/`
- **Prettier**: `npx prettier --check src/`

### IDE Support
- **VS Code Extensions**: TypeScript Importer, Error Lens, TypeScript Hero
- **IntelliSense**: Leverage TypeScript language server

### Learning Resources
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Svelte TypeScript Guide](https://svelte.dev/docs/typescript)
- [Advanced TypeScript Patterns](https://github.com/microsoft/TypeScript/wiki/Advanced-Types)

## Risk Mitigation

### Backup Strategy
- Daily commits with descriptive messages
- Branch-based development for safe experimentation
- Ability to revert to last known good state

### Rollback Plan
- Maintain `main` branch stability
- Feature flags for risky type changes
- Incremental deployment strategy

## Getting Help

If you encounter issues during implementation:

1. **Check Existing Documentation**: Review this guide and related docs
2. **Community Support**: Post in GitHub Discussions or Discord
3. **TypeScript Experts**: Consult TypeScript documentation and forums
4. **Code Reviews**: Request review for complex type fixes

## Next Steps After Implementation

Once type fixes are complete:

1. **Enable Strict Mode**: Gradually enable all TypeScript strict checks
2. **Add Testing**: Implement type assertion tests
3. **Performance Optimization**: Leverage TypeScript for better performance
4. **Documentation**: Maintain up-to-date type documentation

---

**Implementation Start Date**: November 14, 2025
**Expected Completion**: 2 weeks
**Priority**: Critical - Blocks all development
**Owner**: Development Team

**Progress Tracking**: See `docs/type-fixes/progress.md` for daily updates.

---

# Advanced Svelte Concepts Reference

This section provides comprehensive coverage of advanced Svelte topics essential for modern development and migration. Understanding these concepts is crucial for effective TypeScript integration and component development.

## Runes (Svelte 5 Reactivity System)

### What are Runes?

Runes are Svelte's new reactivity system introduced in Svelte 5. They are special functions that start with `$` and control how Svelte compiles your components.

```typescript
// Basic state with $state
let count = $state(0);

// Derived values with $derived
let doubled = $derived(count * 2);

// Effects with $effect
$effect(() => {
  console.log('Count changed:', count);
});
```

### $state - Reactive State

```typescript
// Simple state
let count = $state(0);

// Object state (deeply reactive)
let user = $state({
  name: 'John',
  age: 30
});

// Array state
let items = $state([1, 2, 3]);

// Raw state (not deeply reactive)
let config = $state.raw({ setting: 'value' });
```

### $derived - Reactive Computations

```typescript
// Simple derived
let doubled = $derived(count * 2);

// Complex derived with function
let filteredItems = $derived.by(() => {
  return items.filter(item => item > 5);
});

// Conditional derived
let status = $derived(count > 10 ? 'high' : 'low');
```

### $effect - Side Effects

```typescript
// Basic effect
$effect(() => {
  document.title = `Count: ${count}`;
});

// Cleanup effect
$effect(() => {
  const timer = setInterval(() => {
    count++;
  }, 1000);

  return () => clearInterval(timer);
});

// Pre-effect (runs before DOM updates)
$effect.pre(() => {
  // Runs before DOM changes
});
```

### $props - Component Properties

```typescript
// Basic props
let { title, count } = $props<{ title: string; count: number }>();

// Optional props
let { title = 'Default', count } = $props<{
  title?: string;
  count: number;
}>();

// Rest props
let { class: className, ...rest } = $props<{
  class?: string;
  [key: string]: any;
}>();
```

### $bindable - Two-way Binding

```typescript
// Bindable prop
let { value = $bindable() } = $props<{
  value?: string;
}>();
```

## Template Syntax

### Control Flow

#### {#if} Blocks
```svelte
{#if condition}
  <p>Condition is true</p>
{:else if otherCondition}
  <p>Other condition is true</p>
{:else}
  <p>Neither condition is true</p>
{/if}
```

#### {#each} Blocks
```svelte
{#each items as item, index (item.id)}
  <li>{index + 1}: {item.name}</li>
{:else}
  <li>No items found</li>
{/each}
```

#### {#await} Blocks
```svelte
{#await promise}
  <p>Loading...</p>
{:then data}
  <p>Data: {data}</p>
{:catch error}
  <p>Error: {error.message}</p>
{/await}
```

#### {#key} Blocks
```svelte
{#key selectedId}
  <div transition:fade>{{selectedItem}}</div>
{/key}
```

### Snippets

```svelte
{#snippet card(title, content)}
  <div class="card">
    <h3>{title}</h3>
    <p>{content}</p>
  </div>
{/snippet}

{@render card('Hello', 'World')}
```

### Event Handlers

```svelte
<!-- Svelte 5: Direct event handlers -->
<button onclick={handleClick}>Click me</button>

<!-- Event modifiers -->
<button onclick|preventDefault|stopPropagation={handleSubmit}>
  Submit
</button>

<!-- Event with detail -->
<button onclick={handleCustom(new CustomEvent('custom', { detail: data }))}>
  Custom Event
</button>
```

### Bindings

```svelte
<!-- Value binding -->
<input bind:value={name} />

<!-- Checked binding -->
<input type="checkbox" bind:checked={agreed} />

<!-- Group binding -->
<input type="radio" bind:group={selected} value="option1" />

<!-- Two-way component binding -->
<CustomInput bind:value />
```

## Styling

### Scoped Styles

```svelte
<style>
  /* Scoped to component */
  .button {
    background: blue;
    color: white;
  }

  /* Global styles */
  :global(.external-class) {
    font-weight: bold;
  }

  /* Global block */
  :global {
    .global-button {
      border: 1px solid black;
    }
  }
</style>
```

### CSS Variables

```svelte
<script>
  let themeColor = $state('#ff3e00');
</script>

<style>
  .button {
    background: var(--theme-color, #ff3e00);
  }
</style>

<Button style="--theme-color: {themeColor}">
  Themed Button
</Button>
```

### Dynamic Classes

```svelte
<script>
  let isActive = $state(false);
  let size = $state('large');
</script>

<button
  class="button"
  class:active={isActive}
  class:{size}
>
  Button
</button>

<style>
  .button { /* base styles */ }
  .active { background: blue; }
  .large { font-size: 1.2em; }
</style>
```

## Special Elements

### <svelte:window>

```svelte
<svelte:window
  onkeydown={handleKeydown}
  bind:scrollY={scrollPosition}
/>
```

### <svelte:document>

```svelte
<svelte:document
  onvisibilitychange={handleVisibility}
  bind:activeElement
/>
```

### <svelte:body>

```svelte
<svelte:body
  onmouseenter={handleMouseEnter}
  onmouseleave={handleMouseLeave}
/>
```

### <svelte:head>

```svelte
<svelte:head>
  <title>{pageTitle}</title>
  <meta name="description" content={description} />
</svelte:head>
```

### <svelte:element>

```svelte
<script>
  let tag = $state('div');
</script>

<svelte:element this={tag} class="dynamic">
  Dynamic element
</svelte:element>
```

### <svelte:component>

```svelte
<script>
  let component = $state(Button);
</script>

<svelte:component this={component} prop={value} />
```

### <svelte:self>

```svelte
<!-- For recursive components -->
{#if items.length > 0}
  <ul>
    {#each items as item}
      <li>
        {item.name}
        <svelte:self items={item.children} />
      </li>
    {/each}
  </ul>
{/if}
```

### <svelte:fragment>

```svelte
<!-- Render multiple root elements -->
<svelte:fragment>
  <h1>Title</h1>
  <p>Content</p>
</svelte:fragment>
```

### <svelte:boundary>

```svelte
<svelte:boundary onerror={handleError}>
  <UnstableComponent />
  {#snippet failed(error, reset)}
    <button onclick={reset}>Try again</button>
  {/snippet}
</svelte:boundary>
```

## Runtime Features

### Stores

```typescript
import { writable, readable, derived } from 'svelte/store';

// Writable store
const count = writable(0);

// Readable store
const time = readable(new Date(), (set) => {
  const interval = setInterval(() => set(new Date()), 1000);
  return () => clearInterval(interval);
});

// Derived store
const doubled = derived(count, $count => $count * 2);

// Using stores in components
<script>
  import { count, doubled } from '$lib/stores';
</script>

<button onclick={() => $count++}>
  Count: {$count}, Doubled: {$doubled}
</button>
```

### Context

```typescript
// Set context
<script>
  import { setContext } from 'svelte';
  setContext('theme', { color: 'blue' });
</script>

// Get context
<script>
  import { getContext } from 'svelte';
  const theme = getContext('theme');
</script>
```

### Lifecycle Hooks

```typescript
import { onMount, onDestroy, tick } from 'svelte';

onMount(() => {
  console.log('Component mounted');

  return () => {
    console.log('Cleanup before unmount');
  };
});

onDestroy(() => {
  console.log('Component destroyed');
});

// Wait for DOM updates
await tick();
```

### Actions

```typescript
// Action function
function myAction(node: HTMLElement, params: any) {
  // Setup
  console.log('Action applied to', node);

  return {
    update(newParams) {
      // Handle parameter updates
    },
    destroy() {
      // Cleanup
    }
  };
}

// Using actions
<div use:myAction={{ param: 'value' }}></div>
```

### Transitions

```svelte
<script>
  import { fade, slide, scale } from 'svelte/transition';
  import { quintOut } from 'svelte/easing';
</script>

{#if visible}
  <div
    transition:fade={{ duration: 300 }}
    in:slide={{ duration: 500 }}
    out:scale={{ duration: 200, easing: quintOut }}
  >
    Content
  </div>
{/if}
```

### Animations

```svelte
<script>
  import { flip } from 'svelte/animate';
</script>

{#each items as item (item.id)}
  <div animate:flip={{ duration: 300 }}>
    {item.name}
  </div>
{/each}
```

## Migration Guides

### Svelte 4 to Svelte 5 Migration

#### Breaking Changes

1. **Event Handlers**: `on:click` → `onclick`
2. **Props**: `export let` → `$props()`
3. **Reactive Statements**: `$:` → `$derived()` and `$effect()`
4. **Component Events**: `createEventDispatcher` → callback props
5. **Slots**: Legacy slots → snippets

#### Migration Steps

```bash
# Install migration tool
npm install -g @sveltejs/migrate

# Run migration
npx @sveltejs/migrate svelte-5

# Manual fixes for complex cases
```

#### Common Migration Patterns

```typescript
// Before (Svelte 4)
<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let title: string;
  export let count = 0;

  const dispatch = createEventDispatcher();

  $: doubled = count * 2;

  function handleClick() {
    dispatch('change', { count });
  }
</script>

<button on:click={handleClick}>
  {title}: {count} ({doubled})
</button>

// After (Svelte 5)
<script lang="ts">
  let {
    title,
    count = 0,
    onchange
  } = $props<{
    title: string;
    count?: number;
    onchange?: (detail: { count: number }) => void;
  }>();

  let doubled = $derived(count * 2);

  function handleClick() {
    onchange?.({ count });
  }
</script>

<button onclick={handleClick}>
  {title}: {count} ({doubled})
</button>
```

### Bits-ui v1 to v2 Migration

#### Key Changes

1. **Props**: `el` → `ref`, `asChild` → `child` snippet
2. **Components**: Some component APIs simplified
3. **Events**: Updated event handling patterns

#### Migration Examples

```typescript
// Button component migration
// Before (v1)
<Button el={buttonRef} asChild on:click={handleClick}>
  <a href="/link">Link Button</a>
</Button>

// After (v2)
<Button ref={buttonRef} onclick={handleClick} child={{ el: 'a', href: '/link' }}>
  Link Button
</Button>

// Dialog migration
// Before (v1)
<Dialog.Root>
  <Dialog.Content>
    <Dialog.Title>Title</Dialog.Title>
    <Dialog.Description>Description</Dialog.Description>
  </Dialog.Content>
</Dialog.Root>

// After (v2)
<Dialog.Root>
  <Dialog.Portal>
    <Dialog.Content>
      <Dialog.Title>Title</Dialog.Title>
      <Dialog.Description>Description</Dialog.Description>
    </Dialog.Content>
  </Dialog.Portal>
</Dialog.Root>
```

### TypeScript Integration Best Practices

#### Component Typing

```typescript
// Component with typed props
<script lang="ts" generics="T extends { id: string }">
  let {
    items,
    selectedId,
    onSelect
  } = $props<{
    items: T[];
    selectedId?: string;
    onSelect?: (item: T) => void;
  }>();
</script>
```

#### Store Typing

```typescript
import { writable } from 'svelte/store';

interface User {
  id: string;
  name: string;
  email: string;
}

const userStore = writable<User | null>(null);
```

#### Event Handler Typing

```typescript
<script lang="ts">
  let { onChange } = $props<{
    onChange?: (value: string) => void;
  }>();

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement;
    onChange?.(target.value);
  }
</script>

<input oninput={handleInput} />
```

### Performance Optimization

#### Reactive Optimizations

```typescript
// Avoid unnecessary reactivity
let expensive = $derived.by(() => {
  // Only recalculate when needed
  return heavyComputation(input);
});

// Use $effect.tracking for debugging
$effect(() => {
  $inspect(count).with((type, value) => {
    if (type === 'update') {
      console.log('Count updated:', value);
    }
  });
});
```

#### Component Optimization

```typescript
// Use snippets for reusable markup
{#snippet itemTemplate(item)}
  <div class="item">
    <h3>{item.title}</h3>
    <p>{item.description}</p>
  </div>
{/snippet}

{#each items as item}
  {@render itemTemplate(item)}
{/each}
```

#### Bundle Optimization

```typescript
// Lazy load components
{#await import('./HeavyComponent.svelte') then { default: HeavyComponent }}
  <HeavyComponent />
{/await}
```

This comprehensive reference covers all advanced Svelte concepts necessary for modern development and successful migration. Use these patterns to ensure your codebase follows Svelte 5 best practices and maintains type safety throughout the migration process.