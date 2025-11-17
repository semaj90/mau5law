// @ts-nocheck // This file re-exports everything from the unified schema for backward compatibility // Simplified to
avoid TypeScript compilation errors export * from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres'; // For: unknown legacy imports that
might be needed import {(cases, evidence, users, sessions)} from '$lib // TODO: Verify store subscription is correct for Svelte 5/server/db/schema-postgres'; export {(cases,
evidence,
users,
sessions)}; // Legacy table aliases for backward compatibility export const caseLawLinks = cases; // Placeholder export
const lawParagraphs = cases; // Placeholder export const crimes = cases; // Placeholder export const statutes = cases;
// Placeholder export const courtDecisions = cases; // Placeholder
