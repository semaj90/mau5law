
// Comprehensive Database Synchronization Utility
// Ensures all CRUD operations maintain perfect sync with PostgreSQL database

export interface SyncOptions {
  retryAttempts?: number;
  retryDelay?: number;
  validateResponse?: boolean;
  enableOptimisticUpdates?: boolean;
  onError?: (error: Error) => void;
  onSuccess?: (data: any) => void;
}
export interface EntityEndpoints {
  list: string;
  create: string;
  read: string;
  update: string;
  delete: string;
  patch?: string;
}
export class DatabaseSyncManager {
  private static instance: DatabaseSyncManager;
  private syncQueue: Map<string, unknown[]> = new Map();
  private pendingOperations: Set<string> = new Set();

  private endpoints: Record<string, EntityEndpoints> = {
    cases: {
      list: "/api/cases",
      create: "/api/cases",
      read: "/api/cases",
      update: "/api/cases",
      delete: "/api/cases",
      patch: "/api/cases",
    },
    evidence: {
      list: "/api/evidence",
      create: "/api/evidence",
      read: "/api/evidence",
      update: "/api/evidence",
      delete: "/api/evidence",
      patch: "/api/evidence",
    },
    reports: {
      list: "/api/reports",
      create: "/api/reports",
      read: "/api/reports",
      update: "/api/reports",
      delete: "/api/reports",
      patch: "/api/reports",
    },
    criminals: {
      list: "/api/criminals",
      create: "/api/criminals",
      read: "/api/criminals",
      update: "/api/criminals",
      delete: "/api/criminals",
      patch: "/api/criminals",
    },
    activities: {
      list: "/api/activities",
      create: "/api/activities",
      read: "/api/activities",
      update: "/api/activities",
      delete: "/api/activities",
      patch: "/api/activities",
    },
    users: {
      list: "/api/users",
      create: "/api/users",
      read: "/api/users",
      update: "/api/users",
      delete: "/api/users",
      patch: "/api/users",
    },
    canvasStates: {
      list: "/api/canvas-states",
      create: "/api/canvas-states",
      read: "/api/canvas-states",
      update: "/api/canvas-states",
      delete: "/api/canvas-states",
      patch: "/api/canvas-states",
    },
  };

