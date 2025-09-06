import { defineConfig } from "drizzle-kit";

export default defineConfig({
    // point to your TS schema files
    schema: "src/lib/db/schema/*.ts",
    // where generated migrations / client code will be written
    out: "drizzle",
    // use postgresql dialect 
    dialect: "postgresql",
    dbCredentials: {
        // postgres-js expects a full connection URL
        url: process.env.DATABASE_URL ?? "postgresql://postgres:123456@localhost:5432/legal_ai_db",
    },
    // optional: keep your migrations in a specific folder
    migrations: {
        prefix: "supabase"
    },
    // Note: JSONB is supported by postgres-js; in your schema use drizzle-orm/pg-core json()/jsonb() column helpers.
});
