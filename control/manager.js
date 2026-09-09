const q = new URLSearchParams(location.search);
const overlay = q.get('overlay');
const presetId = q.get('preset');
const editingPreset = presetId ? window.EventPresets.get(presetId) : null;
const names = { AliveStatus: 'Alive Status', ElimBroadcast: 'Elimination Broadcast', TopAliveStatus: 'Top Alive Status', TeamPreview: 'Team Preview', ZoneTimer: 'Zone Timer', FirstPick: 'First Pick', MatchResult: 'Match Result', OverallResult: 'Overall Result', WWCD: 'WWCD Team Stats', PrizePool: 'Prize Pool', MVP: 'MVP', Domination: 'Team Domination' };
const key = 'gs-overlay-' + overlay;
let defaults = [], state = {}, history = [];

const themes = {
  orange: { name: 'ORIGINAL ORANGE', primary: '#ff5a1f', secondary: '#b93200', accent: '#ffb000' },
  cyan: { name: 'CYAN BLUE', primary: '#00aadd', secondary: '#005f85', accent: '#59ddff' },
  red: { name: 'CRIMSON RED', primary: '#e11d48', secondary: '#7f1028', accent: '#ff5a7d' },
  purple: { name: 'ROYAL PURPLE', primary: '#7c3aed', secondary: '#3b176f', accent: '#b56cff' },
  green: { name: 'EMERALD GREEN', primary: '#00a86b', secondary: '#005d42', accent: '#35e49a' },
  gold: { name: 'PREMIUM GOLD', primary: '#d49a17', secondary: '#704700', accent: '#ffd166' },
  ice: { name: 'ICE WHITE BLUE', primary: '#bfefff', secondary: '#327e9d', accent: '#f4fdff' },
  neon: { name: 'NEON ELECTRIC', primary: '#00f5ff', secondary: '#003f52', accent: '#a8ffff' },
  magenta: { name: 'MAGENTA PULSE', primary: '#f000b8', secondary: '#6b0054', accent: '#ff6fe0' },
  pink: { name: 'HOT PINK', primary: '#ff3ea5', secondary: '#82104d', accent: '#ff9ed1' },
  midnight: { name: 'MIDNIGHT NAVY', primary: '#2257b8', secondary: '#071b49', accent: '#65a0ff' },
  teal: { name: 'TEAL STORM', primary: '#00b8a9', secondary: '#005c57', accent: '#63fff0' },
  lime: { name: 'LIME ENERGY', primary: '#8fd400', secondary: '#365d00', accent: '#caff4d' },
  blackgold: { name: 'BLACK & GOLD', primary: '#c9982e', secondary: '#17120a', accent: '#ffe29a' },
  silver: { name: 'SILVER STEEL', primary: '#aab4c3', secondary: '#46505f', accent: '#eef3f8' }
};