  public static getInstance(): DatabaseSyncManager {
    if (!DatabaseSyncManager.instance) {
      DatabaseSyncManager.instance = new DatabaseSyncManager();
    }
    return DatabaseSyncManager.instance;
  }
  // CREATE operations with database sync
  async create<T>(
    entity: string,
    data: any,
    options: SyncOptions = {},
  ): Promise<T> {
    const operationId = this.generateOperationId("create", entity);

    try {
      this.pendingOperations.add(operationId);

      // Validate data before sending
      this.validateCreateData(entity, data);

      const response = await this.makeRequest(
        this.endpoints[entity].create,
        "POST",
        data,
        options,
      );

      if (!response.ok) {
        throw new Error(`Failed to create ${entity}: ${response.statusText}`);
      }
      const result = await response.json();

      // Validate response if enabled
      if (options.validateResponse) {
        this.validateResponseData(entity, result, "create");
      }
      // Update local cache if needed
      this.updateLocalCache(entity, "create", result);

      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }
  // READ operations with caching and sync
  async read<T>(
    entity: string,
    id?: string,
    params: Record<string, any> = {},
    options: SyncOptions = {},
  ): Promise<T> {
    const operationId = this.generateOperationId("read", entity, id);

    try {
      this.pendingOperations.add(operationId);

      let url = this.endpoints[entity].read;
      if (id) {
        url += `/${id}`;
      }
      // Add query parameters
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });

      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
      const response = await this.makeRequest(url, "GET", null, options);

      if (!response.ok) {
        throw new Error(`Failed to read ${entity}: ${response.statusText}`);
      }
      const result = await response.json();

      // Validate response if enabled
      if (options.validateResponse) {
        this.validateResponseData(entity, result, "read");
      }
      // Update local cache
      this.updateLocalCache(entity, "read", result, id);

      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }
  // UPDATE operations with optimistic updates
  async update<T>(
    entity: string,
    id: string,
    data: any,
    options: SyncOptions = {},
  ): Promise<T> {
    const operationId = this.generateOperationId("update", entity, id);

    try {
      this.pendingOperations.add(operationId);

      // Optimistic update if enabled
      if (options.enableOptimisticUpdates) {
        this.updateLocalCache(entity, "update", { id, ...data }, id);
      }
      // Validate data before sending
      this.validateUpdateData(entity, data);

      const url = `${this.endpoints[entity].update}/${id}`;
      const response = await this.makeRequest(url, "PUT", data, options);

      if (!response.ok) {
        // Revert optimistic update if failed
        if (options.enableOptimisticUpdates) {
          this.revertOptimisticUpdate(entity, id);
        }
        throw new Error(`Failed to update ${entity}: ${response.statusText}`);
      }
      const result = await response.json();

      // Validate response if enabled
      if (options.validateResponse) {
        this.validateResponseData(entity, result, "update");
      }
      // Update local cache with server response
      this.updateLocalCache(entity, "update", result, id);

      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }
  // PATCH operations for partial updates
  async patch<T>(
    entity: string,
    id: string,
    data: any,
    options: SyncOptions = {},
  ): Promise<T> {
    const operationId = this.generateOperationId("patch", entity, id);

    try {
      this.pendingOperations.add(operationId);

      let url = this.endpoints[entity].patch || this.endpoints[entity].update;

      // Handle different patch URL patterns
      if (entity === "evidence" || entity === "canvasStates") {
        url += `?id=${id}`;
      } else {
        url += `/${id}`;
      }
      const response = await this.makeRequest(url, "PATCH", data, options);

      if (!response.ok) {
        throw new Error(`Failed to patch ${entity}: ${response.statusText}`);
      }
      const result = await response.json();

      // Update local cache
      this.updateLocalCache(entity, "patch", result, id);

      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }
  // DELETE operations with confirmation
  async delete<T>(
    entity: string,
    id: string,
    options: SyncOptions = {},
  ): Promise<T> {
    const operationId = this.generateOperationId("delete", entity, id);

    try {
      this.pendingOperations.add(operationId);

      let url = this.endpoints[entity].delete;

      // Handle different delete URL patterns
      if (entity === "evidence" || entity === "canvasStates") {
        url += `?id=${id}`;
      } else {
        url += `/${id}`;
      }
      const response = await this.makeRequest(url, "DELETE", null, options);

      if (!response.ok) {
        throw new Error(`Failed to delete ${entity}: ${response.statusText}`);
      }
      const result = await response.json();

      // Remove from local cache
      this.updateLocalCache(entity, "delete", null, id);

      options.onSuccess?.(result);
      return result;
    } catch (error: any) {
      options.onError?.(error as Error);
      throw error;
    } finally {
      this.pendingOperations.delete(operationId);
    }
  }
  // Batch operations for multiple entities
  async batchOperation(
    operations: Array<{
      operation: "create" | "read" | "update" | "patch" | "delete";
      entity: string;
      id?: string;
      data?: unknown;
      options?: SyncOptions;
    }>,
  ): Promise<any[]> {
    const results: any[] = [];

    for (const op of operations) {
      try {
        let result;
        switch (op.operation) {
          case "create":
            result = await this.create(op.entity, op.data, op.options);
            break;
          case "read":
            result = await this.read(op.entity, op.id, op.data, op.options);
            break;
          case "update":
            result = await this.update(op.entity, op.id!, op.data, op.options);
            break;
          case "patch":
            result = await this.patch(op.entity, op.id!, op.data, op.options);
            break;
          case "delete":
            result = await this.delete(op.entity, op.id!, op.options);
            break;
        }
        results.push({ success: true, result });
      } catch (error: any) {
        results.push({ success: false, error });
      }
    }
    return results;
  }
  // Validation methods
  private validateCreateData(entity: string, data: any): void {
    const requiredFields = this.getRequiredFields(entity, "create");

    for (const field of requiredFields) {
      if (!data[field]) {
        throw new Error(
          `Required field '${field}' is missing for ${entity} creation`,
        );
      }
    }
  }
  private validateUpdateData(entity: string, data: any): void {
    // Ensure we have some data to update
    if (!data || Object.keys(data).length === 0) {
      throw new Error(`No data provided for ${entity} update`);
    }
  }
  private validateResponseData(
    entity: string,
    data: any,
    operation: string,
  ): void {
    if (!data) {
      throw new Error(`No data returned from ${entity} ${operation} operation`);
    }
    // Validate that essential fields are present
    if (operation !== "delete" && !data.id) {
      throw new Error(`No ID returned from ${entity} ${operation} operation`);
    }
  }
  private getRequiredFields(entity: string, operation: string): string[] {
    const requiredFields: Record<string, Record<string, string[]>> = {
      cases: {
        create: ["title", "caseNumber"],
      },
      evidence: {
        create: ["title", "evidenceType"],
      },
      reports: {
        create: ["title", "caseId"],
      },
      criminals: {
        create: ["firstName", "lastName"],
      },
      activities: {
        create: ["caseId", "title", "activityType"],
      },
      users: {
        create: ["email", "password"],
      },
      canvasStates: {
        create: ["name", "canvasData"],
      },
    };

    return requiredFields[entity]?.[operation] || [];
  }
  // Helper methods
  private async makeRequest(
    url: string,
    method: string,
    data: any,
    options: SyncOptions,
  ): Promise<Response> {
    const requestOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (data && (method === "POST" || method === "PUT" || method === "PATCH")) {
      requestOptions.body = JSON.stringify(data);
    }
    let response: Response;
    let attempt = 0;
    const maxAttempts = options.retryAttempts || 3;

    while (attempt < maxAttempts) {
      try {
        response = await fetch(url, requestOptions);

        if (response.ok || attempt === maxAttempts - 1) {
          return response;
        }
        // If not ok and we have retries left, wait and try again
        await this.delay(options.retryDelay || 1000);
        attempt++;
      } catch (error: any) {
        if (attempt === maxAttempts - 1) {
          throw error;
        }
        await this.delay(options.retryDelay || 1000);
        attempt++;
      }
    }
    throw new Error("Maximum retry attempts reached");
  }
  private generateOperationId(
    operation: string,
    entity: string,
    id?: string,
  ): string {
    return `${operation}-${entity}-${id || "new"}-${Date.now()}`;
  }
  private updateLocalCache(
    entity: string,
    operation: string,
    data: any,
    id?: string,
  ): void {
    // Implement local cache updates based on operation
    // This could integrate with your state management system

    if (typeof window !== "undefined") {
      const cacheKey = `sync-cache-${entity}`;
      const cache = JSON.parse(localStorage.getItem(cacheKey) || "{}");

      switch (operation) {
        case "create":
          cache[data.id] = data;
          break;
        case "update":
        case "patch":
          if (id && cache[id]) {
            cache[id] = { ...cache[id], ...data };
          }
          break;
        case "delete":
          if (id && cache[id]) {
            delete cache[id];
          }
          break;
      }
      localStorage.setItem(cacheKey, JSON.stringify(cache));
    }
  }
  private revertOptimisticUpdate(entity: string, id: string): void {
    // Implement optimistic update reversion
    console.warn(`Reverting optimistic update for ${entity} ${id}`);
  }
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
  // Status methods
  isPending(entity?: string): boolean {
    if (entity) {
      return Array.from(this.pendingOperations).some((op) =>
        op.includes(entity),
      );
    }
    return this.pendingOperations.size > 0;
  }
  getPendingOperations(): string[] {
    return Array.from(this.pendingOperations);
  }
  // Cleanup method
  cleanup(): void {
    this.syncQueue.clear();
    this.pendingOperations.clear();
  }
}
// Convenience wrapper functions
export const dbSync = DatabaseSyncManager.getInstance();
;
// Entity-specific helper functions
export const CasesAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("cases", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("cases", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("cases", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("cases", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("cases", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("cases", id, options),
};

export const EvidenceAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("evidence", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("evidence", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("evidence", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("evidence", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("evidence", id, options),
};

export const ReportsAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("reports", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("reports", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("reports", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("reports", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("reports", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("reports", id, options),
};

export const CriminalsAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("criminals", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("criminals", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("criminals", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("criminals", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("criminals", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("criminals", id, options),
};

export const ActivitiesAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("activities", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("activities", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("activities", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("activities", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("activities", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("activities", id, options),
};

export const UsersAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("users", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("users", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("users", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("users", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("users", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("users", id, options),
};

export const CanvasAPI = {
  list: (params?: unknown, options?: SyncOptions) =>
    dbSync.read("canvasStates", undefined, params, options),
  get: (id: string, options?: SyncOptions) =>
    dbSync.read("canvasStates", id, {}, options),
  create: (data: any, options?: SyncOptions) =>
    dbSync.create("canvasStates", data, options),
  update: (id: string, data: any, options?: SyncOptions) =>
    dbSync.update("canvasStates", id, data, options),
  patch: (id: string, data: any, options?: SyncOptions) =>
    dbSync.patch("canvasStates", id, data, options),
  delete: (id: string, options?: SyncOptions) =>
    dbSync.delete("canvasStates", id, options),
};

export default DatabaseSyncManager;
