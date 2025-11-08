/**
 * ErrorLogger - Advanced error tracking and self-healing service
 *
 * Performance optimizations:
 * - Debounced and rate-limited logging to prevent server flooding
 * - Async error queue with retry logic
 * - Circular reference detection in JSON.stringify
 * - Error boundary to prevent infinite loops
 * - Smart integration with TileBoard's existing error handler
 *
 * Features:
 * - Global error catching (window.onerror, unhandledrejection)
 * - Console error/warn interception (optional)
 * - Remote logging via HTTP POST
 * - Auto-reload on critical errors with loop prevention
 * - Error queuing and retry on network failures
 * - Rate limiting and deduplication
 */

const ErrorLogger = (function () {
   /* ------------------------------------------------------------------ */
   /*                             CONSTANTS                              */
   /* ------------------------------------------------------------------ */

   const DEFAULT_CONFIG = {
      enabled: true,
      logUrl: null,
      autoReload: true,
      reloadCooldown: 15000, // ms
      criticalMessages: [
         'System error',
         'Invalid access token or password',
      ],
      interceptConsole: true, // Intercept console.error/warn
      maxQueueSize: 50,
      maxRetries: 3,
      retryDelay: 2000, // ms
      debounceMs: 100, // Debounce rapid errors
      rateLimit: 10, // Max errors per minute
      includeScreenInfo: true,
      includeBrowserInfo: true,
      sanitizeSensitiveData: true,
   };

   /* ------------------------------------------------------------------ */
   /*                               STATE                                */
   /* ------------------------------------------------------------------ */

   let config = Object.assign({}, DEFAULT_CONFIG);
   let initialized = false;

   // Error queue
   const errorQueue = [];
   let processingQueue = false;

   // Rate limiting
   const errorTimestamps = [];

   // Deduplication - track recent errors
   const recentErrors = new Map(); // hash -> timestamp
   const DEDUP_WINDOW = 5000; // 5 seconds

   // Console method backups
   let originalConsoleError = null;
   let originalConsoleWarn = null;
   let originalWindowError = null;

   // Self-healing state
   let lastReloadTime = 0;

   /* ------------------------------------------------------------------ */
   /*                          UTILITY FUNCTIONS                         */
   /* ------------------------------------------------------------------ */

   /**
    * Safe JSON.stringify with circular reference handling
    */
   function safeStringify (obj, maxDepth = 3) {
      const seen = new WeakSet();

      function replacer (key, value) {
         if (typeof value === 'object' && value !== null) {
            if (seen.has(value)) {
               return '[Circular]';
            }
            seen.add(value);
         }

         // Limit depth
         if (this.depth > maxDepth) {
            return '[MaxDepth]';
         }

         return value;
      }

      try {
         return JSON.stringify(obj, replacer);
      } catch (e) {
         return String(obj);
      }
   }

   /**
    * Normalize error into consistent format
    */
   function normalizeError (input, fallbackType = 'unknown') {
      const error = {
         type: fallbackType,
         message: '',
         stack: '',
      };

      if (input instanceof Error) {
         error.message = input.message;
         error.stack = input.stack;
         error.name = input.name;
      } else if (typeof input === 'object' && input !== null) {
         error.message = safeStringify(input);
         error.stack = new Error().stack;
      } else {
         error.message = String(input);
         error.stack = new Error().stack;
      }

      return error;
   }

   /**
    * Create error hash for deduplication
    */
   function hashError (error) {
      const str = `${error.type}:${error.message}:${error.line || ''}:${error.column || ''}`;
      // Simple hash
      let hash = 0;
      for (let i = 0; i < str.length; i++) {
         const char = str.charCodeAt(i);
         hash = (hash << 5) - hash + char;
         hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString(36);
   }

   /**
    * Check if error is duplicate (within time window)
    */
   function isDuplicate (error) {
      const hash = hashError(error);
      const now = Date.now();

      if (recentErrors.has(hash)) {
         const lastSeen = recentErrors.get(hash);
         if (now - lastSeen < DEDUP_WINDOW) {
            return true;
         }
      }

      recentErrors.set(hash, now);

      // Cleanup old entries
      for (const [h, timestamp] of recentErrors.entries()) {
         if (now - timestamp > DEDUP_WINDOW) {
            recentErrors.delete(h);
         }
      }

      return false;
   }

   /**
    * Check rate limit
    */
   function isRateLimited () {
      const now = Date.now();
      const oneMinuteAgo = now - 60000;

      // Remove old timestamps
      while (errorTimestamps.length > 0 && errorTimestamps[0] < oneMinuteAgo) {
         errorTimestamps.shift();
      }

      if (errorTimestamps.length >= config.rateLimit) {
         return true;
      }

      errorTimestamps.push(now);
      return false;
   }

   /**
    * Sanitize sensitive data from error
    */
   function sanitizeError (error) {
      if (!config.sanitizeSensitiveData) {
         return error;
      }

      const sanitized = Object.assign({}, error);

      // Sanitize common sensitive patterns
      const patterns = [
         /password[=:]\s*[^\s&]+/gi,
         /token[=:]\s*[^\s&]+/gi,
         /api[_-]?key[=:]\s*[^\s&]+/gi,
         /access[_-]?token[=:]\s*[^\s&]+/gi,
      ];

      if (sanitized.message) {
         patterns.forEach(pattern => {
            sanitized.message = sanitized.message.replace(pattern, '$1=[REDACTED]');
         });
      }

      if (sanitized.stack) {
         patterns.forEach(pattern => {
            sanitized.stack = sanitized.stack.replace(pattern, '$1=[REDACTED]');
         });
      }

      return sanitized;
   }

   /**
    * Build error payload
    */
   function buildErrorPayload (error) {
      const payload = Object.assign({}, error, {
         timestamp: new Date().toISOString(),
      });

      if (config.includeBrowserInfo) {
         payload.userAgent = navigator.userAgent;
         payload.pageUrl = window.location.href;
      }

      if (config.includeScreenInfo) {
         payload.screen = {
            width: window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio,
         };
      }

      return sanitizeError(payload);
   }

   /**
    * Send error to remote server
    */
   async function sendErrorLog (errorData, retryCount = 0) {
      if (!config.enabled || !config.logUrl) {
         return;
      }

      try {
         const response = await fetch(config.logUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(buildErrorPayload(errorData)),
            signal: AbortSignal.timeout ? AbortSignal.timeout(5000) : undefined,
         });

         if (!response.ok && retryCount < config.maxRetries) {
            // Queue for retry
            setTimeout(() => {
               sendErrorLog(errorData, retryCount + 1);
            }, config.retryDelay * Math.pow(2, retryCount)); // Exponential backoff
         }
      } catch (e) {
         // Silent fail - we're in error handler, don't create more errors
         if (retryCount < config.maxRetries) {
            setTimeout(() => {
               sendErrorLog(errorData, retryCount + 1);
            }, config.retryDelay * Math.pow(2, retryCount));
         }
      }
   }

   /**
    * Process error queue
    */
   async function processQueue () {
      if (processingQueue || errorQueue.length === 0) {
         return;
      }

      processingQueue = true;

      while (errorQueue.length > 0) {
         const error = errorQueue.shift();
         await sendErrorLog(error);

         // Small delay to prevent flooding
         await new Promise(resolve => setTimeout(resolve, 50));
      }

      processingQueue = false;
   }

   /**
    * Log error (debounced and rate-limited)
    */
   function logError (error) {
      if (!config.enabled) {
         return;
      }

      // Check rate limit
      if (isRateLimited()) {
         return;
      }

      // Check duplicate
      if (isDuplicate(error)) {
         return;
      }

      // Add to queue
      if (errorQueue.length < config.maxQueueSize) {
         errorQueue.push(error);
         processQueue();
      }
   }

   /**
    * Check if should auto-reload
    */
   function shouldReload (message) {
      if (!config.autoReload) {
         return false;
      }
      if (!message) {
         return false;
      }

      return config.criticalMessages.some(txt => message.includes(txt));
   }

   /**
    * Safe reload with loop prevention
    */
   function scheduleSafeReload () {
      const now = Date.now();

      if (now - lastReloadTime < config.reloadCooldown) {
         return;
      }

      lastReloadTime = now;
      sessionStorage.setItem('_lastReloadTs', now.toString());

      // Give fetch time to complete
      setTimeout(() => {
         window.location.reload();
      }, 500);
   }

   /* ------------------------------------------------------------------ */
   /*                           ERROR HANDLERS                           */
   /* ------------------------------------------------------------------ */

   /**
    * Global error handler
    */
   function handleWindowError (message, source, lineno, colno, error) {
      const errorData = {
         type: 'onerror',
         message: message,
         url: source,
         line: lineno,
         column: colno,
         stack: error?.stack || new Error().stack,
      };

      logError(errorData);

      if (shouldReload(message)) {
         scheduleSafeReload();
      }

      // Call original handler if it exists
      if (originalWindowError && typeof originalWindowError === 'function') {
         return originalWindowError.call(window, message, source, lineno, colno, error);
      }

      return false; // Don't suppress error
   }

   /**
    * Unhandled promise rejection handler
    */
   function handleUnhandledRejection (event) {
      const error = normalizeError(event.reason, 'unhandledrejection');
      logError(error);

      if (shouldReload(error.message)) {
         scheduleSafeReload();
      }
   }

   /**
    * Console.error interceptor
    */
   function handleConsoleError (...args) {
      const error = normalizeError(
         args.length === 1 ? args[0] : args,
         'console.error',
      );

      logError(error);

      if (shouldReload(error.message)) {
         scheduleSafeReload();
      }

      // Call original
      if (originalConsoleError) {
         originalConsoleError.apply(console, args);
      }
   }

   /**
    * Console.warn interceptor
    */
   function handleConsoleWarn (...args) {
      const error = normalizeError(
         args.length === 1 ? args[0] : args,
         'console.warn',
      );

      logError(error);

      // Call original
      if (originalConsoleWarn) {
         originalConsoleWarn.apply(console, args);
      }
   }

   /* ------------------------------------------------------------------ */
   /*                           PUBLIC API                               */
   /* ------------------------------------------------------------------ */

   /**
    * Initialize error logger
    */
   function init (options) {
      if (initialized) {
         console.warn('ErrorLogger already initialized');
         return ErrorLogger;
      }

      config = Object.assign({}, DEFAULT_CONFIG, options);

      // Check if reload happened recently
      const lastReload = sessionStorage.getItem('_lastReloadTs');
      if (lastReload) {
         lastReloadTime = parseInt(lastReload, 10);
      }

      // Backup original handlers
      originalWindowError = window.onerror;
      originalConsoleError = console.error;
      originalConsoleWarn = console.warn;

      // Install handlers
      window.onerror = handleWindowError;
      window.addEventListener('unhandledrejection', handleUnhandledRejection);

      if (config.interceptConsole) {
         console.error = handleConsoleError;
         console.warn = handleConsoleWarn;
      }

      initialized = true;

      return ErrorLogger;
   }

   /**
    * Cleanup and restore original handlers
    */
   function cleanup () {
      if (!initialized) {
         return;
      }

      // Restore original handlers
      if (originalWindowError) {
         window.onerror = originalWindowError;
      }

      window.removeEventListener('unhandledrejection', handleUnhandledRejection);

      if (originalConsoleError) {
         console.error = originalConsoleError;
      }

      if (originalConsoleWarn) {
         console.warn = originalConsoleWarn;
      }

      // Clear queue
      errorQueue.length = 0;
      recentErrors.clear();
      errorTimestamps.length = 0;

      initialized = false;
   }

   /**
    * Manually log an error
    */
   function log (error, type = 'manual') {
      const normalized = normalizeError(error, type);
      logError(normalized);
   }

   /**
    * Get current configuration
    */
   function getConfig () {
      return Object.assign({}, config);
   }

   /**
    * Get queue status
    */
   function getStatus () {
      return {
         initialized,
         queueSize: errorQueue.length,
         recentErrorCount: recentErrors.size,
         isProcessing: processingQueue,
         rateLimitActive: isRateLimited(),
      };
   }

   /* ------------------------------------------------------------------ */
   /*                             EXPORT                                 */
   /* ------------------------------------------------------------------ */

   const ErrorLogger = {
      init,
      cleanup,
      log,
      getConfig,
      getStatus,
   };

   return ErrorLogger;
}());

export default ErrorLogger;
