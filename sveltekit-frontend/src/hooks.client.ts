import type { HandleClientError } from "@sveltejs/kit";

/**
 * Minimal client-side error hook so the app can surface failures without
 * leaving the file empty or syntactically invalid.
 */
export const handleError: HandleClientError = ({ error, event }) => {
  console.error("Client error:", error, "event:", event);
  return {
    message: "A client-side error occurred.",
  };
};
