import {
  pgTable,
  text,
  timestamp,
  uuid,
  boolean,
  jsonb,
  index,
  relations
} from "drizzle-orm/pg-core";

// Authentication tables for Lucia + legal AI platform
export const authUsers = pgTable(
  "auth_users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: text("email").notNull().unique(),
    firstName: text("first_name").notNull(),
    lastName: text("last_name").notNull(),
    passwordHash: text("password_hash").notNull(),
    
    // Legal AI specific fields
    role: text("role").notNull().default("prosecutor"), // prosecutor, investigator, admin, analyst
    department: text("department"),
    permissions: jsonb("permissions").default([]),
    badgeNumber: text("badge_number"),
    jurisdiction: text("jurisdiction"),
    
    // Security
    isActive: boolean("is_active").default(true),
    isVerified: boolean("is_verified").default(false),
    twoFactorEnabled: boolean("two_factor_enabled").default(false),
    twoFactorSecret: text("two_factor_secret"),
    
    // Tracking
    lastLoginAt: timestamp("last_login_at"),
    lastLoginIp: text("last_login_ip"),
    loginAttempts: jsonb("login_attempts").default([]),
    
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull()
  },
  (table) => ({
    emailIdx: index("auth_users_email_idx").on(table.email),
    roleIdx: index("auth_users_role_idx").on(table.role),
    departmentIdx: index("auth_users_department_idx").on(table.department),
    isActiveIdx: index("auth_users_active_idx").on(table.isActive)
  })
);

export const authKeys = pgTable(
  "auth_keys",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    hashedPassword: text("hashed_password")
  },
  (table) => ({
    userIdIdx: index("auth_keys_user_id_idx").on(table.userId)
  })
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    activeExpires: timestamp("active_expires").notNull(),
    idleExpires: timestamp("idle_expires").notNull(),
    
    // Enhanced session tracking
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    deviceInfo: jsonb("device_info").default({}),
    sessionData: jsonb("session_data").default({}),
    
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("auth_sessions_user_id_idx").on(table.userId),
    activeExpiresIdx: index("auth_sessions_active_expires_idx").on(table.activeExpires)
  })
);

export const authPasswordResets = pgTable(
  "auth_password_resets",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => authUsers.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    used: boolean("used").default(false),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("auth_password_resets_user_id_idx").on(table.userId),
    tokenIdx: index("auth_password_resets_token_idx").on(table.token)
  })
);

export const authAuditLog = pgTable(
  "auth_audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => authUsers.id),
    action: text("action").notNull(), // login, logout, register, password_change, permission_change
    details: jsonb("details").default({}),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    success: boolean("success").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull()
  },
  (table) => ({
    userIdIdx: index("auth_audit_log_user_id_idx").on(table.userId),
    actionIdx: index("auth_audit_log_action_idx").on(table.action),
    createdAtIdx: index("auth_audit_log_created_at_idx").on(table.createdAt)
  })
);

// Relations
export const authUsersRelations = relations(authUsers, ({ many }) => ({
  keys: many(authKeys),
  sessions: many(authSessions),
  passwordResets: many(authPasswordResets),
  auditLogs: many(authAuditLog)
}));

export const authKeysRelations = relations(authKeys, ({ one }) => ({
  user: one(authUsers, {
    fields: [authKeys.userId],
    references: [authUsers.id]
  })
}));

export const authSessionsRelations = relations(authSessions, ({ one }) => ({
  user: one(authUsers, {
    fields: [authSessions.userId],
    references: [authUsers.id]
  })
}));

// TypeScript types
export type AuthUser = typeof authUsers.$inferSelect;
export type AuthKey = typeof authKeys.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type AuthPasswordReset = typeof authPasswordResets.$inferSelect;
export type AuthAuditLog = typeof authAuditLog.$inferSelect;

export type NewAuthUser = typeof authUsers.$inferInsert;
export type NewAuthKey = typeof authKeys.$inferInsert;
export type NewAuthSession = typeof authSessions.$inferInsert;
export type NewAuthPasswordReset = typeof authPasswordResets.$inferInsert;
export type NewAuthAuditLog = typeof authAuditLog.$inferInsert;