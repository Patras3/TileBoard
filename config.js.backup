// NotificationManager – unified, safer handling of full‑screen **and corner** iframe pop‑ups
// Drop‑in replacement for the legacy openIframe / openCornerIframe / closeNotification code.
// Exposes:
//    NotificationManager.openFullScreen({title, url, duration})
//    NotificationManager.openCorner({title, url, duration, apiRequest})
//    NotificationManager.close(id?)
//
// Both helpers auto‑clean timers, prevent duplicates and fall back to sane defaults.
// Corner iframes update Home‑Assistant input_text helpers automatically if you pass apiRequest.

(function (window) {
  'use strict';

  /* ------------------------------------------------------------------ */
  /*                             CONSTANTS                              */
  /* ------------------------------------------------------------------ */

  const ID_FULLSCREEN               = 'full-screen-event-iframe';
  const FLEXBOX_ID                  = 'corner-iframe-flexbox';
  const CLASS_CORNER_CONTAINER      = 'event-corner-iframe-container';
  const DEFAULT_FULLSCREEN_DURATION = 30;  // s
  const DEFAULT_CORNER_DURATION     = 20;  // s

  /* ------------------------------------------------------------------ */
  /*                               STATE                                */
  /* ------------------------------------------------------------------ */

  // Active close timers keyed by element id
  const timers = new Map();

  /* ------------------------------------------------------------------ */
  /*                           DOM UTILITIES                            */
  /* ------------------------------------------------------------------ */

  const $ = id => document.getElementById(id);

  function clearTimer(id) {
    if (timers.has(id)) {
      clearTimeout(timers.get(id));
      timers.delete(id);
    }
  }

  function scheduleClose(id, seconds) {
    clearTimer(id);
    timers.set(id, setTimeout(() => close(id), seconds * 1000));
  }

  /* ------------------------------------------------------------------ */
  /*                           PUBLIC API                               */
  /* ------------------------------------------------------------------ */

  /** Close overlay/iframe by id (or the full‑screen overlay when omitted) */
  function close(id = ID_FULLSCREEN) {
    const el = $(id);
    if (el) el.remove();
    clearTimer(id);

    // If a corner iframe is closed, possibly remove the flexbox wrapper
    if (id !== ID_FULLSCREEN) {
      const remaining = document.getElementsByClassName(CLASS_CORNER_CONTAINER);
      const flex      = $(FLEXBOX_ID);
      if (remaining.length === 0 && flex) flex.remove();
    }
  }

  /**
   * Full‑screen pop‑up identical to the old openIframe behaviour.
   * @param {Object} cfg
   * @param {string} cfg.title
   * @param {string} cfg.url
   * @param {number} [cfg.duration]  Auto‑close timeout in seconds (30 default)
   */
  function openFullScreen({ title, url, duration = DEFAULT_FULLSCREEN_DURATION }) {
    let overlay = $(ID_FULLSCREEN);

    if (!overlay) {
      overlay = document.createElement('div');
      overlay.className = 'notification-overlay';
      overlay.id        = ID_FULLSCREEN;
      document.body.appendChild(overlay);
    }

    overlay.innerHTML = `
      <div class="event-iframe-container">
        <span class="close-button" data-close="${ID_FULLSCREEN}">&times;</span>
        <div class="event-iframe-title">${title} (${new Date().toLocaleTimeString()})</div>
        <iframe src="${url}" frameborder="0" class="event-iframe-content"></iframe>
      </div>`;

    overlay.onclick = e => {
      if (e.target.dataset.close || e.currentTarget === e.target) close(ID_FULLSCREEN);
    };

    scheduleClose(ID_FULLSCREEN, duration);
  }

  /**
   * Corner iframe (bottom‑right) similar to legacy openCornerIframe.
   * @param {Object}  cfg
   * @param {string}  cfg.title
   * @param {string}  cfg.url
   * @param {number} [cfg.duration]     Auto‑close timeout (20 s default)
   * @param {Function} [cfg.apiRequest] TileBoard apiRequest bound function – if supplied we update
   *                                    input_text.tileboard_*_current_event_opencorneriframe for tracking.
   */
  function openCorner({ title, url, duration = DEFAULT_CORNER_DURATION, apiRequest }) {
    // Do not spawn if full‑screen overlay is active or identical URL already displayed.
    if ($(ID_FULLSCREEN)) return;
    const existing = Array.from(document.getElementsByClassName('event-corner-iframe'))
                          .some(fr => fr.src === url);
    if (existing) return;

    // Ensure flexbox wrapper exists
    let flex = $(FLEXBOX_ID);
    if (!flex) {
      flex       = document.createElement('div');
      flex.id    = FLEXBOX_ID;
      flex.style = 'position:fixed;bottom:10px;right:10px;display:flex;flex-direction:column-reverse;gap:10px;z-index:1000;';
      document.body.appendChild(flex);
    }

    // Build container
    const id        = `event-corner-iframe-${Date.now()}`;
    const container = document.createElement('div');
    container.className = `${CLASS_CORNER_CONTAINER}`;
    container.id        = id;
    container.innerHTML = `
      <div class="event-corner-iframe-content">
        <span class="close-button" data-close="${id}">&times;</span>
        <div class="event-corner-iframe-title">${title} (${new Date().toLocaleTimeString()})</div>
        <iframe src="${url}" frameborder="0" class="event-corner-iframe" data-url="${url}"></iframe>
      </div>`;

    container.onclick = e => {
      if (e.target.dataset.close || e.currentTarget === e.target) close(id);
    };

    flex.appendChild(container);
    scheduleClose(id, duration);

    /* ---------------------  OPTIONAL Home‑Assistant tracking  --------------------- */
    if (typeof apiRequest === 'function') {
      try {
        const isUp = typeof window.isUpstairsLocation === 'function' ? window.isUpstairsLocation() : false;
        const entity = isUp
          ? 'input_text.tileboard_upstairs_current_event_opencorneriframe'
          : 'input_text.tileboard_downstairs_current_event_opencorneriframe';

        apiRequest({
          type: 'call_service',
          domain: 'input_text',
          service: 'set_value',
          service_data: { entity_id: entity, value: 'event-corner-iframe-content' }
        });
      } catch (err) {
        console.warn('NotificationManager: apiRequest failed', err);
      }
    }
  }

  /* ------------------------------------------------------------------ */
  /*                      EXPORT TO GLOBAL SCOPE                        */
  /* ------------------------------------------------------------------ */

  window.NotificationManager = { openFullScreen, openCorner, close };
})(window);


/* ─────────────────────────  Error logger + self-heal  ───────────────────────── */
(function () {
  const LOG_URL = 'http://192.168.50.164:8137/log';

  /* 1. Helpers ---------------------------------------------------------------- */

  function normalizeError (input, fallbackType = 'unknown') {
    const error = {};

    if (input instanceof Error) {
      error.message = input.message;
      error.stack   = input.stack;
    } else if (typeof input === 'object' && input !== null) {
      error.message = JSON.stringify(input);
      error.stack   = new Error().stack;
    } else {
      error.message = String(input);
      error.stack   = new Error().stack;
    }
    error.type = fallbackType;
    return error;
  }

  function sendErrorLog (data) {
    try {
      fetch(LOG_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          userAgent: navigator.userAgent,
          pageUrl:   window.location.href,
          timestamp: new Date().toISOString(),
          screen: {
            width:  window.screen.width,
            height: window.screen.height,
            pixelRatio: window.devicePixelRatio
          }
        })
      }).catch(console.warn);
    } catch (e) {
      console.warn('Error reporting failed', e);
    }
  }

  /* 2. Auto-reload guard ------------------------------------------------------- */

  const CRITICAL_MESSAGES = [
    'System error',
    'Invalid access token or password'
  ];

  function shouldReload (msg) {
    return CRITICAL_MESSAGES.some(txt => msg && msg.includes(txt));
  }

  // Prevent reload loops: at most once every 15 s
  function scheduleSafeReload () {
    const key  = '_lastReloadTs';
    const now  = Date.now();
    const last = +(sessionStorage.getItem(key) || 0);

    if (now - last > 15_000) {
      sessionStorage.setItem(key, now);
      setTimeout(() => location.reload(), 500); // give fetch 0.5 s to finish
    }
  }

  /* 3. Global handlers -------------------------------------------------------- */

  window.onerror = function (message, source, lineno, colno, error) {
    sendErrorLog({
      type: 'onerror',
      message,
      url: source,
      line: lineno,
      column: colno,
      stack: error?.stack || new Error().stack
    });

    if (shouldReload(message)) scheduleSafeReload();
  };

  window.addEventListener('unhandledrejection', function (event) {
    const norm = normalizeError(event.reason, 'unhandledrejection');
    sendErrorLog(norm);

    if (shouldReload(norm.message)) scheduleSafeReload();
  });

  const originalConsoleError = console.error;
  const originalConsoleWarn  = console.warn;

  console.error = function (...args) {
    const norm = normalizeError(args.length === 1 ? args[0] : args, 'console.error');
    sendErrorLog(norm);

    if (shouldReload(norm.message)) scheduleSafeReload();

    originalConsoleError.apply(console, args);
  };

  console.warn = function (...args) {
    const norm = normalizeError(args.length === 1 ? args[0] : args, 'console.warn');
    sendErrorLog(norm);
    originalConsoleWarn.apply(console, args);
  };
})();


function dzienTygodnia(inDate) {
     // Prepare date references
     var tomorrow = new Date();
     var today =  new Date();
     tomorrow.setDate(tomorrow.getDate() + 1);
 
     // Polish day names, matching JavaScript's getDay() = 0..6 (Sun..Sat)
     var daysOfWeek = [
       'Niedziela',
       'Poniedziałek',
       'Wtorek',
       'Środa',
       'Czwartek',
       'Piątek',
       'Sobota'
     ];
 
 
       // Decide label: "Jutro" if it's exactly tomorrow, else day-of-week
       var label =
       inDate.toDateString() === tomorrow.toDateString()
           ? 'Jutro ('+ daysOfWeek[inDate.getDay()].slice(0,2)+'.)'
           : daysOfWeek[inDate.getDay()].slice(0,3) + ".";
 
           if (inDate.toDateString() === today.toDateString()) {
               label = 'Dziś ('+ daysOfWeek[inDate.getDay()].slice(0,2)+'.)'

           }
       return label;
}

