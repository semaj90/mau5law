// Minimal Lucia-compatible schema following exact requirements
import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

// Users table - minimal for Lucia
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  hashed_password: varchar("hashed_password", { length: 255 }),
});

// Sessions table - exactly as Lucia expects
export const sessions = pgTable("sessions", {
  id: varchar("id", { length: 255 }).primaryKey(),
  user_id: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires_at: timestamp("expires_at", {
    withTimezone: true,
    mode: "date"
  }).notNull(),
});