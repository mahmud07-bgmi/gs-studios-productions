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
  var SDK_VERSION = '9.23.0';
  var LS_CONFIG_KEY = 'gs-firebase-config';
  var LS_ROOM_KEY = 'gs-room';

  var _sdkLoadPromise = null;

  function enc(o) { return btoa(unescape(encodeURIComponent(JSON.stringify(o)))); }
  function dec(s) { return JSON.parse(decodeURIComponent(escape(atob(s)))); }

  function qs(name) {
    try { return new URLSearchParams(location.search).get(name); } catch (e) { return null; }
  }

  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }

  // ---- config (Firebase web config JSON) ----
  function getRawConfigString() { return qs('cfg') || lsGet(LS_CONFIG_KEY); }

  function getConfig() {
    var s = getRawConfigString();
    if (!s) return null;
    try { return dec(s); } catch (e) { return null; }
  }

  function setConfig(obj) { return lsSet(LS_CONFIG_KEY, enc(obj)); }

  // Encoded string form, preferring the persisted one so links stay stable.
  function getRawConfigForQuery() { return lsGet(LS_CONFIG_KEY) || qs('cfg'); }

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
    if (!cfg || !cfg.databaseURL) return Promise.reject(new Error('No Firebase config'));
    return ready(cfg).then(function () { return overlayRef(overlay).set(data); });
  }

  // ---- realtime listener with reconnect / connection-state handling ----
  // options: { onData(data), onStatus('connected'|'disconnected'), onError(err) }
  // returns { stop() }
  function listenOverlay(overlay, options) {
    options = options || {};
    var cfg = getConfig();
    if (!cfg || !cfg.databaseURL) {
      if (options.onError) options.onError(new Error('No Firebase config'));
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
    enc: enc,
    dec: dec,
    getConfig: getConfig,
    setConfig: setConfig,
    getRawConfigForQuery: getRawConfigForQuery,
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
