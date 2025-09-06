// Toast utility for user notifications
export interface ToastOptions {
  duration?: number;
  type?: 'success' | 'error' | 'warning' | 'info';
}

export const toast = {
  success: (message: string, options: ToastOptions = {}) => {
    showToast(message, 'success', options);
  },
  
  error: (message: string, options: ToastOptions = {}) => {
    showToast(message, 'error', options);
  },
  
  warning: (message: string, options: ToastOptions = {}) => {
    showToast(message, 'warning', options);
  },
  
  info: (message: string, options: ToastOptions = {}) => {
    showToast(message, 'info', options);
  }
};

function showToast(message: string, type: string, options: ToastOptions) {
  // Create toast element
  const toast = document.createElement('div');
  toast.className = `fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg max-w-sm transform transition-all duration-300 ${getToastStyles(type)}`;
  toast.textContent = message;
  
  // Add to DOM
  document.body.appendChild(toast);
  
  // Animate in
  requestAnimationFrame(() => {
    toast.style.transform = 'translateX(0)';
    toast.style.opacity = '1';
  });
  
  // Remove after duration
  setTimeout(() => {
    toast.style.transform = 'translateX(100%)';
    toast.style.opacity = '0';
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 300);
  }, options.duration || 3000);
}

function getToastStyles(type: string): string {
  const styles = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-black',
    info: 'bg-blue-500 text-white'
  };
  return styles[type as keyof typeof styles] || styles.info;
}
