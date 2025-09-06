
import type { RequestHandler } from './$types';

// Cloud AI health check endpoint for fallback AI services
import { json } from "@sveltejs/kit";

export const GET: RequestHandler = async () => {
  try {
    // Check if cloud AI service is available
    let aiService: any = null;

    try {
      const aiServiceModule = await import(
        "../../../../../lib/services/ai-service.js"
      );
      aiService = aiServiceModule.aiService || aiServiceModule.default;
    } catch (error: any) {
      return json({
        success: false,
        available: false,
        error: "Cloud AI service not available",
      });
    }
    if (!aiService || typeof aiService.generateResponse !== "function") {
      return json({
        success: false,
        available: false,
        error: "Cloud AI service not properly configured",
      });
    }
    // Try a simple test request
    try {
      const testResponse = await aiService.generateResponse("Hello", {
        provider: "auto",
        temperature: 0.1,
        maxTokens: 10,
      });

      return json({
        success: true,
        available: true,
        model: "cloud-llm",
        testResponse:
          typeof testResponse === "string"
            ? testResponse.substring(0, 50)
            : "Cloud AI responded successfully",
        lastCheck: new Date().toISOString(),
      });
    } catch (testError) {
      console.error("Cloud AI test failed:", testError);
      return json({
        success: false,
        available: false,
        error:
          "Cloud AI test failed: " +
          (testError instanceof Error ? testError.message : "Unknown error"),
      });
    }
  } catch (error: any) {
    console.error("Cloud AI health check failed:", error);
    return json(
      {
        success: false,
        available: false,
        error: error instanceof Error ? error.message : "Health check failed",
      },
      { status: 500 },
    );
  }
};
