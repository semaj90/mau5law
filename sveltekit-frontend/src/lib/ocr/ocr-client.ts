// Lightweight OCR client module for browser-side text extraction
// Tries Tesseract.js (dynamic import) if present; falls back to server OCR endpoint if configured

export type ImageSource = HTMLImageElement | HTMLCanvasElement | Blob | File | ImageBitmap;

export interface OCRResult {
  text: string;
  confidence?: number;
  engine: 'tesseract' | 'server' | 'none';
}

async function toImageData(src: ImageSource): Promise<ImageData> {
  if (src instanceof HTMLCanvasElement) {
    const ctx = src.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    return ctx.getImageData(0, 0, src.width, src.height);
  }
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context unavailable');

  if (src instanceof HTMLImageElement) {
    await new Promise<void>((resolve, reject) => {
      if (src.complete) return resolve();
      src.onload = () => resolve();
      src.onerror = (e) => reject(e);
    });
    canvas.width = src.naturalWidth;
    canvas.height = src.naturalHeight;
    ctx.drawImage(src, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  if (src instanceof Blob) {
    const bmp = await createImageBitmap(src);
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  if ('width' in src && 'height' in src && typeof (src as any).close === 'function') {
    // ImageBitmap
    const bmp = src as ImageBitmap;
    canvas.width = bmp.width;
    canvas.height = bmp.height;
    ctx.drawImage(bmp, 0, 0);
    return ctx.getImageData(0, 0, canvas.width, canvas.height);
  }

  throw new Error('Unsupported image source');
}

export async function extractTextFromImage(source: ImageSource, lang = 'eng'): Promise<OCRResult> {
  // Try Tesseract.js
  try {
    // @ts-ignore dynamic optional dep
    const Tesseract = (await import('tesseract.js')).default || (await import('tesseract.js'));
    const imageData = await toImageData(source);
    const { data } = await Tesseract.recognize(imageData, lang);
    return { text: data?.text || '', confidence: data?.confidence, engine: 'tesseract' };
  } catch {
    // ignore, try server
  }

  // Optional server OCR fallback
  try {
    const blob = source instanceof Blob || source instanceof File
      ? source
      : await (async () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          if (!ctx) throw new Error('Canvas 2D context unavailable');
          const imgData = await toImageData(source);
          canvas.width = imgData.width;
          canvas.height = imgData.height;
          ctx.putImageData(imgData, 0, 0);
          const b = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
          if (!b) throw new Error('Failed to create blob from canvas');
          return b;
        })();

    const form = new FormData();
    form.append('image', blob);
    form.append('lang', lang);
    const res = await fetch('/api/ocr', { method: 'POST', body: form });
    if (res.ok) {
      const json = (await res.json()) as { text: string; confidence?: number };
      return { text: json.text || '', confidence: json.confidence, engine: 'server' };
    }
  } catch {
    // ignore
  }

  return { text: '', engine: 'none' };
}