const overlayControlSchemas = {
  AliveStatus: {
    labels: {
      '--detail-color-1': 'HEADER & FIN/PTS COLUMN BACKGROUND', '--detail-color-2': 'ROW STYLE 1 – LEFT', '--detail-color-3': 'ROW STYLE 1 – CENTER', '--detail-color-4': 'ROW STYLE 1 – RIGHT', '--detail-color-5': 'ROW STYLE 2 – LEFT', '--detail-color-6': 'ROW STYLE 2 – RIGHT', '--detail-color-7': 'RANK STRIP / PRIMARY ACCENT', '--detail-color-8': 'HOVER – CENTER', '--detail-color-9': 'ALIVE BAR / BRIGHT ACCENT', '--detail-color-10': 'PTS NUMBER TEXT', '--detail-color-11': 'FIN NUMBER TEXT', '--detail-color-12': 'FOOTER – OUTER BACKGROUND', '--detail-color-13': 'FOOTER – CENTER BACKGROUND', '--detail-color-14': 'BLUE ZONE BLINK – LEFT', '--detail-color-15': 'BLUE ZONE BLINK – CENTER', '--detail-color-16': 'BLUE ZONE BLINK – RIGHT', '--detail-color-17': 'ODD ROW – LEFT', '--detail-color-18': 'ODD ROW – CENTER', '--detail-color-19': 'ODD ROW – RIGHT', '--detail-color-20': 'EVEN ROW – LEFT', '--detail-color-21': 'EVEN ROW – CENTER', '--detail-color-22': 'EVEN ROW – RIGHT', '--detail-color-23': 'BLUE ZONE FIN & PTS TEXT', '--detail-color-24': 'ELIMINATED – LEFT STRIP', '--detail-color-25': 'ELIMINATED – MAIN BACKGROUND', '--detail-color-26': 'ELIMINATED – TEXT', '--detail-color-27': 'ELIMINATED – TEXT SHADOW', '--black': 'MAIN TABLE BACKGROUND', '--black-2': 'SECONDARY DARK BACKGROUND', '--purple': 'HEADER BOTTOM BORDER', '--purple-2': 'SECONDARY ACCENT', '--purple-3': 'BRIGHT ACCENT', '--white': 'MAIN TEXT', '--cyan-white': 'LIGHT TEXT / ICON', '--line': 'BORDER / DIVIDER'
    },
    sections: [
      ['header', 'HEADER', ['--detail-color-1', '--purple']], ['rows', 'TABLE ROWS', ['--detail-color-2', '--detail-color-3', '--detail-color-4', '--detail-color-5', '--detail-color-6', '--detail-color-17', '--detail-color-18', '--detail-color-19', '--detail-color-20', '--detail-color-21', '--detail-color-22']], ['alive', 'ALIVE / HOVER', ['--detail-color-7', '--detail-color-8', '--detail-color-9', '--detail-color-10', '--detail-color-11']], ['bluezone', 'BLUE ZONE', ['--detail-color-14', '--detail-color-15', '--detail-color-16', '--detail-color-23']], ['eliminated', 'ELIMINATED', ['--detail-color-24', '--detail-color-25', '--detail-color-26', '--detail-color-27']], ['footer', 'FOOTER / LEGEND', ['--detail-color-12', '--detail-color-13']], ['global', 'GLOBAL', ['--black', '--black-2', '--purple-2', '--purple-3', '--white', '--cyan-white', '--line']]
    ], open: ['alive', 'eliminated', 'individual']
  },
  FirstPick: {
    labels: { '--detail-color-1': 'MAIN PANEL BACKGROUND', '--detail-color-2': 'TEAM NAME TEXT', '--detail-color-3': 'BOTTOM STRIP – LEFT', '--detail-color-4': 'BOTTOM STRIP – RIGHT' },
    sections: [['panel', 'MAIN PANEL', ['--detail-color-1', '--detail-color-2']], ['strip', 'BOTTOM ACCENT STRIP', ['--detail-color-3', '--detail-color-4']]], open: ['panel']
  },
  ZoneTimer: {
    labels: { '--detail-color-1': 'TIMER TRACK BACKGROUND', '--detail-color-2': 'TIMER PROGRESS FILL', '--detail-color-3': 'TIMER TEXT', '--bg-dark': 'PANEL DARK BACKGROUND', '--bg-light': 'PANEL LIGHT BACKGROUND', '--red-main': 'PRIMARY ACCENT', '--red-bright': 'BRIGHT ACCENT', '--white': 'GENERAL TEXT / ICON' },
    sections: [['timer', 'TIMER BAR', ['--detail-color-1', '--detail-color-2', '--detail-color-3']], ['panel', 'PANEL BACKGROUND', ['--bg-dark', '--bg-light']], ['accent', 'ACCENTS & TEXT', ['--red-main', '--red-bright', '--white']]], open: ['timer']
  },
  TeamPreview: {
    labels: { '--detail-color-1': 'SPECIAL HIGHLIGHT TEXT', '--bg-dark': 'CARD GRADIENT – DARK', '--bg-light': 'CARD GRADIENT – LIGHT', '--bg-mid': 'CARD GRADIENT – CENTER', '--red-main': 'TOP / UNDERLINE ACCENT', '--red-bright': 'UNDERLINE BRIGHT COLOR', '--red-deep': 'DEEP ACCENT', '--white': 'LEGACY GENERAL TEXT', '--text-soft': 'LEGACY SOFT TEXT', '--panel-border': 'CARD BORDER', '--it-title': 'MAIN TITLE TEXT', '--it-team': 'TEAM NAME TEXT', '--it-player': 'PLAYER NAME TEXT', '--it-error': 'ERROR / NO DATA TEXT' },
    sections: [['background', 'CARD BACKGROUND', ['--bg-light', '--bg-mid', '--bg-dark', '--panel-border']], ['text', 'TEXT', ['--it-title', '--it-team', '--it-player', '--it-error', '--detail-color-1']], ['accent', 'ACCENTS', ['--red-main', '--red-bright', '--red-deep']], ['legacy', 'LEGACY COLORS', ['--white', '--text-soft']]], open: ['background', 'text']
  },
  TopAliveStatus: {
    labels: { '--detail-color-1': 'CARD GRADIENT – LEFT', '--detail-color-2': 'CARD GRADIENT – RIGHT', '--detail-color-3': 'LOGO PANEL / MAIN TEXT', '--detail-color-4': 'STAT NUMBER TEXT' },
    sections: [['card', 'CARD BACKGROUND', ['--detail-color-1', '--detail-color-2']], ['content', 'LOGO & TEXT', ['--detail-color-3', '--detail-color-4']]], open: ['card']
  },
  ElimBroadcast: {
    labels: { '--detail-color-1': 'LOGO BOX / LABEL BACKGROUND / TEAM TEXT', '--detail-color-2': 'MAIN PANEL GRADIENT – LEFT', '--detail-color-3': 'MAIN PANEL GRADIENT – RIGHT', '--detail-color-4': 'FINISH LABEL & NUMBER TEXT', '--orange': 'LEGACY ORANGE ACCENT', '--white': 'GENERAL WHITE TEXT' },
    sections: [['logo', 'LOGO & TEAM', ['--detail-color-1']], ['panel', 'ELIMINATION PANEL', ['--detail-color-2', '--detail-color-3']], ['text', 'LABELS & TEXT', ['--detail-color-4', '--orange', '--white']]], open: ['panel']
  },
  Domination: {
    labels: { '--detail-color-1': 'MAIN PANEL BACKGROUND / FINISH TEXT', '--detail-color-2': 'DOMINATION SCORE TEXT', '--maroon-1': 'LEGACY ACCENT – LIGHT', '--maroon-2': 'LEGACY ACCENT – CENTER', '--maroon-3': 'LEGACY ACCENT – DARK', '--red-1': 'BOTTOM STRIP – TOP', '--red-2': 'BOTTOM STRIP – CENTER', '--red-3': 'BOTTOM STRIP – BOTTOM', '--gold-1': 'DECORATION HIGHLIGHT', '--gold-2': 'DECORATION SOFT HIGHLIGHT', '--white': 'MAIN TITLE TEXT', '--soft-white': 'TEAM NAME TEXT', '--panel-border': 'PANEL BORDER', '--shadow-main': 'MAIN PANEL SHADOW', '--shadow-soft': 'SOFT SHADOW', '--title-shadow': 'TITLE TEXT SHADOW', '--text-shadow': 'TEAM / FINISH TEXT SHADOW' },
    sections: [['panel', 'MAIN PANEL', ['--detail-color-1', '--detail-color-2', '--panel-border']], ['strip', 'BOTTOM STRIP', ['--red-1', '--red-2', '--red-3']], ['text', 'TEXT', ['--white', '--soft-white']], ['accent', 'DECORATION ACCENTS', ['--maroon-1', '--maroon-2', '--maroon-3', '--gold-1', '--gold-2']], ['shadow', 'SHADOWS', ['--shadow-main', '--shadow-soft', '--title-shadow', '--text-shadow']]], open: ['panel', 'strip']
  },
  MVP: {
    labels: { '--detail-color-1': 'TEAM & PLAYER NAME TEXT', '--detail-color-2': 'STAT LABEL & VALUE TEXT', '--bg-dark': 'SECONDARY CARD BACKGROUND', '--bg-light': 'MVP CARD BACKGROUND / RANK LABEL', '--bg-mid': 'CENTER BACKGROUND TONE', '--red-main': 'CARD TOP ACCENT', '--red-bright': 'MAIN TITLE / BRIGHT ACCENT', '--red-deep': 'RANK BADGE & STAT BOX BACKGROUND', '--white': 'GENERAL LABEL / VALUE TEXT', '--text-soft': 'SMALL SOFT TEXT', '--panel-border': 'CARD BORDER' },
    sections: [['background', 'CARD BACKGROUND', ['--bg-light', '--bg-mid', '--bg-dark', '--panel-border']], ['names', 'PLAYER & TEAM TEXT', ['--detail-color-1']], ['stats', 'STATS TEXT', ['--detail-color-2', '--white', '--text-soft']], ['accent', 'TITLE / BADGE ACCENTS', ['--red-main', '--red-bright', '--red-deep']]], open: ['background', 'names']
  },
  PrizePool: {
    labels: { '--bg-dark': 'PRIZE CARD GRADIENT – DARK', '--bg-light': 'PRIZE CARD GRADIENT – LIGHT / TITLE', '--bg-mid': 'PRIZE CARD CENTER TONE', '--red-main': 'CARD TOP LINE / UNDERLINE', '--red-bright': 'UNDERLINE BRIGHT COLOR', '--red-deep': 'DEEP ACCENT', '--white': 'PRIZE LABEL & AMOUNT TEXT', '--text-soft': 'SMALL REWARD LABEL TEXT', '--panel-border': 'PRIZE CARD BORDER' },
    sections: [['background', 'PRIZE CARD BACKGROUND', ['--bg-light', '--bg-mid', '--bg-dark', '--panel-border']], ['text', 'PRIZE TEXT', ['--white', '--text-soft']], ['accent', 'ACCENT LINES', ['--red-main', '--red-bright', '--red-deep']]], open: ['background']
  },
  WWCD: {
    labels: { '--detail-color-1': 'TEAM NAME / WHITE PANEL ACCENT TEXT', '--detail-color-2': 'STATS HEADER GRADIENT – LEFT', '--detail-color-3': 'STATS HEADER GRADIENT – RIGHT', '--detail-color-4': 'STAT LABEL & VALUE TEXT', '--panel-bg': 'WHITE PANEL BACKGROUND (NAME / CONTRI% / TEAM FINISHES-TOTAL ROW)', '--panel-line': 'ORANGE DIVIDER LINE (TEAM FINISHES/TOTAL ROW)', '--photo-glow-1': 'PHOTO BACKGROUND GLOW – TOP', '--photo-glow-2': 'PHOTO BACKGROUND GLOW – BOTTOM', '--bg-dark': 'LEGACY BACKGROUND – DARK', '--bg-light': 'LEGACY BACKGROUND – LIGHT', '--bg-mid': 'LEGACY BACKGROUND – CENTER', '--purple-main': 'WINNER PANEL GRADIENT – TOP', '--purple-bright': 'TITLE / DIVIDER BRIGHT ACCENT', '--purple-deep': 'WINNER PANEL GRADIENT – BOTTOM', '--white': 'WWCD TITLE TEXT', '--text-soft': 'SOFT ACCENT TEXT', '--panel-border': 'PANEL BORDER' },
    sections: [['winner', 'WINNER PANEL', ['--purple-main', '--purple-deep', '--purple-bright', '--panel-border']], ['stats', 'STATS PANELS', ['--detail-color-1', '--detail-color-2', '--detail-color-3', '--detail-color-4', '--panel-bg', '--panel-line', '--photo-glow-1', '--photo-glow-2']], ['text', 'TEXT', ['--white', '--text-soft']], ['legacy', 'OTHER BACKGROUND COLORS', ['--bg-light', '--bg-mid', '--bg-dark']]], open: ['winner', 'stats']
  },
  MatchResult: {
    labels: { '--detail-color-1': 'MAIN TITLE / TABLE HEADER TEXT', '--detail-color-2': 'TEAM, RANK & TABLE TEXT', '--detail-color-3': 'FIRST PLACE TOTAL BOX – TOP', '--detail-color-4': 'FIRST PLACE TOTAL BOX – BOTTOM', '--bg-dark': 'RESULT CARD GRADIENT – DARK', '--bg-light': 'RESULT CARD GRADIENT – LIGHT', '--bg-mid': 'RESULT CARD CENTER TONE', '--red-main': 'TABLE HEADER / TOP LINE ACCENT', '--red-bright': 'TITLE UNDERLINE / TOTAL VALUE', '--red-deep': 'TABLE HEADER GRADIENT – TOP', '--white': 'HEADER & HOVER TEXT', '--text-soft': 'SOFT TEXT', '--panel-border': 'RESULT CARD BORDER', '--row-dark': 'ODD ROW BACKGROUND', '--row-light': 'EVEN ROW BACKGROUND', '--row-hover': 'ROW HOVER BACKGROUND' },
    sections: [['title', 'TITLE & TEXT', ['--detail-color-1', '--detail-color-2', '--white', '--text-soft']], ['cards', 'RESULT CARDS', ['--bg-light', '--bg-mid', '--bg-dark', '--panel-border']], ['first', 'FIRST PLACE TOTAL BOX', ['--detail-color-3', '--detail-color-4']], ['table', 'TABLE COLORS', ['--red-deep', '--red-main', '--red-bright', '--row-dark', '--row-light', '--row-hover']]], open: ['title', 'cards']
  },
  OverallResult: {
    labels: { '--detail-color-1': 'MAIN TITLE / TABLE HEADER TEXT', '--detail-color-2': 'TEAM, RANK & TABLE TEXT', '--detail-color-3': 'FIRST PLACE TOTAL BOX – TOP', '--detail-color-4': 'FIRST PLACE TOTAL BOX – BOTTOM', '--bg-dark': 'RESULT CARD GRADIENT – DARK', '--bg-light': 'RESULT CARD GRADIENT – LIGHT', '--bg-mid': 'RESULT CARD CENTER TONE', '--red-main': 'TABLE HEADER / TOP LINE ACCENT', '--red-bright': 'TITLE UNDERLINE / TOTAL VALUE', '--red-deep': 'TABLE HEADER GRADIENT – TOP', '--white': 'TOTAL LABEL / HOVER TEXT', '--text-soft': 'SOFT TEXT', '--panel-border': 'RESULT CARD BORDER', '--row-dark': 'ODD ROW BACKGROUND', '--row-light': 'EVEN ROW BACKGROUND', '--row-hover': 'ROW HOVER BACKGROUND' },
    sections: [['title', 'TITLE & TEXT', ['--detail-color-1', '--detail-color-2', '--white', '--text-soft']], ['cards', 'RESULT CARDS', ['--bg-light', '--bg-mid', '--bg-dark', '--panel-border']], ['first', 'FIRST PLACE TOTAL BOX', ['--detail-color-3', '--detail-color-4']], ['table', 'TABLE COLORS', ['--red-deep', '--red-main', '--red-bright', '--row-dark', '--row-light', '--row-hover']]], open: ['title', 'cards']
  }
};

