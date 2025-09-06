import { writable } from "svelte/store";
import { browser } from "$app/environment";

export interface AvatarState {
  url: string | null;
  isUploading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

const initialState: AvatarState = {
  url: null,
  isUploading: false,
  error: null,
  lastUpdated: null,
};

function createAvatarStore() {
  const { subscribe, set, update } = writable<AvatarState>(initialState);

  return {
    subscribe,

    // Load avatar from local storage and API with SSR support
    loadAvatar: async () => {
      if (!browser) return;

      // Try local storage first for instant loading (cache check)
      const cachedAvatar = localStorage.getItem("user_avatar_url");
      const cachedTimestamp = localStorage.getItem("user_avatar_timestamp");
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes

      // Use cached avatar if it's recent
      if (cachedAvatar && cachedTimestamp) {
        const timestamp = parseInt(cachedTimestamp);
        if (Date.now() - timestamp < cacheExpiry) {
          update((state) => ({
            ...state,
            url: cachedAvatar,
            lastUpdated: timestamp,
          }));
        }
      }

      // Always fetch from API for up-to-date data
      try {
        const response = await fetch("/api/user/profile", {
          credentials: "include", // Important for SSR session handling
          headers: {
            Accept: "application/json",
          },
        });

        if (response.ok) {
          const data = await response.json();
          const avatarUrl =
            data.user?.avatarUrl || "/images/default-avatar.svg";
          const now = Date.now();

          // Update store and cache
          update((state) => ({
            ...state,
            url: avatarUrl,
            error: null,
            lastUpdated: now,
          }));

          // Update local storage with timestamp
          localStorage.setItem("user_avatar_url", avatarUrl);
          localStorage.setItem("user_avatar_timestamp", now.toString());
        } else if (response.status === 401) {
          // User not authenticated - clear cache
          localStorage.removeItem("user_avatar_url");
          localStorage.removeItem("user_avatar_timestamp");
          update((state) => ({
            ...state,
            url: "/images/default-avatar.svg",
            error: null,
          }));
        }
      } catch (error: any) {
        console.error("Failed to load avatar:", error);
        // Only show error if we don't have a cached avatar
        update((state) => ({
          ...state,
          error: !state.url ? "Failed to load avatar" : null,
        }));
      }
    },

    // Upload new avatar with progress tracking
    uploadAvatar: async (file: File) => {
      if (!browser) {
        return { success: false, error: "Upload not available on server" };
      }

      // Validate file before upload
      const validation = validateFile(file);
      if (!validation.valid) {
        update((state) => ({ ...state, error: validation.error }));
        return { success: false, error: validation.error };
      }

      update((state) => ({ ...state, isUploading: true, error: null }));

      try {
        const formData = new FormData();
        formData.append("avatar", file);

        const response = await fetch("/api/user/avatar/upload", {
          method: "POST",
          body: formData,
          credentials: "include", // Important for session handling
        });

        const data = await response.json();

        if (response.ok) {
          const newAvatarUrl = data.avatarUrl;
          const now = Date.now();

          update((state) => ({
            ...state,
            url: newAvatarUrl,
            isUploading: false,
            error: null,
            lastUpdated: now,
          }));

          // Update local storage with timestamp
          localStorage.setItem("user_avatar_url", newAvatarUrl);
          localStorage.setItem("user_avatar_timestamp", now.toString());

          return { success: true, url: newAvatarUrl };
        } else {
          throw new Error(data.error || "Upload failed");
        }
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : "Upload failed";
        update((state) => ({
          ...state,
          isUploading: false,
          error: errorMessage,
        }));
        return { success: false, error: errorMessage };
      }
    },

    // Remove avatar
    removeAvatar: async () => {
      if (!browser) {
        return { success: false, error: "Remove not available on server" };
      }

      try {
        const response = await fetch("/api/user/avatar/upload", {
          method: "DELETE",
          credentials: "include",
        });

        if (response.ok) {
          const defaultAvatar = "/images/default-avatar.svg";
          const now = Date.now();

          update((state) => ({
            ...state,
            url: defaultAvatar,
            error: null,
            lastUpdated: now,
          }));

          // Update local storage
          localStorage.setItem("user_avatar_url", defaultAvatar);
          localStorage.setItem("user_avatar_timestamp", now.toString());

          return { success: true };
        } else {
          throw new Error("Failed to remove avatar");
        }
      } catch (error: any) {
        const errorMessage =
          error instanceof Error ? error.message : "Removal failed";
        update((state) => ({ ...state, error: errorMessage }));
        return { success: false, error: errorMessage };
      }
    },

    // Preload avatar for given user (useful for SSR)
    preloadAvatar: (avatarUrl: string | null) => {
      if (!browser) return;

      const url = avatarUrl || "/images/default-avatar.svg";
      update((state) => ({
        ...state,
        url,
        lastUpdated: Date.now(),
      }));

      // Cache the preloaded avatar
      localStorage.setItem("user_avatar_url", url);
      localStorage.setItem("user_avatar_timestamp", Date.now().toString());
    },

    // Clear error
    clearError: () => {
      update((state) => ({ ...state, error: null }));
    },

    // Reset store
    reset: () => {
      set(initialState);
      if (browser) {
        localStorage.removeItem("user_avatar_url");
        localStorage.removeItem("user_avatar_timestamp");
      }
    },

    // Force refresh from server
    refresh: async () => {
      if (!browser) return;

      // Clear cache first
      localStorage.removeItem("user_avatar_url");
      localStorage.removeItem("user_avatar_timestamp");

      // Then reload
      await createAvatarStore().loadAvatar();
    },
  };
}

// File validation helper
function validateFile(file: File): { valid: boolean; error?: string } {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/svg+xml",
    "image/webp",
  ];

  const maxSize = 5 * 1024 * 1024; // 5MB

  if (!allowedTypes.includes(file.type)) {
    return {
      valid: false,
      error: "Invalid file type. Please use JPEG, PNG, GIF, SVG, or WebP.",
    };
  }

  if (file.size > maxSize) {
    return {
      valid: false,
      error: "File too large. Maximum size is 5MB.",
    };
  }

  if (file.size === 0) {
    return {
      valid: false,
      error: "File is empty. Please select a valid image.",
    };
  }

  return { valid: true };
}

export const avatarStore = createAvatarStore();