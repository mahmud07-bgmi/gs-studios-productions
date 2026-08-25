// CONFIG: Set your Google Sheet URL here (published to web, not private)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';
const ANIMATION_DURATION = 400; // ms
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
  let html = '<div class="top-alive-rectangles">';
  for (let i = 0; i < total; i++) {
    html += `<div class="top-alive-rect-bar${i >= count ? ' dead' : ''}"></div>`;
  }
  html += '</div>';
  return html;
}
function calculateWWCDPercentage(aliveCount, totalTeams, allTeamsAliveCounts) {
  if (aliveCount === 0) return 0;
  const totalPlayersAlive = allTeamsAliveCounts.reduce((sum, count) => sum + count, 0);
  if (totalPlayersAlive === 0) return 0;
  const percentage = (aliveCount / totalPlayersAlive) * 100;
  return Math.round(percentage);
}
let teams = [];
let eliminating = [];
let prevAlive = {};
let prevAliveCount = 0;
let showSlideDown = false;
function render() {
  const aliveCount = teams.filter(t => t.alive > 0).length;
  // Only teams with alive > 0 or being eliminated
  const aliveTeams = teams.filter(t => t.alive > 0 || eliminating.includes(t.sr_no));
  // Sort by WWCD percentage DESC, then sr_no ASC for ranking
  const rankedTeams = [...aliveTeams].sort((a, b) => {
    const aliveTeamsAliveCounts = aliveTeams.map(t => t.alive);
    const aPercentage = calculateWWCDPercentage(a.alive, aliveCount, aliveTeamsAliveCounts);
    const bPercentage = calculateWWCDPercentage(b.alive, aliveCount, aliveTeamsAliveCounts);
    if (bPercentage !== aPercentage) return bPercentage - aPercentage;
    return a.sr_no - b.sr_no;
  });
  // Only show when 4 or fewer teams are alive
  if (aliveCount > 4 || aliveCount === 0) {
    document.getElementById('top-alive-root').style.visibility = 'hidden';
    document.getElementById('top-alive-root').innerHTML = '';
    return;
  }
  // Show slide-down only on first appearance after aliveCount transitions from >4 to <=4
  const wrapperClass = `top-alive-status-cards-wrapper${showSlideDown ? ' slide-down' : ''}`;
  let html = `<div class="${wrapperClass}" style="visibility: visible;">`;
  rankedTeams.forEach((team, idx) => {
    const aliveTeamsAliveCounts = rankedTeams.map(t => t.alive);
    const wwcdPercentage = calculateWWCDPercentage(team.alive, aliveCount, aliveTeamsAliveCounts);
    html += `
      <div class="team-card teamcard${idx + 1}${eliminating.includes(team.sr_no) ? ' eliminating' : ''}">
        <div class="team-rank">#${idx + 1}</div>
        <img class="team-logo" src="${team.team_logo}" alt="${team.team_name}" />
        <div class="team-info">
          <div class="team-name">${team.team_name}</div>
          <div class="team-finishes">Finishes: ${team.finishes}</div>
          <div class="team-alive-section">
            <span class="top-alive-label">ALIVE:</span>${createAliveRectangles(team.alive)}
          </div>
        </div>
        <div class="wwcd-percentage">
          <div class="wwcd-label">WWCD:</div>
          <div class="wwcd-value">${wwcdPercentage}%</div>
        </div>
      </div>
    `;
  });
  html += '</div>';
  document.getElementById('top-alive-root').style.visibility = 'visible';
  document.getElementById('top-alive-root').innerHTML = html;
}
function fetchData() {
  const gvizUrl = getGvizUrl(SHEET_URL);
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1));
      const table = parseGvizTable(json);
      if (table.headers.length && table.rows.length) {
        const idx = key => table.headers.findIndex(h => h.toLowerCase().replace(/\s/g, '_') === key);
        const srNoIdx = idx('sr_no');
        const teamLogoIdx = idx('team_logo');
        const teamNameIdx = idx('team_name');
        const playersAliveIdx = idx('players_alive');
        const finishPointsIdx = idx('finish_points');
        const teamData = table.rows.map(row => ({
          sr_no: parseInt(row[srNoIdx], 10) || 0,
          team_logo: row[teamLogoIdx] || '',
          team_name: row[teamNameIdx] || '',
          finishes: parseInt(row[finishPointsIdx], 10) || 0,
          alive: parseInt(row[playersAliveIdx], 10) || 0,
        }));
        // Detect which teams just got eliminated
        const newlyEliminated = teamData
          .filter(t => prevAlive[t.sr_no] > 0 && t.alive === 0)
          .map(t => t.sr_no);
        if (newlyEliminated.length > 0) {
          eliminating = eliminating.concat(newlyEliminated);
          setTimeout(() => {
            eliminating = eliminating.filter(sr => !newlyEliminated.includes(sr));
            teams = teamData;
            prevAlive = Object.fromEntries(teamData.map(t => [t.sr_no, t.alive]));
            render();
          }, ANIMATION_DURATION);
        } else {
          teams = teamData;
          prevAlive = Object.fromEntries(teamData.map(t => [t.sr_no, t.alive]));
        }
      }
      const aliveCount = teams.filter(t => t.alive > 0).length;
      if (aliveCount > 0 && aliveCount <= 4 && (prevAliveCount > 4 || prevAliveCount === 0)) {
        showSlideDown = true;
        setTimeout(() => {
          showSlideDown = false;
          render();
        }, 500);
      }
      prevAliveCount = aliveCount;
      render();
    })
    .catch(err => {
      // Optionally show error
    });
}
document.addEventListener('DOMContentLoaded', function() {
  fetchData();
  setInterval(fetchData, 2000);
}); 