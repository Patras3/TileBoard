import angular from 'angular';
import moment from 'moment';

export { moment };

export const mergeObjects = angular.merge;

export const leadZero = function (num) {
   if (num >= 0 && num < 10) {
      return '0' + num;
   }

   return num;
};

export const numberFilter = function (precision) {
   return function (value) {
      const num = parseFloat(value);

      return num && !isNaN(num) ? num.toFixed(precision) : value;
   };
};

export const switchPercents = function (field, max, round) {
   round = round || false;
   max = max || 100;

   return function (item, entity) {
      let value = field in entity.attributes ? entity.attributes[field] : null;

      value = parseFloat(value);

      if (isNaN(value)) {
         value = entity.state;

         if (item.states && value in item.states) {
            return item.states[value];
         }

         return value;
      }

      value = Math.round((value / max * 100));

      if (round) {
         value = Math.round(value / 10) * 10;
      }

      return value + '%';
   };
};

export const playSound = function (sound) {
   const audio = new Audio(sound);
   audio.loop = false;
   audio.play();
};

export const timeAgo = function (time, withoutSuffix = false) {
   const momentInTime = moment(new Date(time));
   return momentInTime.fromNow(withoutSuffix);
};

export const debounce = function (func, wait, immediate) {
   let timeout;
   return function () {
      const context = this;
      const args = arguments;
      const later = function () {
         timeout = null;
         if (!immediate) {
            func.apply(context, args);
         }
      };
      const callNow = immediate && !timeout;
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
      if (callNow) {
         func.apply(context, args);
      }
   };
};

export const toAbsoluteServerURL = function (path, serverUrlOverride = false) {
   const startsWithProtocol = path.indexOf('http') === 0;
   const url = startsWithProtocol ? path : (serverUrlOverride || window.SERVER_URL_OVERRIDE || window.CONFIG.serverUrl) + '/' + path;
   return normalizeUrlSlashes(url);
};

export function normalizeUrlSlashes (url) {
   // Replace extra forward slashes but not in protocol.
   return url.replace(/([^:])\/+/g, '$1/');
}

export function supportsFeature (feature, entity) {
   return 'supported_features' in entity.attributes
      && (entity.attributes.supported_features & feature) !== 0;
}

/* ------------------------------------------------------------------ */
/*                    CUSTOM UTILITY FUNCTIONS                        */
/* ------------------------------------------------------------------ */

/**
 * Polish day of week formatter
 * Returns localized day name with special handling for "today" and "tomorrow"
 * Performance: Caches day names array
 */
const POLISH_DAYS = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];

export function dzienTygodnia (inDate) {
   const today = new Date();
   const tomorrow = new Date(today);
   tomorrow.setDate(tomorrow.getDate() + 1);

   const inDateStr = inDate.toDateString();
   const todayStr = today.toDateString();
   const tomorrowStr = tomorrow.toDateString();

   const dayName = POLISH_DAYS[inDate.getDay()];

   if (inDateStr === todayStr) {
      return 'Dziś (' + dayName.slice(0, 2) + '.)';
   }

   if (inDateStr === tomorrowStr) {
      return 'Jutro (' + dayName.slice(0, 2) + '.)';
   }

   return dayName.slice(0, 3) + '.';
}

/**
 * Format power value in Watts or Kilowatts
 * Performance: No object allocation, simple arithmetic
 */
export function formatWatts (watts, forceKW = false, noUnit = false) {
   if (watts >= 1000 || forceKW) {
      return (watts / 1000).toFixed(2) + (noUnit ? '' : 'kW');
   }
   return watts + (noUnit ? '' : 'W');
}

/**
 * Round number to two decimal places, removing .00 suffix
 * Performance: Uses string manipulation instead of regex
 */
export function roundToTwoDecimalPlaces (value) {
   const fixed = Number(value).toFixed(2);
   return fixed.endsWith('.00') ? fixed.slice(0, -3) : fixed;
}

/**
 * Check if current time is within a time range (handles overnight ranges)
 * @param {string} startTime - Format: "HH:MM"
 * @param {string} endTime - Format: "HH:MM"
 * Performance: Minimal Date object creation
 */
