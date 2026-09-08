const SHEET_ID = "1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8";
const SHEET_NAME = "alive_status";
const REFRESH_MS = 1200;
const TRIGGER_FINISHES = 10;
const AUTO_HIDE_MS = 4200;

const JSON_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=${encodeURIComponent(SHEET_NAME)}&tqx=out:json`;

const overlay = document.getElementById("dominationOverlay");
const teamLogo = document.getElementById("teamLogo");
const finishNumber = document.getElementById("finishNumber");
const teamName = document.getElementById("teamName");
const tagText = document.getElementById("tagText");

let previousScores = {};
let shownKeys = new Set();
let queue = [];
let isShowing = false;
let hideTimer = null;

function safeText(value) {
  return (value ?? "").toString().trim();
}

function toNumber(value) {
  const num = Number(value);
  return Number.isNaN(num) ? 0 : num;
}

function parseGViz(text) {
  const json = JSON.parse(text.substring(47).slice(0, -2));
  const cols = json.table.cols.map(col => col.label || col.id);

  return json.table.rows.map(row => {
    const obj = {};

    row.c.forEach((cell, i) => {
      obj[cols[i]] = cell ? cell.v : "";
    });

    return obj;
  });
}

/*
  TIER RULES:
  10–14  = DOMINATION
  15–19  = RAMPAGE
  20+    = UNSTOPPABLE
*/
function getTag(finishes) {
  if (finishes >= 20) return "UNSTOPPABLE";
  if (finishes >= 15) return "RAMPAGE";
  if (finishes >= 10) return "DOMINATION";
  return "";
}

function getTier(finishes) {
  if (finishes >= 20) return "unstoppable";
  if (finishes >= 15) return "rampage";
  if (finishes >= 10) return "domination";
  return null;
}

function showOverlay(data) {
  isShowing = true;

  finishNumber.textContent = data.finish_points;
  teamName.textContent = data.team_display_name;
  tagText.textContent = getTag(data.finish_points);

  if (data.team_logo) {
    teamLogo.src = data.team_logo;
  } else {
    teamLogo.src = "";
  }

  overlay.classList.remove("hide");
  overlay.classList.remove("show");

  // Restart animation cleanly
  void overlay.offsetWidth;

  overlay.classList.add("show");

  clearTimeout(hideTimer);

  hideTimer = setTimeout(() => {
    overlay.classList.remove("show");
    overlay.classList.add("hide");

    setTimeout(() => {
      isShowing = false;

      if (queue.length > 0) {
        const next = queue.shift();
        showOverlay(next);
      }
    }, 700);
  }, AUTO_HIDE_MS);
}

function enqueuePopup(data) {
  const alreadyQueued = queue.some(
    item => item.unique_key === data.unique_key
  );

  if (alreadyQueued) return;

  if (isShowing) {
    queue.push(data);
  } else {
    showOverlay(data);
  }
}

async function fetchSheet() {
  try {
    const response = await fetch(JSON_URL);
    const text = await response.text();
    const rows = parseGViz(text);

    const currentScores = {};

    rows.forEach((row, index) => {
      const fullName = safeText(row.team_name);
      const shortName = safeText(row.team_initial);
      const logo = safeText(row.team_logo);
      const finishes = toNumber(row.finish_points);

      if (!fullName && !shortName) return;

      const teamKey =
        shortName || fullName || `row_${index}`;

      currentScores[teamKey] = finishes;

      const previous = previousScores[teamKey] ?? 0;

      /*
        Only trigger when entering a NEW tier.

        DOMINATION:
        First time team reaches 10–14.
        It will NOT trigger again at 11, 12, 13 or 14.

        RAMPAGE:
        First time team reaches 15–19.
        It will NOT trigger again at 16, 17, 18 or 19.

        UNSTOPPABLE:
        First time team reaches 20+.
        It will NOT trigger again at 21, 22, 23 etc.
      */

      const currentTier = getTier(finishes);
      const previousTier = getTier(previous);

      if (!currentTier) return;

      // Only trigger when the team moves into a new tier.
      if (currentTier === previousTier) return;

      /*
        Unique key contains the team + tier.
        Therefore each tier can only be shown once.
      */
      const uniqueKey = `${teamKey}_${currentTier}`;

      if (shownKeys.has(uniqueKey)) return;

      shownKeys.add(uniqueKey);

      enqueuePopup({
        unique_key: uniqueKey,
        team_display_name: fullName,
        team_logo: logo,
        finish_points: finishes
      });
    });

    previousScores = currentScores;

  } catch (error) {
    console.error("Sheet fetch error:", error);
  }
}

fetchSheet();
setInterval(fetchSheet, REFRESH_MS);
