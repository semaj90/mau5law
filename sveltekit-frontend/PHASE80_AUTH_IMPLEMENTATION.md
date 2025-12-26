# Phase 80 Auth Implementation (Svelte 5 + SSR caching baseline)

## What exists now
### 1) SSR caching + session-aware headers
File: `src/routes/+layout.server.ts`

- Uses `setHeaders()` to set caching policy.
- Differentiates authenticated vs public:
  - Authenticated: `Cache-Control: no-store`
  - Public: conservative cache (example: `max-age=600`)
- Returns `user` and `session` from the server load so the UI can hydrate safely.

> This is the correct place to apply SSR cache policy (not `hooks.server.ts`).

### 2) Client UI auth state (Svelte 5 runes)
File: `src/lib/auth/auth-session.svelte.ts`

Goal: UI-friendly auth state using Svelte 5 runes.
- `$state` for `user` and `loaded`
- `$derived` for `isAuthenticated`

Dev-only fallback:
- Optional `localStorage` persistence for *UI testing only*
- Never treat `localStorage` as real auth

## Lucia v3 integration plan (server-truth auth)
Target: Persist sessions in Postgres (`legal_ai_db`, Postgres 17 container)

### Server responsibilities
1) Initialize Lucia with a Postgres/Drizzle adapter
2) Validate session cookie on each request
3) Put `user/session` onto `event.locals`
4) Expose an endpoint like `/api/auth/session` (optional) for client refresh/hydration

### Client responsibilities
- Use the rune store for UI state only.
- On app boot (or route load), hydrate user state from SSR load data or `/api/auth/session`.

## Security defaults for a legal app
- Authenticated pages: `Cache-Control: no-store`
- Public docs/static pages: explicit `Cache-Control` (short max-age + revalidate)
- Never cache responses that include PII/session-specific case data.

## Next improvements (after error count stabilizes)
- Add Lucia tables/migrations (users + sessions)
- Add sign-in/out endpoints
- Add CSRF protection for state-changing actions
- Add audit logging for auth events into `legal_ai_db`
