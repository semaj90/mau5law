
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';


export const GET: RequestHandler = async () => {
  try {
    // Mock recent cases data - replace with actual database query
    const recentCases = [
      {
        id: "1",
        title: "Robbery Investigation",
        status: "active",
        priority: "high",
        createdAt: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
        lastActivity: new Date(Date.now() - 3600000).toISOString(), // 1 hour ago
      },
      {
        id: "2",
        title: "Fraud Case Review",
        status: "pending",
        priority: "medium",
        createdAt: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        lastActivity: new Date(Date.now() - 7200000).toISOString(), // 2 hours ago
      },
      {
        id: "3",
        title: "Assault Investigation",
        status: "closed",
        priority: "low",
        createdAt: new Date(Date.now() - 604800000).toISOString(), // 1 week ago
        lastActivity: new Date(Date.now() - 86400000).toISOString(), // 1 day ago
      },
    ];

    return json(recentCases);
  } catch (error: any) {
    console.error("Error fetching recent cases:", error);
    return json({ error: "Failed to fetch recent cases" }, { status: 500 });
  }
};