function mainClimateCard(x, y, width, height, climates) {
    return {
        position: [x, y],
        type: TYPES.TEXT_LIST,  // Use TEXT_LIST for a summary layout with custom icons
        width: width,
        height: height,
        title: 'Pokoje',
        id: {},  // No specific entity ID since we're handling multiple entities
        state: "",
        list: climates.map(climate => {
            return {
                title: climate.title,
                icon: function () {
                    const state = this.states[climate.id].state;
                    const floorHeatingId = climate.floorHeatingId;
                    let icon = 'mdi-thermometer';  // Default icon

                    if (floorHeatingId && state === "off") {
                        const floorHeatingState = this.states[floorHeatingId].state;
                        if (floorHeatingState === "on") {
                            icon = "mdi-radiator";
                        } else {
                            icon = "mdi-radiator-off";
                        }
                    } else {
                        // Map the climate state to a custom icon
                        const iconMapping = {
                            off: 'mdi-thermometer-off',
                            heat: 'mdi-sun-thermometer',
                            cool: 'mdi-snowflake-thermometer',
                            auto: 'mdi-autorenew',
                            fan_only: 'mdi-fan',
                            dry: 'mdi-water-percent',
                            idle: 'mdi-progress-clock'
                        };
                        icon = iconMapping[state] || icon;
                    }
                    return icon;
                },
                value: function () {
                    const entityState = this.states[climate.id];
                    let currentTemp = climate.realTempSensor ? this.states[climate.realTempSensor].state : entityState.attributes.current_temperature;
                    currentTemp = currentTemp === "unavailable" ? "-" : (currentTemp + '°C');
                    const targetTemp = entityState.state === "off" ? "" : ("/ " + entityState.attributes.temperature + "°C");
                    return `${currentTemp}${targetTemp}`;
                }
            };
        }),
        action: function () {
            this.$scope.openPopup({

                type: TYPES.POPUP,
                title: 'Klimatyzacja',
                popup: {
                    items: [

                ],
                },
                tileSize: 200,
                width: 3,
                height: 3
            });
        }
    };
}
function pinProtectedAction(tileConfig) {

    const { title, icon, pin, attemptsAllowed, timeoutSeconds, lockTimeMultiplier, action, position, id, states, icons  } = tileConfig;

    let attempts = 0;
    let isLocked = false;
    let lockUntil = null;
    let enteredPin = '';

    // Helper functions for handling cookies
    function showAlert(icon, title, message, status, lifetime=12) {
        window.Noty.addObject({
            command: 'notify',
            id: new Date().getTime(),
            icon: icon,
            type: status,
            title: title,
            message: message,
            lifetime: lifetime
        });
    }
    function setCookie(name, value, seconds) {
        const date = new Date();
        date.setTime(date.getTime() + (seconds * 1000));
        const expires = "expires=" + date.toUTCString();
        document.cookie = name + "=" + value + ";" + expires + ";path=/";
    }

    function getCookie(name) {
        const nameEQ = name + "=";
        const ca = document.cookie.split(';');
        for (let i = 0; i < ca.length; i++) {
            let c = ca[i];
            while (c.charAt(0) === ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    function clearCookie(name) {
        document.cookie = name + "=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    }

    // Load lock state from cookies if exists
    function loadLockState() {
        const lockData = getCookie(tileConfig.id + '_lock');
        if (lockData) {
            const lockInfo = JSON.parse(lockData);
            attempts = lockInfo.attempts || 0;
            lockUntil = lockInfo.lockUntil || null;
            isLocked = lockInfo.isLocked || false;
        }
    }

    // Save lock state to cookies
    function saveLockState() {
        const lockInfo = {
            attempts: attempts,
            lockUntil: lockUntil,
            isLocked: isLocked,
        };
        setCookie(tileConfig.id + '_lock', JSON.stringify(lockInfo), lockUntil ? (lockUntil - Date.now()) / 1000 : 3600);
    }

    loadLockState();  // Load lock state on initialization

    function showPinPad(_this) {
        enteredPin = "";
        const pinPadTiles = [];

        // Create PIN pad tiles (1-9, 0)
        const pinNumbers = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];
        pinNumbers.forEach((number, index) => {
            pinPadTiles.push({
                position: [index % 3, Math.floor(index / 3)],
                type: TYPES.CUSTOM,
                title: "",
                customHtml: '<div class="item-entity"><span class="item-entity--icon mdi  mdi-numeric-' + number +'"></span></div><div></div>',  // Can also be a function that will be passed item and entity.
                id: {},
                state: false,
                action: function(item, entity) {
                    enteredPin += number;
                }
            });
        });

        pinPadTiles.push({
            position: [1,3],
            type: TYPES.CUSTOM,
            title: "",
            customHtml: '<div class="item-entity"><span class="item-entity--icon mdi  mdi-numeric-' + "0" +'"></span></div><div></div>',  // Can also be a function that will be passed item and entity.
            id: {},
            state: false,
            action: function(item, entity) {
                enteredPin += 0;
            }
        });


        // Add "Clear" button
        pinPadTiles.push({
            position: [0, 3],
            type: TYPES.CUSTOM,
            title: '',
            id: {},
            state:"",
            icon: 'mdi-backspace',
            action: function(item, entity) {
                enteredPin = '';
            }
        });


        // Add "Submit" button
        pinPadTiles.push({
            position: [2, 3],
            type: TYPES.CUSTOM,
            title: '',
            id: {},
            state: function() {
                return enteredPin
            },
            icon: 'mdi-check',
            action: function(item, entity) {
                validatePin(_this);
                enteredPin = "";
            }
        });



        return {
            type: TYPES.POPUP,
            title: 'Podaj PIN',
            popup: {
                items: pinPadTiles,
            },
            tileSize: 100,
            width: 3,
            height: 4,
        };
    }

    function validatePin(_this) {
        if (pin.includes(enteredPin)) {
            action(_this);
            clearCookie(tileConfig.id + '_lock');  // Clear lock state after successful entry
            closePinPad(_this);
            showAlert("mdi-check", "Pin", '', "Pin poprawny!", 5)

        } else {
            attempts++;
            if (attempts >= attemptsAllowed) {
                isLocked = true;
                lockUntil = Date.now() + (lockTimeMultiplier * timeoutSeconds * 1000);
                saveLockState();  // Save lock state to cookies
            }
            if (isLocked) {
                showAlert("mdi-lock-alert", "Zablokowano", 'Zbyt wiele prób, tymczasowa blokada!', "error", lockTimeMultiplier * timeoutSeconds)
                closePinPad(_this);
            } else {
                showAlert("mdi-lock-alert", "Pin", 'Niepoprawny pin, spróbuj ponownie.', "warning", 5)
            }
        }
        enteredPin = '';
    }

    function closePinPad(_this) {
        enteredPin = "";
        _this.$scope.closePopup();
    }

    function isLockedOut() {
        if (!isLocked) return false;
        if (Date.now() >= lockUntil) {
            isLocked = false;
            attempts = 0;
            clearCookie(tileConfig.id + '_lock');  // Clear lock state after lock period expires
            return false;
        }
        return true;
    }


//    const { title, icon, pin, attemptsAllowed, timeoutSeconds, lockTimeMultiplier, action, position, id, states, icons  } = tileConfig;

    return {
        type: TYPES.CUSTOM,
        title: title || 'Protected Action',
        id: tileConfig.id,
        //    icon: tileConfig.icon || 'mdi-lock',
        position: tileConfig.position,
        states: tileConfig.states,

        classes: function(item, entity) {
            if (entity.state === 'on') {
                return [];
            }
            return ['-off'];
        },
        states: tileConfig.states,
        icons: tileConfig.icons,
        action: function(item, entity) {
            if (isLockedOut()) {
                showAlert("mdi-lock-alert", "Zablokowano", 'Zbyt wiele prób, tymczasowa blokada!', "error")
                return;
            }
            const _this = this;

            this.$scope.openPopup(showPinPad(_this));
        },
    };
}
function getURLParameter(name) {
    return decodeURIComponent((new RegExp('[?|&]' + name + '=' + '([^&;]+?)(&|#|;|$)').exec(location.search) || [null, ''])[1].replace(/\+/g, '%20')) || null;
}

function isUpstairsLocation() {
    // Function to get URL parameter value


    // Function to set a cookie
    function setCookie(name, value, days) {
        var expires = "";
        if (days) {
            var date = new Date();
            date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
            expires = "; expires=" + date.toUTCString();
        }
        document.cookie = name + "=" + (value || "") + expires + "; path=/";
    }

    // Function to get a cookie
    function getCookie(name) {
        var nameEQ = name + "=";
        var ca = document.cookie.split(';');
        for (var i = 0; i < ca.length; i++) {
            var c = ca[i];
            while (c.charAt(0) == ' ') c = c.substring(1, c.length);
            if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
        }
        return null;
    }

    // Check if the value is stored in window object
    if (window.locationParam !== undefined) {
        return window.locationParam === 'upstair';
    }

    // Check if the value is stored in cookies
    var cookieValue = getCookie('location');
    if (cookieValue !== null) {
        window.locationParam = cookieValue; // Save to window object for faster access next time
        return cookieValue === 'upstair';
    }

    // Check for "location" parameter in URL if not found in window object or cookies
    var locationParam = getURLParameter('location');
    if (locationParam === 'upstair') {
        window.locationParam = 'upstair';
        setCookie('location', 'upstair', 7); // Expires in 7 days
        return true;
    } else {
        window.locationParam = 'downstairs';
        setCookie('location', 'downstairs', 7); // Expires in 7 days
        return false;
    }
}

function isDownstairsLocation() {
    return !isUpstairsLocation();
}

function roundToTwoDecimalPlaces(value) {
    return Number(value).toFixed(2).replace(".00", "")
}

function isTimeInRange(startTime, endTime) {
    // Convert a time string in "HH:MM" format to minutes since midnight
    function timeToMinutes(time) {
        const [hours, minutes] = time.split(":").map(Number);
        return hours * 60 + minutes;
    }

    // Get current time in minutes since midnight
    const now = new Date();
    let currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Convert start and end times to minutes
    const startMinutes = timeToMinutes(startTime);
    let endMinutes = timeToMinutes(endTime);

    // If end time is less than start time, it means the end time is on the next day
    if (endMinutes < startMinutes) {
        endMinutes += 24 * 60; // Add 24 hours to end time
        // Also adjust current time if it's past midnight
        if (currentMinutes < startMinutes) {
            currentMinutes += 24 * 60;
        }
    }

    // Check if current time is within the range
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
}

// Function to calculate the color based on power usage
function calculateColor(watts) {
    const maxOrangePower = 2500;
    const maxPower = 6000;

    // Gradient for Negative Power (Below Zero): Green to Yellow
    if (watts < 0) {
        // Scale intensity from 0 at -1000W to 1 at 0W
        let intensity = Math.min((watts + 1000) / 1000, 1);
        intensity = Math.max(intensity, 0); // Ensure intensity is not below 0

        let red = Math.floor(255 * intensity); // Start introducing red component
        let green = 255; // Green is always full
        return `rgba(${red}, ${green}, 0, 0.9)`;
    }

    // Gradient for Low to Moderate Power Usage (0 to 2500W): Yellow to Orange
    if (watts <= maxOrangePower) {
        let proportion = watts / maxOrangePower;
        let red = 255;
        let green = Math.floor(255 - (128 * proportion)); // Reduce green to move towards orange
        return `rgba(${red}, ${green}, 0, 0.9)`;
    }

    // Gradient for High Power Usage (2500W to 6000W): Orange to Red
    let proportion = (watts - maxOrangePower) / (maxPower - maxOrangePower);
    proportion = Math.min(proportion, 1);
    let red = 255;
    let green = Math.floor(128 - (128 * proportion)); // Further reduce green to move towards red
    return `rgba(${red}, ${green}, 0, 0.9)`;
}

function calculateStripesColor(watts) {
    // Return white and the primary color for the stripes based on the power direction.
    return watts > 0 ? ['#FFF', 'rgba(255, 165, 0, 0.7)'] : ['#FFF', 'rgba(0, 0, 255, 0.7)'];
}

function updateFlowingIndicatorOld(watts) {
    let progressContainer = document.getElementById('progress-container');
    if (!progressContainer) {
        // Create the progress container with fixed positioning at the bottom of the viewport.
        progressContainer = document.createElement('div');
        progressContainer.id = 'progress-container';
        progressContainer.style = `
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 10px;
      background-color: #333;
      overflow: hidden;
      border-radius: 7.5px;
      z-index: 1000;`;

        // Append the progress container to the body.
        document.body.appendChild(progressContainer);

        // Create the progress bar element with the stripes.
        const progressBar = document.createElement('div');
        progressBar.id = 'progress-bar';
        progressBar.style = `
      height: 100%;
      width: 100%;
      position: absolute;
      background-size: 30px 10px;`;

        progressContainer.appendChild(progressBar);
    }

    const progressBar = document.getElementById('progress-bar');
    const [stripeColor1, stripeColor2] = calculateStripesColor(watts);

    // Setting up the striped background.
    progressBar.style.backgroundImage = `
    repeating-linear-gradient(
      -45deg,
      ${stripeColor1},
      ${stripeColor1} 10px,
      ${stripeColor2} 10px,
      ${stripeColor2} 20px
    )`;

    const maxWatts = 3000;
    const animationDuration = `${10 - (Math.abs(watts) / maxWatts) * 9}s`; // Duration based on intensity.

    // Apply the sliding animation based on the sign of watts.
    progressBar.style.animation = `
    slide-stripes ${animationDuration} linear infinite ${
        watts >= 0 ? 'normal' : 'reverse'
    }`;

    // Insert keyframes for sliding stripes animation.
    const styleSheet = document.styleSheets[0];
    addSlideStripesKeyframes(styleSheet);
}

function addSlideStripesKeyframes(styleSheet) {
    if (!window.slideStripesKeyframesAdded) {
        styleSheet.insertRule(`
      @keyframes slide-stripes {
        from { background-position: 0 0; }
        to { background-position: 30px 0; }
      }
    `, styleSheet.cssRules.length);

        window.slideStripesKeyframesAdded = true;
    }
}

function updateFlowingIndicator(watts, colorOverride) {
  try {
    let container = document.getElementById('progress-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'progress-container';
      container.style.cssText = 'position:fixed;bottom:0;width:100%;height:10px;overflow:hidden;z-index:1000;';
      (document.querySelector('.page-container') || document.body).appendChild(container);
      const bar = document.createElement('div');
      bar.id = 'progress-bar';
      container.appendChild(bar);
    }

    const bar = document.getElementById('progress-bar');
    if (!bar) return; // should never happen, but safety first

    const color = colorOverride || calculateColor(watts);
    const transparent = calculateTransparentColor(color);

    bar.style.backgroundImage = `linear-gradient(270deg, ${color}, ${transparent}, ${color})`;
    bar.style.backgroundSize = '200% 200%';

    const max = 4000;
    const dur = `${10 - (Math.abs(watts) / max) * 9}s`;
    const dir = watts >= 0 ? 'flow-positive' : 'flow-negative';
    bar.style.animation = `pulseProgress ${dur} ease-in-out infinite, shiftGradient ${dur} linear infinite, ${dir} ${dur} linear infinite`;
  } catch (err) {
    console.error('updateFlowingIndicator failed', err);
  }
}

function calculateTransparentColor(normalColor) {
    return normalColor.replace("0.9", "0.2")
}


function headerElement() {
    debugger;

    return {
        type: HEADER_ITEMS.CUSTOM_HTML,
        html: function () {
            debugger;
            return '<xx >';
        },
        styles: {fontSize: "25px"},
    }

}

function sendNotificationToLGTV(notificationData) {
    // Dispatch the notification to the LG TV using the Home Assistant service


    // Create an XMLHttpRequest to call the Home Assistant service
    var xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/services/notify/lg_oled65cx3la', true);
    xhr.setRequestHeader('Content-Type', 'application/json;charset=UTF-8');
    xhr.send(JSON.stringify(notificationData));

    // dispatch({
    //     type: 'call_service',
    //     domain: 'notify',
    //     service: 'lg_oled65cx3la',
    //     service_data: notificationData
    // });
}


function climateWithCustomUsageOf(id, x, y, title, floorHeatingId, realTempSensor, deviceId = undefined) {
    let debounceTimeout;
    let latestMode = null;
    let _this = null;
    let latestTemperature = null;
    let previousTemperature = null;

    function debounce(func, wait) {
        return function (...args) {
            clearTimeout(debounceTimeout);
            debounceTimeout = setTimeout(() => func.apply(this, args), wait);
        };
    }

    function sendCombinedRequest() {
        let newTemperature = latestTemperature || previousTemperature;



        if (!latestMode) {
            latestMode = 'iot_' +  _this.$scope.states[id].state
        }

        if (latestMode) {
            if (latestMode === 'off') {
                _this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "turn_off",
                    target: {
                        device_id: deviceId,
                    }
                });
            } else {
                _this.apiRequest({
                    type: "call_service",
                    domain: "hon",
                    service: "start_program",
                    service_data: {
                        program: latestMode,
                        parameters: JSON.stringify({
                            'echoStatus': '0',
                            'humanSensingStatus': '0',
                            'muteStatus': '0',
                            'rapidMode': '0',
                            'screenDisplayStatus': '1',
                            'silentSleepStatus': '0',
                            'tempSel': '' + newTemperature + '',
                            'windDirectionHorizontal': '0',
                            'windDirectionVertical': '5',
                            'windSpeed': '5'
                        })
                    },
                    target: {
                        device_id: deviceId,
                    }
                });
            }

            // this.apiRequest({
            //     type: "call_service",
            //     domain: "climate",
            //     service: "set_hvac_mode",
            //     service_data: serviceData
            // });
        } else if (latestTemperature !== null) {
            _this.apiRequest({
                type: "call_service",
                domain: "climate",
                service: "set_temperature",
                target: {
                    device_id: deviceId,
                },
                service_data: {
                    'temperature': newTemperature
                }
            });
        }

        // Reset the latestMode and latestTemperature
        latestMode = null;
        previousTemperature = null;
        _this = null;
    }

    const debouncedSendRequest = debounce(sendCombinedRequest.bind(this), 2000);

    function heat() {
        return {
            position: [3, 0],
            type: TYPES.CUSTOM,
            title: 'Grzanie',
            id: id,
            icon: 'mdi-radiator',
            classes: function (item, entity) {
                if (entity.state === 'heat') {
                    return [];
                }
                return ['-off'];
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                previousTemperature = entity.attributes.temperature;
                latestMode = 'iot_heat';
                _this = this;
                debouncedSendRequest();
            }
        };
    }

    function cool() {
        return {
            position: [1, 0],
            type: TYPES.CUSTOM,
            title: 'Chłodzenie',
            id: id,
            icon: 'mdi-snowflake',
            classes: function (item, entity) {
                if (entity.state === 'cool') {
                    return [];
                }
                return ['-off'];
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                previousTemperature = entity.attributes.temperature;
                _this = this;
                latestMode = 'iot_cool';
                debouncedSendRequest();
            }
        };
    }

    function clean() {
        return {
            position: [2, 0],
            type: TYPES.CUSTOM,
            title: 'Oczyszczanie',
            id: id,
            icon: 'mdi-air-purifier',
            classes: function (item, entity) {
                if (latestMode === 'iot_uv_and_cool') {
                    return [];
                }
                return ['-off'];
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                previousTemperature = entity.attributes.temperature;
                latestMode = 'iot_uv_and_cool';
                _this = this;
                debouncedSendRequest();
            }
        };
    }

    function off() {
        return {
            position: [0, 0],
            type: TYPES.CUSTOM,
            title: 'Wyłącz',
            id: id,
            icon: 'mdi-fan-off',
            classes: function (item, entity) {
                if (entity.state === 'off') {
                    return [];
                }
                return ['-off'];
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                previousTemperature = entity.attributes.temperature;
                latestMode = 'off';
                _this = this;
                debouncedSendRequest();
            }
        };
    }

///
    function temp() {
        return {
            position: [0, 1],
            id: id,
            width: 4,
            type: TYPES.SLIDER,
            unit: '°C',
            title: 'Temperatura',
            icon: 'mdi-thermometer',
            state: false,
            action: function (item, entity) {
                return function (value) {
                    previousTemperature = value;
                    latestTemperature = value;
                    _this = this;
                    debouncedSendRequest();
                    //
                };
            }(),
            slider: {
                max: 25,
                min: 16,
                step: 1,
                field: 'temperature',
                // sliderWidth: '60',     // Custom slider width
                // sliderHeight: '270',   // Custom slider height
                /*                request: {
                                    type: "call_service",
                                    domain: "climate",
                                    service: "set_temperature",
                                    field: "temperature"
                                },*/
            },
            /*            slider: {
                            max: 25,
                            min: 16,
                            step: 1,
                            field: 'temperature',
                            action: function (item, entity) {
                                return function (value) {
                                    previousTemperature = value;
                                    latestTemperature = value;
                                    _this = this;
                                    debouncedSendRequest();
                                };
                            }(),
                        }*/
        };
    }

    function floorHeating() {
        return {
            position: [0, 2],
            width: 4,
            type: TYPES.SWITCH,
            id: floorHeatingId,
            title: 'Ogrz. podłogowe',
            hidden: !floorHeatingId,
            states: {
                on: "Włączone",
                off: "Wyłączone"
            },
            icons: {
                on: "mdi-radiator",
                off: "mdi-radiator-off",
            }
        };
    }

    function tempMinus() {
        return {
            position: [0, 1],
            type: TYPES.CUSTOM,
            title: '',
            id: {},
            state: false,
            icon: 'mdi-minus',
            customHtml: '<div class="item-entity"><span class="item-entity--icon mdi  mdi-minus"></span></div><div></div>',  // Can also be a function that will be passed item and entity.
            action: function (item, entity) {
                return function () {
                    let newTemp = latestTemperature === null ? this.$scope.states[id].attributes.temperature : latestTemperature;
                    previousTemperature = newTemp;
                    newTemp--;
                    latestTemperature = newTemp;
                    _this = this;
                    debouncedSendRequest();
                };
            }(),
        }
    }


    function tempPlus() {
        return {
            position: [2, 1],
            size: 1,
            type: TYPES.CUSTOM,
            title: '',
            id: {},
            state: false,
            icon: 'mdi-plus',
            customHtml: '<div class="item-entity"><span class="item-entity--icon mdi mdi-plus"></span></div><div></div>',  // Can also be a function that will be passed item and entity.
            action: function (item, entity) {
                return function () {
                    let newTemp = latestTemperature === null ? this.$scope.states[id].attributes.temperature : latestTemperature;
                    previousTemperature = newTemp;
                    newTemp++;
                    latestTemperature = newTemp;
                    _this = this;
                    debouncedSendRequest();
                };
            }(),
        }
    }


    function tempValue() {
        return {
            position: [1, 1],
            type: TYPES.CUSTOM,
            title: 'Temperatura',
            id: {},
            state: false,
            icon: 'mdi-temperature',
            customHtml: function (item, entity) {
                const temp = (latestTemperature === null ? this.$scope.states[id].attributes.temperature : latestTemperature);
                return '<div class="item-entity"><span class="item-entity--value ng-binding">' + temp + '°C</span>'

                return '<br/><div class="item-text"><h1><br style="\n' +
                    '    font-size: xx-large;\n' +
                    '">' + +' °C</div></b>'
            },
            action: function (item, entity) {
                //later
            },
            secondaryAction: function (item, entity) {
                //later
            }
        }
    }


    const buttons = [
        off(),
        cool(),
        clean(),
        heat(),
        tempMinus(),
        tempValue(),
        tempPlus(),
    ];

    if (floorHeatingId) {
        buttons.push(floorHeating());
    }

    return {
        position: [x, y],
        type: TYPES.POPUP,
        id: id,
        title: title,
        customHtml: function (item, entity) {
            const state = entity.state;
            let icon = item.icons[state];
            const targetTempOpt = state !== 'off' ? (' / ' + entity.attributes.temperature + '°C') : '';
            let currentTemperature = realTempSensor ? this.$scope.states[realTempSensor].state : entity.attributes.current_temperature;
            currentTemperature = currentTemperature === "unavailable"
                ? "-"
                : currentTemperature + "°C"
            const temp = currentTemperature + targetTempOpt;

            if (floorHeatingId && state === "off") {
                const floorHeatingState = this.$scope.states[floorHeatingId].state;
                if (floorHeatingState === "on") {
                    icon = "mdi-radiator";
                } else {
                    icon = "mdi-radiator-off";
                }
            }

            return '<br/><span class="item-entity--icon mdi ' + icon + ' " ng-class="entityIcon(item, entity)"></span>' +
                '<br/><span style="font-size: large">' + temp + '</span>';
        },

        action: function (item, entity) {
            this.$scope.openPopup(item, entity);
            this.$scope.popupTimeout = setTimeout(function () {
                this.$scope.closePopup();
            }.bind(this), 300000);
        },

        icons: {
            off: 'mdi-thermometer-off',
            cool: 'mdi-snowflake-thermometer',
            heat: 'mdi-sun-thermometer',
        },
        popup: {
            items: buttons,
        },
        states: {
            'auto': '',
            'heat': 'Grzanie',
            'cool': 'Chłodzenie',
            'off': 'Wyłączona'
        },
        state: function (item, entity) {
            if (!floorHeatingId || entity.state !== "off") {
                return item.states[entity.state];
            }

            const floorHeating = this.$scope.states[floorHeatingId].state;
            return floorHeating === "on" ? "Wł. podłogowe" : "Wył. podłogowe";
        },
        history: {
            entity: id.replace('climate', 'sensor') + '_indoor_temperature',
            offset: 24 * 3600 * 1000,
            options: {elements: {point: {radius: 3}}},
            styles: {border: '1px solid red'},
        },
    };
}

function climate(id, x, y, title, floorHeatingId, realTempSensor, deviceId = undefined) {

    function heat() {
        return {
            position: [3, 0],
            type: TYPES.CUSTOM,
            title: 'Grzanie',
            id: id,
            icon: 'mdi-radiator',
            classes: function (item, entity) {
                if (entity.state === 'heat') {
                    return []; // return the array containing the class when state is 'off'
                }
                return ['-off']; // return an empty array when state is not 'off'
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'heat'
                    }
                });
            }
        }
    }

    function cool() {
        return {
            position: [1, 0],
            type: TYPES.CUSTOM,
            title: 'Chłodzenie',
            id: id,
            icon: 'mdi-snowflake',
            classes: function (item, entity) {
                if (entity.state === 'cool') {
                    return []; // return the array containing the class when state is 'off'
                }
                return ['-off']; // return an empty array when state is not 'off'
            },
            state: false,
            // state: function(item, entity) {
            //     if (entity.state === 'cool') {
            //         item.classList.remove('-off'); // Add the -off class
            //     } else {
            //         item.classList.add('-off'); // Remove the -off class if the state is not 'off'
            //     }
            //     return false
            // },
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'cool'
                    }
                });
            }
        }
    }

    function sleepAsPromise(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    function clean() {
        return {
            position: [2, 0],
            type: TYPES.CUSTOM,
            title: 'Oczyszczanie',
            id: id,
            icon: 'mdi-air-purifier',
            classes: function (item, entity) {
                if (entity.state === 'blabla') {
                    return []; // return the array containing the class when state is 'off'
                }
                return ['-off']; // return an empty array when state is not 'off'
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "hon",
                    service: "start_program",
                    service_data: {
                        program: "iot_uv_and_cool",
/*                        parameters: JSON.stringify({
                            'echoStatus': '1',
                            'humanSensingStatus': '0',
                            'muteStatus': '0',
                            'rapidMode': '0',
                            'screenDisplayStatus': '1',
                            'silentSleepStatus': '0',
                            'tempSel': '18',
                            'windDirectionHorizontal': '0',
                            'windDirectionVertical': '5',
                            'windSpeed': '5'
                        })*/
                    },
                    target: {
                        device_id: deviceId,
                    }
                });
            }
        }
    }

    function off() {
        return {
            position: [0, 0],
            type: TYPES.CUSTOM,
            title: 'Wyłącz',
            id: id,
            icon: 'mdi-fan-off',
            classes: function (item, entity) {
                if (entity.state === 'off') {
                    return []; // return the array containing the class when state is 'off'
                }
                return ['-off']; // return an empty array when state is not 'off'
            },
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'off'
                    }
                });
            }
        }
    }

    function temp() {
        return {
            position: [0, 1],
            id: id,
            width: 4,
            type: TYPES.SLIDER,
            unit: '°C',
            title: 'Temperatura',
            icon: 'mdi-thermometer',  // Optional. Slider size will be adjusted automatically.
            // vertical: true,  // Show vertical slider (default: false - horizontal).
            // singleLine: true,  // Makes the optional icon, the slider and the icon be shown on single line (default: false, only works with horizontal slider).
            // legacy: true,  // Old-style slider that only works in horizontal mode (default: false).
            // bottom: true, // puts slider on the bottom (default: false, only work with the legacy slider).
            state: false,
            //   filter: function (value, item, entity) {return entity.attributes.temperature},
            // For light entities a filter function can be used to convert the value from 0-255 to 0-100% range.
            //filter: function (value) {
            //    var num = parseFloat(value) / 2.55;
            //    return num && !isNaN(num) ? num.toFixed() : 0;
            //},
            slider: {
                max: 25,
                min: 16,
                step: 1,
                field: 'temperature',
                // sliderWidth: '60',     // Custom slider width
                // sliderHeight: '270',   // Custom slider height
                // request: {
                //     type: "call_service",
                //     domain: "climate",
                //     service: "set_temperature",
                //     field: "temperature"
                // },
            },
        }
    }

    function floorHeating() {
        return {
            position: [0, 2],
            width: 4,
            type: TYPES.SWITCH,
            id: floorHeatingId,
            title: 'Ogrz. podłogowe',
            hidden: !floorHeatingId,
            states: {
                on: "Włączone",
                off: "Wyłączone"
            },
            icons: {
                on: "mdi-radiator",
                off: "mdi-radiator-off",
            }
        }
    }

    const buttons = [
        off(),
        cool(),
        clean(),
        heat(),
        temp(),
    ]
    if (floorHeatingId) {
        buttons.push(floorHeating())
    }

    // <br/><span class="item-entity--icon mdi mdi-washing-machine" ng-class="entityIcon(item, entity)"></span>
    return {
        position: [x, y],
        type: TYPES.POPUP,
        id: id,
        //  icon: 'mdi-air-conditioner',
        title: title,
        customHtml: function (item, entity) {
            const state = entity.state;
            let icon = item.icons[state];
            const targetTempOpt = state !== 'off' ? (' / ' + entity.attributes.temperature + '°C') : '';
            let currentTemperature = realTempSensor ? this.$scope.states[realTempSensor].state : entity.attributes.current_temperature;
            currentTemperature = currentTemperature === "unavailable" ? "-" : (currentTemperature + '°C');
            const temp = currentTemperature  + targetTempOpt;

            //Floor heating
            //Override turn off climate with floor heating
            if (floorHeatingId && state === "off") {
                const floorHeatingState = this.$scope.states[floorHeatingId].state;
                if (floorHeatingState === "on") {
                    icon = "mdi-radiator"
                } else {
                    icon = "mdi-radiator-off"
                }
            }


            return '<br/><span class="item-entity--icon mdi ' + icon + ' " ng-class="entityIcon(item, entity)"></span>' +
                '<br/><span style="font-size: large">' + temp + '</span>'
        },

        action: function (item, entity) {
            this.$scope.openPopup(item, entity);
            this.$scope.popupTimeout = setTimeout(function () {
                // Close the popup
                this.$scope.closePopup();
            }.bind(this), 10000);
        },

        icons: {
            off: 'mdi-thermometer-off',
            cool: 'mdi-snowflake-thermometer',
            heat: 'mdi-sun-thermometer',
        },
        popup: {
            //  tileSize: 100,
            items: buttons,
        },
        states: {
            'auto': '',
            'heat': 'Grzanie',
            'cool': 'Chłodzenie',
            'off': 'Wyłączona'
        },
        state: function (item, entity) {
            if (!floorHeatingId || entity.state !== "off") {
                return item.states[entity.state];
            }

            const floorHeating = this.$scope.states[floorHeatingId].state;
            return floorHeating === "on" ? "Wł. podłogowe" : "Wył. podłogowe"
        },
        history: { // If this is present in a tile, a history popup is created on secondary action
            entity: id.replace('climate', 'sensor') + '_indoor_temperature', // Entity ID (or an array of IDs) to render history for. Default: entity id of the tile itself
            offset: 24 * 3600 * 1000, // Start point of the history counting from now(). Default: one day
            options: {elements: {point: {radius: 3}}}, // Chart options. Refer to https://www.chartjs.org/.
            styles: {border: '1px solid red'}, // Styles to apply to the <div> containing the chart. Default according to main.css
            // classes: 'clock--colon', // Classes to apply to the history popup. Default according to main.css
        },
    };

}

