/**
 * Appliance Tile Helper (Washing Machine, Dryer, etc.)
 * Creates tiles for appliances with job state and completion time
 */

export function createApplianceTile (config) {
   const {
      id,
      title,
      position,
      icon,
      completionSensor,
      states,
      hiddenStates = ['finished', 'none', 'unavailable'],
   } = config;

   // Helper to format time remaining
   function formatTimeRemaining (completionTime) {
      const currentTime = new Date();
      const timeDifference = new Date(completionTime - currentTime);

      const hours = timeDifference.getUTCHours();
      const minutes = timeDifference.getUTCMinutes();

      let timeString = '';
      if (hours > 0) {
         timeString += hours + ' godziny ';
      }
      if (minutes > 0 || hours === 0) {
         timeString += minutes + ' minut';
      }
      return timeString;
   }

   return {
      position,
      title,
      id,
      type: window.TYPES.CUSTOM,
      hidden: function () {
         const state = this.$scope.states[id].state;
         return hiddenStates.includes(state);
      },
      customHtml: function (item, entity) {
         if (entity.state === 'none') {
            return `<div class="item-entity">
               <span class="item-entity--icon mdi ${icon}"></span>
            </div>`;
         }

         const completionTimeEntity = this.$scope.states[completionSensor];
         const completionTime = new Date(completionTimeEntity?.state);
         const timeString = formatTimeRemaining(completionTime);

         return `<div class="item-entity">
            <span class="item-entity--icon mdi ${icon}"></span>
         </div><br/><div>${timeString}</div>`;
      },
      states,
      icons: Object.fromEntries(
         Object.keys(states).map(key => [
            key,
            (key === 'finished' || key === 'finish')
               ? 'mdi-checkbox-marked-circle-outline'
               : 'mdi-checkbox-blank-circle-outline',
         ]),
      ),
   };
}

// Export to window
if (typeof window !== 'undefined') {
   window.createApplianceTile = createApplianceTile;
}
