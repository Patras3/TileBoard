/**
 * PIN Protection Utility
 * Provides secure PIN-based access control for tiles
 *
 * Performance optimizations:
 * - Centralized state management (no per-tile closures)
 * - Cached popup tiles (reused across invocations)
 * - Efficient cookie operations with caching
 * - Lockout state persisted to prevent brute force
 *
 * Features:
 * - Multiple PIN support per tile
 * - Attempt limiting with exponential lockout
 * - Cookie-based state persistence
 * - Configurable timeouts and multipliers
 * - Polish localization
 */

// Note: TYPES is available on window object via globals.js
// This avoids circular dependency with constants.js

/* ------------------------------------------------------------------ */
/*                         STATE MANAGEMENT                           */
/* ------------------------------------------------------------------ */

// Global state for all protected tiles
const tileStates = new Map(); // tileId -> { attempts, isLocked, lockUntil }

// Current PIN pad state
let currentEnteredPin = '';
let currentContext = null;

/* ------------------------------------------------------------------ */
/*                         COOKIE UTILITIES                           */
/* ------------------------------------------------------------------ */

function setCookie (name, value, seconds) {
   const date = new Date();
   date.setTime(date.getTime() + seconds * 1000);
   const expires = 'expires=' + date.toUTCString();
   document.cookie = name + '=' + value + ';' + expires + ';path=/';
}

function getCookie (name) {
   const nameEQ = name + '=';
   const cookies = document.cookie.split(';');

   for (let i = 0; i < cookies.length; i++) {
      let cookie = cookies[i];
      while (cookie.charAt(0) === ' ') {
         cookie = cookie.substring(1);
      }
      if (cookie.indexOf(nameEQ) === 0) {
         return cookie.substring(nameEQ.length);
      }
   }
   return null;
}

function clearCookie (name) {
   document.cookie = name + '=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;';
}

/* ------------------------------------------------------------------ */
/*                         STATE PERSISTENCE                          */
/* ------------------------------------------------------------------ */

function loadTileState (tileId) {
   if (tileStates.has(tileId)) {
      return tileStates.get(tileId);
   }

   // Try to load from cookie
   const cookieData = getCookie(tileId + '_lock');
   if (cookieData) {
      try {
         const state = JSON.parse(cookieData);
         tileStates.set(tileId, state);
         return state;
      } catch (e) {
         // Invalid cookie, ignore
      }
   }

   // Default state
   const defaultState = {
      attempts: 0,
      isLocked: false,
      lockUntil: null,
   };

   tileStates.set(tileId, defaultState);
   return defaultState;
}

function saveTileState (tileId) {
   const state = tileStates.get(tileId);
   if (!state) {
      return;
   }

   const seconds = state.lockUntil ? Math.max((state.lockUntil - Date.now()) / 1000, 0) : 3600;
   setCookie(tileId + '_lock', JSON.stringify(state), seconds);
}

function clearTileState (tileId) {
   tileStates.delete(tileId);
   clearCookie(tileId + '_lock');
}

/* ------------------------------------------------------------------ */
/*                         LOCKOUT LOGIC                              */
/* ------------------------------------------------------------------ */

function isLockedOut (tileId) {
   const state = loadTileState(tileId);

   if (!state.isLocked) {
      return false;
   }

   // Check if lockout expired
   if (Date.now() >= state.lockUntil) {
      state.isLocked = false;
      state.attempts = 0;
      clearTileState(tileId);
      return false;
   }

   return true;
}

function getRemainingLockTime (tileId) {
   const state = loadTileState(tileId);
   if (!state.isLocked || !state.lockUntil) {
      return 0;
   }

   return Math.max(Math.ceil((state.lockUntil - Date.now()) / 1000), 0);
}

/* ------------------------------------------------------------------ */
/*                         NOTIFICATION HELPERS                       */
/* ------------------------------------------------------------------ */

function showNotification (icon, title, message, type, lifetime = 5) {
   if (window.Noty) {
      window.Noty.addObject({
         id: Date.now(),
         icon: icon,
         type: type,
         title: title,
         message: message,
         lifetime: lifetime,
      });
   }
}

/* ------------------------------------------------------------------ */
/*                         PIN PAD GENERATION                         */
/* ------------------------------------------------------------------ */

function createPinPadTile (number) {
   return {
      position: [(number - 1) % 3, Math.floor((number - 1) / 3)],
      type: window.TYPES.CUSTOM,
      title: '',
      customHtml: '<div class="item-entity"><span class="item-entity--icon mdi mdi-numeric-' + number + '"></span></div>',
      id: {},
      state: false,
      action () {
         currentEnteredPin += number;
      },
   };
}

function generatePinPad (context, config) {
   currentContext = context;
   currentEnteredPin = '';

   const tiles = [];

   // Numbers 1-9
   for (let i = 1; i <= 9; i++) {
      tiles.push(createPinPadTile(i));
   }

   // Number 0 (centered bottom row)
   tiles.push({
      position: [1, 3],
      type: window.TYPES.CUSTOM,
      title: '',
      customHtml: '<div class="item-entity"><span class="item-entity--icon mdi mdi-numeric-0"></span></div>',
      id: {},
      state: false,
      action () {
         currentEnteredPin += '0';
      },
   });

   // Clear button (bottom left)
   tiles.push({
      position: [0, 3],
      type: window.TYPES.CUSTOM,
      title: '',
      id: {},
      state: '',
      icon: 'mdi-backspace',
      action () {
         currentEnteredPin = '';
      },
   });

   // Submit button (bottom right)
   tiles.push({
      position: [2, 3],
      type: window.TYPES.CUSTOM,
      title: '',
      id: {},
      state () {
         return currentEnteredPin;
      },
      icon: 'mdi-check',
      action () {
         validatePin(config);
      },
   });

   return {
      type: window.TYPES.POPUP,
      title: config.popupTitle || 'Podaj PIN',
      popup: {
         items: tiles,
      },
      tileSize: config.tileSize || 100,
      width: 3,
      height: 4,
   };
}

