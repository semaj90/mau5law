import { cases, helpers } from "$lib/server/db";
import type { LayoutServerLoad } from './$types.js';

// This runs for /cases and all its sub-pages
// Perfect for loading persistent 3-column layout data
export const load: LayoutServerLoad = async ({ locals, url }) => {
  // Temporarily bypass authentication for SuperForms testing
  const user = locals.user || {
    id: 'test-user-id',
    role: 'user' as const,
    email: 'test@example.com'
  };

  // REMOVED: Authentication redirect for testing
  // if (!user?.id) {
  //   throw redirect(303, "/login");
  // }

  // Get search/filter parameters
  const searchQuery = url.searchParams.get("search") || "";
  const statusFilter = url.searchParams.get("status") || "all";
  const priorityFilter = url.searchParams.get("priority") || "all";
  const sortBy = url.searchParams.get("sort") || "createdAt";
  const sortOrder = url.searchParams.get("order") || "desc";

  // Build where conditions - now we know user.id is valid
  const whereConditions: unknown[] = [];

  if (searchQuery) {
    if (helpers.like && helpers.or) {
      whereConditions.push(
        helpers.or(
          helpers.like((cases as any).title, `%${searchQuery}%`),
          helpers.like((cases as any).description, `%${searchQuery}%`)
        )
      );
    }
  }
  if (statusFilter !== "all") {
    if (helpers.eq) whereConditions.push(helpers.eq((cases as any).status, statusFilter));
  }
  if (priorityFilter !== "all") {
    if (helpers.eq) whereConditions.push(helpers.eq((cases as any).priority, priorityFilter));
  }

  // Safely determine sort column
  // Keep mock data; real query wiring to be restored later

  // Temporarily disabled database queries for SuperForms testing
  let userCases = [];
  let caseStats = [];

  // Mock data for testing purposes
  userCases = [
    {
      id: 'case-1',
      title: 'Test Case 1',
      status: 'open',
      priority: 'high',
      createdAt: new Date(),
      description: 'Test case for SuperForms',
      metadata: {}
    }
  ];

  caseStats = [
    { status: 'open', count: 1 },
    { status: 'closed', count: 0 }
  ];

  // DISABLED: Database queries for testing
  // try {
  //   userCases = await db.select(...).from(cases)...
  //   caseStats = await db.select(...).from(cases)...
  // } catch (error: any) {
  //   console.error("Database query failed:", error);
  //   userCases = [];
  //   caseStats = [];
  // }

  return {
    userCases,
    caseStats,
    searchQuery,
    statusFilter,
    priorityFilter,
    sortBy,
    sortOrder,
    user,
  };
};
