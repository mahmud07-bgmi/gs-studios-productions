const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';
const REFRESH_EVERY = 2500;
const ELIM_ANIMATION_DURATION = 2200;

function getGvizUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
}

function parseGvizTable(json) {
  if (!json.table) return { headers: [], rows: [] };
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ''))
  );
  return { headers, rows };
}

function createAliveRectangles(count) {
  const total = 4;
  const isEliminated = count === 0;
  let html = '<div class="alive-rectangles">';

  for (let i = 0; i < total; i++) {
    html += `<div class="alive-rect-bar${i >= count ? ' dead' : ''}"></div>`;
  }

  if (isEliminated) {
    html += '<div class="alive-rect-strike"></div>';
  }

  html += '</div>';
  return html;
}

let previousAliveMap = {};
let previousRankMap = {};
let previousSortedOrder = [];
let frozenTeams = new Map();
let pendingElimTeamKey = null;

function now() {
  return Date.now();
}

function cleanupFrozenTeams() {
  const t = now();
  for (const [key, expire] of frozenTeams.entries()) {
    if (t >= expire) frozenTeams.delete(key);
  }
}

function ensureElimOverlay() {
  const container = document.getElementById('table-container');
  if (!container) return null;

  let overlay = document.getElementById('elim-row-overlay');
  if (!overlay) {
    overlay = document.createElement('div');
    overlay.id = 'elim-row-overlay';
    overlay.className = 'elim-row-overlay';
    overlay.innerHTML = '<div class="elim-row-overlay-text">ELIMINATED</div>';
    container.appendChild(overlay);
  }
  return overlay;
}

function triggerRowElimAnimation(teamKey) {
  pendingElimTeamKey = teamKey;
  frozenTeams.set(teamKey, now() + ELIM_ANIMATION_DURATION);
}

function getRowTopRelativeToContainer(rowEl, containerEl) {
  const rowRect = rowEl.getBoundingClientRect();
  const containerRect = containerEl.getBoundingClientRect();
  return rowRect.top - containerRect.top;
}

function playPendingElimAnimation() {
  if (!pendingElimTeamKey) return;

  const rowEl = document.querySelector(`tr[data-team-key="${pendingElimTeamKey}"]`);
  const container = document.getElementById('table-container');
  const overlay = ensureElimOverlay();

  if (!rowEl || !container || !overlay) {
    pendingElimTeamKey = null;
    return;
  }

  const rowTop = getRowTopRelativeToContainer(rowEl, container);
  overlay.style.top = `${rowTop}px`;
  overlay.classList.remove('show');

  const textEl = overlay.querySelector('.elim-row-overlay-text');
  if (textEl) {
    textEl.style.animation = 'none';
    void textEl.offsetWidth;
    textEl.style.animation = '';
  }

  void overlay.offsetWidth;
  overlay.classList.add('show');

  const thisTeam = pendingElimTeamKey;
  pendingElimTeamKey = null;

  setTimeout(() => {
    overlay.classList.remove('show');
    frozenTeams.delete(thisTeam);
  }, ELIM_ANIMATION_DURATION);
}

function detectEliminations(validRows, indexes) {
  const {
    srNoIdx,
    teamNameIdx,
    teamInitialIdx,
    playersAliveIdx
  } = indexes;

  const currentAliveMap = {};

  validRows.forEach(row => {
    const teamKey = String(row[srNoIdx] ?? '').trim();
    const teamName =
      String(row[teamInitialIdx] ?? '').trim() ||
      String(row[teamNameIdx] ?? '').trim() ||
      'TEAM';
    const alive = parseInt(row[playersAliveIdx], 10) || 0;

    if (!teamKey) return;

    currentAliveMap[teamKey] = { name: teamName, alive };

    const previous = previousAliveMap[teamKey];
    if (previous && previous.alive > 0 && alive === 0 && !frozenTeams.has(teamKey)) {
      triggerRowElimAnimation(teamKey);
    }
  });

  previousAliveMap = currentAliveMap;
}

