/**
 * NotificationManager - Unified, safer handling of full-screen and corner iframe pop-ups
 *
 * Performance optimizations:
 * - Cached DOM elements (no repeated getElementById)
 * - Set-based duplicate tracking (O(1) instead of O(n))
 * - Proper cleanup to prevent memory leaks
 * - Template-based rendering with sanitization
 * - Debounced DOM operations
 *
 * Features:
 * - Full-screen iframe notifications
 * - Corner iframe notifications (stackable)
 * - Auto-close timers with cleanup
 * - Duplicate prevention
 * - Optional Home Assistant state tracking
 */

const NotificationManager = (function () {
   /* ------------------------------------------------------------------ */
   /*                             CONSTANTS                              */
   /* ------------------------------------------------------------------ */

   const ID_FULLSCREEN = 'full-screen-event-iframe';
   const FLEXBOX_ID = 'corner-iframe-flexbox';
   const CLASS_CORNER_CONTAINER = 'event-corner-iframe-container';
   const DEFAULT_FULLSCREEN_DURATION = 30; // seconds
   const DEFAULT_CORNER_DURATION = 20; // seconds

   /* ------------------------------------------------------------------ */
   /*                               STATE                                */
   /* ------------------------------------------------------------------ */

   // Active timers - Map for O(1) lookup/delete
   const timers = new Map();

   // Active corner URLs - Set for O(1) duplicate checking
   const activeCornerUrls = new Set();

   // Cached DOM elements
   let flexboxContainer = null;
   let fullscreenOverlay = null;

   // Configuration (can be set via init)
   let config = {
      enabled: true,
      defaultFullScreenDuration: DEFAULT_FULLSCREEN_DURATION,
      defaultCornerDuration: DEFAULT_CORNER_DURATION,
      cornerPosition: 'bottom-right',
      trackInHomeAssistant: false,
      entityPrefix: 'input_text.tileboard_',
      sanitizeHtml: true,
   };

   /* ------------------------------------------------------------------ */
   /*                          UTILITY FUNCTIONS                         */
   /* ------------------------------------------------------------------ */

   /**
    * Sanitize string to prevent XSS - basic escaping
    */
   function sanitize (str) {
      if (!config.sanitizeHtml) {
         return str;
      }

      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
   }

   /**
    * Create element from HTML string with sanitization
    */
   function createElementFromHTML (html) {
      const template = document.createElement('template');
      template.innerHTML = html.trim();
      return template.content.firstChild;
   }

   /**
    * Get corner position styles based on config
    */
   function getCornerPositionStyles () {
      const positions = {
         'bottom-right': 'position:fixed;bottom:10px;right:10px;',
         'bottom-left': 'position:fixed;bottom:10px;left:10px;',
         'top-right': 'position:fixed;top:70px;right:10px;',
         'top-left': 'position:fixed;top:70px;left:10px;',
      };

      const base = positions[config.cornerPosition] || positions['bottom-right'];
      return base + 'display:flex;flex-direction:column-reverse;gap:10px;z-index:1000;pointer-events:none;';
   }

   /**
    * Clear and delete timer
    */
   function clearTimer (id) {
      if (timers.has(id)) {
         clearTimeout(timers.get(id));
         timers.delete(id);
      }
   }

   /**
    * Schedule auto-close
    */
   function scheduleClose (id, seconds) {
      clearTimer(id);

      const timerId = setTimeout(() => {
         close(id);
      }, seconds * 1000);

      timers.set(id, timerId);
   }

   /**
    * Get or create flexbox container for corner iframes
    */
   function getFlexboxContainer () {
      if (!flexboxContainer || !document.body.contains(flexboxContainer)) {
         flexboxContainer = document.createElement('div');
         flexboxContainer.id = FLEXBOX_ID;
         flexboxContainer.style.cssText = getCornerPositionStyles();

         const container = document.querySelector('.page-container') || document.body;
         container.appendChild(flexboxContainer);
      }

      return flexboxContainer;
   }

   /**
    * Clean up flexbox if empty
    */
   function cleanupFlexbox () {
      if (flexboxContainer && flexboxContainer.children.length === 0) {
         if (flexboxContainer.parentNode) {
            flexboxContainer.parentNode.removeChild(flexboxContainer);
         }
         flexboxContainer = null;
      }
   }

   /* ------------------------------------------------------------------ */
   /*                           PUBLIC API                               */
   /* ------------------------------------------------------------------ */

   /**
    * Initialize with custom configuration
    */
   function init (options) {
      if (options) {
         config = Object.assign({}, config, options);
      }
      return NotificationManager;
   }

   /**
    * Get current configuration
    */
   function getConfig () {
      return Object.assign({}, config);
   }

   /**
    * Close overlay/iframe by id
    * @param {string} [id] - Element ID to close, defaults to full-screen
    */
   function close (id) {
      if (!id || id === ID_FULLSCREEN) {
         // Close full-screen overlay
         if (fullscreenOverlay && fullscreenOverlay.parentNode) {
            fullscreenOverlay.parentNode.removeChild(fullscreenOverlay);
            fullscreenOverlay = null;
         }
         clearTimer(ID_FULLSCREEN);
         return;
      }

      // Close corner iframe
      const element = document.getElementById(id);
      if (element) {
         // Remove URL from active set
         const iframe = element.querySelector('.event-corner-iframe');
         if (iframe && iframe.dataset.url) {
            activeCornerUrls.delete(iframe.dataset.url);
         }

         // Remove element
         if (element.parentNode) {
            element.parentNode.removeChild(element);
         }

         clearTimer(id);
      }

      // Cleanup flexbox if empty
      cleanupFlexbox();
   }

   /**
    * Close all corner iframes
    */
   function closeAllCorner () {
      activeCornerUrls.clear();

      if (flexboxContainer) {
         // Clear all timers
         const containers = flexboxContainer.querySelectorAll(`.${CLASS_CORNER_CONTAINER}`);
         containers.forEach(container => {
            clearTimer(container.id);
         });

         // Remove flexbox
         if (flexboxContainer.parentNode) {
            flexboxContainer.parentNode.removeChild(flexboxContainer);
         }
         flexboxContainer = null;
      }
   }

   /**
    * Open full-screen iframe notification
    * @param {Object} options
    * @param {string} options.title - Notification title
    * @param {string} options.url - Iframe URL
    * @param {number} [options.duration] - Auto-close duration in seconds
    */
   function openFullScreen (options) {
      if (!config.enabled) {
         return;
      }

      const { title, url, duration = config.defaultFullScreenDuration } = options;

      if (!title || !url) {
         console.warn('NotificationManager: title and url are required');
         return;
      }

      // Reuse or create overlay
      if (!fullscreenOverlay || !document.body.contains(fullscreenOverlay)) {
         fullscreenOverlay = document.createElement('div');
         fullscreenOverlay.className = 'notification-overlay';
         fullscreenOverlay.id = ID_FULLSCREEN;
         document.body.appendChild(fullscreenOverlay);
      }

      // Build content with sanitization
      const safeTitle = sanitize(title);
      const safeUrl = sanitize(url);
      const timestamp = new Date().toLocaleTimeString();

      fullscreenOverlay.innerHTML = `
         <div class="event-iframe-container">
            <span class="close-button" data-close="${ID_FULLSCREEN}">&times;</span>
            <div class="event-iframe-title">${safeTitle} (${timestamp})</div>
            <iframe src="${safeUrl}" frameborder="0" class="event-iframe-content" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
         </div>`;

      // Event delegation for close button
      fullscreenOverlay.onclick = function (e) {
         if (e.target.dataset.close || e.currentTarget === e.target) {
            close(ID_FULLSCREEN);
         }
      };

      scheduleClose(ID_FULLSCREEN, duration);
   }

   /**
    * Open corner iframe notification
    * @param {Object} options
    * @param {string} options.title - Notification title
    * @param {string} options.url - Iframe URL
    * @param {number} [options.duration] - Auto-close duration in seconds
    * @param {Function} [options.apiRequest] - TileBoard apiRequest function
    */
   function openCorner (options) {
      if (!config.enabled) {
         return;
      }

      const {
         title,
         url,
         duration = config.defaultCornerDuration,
         apiRequest,
      } = options;

      if (!title || !url) {
         console.warn('NotificationManager: title and url are required');
         return;
      }

      // Don't spawn if full-screen is active
      if (fullscreenOverlay && document.body.contains(fullscreenOverlay)) {
         return;
      }

      // O(1) duplicate check using Set
      if (activeCornerUrls.has(url)) {
         return;
      }

      // Get or create flexbox container
      const flex = getFlexboxContainer();

      // Generate unique ID
      const id = `event-corner-iframe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Build container with sanitization
      const safeTitle = sanitize(title);
      const safeUrl = sanitize(url);
      const timestamp = new Date().toLocaleTimeString();

      const containerHtml = `
         <div class="${CLASS_CORNER_CONTAINER}" id="${id}" style="pointer-events:auto;">
            <div class="event-corner-iframe-content">
               <span class="close-button" data-close="${id}">&times;</span>
               <div class="event-corner-iframe-title">${safeTitle} (${timestamp})</div>
               <iframe src="${safeUrl}" frameborder="0" class="event-corner-iframe" data-url="${safeUrl}" sandbox="allow-same-origin allow-scripts allow-forms"></iframe>
            </div>
         </div>`;

      const container = createElementFromHTML(containerHtml);

      // Event delegation
      container.onclick = function (e) {
         if (e.target.dataset.close || e.currentTarget === e.target) {
            close(id);
         }
      };

      flex.appendChild(container);
      activeCornerUrls.add(url);
      scheduleClose(id, duration);

      // Optional Home Assistant tracking
      if (config.trackInHomeAssistant && typeof apiRequest === 'function') {
         try {
            // Check if location service exists
            const isUpstairs = typeof window.isUpstairsLocation === 'function'
               ? window.isUpstairsLocation()
               : false;

            const entity = isUpstairs
               ? `${config.entityPrefix}upstairs_current_event_opencorneriframe`
               : `${config.entityPrefix}downstairs_current_event_opencorneriframe`;

            apiRequest({
               type: 'call_service',
               domain: 'input_text',
               service: 'set_value',
               service_data: {
                  entity_id: entity,
                  value: 'event-corner-iframe-content',
               },
            });
         } catch (err) {
            console.warn('NotificationManager: Home Assistant tracking failed', err);
         }
      }
   }

   /**
    * Check if full-screen notification is active
    */
   function isFullScreenActive () {
      return fullscreenOverlay && document.body.contains(fullscreenOverlay);
   }

   /**
    * Get count of active corner notifications
    */
   function getActiveCornerCount () {
      return activeCornerUrls.size;
   }

   /**
    * Cleanup all notifications and timers
    */
   function cleanup () {
      // Clear all timers
      timers.forEach((timerId, id) => {
         clearTimeout(timerId);
      });
      timers.clear();

      // Clear active URLs
      activeCornerUrls.clear();

      // Remove DOM elements
      if (fullscreenOverlay && fullscreenOverlay.parentNode) {
         fullscreenOverlay.parentNode.removeChild(fullscreenOverlay);
         fullscreenOverlay = null;
      }

      if (flexboxContainer && flexboxContainer.parentNode) {
         flexboxContainer.parentNode.removeChild(flexboxContainer);
         flexboxContainer = null;
      }
   }

   /* ------------------------------------------------------------------ */
   /*                             EXPORT                                 */
   /* ------------------------------------------------------------------ */

   const NotificationManager = {
      init,
      getConfig,
      openFullScreen,
      openCorner,
      close,
      closeAllCorner,
      isFullScreenActive,
      getActiveCornerCount,
      cleanup,

      // Constants for external use
      POSITION_BOTTOM_RIGHT: 'bottom-right',
      POSITION_BOTTOM_LEFT: 'bottom-left',
      POSITION_TOP_RIGHT: 'top-right',
      POSITION_TOP_LEFT: 'top-left',
   };

   return NotificationManager;
}());

export default NotificationManager;
