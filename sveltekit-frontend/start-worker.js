#!/usr/bin/env node
import { spawn } from "child_process";
import os from "os";

const env = { ...process.env };

// ✅ Prefer DATABASE_URL from env, fallback to legal_admin user
env.DATABASE_URL =
  env.DATABASE_URL ||
  "postgresql://legal_admin:123456@localhost:5432/legal_ai_db";

// Redis fallback
env.REDIS_URL = env.REDIS_URL || "redis://127.0.0.1:6379";

const isWin = os.platform() === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("🚀 Starting embedding worker with env:");
console.log("  DATABASE_URL =", env.DATABASE_URL);
console.log("  REDIS_URL    =", env.REDIS_URL);

const child = spawn(npmCmd, ["run", "worker:embeddings"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  console.log(`⚡ Worker exited with code ${code}`);
});