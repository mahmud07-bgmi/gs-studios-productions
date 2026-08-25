const SHEET_ID = "1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8";

const API_URL = "https://script.google.com/macros/s/AKfycbxEv6klLXzCTBY9QDtO0HaVQTePioPzJVNnDaehogrojk-6mC6Hi6riGj5TNcTjiBm0Zw/exec";

const TEAMS_URL =
  `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?sheet=Teams&tqx=out:json`;

const teamGrid = document.getElementById("teamGrid");
const selectedSlotText = document.getElementById("selectedSlotText");

let selectedSlot = null;
let currentRows = [];

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

async function saveOverlayState(slot) {
  await fetch(`${API_URL}?action=set&slot=${slot}`, {
    cache: "no-store"
  });
}

async function loadOverlayState() {
  try {
    const res = await fetch(`${API_URL}?action=get`, {
      cache: "no-store"
    });
    const data = await res.json();
    selectedSlot = Number(data.selectedSlot) || null;
  } catch {
    selectedSlot = null;
  }
}

async function loadTeams() {
  const res = await fetch(TEAMS_URL, { cache: "no-store" });
  const text = await res.text();
  const json = parseGViz(text);
  return json.table.rows || [];
}

function updateStatus() {
  selectedSlotText.textContent = selectedSlot ?? "-";
}

function renderCards(rows) {
  teamGrid.innerHTML = "";

  rows.forEach((row) => {
    const slot = numberValue(row.c[0], 0);
    const name = textValue(row.c[1]);
    const logo = textValue(row.c[3]);

    if (!slot) return;

    const card = document.createElement("div");
    card.className = "team-card" + (slot === selectedSlot ? " active" : "");

    card.innerHTML = `
      <div class="slot-label">SLOT ${slot}</div>
      <img class="card-logo" src="${logo}" alt="">
      <div class="card-name">${name || `SLOT ${slot}`}</div>
    `;

    card.addEventListener("click", async () => {
      selectedSlot = slot;
      updateStatus();
      renderCards(currentRows);

      await saveOverlayState(slot);
    });

    teamGrid.appendChild(card);
  });
}

(async function init() {
  await loadOverlayState();
  currentRows = await loadTeams();
  renderCards(currentRows);
  updateStatus();
})();
