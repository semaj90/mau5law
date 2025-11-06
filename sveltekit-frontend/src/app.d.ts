// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
declare global {
  namespace App {
    interface Error {
      // Add custom error properties here if needed
    }
    interface Locals {
      user: { id: string } | null; // Define the user object structure
    }
    interface PageData {
      // Add custom page data properties here if needed
    }
    interface Platform {
      // Add custom platform properties here if needed
    }
  }
}

export {};
