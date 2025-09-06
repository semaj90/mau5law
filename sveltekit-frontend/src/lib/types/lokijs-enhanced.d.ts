/**
 * Loki.js Enhanced Type Definitions
 * Fixes missing methods and type arguments for Loki.js integration
 */

declare module 'lokijs' {
  interface LokiOptions {
    filename?: string;
    autoload?: boolean;
    autoloadCallback?: ((err?: Error) => void);
    autosave?: boolean;
    autosaveInterval?: number;
    adapter?: LokiPersistenceAdapter;
    verbose?: boolean;
    env?: 'NODEJS' | 'BROWSER' | 'CORDOVA';
    throttledSaves?: boolean;
    serializationMethod?: 'normal' | 'pretty' | 'destructured';
  }

  interface Collection<T = any> {
    name: string;
    data: T[];
    idIndex: number[];
    binaryIndices: Record<string, any>;
    objType: string;
    dirty: boolean;
    cachedIndex?: number[];
    cachedBinaryIndex?: Record<string, any>;
    cachedData?: T[];
    adaptiveBinaryIndices: boolean;
    transactional: boolean;
    asyncListeners: boolean;
    constraints: {
      unique: Record<string, any>;
    };
    uniqueNames: string[];
    transforms: Record<string, any>;
    ttl: {
      age?: number;
      ttlInterval?: number;
      daemon?: any;
    };

    // Enhanced methods with proper typing
    insert(doc: T): T;
    insert(docs: T[]): T[];
    
    find(): T[];
    find(query: Partial<T>): T[];
    find(query: any): T[];
    
    findOne(): T | null;
    findOne(query: Partial<T>): T | null;
    findOne(query: any): T | null;
    
    findOneAndUpdate(query: any, updateFunction: (doc: T) => T): T | null;
    
    update(doc: T): T;
    update(docs: T[]): T[];
    
    remove(doc: T): T[];
    remove(docs: T[]): T[];
    removeWhere(query: any): number;
    removeDataOnly(): void;
    
    clear(): void;
    
    // Chain operations
    chain(): Resultset<T>;
    chain<U>(transform: string, parameters?: any): Resultset<U>;
    
    // Indexing
    ensureIndex(property: string, force?: boolean): void;
    ensureUniqueIndex(property: string): void;
    
    // Binary indices
    ensureAllIndexes(force?: boolean): void;
    flagBinaryIndexesDirty(): void;
    
    // Transform operations
    addTransform(name: string, transform: any[]): void;
    setTransform(name: string, transform: any[]): void;
    removeTransform(name: string): void;
    
    // Events
    on(event: 'insert' | 'update' | 'delete' | 'warning' | 'error', listener: Function): void;
    emit(event: string, ...args: any[]): void;
    
    // Statistics
    count(): number;
    count(query: any): number;
    
    // Advanced operations
    mapReduce<U, V>(mapFunction: (doc: T) => U, reduceFunction: (values: U[]) => V): V;
    eqJoin<U>(joinData: U[], leftJoinKey: string | ((doc: T) => any), rightJoinKey: string | ((doc: U) => any)): any[];
    
    // Dynamic views
    addDynamicView(name: string): DynamicView<T>;
    getDynamicView(name: string): DynamicView<T> | null;
    removeDynamicView(name: string): void;
  }

  interface Resultset<T = any> {
    collection: Collection<T>;
    filteredrows: number[];
    filterInitialized: boolean;
    
    // Filtering
    find(): Resultset<T>;
    find(query: any): Resultset<T>;
    where(fun: (doc: T) => boolean): Resultset<T>;
    
    // Sorting and limiting
    sort(comparefun: (a: T, b: T) => number): Resultset<T>;
    sort(property: string): Resultset<T>;
    simplesort(property: string, desc?: boolean): Resultset<T>;
    compoundsort(properties: Array<string | [string, boolean]>): Resultset<T>;
    limit(qty: number): Resultset<T>;
    offset(pos: number): Resultset<T>;
    
    // Aggregation
    count(): number;
    sum(property: string): number;
    avg(property: string): number;
    min(property: string): number;
    max(property: string): number;
    
    // Transformation
    map<U>(mapFun: (doc: T, index?: number, array?: T[]) => U): U[];
    mapReduce<U, V>(mapFun: (doc: T) => U, reduceFun: (values: U[]) => V): V;
    
    // Terminal operations
    data(): T[];
    data(options: { forceClones?: boolean; forceCloneMethod?: string }): T[];
    
    // Updates
    update(updateFunction: (doc: T) => any): void;
    remove(): void;
    
    // Branching
    branch(): Resultset<T>;
    copy(): Resultset<T>;
    
    // Transform
    transform(transform: string, parameters?: any): Resultset<T>;
    
    // Paging
    page(pageSize: number): T[][];
  }

  interface DynamicView<T = any> {
    name: string;
    collection: Collection<T>;
    persistent: boolean;
    sortPriority: 'passive' | 'active';
    minRebuildInterval: number;
    resultdata: number[];
    resultsdirty: boolean;
    cachedresultset?: Resultset<T>;
    