function currentSchema() {
  const base = overlayControlSchemas[overlay] || { labels: {}, sections: [], open: [] };
  const individual = defaults.filter(x => x.individual).map(x => x.var);
  if (!individual.length) return base;
  const labels = { ...(base.labels || {}) };
  defaults.filter(x => x.individual).forEach(x => { labels[x.var] = x.label || x.var.replace(/^--/, '').replaceAll('-', ' ').toUpperCase(); });
  return { ...base, labels, sections: [...(base.sections || []), ['individual', 'INDIVIDUAL TEXT COLORS', individual]] };
}
function buildSections(container) {
  const schema = currentSchema();
  if (!schema.sections.length) { const body = document.createElement('div'); body.className = 'section-body'; body.dataset.section = 'general'; container.appendChild(body); return new Map([['general', body]]); }
  const map = new Map();
  schema.sections.forEach(([id, title]) => {
    const details = document.createElement('details'); details.className = 'control-section'; details.open = (schema.open || []).includes(id);
    details.innerHTML = `<summary><span>${title}</span><span class="section-toggle">⌄</span></summary><div class="section-body"></div>`;
    container.appendChild(details); map.set(id, details.querySelector('.section-body'));
  });
  return map;
}
function sectionForVar(v) {
  const schema = currentSchema();
  const found = schema.sections.find(([, , vars]) => vars.includes(v));
  return found ? found[0] : (schema.sections[0]?.[0] || 'general');
}

