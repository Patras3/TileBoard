/**
 * Light Tile Helper
 * Creates standardized light control tiles with optional brightness slider
 */

export function createLightTile (config) {
   const {
      id,
      title,
      position,
      icon,
      iconOff,
      hidden,
      hasBrightness = true,
      states = { on: 'Wł.', off: 'Wył.' },
   } = config;

   const tile = {
      position,
      title,
      id,
      type: window.TYPES.LIGHT,
      states,
      icons: {
         on: icon || 'mdi-lightbulb',
         off: iconOff || (icon ? `${icon}-outline` : 'mdi-lightbulb-outline'),
      },
   };

   if (hidden !== undefined) {
      tile.hidden = hidden;
   }

   if (hasBrightness) {
      tile.sliders = [{
         title: 'Brightness',
         field: 'brightness',
         max: 255,
         min: 0,
         step: 5,
         request: {
            type: 'call_service',
            domain: 'light',
            service: 'turn_on',
            field: 'brightness',
         },
      }];
   }

   return tile;
}

// Export to window
if (typeof window !== 'undefined') {
   window.createLightTile = createLightTile;
}
