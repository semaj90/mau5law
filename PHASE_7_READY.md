# Phase 7: Client-Side Integration - Ready to Start

## Phase 6 Complete ✅

Server-side data loading and enrichment is fully implemented. Routes are now enriched with:
- Error counts (errors, warnings, info)
- Health status (healthy, flaky, broken)
- Last error timestamp and message
- Suggestion counts (placeholder)

## What Phase 7 Will Do

Phase 7 implements client-side interaction logging. The all-routes page will track user interactions and send them to the database.

## Interaction Types to Log

1. **view** - When a route modal opens
2. **navigate** - When "Visit Page" button is clicked
3. **analyze** - When error brain analysis starts
4. **patch_apply** - When a patch is applied

## API Endpoint

All interactions POST to: `/api/routes/:routeId/interactions`

Request body:
```typescript
{
  interaction_type: 'view' | 'navigate' | 'analyze' | 'patch_apply',
  user_id?: string,
  metadata?: Record<string, any>
}
```

## Files to Modify

- `sveltekit-frontend/src/routes/(app)/all-routes/+page.svelte` - Add interaction logging

## Implementation Steps

1. Create `logInteraction()` helper function
2. Add interaction logging to route modal open
3. Add interaction logging to "Visit Page" button
4. Add interaction logging to error brain analysis
5. Add interaction logging to patch application
6. Write unit tests for logging functions
7. Write property tests for interaction logging

## Expected Effort

- Implementation: 4-6 hours
- Testing: 2-3 hours
- Total: 6-9 hours

## Success Criteria

- All interactions are logged to database
- Logging doesn't block UI
- Errors in logging don't break page
- Interaction history is retrievable via API
- Tests pass with 100% coverage

## Ready to Begin

Phase 6 is complete and all dependencies are in place. Phase 7 can begin immediately.

Next: Execute Phase 7 tasks
