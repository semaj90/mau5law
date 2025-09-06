import { json } from "@sveltejs/kit";
import type { RequestHandler } from './$types';


const GO_MICROSERVICE_URL = "http://localhost:8080";

export const POST: RequestHandler = async ({ request }) => {
  try {
    const documentRequest = await request.json();

    const response = await fetch(`${GO_MICROSERVICE_URL}/api/process`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(documentRequest),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return json(result);
  } catch (error: any) {
    console.error("Document processing failed:", error);
    return json(
      {
        success: false,
        message: `Processing failed: ${error.message}`,
        error: error.message,
      },
      { status: 500 }
    );
  }
};
