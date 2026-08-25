const API_URL = "https://script.google.com/macros/s/AKfycbxEv6klLXzCTBY9QDtO0HaVQTePioPzJVNnDaehogrojk-6mC6Hi6riGj5TNcTjiBm0Zw/exec";

const SHEET_ID = "1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8";

const TEAMS_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=Teams&tqx=out:json`;

const bgImg = document.getElementById("bgImg");
const teamLogo = document.getElementById("teamLogo");
const teamName = document.getElementById("teamName");
const topLogo = document.getElementById("topLogo");

function safeValue(cell) {
  return cell && cell.v !== null && cell.v !== undefined ? cell.v : "";
}

function textValue(cell) {
  return String(safeValue(cell)).trim();
}

function numberValue(cell, fallback = 0) {
  const n = Number(safeValue(cell));
  return Number.isFinite(n) ? n : fallback;
}

function parseGViz(text) {
  return JSON.parse(text.substring(47).slice(0, -2));
}

function getBgBySlot(slot) {
  return `assets/${slot}.png`;
}

async function getSelectedSlot() {
  try {
    const res = await fetch(API_URL + "?action=get", { cache: "no-store" });
    const data = await res.json();
    return Number(data.selectedSlot) || 1;
  } catch {
    return 1;
  }
}

async function init() {
  const selectedSlot = await getSelectedSlot();

  try {
    bgImg.src = getBgBySlot(selectedSlot);

    const res = await fetch(TEAMS_URL, { cache: "no-store" });
    const text = await res.text();
    const json = parseGViz(text);
    const teams = json.table.rows || [];

    const selectedTeam = teams.find(
      row => numberValue(row.c[0], 0) === selectedSlot
    );

    if (selectedTeam) {
      const name = textValue(selectedTeam.c[2]);
      const logo = textValue(selectedTeam.c[3]);

      teamName.textContent = name || `SLOT ${selectedSlot}`;

      if (logo) {
        teamLogo.src = logo;
        topLogo.src = logo;

        teamLogo.style.display = "block";
        topLogo.style.display = "block";
      } else {
        teamLogo.style.display = "none";
        topLogo.style.display = "none";
      }
    }

  } catch (err) {
    console.error(err);
    teamName.textContent = "LOAD ERROR";
  }
}

init();
setInterval(init, 500);