const cfg = () => window.GSFirebase ? window.GSFirebase.getConfig() : null;
const room = () => window.GSFirebase ? window.GSFirebase.getRoom() : 'gs-event-2026';
const hex = v => {
    v = String(v).trim();

    let m = v.match(/#[0-9a-fA-F]{6}/);
    if (m) return m[0];

    m = v.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);

    if (m) {
        return "#" +
            Number(m[1]).toString(16).padStart(2, "0") +
            Number(m[2]).toString(16).padStart(2, "0") +
            Number(m[3]).toString(16).padStart(2, "0");
    }

    return "#ffffff";
};
function rgb(h) { h = h.replace('#', ''); return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)]; }
function lum(h) { const [r, g, b] = rgb(h); return .2126 * r + .7152 * g + .0722 * b; }
function sat(h) { const a = rgb(h), mx = Math.max(...a), mn = Math.min(...a); return mx - mn; }
function mix(a, b, p) { const A = rgb(a), B = rgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * p).toString(16).padStart(2, '0')).join(''); }
function rgba(h, a) { const [r, g, b] = rgb(h); return `rgba(${r},${g},${b},${a})`; }
function textOn(h) { return lum(h) > 165 ? '#000000' : '#ffffff'; }

function recolorValue(value, t) {
  return String(value).replace(/#[0-9a-fA-F]{6}/g, h => {
    const l = lum(h), s = sat(h);
    if (s < 22 || l > 238 || l < 24) return h;
    if (l > 180) return t.accent;
    if (l < 95) return t.secondary;
    return t.primary;
  });
}

