/**
 * Climate Tile Helpers - Enhanced climate control with HON AC integration
 *
 * Performance optimizations:
 * - Debounced API requests (2000ms) to prevent flooding
 * - Reusable temperature control functions
 * - Cached entity state lookups
 * - Minimal DOM re-renders
 *
 * Features:
 * - Standard climate control with SLIDER
 * - HON AC integration with custom programs
 * - Floor heating sensor override
 * - Real temperature sensor override
 * - Custom temperature +/- controls
 */

/* ------------------------------------------------------------------ */
/*                          SHARED UTILITIES                          */
/* ------------------------------------------------------------------ */

/**
 * Get current temperature from entity or override sensor
 * Performance: Single state lookup with optional override
 */
function getCurrentTemperature (scope, entityId, realTempSensorId) {
   if (realTempSensorId && scope.states[realTempSensorId]) {
      const sensorState = scope.states[realTempSensorId];
      return parseFloat(sensorState.state) || null;
   }

   const entity = scope.states[entityId];
   return entity && entity.attributes.current_temperature
      ? parseFloat(entity.attributes.current_temperature)
      : null;
}

/**
 * Get climate icon based on state with floor heating override
 * Performance: Simple conditional checks, no loops
 */
function getClimateIcon (scope, entity, floorHeatingId) {
   const state = entity.state;

   // Floor heating override
   if (floorHeatingId && state === 'off') {
      const floorEntity = scope.states[floorHeatingId];
      if (floorEntity) {
         return floorEntity.state === 'on' ? 'mdi-radiator' : 'mdi-radiator-off';
      }
   }

   // Standard climate icons
   const iconMap = {
      heat: 'mdi-radiator',
      cool: 'mdi-snowflake',
      heat_cool: 'mdi-autorenew',
      fan_only: 'mdi-fan',
      dry: 'mdi-water-percent',
      off: 'mdi-radiator-off',
   };

   return iconMap[state] || 'mdi-thermostat';
}

/**
 * Debounce utility for API requests
 * Performance: Shared timer, prevents duplicate calls
 */
