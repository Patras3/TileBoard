/**
 * Light Track Tile Helpers - Grid-based track light control
 *
 * Performance optimizations:
 * - Single popup instance with reusable layout
 * - No unnecessary state polling
 * - Simple toggle actions without complex logic
 * - Auto-close timeout to prevent memory leaks
 *
 * Features:
 * - Grid-based light track layout
 * - Individual light control in popup
 * - Main light markers with different icons
 * - Auto-closing popup (configurable timeout)
 * - Toggle main switch action
 * - Configurable grid layouts
 */

/* ------------------------------------------------------------------ */
/*                          SHARED UTILITIES                          */
/* ------------------------------------------------------------------ */

/**
 * Create a single light point for the grid
 * Performance: Minimal object creation, simple state-based icons
 */
function createLightPoint (config) {
   const {
      x,
      y,
      id,
      isMain = false,
      hidden = false,
      size = 10,
   } = config;

   return {
      position: [x, y],
      title: '',
      size,
      id,
      type: window.TYPES.LIGHT,
      hidden,
      states: {
         on: 'Wł.',
         off: 'Wył.',
      },
      icons: {
         on: isMain ? 'mdi-track-light' : 'mdi-lightbulb-spot',
         off: isMain ? 'mdi-track-light-off' : 'mdi-lightbulb-spot-off',
      },
   };
}

/**
 * Create horizontal layout of lights
 * Performance: Simple loop, no complex positioning logic
 */
function createHorizontalLayout (config) {
   const {
      count,
      y,
      entityPrefix,
      mainIndexes = [],
      hidden = false,
      reverse = false,
   } = config;

   const lights = [];

   for (let i = 1; i <= count; i++) {
      const x = reverse ? (count - i) : (i - 1);
      lights.push(createLightPoint({
         x,
         y,
         id: `${entityPrefix}${i}`,
         isMain: mainIndexes.includes(i),
         hidden,
      }));
   }

   return lights;
}

/**
 * Create vertical layout of lights
 * Performance: Simple loop, no complex positioning logic
 */
function createVerticalLayout (config) {
   const {
      count,
      x,
      entityPrefix,
      mainIndexes = [],
      hidden = false,
      reverse = false,
   } = config;

   const lights = [];

   for (let i = 1; i <= count; i++) {
      const y = reverse ? (count - i) : (i - 1);
      lights.push(createLightPoint({
         x,
         y,
         id: `${entityPrefix}${i}`,
         isMain: mainIndexes.includes(i),
         hidden,
      }));
   }

   return lights;
}

/* ------------------------------------------------------------------ */
/*                      LIGHT TRACK TILE                              */
/* ------------------------------------------------------------------ */

/**
 * Create light track tile with grid popup
 *
 * @param {Object} config - Configuration object
 * @param {string} config.id - Main switch entity ID
 * @param {string} config.title - Tile title
 * @param {number} config.x - Tile X position
 * @param {number} config.y - Tile Y position
 * @param {Array} config.lights - Array of light configurations
 * @param {number} [config.popupWidth=13] - Popup grid width
 * @param {number} [config.popupHeight=7] - Popup grid height
 * @param {number} [config.tileSize=80] - Light tile size in popup
 * @param {number} [config.popupTimeout=60000] - Auto-close timeout (ms)
 * @param {boolean} [config.hidden=false] - Hide tile
 *
 * Performance:
 * - Auto-close timeout prevents memory leaks
 * - Simple toggle actions without complex state management
 * - Reusable light point components
 */
