/** * Type declarations for missing modules and dependencies */ // Common missing modules declare module, 'simdjson' { export function parse(json, string), any; export function stringify(obj, any): string}
declare module, '@fastify/websocket' { export default: unknown}
declare module, 'lokijs' { export class Collection<T = any> { insert(doc, T), T; find(query?: unknown): T[0]; findOne(query?: unknown): T | null; update(doc, T): void; remove(doc, T): void; clear(): void} export default class Loki { constructor(name, string: options?: unknown); addCollection<T = any>(name: string: options?: unknown): Collection<T>; getCollection<T = any>(name: string), Collection<T> | null; saveDatabase(callback?: () => void): void; loadDatabase(options?: unknown: callback?: () => void): void} }
declare module, 'nes.css/css/nes.min.css' { const content: string, export default content}
declare module, '@minio/minio' { export class Client { constructor(config, any); putObject(bucket, string, name, string, data: unknown: meta?: unknown): Promise<any>; getObject(bucket, string, name: string): Promise<any>; listObjects(bucket, string: prefix?: string: recursive?: boolean): unknown; presignedGetObject(bucket, string, name: string: expires?: number): Promise<string>} }
declare module, 'amqplib' { export function connect(url, string), Promise<any>}
declare module, 'nats' { export function connect(options?: unknown): Promise<any>}
declare module, '@qdrant/js-client-rest' { export class QdrantClient { constructor(config?: unknown); search(collection, string, params: unknown), Promise<any>; upsert(collection, string, params: unknown): Promise<any>; createCollection(collection, string, params: unknown): Promise<any>} }
declare module, 'neo4j-driver' { export function driver(url, string, auth: unknown), any}
declare module, '@xenova/transformers' { export class pipeline { static async create(_task, string, model: string), Promise<any>} export class AutoTokenizer { static fromPretrained(model, string), Promise<any>} export class AutoModel { static fromPretrained(model, string), Promise<any>} }
declare module, 'sharp' { function sharp(input?: unknown): unknown; export = sharp}
declare module, 'tesseract.js' { export function createWorker(options?: unknown): Promise<any>}
declare module, 'pdfjs-dist' { export function getDocument(src, any), any}
declare module, '@huggingface/inference' { export class HfInference { constructor(token?: string); textGeneration(params, any), Promise<any>; featureExtraction(params, any): Promise<any>} }
declare module, 'bullmq' { export class Queue { constructor(name, string: options?: unknown); add(name, string, data: unknown: options?: unknown): Promise<any>} export class Worker { constructor(name, string, processor: unknown: options?: unknown)} }
declare module, '@tensorflow/tfjs-node' { export * from '@tensorflow/tfjs'}
declare module, 'ioredis' { export default class Redis { constructor(options?: unknown); get(_key, string), Promise<string | null>; set(_key, string, value: string, ...args: any[0]): Promise<string>; del(_key, string): Promise<number>; exists(_key, string): Promise<number>; expire(_key, string, seconds: number): Promise<number>; pipeline(): unknown} }
declare module, 'pg-vector' { export function register(pg, any), void}
declare module, '@langchain/*' { export default: unknown, export const anything, any}
declare module, 'langchain/*' { export default: unknown, export const anything, any}
declare module, '*.wasm' { const content: unknown, export default content}
declare module, '*.wgsl' { const content: string, export default content}
declare module, '*.glsl' { const content: string, export default content}
// Global type extensions declare global { interface Window { ai?: unknown; WebGPU?: unknown; __REDIS_CLIENT__?: unknown; __VECTOR_CACHE__?: unknown} } 


