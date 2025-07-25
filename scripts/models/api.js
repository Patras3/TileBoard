import angular from 'angular';
import { App } from '../app';
import { TOKEN_CACHE_KEY } from '../globals/constants';
import { toAbsoluteServerURL, normalizeUrlSlashes } from '../globals/utils';
import Noty from '../models/noty';

App.provider('Api', function () {
   let wsUrl;
   let authToken;

   this.setInitOptions = function (options) {
      wsUrl = normalizeUrlSlashes(options.wsUrl);
      authToken = options.authToken;
   };

   this.$get = ['$http', '$location', '$q', function ($http, $location, $q) {
      const STATUS_LOADING = 1;
      const STATUS_OPENED = 2;
      const STATUS_READY = 3;
      const STATUS_ERROR = 4;
      const STATUS_CLOSED = 5;

      let reconnectTimeout = null;

      function $Api (url, token) {
         this._id = 1;
         this._url = url;
         this._listeners = {
            error: [],
            message: [],
            ready: [],
            unready: [],
         };
         this._callbacks = {};

         // Nowe właściwości dla ulepszonego reconnect
         this._reconnectAttempts = 0;
         this._maxReconnectAttempts = 10;
         this._baseReconnectDelay = 1000; // 1 sekunda
         this._maxReconnectDelay = 30000; // 30 sekund
         this._connectionTimeout = 10000; // 10 sekund timeout dla połączenia
         this._isReconnecting = false;
         this._connectionTimeoutId = null;
         this._heartbeatInterval = null; // Dodaj tę linię

         if (token) {
            this._configToken = token;
         }

         this._init();

         window.onbeforeunload = event => {
            if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
               this.socket.close();
            }
         };
      }

      $Api.prototype._init = function () {
         const self = this;

         if (!self._url) {
            console.info('Skipping API service initialization since no API URL was provided.');
            return;
         }

         this._getToken().then(function (token) {
            if (token) {
               self._token = token.access_token;
               self._connect.call(self);

               if (token.expires_in) {
                  setTimeout(
                      self._refreshToken.bind(self),
                      token.expires_in * 900);
               }
            } else {
               Noty.addObject({
                  type: Noty.ERROR,
                  title: 'ACCESS TOKEN',
                  message: 'Error while receiving access token',
               });
            }
         });
      };

      $Api.prototype.on = function (key, callback) {
         const self = this;

         if (this._listeners[key].indexOf(callback) !== -1) {
            return function () {};
         }

         this._listeners[key].push(callback);

         return function () {
            self._listeners[key] = self._listeners[key].filter(function (a) {
               return a !== callback;
            });
         };
      };

      $Api.prototype.onError = function (callback) {
         return this.on('error', callback);
      };
      $Api.prototype.onMessage = function (callback) {
         return this.on('message', callback);
      };
      $Api.prototype.onReady = function (callback) {
         if (this.status === STATUS_READY) {
            try {
               callback({ status: STATUS_READY });
            } catch (e) {
               // Ignore
            }
         }

         return this.on('ready', callback);
      };
      $Api.prototype.onUnready = function (callback) {
         return this.on('unready', callback);
      };

      $Api.prototype.send = function (data, callback, id) {
         id = id !== false;

         if (!data.id && id) {
            data.id = this._id++;
         }

         const wsData = JSON.stringify(data);

         if (callback && data.id) {
            this._callbacks[data.id] = callback;
         }

         // Sprawdź czy socket jest gotowy do wysyłania
         if (!this.socket || this.socket.readyState !== WebSocket.OPEN) {
            console.warn('WebSocket is not ready for sending data. Current state:', this.socket?.readyState);
            return false;
         }

         try {
            return this.socket.send(wsData);
         } catch (error) {
            console.error('Error sending WebSocket message:', error);
            this._handleConnectionError('Failed to send message');
            return false;
         }
      };

      $Api.prototype.callService = function (domain, service, data, callback) {
         const apiData = {
            type: 'call_service',
            domain: domain,
            service: service,
            service_data: data,
         };

         this.send(apiData, function (res) {
            if (callback) {
               callback(res);
            }
         });
      };

      $Api.prototype.rest = function (requestStub) {
         const request = angular.copy(requestStub);
         request.url = toAbsoluteServerURL(request.url, window.REST_URL_OVERRIDE);
         request.headers = request.headers || {};
         request.headers.Authorization = 'Bearer ' + this._token;
         return $http(request)
             .then(function (response) {
                return response.data;
             })
             .catch(function (response) {
                switch (response.status) {
                   case 401:
                      redirectOAuth();
                      return;
                   default:
                      window.Noty.add(window.Noty.ERROR, 'Error in REST api', 'Code ' + response.status + ' retrieved for ' + request.url + '.');
                      return null;
                }
             });
      };

      $Api.prototype.getHistory = function (startDate, filterEntityId, endDate) {
         const request = {
            type: 'GET',
            url: '/api/history/period',
         };
         if (startDate) {
            request.url += '/' + startDate;
         }
         if (endDate) {
            request.url += '?end_time=' + endDate;
         } else {
            request.url += '?end_time=' + new Date(Date.now()).toISOString();
         }
         if (filterEntityId) {
            const entityIds = filterEntityId instanceof Array ? filterEntityId.join(',') : filterEntityId;
            request.url += '&filter_entity_id=' + entityIds;
         }
         return this.rest(request);
      };

      $Api.prototype.subscribeEvents = function (events, callback) {
         const self = this;
         if (events && typeof events === 'object') {
            events.forEach(function (event) {
               self.subscribeEvent(event, callback);
            });
         } else {
            this.subscribeEvent(events, callback);
         }
      };

      $Api.prototype.subscribeEvent = function (event, callback) {
         const data = { type: 'subscribe_events' };

         if (event) {
            data.event_type = event;
         }

         this.send(data, callback);
      };

      $Api.prototype.getStates = function (callback) {
         return this.send({ type: 'get_states' }, callback);
      };

      $Api.prototype.getPanels = function (callback) {
         return this.send({ type: 'get_panels' }, callback);
      };

      $Api.prototype.getConfig = function (callback) {
         return this.send({ type: 'get_config' }, callback);
      };

      $Api.prototype.getServices = function (callback) {
         return this.send({ type: 'get_services' }, callback);
      };

      $Api.prototype.getUser = function (callback) {
         return this.send({ type: 'auth/current_user' }, callback);
      };

      $Api.prototype.sendPing = function (callback) {
         return this.send({ type: 'ping' }, callback);
      };

      // Ulepszona metoda _connect z timeout i lepszym error handling
      $Api.prototype._connect = function () {
         const self = this;

         if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
            return;
         }

         console.log(`Attempting to connect to WebSocket (attempt ${this._reconnectAttempts + 1}/${this._maxReconnectAttempts})`);

         this.status = STATUS_LOADING;
         this._clearConnectionTimeout();
         this._clearHeartbeat(); // Dodaj tę linię

         try {
            this.socket = new WebSocket(this._url);
         } catch (error) {
            console.error('Failed to create WebSocket:', error);
            this._handleConnectionError('Failed to create WebSocket connection');
            return;
         }

         // Ustawienie timeout dla połączenia
         this._connectionTimeoutId = setTimeout(() => {
            if (this.socket && this.socket.readyState === WebSocket.CONNECTING) {
               console.warn('WebSocket connection timeout');
               this.socket.close();
               this._handleConnectionError('Connection timeout');
            }
         }, this._connectionTimeout);

         this.socket.addEventListener('open', function (e) {
            console.log('WebSocket connection established');
            self._clearConnectionTimeout();
            self._reconnectAttempts = 0; // Reset counter po udanym połączeniu
            self._setStatus(STATUS_OPENED);
         });

         this.socket.addEventListener('close', function (e) {
            console.log('WebSocket connection closed', e.code, e.reason);
            self._clearConnectionTimeout();
            self._clearHeartbeat(); // Dodaj tę linię
            self._setStatus(STATUS_CLOSED);

            // Dla kodu 1000 (normalne zamknięcie) również rozpoczynamy reconnect
            if (e.code === 1000) {
               console.log('Normal close detected - attempting to resurrect connection');
               // Reset attempts counter dla normalnego zamknięcia
               self._reconnectAttempts = 0;
               self._scheduleReconnect();
            } else {
               // Dla innych kodów błędów
               self._handleConnectionError('Connection closed unexpectedly');
            }
         });


         this.socket.addEventListener('error', function (e) {
            console.error('WebSocket error:', e);
            self._clearConnectionTimeout();
            self._clearHeartbeat(); // Dodaj tę linię
            self._setStatus(STATUS_ERROR);
            self._handleConnectionError('WebSocket error occurred');
         });

         this.socket.addEventListener('message', function (e) {
            try {
               const data = JSON.parse(e.data);
               self._handleMessage.call(self, data);
            } catch (error) {
               console.error('Failed to parse WebSocket message:', error);
               self._sendError('Failed to parse message', { originalMessage: e.data, error: error.message });
            }
         });
      };

      //heatbeat
      // Mechanizm heartbeat do monitorowania połączenia
      $Api.prototype._startHeartbeat = function () {
         const self = this;

         // Wyczyść poprzedni heartbeat jeśli istnieje
         this._clearHeartbeat();

         console.log('Starting heartbeat monitoring');

         this._heartbeatInterval = setInterval(() => {
            if (self.socket && self.socket.readyState === WebSocket.OPEN) {
               const pingId = self._id++;
               const pingMessage = {
                  type: 'ping',
                  id: pingId
               };

               // Ustaw timeout na odpowiedź pong
               const pongTimeout = setTimeout(() => {
                  console.warn('Heartbeat: No pong response received, forcing reconnect');
                  self._forceReconnectDueToHeartbeat();
               }, 5000); // 5 sekund na odpowiedź

               // Zapisz callback dla pong
               self._callbacks[pingId] = function(response) {
                  clearTimeout(pongTimeout);
                  console.log('Heartbeat: Pong received');
               };

               try {
                  self.socket.send(JSON.stringify(pingMessage));
                  console.log('Heartbeat: Ping sent');
               } catch (error) {
                  console.error('Heartbeat: Failed to send ping', error);
                  clearTimeout(pongTimeout);
                  self._forceReconnectDueToHeartbeat();
               }
            } else {
               console.warn('Heartbeat: Socket not ready, forcing reconnect');
               self._forceReconnectDueToHeartbeat();
            }
         }, 15000); // Ping co 15 sekund
      };

      $Api.prototype._clearHeartbeat = function () {
         if (this._heartbeatInterval) {
            clearInterval(this._heartbeatInterval);
            this._heartbeatInterval = null;
            console.log('Heartbeat monitoring stopped');
         }
      };

      $Api.prototype._forceReconnectDueToHeartbeat = function () {
         console.log('Heartbeat: Forcing reconnect due to connection issues');
         this._clearHeartbeat();

         if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
            this.socket.close(1006, 'Heartbeat failed');
         } else {
            this._handleConnectionError('Heartbeat failed - connection lost');
         }
      };

      // Nowa metoda do zarządzania błędami połączenia
      $Api.prototype._handleConnectionError = function (reason) {
         if (this._isReconnecting) {
            return; // Już próbujemy się połączyć
         }

         console.warn('Connection error:', reason);
         this._sendError('Connection error', { reason: reason, attempts: this._reconnectAttempts });

         if (this._reconnectAttempts >= this._maxReconnectAttempts) {
            console.error('Max reconnection attempts reached. Giving up.');
            Noty.addObject({
               type: Noty.ERROR,
               title: 'CONNECTION FAILED',
               message: `Unable to connect to server after ${this._maxReconnectAttempts} attempts. Please refresh the page.`,
            });
            return;
         }

         this._scheduleReconnect();
      };

      // Nowa metoda do planowania reconnect z wykładniczym opóźnieniem
      $Api.prototype._scheduleReconnect = function () {
         if (this._isReconnecting) {
            return;
         }

         this._isReconnecting = true;
         this._reconnectAttempts++;

         // Dla normalnego zamknięcia (kod 1000) używamy krótszego opóźnienia
         let delay;
         if (this._reconnectAttempts === 1) {
            // Pierwszy reconnect po normalnym zamknięciu - krótsze opóźnienie
            delay = Math.min(this._baseReconnectDelay, 2000);
         } else {
            // Wykładnicze opóźnienie: baseDelay * 2^attempts, ale nie więcej niż maxDelay
            delay = Math.min(
                this._baseReconnectDelay * Math.pow(2, this._reconnectAttempts - 1),
                this._maxReconnectDelay
            );
         }



         console.log(`Scheduling reconnection in ${delay}ms (attempt ${this._reconnectAttempts}/${this._maxReconnectAttempts})`);

         this._fire('unready', {
            status: this.status,
            reconnecting: true,
            attempt: this._reconnectAttempts,
            nextAttemptIn: delay
         });

         if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
         }

         reconnectTimeout = setTimeout(() => {
            this._isReconnecting = false;
            this._connect();
         }, delay);
      };

      // Ulepszona metoda forceReconnect
      $Api.prototype.forceReconnect = function () {
         console.log('Force reconnect requested');
         this._reconnectAttempts = 0; // Reset counter
         this._isReconnecting = false;

         if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
         }

         if (this.socket && this.socket.readyState < WebSocket.CLOSING) {
            this.socket.close(1000, 'Force reconnect requested');
         } else {
            this._connect();
         }

      };

      // Metoda usuwająca starą _reconnect (zastąpiona przez _scheduleReconnect)
      $Api.prototype._reconnect = function (delayBeforeConnect) {
         // Backward compatibility - przekieruj do nowej implementacji
         if (delayBeforeConnect) {
            this._baseReconnectDelay = delayBeforeConnect;
         }
         this._handleConnectionError('Legacy reconnect called');
      };

      // Nowa metoda do czyszczenia timeout połączenia
      $Api.prototype._clearConnectionTimeout = function () {
         if (this._connectionTimeoutId) {
            clearTimeout(this._connectionTimeoutId);
            this._connectionTimeoutId = null;
         }
      };

      // Metoda do resetowania stanu połączenia (użyteczna do debugowania)
      $Api.prototype.resetConnection = function () {
         console.log('Resetting connection state');
         this._reconnectAttempts = 0;
         this._isReconnecting = false;
         this._clearConnectionTimeout();

         if (reconnectTimeout) {
            clearTimeout(reconnectTimeout);
            reconnectTimeout = null;
         }

         this.forceReconnect();
      };

      $Api.prototype._fire = function (key, data) {
         this._listeners[key].forEach(function (cb) {
            setTimeout(function () {
               try {
                  cb(data);
               } catch (error) {
                  console.error('Error in event listener:', error);
               }
            }, 0);
         });
      };

      $Api.prototype._handleMessage = function (data) {
         const self = this;
         if (data.type === 'auth_required') {
            return this._authenticate();
         }
         if (data.type === 'auth_invalid') {
            return this._authInvalid(data.message);
         }
         if (data.type === 'auth_ok') {
            return this._ready();
         }

         if (data.error) {
            return this._sendError(data.error.message, data);
         }

         if (data.type === 'result' && data.id) {
            if (this._callbacks[data.id]) {
               setTimeout(function () {
                  try {
                     self._callbacks[data.id](data);
                  } catch (error) {
                     console.error('Error in callback:', error);
                  }
               }, 0);
            }
         }

         if (data.type === 'pong' && data.id) {
            if (this._callbacks[data.id]) {
               setTimeout(function () {
                  try {
                     self._callbacks[data.id](data);
                  } catch (error) {
                     console.error('Error in pong callback:', error);
                  }
               }, 0);
            }
         }

         this._fire('message', data);
      };

      $Api.prototype._authInvalid = function (message) {
         this._setStatus(STATUS_ERROR);
         this._sendError(message);
         this._refreshToken();
      };

      $Api.prototype._sendError = function (message, data) {
         const msg = { message: message };

         if (data) {
            msg.data = data;
         }

         this._fire('error', msg);
      };

      $Api.prototype._authenticate = function () {
         const data = {
            type: 'auth',
            access_token: this._token,
         };

         this.send(data, null, false);
      };

      $Api.prototype._ready = function () {
         console.log('WebSocket connection ready');
         this._setStatus(STATUS_READY);
         this._startHeartbeat(); // Dodaj tę linię
         this._fire('ready', { status: STATUS_READY });
      };

      $Api.prototype._setStatus = function (status) {
         this.status = status;
      };

      $Api.prototype._tokenRequest = function (data) {
         const request = {
            method: 'POST',
            url: toAbsoluteServerURL('/auth/token'),
            headers: {
               'Content-Type': 'application/x-www-form-urlencoded',
            },
            data: data + '&client_id=' + getOAuthClientId(),
         };

         return $http(request)
             .then(function (response) {
                return response.data;
             })
             .catch(function (response) {
                if (response.status >= 400 && response.status <= 499) {  // authentication error
                   redirectOAuth();
                } else {
                   return null;
                }
             });
      };

      $Api.prototype._refreshToken = function () {
         const self = this;

         this._getFreshToken().then(function (token) {
            if (token) {
               self._token = token.access_token;

               if (token.expires_in) {
                  setTimeout(
                      self._refreshToken.bind(self),
                      token.expires_in * 900);
               }
            }
         });
      };

      $Api.prototype._getFreshToken = function () {
         const token = readToken();

         const data = 'grant_type=refresh_token&refresh_token=' + token.refresh_token;

         return this._tokenRequest(data).then(function (data) {
            if (!data) {
               return null;
            }

            data.refresh_token = token.refresh_token;

            saveToken(data);

            return data;
         });
      };

      $Api.prototype._getTokenByCode = function (code) {
         const data = 'grant_type=authorization_code&code=' + code;

         return this._tokenRequest(data).then(function (data) {
            if (!data) {
               return null;
            }

            saveToken(data);

            return data;
         });
      };

      $Api.prototype._getToken = function () {
         if (this._configToken) {
            return $q.resolve({ access_token: this._configToken });
         }

         const token = readToken();

         if (token) {
            return this._getFreshToken();
         }

         const params = $location.search();

         if (params.oauth && params.code) {
            const code = params.code;

            // Remove oauth params to clean up the URL.
            $location.search('oauth', null).search('code', null);

            return this._getTokenByCode(code);
         }

         redirectOAuth();
         return $q.resolve(null);
      };

      function saveToken (token) {
         localStorage.setItem(TOKEN_CACHE_KEY, JSON.stringify(token));
      }

      function readToken () {
         const token = localStorage.getItem(TOKEN_CACHE_KEY);

         return token ? JSON.parse(token) : null;
      }

      function removeToken () {
         localStorage.removeItem(TOKEN_CACHE_KEY);
      }

      function getOAuthClientId () {
         return encodeURIComponent(window.location.origin);
      }

      function getOAuthRedirectUrl () {
         let url = window.location.origin + window.location.pathname;

         if (window.location.search) {
            url += window.location.search + '&oauth=1';
         } else {
            url += '?oauth=1';
         }

         return encodeURIComponent(url);
      }

      function redirectOAuth () {
         removeToken();

         window.location.href = toAbsoluteServerURL(
             '/auth/authorize?client_id=' + getOAuthClientId()
             + '&redirect_uri=' + getOAuthRedirectUrl(),
         );
      }

      return new $Api(wsUrl, authToken);
   }];
});