export function createLightTrackTile (config) {
   const {
      id,
      title,
      x,
      y,
      lights,
      popupWidth = 13,
      popupHeight = 7,
      tileSize = 80,
      popupTimeout = 60000,
      hidden = false,
   } = config;

   return {
      position: [x, y],
      type: window.TYPES.POPUP,
      id,
      hidden,
      title,
      icons: {
         on: 'mdi-track-light',
         off: 'mdi-track-light-off',
      },
      states: {
         on: 'Włączone',
         off: 'Wyłączone',
      },
      state: function (item, entity) {
         return item.states[entity.state];
      },
      action: function (item, entity) {
         // Toggle main switch
         this.apiRequest({
            type: 'call_service',
            domain: 'light',
            service: 'toggle',
            service_data: {
               entity_id: item.id,
            },
         });
      },
      secondaryAction: function (item, entity) {
         // Open popup and auto-close after timeout
         this.$scope.openPopup(item, entity);

         if (popupTimeout > 0) {
            this.$scope.popupTimeout = setTimeout(function () {
               this.$scope.closePopup();
            }.bind(this), popupTimeout);
         }
      },
      popup: {
         tileSize,
         height: popupHeight,
         width: popupWidth,
         items: lights,
      },
   };
}

/* ------------------------------------------------------------------ */
/*                      PRE-CONFIGURED LAYOUTS                        */
/* ------------------------------------------------------------------ */

/**
 * Create lights for standard two-area track (salon + kitchen)
 * This is a common pattern: horizontal salon lights + vertical kitchen lights
 *
 * @param {Object} config - Configuration object
 * @param {number} config.salonCount - Number of salon lights
 * @param {Array} config.salonMainIndexes - Indexes of main salon lights
 * @param {string} config.salonPrefix - Entity prefix for salon lights
 * @param {number} config.kitchenCount - Number of kitchen lights
 * @param {Array} config.kitchenMainIndexes - Indexes of main kitchen lights
 * @param {string} config.kitchenPrefix - Entity prefix for kitchen lights
 * @param {boolean} [config.hidden=false] - Hide all lights
 * @param {boolean} [config.reverseSalon=false] - Reverse salon order (right to left)
 * @param {boolean} [config.reverseKitchen=false] - Reverse kitchen order (bottom to top)
 */
export function createDualAreaLights (config) {
   const {
      salonCount,
      salonMainIndexes,
      salonPrefix,
      kitchenCount,
      kitchenMainIndexes,
      kitchenPrefix,
      hidden = false,
      reverseSalon = false,
      reverseKitchen = false,
      salonY = 6,
      kitchenX = 12,
   } = config;

   const lights = [];

   // Salon lights: horizontal at bottom
   lights.push(...createHorizontalLayout({
      count: salonCount,
      y: salonY,
      entityPrefix: salonPrefix,
      mainIndexes: salonMainIndexes,
      hidden,
      reverse: reverseSalon,
   }));

   // Kitchen lights: vertical on right
   lights.push(...createVerticalLayout({
      count: kitchenCount,
      x: kitchenX,
      entityPrefix: kitchenPrefix,
      mainIndexes: kitchenMainIndexes,
      hidden,
      reverse: reverseKitchen,
   }));

   return lights;
}

/**
 * Helper function to create light track tile with dual area layout
 * Combines createLightTrackTile with createDualAreaLights for convenience
 */
export function createDualAreaLightTrack (config) {
   const {
      id,
      title,
      x,
      y,
      salonCount = 12,
      salonMainIndexes = [3, 6, 9, 12],
      salonPrefix = 'light.szyna_salon_',
      kitchenCount = 7,
      kitchenMainIndexes = [1, 4, 7],
      kitchenPrefix = 'light.szyna_kuchnia_',
      hidden = false,
      reverseSalon = true,  // Default to reversed (right to left)
      reverseKitchen = false,
      popupTimeout = 60000,
   } = config;

   const lights = createDualAreaLights({
      salonCount,
      salonMainIndexes,
      salonPrefix,
      kitchenCount,
      kitchenMainIndexes,
      kitchenPrefix,
      hidden,
      reverseSalon,
      reverseKitchen,
   });

   return createLightTrackTile({
      id,
      title,
      x,
      y,
      lights,
      popupWidth: 13,
      popupHeight: 7,
      tileSize: 80,
      popupTimeout,
      hidden,
   });
}

/* ------------------------------------------------------------------ */
/*                      INDIVIDUAL HELPERS                            */
/* ------------------------------------------------------------------ */

/**
 * Export individual helper functions for advanced use cases
 */
export { createLightPoint, createHorizontalLayout, createVerticalLayout };
