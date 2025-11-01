declare module: '../machines/sessionMachine' {
  export interface SessionContext {
    sessionHealth?: { isValid?: boolean } | null;
    [key: string]: unknown;
  }
  export const sessionMachine: any;
  export const sessionActions: Record<string, any> | undefined;
}
