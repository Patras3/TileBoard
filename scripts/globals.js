import * as Constants from './globals/constants';
import * as Utils from './globals/utils';
import Noty from './models/noty';
import NotificationManager from './models/notificationManager';
import ErrorLogger from './models/errorLogger';
import LocationDetector from './models/locationDetector';

// Expose all constants and utils on window as those can be used by config.
for (const key in Constants) {
   if (Object.prototype.hasOwnProperty.call(Constants, key)) {
      window[key] = Constants[key];
   }
}

for (const key in Utils) {
   if (Object.prototype.hasOwnProperty.call(Utils, key)) {
      window[key] = Utils[key];
   }
}

// @ts-ignore
window.Noty = Noty;

// @ts-ignore
window.NotificationManager = NotificationManager;

// @ts-ignore
window.ErrorLogger = ErrorLogger;

// @ts-ignore
window.LocationDetector = LocationDetector;

// Backward compatibility functions for location detection
// @ts-ignore
window.isUpstairsLocation = function () {
   return LocationDetector.isUpstairs();
};

// @ts-ignore
window.isDownstairsLocation = function () {
   return LocationDetector.isDownstairs();
};

// @ts-ignore
window.getURLParameter = function (name) {
   try {
      const params = new URLSearchParams(window.location.search);
      return params.get(name);
   } catch (e) {
      const regex = new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)');
      const match = regex.exec(window.location.search);
      return match ? decodeURIComponent(match[1].replace(/\+/g, '%20')) : null;
   }
};

// Set up global error handler with ErrorLogger integration
// The ErrorLogger will be initialized in init.js with config, this just shows Noty
window.onerror = function (error, file, line, char) {
   const text = [
      error,
      'File: ' + file,
      'Line: ' + line + ':' + char,
   ].join('<br>');

   Noty.addObject({
      type: Noty.ERROR,
      title: 'JS error',
      message: text,
      lifetime: 12,
      id: error,
   });

   // Return false so error propagates to ErrorLogger if it's initialized
   return false;
};
