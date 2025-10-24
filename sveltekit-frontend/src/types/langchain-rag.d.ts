declare module '$lib/ai/langchain-rag' {
  // runtime module may export a factory, default factory, named vectorStore, etc.
  export function getVectorStore?(): Promise<any> | any;
  export function createVectorStore?(): Promise<any> | any;
  const _default: any;
  export default _default;
  export const vectorStore: any;
  // allow additional exports
  export const __esModule: boolean;
  export const [key: string]: any;
}
