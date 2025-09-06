// @ts-nocheck
import { users } from "$lib/server/db/schema-postgres";
import { eq } from "drizzle-orm";
import { db } from "./index";

export interface User {
  id: string;
  email: string;
  name: string | null;
  firstName: string | null;
  lastName: string | null;
  role: string;
  isActive: boolean;
  avatarUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
}
export async function getUserById(id: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user by ID:", error);
    return null;
  }
}
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const result = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);
    return result[0] || null;
  } catch (error) {
    console.error("Error fetching user by email:", error);
    return null;
  }
}
export async function createUser(userData: {
  email: string;
  hashedPassword: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
}): Promise<User | null> {
  try {
    const result = await db
      .insert(users)
      .values({
        email: userData.email,
        hashedPassword: userData.hashedPassword,
        name: userData.name,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || "prosecutor",
      })
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error creating user:", error);
    return null;
  }
}
export async function updateUser(
  id: string,
  updates: Partial<User>,
): Promise<User | null> {
  try {
    const result = await db
      .update(users)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(users.id, id))
      .returning();

    return result[0] || null;
  } catch (error) {
    console.error("Error updating user:", error);
    return null;
  }
}
