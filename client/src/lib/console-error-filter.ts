// Console error filter to suppress known WebSocket development errors
export function initConsoleErrorFilter() {
  if (import.meta.env.DEV) {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;

    console.error = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out known WebSocket development errors
      if (
        message.includes('Failed to construct \'WebSocket\'') ||
        message.includes('localhost:undefined') ||
        message.includes('wss://localhost:undefined') ||
        message.includes('WebSocket connection') ||
        message.includes('connection failed')
      ) {
        return; // Suppress these specific errors
      }
      
      // Allow all other errors through
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args: any[]) => {
      const message = args.join(' ');
      
      // Filter out known WebSocket warnings
      if (
        message.includes('WebSocket') ||
        message.includes('connection')
      ) {
        return; // Suppress these specific warnings
      }
      
      // Allow all other warnings through
      originalConsoleWarn.apply(console, args);
    };

    // Handle unhandled promise rejections for WebSocket errors
    window.addEventListener('unhandledrejection', (event) => {
      const error = event.reason;
      if (
        error instanceof Error &&
        (error.message.includes('Failed to construct \'WebSocket\'') ||
         error.message.includes('localhost:undefined') ||
         error.message.includes('WebSocket'))
      ) {
        event.preventDefault(); // Prevent the error from being logged
      }
    });

    // Handle regular errors
    window.addEventListener('error', (event) => {
      if (
        event.message.includes('WebSocket') ||
        event.message.includes('localhost:undefined')
      ) {
        event.preventDefault();
      }
    });
  }
}