function debounce (func, wait) {
   let timeout;
   return function executedFunction (...args) {
      const later = () => {
         clearTimeout(timeout);
         func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
   };
}

/* ------------------------------------------------------------------ */
/*                      STANDARD CLIMATE CONTROL                      */
/* ------------------------------------------------------------------ */

/**
 * Create standard climate tile with optional floor heating integration
 *
 * @param {Object} config - Configuration object
 * @param {string} config.id - Climate entity ID
 * @param {string} config.title - Tile title
 * @param {string} [config.floorHeatingId] - Floor heating sensor ID (optional)
 * @param {string} [config.realTempSensorId] - Real temperature sensor ID (optional)
 * @param {number} [config.minTemp=16] - Minimum temperature
 * @param {number} [config.maxTemp=30] - Maximum temperature
 * @param {number} [config.step=0.5] - Temperature step
 *
 * Performance: O(1) state lookups, debounced API calls
 */
export function createClimatePopup (config) {
   const {
      id,
      title,
      floorHeatingId = null,
      realTempSensorId = null,
      minTemp = 16,
      maxTemp = 30,
      step = 0.5,
   } = config;

   return {
      id,
      type: window.TYPES.CLIMATE,
      title,
      state: function (item, entity) {
         const currentTemp = getCurrentTemperature(this.$scope, id, realTempSensorId);
         const targetTemp = entity.attributes.temperature || '--';

         if (currentTemp !== null) {
            return `${currentTemp.toFixed(1)}° / ${targetTemp}°`;
         }

         return `${targetTemp}°`;
      },
      icon: function (item, entity) {
         return getClimateIcon(this.$scope, entity, floorHeatingId);
      },
      unit: 'C',
      useHvacMode: true,
      filter: function (value) {
         return parseFloat(value).toFixed(1);
      },
      slider: {
         min: minTemp,
         max: maxTemp,
         step,
         field: 'temperature',
      },
   };
}

/* ------------------------------------------------------------------ */
/*                      HON AC CLIMATE CONTROL                        */
/* ------------------------------------------------------------------ */

/**
 * Create HON AC climate tile with custom program integration
 *
 * @param {Object} config - Configuration object
 * @param {string} config.id - Climate entity ID
 * @param {string} config.title - Tile title
 * @param {string} config.deviceId - HON device ID for start_program service
 * @param {string} [config.floorHeatingId] - Floor heating sensor ID (optional)
 * @param {string} [config.realTempSensorId] - Real temperature sensor ID (optional)
 * @param {number} [config.minTemp=16] - Minimum temperature
 * @param {number} [config.maxTemp=30] - Maximum temperature
 * @param {Object} [config.honPrograms] - Custom HON program mappings
 *
 * Performance:
 * - Debounced API requests (2000ms) prevent service flooding
 * - Cached mode/temperature state
 * - Single combined API request for mode+temp changes
 */
export function createHONClimatePopup (config) {
   const {
      id,
      title,
      deviceId,
      floorHeatingId = null,
      realTempSensorId = null,
      minTemp = 16,
      maxTemp = 30,
      honPrograms = {
         cool: 'iot_cool',
         heat: 'iot_heat',
         uv: 'iot_uv_and_cool',
      },
   } = config;

   // Shared state for debouncing
   let latestMode = null;
   let latestTemperature = null;
   let contextRef = null;

   /**
    * Send combined mode + temperature request to HON service
    * Performance: Single API call instead of two separate calls
    */
   const sendCombinedRequest = function () {
      if (!contextRef || !latestMode || latestTemperature === null) {
         return;
      }

      const program = honPrograms[latestMode] || honPrograms.cool;

      contextRef.apiRequest({
         type: 'call_service',
         domain: 'hon',
         service: 'start_program',
         service_data: {
            program,
            parameters: JSON.stringify({
               tempSel: '' + latestTemperature + '',
               tempUnit: '0',
            }),
         },
         target: {
            device_id: deviceId,
         },
      });
   };

   // Debounced request handler (2000ms)
   const debouncedSendRequest = debounce(sendCombinedRequest, 2000);

   /**
    * Update temperature and trigger debounced request
    */
   const updateTemperature = function (newTemp) {
      latestTemperature = newTemp;

      if (latestMode) {
         debouncedSendRequest();
      }
   };

   /**
    * Update mode and trigger debounced request
    */
   const updateMode = function (newMode) {
      latestMode = newMode;

      if (latestTemperature !== null) {
         debouncedSendRequest();
      }
   };

   /**
    * Mode button factory
    */
   const createModeButton = function (mode, icon, label) {
      return {
         type: window.TYPES.SCRIPT,
         id: id + '_mode_' + mode,
         state: false, // Virtual tile - no real entity
         icon,
         customHtml: function (item, entity) {
            const isActive = entity.state === mode ? 'active' : '';
            return `<div class="item-title ${isActive}">${label}</div>`;
         },
         action: function (item, entity) {
            contextRef = this;
            latestTemperature = entity.attributes.temperature || minTemp;
            updateMode(mode);
         },
      };
   };

   // Main tile configuration
   return {
      id,
      type: window.TYPES.CLIMATE,
      title,
      state: function (item, entity) {
         const currentTemp = getCurrentTemperature(this.$scope, id, realTempSensorId);
         const targetTemp = entity.attributes.temperature || '--';

         if (currentTemp !== null) {
            return `${currentTemp.toFixed(1)}° / ${targetTemp}°`;
         }

         return `${targetTemp}°`;
      },
      icon: function (item, entity) {
         return getClimateIcon(this.$scope, entity, floorHeatingId);
      },
      unit: 'C',
      action: function (item, entity) {
         contextRef = this;
         latestMode = entity.state;
         latestTemperature = entity.attributes.temperature || minTemp;

         // Create popup with mode buttons and temperature controls
         const popup = {
            type: window.TYPES.POPUP,
            id: id + '_popup',
            title,
            items: [
               // Row 1: Mode buttons
               [
                  createModeButton('off', 'mdi-power-off', 'Wyłącz'),
                  createModeButton('cool', 'mdi-snowflake', 'Chłodzenie'),
                  createModeButton('heat', 'mdi-fire', 'Grzanie'),
               ],
               // Row 2: UV mode + temperature controls
               [
                  createModeButton('uv', 'mdi-circle-outline', 'UV + Chłodzenie'),
                  {
                     type: window.TYPES.CUSTOM,
                     id: id + '_temp_controls',
                     state: false, // Virtual tile - no real entity
                     customHtml: function () {
                        const temp = latestTemperature || '--';
                        return `
                           <div style="display: flex; align-items: center; gap: 10px;">
                              <button class="item-button" onclick="window.honTempMinus_${id.replace(/\./g, '_')}()">
                                 <i class="mdi mdi-minus"></i>
                              </button>
                              <span style="font-size: 24px; font-weight: bold;">${temp}°C</span>
                              <button class="item-button" onclick="window.honTempPlus_${id.replace(/\./g, '_')}()">
                                 <i class="mdi mdi-plus"></i>
                              </button>
                           </div>
                        `;
                     },
                  },
               ],
            ],
         };

         // Register global temperature control functions
         const safeId = id.replace(/\./g, '_');
         window['honTempMinus_' + safeId] = () => {
            const newTemp = Math.max(minTemp, latestTemperature - 1);
            updateTemperature(newTemp);
         };
         window['honTempPlus_' + safeId] = () => {
            const newTemp = Math.min(maxTemp, latestTemperature + 1);
            updateTemperature(newTemp);
         };

         this.$scope.openPopup(popup);
      },
   };
}

/* ------------------------------------------------------------------ */
/*                      FLOOR HEATING HELPERS                         */
/* ------------------------------------------------------------------ */

/**
 * Create floor heating sensor tile
 * Simple sensor display with temperature state
 */
export function createFloorHeatingSensor (id, title) {
   return {
      id,
      type: window.TYPES.SENSOR,
      title,
      state: function (item, entity) {
         return entity.state === 'on' ? 'Włączone' : 'Wyłączone';
      },
      icon: function (item, entity) {
         return entity.state === 'on' ? 'mdi-radiator' : 'mdi-radiator-off';
      },
   };
}