function aliveThemeState(t) {
  const dark1 = mix(t.secondary, '#000000', .72), dark2 = mix(t.secondary, '#000000', .58), dark3 = mix(t.secondary, '#000000', .44);
  const mid1 = mix(t.secondary, t.primary, .22), mid2 = mix(t.secondary, t.primary, .42), mid3 = mix(t.secondary, t.primary, .62);
  const text = textOn(dark2), accentText = textOn(t.accent);
  return {
    '--detail-color-1': mix(t.accent, '#ffffff', .78),
    '--detail-color-2': dark1, '--detail-color-3': dark2, '--detail-color-4': dark3,
    '--detail-color-5': mix(dark1, t.primary, .10), '--detail-color-6': mix(dark3, t.primary, .18),
    '--detail-color-7': t.primary, '--detail-color-8': mix(t.primary, t.accent, .45), '--detail-color-9': t.accent,
    '--detail-color-10': accentText, '--detail-color-11': text,
    '--detail-color-12': mix(t.secondary, '#000000', .67), '--detail-color-13': mix(t.secondary, t.primary, .30),
    '--detail-color-14': dark2, '--detail-color-15': t.primary, '--detail-color-16': t.accent,
    '--detail-color-17': dark1, '--detail-color-18': mid1, '--detail-color-19': mid2,
    '--detail-color-20': mix(dark1, '#ffffff', .04), '--detail-color-21': mid2, '--detail-color-22': mid3,
    '--detail-color-23': accentText,
    '--detail-color-24': t.accent,
    '--detail-color-25': t.primary,
    '--detail-color-26': textOn(t.primary),
    '--detail-color-27': '#000000',
    '--black': mix(t.secondary, '#000000', .63), '--black-2': mix(t.secondary, '#000000', .48),
    '--purple': mix(t.primary, '#000000', .35), '--purple-2': mix(t.primary, t.accent, .38), '--purple-3': t.accent,
    '--white': text, '--cyan-white': '#ffffff', '--line': rgba(t.accent, .28)
  };
}

