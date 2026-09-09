/* GS Studios Event Presets
 * Presets are kept in their own localStorage key. They contain only production
 * overlay style state; tournament, match, team, player, API, and Firebase
 * configuration are deliberately never read or written here.
 */
(function (global) {
  'use strict';
  var KEY = 'gs-event-presets-v1';
  var OVERLAY_PREFIX = 'gs-overlay-';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function read() { try { var value = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(value) ? value : []; } catch (error) { return []; } }
  function write(items) { localStorage.setItem(KEY, JSON.stringify(items)); }
  function id() { return 'preset-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8); }
  function cleanName(name) { return String(name || '').trim().replace(/\s+/g, ' '); }
  function find(presetId) { return read().find(function (preset) { return preset.id === presetId; }) || null; }

  function create(name, defaultsByOverlay) {
    var presetName = cleanName(name);
    if (!presetName) throw new Error('Enter an event preset name');
    if (read().some(function (preset) { return preset.name.toLowerCase() === presetName.toLowerCase(); })) throw new Error('An event preset with this name already exists');
    var overlays = {};
    Object.keys(defaultsByOverlay).forEach(function (overlay) { var current = {}; try { current = JSON.parse(localStorage.getItem(OVERLAY_PREFIX + overlay) || '{}'); } catch (error) {} overlays[overlay] = Object.assign({}, defaultsByOverlay[overlay], current); });
    var preset = { id: id(), name: presetName, overlays: overlays, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
    var items = read(); items.push(preset); write(items); return clone(preset);
  }
  function rename(presetId, name) {
    var presetName = cleanName(name), items = read();
    if (!presetName) throw new Error('Enter an event preset name');
    if (items.some(function (preset) { return preset.id !== presetId && preset.name.toLowerCase() === presetName.toLowerCase(); })) throw new Error('An event preset with this name already exists');
    var preset = items.find(function (item) { return item.id === presetId; }); if (!preset) throw new Error('Event preset not found');
    preset.name = presetName; preset.updatedAt = new Date().toISOString(); write(items); return clone(preset);
  }
  function updateOverlay(presetId, overlay, state) {
    var items = read(), preset = items.find(function (item) { return item.id === presetId; }); if (!preset) throw new Error('Event preset not found');
    preset.overlays = preset.overlays || {}; preset.overlays[overlay] = clone(state); preset.updatedAt = new Date().toISOString(); write(items); return clone(preset);
  }
  function duplicate(presetId, name) {
    var source = find(presetId), copyName = cleanName(name); if (!source) throw new Error('Event preset not found'); if (!copyName) throw new Error('Enter an event preset name');
    if (read().some(function (preset) { return preset.name.toLowerCase() === copyName.toLowerCase(); })) throw new Error('An event preset with this name already exists');
    var copy = clone(source); copy.id = id(); copy.name = copyName; copy.createdAt = new Date().toISOString(); copy.updatedAt = copy.createdAt; var items = read(); items.push(copy); write(items); return copy;
  }
  function remove(presetId) { write(read().filter(function (preset) { return preset.id !== presetId; })); }
  async function apply(presetId) {
    var preset = find(presetId); if (!preset) throw new Error('Event preset not found'); var overlays = preset.overlays || {};
    Object.keys(overlays).forEach(function (overlay) { localStorage.setItem(OVERLAY_PREFIX + overlay, JSON.stringify(overlays[overlay])); });
    var cloudErrors = [];
    if (global.GSFirebase) { var config = global.GSFirebase.getConfig(); if (global.GSFirebase.hasRealtimeDatabaseConfig(config)) await Promise.all(Object.keys(overlays).map(function (overlay) { return global.GSFirebase.saveOverlay(overlay, overlays[overlay], config).catch(function (error) { cloudErrors.push(overlay + ': ' + error.message); }); })); }
    return { preset: clone(preset), cloudErrors: cloudErrors };
  }
  global.EventPresets = { list: function () { return clone(read()); }, get: function (presetId) { var preset = find(presetId); return preset ? clone(preset) : null; }, create: create, rename: rename, updateOverlay: updateOverlay, duplicate: duplicate, remove: remove, apply: apply };
})(window);