function stableSortRows(rows, indexes) {
  const {
    srNoIdx,
    finishPointsIdx,
    totalPointsIdx,
    playersAliveIdx
  } = indexes;

  return [...rows].sort((a, b) => {
    const aKey = String(a[srNoIdx] ?? '').trim();
    const bKey = String(b[srNoIdx] ?? '').trim();

    const aFrozen = frozenTeams.has(aKey);
    const bFrozen = frozenTeams.has(bKey);

    if (aFrozen || bFrozen) {
      const aPrev = previousSortedOrder.indexOf(aKey);
      const bPrev = previousSortedOrder.indexOf(bKey);
      if (aPrev !== -1 && bPrev !== -1) return aPrev - bPrev;
    }

    const aTotal = parseInt(a[totalPointsIdx], 10) || 0;
    const bTotal = parseInt(b[totalPointsIdx], 10) || 0;
    if (bTotal !== aTotal) return bTotal - aTotal;

    const aFinish = parseInt(a[finishPointsIdx], 10) || 0;
    const bFinish = parseInt(b[finishPointsIdx], 10) || 0;
    if (bFinish !== aFinish) return bFinish - aFinish;

    const aAlive = parseInt(a[playersAliveIdx], 10) || 0;
    const bAlive = parseInt(b[playersAliveIdx], 10) || 0;
    if (bAlive !== aAlive) return bAlive - aAlive;

    const aRank = parseInt(a[srNoIdx], 10) || 0;
    const bRank = parseInt(b[srNoIdx], 10) || 0;
    return aRank - bRank;
  });
}

function renderTable(table, shouldShow) {
  cleanupFrozenTeams();

  const idx = key =>
    table.headers.findIndex(
      h => String(h).toLowerCase().replace(/\s/g, '_') === key
    );

  const srNoIdx = idx('sr_no');
  const teamNameIdx = idx('team_name');
  const teamLogoIdx = idx('team_logo');
  const teamInitialIdx = idx('team_initial');
  const playersAliveIdx = idx('players_alive');
  const finishPointsIdx = idx('finish_points');
  const totalPointsIdx = idx('total_points');
  const bluezoneIdx = idx('bluezone');

  const validRows = table.rows.filter(row => {
    const srNo = String(row[srNoIdx] ?? '').trim();
    const teamName = String(row[teamNameIdx] ?? '').trim();
    const teamInitial = String(row[teamInitialIdx] ?? '').trim();
    return srNo !== '' && !isNaN(Number(srNo)) && (teamName !== '' || teamInitial !== '');
  });

  detectEliminations(validRows, {
    srNoIdx,
    teamNameIdx,
    teamInitialIdx,
    playersAliveIdx
  });

  const sortedRows = stableSortRows(validRows, {
    srNoIdx,
    finishPointsIdx,
    totalPointsIdx,
    playersAliveIdx
  });

  previousSortedOrder = sortedRows.map(row => String(row[srNoIdx] ?? '').trim());

  const displayRows = sortedRows.map((row, i) => ({
    rank: i + 1,
    data: row
  }));

  let html = `
    <table class="table-alive">
      <thead>
        <tr>
          <th style="width: 33px;">#</th>
          <th class="team" style="width: 115px;">TEAM NAME</th>
          <th style="width: 55px;">STATUS</th>
          <th style="width: 60px;">FIN</th>
          <th style="width: 64px;">PTS</th>
        </tr>
      </thead>
      <tbody>
  `;

  for (let i = 0; i < displayRows.length; i++) {
    const row = displayRows[i].data;
    const teamKey = String(row[srNoIdx] ?? '').trim();
    const isBluezone = String(row[bluezoneIdx]).toLowerCase() === 'true';
    const aliveCount = parseInt(row[playersAliveIdx], 10) || 0;
    const oldRank = previousRankMap[teamKey];
    const newRank = i + 1;

    let moveClass = '';
    if (!frozenTeams.has(teamKey) && oldRank) {
      if (newRank < oldRank) moveClass = ' move-up';
      if (newRank > oldRank) moveClass = ' move-down';
    }

   html += `<tr data-team-key="${teamKey}" class="${isBluezone && aliveCount > 0 ? 'bluezone-blink' : ''}${moveClass}">`;
    html += `<td>${newRank}</td>`;html += `<td class="team"><img src="${row[teamLogoIdx] || ''}" alt="logo"><span>${String(row[teamInitialIdx] || row[teamNameIdx] || '').slice(0,8)}</span></td>`;
    
    html += `<td>${createAliveRectangles(parseInt(row[playersAliveIdx], 10) || 0)}</td>`;
    html += `<td>${parseInt(row[finishPointsIdx], 10) || 0}</td>`;
    html += `<td>${parseInt(row[totalPointsIdx], 10) || 0}</td>`;
    html += `</tr>`;
  }

  html += `</tbody></table>
    <div class="alive-legend">
      <div class="alive-legend-item">
        <span class="alive-legend-box alive"></span>
        <span>ALIVE</span>
      </div>
      <div class="alive-legend-item">
        <span class="alive-legend-box eliminated"></span>
        <span>ELIMINATED</span>
      </div>
    </div>`;

  const container = document.getElementById('table-container');

  if (shouldShow) {
    container.style.display = "block";
    container.className = "table-container slide-in";
  } else {
    container.className = "table-container slide-out";
    setTimeout(() => {
      container.style.display = "none";
    }, 800);
  }

  container.innerHTML = html;
  ensureElimOverlay();
  playPendingElimAnimation();

  previousRankMap = {};
  displayRows.forEach((item, index) => {
    const key = String(item.data[srNoIdx] ?? '').trim();
    previousRankMap[key] = index + 1;
  });
}