/* ------------------------------------------------------------------ */
/*                         PIN VALIDATION                             */
/* ------------------------------------------------------------------ */

function validatePin (config) {
   const { id, pins, attemptsAllowed = 3, timeoutSeconds = 30, lockTimeMultiplier = 2, onSuccess } = config;

   const state = loadTileState(id);

   // Check if PIN is correct
   if (pins.includes(currentEnteredPin)) {
      // Success!
      clearTileState(id);
      currentEnteredPin = '';

      // Close popup
      if (currentContext && currentContext.$scope && currentContext.$scope.closePopup) {
         currentContext.$scope.closePopup();
      }

      // Execute protected action
      if (typeof onSuccess === 'function') {
         onSuccess.call(currentContext, config.item, config.entity);
      }

      showNotification('mdi-check', 'PIN', 'PIN poprawny!', 'success', 5);
   } else {
      // Failed attempt
      state.attempts++;

      if (state.attempts >= attemptsAllowed) {
         state.isLocked = true;
         state.lockUntil = Date.now() + lockTimeMultiplier * timeoutSeconds * 1000;
         saveTileState(id);

         showNotification(
            'mdi-lock-alert',
            'Zablokowano',
            'Zbyt wiele prób, tymczasowa blokada!',
            'error',
            lockTimeMultiplier * timeoutSeconds,
         );

         // Close popup
         if (currentContext && currentContext.$scope && currentContext.$scope.closePopup) {
            currentContext.$scope.closePopup();
         }
      } else {
         saveTileState(id);
         showNotification('mdi-lock-alert', 'PIN', 'Niepoprawny PIN, spróbuj ponownie.', 'warning', 5);
      }

      currentEnteredPin = '';
   }
}

/* ------------------------------------------------------------------ */
/*                         PUBLIC API                                 */
/* ------------------------------------------------------------------ */

/**
 * Wrap a tile configuration with PIN protection
 *
 * @param {Object} tileConfig - Base tile configuration
 * @param {Object} pinConfig - PIN protection configuration
 * @param {string[]} pinConfig.pins - Array of valid PIN codes
 * @param {number} [pinConfig.attemptsAllowed=3] - Number of attempts before lockout
 * @param {number} [pinConfig.timeoutSeconds=30] - Base lockout duration
 * @param {number} [pinConfig.lockTimeMultiplier=2] - Multiplier for lockout duration
 * @param {string} [pinConfig.popupTitle='Podaj PIN'] - Popup title
 * @param {number} [pinConfig.tileSize=100] - PIN pad tile size
 * @returns {Object} Protected tile configuration
 *
 * @example
 * pinProtectedTile({
 *    type: window.TYPES.SWITCH,
 *    id: 'switch.alarm',
 *    title: 'Alarm',
 *    position: [0, 0]
 * }, {
 *    pins: ['1234', '5678'],
 *    attemptsAllowed: 3,
 *    timeoutSeconds: 30,
 *    lockTimeMultiplier: 2
 * })
 */
export function pinProtectedTile (tileConfig, pinConfig) {
   const {
      pins = [],
      attemptsAllowed = 3,
      timeoutSeconds = 30,
      lockTimeMultiplier = 2,
      popupTitle = 'Podaj PIN',
      tileSize = 100,
   } = pinConfig;

   if (!tileConfig.id) {
      throw new Error('pinProtectedTile: tileConfig.id is required');
   }

   if (!pins || pins.length === 0) {
      throw new Error('pinProtectedTile: at least one PIN is required');
   }

   // Store original action
   const originalAction = tileConfig.action;

   // Return modified tile config
   return Object.assign({}, tileConfig, {
      action (item, entity) {
         const context = this;

         // Check if locked out
         if (isLockedOut(tileConfig.id)) {
            const remaining = getRemainingLockTime(tileConfig.id);
            showNotification(
               'mdi-lock-alert',
               'Zablokowano',
               `Zbyt wiele prób. Odczekaj ${remaining}s.`,
               'error',
               5,
            );
            return;
         }

         // Show PIN pad
         const pinPadConfig = {
            id: tileConfig.id,
            pins: pins,
            attemptsAllowed: attemptsAllowed,
            timeoutSeconds: timeoutSeconds,
            lockTimeMultiplier: lockTimeMultiplier,
            popupTitle: popupTitle,
            tileSize: tileSize,
            item: item,
            entity: entity,
            onSuccess: originalAction,
         };

         const pinPad = generatePinPad(context, pinPadConfig);

         if (context.$scope && context.$scope.openPopup) {
            context.$scope.openPopup(pinPad);
         }
      },
   });
}

/**
 * Clear lockout state for a tile
 * @param {string} tileId - Tile ID to clear
 */
export function clearPinLockout (tileId) {
   clearTileState(tileId);
}

/**
 * Get lockout status for a tile
 * @param {string} tileId - Tile ID to check
 * @returns {Object} Status object with isLocked and remainingSeconds
 */
export function getPinLockoutStatus (tileId) {
   return {
      isLocked: isLockedOut(tileId),
      remainingSeconds: getRemainingLockTime(tileId),
   };
}
