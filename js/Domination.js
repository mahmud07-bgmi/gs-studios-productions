const SHEET_ID = "1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8";
const SHEET_NAME = "alive_status"; // apne sheet tab ka exact name rakho
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

function getTag(finishes) {
  if (finishes >= 20) return "GODLIKE";
  if (finishes >= 15) return "RAMPAGE";
  return "DOMINATION";
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
  const alreadyQueued = queue.some(item => item.unique_key === data.unique_key);
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

      const teamKey = shortName || fullName || `row_${index}`;
      currentScores[teamKey] = finishes;

      const previous = previousScores[teamKey] ?? 0;

      // trigger only when crossing 10+
      if (previous < TRIGGER_FINISHES && finishes >= TRIGGER_FINISHES) {
        const uniqueKey = `${teamKey}_${TRIGGER_FINISHES}`;

        if (!shownKeys.has(uniqueKey)) {
          shownKeys.add(uniqueKey);

          enqueuePopup({
            unique_key: uniqueKey,
            team_display_name: fullName,
            team_logo: logo,
            finish_points: finishes
          });
        }
      }
    });

    previousScores = currentScores;
  } catch (error) {
    console.error("Sheet fetch error:", error);
  }
}

fetchSheet();
setInterval(fetchSheet, REFRESH_MS);
