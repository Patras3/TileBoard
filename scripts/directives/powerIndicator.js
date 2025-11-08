import { App } from '../app';
import { calculateColor, calculateTransparentColor } from '../globals/utils';

/**
 * Power Indicator Directive
 * Displays an animated gradient bar at the bottom of the screen showing power usage
 *
 * Usage in CONFIG:
 * powerIndicator: {
 *    entity: 'sensor.power_usage',
 *    maxPower: 6000,
 *    maxOrangePower: 2500,
 *    height: 10,
 *    position: 'bottom' // or 'top'
 * }
 */

App.directive('powerIndicator', ['$rootScope', function ($rootScope) {
   return {
      restrict: 'E',
      scope: {},
      link (scope, element) {
         let container = null;
         let bar = null;
         let config = null;
         let entityId = null;

         /**
          * Initialize the power indicator
          */
         function init () {
            if (!window.CONFIG || !window.CONFIG.powerIndicator) {
               return;
            }

            config = window.CONFIG.powerIndicator;
            entityId = config.entity;

            if (!entityId) {
               console.warn('powerIndicator: entity is required');
               return;
            }

            createIndicator();
            setupWatcher();
         }

         /**
          * Create DOM elements for the indicator
          */
         function createIndicator () {
            // Create container
            container = document.createElement('div');
            container.id = 'progress-container';

            const height = config.height || 10;
            const position = config.position || 'bottom';
            const zIndex = config.zIndex || 1000;

            container.style.cssText = `
               position: fixed;
               ${position}: 0;
               left: 0;
               width: 100%;
               height: ${height}px;
               overflow: hidden;
               z-index: ${zIndex};
            `;

            // Create progress bar
            bar = document.createElement('div');
            bar.id = 'progress-bar';
            bar.style.cssText = 'height: 100%; width: 100%; position: absolute; background-size: 200% 200%;';

            container.appendChild(bar);

            // Append to page container or body
            const target = document.querySelector('.page-container') || document.body;
            target.appendChild(container);
         }

         /**
          * Update the indicator based on power value
          */
         function updateIndicator (watts) {
            if (!bar || watts === null || watts === undefined) {
               return;
            }

            try {
               // Convert to number if it's a string
               watts = parseFloat(watts);

               if (isNaN(watts)) {
                  return;
               }

               // Calculate colors
               const maxOrangePower = config.maxOrangePower || 2500;
               const maxPower = config.maxPower || 6000;

               const color = config.colorOverride || calculateColor(watts, maxOrangePower, maxPower);
               const transparent = calculateTransparentColor(color, 0.2);

               // Update gradient
               bar.style.backgroundImage = `linear-gradient(270deg, ${color}, ${transparent}, ${color})`;

               // Calculate animation speed (faster = higher power)
               const maxAnimationPower = config.maxAnimationPower || 4000;
               const duration = `${10 - (Math.abs(watts) / maxAnimationPower) * 9}s`;

               // Direction based on sign (import vs export)
               const direction = watts >= 0 ? 'flow-positive' : 'flow-negative';

               // Apply animations
               bar.style.animation = `
                  pulseProgress ${duration} ease-in-out infinite,
                  shiftGradient ${duration} linear infinite,
                  ${direction} ${duration} linear infinite
               `;
            } catch (err) {
               console.error('powerIndicator: update failed', err);
            }
         }

         /**
          * Watch for entity state changes
          */
         function setupWatcher () {
            // Watch for state changes
            $rootScope.$watch(function () {
               return $rootScope.states && $rootScope.states[entityId];
            }, function (newState) {
               if (newState && newState.state !== undefined) {
                  updateIndicator(newState.state);
               }
            }, true);
         }

         /**
          * Cleanup on destroy
          */
         function cleanup () {
            if (container && container.parentNode) {
               container.parentNode.removeChild(container);
            }
            container = null;
            bar = null;
         }

         // Initialize
         init();

         // Cleanup on scope destroy
         scope.$on('$destroy', cleanup);
      },
   };
}]);