function szynaSwiatla(switchId, title, x, y) {

    function oneLightPoint(x, y, id, main = false,) {
        return {
            position: [x, y],
            title: '',
            size: 10,
            id: id,
            type: TYPES.LIGHT,
            hidden: isUpstairsLocation(),
            states: {
                on: 'Wł.',
                off: 'Wył.',
            },
            icons: {
                on: main ? 'mdi-track-light' : 'mdi-lightbulb-spot',
                off: main ? 'mdi-track-light-off' : 'mdi-lightbulb-spot-off',
            },
            /*            sliders: [
                            {
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
                            },
                        ],*/
        }
    }

    function getLightsOld() {
        let lights = [];
        for (let i = 1; i <= 7; i++) {
            lights.push(oneLightPoint(0, i - 1, 'light.szyna_kuchnia_' + i, [1, 4, 7].includes(i)));

        }
        for (let i = 1; i <= 12; i++) {
            lights.push(oneLightPoint(i, 0, 'light.szyna_salon_' + i, [3, 6, 9, 12].includes(i)));

        }
        return lights;

    }

    function getLightsXysz() {
        let lights = [];

        // Kitchen lights: positioned horizontally at the bottom
        for (let i = 1; i <= 7; i++) {
            lights.push(oneLightPoint(i - 1, 12, 'light.szyna_kuchnia_' + i, [1, 4, 7].includes(i)));
        }

        // Salon lights: positioned vertically at the right
        for (let i = 1; i <= 12; i++) {
            lights.push(oneLightPoint(7, i - 1, 'light.szyna_salon_' + i, [3, 6, 9, 12].includes(i)));
        }

        return lights;
    }
    function getLights() {
        let lights = [];

        // Salon lights: positioned horizontally at the bottom, correctly ordered from left to right
        for (let i = 1; i <= 12; i++) {
            lights.push(oneLightPoint(12-i, 6, 'light.szyna_salon_' + i, [3, 6, 9, 12].includes(i)));
        }

        // Kitchen lights: positioned vertically on the right, correctly ordered from top to bottom
        for (let i = 1; i <= 7; i++) {
            lights.push(oneLightPoint(12, i - 1, 'light.szyna_kuchnia_' + i, [1, 4, 7].includes(i)));
        }

        return lights;
    }



    function getLightsPrawieKurczeDziala() {
        let lights = [];

        // Salon lights: positioned horizontally at the bottom
        for (let i = 1; i <= 12; i++) {
            lights.push(oneLightPoint(i - 1, 6, 'light.szyna_salon_' + i, [3, 6, 9, 12].includes(i)));
        }

        // Kitchen lights: positioned vertically on the right
        for (let i = 1; i <= 6; i++) {
            lights.push(oneLightPoint(11, i, 'light.szyna_kuchnia_' + i, [1, 4, 6].includes(i)));
        }

        return lights;
    }


    function getLightsPrevious() {
        let lights = [];

        // Kitchen lights: positioned vertically on the left
        for (let i = 1; i <= 7; i++) {
            lights.push(oneLightPoint(0, 7 - i, 'light.szyna_kuchnia_' + i, [1, 4, 7].includes(i)));
        }

        // Salon lights: positioned horizontally at the bottom
        for (let i = 1; i <= 12; i++) {
            lights.push(oneLightPoint(i, 0, 'light.szyna_salon_' + i, [3, 6, 9, 12].includes(i)));
        }

        return lights;
    }



    // <br/><span class="item-entity--icon mdi mdi-washing-machine" ng-class="entityIcon(item, entity)"></span>
    return {
        position: [x, y],
        type: TYPES.POPUP,
        id: switchId,
        //  icon: 'mdi-air-conditioner',
        hidden: isUpstairsLocation(),
        title: title,
        /*    customHtml: function (item, entity) {
                const state = entity.state;
                let icon = item.icons[state];
                const targetTempOpt = state !== 'off' ? (' / ' + entity.attributes.temperature + '°C') : '';
                let currentTemperature = realTempSensor ? this.$scope.states[realTempSensor].state : entity.attributes.current_temperature;
                const temp = currentTemperature + '°C' + targetTempOpt;

                //Floor heating
                //Override turn off climate with floor heating
                if (floorHeatingId && state === "off") {
                    const floorHeatingState = this.$scope.states[floorHeatingId].state;
                    if (floorHeatingState === "on") {
                        icon = "mdi-radiator"
                    } else {
                        icon = "mdi-radiator-off"
                    }
                }


                return '<br/><span class="item-entity--icon mdi ' + icon + ' " ng-class="entityIcon(item, entity)"></span>' +
                    '<br/><span style="font-size: large">' + temp + '</span>'
            },
    */
        action: function (item, entity) {
            this.apiRequest({
                type: "call_service",
                domain: "light",
                service: "toggle",
                service_data: {
                    entity_id: item.id
                }
            });
        },
        secondaryAction: function (item, entity) {
            this.$scope.openPopup(item, entity);
            this.$scope.popupTimeout = setTimeout(function () {
                // Close the popup
                this.$scope.closePopup();
            }.bind(this), 60000);
        },

        icons: {
            on: 'mdi-track-light',
            off: 'mdi-track-light-off',
        },
        popup: {
            tileSize: 80,
            height: 7,
            width: 13,
            items: getLights(),
        },
        states: {
            'on': 'Włączone',
            'off': 'Wyłączone'
        },
        state: function (item, entity) {
            return item.states[entity.state];
        },
    };
}


