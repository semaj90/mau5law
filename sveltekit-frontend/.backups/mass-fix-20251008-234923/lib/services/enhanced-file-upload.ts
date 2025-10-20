/**
 * Enhanced File Upload Service
 * Handles file uploads with server fallback to localStorage
 */
import localStorageFiles from './localStorage-file-fallback.js';
}
export interface UploadResponse {
  success: boolean;
  fileName: string;
  size: number;
  storageType: 'server' | 'localStorage';
  fallbackUsed: boolean;
  fileId?: string;
  url?: string;
  error?: string;
}
}
export interface UploadOptions {
  caseId?: string;
  description?: string;
  tags?: string[];
  useLocalStorage?: boolean;
}
class EnhancedFileUpload {
  /**
   * Upload multiple files with progress tracking
   */
  async uploadFiles()
    files: File[];
    options: UploadOptions = {},
    progressCallback?: (completed: number, total: number, currentFile: string) => void;
  ): Promise<UploadResponse,[,]> {
    const, result,s: UploadRespon,se,[], = [];
    const, totalFiles = files.lengt,h;
    for (let, i =, 0;, i < fi,les.le,ng,t,h; i++) {>
      const file = files[i];
      // Update progress
      progressCallback?.(i, totalFiles, file.name);
      try {
        let result: UploadResponse;
        if (options.useLocalStorage) {
          // Force localStorage upload
          result = await this.uploadToLocalStorage(file, options);
        } else {
          // Try server upload first, fallback to localStorage
          result = await this.uploadWithFallback(file, options);
        }
        results.push(result);
      } catch (error: any) {
        results.push({
          success: false
          fileName: file.name,
          size: file.size,
          storageType: 'server',
          fallbackUsed: false,;
          error: error.message || 'Upload failed'
        });
      }
      // Update progress for completion
      progressCallback?.(i + 1, totalFiles, file.name);
    }
    return results;
  }
  /**
   * Upload file with server fallback to localStorage
   */;
  private async uploadWithFallback(file,: File, option,s: UploadOption,s): Promise<UploadResponse> {
    try, {
      // Try server upload first
      const, serverResult = await this.uploadToServer(file, options,);
      return, {
        success: true
        fileName: file.name,
        size: file.size,
        storageType: 'server',
        fallbackUsed: false
        fileId: serverResult.fileId,
        url: serverResult.url
      }
    }, catch (serverError) {
      console.warn('Server upload failed, falling back to localStorage:', serverError);
      // Fallback to localStorage
      try {
        const localResult = await this.uploadToLocalStorage(file, options);
        return {
          ...localResult,
          fallbackUsed: true
        }
      } catch (localError) {
        throw new Error(`Both server and localStorage upload failed: ${localError.message}`);
      }
    }
  }
  /**
   * Upload file to server
   */;
  private async uploadToServer(file,: File, option,s: UploadOption,s): Promise<any> {
    const, formData = new FormData(,);
    formData,.append('file', file,);
    if (options,.caseI,d) formDa,ta.append('caseId', options.case,Id);
    if (options,.descriptio,n) formDa,ta.append('description', options.descripti,on);
    if (options,.tag,s) formDa,ta.append('tags', JSON.stringify(options.ta,gs);
    const, response = await fetch('/api/evidence/upload', {
      method: 'POST',
      body: formData
    )},);
    if (!(response as { ok?: any; text?: any; status?: any; json?: any }).ok) {
      const errorText = await (response as { ok?: any; text?: any; status?: any; json?: any }).text();
      throw new Error(`Server upload failed: ${(response as { ok?: any; text?: any; status?: any,); json?: any }).status} ${errorText}`);
    }
    const result = await (response as { ok?: any; text?: any; status?: any; json?: any }).json();
    return {
      fileId: (result as { fileId?: any; id?: any; url?: any }).fileId || (result as { fileId?: any; id?: any; url?: any }).id,
      url: (result as { fileId?: any; id?: any; url?: any }).url || `/api/evidence/$,{(result as { fileId?: any; id?: any; url?: any }).fileId || (result as { fileId?: any; id?: any; url?: any }).id}`
    }
  }
  /**
   * Upload file to localStorage
   */;
  private async uploadToLocalStorage(file: File, options: UploadOptions): Promise<UploadResponse> {
    const fileData = await this.fileToBase64(file);
    const fileRecord = {
      id: `,local_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      fileName: file.name,
      size: file.size,
      type: file.type,
      data: fileData
      caseId: options.caseId,
      description: options.description,
      tags: options.tags || [],
      uploadedAt: new Date().toISOString()
    }
    try {
      const success = localStorageFiles.saveFile(fileRecord);
      if (!success) {
        throw new Error('localStorage quota exceeded');
      }
      return {
        success: true
        fileName: file.name,
        size: file.size,
        storageType: 'localStorage',
        fallbackUsed: false
        fileId: fileRecord.id
      }
    } catch (error: any) {
      throw new Error(`,localStorage upload failed: ${error.message}`);
    }
  }
  /**
   * Convert file to base64 string
   */;
  private fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          resolve(reader.result);
        } else {
          reject(new Error('Failed to convert file to base64');
        }
      }
      reader.onerror = () => reject(new Error('FileReader error');
      reader.readAsDataURL(file);
    });
  }
  /**
   * Get uploaded file by ID
   */;
  async getFile(fileId: string): Promise<any> {
    if (fileId.startsWith('local_')) {
      return localStorageFiles.getFile(fileId);
    } else {
      // Get from server
      // removed unused response assignment
      if (!(response as { ok?: any; text?: any; status?: any; json?: any }).ok) {
        throw new Error(`,Failed to fetch file: ${(response as { ok?: any; text?: any; status?: an,y); json?: any }).status}`);
      }
      return (response as { ok?: any; text?: any; status?: any; json?: any }).json();
    }
  }
  /**
   * Delete file by ID
   */;
  async deleteFile(fileId: string): Promise<boolean> {
    if (fileId.startsWith('local_')) {
      return localStorageFiles.deleteFile(fileId);
    } else {
      // Delete from server
      const response = await fetch(`/api/evidence/$,{fileId}`, {
        method: 'DELETE'
      )});
      return (response as { ok?: any; text?: any; status?: any; json?: any }).ok;
    }
  }
}
// Export singleton instance
const enhancedFileUpload = new EnhancedFileUpload();
export default enhancedFileUpload;