function labelFor(v) {
  const configured = defaults.find(item => item.var === v);
  return currentSchema().labels[v] || configured?.label || v.replace(/^--/, '').replaceAll('-', ' ').toUpperCase();
}
function snapshot() { return JSON.parse(JSON.stringify(state)); }
function pushHistory() { history.push(snapshot()); if (history.length > 60) history.shift(); updateUndo(); }
function updateUndo() { const b = document.getElementById('undo'); if (b) b.disabled = history.length === 0; }
function undo() { if (!history.length) return; state = history.pop(); syncInputs(); applyPreview(); updateUndo(); }

function renderPresets() {
  const box = document.getElementById('presets');
  Object.entries(themes).forEach(([id, t]) => {
    const b = document.createElement('button'); b.className = 'preset';
    b.innerHTML = `<span class="swatches"><i style="background:${t.primary}"></i><i style="background:${t.secondary}"></i><i style="background:${t.accent}"></i></span><span>${t.name}</span>`;
    b.onclick = () => applyTheme(t, id); box.appendChild(b);
  });
}
function applyTheme(t, id) {
  pushHistory();
  if (overlay === 'AliveStatus') state = { ...state, ...aliveThemeState(t) };
  else defaults.forEach(x => state[x.var] = recolorValue(x.default, t));
  syncInputs(); applyPreview();
  document.querySelectorAll('.preset').forEach(b => b.classList.remove('active'));
  const arr = [...document.querySelectorAll('.preset')], idx = Object.keys(themes).indexOf(id); if (arr[idx]) arr[idx].classList.add('active');
}
function syncInputs() {
  document.querySelectorAll('.row').forEach(row => {
    const v = row.dataset.var, val = state[v] ?? defaults.find(x => x.var === v)?.default ?? '';
    row.children[1].value = hex(val); row.children[2].value = val;
  });
}
async function init() {
  document.getElementById('title').textContent = (names[overlay] || overlay) + ' MANAGER' + (editingPreset ? ' · ' + editingPreset.name : '');
  if (presetId && !editingPreset) { alert('Event preset not found'); location.replace('presets.html'); return; }
  if (editingPreset) { document.getElementById('presetBack').hidden = false; document.getElementById('presetBack').href = 'preset-editor.html?id=' + encodeURIComponent(presetId); document.getElementById('save').textContent = 'SAVE PRESET'; document.getElementById('managerNote').textContent = 'You are editing the saved Event Preset. This does not change the live production setup until the preset is applied.'; }
  const all = await (await fetch('overlay-config.json')).json(); defaults = all[overlay] || [];
  const base = Object.fromEntries(defaults.map(x => [x.var, x.default]));
  if (editingPreset) state = { ...base, ...(editingPreset.overlays && editingPreset.overlays[overlay] || {}) };
  else try { state = { ...base, ...JSON.parse(localStorage.getItem(key) || '{}') }; } catch (e) { state = base; }
  renderPresets();
  const c = document.getElementById('controls');
  const sectionBodies = buildSections(c);
  defaults.forEach(x => {
    const val = state[x.var] ?? x.default, row = document.createElement('div'); row.className = 'row'; row.dataset.var = x.var;
    row.innerHTML = `<label title="${x.var}">${labelFor(x.var)}</label><input type="color" value="${hex(val)}"><input type="text" value="${String(val).replaceAll('"', '&quot;')}">`;
    const cp = row.children[1], tx = row.children[2]; let editStart = null;
    const begin = () => { if (editStart === null) editStart = snapshot(); };
    const finish = () => { if (editStart !== null) { history.push(editStart); if (history.length > 60) history.shift(); editStart = null; updateUndo(); } };
cp.onpointerdown = begin;
cp.onfocus = begin;

cp.oninput = () => {
    let value = cp.value;

    if (x.var === '--row-light') {
        value = rgba(cp.value, 0.08);
    } else if (x.var === '--row-dark') {
        value = rgba(cp.value, 0.02);
    } else if (x.var === '--row-hover') {
        value = rgba(cp.value, 0.15);
    }

    state[x.var] = value;
    tx.value = value;
    applyPreview();
};

cp.onchange = finish;
cp.onblur = finish;
    tx.onfocus = begin; tx.oninput = () => { state[x.var] = tx.value; cp.value = hex(tx.value); applyPreview(); }; tx.onchange = finish; tx.onblur = finish;
    (sectionBodies.get(sectionForVar(x.var)) || c).appendChild(row);
  });
  document.getElementById('preview').src = '../' + overlay + '.html' + cloudQuery(); updateUndo();
}
function applyPreview() { const w = document.getElementById('preview').contentWindow; if (w && w.document) Object.entries(state).forEach(([k, v]) => w.document.documentElement.style.setProperty(k, v)); fitPreview(); }
function fitPreview() {
  const stage = document.getElementById('previewStage');
  const frame = document.getElementById('preview');
  if (!stage || !frame) return;
  const pad = 18;
  const scale = Math.min((stage.clientWidth - pad) / 1920, (stage.clientHeight - pad) / 1080);
  frame.style.transform = `translate(-50%,-50%) scale(${Math.max(scale, 0.05)})`;
}

