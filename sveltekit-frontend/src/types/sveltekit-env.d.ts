// Minimal ambient types for SvelteKit virtual modules used during tsc checks
declare module '$env/dynamic/private' {
  const env: Record<string, string | undefined>;
  export { env };
}

declare module '$env/static/private' {
  const env: Record<string, string | undefined>;
  export { env };
}
