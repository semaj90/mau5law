#!/usr/bin/env node
import { spawn } from "child_process";
import os from "os";

const env = { ...process.env };

// Fix the DATABASE_URL for authentication system
env.DATABASE_URL = "postgresql://postgres:123456@localhost:5432/legal_ai_db";
env.VITE_DATABASE_URL = "postgresql://postgres:123456@localhost:5432/legal_ai_db";
env.DEV_DATABASE_URL = "postgresql://postgres:123456@localhost:5432/legal_ai_db";

// Redis configuration
env.REDIS_URL = "redis://localhost:6379";
env.REDIS_HOST = "localhost";
env.REDIS_PORT = "6379";

// Other environment variables
env.NODE_ENV = "development";
env.POSTGRES_HOST = "localhost";
env.POSTGRES_PORT = "5432";
env.POSTGRES_DB = "legal_ai_db";
env.POSTGRES_USER = "postgres";
env.POSTGRES_PASSWORD = "123456";

// Pick the right command for npm scripts
const isWin = os.platform() === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

console.log("🚀 Starting SvelteKit with proper environment:");
console.log("  DATABASE_URL =", env.DATABASE_URL);
console.log("  REDIS_URL =", env.REDIS_URL);
console.log("  NODE_ENV =", env.NODE_ENV);

const child = spawn(npmCmd, ["run", "dev"], {
  stdio: "inherit",
  env,
});

child.on("exit", (code) => {
  console.log(`⚡ Dev server exited with code ${code}`);
});