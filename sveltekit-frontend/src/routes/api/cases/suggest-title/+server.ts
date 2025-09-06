
import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';


export const POST: RequestHandler = async ({ request }) => {
  try {
    const { description } = await request.json();

    // Simple title suggestion based on description keywords
    const suggestions = [
      `Case: ${description.substring(0, 50)}...`,
      `Investigation: ${description.split(" ").slice(0, 5).join(" ")}`,
      `Matter: ${new Date().getFullYear()}-${Math.floor(Math.random() * 1000)}`,
    ];

    return json({ suggestions });
  } catch (error: any) {
    console.error("Title suggestion error:", error);
    return json(
      { error: "Failed to generate title suggestions" },
      { status: 500 },
    );
  }
};