function updateVisibility(table) {
  if (!table.headers.length || !table.rows.length) return true;

  const idx = key =>
    table.headers.findIndex(
      h => String(h).toLowerCase().replace(/\s/g, '_') === key
    );

  const srNoIdx = idx('sr_no');
  const teamNameIdx = idx('team_name');
  const teamInitialIdx = idx('team_initial');
  const playersAliveIdx = idx('players_alive');

  if (playersAliveIdx === -1) return true;

  const validRows = table.rows.filter(row => {
    const srNo = String(row[srNoIdx] ?? '').trim();
    const teamName = String(row[teamNameIdx] ?? '').trim();
    const teamInitial = String(row[teamInitialIdx] ?? '').trim();
    return srNo !== '' && !isNaN(Number(srNo)) && (teamName !== '' || teamInitial !== '');
  });

  const teamsWithPlayersAlive = validRows.filter(row => {
    const aliveCount = parseInt(row[playersAliveIdx], 10) || 0;
    return aliveCount > 0;
  }).length;

  return teamsWithPlayersAlive > 4;
}

const gvizUrl = getGvizUrl(SHEET_URL);
let lastTable = { headers: [], rows: [] };

function fetchData() {
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(
        text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1)
      );

      lastTable = parseGvizTable(json);

      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = 'none';

      if (!lastTable.headers.length || !lastTable.rows.length) {
        document.getElementById('nodata').style.display = '';
        document.getElementById('table-root').style.display = 'none';
        return;
      }

      document.getElementById('nodata').style.display = 'none';
      document.getElementById('table-root').style.display = '';

      const shouldShow = updateVisibility(lastTable);
      renderTable(lastTable, shouldShow);
    })
    .catch(() => {
      document.getElementById('loading').style.display = 'none';
      document.getElementById('error').style.display = '';
      document.getElementById('error').textContent = 'Failed to load data';
      document.getElementById('table-root').style.display = 'none';
    });
}

fetchData();
setInterval(fetchData, REFRESH_EVERY);