function cloudQuery() { const s = window.GSFirebase ? window.GSFirebase.getRawConfigForQuery() : localStorage.getItem('gs-firebase-config'); return s ? '?room=' + encodeURIComponent(room()) + '&cfg=' + encodeURIComponent(s) : ''; }
async function save() {
  if (editingPreset) {
    try { window.EventPresets.updateOverlay(presetId, overlay, state); alert('Overlay settings saved to Event Preset "' + editingPreset.name + '"'); } catch (e) { alert('Preset save failed: ' + (e && e.message ? e.message : e)); }
    return;
  }
  localStorage.setItem(key, JSON.stringify(state)); applyPreview();
  const c = cfg();
  if (c && window.GSFirebase && window.GSFirebase.hasRealtimeDatabaseConfig(c)) {
    try {
      await window.GSFirebase.saveOverlay(overlay, state, c);
      alert('Theme saved + cloud live apply done (room: ' + room() + ')');
    } catch (e) {
      alert('Theme saved on this browser. Cloud save failed: ' + (e && e.message ? e.message : e));
    }
  } else {
    alert('Theme saved on this browser. Different PC sync ke liye Cloud Setup karo.');
  }
}
document.getElementById('save').onclick = save;
document.getElementById('undo').onclick = undo;
document.getElementById('reset').onclick = () => { pushHistory(); state = Object.fromEntries(defaults.map(x => [x.var, x.default])); localStorage.removeItem(key); syncInputs(); applyPreview(); };
document.getElementById('preview').onload = () => { applyPreview(); fitPreview(); };
window.addEventListener('resize', fitPreview);
window.addEventListener('keydown', e => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z') { e.preventDefault(); undo(); } });
init();
