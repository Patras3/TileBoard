/**
 * LocationDetector - Location detection service for multi-panel setups
 *
 * Performance optimizations:
 * - Cached result in window object (O(1) subsequent access)
 * - Cookie-based persistence (no repeated URL parsing)
 * - Single URL parse on initialization
 *
 * Features:
 * - URL parameter detection (?location=upstairs)
 * - Cookie persistence
 * - Window object caching for fast access
 * - Configurable location names
 * - Helper functions for location-based tile visibility
 */

const LocationDetector = (function () {
   /* ------------------------------------------------------------------ */
   /*                             CONSTANTS                              */
   /* ------------------------------------------------------------------ */

   const DEFAULT_CONFIG = {
      enabled: true,
      urlParameter: 'location',
      cookieExpiry: 7, // days
      locations: {
         upstairs: 'upstair', // Note: keeping original spelling for compatibility
         downstairs: 'downstairs',
      },
      defaultLocation: 'downstairs',
   };

   /* ------------------------------------------------------------------ */
   /*                               STATE                                */
   /* ------------------------------------------------------------------ */

   let config = Object.assign({}, DEFAULT_CONFIG);
   let currentLocation = null;
   let initialized = false;

   /* ------------------------------------------------------------------ */
   /*                          UTILITY FUNCTIONS                         */
   /* ------------------------------------------------------------------ */

   /**
    * Get URL parameter value
    */
   function getURLParameter (name) {
      try {
         const params = new URLSearchParams(window.location.search);
         return params.get(name);
      } catch (e) {
         // Fallback for older browsers
         const regex = new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)');
         const match = regex.exec(window.location.search);
         return match ? decodeURIComponent(match[1].replace(/\+/g, '%20')) : null;
      }
   }

   /**
    * Set cookie
    */
   function setCookie (name, value, days) {
      let expires = '';

      if (days) {
         const date = new Date();
         date.setTime(date.getTime() + days * 24 * 60 * 60 * 1000);
         expires = '; expires=' + date.toUTCString();
      }

      document.cookie = name + '=' + (value || '') + expires + '; path=/';
   }

   /**
    * Get cookie
    */
   function getCookie (name) {
      const nameEQ = name + '=';
      const cookies = document.cookie.split(';');

      for (let i = 0; i < cookies.length; i++) {
         let cookie = cookies[i];

         while (cookie.charAt(0) === ' ') {
            cookie = cookie.substring(1, cookie.length);
         }

         if (cookie.indexOf(nameEQ) === 0) {
            return cookie.substring(nameEQ.length, cookie.length);
         }
      }

      return null;
   }

   /**
    * Detect and cache current location
    */
   function detectLocation () {
      // 1. Check if already cached in window object
      if (window.locationParam !== undefined) {
         return window.locationParam;
      }

      // 2. Check cookie
      const cookieValue = getCookie(config.urlParameter);

      if (cookieValue !== null) {
         window.locationParam = cookieValue;
         return cookieValue;
      }

      // 3. Check URL parameter
      const urlValue = getURLParameter(config.urlParameter);

      if (urlValue) {
         // Cache in window and cookie
         window.locationParam = urlValue;
         setCookie(config.urlParameter, urlValue, config.cookieExpiry);
         return urlValue;
      }

      // 4. Use default
      const defaultValue = config.defaultLocation;
      window.locationParam = defaultValue;
      setCookie(config.urlParameter, defaultValue, config.cookieExpiry);

      return defaultValue;
   }

   /* ------------------------------------------------------------------ */
   /*                           PUBLIC API                               */
   /* ------------------------------------------------------------------ */

   /**
    * Initialize location detector
    */
   function init (options) {
      if (initialized) {
         console.warn('LocationDetector already initialized');
         return LocationDetector;
      }

      config = Object.assign({}, DEFAULT_CONFIG, options);

      if (config.enabled) {
         currentLocation = detectLocation();
      }

      initialized = true;

      return LocationDetector;
   }

   /**
    * Get current location
    */
   function getLocation () {
      if (!initialized) {
         init();
      }

      return currentLocation || detectLocation();
   }

   /**
    * Check if current location matches
    */
   function isLocation (locationName) {
      return getLocation() === locationName;
   }

   /**
    * Check if upstairs (backward compatibility)
    */
   function isUpstairs () {
      return isLocation(config.locations.upstairs);
   }

   /**
    * Check if downstairs (backward compatibility)
    */
   function isDownstairs () {
      return !isUpstairs();
   }

   /**
    * Set location manually (updates URL, cookie, and cache)
    */
   function setLocation (locationName) {
      if (!config.enabled) {
         return;
      }

      currentLocation = locationName;
      window.locationParam = locationName;
      setCookie(config.urlParameter, locationName, config.cookieExpiry);

      // Update URL without reload
      if (window.history && window.history.replaceState) {
         const url = new URL(window.location);
         url.searchParams.set(config.urlParameter, locationName);
         window.history.replaceState({}, '', url);
      }
   }

   /**
    * Clear location (resets to default)
    */
   function clearLocation () {
      setLocation(config.defaultLocation);
   }

   /**
    * Get configuration
    */
   function getConfig () {
      return Object.assign({}, config);
   }

   /* ------------------------------------------------------------------ */
   /*                             EXPORT                                 */
   /* ------------------------------------------------------------------ */

   const LocationDetector = {
      init,
      getLocation,
      isLocation,
      isUpstairs,
      isDownstairs,
      setLocation,
      clearLocation,
      getConfig,
   };

   return LocationDetector;
}());

export default LocationDetector;
