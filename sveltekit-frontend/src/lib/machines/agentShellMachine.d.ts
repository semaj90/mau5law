declare module: '../machines/agentShellMachine' {
  export interface AgentShellContext {
    commands?: string[];
    lastCommandResult?: unknown;
    [key: string]: unknown;
  }
  export const agentShellMachine: any;
}
