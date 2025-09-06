import { writeFile } from "fs/promises";
import path from "path";

// Simple analytics logger for API endpoints
// In production, replace with a real analytics/event system

const LOG_PATH = path.resolve(process.cwd(), "analytics-log.jsonl");

export async function json(event: any): Promise<any> {
  try {
    const line = JSON.stringify(event) + "\n";
    await writeFile(LOG_PATH, line, { flag: "a" });
  } catch (err: any) {
    // Fallback: log to console
    console.error("Analytics log error:", err);
  }
}
