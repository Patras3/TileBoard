/*
 * ======================================================================
 *  TileBoard Configuration - Refactored Edition
 * ======================================================================
 *
 * All custom functions have been moved to refactored TileBoard modules:
 * - NotificationManager (scripts/models/notificationManager.js)
 * - ErrorLogger (scripts/models/errorLogger.js)
 * - LocationDetector (scripts/models/locationDetector.js)
 * - PowerIndicator (scripts/directives/powerIndicator.js)
 * - Climate helpers (scripts/globals/climateHelpers.js)
 * - Light track helpers (scripts/globals/lightTrackHelpers.js)
 * - Utility functions (scripts/globals/utils.js)
 * - Polish translations (scripts/globals/constants.js)
 *
 * See REFACTORING_GUIDE.md for complete documentation.
 */

/* eslint-disable no-undef, no-unused-vars, eqeqeq, no-debugger, no-dupe-keys, brace-style, no-unreachable, no-var, block-scoped-var, no-redeclare, prefer-const */
/* globals TYPES, HEADER_ITEMS, CUSTOM_THEMES, TRANSITIONS, ENTITY_SIZES, MENU_POSITIONS, GROUP_ALIGNS, SCREENSAVER_ITEMS */

/*
 * All utilities are loaded from scripts/globals.js and available via window object:
 * - window.NotificationManager
 * - window.ErrorLogger
 * - window.LocationDetector
 * - window.dzienTygodnia
 * - window.relativeTimeSinceDate
 * - window.relativeTimeFromMinutes
 * - window.formatWatts
 * - window.calculateColor
 * - window.calculateStripesColor
 * - window.calculateTransparentColor
 * - window.roundToTwoDecimalPlaces
 * - window.isTimeInRange
 * - window.updateFontSize
 * - window.createHONClimatePopup
 * - window.createClimatePopup
 * - window.createDualAreaLightTrack
 * - window.WEATHER_ICONS_PL
 * - window.WEATHER_STATES_PL
 */

// Backward-compatible aliases for commonly used functions
const NotificationManager = window.NotificationManager;
const getURLParameter = (name) => {
   const url = new URL(window.location.href);
   return url.searchParams.get(name);
};
const isUpstairsLocation = () => window.LocationDetector?.isUpstairs() || false;
const isDownstairsLocation = () => window.LocationDetector?.isDownstairs() || true;

// Weather constants (loaded from window.WEATHER_ICONS_PL and window.WEATHER_STATES_PL)
const weatherIcons = window.WEATHER_ICONS_PL || {};
const weatherStates = window.WEATHER_STATES_PL || {};

// Energy data object (keep as is - not in refactored code)
let energaDetails = {
   taryfa_nocna: 'Brak danych',
   taryfa_dzienna: 'Brak danych',
   suma_licznikow: 'Nieznana',
   pozostalo_limitu: 'Brak danych',
   dni_limitu: 'Brak danych',
};

