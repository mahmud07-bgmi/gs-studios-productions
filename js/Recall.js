const SHEET_ID = "1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8";
const SHEET_NAME = "alive_status";
const REFRESH_MS = 1200;
const AUTO_HIDE_MS = 4200;
const EXIT_MS = 500;

const JSON_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;

const overlay = document.getElementById("recallOverlay");
const teamLogo = document.getElementById("teamLogo");
const teamName = document.getElementById("teamName");
const recallCount = document.getElementById("recallCount");

let previousAliveMap = {};
let queue = [];
let isShowing = false;
let hideTimer = null;
let exitTimer = null;

function safeText(value) {
  return (value ?? "").toString().trim();
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function normalizeHeader(value) {
  return safeText(value).toLowerCase().replace(/\s+/g, "_");
}

function parseGViz(text) {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < start) throw new Error("Invalid Google GViz response");

  const json = JSON.parse(text.slice(start, end + 1));
  const cols = (json.table?.cols || []).map(col =>
    normalizeHeader(col.label || col.id)
  );

  return (json.table?.rows || []).map(row => {
    const obj = {};
    cols.forEach((key, i) => {
      const cell = row.c?.[i];
      obj[key] = cell ? cell.v : "";
    });
    return obj;
  });
}

function getTeamKey(row, index) {
  return (
    safeText(row.sr_no) ||
    safeText(row.team_initial) ||
    safeText(row.team_name) ||
    `row_${index}`
  );
}

function enqueueRecall(data) {
  if (queue.some(item => item.eventKey === data.eventKey)) return;

  if (isShowing) {
    queue.push(data);
  } else {
    showRecall(data);
  }
}

function showRecall(data) {
  isShowing = true;

  teamName.textContent = data.teamName || data.teamInitial || "TEAM";
  recallCount.textContent = data.recalled;
  teamLogo.src = data.teamLogo || "";

  clearTimeout(hideTimer);
  clearTimeout(exitTimer);

  overlay.classList.remove("hide", "show");
  void overlay.offsetWidth;
  overlay.classList.add("show");

  hideTimer = setTimeout(() => {
    overlay.classList.remove("show");
    overlay.classList.add("hide");

    exitTimer = setTimeout(() => {
      overlay.classList.remove("hide");
      isShowing = false;

      if (queue.length) {
        showRecall(queue.shift());
      }
    }, EXIT_MS);
  }, AUTO_HIDE_MS);
}

async function fetchSheet() {
  try {
    const response = await fetch(JSON_URL, { cache: "no-store" });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const text = await response.text();
    const rows = parseGViz(text);
    const currentAliveMap = {};

    rows.forEach((row, index) => {
      const teamKey = getTeamKey(row, index);
      if (!teamKey) return;

      const currentAlive = Math.max(
        0,
        Math.min(4, Math.trunc(toNumber(row.players_alive)))
      );

      const teamNameValue = safeText(row.team_name);
      const teamInitial = safeText(row.team_initial);
      const teamLogoValue = safeText(row.team_logo);

      currentAliveMap[teamKey] = {
        alive: currentAlive,
        teamName: teamNameValue,
        teamInitial,
        teamLogo: teamLogoValue
      };

      const previous = previousAliveMap[teamKey];

      // First read only establishes the baseline. Never trigger from initial data.
      if (!previous) return;

      // 0 -> anything is NOT a recall event.
      if (previous.alive <= 0) return;

      const recalled = currentAlive - previous.alive;

      // Only increases are valid, and the overlay supports ONLY 1, 2 or 3.
      if (recalled < 1 || recalled > 3) return;

      const eventKey = `${teamKey}_${previous.alive}_${currentAlive}`;

      enqueueRecall({
        eventKey,
        teamName: teamNameValue,
        teamInitial,
        teamLogo: teamLogoValue,
        recalled
      });
    });

    previousAliveMap = currentAliveMap;
  } catch (error) {
    console.error("Recall sheet fetch error:", error);
  }
}

fetchSheet();
setInterval(fetchSheet, REFRESH_MS);
