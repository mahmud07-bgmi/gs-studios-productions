/*!
 * GS Studios - shared Firebase module
 * Single source of truth for: SDK loading (deduped), app init (deduped),
 * config encode/decode, room-id resolution (URL + localStorage, never
 * silently "default"), cloud save, and a realtime listener with
 * reconnect / connection-state handling.
 *
 * Used by: control/setup.js, control/manager.js, control/theme-runtime.js
 * Backward compatible localStorage keys (unchanged):
 *   gs-firebase-config  -> base64(JSON) firebase web config
 *   gs-room             -> selected room id
 *   gs-overlay-{name}   -> per-overlay local theme state (untouched, owned by manager.js)
 */
(function (global) {
  'use strict';

  var DEFAULT_ROOM = 'gs-event-2026'; // real default room id, never the literal "default"
  var SDK_VERSION = '12.18.0';
  var LS_CONFIG_KEY = 'gs-firebase-config';
  var LS_ROOM_KEY = 'gs-room';

  // This site is intentionally locked to the existing FileDrop web app.
  // Firebase Web API keys identify a public client app; no Admin SDK secret is
  // stored here. Realtime Database's URL is absent from the supplied web config
  // and must be obtained from the FileDrop Firebase Console if cloud sync is used.
  var FILEDROP_CONFIG = {
    apiKey: 'AIzaSyBdV2AP6np9FXKgyhMV0l7iBG1_aNv1r1g',
    authDomain: 'filedrop-24b64.firebaseapp.com',
    projectId: 'filedrop-24b64',
    storageBucket: 'filedrop-24b64.firebasestorage.app',
    messagingSenderId: '862845994393',
    appId: '1:862845994393:web:7f32c44e2ab063ddc1bf08',
    measurementId: 'G-7DP3T792B9',
    databaseURL: 'https://filedrop-24b64-default-rtdb.asia-southeast1.firebasedatabase.app'
  };

  var _sdkLoadPromise = null;

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  function dec(s) { return JSON.parse(decodeURIComponent(escape(atob(s)))); }

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  // ---- config (Firebase web config JSON, FileDrop only) ----
  function isFileDropConfig(config) {
    return !!config && config.projectId === FILEDROP_CONFIG.projectId &&
      config.apiKey === FILEDROP_CONFIG.apiKey && config.appId === FILEDROP_CONFIG.appId;
  }

  function getRawConfigString() { return qs('cfg') || lsGet(LS_CONFIG_KEY); }

  function getConfig() {
    var s = getRawConfigString();
    if (!s) return Object.assign({}, FILEDROP_CONFIG);
    try {
      var config = dec(s);
      return isFileDropConfig(config) ? Object.assign({}, FILEDROP_CONFIG, config) : Object.assign({}, FILEDROP_CONFIG);
    } catch (e) { return Object.assign({}, FILEDROP_CONFIG); }
  }

  function setConfig(obj) {
    if (!isFileDropConfig(obj)) return false;
    return lsSet(LS_CONFIG_KEY, enc(Object.assign({}, FILEDROP_CONFIG, obj)));
  }

  // Encoded string form, preferring the persisted one so links stay stable.
  function getRawConfigForQuery() {
    var config = getConfig();
    return enc(config);
  }

  function hasRealtimeDatabaseConfig(config) {
    return !!(config && /^https:\/\/filedrop-24b64(?:-default-rtdb)?\.(?:firebaseio\.com|[a-z0-9-]+\.firebasedatabase\.app)\/?$/i.test(config.databaseURL || ''));
  }

  // ---- room id (never silently falls back to the literal "default") ----
  function getRoom() {
    var fromUrl = qs('room');
    if (fromUrl && fromUrl.trim() && fromUrl.trim().toLowerCase() !== 'default') return fromUrl.trim();
    var stored = lsGet(LS_ROOM_KEY);
    if (stored && stored.trim() && stored.trim().toLowerCase() !== 'default') return stored.trim();
    return DEFAULT_ROOM;
  }

  function setRoom(id) {
    var clean = (id || '').trim();
    if (!clean || clean.toLowerCase() === 'default') clean = DEFAULT_ROOM;
    lsSet(LS_ROOM_KEY, clean);
    return clean;
  }

  // ---- Firebase SDK loading / init (deduped, shared across all pages) ----
  function loadSDK() {
    if (_sdkLoadPromise) return _sdkLoadPromise;
    _sdkLoadPromise = new Promise(function (resolve, reject) {
      if (global.firebase && global.firebase.database) { resolve(); return; }
      var s1 = document.createElement('script');
      s1.src = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-app-compat.js';
      s1.onload = function () {
        var s2 = document.createElement('script');
        s2.src = 'https://www.gstatic.com/firebasejs/' + SDK_VERSION + '/firebase-database-compat.js';
        s2.onload = function () { resolve(); };
        s2.onerror = function () { _sdkLoadPromise = null; reject(new Error('Firebase database SDK failed to load')); };
        document.head.appendChild(s2);
      };
      s1.onerror = function () { _sdkLoadPromise = null; reject(new Error('Firebase app SDK failed to load')); };
      document.head.appendChild(s1);
    });
    return _sdkLoadPromise;
  }

  function initApp(config) {
    if (!global.firebase) throw new Error('Firebase SDK not loaded yet');
    if (!isFileDropConfig(config)) throw new Error('Only the FileDrop Firebase project is allowed');
    if (!global.firebase.apps.length) global.firebase.initializeApp(config);
  }

  function ready(config) {
    return loadSDK().then(function () { initApp(config); });
  }

  // ---- overlay ref helpers (fixed path: gs-production/{room}/overlays/{overlay}) ----
  function overlayPath(overlay, room) {
    return 'gs-production/' + (room || getRoom()) + '/overlays/' + overlay;
  }

  function overlayRef(overlay, room) {
    return global.firebase.database().ref(overlayPath(overlay, room));
  }

  function saveOverlay(overlay, data, config) {
    var cfg = config || getConfig();
    if (!hasRealtimeDatabaseConfig(cfg)) return Promise.reject(new Error('A valid FileDrop Realtime Database URL is required'));
    return ready(cfg).then(function () { return overlayRef(overlay).set(data); });
  }

  // ---- realtime listener with reconnect / connection-state handling ----
  // options: { onData(data), onStatus('connected'|'disconnected'), onError(err) }
  // returns { stop() }
  function listenOverlay(overlay, options) {
    options = options || {};
    var cfg = getConfig();
    if (!hasRealtimeDatabaseConfig(cfg)) {
      if (options.onError) options.onError(new Error('A valid FileDrop Realtime Database URL is required'));
      return { stop: function () {} };
    }

    var stopped = false;
    var valueRef = null;
    var connRef = null;
    var wasConnected = null; // null = unknown/first run
    var retryDelay = 1000;
    var retryTimer = null;

    function scheduleRetry() {
      if (stopped || retryTimer) return;
      retryTimer = setTimeout(function () {
        retryTimer = null;
        if (valueRef) { try { valueRef.off(); } catch (e) {} }
        attach();
      }, Math.min(retryDelay, 15000));
      retryDelay = Math.min(retryDelay * 2, 15000);
    }

    function attach() {
      if (stopped) return;
      try {
        valueRef = overlayRef(overlay);
      } catch (e) {
        scheduleRetry();
        return;
      }

      valueRef.on('value', function (snap) {
        var data = snap.val();
        if (data && options.onData) options.onData(data);
      }, function (err) {
        if (options.onError) options.onError(err);
        scheduleRetry();
      });

      if (!connRef) {
        connRef = global.firebase.database().ref('.info/connected');
        connRef.on('value', function (snap) {
          var connected = snap.val() === true;
          if (options.onStatus) options.onStatus(connected ? 'connected' : 'disconnected');
          if (connected) {
            retryDelay = 1000;
            if (wasConnected === false) {
              // Just came back online after a drop: force a fresh read so no update is missed.
              overlayRef(overlay).once('value').then(function (s) {
                var d = s.val();
                if (d && options.onData) options.onData(d);
              }).catch(function () {});
            }
            wasConnected = true;
          } else {
            wasConnected = false;
          }
        });
      }
    }

    ready(cfg).then(attach).catch(function (err) {
      if (options.onError) options.onError(err);
      scheduleRetry();
    });

    return {
      stop: function () {
        stopped = true;
        if (retryTimer) clearTimeout(retryTimer);
        if (valueRef) { try { valueRef.off(); } catch (e) {} }
        if (connRef) { try { connRef.off(); } catch (e) {} }
      }
    };
  }

  global.GSFirebase = {
    DEFAULT_ROOM: DEFAULT_ROOM,
    FILEDROP_CONFIG: Object.assign({}, FILEDROP_CONFIG),
    enc: enc,
    dec: dec,
    getConfig: getConfig,
    setConfig: setConfig,
    getRawConfigForQuery: getRawConfigForQuery,
    hasRealtimeDatabaseConfig: hasRealtimeDatabaseConfig,
    getRoom: getRoom,
    setRoom: setRoom,
    loadSDK: loadSDK,
    initApp: initApp,
    ready: ready,
    overlayPath: overlayPath,
    overlayRef: overlayRef,
    saveOverlay: saveOverlay,
    listenOverlay: listenOverlay
  };

})(window);