var CONFIG = {

   /* ---------------------------------------------------------------- */
   /*                    FEATURE SERVICES                              */
   /* ---------------------------------------------------------------- */

   // Error logging service
   features: {
      errorLogging: {
         enabled: true,
         homeAssistantEntity: 'input_text.tileboard_errors',
         maxErrorsPerMinute: 10,
         deduplicationWindow: 5000,
         maxRetries: 3,
         retryDelay: 1000,
      },
      notifications: {
         enabled: true,
         defaultFullScreenDuration: 30000,  // 30 seconds (ms)
         defaultCornerDuration: 20000,       // 20 seconds (ms)
         maxCornerNotifications: 3,
      },
      locationDetection: {
         enabled: true,
         urlParameter: 'location',
         cookieExpiry: 7,
         locations: {
            upstairs: 'upstair',
            downstairs: 'downstairs',
         },
         defaultLocation: 'downstairs',
      },
   },

   // Power usage bottom bar indicator
   powerIndicator: {
      enabled: true,
      entityId: 'sensor.moc_aktualna',
      maxPower: 6000,
      maxOrangePower: 2500,
      maxAnimationPower: 6000,
   },

   // customTheme: CUSTOM_THEMES.COMPACT, // CUSTOM_THEMES.TRANSPARENT, CUSTOM_THEMES.MATERIAL, CUSTOM_THEMES.MOBILE, CUSTOM_THEMES.COMPACT, CUSTOM_THEMES.HOMEKIT, CUSTOM_THEMES.WINPHONE, CUSTOM_THEMES.WIN95

   customTheme: CUSTOM_THEMES.HOMEKIT, // CUSTOM_THEMES.TRANSPARENT, CUSTOM_THEMES.MATERIAL, CUSTOM_THEMES.MOBILE, CUSTOM_THEMES.COMPACT, CUSTOM_THEMES.HOMEKIT, CUSTOM_THEMES.WINPHONE, CUSTOM_THEMES.WIN95
   transition: TRANSITIONS.ANIMATED, // ANIMATED or SIMPLE (better perfomance)
   entitySize: ENTITY_SIZES.SMALL, // SMALL, BIG are available
   tileSize: getURLParameter('tileSize') || 140,
   tileMargin: getURLParameter('tileMargin') || 6,
   groupMarginCss: '8px 10px 0px',
   serverUrl: 'http://192.168.50.52:8123',
   wsUrl: 'ws://192.168.50.52:8123/api/websocket',
   authToken: null, // optional long-lived token (CAUTION: only if TileBoard is not exposed to the internet)
   // googleApiKey: "XXXXXXXXXX", // Required if you are using Google Maps for device tracker
   // mapboxToken: "XXXXXXXXXX", // Required if you are using Mapbox for device tracker
   debug: false, // Prints entities and state change info to the console.
   pingConnection: true, // ping connection to prevent silent disconnections
   locale: 'pl', // locale for date and number formats - available locales: it, de, es, fr, pt, ru, nl, pl, en-gb, en-us (default). See readme on adding custom locales.
   // next fields are optional
   events: [
      /* TileBoard growl-style notifications – unchanged */
      {
         command: 'notify',
         action: e => window.Noty.addObject(e),
      },

      /* Full-screen iframe (old openIframe) */
      {
         command: 'openIframe',
         action (event) {
            NotificationManager.openFullScreen({
               title: event.title,
               url: event.url,
               duration: event.duration,            // falls back to 30 s if undefined
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
                  value: 'full-screen-event-iframe',
               },
            });
         },
      },

      /* Corner iframe (old openCornerIframe) */
      {
         command: 'openCornerIframe',
         action (event) {
            NotificationManager.openCorner({
               title: event.title,
               url: event.url,
               duration: event.duration,           // falls back to 20 s if undefined
               apiRequest: this.apiRequest,         // lets the helper update input_text automatically
            });
         },
      },

      /* Simple text overlay – kept, but now closes via NotificationManager */
      {
         event: 'notify',
         action (event) {
            NotificationManager.close('full-screen-notify');

            const overlay = document.createElement('div');
            overlay.className = 'notification-overlay';
            overlay.id = 'full-screen-notify';
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
         },
      },
   ],

   timeFormat: 24,
   menuPosition: MENU_POSITIONS.LEFT, // or BOTTOM
   hideScrollbar: false, // horizontal scrollbar
   // groupsAlign: GROUP_ALIGNS.HORIZONTALLY, // HORIZONTALLY, VERTICALLY, GRID
   groupsAlign: GROUP_ALIGNS.GRID, // HORIZONTALLY, VERTICALLY, GRID
   onReady: function () {
      let newFontSize = getURLParameter('fontSize');
      if (newFontSize) {
         window.updateFontSize(newFontSize);
      }
      window.CUSTOM_THEMES_HOMEKIT = CUSTOM_THEMES.HOMEKIT;
      this.apiRequest({
         type: 'call_service',
         domain: 'input_text',
         service: 'set_value',
         service_data: {
            entity_id: isUpstairsLocation() ? 'input_text.tileboard_upstairs_current_event' : 'input_text.tileboard_downstairs_current_event',
            value: 'ready',
         },
      });
   },

   header: { // https://github.com/resoai/TileBoard/wiki/Header-configuration
      styles: {
         margin: '0px 15px 0',
         fontSize: '16px',
      },
      right: [
         {
            type: HEADER_ITEMS.WEATHER,
            styles: {
               margin: '0',
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
            },
         },

      ],
      left: [
         {
            type: HEADER_ITEMS.DATETIME,
            dateFormat: 'EEEE, dd LLLL', // https://docs.angularjs.org/api/ng/filter/date
         },
         /*            {
                type: HEADER_ITEMS.CUSTOM_HTML,
                html: 'Hello moto! <b>TileBoard</b>',
                styles: {
                    margin: '40px 0 0'
                }
            }*/
      ],
   },

   /* screensaver: {// optional. https://github.com/resoai/TileBoard/wiki/Screensaver-configuration
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
                     // iconImage: '&sensor.my_weather_icon.state',
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
                        ],
                     },
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
                        if (Array.isArray(sensorState.attributes.jutro['calendar.smieci'].events)) {
                           return sensorState.attributes.jutro['calendar.smieci'].events
                              .filter(function (event) {
                                 return event.summary.indexOf('TERMINY') === -1;
                              }).length === 0;
                        } else {
                           return true;
                        }
                     },
                     state: function () {
                        return 'Jutro';
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
                        function events (_this) {
                           // Get the sensor entity state
                           var sensorState = _this.$scope.states['sensor.smieci_jutro'];
                           // Check if the entity has a 'jutro' attribute and it is an array
                           if (Array.isArray(sensorState.attributes.jutro['calendar.smieci'].events)) {
                              // Extract all 'summary' values from the 'jutro' attribute
                              var summaries = sensorState.attributes.jutro['calendar.smieci'].events
                                 .filter(function (event) {
                                    return event.summary.indexOf('TERMINY') === -1;
                                 })
                                 .map(function (event) {
                                    return event.summary.replace('METALE I TWORZYWA SZTUCZNE', 'METALE I PLASTIK');
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
                     },
                  },
                  {
                     position: [0, 1],
                     type: TYPES.IFRAME,
                     id: {},
                     width: 2,
                     height: 2,
                     refresh: 600000, // 10 seconds
                     //          url: 'https://embed.windy.com/embed2.html?lat=54.296&lon=18.610&detailLat=54.296&detailLon=18.610&width=650&height=450&zoom=9&level=surface&overlay=rain&product=ecmwf&menu=&message=&marker=&calendar=now&pressure=&type=map&location=coordinates&detail=&metricWind=default&metricTemp=default&radarRange=-1'
                     url: 'https://embed.windy.com/embed.html?type=map&location=coordinates&metricRain=default&metricTemp=default&metricWind=default&zoom=10&overlay=rain&product=ecmwf&level=surface&lat=54.296&lon=18.610&detailLat=54.296&detailLon=18.610&detail=false&message=true&lang=pl',
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
                        return window.relativeTimeSinceDate(lastTriggered);
                     },
                     title: 'Wietrzenie',
                     subtitle: 'Uruchom',
                     id: 'automation.wietrzenie',
                     icon: 'mdi-fan-clock',
                  },

                  Object.assign({ position: [3, 0] }, window.createHONClimatePopup({ id: 'climate.salon_klimatyzator', title: 'Salon', realTempSensorId: 'sensor.temperatura_govee_salon', deviceId: '9e27ae60f9a86d62e614389a0002bc06' })),
                  Object.assign({ position: [2, 1] }, window.createHONClimatePopup({ id: 'climate.sypialnia_klimatyzator', title: 'Sypialnia', floorHeatingId: 'switch.ogrzewanie_sypialnia_wlacznik', realTempSensorId: 'sensor.temperatura_govee_sypialnia', deviceId: '03e552cd9addf227e259d1e22de9cf72' })),
                  Object.assign({ position: [3, 1] }, window.createHONClimatePopup({ id: 'climate.biuro_klimatyzator', title: 'Biuro', floorHeatingId: 'switch.ogrzewanie_biuro_wlacznik', realTempSensorId: 'sensor.temperatura_govee_biuro', deviceId: 'eb1d7eef08a4b57a886942fbbe6ef645' })),
                  Object.assign({ position: [3, 2] }, window.createHONClimatePopup({ id: 'climate.dzieciecy_klimatyzator', title: 'Dzieciecy', floorHeatingId: 'switch.ogrzewanie_dzieciecy_wlacznik', realTempSensorId: 'sensor.temperatura_govee_dzieciecy', deviceId: '8ef4184a953aa2868dbfe17e8803842c' })),
                  Object.assign({ position: [2, 2] }, window.createHONClimatePopup({ id: 'climate.trzeci_pokoj_klimatyzator', title: 'Trzeci pokój', floorHeatingId: 'switch.ogrzewanie_trzeci_pokoj_wlacznik', realTempSensorId: 'sensor.temperatura_govee_trzeci_pokoj', deviceId: '4bb4d0f69283c7a6bc7346ac8a55ded6' })),


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
                  {
                     position: [2, 3], // Adjust the position as needed
                     title: 'Rekuperacja',
                     id: 'climate.rekuperacja_temperatura_komfortu',
                     type: TYPES.CUSTOM,
                     customHtml: function (item, entity) {
                        const fanMode = entity.attributes.fan_mode;
                        let icon; let level;
                        switch (fanMode) {
                           case 'high':
                              icon = 'fan-speed-3';
                              level = 3;
                              break;
                           case 'medium':
                              icon = 'fan-speed-2';
                              level = 2;
                              break;
                           case 'low':
                              icon = 'fan-speed-1';
                              level = 1;
                              break;
                           case 'off':
                              icon = 'fan-off';
                              level = 0;
                              break;
                        }

                        // Create and return the custom HTML content
                        return '<div class="item-entity">\n' + '  <span class="item-entity--icon mdi  mdi-' + icon + '"></span>' + '  </div><br/><div></div>';
                     },
                     state: function (item, entity) {
                        const czerpnia = this.$scope.states['sensor.czerpnia_temperatura'].state + '°C';
                        const nawiew = this.$scope.states['sensor.nawiew_temperatura'].state + '°C';
                        return czerpnia + ' ➪ ' + nawiew;
                     },
                     unit: '',
                     action: function (item, entity) {
                        const fanMode = entity.attributes.fan_mode;
                        let icon; let level;
                        switch (fanMode) {
                           case 'high':
                              icon = 'fan-speed-3';
                              level = 3;
                              break;
                           case 'medium':
                              icon = 'fan-speed-2';
                              level = 2;
                              break;
                           case 'low':
                              icon = 'fan-speed-1';
                              level = 1;
                              break;
                           case 'off':
                              icon = 'fan-off';
                              level = -1;
                              break;
                        }

                        const buttons = [
                           // 'button.wlacz_obroty_na_off',
                           'button.wlacz_obroty_na_low',
                           'button.wlacz_obroty_na_medium',
                           'button.wlacz_obroty_na_high',
                        ];

                        let nextLevel;

                        if (level === -1 || level > buttons.length - 1) {
                           nextLevel = 0;
                        } else {
                           nextLevel = level;
                        }

                        this.apiRequest({
                           type: 'call_service',
                           domain: 'button',
                           service: 'press',
                           service_data: {
                              entity_id: buttons[nextLevel],
                           },
                        });
                     },
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
                              return 'CWU: Wył.';
                           case 'performance':
                              return 'CWU: Priorytet.';
                           case 'heat_pomp':
                              return 'CWU: Pompa Ciepła.';
                           default:
                              return state;
                        }
                     },
                     id: 'automation.wlacz_cyrkulacje',
                     icon: 'mdi-faucet',
                     state: function (item, entity) {
                        const temp = this.$scope.states['sensor.temperatura_c_w_u'].state
                                    + '°C 🌡️ ';

                        const current = entity.attributes.current || 0;
                        if (current > 0) {
                           return temp + ' w trakcie';
                        }
                        const triggered = entity.attributes.last_triggered;
                        if (!triggered) {
                           return temp + '';
                        }
                        const lastTriggered = new Date(triggered);
                        return temp + window.relativeTimeSinceDate(lastTriggered);
                     },

                  },
                  // Energia

                  {
                     position: [4, 0],
                     // Energia - zuzycie dzisiaj
                     title: 'Zużycie',
                     value: function () {
                        const pobrana = window.roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_pobrana_z_sieci_dzisiaj'].state);
                        return pobrana;
                     },
                     type: TYPES.SENSOR,
                     state: function () {
                        const wyprodukowana = parseFloat(this.$scope.states['sensor.inverter_dzienna_produkcja'].state || '0') || 0;
                        const wyslana = parseFloat(this.$scope.states['sensor.energia_wyslana_do_sieci_dzisiaj_calkowita'].state || '0') || 0;
                        const pobrana = parseFloat(this.$scope.states['sensor.energia_pobrana_z_sieci_dzisiaj_calkowita'].state || '0') || 0;
                        return 'Całkowita: ' + window.roundToTwoDecimalPlaces(pobrana + (wyprodukowana - wyslana)) + 'kWh';
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
                        displayValue = window.formatWatts(aktualnieW);

                        let percentageUsage = 0;

                        if (aktualnieWcalosc > 0) { // Check to avoid division by zero
                           percentageUsage = (aktualnieW / aktualnieWcalosc) * 100;
                           percentageUsage = Math.round(percentageUsage); // Round to
                        }

                        return '' + displayValue + ' (' + percentageUsage + '%)';
                     },
                     id: 'sensor.energia_na_ogrzewanie_dzisiaj',
                     unit: 'kWh', // assuming the unit is kWh, change if needed
                  },
                  {
                     position: [4, 2],
                     // Energia - na ogrzewanie dzisiaj
                     title: function () {
                        return 'Teraz: +' + window.formatWatts(this.$scope.states['sensor.inverter_moc_czynna'].state, false, false) + '';
                     },
                     state: function () {
                        const sprzedana = window.roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_oddana_do_sieci_dzisiaj'].state);
                        return 'Sprzedana: ' + sprzedana + 'kWh';
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
                        const color = window.calculateColor(watts);
                        updateFlowingIndicator(watts, color);
                        const boxShadowValue = `0px 0px 16px 8px ${color}`;
                        //   updateAnimatedLine(watts);
                        return {
                           boxShadow: boxShadowValue,
                        };
                     },
                     state: function () {
                        const current = window.roundToTwoDecimalPlaces(this.$scope.states['sensor.energia_bilans_netto'].state);
                        return '[1h]: ' + current + 'kWh';
                     },
                     filter: function (value) { // optional
                        return window.formatWatts(value, true, true);
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
                           type: 'call_service',
                           domain: 'cover',
                           service: entity.state === 'closed' ? 'open_cover' : 'close_cover',
                           service_data: {
                              entity_id: item.id,
                           },
                        });
                     },
                     states: {
                        open: 'Otwarte',
                        closed: 'Zamknięte',
                     },
                     icons: { closed: 'mdi-curtains-closed', open: 'mdi-curtains' },
                     secondaryAction: function (item, entity) {
                        return this.$scope.openPopupIframe(item, entity);
                     },
                  },
                  {
                     position: [5, 1],
                     type: TYPES.CUSTOM,
                     title: 'Salon - Bok',
                     id: 'cover.salon_bok',
                     //  customHtml: '<b>Hi</b>',  // Can also be a function that will be passed item and entity.
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
                     states: {
                        open: 'Otwarte',
                        closed: 'Zamknięte',
                     },
                     icons: { closed: 'mdi-curtains-closed', open: 'mdi-curtains' },
                     secondaryAction: function (item, entity) {
                        return this.$scope.openPopupIframe(item, entity);
                     },
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
                           type: 'call_service',
                           domain: 'cover',
                           service: entity.state === 'closed' ? 'open_cover' : 'close_cover',
                           service_data: {
                              entity_id: item.id,
                           },
                        });
                     },
                     states: {
                        open: 'Otwarte',
                        closed: 'Zamknięte',
                        opening: '...',
                     },
                     icons: { closed: 'mdi-curtains-closed', open: 'mdi-curtains', opening: 'mdi-timer-sand' },
                     secondaryAction: function (item, entity) {
                        return this.$scope.openPopupIframe(item, entity);
                     },
                  },

                  window.pinProtectedTile({
                     title: 'Garaż',
                     id: 'binary_sensor.brama_garage_door_contact',
                     position: isDownstairsLocation() ? [5, 2] : [5, 3],
                     action: function (item, entity) {
                        this.apiRequest({
                           type: 'call_service',
                           domain: 'automation',
                           service: 'trigger',
                           service_data: {
                              entity_id: 'automation.otworz_zamknij_garaz',
                              skip_condition: true,
                           },
                        });
                     },
                     states: {
                        on: 'Otwarty',
                        off: 'Zamknięty',
                        opening: '...',
                     },
                     icons: { off: 'mdi-garage-variant', on: 'mdi-garage-open-variant', opening: 'mdi-timer-sand' },
                  }, {
                     pins: ['7283', '3006'],
                     attemptsAllowed: 3,
                     timeoutSeconds: 60,
                     lockTimeMultiplier: 1,
                  }),
                  {
                     position: isDownstairsLocation() ? [5, 3] : [5, 4],
                     id: 'input_button.pusty_parter',
                     type: TYPES.CUSTOM,
                     state: 'Wyłącz wszystko',
                     icon: 'mdi-stairs-up',
                     title: 'Pusty parter',
                     action: function (item, entity) {
                        this.apiRequest({
                           type: 'call_service',
                           domain: 'input_button',
                           service: 'press',
                           service_data: {
                              entity_id: item.id,
                           },
                        });
                     },
                  },

                  {
                     position: [6, 0],
                     id: 'media_player.lg_oled65cx3la',
                     type: TYPES.MEDIA_PLAYER,
                     title: 'TV',
                     hideSource: false,
                     textSource: 'Źródło',
                     hideMuteButton: true,
                     // state: false,
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
                     // state: false,
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
                     // state: false,
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
                     icon: 'mdi-robot-vacuum-variant',
                     states: {
                        cleaning: 'Sprzątanie',
                        paused: 'Pauza',
                        returning: 'Powrót',
                        unavailable: 'Niedostępny',
                        docked: 'Zadokowany',
                        idle: 'Bezczynny',
                     },
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
                           type: 'call_service',
                           domain: 'dreame_vacuum',
                           service: 'vacuum_clean_segment',
                           service_data: {
                              entity_id: item.id,
                              segments: [2],
                              repeats: 1,
                           },
                        });
                     },
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

                  window.createDualAreaLightTrack({ id: 'light.szyna_cala', title: 'Szyna - cała', x: 7, y: 1, hidden: isUpstairsLocation() }),
                  // window.createDualAreaLightTrack({ id: 'light.szyna_dodatkowe', title: 'Szyna - dodatkowe', x: 7, y: 2, hidden: isUpstairsLocation() }),

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
                        unknown: 'mdi-ceiling-light-multiple-outline',
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
                        unknown: 'mdi-floor-lamp-torchiere-variant-outline',
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


                  // Tutajwklej
                  // Kamery
                  {
                     position: [0, 3],
                     id: 'camera.drzwi',
                     type: TYPES.CAMERA,
                     bgSize: 'cover',
                     title: 'Drzwi',
                     width: 2,
                     height: 2,
                     customStyles: { 'border-radius': '8px;' },
                     state: '',
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Drzwi',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=drzwi&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Podjazd',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=podjazd&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                           title: 'Ogród',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=ogrod&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                           title: 'Garaż',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=garaz&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Bok',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=bok&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Przed domem',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=przed_domem_duo&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
                     },
                     refresh: 12700,  // can be number in milliseconds
                  },
                  {
                     position: [7, 5],
                     id: 'camera.drukarka',
                     type: TYPES.CAMERA,
                     hidden: function () {
                        return this.states['sensor.x1c_remaining_time'].state == 0;
                     },
                     bgSize: 'cover',
                     title: 'Drukarka',
                     width: 2,
                     height: 1,
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Drukarka',
                           url: 'http://192.168.50.164:8021/web/single-cam-full.html?media=video+audio&camera=drukarka',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                        return this.states['sensor.x1c_remaining_time'].state == 0;
                     },
                     customHtml: function () {
                        var progress = parseFloat(this.states['sensor.x1c_print_progress'].state) || 0;
                        var remainingTime = relativeTimeFromMinutes(parseInt(this.states['sensor.x1c_remaining_time'].state) || 0);
                        remainingTime = remainingTime === '0m' ? '' : ('Pozostało: <br/>' + remainingTime);
                        var endTime = this.states['sensor.x1c_end_time'].state;
                        endTime = endTime === 'unavailable' ? '' : endTime;

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
                        'sensor.x1c_end_time': 'unavailable',
                     },
                     // bg: 'rgba(0,0,0,0)',
                     customStyles: {
                        'text-align': 'center',
                        'line-height': '30px',
                     },
                  },

                  // kalendarz
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
                        var today = new Date();
                        tomorrow.setDate(tomorrow.getDate() + 1);

                        // Polish day names, matching JavaScript's getDay() = 0..6 (Sun..Sat)
                        var daysOfWeek = [
                           'Niedziela',
                           'Poniedziałek',
                           'Wtorek',
                           'Środa',
                           'Czwartek',
                           'Piątek',
                           'Sobota',
                        ];

                        // Build HTML lines for each event
                        var lines = eventList.map(function (event) {
                           // Convert event start string to Date
                           var eventDate = new Date(event.start);

                           // Decide label: "Jutro" if it's exactly tomorrow, else day-of-week
                           var label =
          eventDate.toDateString() === tomorrow.toDateString()
             ? 'Jutro (' + daysOfWeek[eventDate.getDay()].slice(0, 2) + '.)'
             : daysOfWeek[eventDate.getDay()].slice(0, 3) + '.';

                           if (eventDate.toDateString() === today.toDateString()) {
                              label = 'Dziś (' + daysOfWeek[eventDate.getDay()].slice(0, 2) + '.)';
                           }
                           return label + ': ' + event.summary;
                        });

                        if (lines.length == 0) {
                           lines.push('Brak nadchodzących wydarzeń');
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
                        var popupItems = eventList.map(function (evt, index) {
                           var startTime = new Date(evt.start);
                           var endTime = new Date(evt.end);

                           let weekDay = window.dzienTygodnia(startTime);

                           // Format time in your preferred way:
                           // e.g. "16.01.2025, 10:00 - 11:00"
                           var startStr = startTime.toLocaleString('pl-PL', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit',
                              hour: '2-digit',
                              minute: '2-digit',
                           });
                           var endStr = endTime.toLocaleTimeString('pl-PL', {
                              hour: '2-digit',
                              minute: '2-digit',
                           });

                           // Build a short descriptive text
                           var labelText = weekDay + ' : ' + startStr + ' - ' + endStr + '<br/><b><br/>' + evt.summary + '</b>';
                           if (evt.location) {
                              labelText += '<br/><i>Miejsce: ' + evt.location + '</i>';
                           }

                           return {
                              position: [0, 0 + index],
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
                     },
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
                           return '' + ' ' + 'Wyciszenie: ' + (this.states['input_boolean.wycisz_dzwieki_na_dole'].state === 'on' ? 'Wł.' : 'Wył.') ;
                        }
                        const lastTriggered = new Date(triggered);
                        return window.relativeTimeSinceDate(lastTriggered) + ' ' + 'Wycisz: ' + (this.states['input_boolean.wycisz_dzwieki_na_dole'].state === 'on' ? 'Wł.' : 'Wył.') ;
                     },
                     title: 'Usypianie',
                     subtitle: 'Uruchom',
                     id: 'automation.usypianie',
                     icon: 'mdi-sleep',
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
                           return '' + ' ';
                        }
                        const lastTriggered = new Date(triggered);
                        return window.relativeTimeSinceDate(lastTriggered);
                     },
                     title: 'Kąpanie',
                     subtitle: 'Uruchom',
                     id: 'automation.kapanie',
                     icon: 'mdi-shower',
                  },
                  {
                     position: [8, 3], // Adjust the position as needed
                     title: 'Pralka',
                     id: 'sensor.pralka_washer_job_state',
                     hiddenNo: function () {
                        const hiddenStates = ['finished', 'none', 'unavailable'];
                        const pralkaState = this.$scope.states['sensor.pralka_washer_job_state'].state;
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
                        weightSensing: 'Wykrywanie wagi',
                     },
                     icons: {
                        finish: 'mdi-checkbox-marked-circle-outline',
                        none: 'mdi-checkbox-blank-circle-outline',
                        rinse: 'mdi-checkbox-blank-circle-outline',
                        spin: 'mdi-checkbox-blank-circle-outline',
                        wash: 'mdi-checkbox-blank-circle-outline',
                        weightSensing: 'mdi-checkbox-blank-circle-outline',
                     },
                  },
                  {
                     position: [8, 4], // Adjust the position as needed
                     title: 'Suszarka',
                     id: 'sensor.suszarka_dryer_job_state',
                     type: TYPES.CUSTOM,
                     hiddenNo: function () {
                        const hiddenStates = ['finished', 'none', 'unavailable'];
                        const suszarkaState = this.$scope.states['sensor.suszarka_dryer_job_state'].state;
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
                        weightSensing: 'Ważenie',
                     },
                     unit: '',
                     icons: {
                        none: 'mdi-checkbox-blank-circle-outline',
                        finished: 'mdi-checkbox-marked-circle-outline',
                        cooling: 'mdi-checkbox-blank-circle-outline',
                        drying: 'mdi-checkbox-blank-circle-outline',
                        weightSensing: 'mdi-checkbox-blank-circle-outline',
                     },
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
                        function formatSizeMB (mbVal) {
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


               ],

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
               items: [],

            },
            {
               title: 'Energia',
               width: 1,
               height: 1,
               items: [ ],
            },
            {
               title: 'Zasłony/akcje',
               width: 1,
               height: 1,
               items: [ ],
            },

            {
               title: 'Media',
               width: 1,
               height: 1,
               items: [ ],
            },
            {
               title: 'Oświetlenie',
               width: 1,
               height: 1,
               items: [ ],
            },
            {
               title: 'Rutyny',
               width: 1,
               height: 1,
               items: [ ],
            },

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
                     customStyles: { 'border-radius': '8px;' },
                     state: '',
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Drzwi',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=drzwi&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Podjazd',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=podjazd&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                           title: 'Ogród',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=ogrod&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                           title: 'Garaż',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=garaz&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
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
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Bok',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=bok&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
                     },
                     refresh: 32700,  // can be number in milliseconds
                  },
                  {
                     position: [0, 3],
                     id: 'camera.przed_domem_duo',
                     type: TYPES.CAMERA,
                     bgSize: 'cover',
                     title: 'Przed domem',
                     width: 4,
                     height: 3,
                     customStyles: { 'border-radius': '8px;' },
                     state: false,
                     action: function (item, entity) {
                        this.$scope.openPopupIframe({
                           title: 'Przed domem',
                           url: 'http://192.168.50.164:8021/web/single-cam.html?media=video+audio&camera=przed_domem_duo&showInitialImageEvenTooOld=true',
                           iframeStyles: {
                              width: '100%',  // Set width as needed
                              height: '100%', // Set height as needed
                              border: 'none',  // Optional: remove border
                           },
                        });
                     },
                     refresh: 32700,  // can be number in milliseconds
                  },

               ],
            }],
      },
   ],
};
