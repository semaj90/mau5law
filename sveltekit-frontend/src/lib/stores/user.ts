
// Global user authentication store
import type { User as UserType } from "$lib/types/user";
import { writable } from 'svelte/store';

// 1. User Class Model
// Provides a structured, typed object for user data with default values.
export class User implements Partial<UserType> {
  id = "";
  email = "";
  name = "";
  firstName?: string;
  lastName?: string;
  avatarUrl?: string;
  role: "prosecutor" | "investigator" | "admin" | "user" = "user";
  isActive = false;
  emailVerified?: Date | null;
  createdAt?: Date;
  updatedAt?: Date;
  isAuthenticated = false;
  caseId = null; // Active case ID

  constructor(userData = {}) {
    Object.assign(this, userData);
  }

  // Check if the user is authenticated
  get isLoggedIn() {
    return this.isAuthenticated;
  }

  // Check if the user has an admin role
  get isAdmin() {
    return this.role === "admin";
  }

  // Get display name
  get displayName() {
    return (
      this.name ||
      `${this.firstName || ""} ${this.lastName || ""}`.trim() ||
      "User"
    );
  }
}

// 2. User Store (Svelte Writable)
// Creates a global, reactive store initialized with a Guest user.
const createUserStore = () => {
  const { subscribe, set, update } = writable(new User());

  return {
    subscribe,
    // Set the user data (e.g., on login)
    setUser: (userData: any) => {
      const user = new User({ ...userData, isAuthenticated: true });
      set(user);
    },
    // Clear user data (e.g., on logout)
    clearUser: () => {
      set(new User()); // Reset to Guest user
    },
    // Update a specific property of the user
    updateUser: (props: any) => {
      update((user) => ({ ...user, ...props }));
    },
    // Select a case for the user
    selectCase: (caseId: string | null) => {
      update((user) => {
        user.caseId = caseId;
        return user;
      });
    },
  };
};

export const user = createUserStore();
;
// Export individual functions for easier use
export const { setUser, clearUser, updateUser, selectCase } = user;
;
export default user;