export function isTimeInRange (startTime, endTime) {
   const timeToMinutes = (time) => {
      const [hours, minutes] = time.split(':').map(Number);
      return hours * 60 + minutes;
   };

   const now = new Date();
   let currentMinutes = now.getHours() * 60 + now.getMinutes();

   const startMinutes = timeToMinutes(startTime);
   let endMinutes = timeToMinutes(endTime);

   // Handle overnight range
   if (endMinutes < startMinutes) {
      endMinutes += 1440; // Add 24 hours
      if (currentMinutes < startMinutes) {
         currentMinutes += 1440;
      }
   }

   return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

/**
 * Format relative time since a date (Polish localization)
 * Performance: Single date diff calculation
 */
export function relativeTimeSinceDate (lastTriggered) {
   const diff = Math.abs(Date.now() - lastTriggered);

   const seconds = Math.floor(diff / 1000);
   const minutes = Math.floor(seconds / 60);
   const hours = Math.floor(minutes / 60);
   const days = Math.floor(hours / 24);
   const months = Math.floor(days / 30);

   if (months > 12) {
      return 'mies';
   }

   if (months > 0) {
      return months + 'mies ' + (days % 30) + 'd';
   }

   if (days > 0) {
      return days + 'd ' + (hours % 24) + 'g';
   }

   if (hours > 0) {
      return hours + 'g ' + (minutes % 60) + 'm';
   }

   if (minutes > 0) {
      return minutes + 'm';
   }

   return (seconds % 60) + 's';
}

/**
 * Format remaining time from minutes (Polish localization)
 * Performance: Simple arithmetic, no date objects
 */
export function relativeTimeFromMinutes (remainingMinutes) {
   if (remainingMinutes >= 1440) {
      const days = Math.floor(remainingMinutes / 1440);
      const hours = Math.floor((remainingMinutes % 1440) / 60);
      return days + 'd ' + hours + 'g';
   }

   if (remainingMinutes >= 60) {
      const hours = Math.floor(remainingMinutes / 60);
      const minutes = remainingMinutes % 60;
      return hours + 'g ' + minutes + 'm';
   }

   return remainingMinutes + 'm';
}

/**
 * Calculate color based on power usage (gradient from green to red)
 * Performance: Optimized with clamping and minimal branching
 */
export function calculateColor (watts, maxOrangePower = 2500, maxPower = 6000) {
   // Negative power (export): Green to Yellow gradient
   if (watts < 0) {
      const intensity = Math.min(Math.max((watts + 1000) / 1000, 0), 1);
      const red = Math.floor(255 * intensity);
      return `rgba(${red}, 255, 0, 0.9)`;
   }

   // Low to moderate (0-2500W): Yellow to Orange gradient
   if (watts <= maxOrangePower) {
      const proportion = watts / maxOrangePower;
      const green = Math.floor(255 - 128 * proportion);
      return `rgba(255, ${green}, 0, 0.9)`;
   }

   // High usage (2500-6000W): Orange to Red gradient
   const proportion = Math.min((watts - maxOrangePower) / (maxPower - maxOrangePower), 1);
   const green = Math.floor(128 - 128 * proportion);
   return `rgba(255, ${green}, 0, 0.9)`;
}

/**
 * Calculate stripe colors for power indicator
 * Performance: Simple ternary, returns array reference
 */
const STRIPE_COLORS_POSITIVE = ['#FFF', 'rgba(255, 165, 0, 0.7)'];
const STRIPE_COLORS_NEGATIVE = ['#FFF', 'rgba(0, 0, 255, 0.7)'];

export function calculateStripesColor (watts) {
   return watts > 0 ? STRIPE_COLORS_POSITIVE : STRIPE_COLORS_NEGATIVE;
}

/**
 * Calculate transparent version of a color
 * Performance: Simple string replacement
 */
export function calculateTransparentColor (normalColor, newAlpha = 0.2) {
   return normalColor.replace(/[\d.]+\)$/, newAlpha + ')');
}

/**
 * Update custom font size dynamically
 * Performance: Only creates style element once
 * Note: Consider moving to CONFIG for better organization
 */
export function updateFontSize (size) {
   const styleId = 'custom-font-size-style';

   if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.innerHTML = `
         .-theme-homekit .item-subtitle {
            font-size: ${size}px !important;
         }
         .item {
            font-size: ${size}px !important;
         }
      `;
      document.head.appendChild(style);
   }
}
