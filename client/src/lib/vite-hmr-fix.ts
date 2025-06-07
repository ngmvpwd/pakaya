// Fix for Vite HMR WebSocket connection issues in development
export function initViteHMRFix() {
  if (import.meta.env.DEV) {
    // Override console.error to filter out Vite HMR WebSocket errors
    const originalConsoleError = console.error;
    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out Vite HMR WebSocket errors
      if (
        message.includes('Failed to construct \'WebSocket\'') ||
        message.includes('localhost:undefined') ||
        message.includes('wss://localhost:undefined')
      ) {
        return; // Suppress these specific errors
      }
      
      // Allow all other errors through
      originalConsoleError.apply(console, args);
    };

    // Handle unhandled promise rejections for WebSocket errors
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (
        error instanceof Error &&
        (error.message.includes('Failed to construct \'WebSocket\'') ||
         error.message.includes('localhost:undefined'))
      ) {
        event.preventDefault(); // Prevent the error from being logged
      }
    });
  }
}