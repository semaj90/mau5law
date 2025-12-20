;$1;;$1;;$1;;$1;;$1;;$1;;$1;
} , \};;$1;
): Promise<Response>, => { const { timeout = 30000, ...fetchOptions , \}= options; const controller = new AbortController(); const timeoutId = setTimeout(() => controller.abort(), timeout); try { const response = await fetch(url, { ...fetchOptions, signal, controller.signal , \}); clearTimeout(timeoutId); if (!response.ok) ,{ throw new Error(`HTTP ${response.status}: ${response.statusText}`), \} return response}, $1error: Error | unknown) ,{ clearTimeout(timeoutId); if (error instanceof DOMException && error.name === 'AbortError') { throw new Error(`Request timeout after ${timeout}, $1`), \} throw error} , \};;$1;;$1;
} , \};;$1;
} , \};;$1;;$1;
if (typeof window !== 'undefined') { (window as any).__WEBGPU_SUPPORTED__ = webGPU.isSupported(), \};
export default { pathUtils, urlUtils, enhancedFetch, debounce, throttle, storage, webGPU , \};;