function climateSimple(id, x, y, title) {

    function heat() {
        return {
            position: [3, 0],
            type: TYPES.CUSTOM,
            title: 'Grzanie',
            id: id,
            icon: 'mdi-radiator',
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'heat'
                    }
                });
            }
        }
    }

    function cool() {
        return {
            position: [1, 0],
            type: TYPES.CUSTOM,
            title: 'Chłodzenie',
            id: id,
            icon: 'mdi-snowflake',
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'cool'
                    }
                });
            }
        }
    }

    function clean() {
        return {
            position: [2, 0],
            type: TYPES.CUSTOM,
            title: 'Oczyszczanie',
            id: id,
            icon: 'mdi-air-purifier',
            state: false,
            secondaryAction: '',
            action: async function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_temperature",
                    service_data: {
                        entity_id: item.id,
                        temperature: 19,
                    }
                });

                await sleepAsPromise(30000);

                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_preset_mode",
                    service_data: {
                        entity_id: item.id,
                        preset_mode: 'iot_uv_and_cool'
                    }
                });
            }
        }
    }

    function off() {
        return {
            position: [0, 0],
            type: TYPES.CUSTOM,
            title: 'Wyłącz',
            id: id,
            icon: 'mdi-fan-off',
            state: false,
            secondaryAction: '',
            action: function (item, entity) {
                this.apiRequest({
                    type: "call_service",
                    domain: "climate",
                    service: "set_hvac_mode",
                    service_data: {
                        entity_id: item.id,
                        hvac_mode: 'off'
                    }
                });
            }
        }
    }

    function temp() {
        return {
            position: [0, 1],
            id: id,
            width: 4,
            type: TYPES.SLIDER,
            unit: '°C',
            title: 'Temperatura',
            icon: 'mdi-thermometer',  // Optional. Slider size will be adjusted automatically.
            // vertical: true,  // Show vertical slider (default: false - horizontal).
            // singleLine: true,  // Makes the optional icon, the slider and the icon be shown on single line (default: false, only works with horizontal slider).
            // legacy: true,  // Old-style slider that only works in horizontal mode (default: false).
            // bottom: true, // puts slider on the bottom (default: false, only work with the legacy slider).
            state: false,
            //   filter: function (value, item, entity) {return entity.attributes.temperature},
            // For light entities a filter function can be used to convert the value from 0-255 to 0-100% range.
            //filter: function (value) {
            //    var num = parseFloat(value) / 2.55;
            //    return num && !isNaN(num) ? num.toFixed() : 0;
            //},
            slider: {
                max: 25,
                min: 16,
                step: 1,
                field: 'temperature',
                // sliderWidth: '60',     // Custom slider width
                // sliderHeight: '270',   // Custom slider height
                request: {
                    type: "call_service",
                    domain: "climate",
                    service: "set_temperature",
                    field: "temperature"
                },
            },
        }
    }

    return {
        position: [x, y],
        type: TYPES.POPUP,
        id: id,
        icon: 'mdi-air-conditioner',
        title: title,
        state: false,

        action: function (item, entity) {
            this.$scope.openPopup(item, entity);
            this.$scope.popupTimeout = setTimeout(function () {
                // Close the popup
                this.$scope.closePopup();
            }.bind(this), 10000);
        },
        popup: {
            //   tileSize: 100,
            items: [
                off(),
                cool(),
                clean(),
                heat(),
                temp()
            ]
        },
        // states: {
        //     'auto': '',
        //     'heat': 'Grzanie',
        //     'cool': 'Chłodzenie',
        //     'off': 'Wyłączona'
        // },
        //  history: { // If this is present in a tile, a history popup is created on secondary action
        //      entity: id.replace('climate','sensor') + '_indoor_temperature' , // Entity ID (or an array of IDs) to render history for. Default: entity id of the tile itself
        //      offset: 24*3600*1000*5, // Start point of the history counting from now(). Default: one day
        //      options: { elements: {point: {radius: 3}}}, // Chart options. Refer to https://www.chartjs.org/.
        //      styles: { border: '1px solid red'}, // Styles to apply to the <div> containing the chart. Default according to main.css
        //     // classes: 'clock--colon', // Classes to apply to the history popup. Default according to main.css
        //  },
    };


//  return {
//    position: [x, y],
//    title: title,
//    id: id,
//    type: TYPES.CLIMATE,
//    unit: '°C',
//    useHvacMode: true,  // Optional: enables HVAC mode (by default uses PRESET mode)
//    state: function (item, entity) {
//      return 'Aktualnie: ' + this.$scope.filterNumber(entity.attributes.current_temperature, 1) + ' °C';
//    },
//    states: {
//      'auto': '',
//      'heat': 'Grzanie',
//      'cool': 'Chłodzenie',
//      'off': 'Wyłączona'
//    },
//  };
}

const weatherIcons = {
    'clear-day': 'clear',
    'clear-night': 'nt-clear',
    'cloudy': 'nt-cloudy',
    'exceptional': 'unknown',
    'fog': 'fog',
    'hail': 'sleet',
    'lightning': 'chancestorms',
    'lightning-rainy': 'tstorms',
    'partly-cloudy-day': 'partlycloudy',
    'partly-cloudy-night': 'nt-partlycloudy',
    'partlycloudy': 'partlycloudy',
    'pouring': 'rain',
    'rainy': 'rain',
    'snowy': 'snow',
    'snowy-rainy': 'sleet',
    "sunny": "sunny",
    'wind': 'unknown',
    'windy': 'unknown',
    'windy-variant': 'unknown'
};


const weatherStates = {
    "clear-night": "Pogodna noc",
    "cloudy": "Zachmurzenie",
    "exceptional": "Wyjątkowe warunki",
    "fog": "Mgła",
    "hail": "Grad",
    "lightning": "Błyskawice",
    "lightning-rainy": "Błyskawice, deszcz",
    "partlycloudy": "Cz. zachmurzenie",
    "pouring": "Ulewa",
    "rainy": "Deszcz",
    "snowy": "Śnieg",
    "snowy-rainy": "Śnieg, deszcz",
    "sunny": "Słonecznie",
    "windy": "Wietrznie",
    "windy-variant": "Wietrznie"
};

let energaDetails = {
    taryfa_nocna: 'Brak danych',
    taryfa_dzienna: 'Brak danych',
    suma_licznikow: 'Nieznana',
    pozostalo_limitu: 'Brak danych',
    dni_limitu: 'Brak danych'
}

function closeNotificationOld() {
    var notificationContainer = document.querySelector('.notification-container');
    if (notificationContainer) {
        // Hide the notification container
        notificationContainer.style.display = 'none';

        // Optionally, remove the notification from the page (if you don't want it to reappear)
        var notificationsPage = document.getElementById('full-screen-notify');
        notificationsPage.remove();
    }
}
var iframeTimeouts = {};

function closeNotification(id) {
    // Usuwamy pełnoekranową nakładkę
    var fullScreen = document.getElementById('full-screen-event-iframe');
    if (fullScreen) fullScreen.remove();
  
    // Usuwamy wskazany corner-iframe, jeśli istnieje
    if (id) {
      var corner = document.getElementById(id);
      if (corner) corner.remove();
      // Jeśli mieliśmy timeout dla tego iframa – czyścimy
      if (iframeTimeouts[id]) {
        clearTimeout(iframeTimeouts[id]);
        delete iframeTimeouts[id];
      }
    }
  
    // Jeśli nie ma już żadnego corner-iframe, usuwamy kontener flexbox
    const iframes = document.getElementsByClassName("event-corner-iframe-container");
    const flexboxContainer = document.getElementById('corner-iframe-flexbox');
    if (iframes.length === 0 && flexboxContainer) {
      flexboxContainer.remove();
    }
  }

  function closeAllCornerIframes() {
    // Usuwamy wszystkie iframy w rogu
    var iframes = document.querySelectorAll('.event-corner-iframe-container');
    iframes.forEach(function(iframe) { iframe.remove(); });
    
    // Usuwamy cały flexbox, o ile istnieje
    var flexboxContainer = document.getElementById('corner-iframe-flexbox');
    if (flexboxContainer) flexboxContainer.remove();
  }


function iframeNotificationAlreadyExists(type, url) {
    if (type === "full-screen-event-iframe") {
        return document.getElementById('full-screen-event-iframe');
    } else if (type === "event-corner-iframe") {
        var iframes = document.querySelectorAll('.event-corner-iframe');
        for (var i = 0; i < iframes.length; i++) {
            if (iframes[i].src === url) {
                return true;
            }
        }
    }
    return false;
}
function formatWatts(aktualnieW, forceKW = false, noUnit = false) {
    if (aktualnieW >= 1000 || forceKW) {
        return (aktualnieW / 1000).toFixed(2) + (noUnit ? '' : 'kW'); // Convert to kW and format to 2 decimal places
    } else {
        return aktualnieW + (noUnit ? '' : 'W'); // Display in Watts
    }
}

function relativeTimeSinceDate(lastTriggered) {
    const now = new Date();
    var diff = Math.abs(now - lastTriggered); // difference in milliseconds

    var seconds = Math.floor(diff / 1000);
    var minutes = Math.floor(seconds / 60);
    var hours = Math.floor(minutes / 60);
    var days = Math.floor(hours / 24);
    var months = Math.floor(days / 30);
    var years = Math.floor(days / 365);

    seconds %= 60;
    minutes %= 60;
    hours %= 24;
    days %= 30;  // Approximation, assuming each month has 30 days
    if (years > 0) {
        return 'mies';
    } else if (months > 0) {
        return months + 'mies ' + days + 'd';
    } else if (days > 0) {
        return days + 'd ' + hours + 'g';
    } else if (hours > 0) {
        return hours + 'g ' + minutes + 'm';
    } else if (minutes > 0) {
        return minutes + 'm'; // + seconds + 's temu'; Ukrycie sekund
    } else {
        return seconds + 's';
    }
}
function relativeTimeFromMinutes(remainingMinutes) {
    if (remainingMinutes >= 1440) { // More than or equal to 1 day
        var days = Math.floor(remainingMinutes / 1440);
        var hours = Math.floor((remainingMinutes % 1440) / 60);
        return days + 'd ' + hours + 'g';
    } else if (remainingMinutes >= 60) { // More than or equal to 1 hour
        var hours = Math.floor(remainingMinutes / 60);
        var minutes = remainingMinutes % 60;
        return hours + 'g ' + minutes + 'm';
    } else { // Less than 1 hour
        return remainingMinutes + 'm';
    }
}

