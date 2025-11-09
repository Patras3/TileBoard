/**
 * Cover Tile Helper
 * Creates standardized cover/blind/curtain control tiles
 */

export function createCoverTile (config) {
   const {
      id,
      title,
      position,
      hidden,
      states = { open: 'Otwarte', closed: 'Zamknięte', opening: '...' },
      icons = {
         closed: 'mdi-curtains-closed',
         open: 'mdi-curtains',
         opening: 'mdi-timer-sand',
      },
   } = config;

   return {
      position,
      type: window.TYPES.CUSTOM,
      title,
      id,
      hidden,
      action: function (item, entity) {
         this.apiRequest({
            type: 'call_service',
            domain: 'cover',
            service: entity.state === 'closed' ? 'open_cover' : 'close_cover',
            service_data: {
               entity_id: item.id,
            },
         });
      },
      states,
      icons,
      secondaryAction: function (item, entity) {
         return this.$scope.openPopupIframe(item, entity);
      },
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createCoverTile = createCoverTile;
}