    // Filtering
    applyFind(query: any): DynamicView<T>;
    applyWhere(fun: (doc: T) => boolean): DynamicView<T>;
    applySort(comparefun: (a: T, b: T) => number): DynamicView<T>;
    applySort(property: string): DynamicView<T>;
    applySimpleSort(property: string, desc?: boolean): DynamicView<T>;
    
    // Data access
    data(): T[];
    resultset(): Resultset<T>;
    count(): number;
    
    // Maintenance
    rebuild(): DynamicView<T>;
    branchResultset(): Resultset<T>;
    
    // Events
    on(event: 'rebuild' | 'filter' | 'sort', listener: Function): void;
    emit(event: string, ...args: any[]): void;
    
    // Persistence
    toJSON(): any;
    fromJSON(obj: any): void;
  }

  interface LokiPersistenceAdapter {
    mode?: string;
    loadDatabase(dbname: string, callback: (data: any) => void): void;
    saveDatabase(dbname: string, dbstring: string, callback: (err?: Error) => void): void;
    deleteDatabase?(dbname: string, callback?: (err?: Error) => void): void;
  }

  class LokiMemoryAdapter implements LokiPersistenceAdapter {
    mode: string;
    constructor();
    loadDatabase(dbname: string, callback: (data: any) => void): void;
    saveDatabase(dbname: string, dbstring: string, callback: (err?: Error) => void): void;
  }

  class LokiPartitioningAdapter implements LokiPersistenceAdapter {
    mode: string;
    adapter: LokiPersistenceAdapter;
    constructor(adapter: LokiPersistenceAdapter, options?: any);
    loadDatabase(dbname: string, callback: (data: any) => void): void;
    saveDatabase(dbname: string, dbstring: string, callback: (err?: Error) => void): void;
  }

  class LokiCryptedFileAdapter implements LokiPersistenceAdapter {
    mode: string;
    constructor(secret?: string);
    loadDatabase(dbname: string, callback: (data: any) => void): void;
    saveDatabase(dbname: string, dbstring: string, callback: (err?: Error) => void): void;
  }

  export default class Loki {
    filename: string;
    collections: Collection<any>[];
    databaseVersion: number;
    engineVersion: number;
    autosave: boolean;
    autosaveInterval: number;
    autosaveHandle?: any;
    throttledSaves: boolean;
    options: LokiOptions;
    persistenceMethod: string | null;
    persistenceAdapter: LokiPersistenceAdapter | null;
    verbose: boolean;
    events: any;
    
    // Static properties
    static LokiMemoryAdapter: typeof LokiMemoryAdapter;
    static LokiPartitioningAdapter: typeof LokiPartitioningAdapter;
    static LokiCryptedFileAdapter: typeof LokiCryptedFileAdapter;

    constructor(filename?: string, options?: LokiOptions);

    // Collection management
    addCollection<T = any>(name: string, options?: any): Collection<T>;
    getCollection<T = any>(name: string): Collection<T> | null;
    removeCollection(name: string): void;
    listCollections(): any[];
    getName(): string;
    
    // Persistence
    loadDatabase(callback?: (err?: Error) => void): void;
    saveDatabase(callback?: (err?: Error) => void): void;
    loadJSON(serializedDb: string, options?: any): void;
    close(callback?: () => void): void;
    
    // Serialization
    serialize(): string;
    serialize(options: { 
      serializationMethod?: 'normal' | 'pretty' | 'destructured';
      inflate?: boolean;
    }): string;
    deserialize(destructuredSource: any, options?: any): void;
    
    // Configuration
    configureOptions(options?: LokiOptions, initialConfig?: boolean): void;
    ansiSqlQuery(sql: string): any;
    generateChangesNotification(arrayOfCollectionNames?: string[]): any;
    serializeChanges(collectionNamesArray?: string[]): string;
    clearChanges(): void;
    
    // Events
    on(event: 'init' | 'loaded' | 'flushbuffer' | 'close' | 'changes' | 'warning', listener: Function): void;
    emit(event: string, ...args: any[]): boolean;
    
    // Utilities
    copy(): Loki;
    addListener(event: string, listener: Function): void;
    removeListener(event: string, listener: Function): void;
  }

  export = Loki;
}

// Additional type augmentations for global Loki
declare global {
  interface LokiStatic {
    LokiMemoryAdapter: new () => any;
  }
}

// Enhanced collection helper types
export interface LokiCollectionOptions {
  unique?: string[];
  indices?: string[];
  asyncListeners?: boolean;
  disableMeta?: boolean;
  disableChangesApi?: boolean;
  disableDeltaChangesApi?: boolean;
  autoupdate?: boolean;
  clone?: boolean;
  cloneMethod?: 'parse-stringify' | 'jquery-extend-deep' | 'shallow' | 'shallow-assign' | 'shallow-recurse-objects';
  ttl?: number;
  ttlInterval?: number;
  transforms?: Record<string, any[]>;
}

export interface LokiTransform {
  type: string;
  value?: any;
  property?: string;
  desc?: boolean;
  properties?: Array<string | [string, boolean]>;
  params?: any;
}

export interface LokiFindObject {
  [key: string]: any;
}

export interface LokiUpdateObject {
  [key: string]: any;
}