function updateFontSize(size) {
    if (!document.getElementById('custom-font-size-style')) {
        const style = document.createElement('style');
        style.id = 'custom-font-size-style'; // Unikalny identyfikator
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

var CONFIG = {
    // customTheme: CUSTOM_THEMES.COMPACT, // CUSTOM_THEMES.TRANSPARENT, CUSTOM_THEMES.MATERIAL, CUSTOM_THEMES.MOBILE, CUSTOM_THEMES.COMPACT, CUSTOM_THEMES.HOMEKIT, CUSTOM_THEMES.WINPHONE, CUSTOM_THEMES.WIN95

    customTheme: CUSTOM_THEMES.HOMEKIT, // CUSTOM_THEMES.TRANSPARENT, CUSTOM_THEMES.MATERIAL, CUSTOM_THEMES.MOBILE, CUSTOM_THEMES.COMPACT, CUSTOM_THEMES.HOMEKIT, CUSTOM_THEMES.WINPHONE, CUSTOM_THEMES.WIN95
    transition: TRANSITIONS.ANIMATED, //ANIMATED or SIMPLE (better perfomance)
    entitySize: ENTITY_SIZES.SMALL, //SMALL, BIG are available
    tileSize: getURLParameter("tileSize") || 140,
    tileMargin: getURLParameter("tileMargin") || 6,
    groupMarginCss: '8px 10px 0px',
    serverUrl: 'http://192.168.50.52:8123',
    wsUrl: 'ws://192.168.50.52:8123/api/websocket',
    authToken: null, // optional long-lived token (CAUTION: only if TileBoard is not exposed to the internet)
    //googleApiKey: "XXXXXXXXXX", // Required if you are using Google Maps for device tracker
    //mapboxToken: "XXXXXXXXXX", // Required if you are using Mapbox for device tracker
    debug: false, // Prints entities and state change info to the console.
    pingConnection: true, //ping connection to prevent silent disconnections
    locale: 'pl', // locale for date and number formats - available locales: it, de, es, fr, pt, ru, nl, pl, en-gb, en-us (default). See readme on adding custom locales.
    // next fields are optional
 events: [
  /* TileBoard growl-style notifications – unchanged */
  {
    command: 'notify',
    action: e => window.Noty.addObject(e)
  },

  /* Full-screen iframe (old openIframe) */
  {
    command: 'openIframe',
    action(event) {
      NotificationManager.openFullScreen({
        title: event.title,
        url:   event.url,
        duration: event.duration            // falls back to 30 s if undefined
      });

      /* optional tracking – keep if you still need those input_text helpers */
      this.apiRequest({
        type: 'call_service',
        domain: 'input_text',
        service: 'set_value',
        service_data: {
          entity_id: isUpstairsLocation()
            ? 'input_text.tileboard_upstairs_current_event_openiframe'
            : 'input_text.tileboard_downstairs_current_event_openiframe',
          value: 'full-screen-event-iframe'
        }
      });
    }
  },

  /* Corner iframe (old openCornerIframe) */
  {
    command: 'openCornerIframe',
    action(event) {
      NotificationManager.openCorner({
        title:   event.title,
        url:     event.url,
        duration: event.duration,           // falls back to 20 s if undefined
        apiRequest: this.apiRequest         // lets the helper update input_text automatically
      });
    }
  },

  /* Simple text overlay – kept, but now closes via NotificationManager */
  {
    event: 'notify',
    action(event) {
      NotificationManager.close('full-screen-notify');

      const overlay = document.createElement('div');
      overlay.className = 'notification-overlay';
      overlay.id        = 'full-screen-notify';
      overlay.innerHTML = `
        <div class="notification-container">
          <span class="close-button" data-close="full-screen-notify">&times;</span>
          <div class="notification-title">${event.title}</div>
          <div class="notification-message">${event.message}</div>
        </div>`;

      overlay.onclick = e => {
        if (e.target.dataset.close || e.currentTarget === e.target) {
          NotificationManager.close('full-screen-notify');
        }
      };

      document.body.appendChild(overlay);
      setTimeout(() => NotificationManager.close('full-screen-notify'),
                 (event.duration || 10) * 1000);
    }
  }
],

    timeFormat: 24,
    menuPosition: MENU_POSITIONS.LEFT, // or BOTTOM
    hideScrollbar: false, // horizontal scrollbar
    // groupsAlign: GROUP_ALIGNS.HORIZONTALLY, // HORIZONTALLY, VERTICALLY, GRID
    groupsAlign: GROUP_ALIGNS.GRID, // HORIZONTALLY, VERTICALLY, GRID
    onReady: function () {
        let newFontSize= getURLParameter("fontSize");
        if(newFontSize){
            updateFontSize(newFontSize);
        }
        window.CUSTOM_THEMES_HOMEKIT = CUSTOM_THEMES.HOMEKIT;
        this.apiRequest({
            type: "call_service",
            domain: "input_text",
            service: "set_value",
            service_data: {
                entity_id: isUpstairsLocation() ? "input_text.tileboard_upstairs_current_event" : "input_text.tileboard_downstairs_current_event",
                value: "ready"
            }
        });
    },

    header: { // https://github.com/resoai/TileBoard/wiki/Header-configuration
        styles: {
            margin: '0px 15px 0',
            fontSize: '16px'
        },
        right: [
            {
                type: HEADER_ITEMS.WEATHER,
                styles: {
                    margin: '0'
                },
                icon: '&weather.openweathermap.state',
                state: '',
                icons: weatherIcons,
                states: weatherStates,
                fields: {
                    //     summary: '&sensor.czerpnia_temperatura.state pamietaj</br> smieci jutro!',
                    temperature: '&sensor.temperature_zewnetrzna_pompa_ciepla.state',
                    temperatureUnit: '°C (aktualnie)',
                    windSpeed: '&sensor.openweathermap_wind_speed.state',
                    windSpeedUnit: '&sensor.openweathermap_wind_speed.attributes.unit_of_measurement',
                    humidity: '&sensor.openweathermap_humidity.state',
                    humidityUnit: '&sensor.openweathermap_humidity.attributes.unit_of_measurement',
                    pressure: '&sensor.openweathermap_pressure.state',
                    pressureUnit: '&sensor.openweathermap_pressure.attributes.unit_of_measurement',
                }
            }
            
        ],
        left: [
            {
                type: HEADER_ITEMS.DATETIME,
                dateFormat: 'EEEE, dd LLLL', //https://docs.angularjs.org/api/ng/filter/date
            },
/*            {
                type: HEADER_ITEMS.CUSTOM_HTML,
                html: 'Hello moto! <b>TileBoard</b>',
                styles: {
                    margin: '40px 0 0'
                }
            }*/
        ]
    },

    /*screensaver: {// optional. https://github.com/resoai/TileBoard/wiki/Screensaver-configuration
       timeout: 300, // after 5 mins of inactive
       slidesTimeout: 10, // 10s for one slide
       styles: { fontSize: '40px' },
       leftBottom: [{ type: SCREENSAVER_ITEMS.DATETIME }], // put datetime to the left-bottom of screensaver
       slides: [
          { bg: 'images/bg1.jpeg' },
          {
             bg: 'images/bg2.png',
             rightTop: [ // put text to the 2nd slide
                {
                   type: SCREENSAVER_ITEMS.CUSTOM_HTML,
                   html: 'Welcome to the <b>TileBoard</b>',
                   styles: { fontSize: '40px' }
                }
             ]
          },
          { bg: 'images/bg3.jpg' }
       ]
    },*/

    pages: [
        {
            title: 'Main page',
           // bg: 'images/peakpx.jpg',
            bg: 'images/dark-polygonal-background.jpg',
            icon: 'mdi-home-outline', // home icon
            groups: [
                {
                    title: 'Pogoda',
                    width: 2,
                    height: 6,
                    // row: 1,  // optional; index of the row used for the GRID layout. If not specified, the default is 0
                    items: [
                        {
                            position: [0, 0],
                            height: 1,
                            width: 2,
                            classes: ['-compact'], // enable this if you want a littlłe square tile (1x1)
                            type: TYPES.WEATHER, title: '',
                            id: 'weather.openweathermap',
                            state: '&weather.openweathermap.state', // label with weather summary (e.g. Sunny)
                            // Resolved value must either match one of the supported icons or be mapped
                            // to one using the 'icons' option. See the 'icons' option for more information.
                            icon: '&weather.openweathermap.state',
                            // Use this one if you have an URL of the image to show.
                            //iconImage: '&sensor.my_weather_icon.state',
                            // A map from sensor's state (key) to icon name (value).
                            // The value must match the format:
                            //   [dark-][nt-]icon_name
                            // where dark- (optional) selects the dark version of the icon,
                            // and nt- (optional) selects the night version of the icon and the icon_name can be one of:
                            //   chanceflurries
                            //   chancerain
                            //   chancesleet
                            //   chancesnow
                            //   chancetstorms
                            //   clear
                            //   cloudy
                            //   flurries
                            //   fog
                            //   hazy
                            //   mostlycloudy
                            //   mostlysunny
                            //   partlycloudy
                            //   partlysunny
                            //   rain
                            //   sleet
                            //   snow
                            //   sunny
                            //   tstorms
                            //   unknown
                            // So for example, to map 'clear-night' sensor value to a respective icon, set the value to
                            // 'nt-clear' (for light icon) or 'dark-nt-clear' (for dark icon).
                            icons: weatherIcons,
                            // A map from sensor's state (key) to human readable and possibly localized strings.
                            states: weatherStates,
                            fields: { // most of that fields are optional
                                summary: '&weather.openweathermap.state',
                                temperature: '&sensor.openweathermap_temperature.state',
                                temperatureUnit: '&sensor.openweathermap_temperature.attributes.unit_of_measurement',
                                windSpeed: '&sensor.openweathermap_wind_speed.state',
                                windSpeedUnit: '&sensor.openweathermap_wind_speed.attributes.unit_of_measurement',
                                humidity: '&sensor.openweathermap_humidity.state',
                                humidityUnit: '&sensor.openweathermap_humidity.attributes.unit_of_measurement',
                                pressure: '&sensor.openweathermap_pressure.state',
                                pressureUnit: '&sensor.openweathermap_pressure.attributes.unit_of_measurement',

                                list: [
                                    /*                                    // custom line
                                                                        'Rain: '
                                                                        + '&sensor.openweathermap_rain.state '
                                                                        + '&sensor.openweathermap_rain.attributes.unit_of_measurement',
                                                                        'Snow: '
                                                                        + '&sensor.openweathermap_snow.state '
                                                                        + '&sensor.openweathermap_snow.attributes.unit_of_measurement',
                                                                        'Cloud coverage '
                                                                        + '&sensor.openweathermap_cloud_coverage.state'
                                                                        + '&sensor.openweathermap_cloud_coverage.attributes.unit_of_measurement',*/
                                ]
                            }
                        },
                        {
                            position: [1, 0], // Adjust the tile position as needed
                            type: TYPES.CUSTOM,
                            id: 'calendar.smieci',
                            icon: 'mdi-trash-can',
                            hidden: true,
                            hidden2: function () {
                                // Get the sensor entity state
                                var sensorState = this.$scope.states['sensor.smieci_jutro'];
                                //   debugger;
                                if (Array.isArray(sensorState.attributes.jutro["calendar.smieci"].events)) {
                                    return sensorState.attributes.jutro["calendar.smieci"].events
                                        .filter(function (event) {
                                            return event.summary.indexOf("TERMINY") === -1;
                                        }).length === 0
                                } else {
                                    return true;
                                }

                            },
                            state: function () {
                                return 'Jutro'
                                // Get the calendar entity state
                                var calendarState = this.$scope.states['calendar.smieci'];

                                // Check if the event is tomorrow
                                var eventDate = new Date(calendarState.attributes.start_time);
                                var tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);

                                // Define the state text based on the event date
                                var stateText = '';
                                if (eventDate.toDateString() === tomorrow.toDateString()) {
                                    stateText = 'Jutro';
                                } else {
                                    // Get the day of the week in Polish
                                    var daysOfWeek = ['Niedziela', 'Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota'];
                                    stateText = daysOfWeek[eventDate.getDay()];
                                }
                                return stateText;
                            },
                            customHtml: function () {
                                function events(_this) {
                                    // Get the sensor entity state
                                    var sensorState = _this.$scope.states['sensor.smieci_jutro'];
                                    // Check if the entity has a 'jutro' attribute and it is an array
                                    if (Array.isArray(sensorState.attributes.jutro["calendar.smieci"].events)) {
                                        // Extract all 'summary' values from the 'jutro' attribute
                                        var summaries = sensorState.attributes.jutro["calendar.smieci"].events
                                            .filter(function (event) {
                                                return event.summary.indexOf("TERMINY") === -1;
                                            })
                                            .map(function (event) {
                                                return event.summary.replace("METALE I TWORZYWA SZTUCZNE", "METALE I PLASTIK");
                                            });

                                        // Join the 'summary' values into a comma-separated string
                                        return summaries.join(', ');
                                    } else {
                                        // Handle the case where 'jutro' is not an array or is empty
                                        return 'No upcoming events';
                                    }

                                }


                                // Get the calendar entity state
                                var calendarState = this.$scope.states['calendar.smieci'];

                                // Check if the event is tomorrow
                                var eventDate = new Date(calendarState.attributes.start_time);
                                var tomorrow = new Date();
                                tomorrow.setDate(tomorrow.getDate() + 1);

                                //  var message = calendarState.attributes.message.toLowerCase();
                                var message = events(this).replace('WIELKOGABARYTY', 'WLK. GAB').trim();
                                var color = 'grey';
                                if (message.includes('PAPIER')) {
                                    color = 'blue';
                                } else if (message.includes('SZKŁO')) {
                                    color = 'green';
                                } else if (message.includes('RESZTKOWE')) {
                                    color = 'black';
                                } else if (message.includes('BIO')) {
                                    color = 'brown';
                                } else if (message.includes('PLASTIK')) {
                                    color = 'rgb(242 234 73)';
                                }

                                // Define the CSS class for the pulsing effect

                                // Define the tile's HTML content
                                //                                return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-washing-machine" ng-class="entityIcon(item, entity)"></span>' + '  </div><br/><div>' + timeString + '</div>';
                                var htmlContent = `
              <div class="item-entity pulsing">
                  <span class="item-entity--icon mdi  mdi-trash-can pulsing"  style=" color: ${color}; "></span> 
                  </div><br/><div>   ${message} </div>
              
            `;

                                return htmlContent;
                            }
                        },
                        {
                            position: [0, 1],
                            type: TYPES.IFRAME,
                            id: {},
                            width: 2,
                            height: 2,
                            refresh: 600000, // 10 seconds
                  //          url: 'https://embed.windy.com/embed2.html?lat=54.296&lon=18.610&detailLat=54.296&detailLon=18.610&width=650&height=450&zoom=9&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1'
                            url: 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=10&overlay=rain&product=ecmwf&level=surface&lat=54.296&lon=18.610&detailLat=54.296&detailLon=18.610&detail=false&message=true&lang=pl'
                        },
                                    
                        {
                            position: [2, 0],
                            type: TYPES.AUTOMATION,
                            state: function (item, entity) {
                                const current = entity.attributes.current || 0;
                                if (current > 0) {
                                    return 'w trakcie';
                                }
                                const triggered = entity.attributes.last_triggered;
                                if (!triggered) {
                                    return '';
                                }
                                const lastTriggered = new Date(triggered);
                                return relativeTimeSinceDate(lastTriggered);
                            },
                            title: 'Wietrzenie',
                            subtitle: 'Uruchom',
                            id: 'automation.wietrzenie',
                            icon: 'mdi-fan-clock'
                        },

                        climateWithCustomUsageOf('climate.salon_klimatyzator', 3, 0, "Salon", undefined, 'sensor.temperatura_govee_salon', '9e27ae60f9a86d62e614389a0002bc06'),
                        climateWithCustomUsageOf('climate.sypialnia_klimatyzator', 2, 1, "Sypialnia", "switch.ogrzewanie_sypialnia_wlacznik", "sensor.temperatura_govee_sypialnia", '03e552cd9addf227e259d1e22de9cf72'),
                        climateWithCustomUsageOf('climate.biuro_klimatyzator', 3, 1, "Biuro", "switch.ogrzewanie_biuro_wlacznik", 'sensor.temperatura_govee_biuro', 'eb1d7eef08a4b57a886942fbbe6ef645'),
                        climateWithCustomUsageOf('climate.dzieciecy_klimatyzator', 3, 2, "Dzieciecy", "switch.ogrzewanie_dzieciecy_wlacznik", 'sensor.temperatura_govee_dzieciecy', '8ef4184a953aa2868dbfe17e8803842c'),
                        climateWithCustomUsageOf('climate.trzeci_pokoj_klimatyzator', 2, 2, "Trzeci pokój", "switch.ogrzewanie_trzeci_pokoj_wlacznik", 'sensor.temperatura_govee_trzeci_pokoj', '4bb4d0f69283c7a6bc7346ac8a55ded6')


                        /*  pinProtectedAction({
                              id: 'climate.trzeci_pokoj_klimatyzator',
                              title: 'Turn Off Climate',
                              icon: 'mdi-thermometer-off',
                              pin: '4321',
                              x: 0,
                              y: 2,
                              attemptsAllowed: 3,
                              timeoutSeconds: 10,
                              lockTimeMultiplier: 2,
                              action: function() {
                                  this.apiRequest({
                                      type: "call_service",
                                      domain: "climate",
                                      service: "set_hvac_mode",
                                      service_data: {
                                          entity_id: 'climate.trzeci_pokoj_klimatyzator',
                                          hvac_mode: 'off'
                                      }
                                  });
                              }
                          }),
                        */  
                       ,{
                            position: [2, 3], // Adjust the position as needed
                            title: 'Rekuperacja',
                            id: 'climate.rekuperacja_temperatura_komfortu',
                            type: TYPES.CUSTOM,
                            customHtml: function (item, entity) {
                                const fanMode = entity.attributes.fan_mode;
                                let icon, level;
                                switch (fanMode) {
                                    case 'high':
                                        icon = "fan-speed-3"
                                        level = 3;
                                        break;
                                    case 'medium':
                                        icon = "fan-speed-2"
                                        level = 2;
                                        break;
                                    case 'low':
                                        icon = "fan-speed-1"
                                        level = 1;
                                        break;
                                    case 'off':
                                        icon = "fan-off";
                                        level = 0;
                                        break;
                                }

                                // Create and return the custom HTML content
                                return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-' + icon + '"></span>' + '  </div><br/><div></div>';
                            },
                            state: function (item, entity) {
                                const czerpnia = this.$scope.states["sensor.czerpnia_temperatura"].state + "°C";
                                const nawiew = this.$scope.states["sensor.nawiew_temperatura"].state + "°C";
                                return czerpnia + " ➪ " + nawiew;
                            },
                            unit: '',
                            action: function (item, entity) {
                                const fanMode = entity.attributes.fan_mode;
                                let icon, level;
                                switch (fanMode) {
                                    case 'high':
                                        icon = "fan-speed-3"
                                        level = 3;
                                        break;
                                    case 'medium':
                                        icon = "fan-speed-2"
                                        level = 2;
                                        break;
                                    case 'low':
                                        icon = "fan-speed-1"
                                        level = 1;
                                        break;
                                    case 'off':
                                        icon = "fan-off";
                                        level = -1;
                                        break;
                                }

                                const buttons = [
                                    // 'button.wlacz_obroty_na_off',
                                    'button.wlacz_obroty_na_low',
                                    'button.wlacz_obroty_na_medium',
                                    'button.wlacz_obroty_na_high'
                                ]

                                let nextLevel;

                                if (level === -1 || level > buttons.length - 1) {
                                    nextLevel = 0;
                                } else {
                                    nextLevel = level;
                                }

                                this.apiRequest({
                                    type: "call_service",
                                    domain: "button",
                                    service: "press",
                                    service_data: {
                                        entity_id: buttons[nextLevel],
                                    }
                                });
                            }
                        },

                        /*                        {
                                                    position: [0, 3],
                                                    id: "climate.pompa_ciepla_dom",
                                                    width: 1,
                                                    type: TYPES.CLIMATE,
                                                    unit: 'C',
                                                    title: 'Pompa Ciepła',
                                                    useHvacMode: false,  // Optional: enables HVAC mode (by default uses PRESET mode)
                                                    state: function (item, entity) {
                                                        return 'Aktualnie  '
                                                            + entity.attributes.current_temperature + 'C';
                                                    },
                                                },*/
                        {
                            position: [3, 3],
                            type: TYPES.AUTOMATION,
                            title: 'Cyrkulacja',
                            //  subtitle: 'Uruchom',
                            subtitle: function () {
                                const state = this.$scope.states['water_heater.pompa_ciepla_io_13873843_2'].state;
                                switch (state) {
                                    case 'off':
                                        return "CWU: Wył."
                                    case 'performance':
                                        return "CWU: Priorytet."
                                    case 'heat_pomp':
                                        return "CWU: Pompa Ciepła."
                                    default:
                                        return state;
                                }
                            },
                            id: 'automation.wlacz_cyrkulacje',
                            icon: 'mdi-faucet',
                            state: function (item, entity) {
                                const temp = this.$scope.states['sensor.temperatura_c_w_u'].state
                                    + "°C 🌡️ "

                                const current = entity.attributes.current || 0;
                                if (current > 0) {
                                    return temp + ' w trakcie';
                                }
                                const triggered = entity.attributes.last_triggered;
                                if (!triggered) {
                                    return temp + '';
                                }
                                const lastTriggered = new Date(triggered);
                                return temp + relativeTimeSinceDate(lastTriggered);
                            },

                        },
                    //Energia
                    
                    {
                        position: [4, 0],
                        // Energia - zuzycie dzisiaj
                        title: 'Zużycie',
                        value: function () {
                            const pobrana = roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_pobrana_z_sieci_dzisiaj'].state);
                            return pobrana;
                        },
                        type: TYPES.SENSOR,
                        state: function () {
                            const wyprodukowana = parseFloat(this.$scope.states['sensor.inverter_dzienna_produkcja'].state || "0") || 0;
                            const wyslana = parseFloat(this.$scope.states['sensor.energia_wyslana_do_sieci_dzisiaj_calkowita'].state || "0") || 0;
                            const pobrana = parseFloat(this.$scope.states['sensor.energia_pobrana_z_sieci_dzisiaj_calkowita'].state || "0") || 0;
                            return "Całkowita: " + roundToTwoDecimalPlaces(pobrana + (wyprodukowana - wyslana)) + "kWh";
                        },
                        id: 'sensor.energia_zuzycie_dzisiaj',
                        unit: 'kWh',
                    },
                    {
                        position: [4, 1],
                        // Energia - na ogrzewanie dzisiaj
                        title: 'Ogrzewanie',
                        type: TYPES.SENSOR,
                        state: function () {

                            const aktualnieWcalosc = parseFloat(this.$scope.states['sensor.glowny_total_system_power'].state);
                            const aktualnieW = parseFloat(this.$scope.states['sensor.ogrzewanie_total_system_power'].state);

                            let displayValue;
                            displayValue = formatWatts(aktualnieW);

                            let percentageUsage = 0;

                            if (aktualnieWcalosc > 0) { // Check to avoid division by zero
                                percentageUsage = (aktualnieW / aktualnieWcalosc) * 100;
                                percentageUsage = Math.round(percentageUsage); // Round to
                            }

                            return "" + displayValue + " (" + percentageUsage + "%)";
                        },
                        id: 'sensor.energia_na_ogrzewanie_dzisiaj',
                        unit: 'kWh', // assuming the unit is kWh, change if needed
                    },
                    {
                        position: [4, 2],
                        // Energia - na ogrzewanie dzisiaj
                        title: function () {
                            return "Teraz: +" + formatWatts(this.$scope.states['sensor.inverter_moc_czynna'].state,false, false) + ""
                        },
                        state: function () {
                            const sprzedana = roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_oddana_do_sieci_dzisiaj'].state);
                            return "Sprzedana: " + sprzedana + "kWh";
                        },
                        type: TYPES.SENSOR,
                        id: 'sensor.inverter_dzienna_produkcja',
                        unit: 'kWh', // assuming the unit is kWh, change if needed
                    },
                    {
                        position: [4, 3],
                        // Energia - na ogrzewanie dzisiaj
                        title: 'Chwilowe zużycie',
                        customStyles: function (item, entity) {
                            const watts = entity.state;
                            const color = calculateColor(watts);
                            updateFlowingIndicator(watts, color);
                            const boxShadowValue = `0px 0px 16px 8px ${color}`;
                            //   updateAnimatedLine(watts);
                            return {
                                boxShadow: boxShadowValue,
                            };
                        },
                        state: function () {
                            const current = roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_bilans_netto'].state);
                            return "[1h]: " + current + "kWh"
                        },
                        filter: function (value) { // optional
                            return formatWatts(value, true, true);
                        },
                        type: TYPES.SENSOR,
                        id: 'sensor.glowny_total_system_power',
                        unit: 'kW', // assuming the unit is kWh, change if needed
                    },
                    // {
                    //     position: [0, 4],
                    //     width: 1,
                    //     height: 1,
                    //     title: 'Energy Production',
                    //     subtitle: '',
                    //     type: TYPES.GAUGE,
                    //     id: 'sensor.glowny_total_system_power', // Assign the sensor you want to display on the gauge
                    //     value: function(item, entity){
                    //         return entity.state;
                    //     },
                    //     settings: {
                    //         size: 140, // Defaults to 50% of either height or width, whichever is smaller
                    //         type: 'semi', // Options are: 'full', 'semi', and 'arch'. Defaults to 'full'
                    //         min: -6000, // Defaults to 0
                    //         max: 6000, // Defaults to 100
                    //         cap: 'butt', // Options are: 'round', 'butt'. Defaults to 'butt'
                    //         thick: 6, // Defaults to 6
                    //         label: 'My Gauge', // Defaults to undefined
                    //         append: '@attributes.unit_of_measurement', // Defaults to undefined
                    //         prepend: '', // Defaults to undefined
                    //         duration: 1500, // Defaults to 1500ms
                    //         thresholds: { 0: { color: 'green'}, 80: { color: 'red' } },  // Defaults to undefined
                    //         labelOnly: false, // Defaults to false
                    //         foregroundColor: 'rgba(0, 150, 136, 1)', // Defaults to rgba(0, 150, 136, 1)
                    //         backgroundColor: 'rgba(0, 0, 0, 0.1)', // Defaults to rgba(0, 0, 0, 0.1)
                    //         fractionSize: 0, // Number of decimal places to round the number to. Defaults to current locale formatting
                    //     },
                    // }
               
                                   
                    {
                        position: [5, 0],
                        type: TYPES.CUSTOM,
                        title: 'Salon - Ogród',
                        id: 'cover.roleta_ogrod',
                        //  customHtml: '<b>Hi</b>',  // Can also be a function that will be passed item and entity.
                        action: function (item, entity) {
                            this.apiRequest({
                                type: "call_service",
                                domain: "cover",
                                service: entity.state === "closed" ? "open_cover" : "close_cover",
                                service_data: {
                                    entity_id: item.id
                                }
                            });
                        },
                        states: {
                            open: "Otwarte",
                            closed: "Zamknięte"
                        },
                        icons: {closed: "mdi-curtains-closed", open: "mdi-curtains"},
                        secondaryAction: function (item, entity) {
                            return this.$scope.openPopupIframe(item, entity);
                        }
                    },
                    {
                        position: [5, 1],
                        type: TYPES.CUSTOM,
                        title: 'Salon - Bok',
                        id: 'cover.salon_bok',
                        //  customHtml: '<b>Hi</b>',  // Can also be a function that will be passed item and entity.
                        action: function (item, entity) {
                            this.apiRequest({
                                type: "call_service",
                                domain: "cover",
                                service: entity.state === "closed" ? "open_cover" : "close_cover",
                                service_data: {
                                    entity_id: item.id
                                }
                            });
                        },
                        states: {
                            open: "Otwarte",
                            closed: "Zamknięte"
                        },
                        icons: {closed: "mdi-curtains-closed", open: "mdi-curtains"},
                        secondaryAction: function (item, entity) {
                            return this.$scope.openPopupIframe(item, entity);
                        }
                    },
                    {
                        position: [5, 2],
                        type: TYPES.CUSTOM,
                        title: 'Sypialnia',
                        id: 'cover.zaslony_sypialnia',
                        hidden: isDownstairsLocation(),
                        //  customHtml: '<b>Hi</b>',  // Can also be a function that will be passed item and entity.
                        action: function (item, entity) {
                            this.apiRequest({
                                type: "call_service",
                                domain: "cover",
                                service: entity.state === "closed" ? "open_cover" : "close_cover",
                                service_data: {
                                    entity_id: item.id
                                }
                            });
                        },
                        states: {
                            open: "Otwarte",
                            closed: "Zamknięte",
                            opening: "..."
                        },
                        icons: {closed: "mdi-curtains-closed", open: "mdi-curtains", opening: "mdi-timer-sand"},
                        secondaryAction: function (item, entity) {
                            return this.$scope.openPopupIframe(item, entity);
                        }
                    },

                    //    const { title, icon, pin, attemptsAllowed, timeoutSeconds, lockTimeMultiplier, action, position, id, states, icons  } = tileConfig;

                    pinProtectedAction({
                        title: "Garaż",
                        id: 'binary_sensor.brama_garage_door_contact',
                        position: isDownstairsLocation() ? [5, 2] : [5, 3],
                        action: function (_this) {
                            _this.apiRequest({
                                type: "call_service",
                                domain: "automation",
                                service: "trigger",
                                service_data: {
                                    entity_id: "automation.otworz_zamknij_garaz",
                                    skip_condition: true
                                }
                            });
                        },
                        states: {
                            on: "Otwarty",
                            off: "Zamknięty",
                            opening: "..."
                        },
                        icons: {off: "mdi-garage-variant", on: "mdi-garage-open-variant", opening: "mdi-timer-sand"},
                        pin: ['7283', '3006'],
                        attemptsAllowed: 3,
                        timeoutSeconds: 60,
                        lockTimeMultiplier: 1

                    }),
                    {
                        position: isDownstairsLocation() ? [5, 3] : [5, 4],
                        id: 'input_button.pusty_parter',
                        type: TYPES.CUSTOM,
                        state: "Wyłącz wszystko",
                        icon: 'mdi-stairs-up',
                        title: "Pusty parter",
                        action: function (item, entity) {
                            this.apiRequest({
                                type: "call_service",
                                domain: "input_button",
                                service: "press",
                                service_data: {
                                    entity_id: item.id
                                }
                            });
                        }
                    }, 
                    
                    {
                        position: [6, 0],
                        id: 'media_player.lg_oled65cx3la',
                        type: TYPES.MEDIA_PLAYER,
                        title: 'TV',
                        hideSource: false,
                        textSource: 'Źródło',
                        hideMuteButton: true,
                        //state: false,
                        state: '@attributes.media_title',
                        subtitle: '@attributes.media_title',
                        bgSuffix: '@attributes.entity_picture',
                    },
                    {
                        position: [6, 1],
                        id: 'media_player.denon',
                        type: TYPES.MEDIA_PLAYER,
                        title: 'Denon',
                        hideSource: false,
                        textSource: 'Źródło',
                        hideMuteButton: true,
                        //state: false,
                        state: '@attributes.media_title',
                        // subtitle: '@attributes.media_title',
                        bgSuffix: '@attributes.entity_picture',
                    },
                    {
                        position: [6, 2],
                        id: 'media_player.chromecast_lg',
                        type: TYPES.MEDIA_PLAYER,
                        title: 'Chromecast',
                        hideSource: false,
                        textSource: 'Źródło',
                        hideMuteButton: true,
                        //state: false,
                        state: '@attributes.media_title',
                        // subtitle: '@attributes.media_title',
                        bgSuffix: '@attributes.entity_picture',
                    },
                    {
                        position: [6, 3],
                        type: TYPES.VACUUM,
                        id: 'vacuum.l20_ultra',
                        title: 'Odkurzacz',
                        hidden: isUpstairsLocation(),
                        //  subtitle: 'Livingroom',
                        icon: "mdi-robot-vacuum-variant",
                        states: {
                            cleaning: "Sprzątanie",
                            paused: "Pauza",
                            returning: "Powrót",
                            unavailable: "Niedostępny",
                            docked: "Zadokowany",
                            idle: "Bezczynny"
                        }
                    },
                    {
                        position: [6, 4],
                        type: TYPES.CUSTOM,
                        title: 'Odkurz w wejściu',
                        hidden: isUpstairsLocation(),
                        id: 'vacuum.l20_ultra',
                        icon: 'mdi-vacuum-outline',
                        state: false,
                        secondaryAction: '',
                        action: function (item, entity) {
                            this.apiRequest({
                                type: "call_service",
                                domain: "dreame_vacuum",
                                service: "vacuum_clean_segment",
                                service_data: {
                                    entity_id: item.id,
                                    segments: [2],
                                    repeats: 1
                                }
                            });
                        }
                    },
                    {
                        position: [7, 0],
                        title: 'Salon',
                        id: 'light.salon_plafon',
                        type: TYPES.LIGHT,
                        hidden: isUpstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-ceiling-light',
                            off: 'mdi-ceiling-light-outline',
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },

                    szynaSwiatla('light.szyna_cala', 'Szyna - cała', 7, 1),
                   // szynaSwiatla('light.szyna_dodatkowe', 'Szyna - dodatkowe', 7, 2),

                    /*     {
                             position: [0, 1],
                             title: 'Szyna - główne',
                             id: 'light.szyna_glowne',
                             type: TYPES.LIGHT,
                             states: {
                                 on: 'Wł.',
                                 off: 'Wył.',
                             },
                             icons: {
                                 on: 'mdi-track-light',
                                 off: 'mdi-track-light-off',
                             },
                             sliders: [
                                 {
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
                                 },
                             ],
                         },*/
                    /*     {
                             position: [0, 2],
                             title: 'Szyna - dodatkowe',
                             id: 'light.szyna_dodatkowe',
                             type: TYPES.LIGHT,
                             states: {
                                 on: 'Wł.',
                                 off: 'Wył.',
                             },
                             icons: {
                                 on: 'mdi-track-light',
                                 off: 'mdi-track-light-off',
                             },
                             sliders: [
                                 {
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
                                 },
                             ],
                         },*/
                    {
                        position: [7, 2],
                        title: 'Kuchnia',
                        id: 'light.kuchnia',
                        type: TYPES.LIGHT,
                        hidden: isUpstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-ceiling-light',
                            off: 'mdi-ceiling-light-outline',
                        },
                    },
                    {
                        position: [7, 3],
                        title: 'TV',
                        id: 'light.tv_lampy',
                        type: TYPES.LIGHT,
                        hidden: isUpstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-ceiling-light-multiple',
                            off: 'mdi-ceiling-light-multiple-outline',
                            unknown: 'mdi-ceiling-light-multiple-outline'
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },
                    {
                        position: [7, 4],
                        title: 'Lampa stojąca',
                        id: 'light.salon',
                        type: TYPES.LIGHT,
                        hidden: isUpstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-floor-lamp-torchiere-variant',
                            off: 'mdi-floor-lamp-torchiere-variant-outline',
                            unknown: 'mdi-floor-lamp-torchiere-variant-outline'
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },
                    {
                        position: [7, 0],
                        title: 'Sypialnia',
                        id: 'light.sypialnia_glowne',
                        hidden: isDownstairsLocation(),
                        type: TYPES.LIGHT,
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-bed',
                            off: 'mdi-bed',
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },
                    {
                        position: [7, 1],
                        title: 'Dziecięcy - główne',
                        id: 'light.dzieciecy_glowne',
                        type: TYPES.LIGHT,
                        hidden: isDownstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-baby-bottle',
                            off: 'mdi-baby-bottle',
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },
                    {
                        position: [7, 2],
                        title: 'Dziecięcy - lampka',
                        id: 'light.dzieciecy_lampka_nocna',
                        type: TYPES.LIGHT,
                        hidden: isDownstairsLocation(),
                        states: {
                            on: 'Wł.',
                            off: 'Wył.',
                        },
                        icons: {
                            on: 'mdi-lightbulb-night',
                            off: 'mdi-lightbulb-night-outline',
                        },
                        sliders: [
                            {
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
                            },
                        ],
                    },
                
               
                    //Tutajwklej
               //Kamery
               {
                position: [0, 3],
                id: 'camera.drzwi',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Drzwi',
                width: 2,
                height: 2,
                customStyles: {'border-radius': '8px;'},
                state: "",
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Drzwi",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=drzwi&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 10000,  // can be number in milliseconds
            },
            {
                position: [0, 5],
                id: 'camera.podjazd',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Podjazd',
                width: 2,
                height: 1,
                customStyles: {'border-radius': '8px;'},
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Podjazd",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=podjazd&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 11200,  // can be number in milliseconds
            },
            {
                position: [2, 4],
                id: 'camera.ogrod',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Ogród',
                width: 2,
                height: 1,
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Ogród",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=ogrod&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 13600,  // can be number in milliseconds
            },
            {
                position: [4, 4],
                id: 'camera.garaz',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Garaż',
                width: 2,
                height: 1,
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Garaż",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=garaz&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 12400,  // can be number in milliseconds
            },
            {
                position: [4, 5],
                id: 'camera.bok',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Bok',
                width: 4,
                height: 1,
                customStyles: {'border-radius': '8px;'},
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Bok",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=bok&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 12700,  // can be number in milliseconds
            },
            {
                position: [2, 5],
                id: 'camera.przed_domem_duo',
                type: TYPES.CAMERA,
                bgSize: 'cover',
                title: 'Przed domem',
                width: 2,
                height: 1,
                customStyles: {'border-radius': '8px;'},
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Przed domem",
                        url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=przed_domem_duo&showInitialImageEvenTooOld=true',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 12700,  // can be number in milliseconds
            },
            {
                position: [7, 5],
                id: 'camera.drukarka',
                type: TYPES.CAMERA,
                hidden: function () {
                    return this.states['sensor.x1c_remaining_time'].state == 0
                },
                bgSize: 'cover',
                title: 'Drukarka',
                width: 2,
                height: 1,
                customStyles: {'border-radius': '8px;'},
                state: false,
                action: function (item, entity) {
                    this.$scope.openPopupIframe({
                        title: "Drukarka",
                        url: 'http://192.168.50.164:8021/web/single-cam-full.html?media=video+audio&camera=drukarka',
                        iframeStyles: {
                            width: '100%',  // Set width as needed
                            height: '100%', // Set height as needed
                            border: 'none'  // Optional: remove border
                        }
                    })
                },
                refresh: 10000,  // can be number in milliseconds
            },
            {
                position: [9, 5],
                width: 1,
                height: 1,
                type: TYPES.CUSTOM,
                id: {}, // Not needed for custom cards
                title: 'Drukarka',
                state: false,
                hidden: function () {
                    return this.states['sensor.x1c_remaining_time'].state == 0
                },
                customHtml: function () {
                    var progress = parseFloat(this.states['sensor.x1c_print_progress'].state) || 0;
                    var remainingTime = relativeTimeFromMinutes(parseInt(this.states['sensor.x1c_remaining_time'].state) || 0);
                    remainingTime = remainingTime === "0m" ? "" : ("Pozostało: <br/>" + remainingTime)
                    var endTime = this.states['sensor.x1c_end_time'].state;
                    endTime = endTime === "unavailable" ? "" : endTime;

                    //   if (this.states['sensor.x1c_end_time'].state === 'unavailable' || progress >= 100) {
                    //       return 'Bezczynna...';
                    //   }

                    return `
               <div class="tileboard-card-progress-container">
                  <div class="tileboard-card-progress-bar" style="width:${progress}%">
                     <span class="tileboard-card-progress-text">${progress}%</span>
                  </div>
               </div>
               <div class="tileboard-card-progress-details">
                  <span>${remainingTime}</span><br>
                  <span> ${endTime}</span>
               </div>`;
                },
                states: {
                    'sensor.x1c_print_progress': '100%',
                    'sensor.x1c_remaining_time': '0',
                    'sensor.x1c_end_time': 'unavailable'
                },
                //bg: 'rgba(0,0,0,0)',
                customStyles: {
                    'text-align': 'center',
                    'line-height': '30px'
                }
            },

//kalendarz
{
    position: [8, 0], // Adjust the tile position as needed
    type: TYPES.CUSTOM,
    width: 2,
    height: 1,
    // You can use 'calendar.dom' or any string for the "id"—it's mostly for referencing in TileBoard
    id: 'calendar.dom',
    icon: 'mdi-calendar',
  
    // Hide the card when there are no events
    hidden2: function () {
      var sensorState = this.$scope.states['sensor.kalendarz_nadchodzace'];
      // Safely check nested attributes
      if (
        sensorState &&
        sensorState.attributes &&
        sensorState.attributes.events &&
        sensorState.attributes.events['calendar.dom'] &&
        sensorState.attributes.events['calendar.dom'].events
      ) {
        let events = sensorState.attributes.events['calendar.dom'].events;
        return events.length === 0;
      } else {
        return true;
      }
    },
  
    // The main "state" text you want displayed (above your custom HTML)
    state: function () {
      return 'Nadchodzące';
    },
  
    // Generate the HTML that shows each event line-by-line
    customHtml: function () {
      // Get the sensor state
      var sensorState = this.$scope.states['sensor.kalendarz_nadchodzace'];
  
      // Safely check for the events array
      if (
        !sensorState ||
        !sensorState.attributes ||
        !sensorState.attributes.events ||
        !sensorState.attributes.events['calendar.dom'] ||
        !sensorState.attributes.events['calendar.dom'].events
      ) {
        return 'No upcoming events';
      }
  
      // Extract the events array
      var eventList = sensorState.attributes.events['calendar.dom'].events;
  
      // Prepare date references
      var tomorrow = new Date();
      var today =  new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
  
      // Polish day names, matching JavaScript's getDay() = 0..6 (Sun..Sat)
      var daysOfWeek = [
        'Niedziela',
        'Poniedziałek',
        'Wtorek',
        'Środa',
        'Czwartek',
        'Piątek',
        'Sobota'
      ];
  
      // Build HTML lines for each event
      var lines = eventList.map(function (event) {
        // Convert event start string to Date
        var eventDate = new Date(event.start);
  
        // Decide label: "Jutro" if it's exactly tomorrow, else day-of-week
        var label =
          eventDate.toDateString() === tomorrow.toDateString()
            ? 'Jutro ('+ daysOfWeek[eventDate.getDay()].slice(0,2)+'.)'
            : daysOfWeek[eventDate.getDay()].slice(0,3) + ".";
  
            if (eventDate.toDateString() === today.toDateString()) {
                label = 'Dziś ('+ daysOfWeek[eventDate.getDay()].slice(0,2)+'.)'

            }
        return label + ': ' + event.summary;
      });

      if(lines.length == 0) {
        lines.push("Brak nadchodzących wydarzeń")
      }
  
      // Join all lines in a single HTML block
      return '<div class="item-entity" style="line-height: normal">' + lines.join('</p>') + '</div>';
    },
    action: function (item, entity) {
        var sensorState = this.$scope.states['sensor.kalendarz_nadchodzace'];
        if (
          !sensorState ||
          !sensorState.attributes ||
          !sensorState.attributes.events ||
          !sensorState.attributes.events['calendar.dom'] ||
          !sensorState.attributes.events['calendar.dom'].events
        ) {
          return; // No events => no popup
        }
    
        var eventList = sensorState.attributes.events['calendar.dom'].events;
    
        // We’ll build an array of "LABEL" items, each describing one event
        var popupItems = eventList.map(function (evt,index) {
          var startTime = new Date(evt.start);
          var endTime   = new Date(evt.end);
    
          let weekDay = dzienTygodnia(startTime);

          // Format time in your preferred way:
          // e.g. "16.01.2025, 10:00 - 11:00"
          var startStr = startTime.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
          var endStr = endTime.toLocaleTimeString('pl-PL', {
            hour: '2-digit',
            minute: '2-digit'
          });
    
          // Build a short descriptive text
          var labelText = weekDay + " : " + startStr + ' - ' + endStr + '<br/><b><br/>' +  evt.summary + '</b>';
          if (evt.location) {
            labelText += '<br/><i>Miejsce: ' + evt.location + '</i>';
          }
    
          return {
            position: [0,0 + index],
            // Each label is displayed as a separate line in the popup
            height: 1,
            width: 4,
            state: false,
            type: TYPES.CUSTOM,
            id: {},
            customHtml: function (item, entity) { 
                return labelText;
            },
           // title: labelText,
          };
        });
    
        // Now show the popup
       this.$scope.openPopup(
        {
            type: TYPES.POPUP,
            title: 'Szczegóły wydarzeń',
            popup: {
                items: popupItems,
            },
            tileSize: 100,
            width: 5,
            height: 10,
        });
      }
  },

  {
    position: [8, 2],
    type: TYPES.AUTOMATION,
    state: function (item, entity) {
        const current = entity.attributes.current || 0;
        if (current > 0) {
            return 'w trakcie';
        }
        const triggered = entity.attributes.last_triggered;
        if (!triggered) {
            return '' + " " + "Wyciszenie: " +  ( this.states["input_boolean.wycisz_dzwieki_na_dole"].state === "on" ? "Wł." : "Wył.") ;
        }
        const lastTriggered = new Date(triggered);
        return relativeTimeSinceDate(lastTriggered) + " " + "Wycisz: " +  ( this.states["input_boolean.wycisz_dzwieki_na_dole"].state === "on" ? "Wł." : "Wył.") ;
    },
    title: 'Usypianie',
    subtitle: 'Uruchom',
    id: 'automation.usypianie',
    icon: 'mdi-sleep'
},

{
    position: [8, 1],
    type: TYPES.AUTOMATION,
    state: function (item, entity) {
        const current = entity.attributes.current || 0;
        if (current > 0) {
            return 'w trakcie';
        }
        const triggered = entity.attributes.last_triggered;
        if (!triggered) {
            return '' + " ";
        }
        const lastTriggered = new Date(triggered);
        return relativeTimeSinceDate(lastTriggered);
    },
    title: 'Kąpanie',
    subtitle: 'Uruchom',
    id: 'automation.kapanie',
    icon: 'mdi-shower'
},
{
        position: [8, 3], // Adjust the position as needed
        title: 'Pralka',
        id: 'sensor.pralka_washer_job_state',
        hiddenNo: function() {
            const hiddenStates = ["finished", "none", "unavailable"]
            const pralkaState = this.$scope.states['sensor.pralka_washer_job_state'].state
            return hiddenStates.includes(pralkaState);
        },
        icon: 'mdi-washing-machine',
        type: TYPES.CUSTOM,
        customHtml: function (item, entity) {
            // Check if the job state is other than 'none'
            if (entity.state !== 'none') {
                // Get the completion time from the separate sensor
                var completionTimeEntity = this.$scope.states['sensor.pralka_washer_completion_time'];
                var completionTime = new Date(completionTimeEntity ? completionTimeEntity.state : '');

                // Calculate the time difference
                var currentTime = new Date();
                var timeDifference = new Date(completionTime - currentTime);

                // Format the time difference as "X hours, Y minutes"
                var hours = timeDifference.getUTCHours();
                var minutes = timeDifference.getUTCMinutes();

                var timeString = '';
                if (hours > 0) {
                    timeString += hours + ' godziny ';
                }
                if (minutes > 0 || hours === 0) {
                    timeString += minutes + ' minut';
                }

                // Create and return the custom HTML content
                return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-washing-machine" ng-class="entityIcon(item, entity)"></span>' + '  </div><br/><div>' + timeString + '</div>';
            } else {
                // If the job state is 'none', return an empty string
                return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-washing-machine" ng-class="entityIcon(item, entity)"></span>' + '  </div>';
            }
        },

        states: {
            finish: 'Zakończona',
            none: 'Wył.',
            rinse: 'Płukanie',
            spin: 'Wirowanie',
            wash: 'Pranie',
            weightSensing: 'Wykrywanie wagi'
        },
        icons: {
            finish: 'mdi-checkbox-marked-circle-outline',
            none: 'mdi-checkbox-blank-circle-outline',
            rinse: 'mdi-checkbox-blank-circle-outline',
            spin: 'mdi-checkbox-blank-circle-outline',
            wash: 'mdi-checkbox-blank-circle-outline',
            weightSensing: 'mdi-checkbox-blank-circle-outline'
        }
    },
        {
            position: [8, 4], // Adjust the position as needed
            title: 'Suszarka',
            id: 'sensor.suszarka_dryer_job_state',
            type: TYPES.CUSTOM,
            hiddenNo: function () {
                const hiddenStates = ["finished", "none", "unavailable"]
                const suszarkaState = this.$scope.states['sensor.suszarka_dryer_job_state'].state
                return hiddenStates.includes(suszarkaState);
            },
            customHtml: function (item, entity) {
                // Check if the job state is other than 'none'
                if (entity.state !== 'none') {
                    // Get the completion time from the separate sensor // this.$scope.states['sensor.temperatura_c_w_u'];
                    const completionTimeEntity = this.$scope.states['sensor.suszarka_dryer_completion_time'];
                    const completionTime = new Date(completionTimeEntity ? completionTimeEntity.state : '');

                    // Calculate the time difference
                    var currentTime = new Date();
                    var timeDifference = new Date(completionTime - currentTime);

                    // Format the time difference as "X hours, Y minutes"
                    var hours = timeDifference.getUTCHours();
                    var minutes = timeDifference.getUTCMinutes();

                    var timeString = '';
                    if (hours > 0) {
                        timeString += hours + ' godziny ';
                    }
                    if (minutes > 0 || hours === 0) {
                        timeString += minutes + ' minut';
                    }

                    // Create and return the custom HTML content
                    return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-tumble-dryer" ng-class="entityIcon(item, entity)"></span>' + '  </div><br/><div>' + timeString + '</div>';
                } else {
                    // If the job state is 'none', return an empty string
                    return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-tumble-dryer" ng-class="entityIcon(item, entity)"></span>' + '  </div>';
                }
            },
            states: {
                none: 'Wył.',
                finished: 'Zakończona',
                cooling: 'Chłodzenie',
                drying: 'Suszenie',
                weightSensing: 'Ważenie'
            },
            unit: '',
            icons: {
                none: 'mdi-checkbox-blank-circle-outline',
                finished: 'mdi-checkbox-marked-circle-outline',
                cooling: 'mdi-checkbox-blank-circle-outline',
                drying: 'mdi-checkbox-blank-circle-outline',
                weightSensing: 'mdi-checkbox-blank-circle-outline'
            }
        },
        {
            position: [8, 5],
            width: 1,
            height: 1,
            type: TYPES.CUSTOM,
            id: {}, // niepotrzebne dla CUSTOM
        
            // Pierwsza linia w rogu kafelka - np. "85%"
            state: function () {
                var usagePercentState = this.$scope.states['sensor.frigate_lxc_usage_mnt_frigate'];
                var usagePercent = usagePercentState ? parseFloat(usagePercentState.state) || 0 : 0;
                return usagePercent.toFixed(0) + '%';
            },
        
            title: 'Frigate',
        
            customHtml: function (item, entity) {
                // Funkcja pomocnicza do konwersji MB -> MB/GB/TB
                function formatSizeMB(mbVal) {
                    // Jeżeli >= 1 TB
                    if (mbVal >= 1024 * 1024) {
                        return (mbVal / (1024 * 1024)).toFixed(2) + ' TB';
                    }
                    // Jeżeli >= 1 GB
                    else if (mbVal >= 1024) {
                        return (mbVal / 1024).toFixed(2) + ' GB';
                    }
                    // W przeciwnym wypadku zostają MB
                    else {
                        return mbVal.toFixed(0) + ' MB';
                    }
                }
        
                // 1) Pobieramy stany encji z this.$scope.states
                var usagePercentState = this.$scope.states['sensor.frigate_lxc_usage_mnt_frigate'];
                var usageImagesState = this.$scope.states['sensor.frigate_lxc_storage_used_by_images_mb'];
                var usageOthersState = this.$scope.states['sensor.frigate_lxc_storage_used_by_others_mb'];
                var freeMBState = this.$scope.states['sensor.frigate_lxc_free_space_mb_mnt_frigate'];
        
                // 2) Odczytujemy wartości (jeśli cokolwiek pójdzie nie tak - dajemy 0)
                var usagePercent = usagePercentState ? parseFloat(usagePercentState.state) || 0 : 0;
                var usageImagesMB = usageImagesState ? parseFloat(usageImagesState.state) || 0 : 0;
                var usageOthersMB = usageOthersState ? parseFloat(usageOthersState.state) || 0 : 0;
                var freeMB = freeMBState ? parseFloat(freeMBState.state) || 0 : 0;
        
                // 3) Zamieniamy każdą wartość MB na MB/GB/TB (w formie tekstu)
                var usageImagesText = formatSizeMB(usageImagesMB);
                var usageOthersText = formatSizeMB(usageOthersMB);
                var freeText = formatSizeMB(freeMB);
        
                // 4) Budujemy prosty HTML
                var html = '<br/><div class="item-entity" style="line-height: 15px;top: 30px; height: 80px">\n'
                    + '<span style="font-size: 5px;"> </span><br/><span style="font-size: 22px;"><b>' + freeText + '</b></span><br/>'
                    + '<b>Obrazy:</b> ' + usageImagesText + '<br/>'
                    + '<b>Inne:</b> ' + usageOthersText + '<br/>'
                    + '</div>';
        
                return html;
            },
        },
        
        {
            position: [9, 5],
            width: 1,
            height: 1,
            type: TYPES.CUSTOM,
            id: {}, // niepotrzebne dla CUSTOM
        
            // Pierwsza linia w rogu kafelka - np. "85%"
            state: false,
        
            title: 'Odśwież',
            action: function () {
                location.reload();
            },
        
            customHtml: function (item, entity) {        
                return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-refresh" ng-class="entityIcon(item, entity)"></span>' + '  </div>';
            },
        },
  

               
                
            


                    
    ]
                
},

               
{
                    title: 'Kamery',
                    width: 2,
                    height: 6,
                    hidden: true,
                    // row: 0,  // optional; index of the row used for the GRID layout. If not specified, the default is 0
                    items: [





         
    
    
                    

                    ],
                },
 
                {
                    title: 'Temperatura',
                    width: 2,
                    height: 1,
                    items: []

                },
                {
                    title: 'Energia',
                    width: 1,
                    height: 1,
                    items: [ ]
                },
                {
                    title: 'Zasłony/akcje',
                    width: 1,
                    height: 1,
                    items: [ ]
                },
                
                {
                    title: 'Media',
                    width: 1,
                    height: 1,
                    items: [ ]
                },
                {
                    title: 'Oświetlenie',
                    width: 1,
                    height: 1,
                    items: [ ]
                },
                {
                    title: 'Rutyny',
                    width: 1,
                    height: 1,
                    items: [ ]
                }
            
            ],
        },
        {
            title: 'Monitoring',
           // bg: 'images/peakpx.jpg',
            bg: 'images/dark-polygonal-background.jpg',
            icon: 'mdi-cctv', // home icon
            groups: [
                {
                    title: 'Monitoring',
                    width: 6,
                    height: 6,
                    // row: 1,  // optional; index of the row used for the GRID layout. If not specified, the default is 0
                    items: [
                        {
                            position: [0, 0],
                            id: 'camera.drzwi',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Drzwi',
                            width: 3,
                            height: 3,
                            customStyles: {'border-radius': '8px;'},
                            state: "",
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Drzwi",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=drzwi&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 30000,  // can be number in milliseconds
                        },
                        {
                            position: [3, 0],
                            id: 'camera.podjazd',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Podjazd',
                            width: 4,
                            height: 3,
                            customStyles: {'border-radius': '8px;'},
                            state: false,
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Podjazd",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=podjazd&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 31200,  // can be number in milliseconds
                        },
                        {
                            position: [4, 3],
                            id: 'camera.ogrod',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Ogród',
                            width: 4,
                            height: 3,
                            state: false,
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Ogród",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=ogrod&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 33600,  // can be number in milliseconds
                        },
                        {
                            position: [8, 3],
                            id: 'camera.garaz',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Garaż',
                            width: 4,
                            height: 3,
                            state: false,
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Garaż",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=garaz&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 32400,  // can be number in milliseconds
                        },
                        {
                            position: [7, 0],
                            id: 'camera.bok',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Bok',
                            width: 5,
                            height: 3,
                            customStyles: {'border-radius': '8px;'},
                            state: false,
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Bok",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=bok&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 32700,  // can be number in milliseconds
                        },
                        {
                            position: [0,3],
                            id: 'camera.przed_domem_duo',
                            type: TYPES.CAMERA,
                            bgSize: 'cover',
                            title: 'Przed domem',
                            width: 4,
                            height: 3,
                            customStyles: {'border-radius': '8px;'},
                            state: false,
                            action: function (item, entity) {
                                this.$scope.openPopupIframe({
                                    title: "Przed domem",
                                    url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=przed_domem_duo&showInitialImageEvenTooOld=true',
                                    iframeStyles: {
                                        width: '100%',  // Set width as needed
                                        height: '100%', // Set height as needed
                                        border: 'none'  // Optional: remove border
                                    }
                                })
                            },
                            refresh: 32700,  // can be number in milliseconds
                        },
            
                        ]
            }]
        }
    ],
}
