/**
 * Secure Storage Client with proper error handling and conditional removal
 * Follows security best practices for file operations
 */
}
export interface UploadResponse {
  ok: boolean;
  bucket?: string;
  key?: string;
  url?: string;
  size?: number;
  type?: string;
  error?: string;
}
export interface DeleteResponse {
  ok: boolean;
  message?: string;
  softDelete?: boolean;
  hardDeleteScheduled?: boolean;
  hardDeleteAfter?: string;
  error?: string;
}
export interface StorageFile {
  bucket: string;
  key: string;
  url?: string;
  size?: number;
  type?: string;
  uploadedAt?: Date;
}
/**
 * Secure storage client with authentication and error handling
 */
export class SecureStorageClient {
  private baseUrl: string;
  private authToken?: string;
  constructor(baseUrl = '/api/v1/storage', authToken?: string) {
    this.baseUrl = baseUrl;
    this.authToken = authToken;
  }
  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.authToken = token;
  }
  /**
   * Get authentication headers
   */
  private getAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {}
    if (this.authToken) {
      headers['Authorization'] = `Bearer ${this.authToken}`;
    }
    return headers;
  }
  /**
   * Upload file with proper error handling and security
   */
  async uploadFile(
    file: File;
    bucket: string = 'legal-documents',
    customKey?: string;
  ): Promise<UploadResponse> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('bucket', bucket);
      if (customKey) {
        formData.append('key', customKey);
      }
      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        body: formData
      });
      const result = await (response as { json?: any; ok?: any }).json();
      if (!(response as { json?: any; ok?: any }).ok) {
        console.error('Upload failed:', (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error);
        return { ok: false, error: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Upload failed' }
      }
      return result;
    } catch (error) {
      console.error('Upload error:', error);
      return { ok: false, error: 'Network error during upload' }
    }
  }
  /**
   * Delete file with conditional client-side removal
   * Only removes from client state if server confirms deletion
   */
  async deleteFile(bucket: string, key: string): Promise<DeleteResponse> {
    try {
      const url = new URL(`${this.baseUrl}/delete`, window.location.origin);
      url.searchParams.set('bucket', bucket);
      url.searchParams.set('key', key);
      const response = await fetch(url.toString(), {
        method: 'DELETE',
        headers: this.getAuthHeaders()
      });
      const result = await (response as { json?: any; ok?: any }).json();
      if (!(response as { json?: any; ok?: any }).ok) {
        console.error('Delete failed:', (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error);
        return { ok: false, error: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Delete failed' }
      }
      return result;
    } catch (error) {
      console.error('Delete error:', error);
      return { ok: false, error: 'Network error during delete' }
    }
  }
  /**
   * Check file deletion status
   */
  async getFileStatus(bucket: string, key: string): Promise<any> {
    try {
      const url = new URL(`${this.baseUrl}/delete`, window.location.origin);
      url.searchParams.set('bucket', bucket);
      url.searchParams.set('key', key);
      const response = await fetch(url.toString(), {
        method: 'GET',
        headers: this.getAuthHeaders()
      });
      const result = await (response as { json?: any; ok?: any }).json();
      if (!(response as { json?: any; ok?: any }).ok) {
        return { ok: false, error: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Status check failed' }
      }
      return result;
    } catch (error) {
      console.error('Status check error:', error);
      return { ok: false, error: 'Network error during status check' }
    }
  }
  /**
   * Batch upload multiple files
   */
  async uploadFiles(
    files: File[];
    bucket: string = 'legal-documents',
    onProgress?: (completed: number, total: number) => void;
  ): Promise<any> {
    const successful: UploadResponse[] = [];
    const failed: Array<any> = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const result = await this.uploadFile(file, bucket);
      if ((result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).ok) {
        successful.push(result);
      } else {
        failed.push({ file, error: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Unknown error' });
      }
      if (onProgress) {
        onProgress(i + 1, files.length);
      }
    }
    return { successful, failed }
  }
}
/**
 * Reactive storage manager for Svelte components
 */
export class ReactiveStorageManager {
  private client: SecureStorageClient;
  private files = $state<StorageFile[]>([]);
  private loading = $state(false);
  private error = $state<string | null>(null);
  constructor(authToken?: string) {
    this.client = new SecureStorageClient('/api/v1/storage', authToken);
  }
  /**
   * Get reactive state
   */
  get state() {
    return {
      files: this.files,
      loading: this.loading,
      error: this.error
    }
  }
  /**
   * Set authentication token
   */
  setAuthToken(token: string) {
    this.client.setAuthToken(token);
  }
  /**
   * Upload file and update state
   */
  async uploadFile(file: File, bucket: string = 'legal-documents'): Promise<boolean> {
    this.loading = true;
    this.error = null;
    try {
      const result = await this.client.uploadFile(file, bucket);
      if ((result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).ok && (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).key) {
        // Add to client state only after successful upload
        this.files.push({
          bucket: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).bucket!,
          key: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).key,
          url: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).url,
          size: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).size,
          type: (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).type,
          uploadedAt: new Date()
        });
        return true;
      } else {
        this.error = (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Upload failed';
        return false;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message: 'Upload failed';
      return false;
    } finally {
      this.loading = false;
    }
  }
  /**
   * Delete file and update state conditionally
   */
  async deleteFile(bucket: string, key: string): Promise<boolean> {
    this.loading = true;
    this.error = null;
    try {
      const result = await this.client.deleteFile(bucket, key);
      if ((result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).ok) {
        // Remove from client state only after successful server deletion
        this.files = this.files.filter(f => !(f.bucket === bucket && f.key === key);
        return true;
      } else {
        this.error = (result as { error?: any; ok?: any; key?: any; bucket?: any; url?: any; size?: any; type?: any }).error || 'Delete failed';
        return false;
      }
    } catch (error) {
      this.error = error instanceof Error ? error.message: 'Delete failed';
      return false;
    } finally {
      this.loading = false;
    }
  }
  /**
   * Clear error state
   */
  clearError() {
    this.error = null;
  }
  /**
   * Refresh file list (if you have a list endpoint)
   */
  async refreshFiles() {
    // Implementation would depend on having a list endpoint
    // For now, this is a placeholder
    console.log('File refresh not implemented yet');
  }
}
/**
 * Create a new storage manager instance
 */
export function createStorageManager(authToken?: string) {
  return new ReactiveStorageManager(authToken);
}