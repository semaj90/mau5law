
// File utility functions for evidence management

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
export function getFileTypeIcon(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  if (mimeType.includes("pdf")) return "pdf";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "document";
  if (mimeType.includes("text")) return "text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "presentation";
  return "file";
}
export function getFileCategory(mimeType: string): string {
  if (mimeType.startsWith("image/")) return "Image";
  if (mimeType.startsWith("video/")) return "Video";
  if (mimeType.startsWith("audio/")) return "Audio";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("word") || mimeType.includes("document"))
    return "Document";
  if (mimeType.includes("text")) return "Text";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel"))
    return "Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint"))
    return "Presentation";
  return "Other";
}
export function isImageFile(mimeType: string): boolean {
  return mimeType.startsWith("image/");
}
export function isVideoFile(mimeType: string): boolean {
  return mimeType.startsWith("video/");
}
export function isAudioFile(mimeType: string): boolean {
  return mimeType.startsWith("audio/");
}
export function isPdfFile(mimeType: string): boolean {
  return mimeType.includes("pdf");
}
export function isDocumentFile(mimeType: string): boolean {
  return (
    mimeType.includes("word") ||
    mimeType.includes("document") ||
    mimeType.includes("text") ||
    mimeType.includes("rtf")
  );
}
export function canPreview(mimeType: string): boolean {
  return isImageFile(mimeType) || isPdfFile(mimeType);
}
export function canExtractText(mimeType: string): boolean {
  return (
    isPdfFile(mimeType) ||
    isImageFile(mimeType) ||
    isDocumentFile(mimeType) ||
    mimeType.includes("text")
  );
}
export function getAcceptedFileTypes(): string {
  return ".pdf,.jpg,.jpeg,.png,.gif,.webp,.bmp,.tiff,.doc,.docx,.txt,.rtf,.mp3,.mp4,.wav,.mov,.avi,.mkv,.webm,.m4a,.flac,.ogg";
}
export function validateFileType(file: File): {
  valid: boolean;
  error?: string;
} {
  const maxSize = 100 * 1024 * 1024; // 100MB

  if (file.size > maxSize) {
    return {
      valid: false,
      error: `File size must be less than ${formatFileSize(maxSize)}`,
    };
  }
  const allowedTypes = [
    // Images
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "image/bmp",
    "image/tiff",
    // Documents
    "application/pdf",
    "text/plain",
    "text/rtf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    // Audio
    "audio/mpeg",
    "audio/wav",
    "audio/m4a",
    "audio/flac",
    "audio/ogg",
    // Video
    "video/mp4",
    "video/mov",
    "video/avi",
    "video/mkv",
    "video/webm",
  ];

  if (!allowedTypes.includes(file.type)) {
    return { valid: false, error: `File type ${file.type} is not supported` };
  }
  return { valid: true };
}
export function createFilePreview(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isImageFile(file.type)) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = (e: any) => resolve(e.target?.result as string);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
export function downloadFile(url: string, filename: string): void {
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
export function generateThumbnail(
  file: File,
  maxWidth: number = 150,
  maxHeight: number = 150
): Promise<string | null> {
  return new Promise((resolve) => {
    if (!isImageFile(file.type)) {
      resolve(null);
      return;
    }
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      // Calculate new dimensions
      let { width, height } = img;

      if (width > height) {
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = (width * maxHeight) / height;
          height = maxHeight;
        }
      }
      canvas.width = width;
      canvas.height = height;

      ctx?.drawImage(img, 0, 0, width, height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };

    img.onerror = () => resolve(null);
    img.src = URL.createObjectURL(file);
  });
}
