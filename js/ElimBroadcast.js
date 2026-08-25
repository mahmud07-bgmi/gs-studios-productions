const SHEET_URL = "https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/";

// Convert sheet URL to JSON API
function getGvizUrl(sheetUrl) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json`;
}

// Parse Google response
function parseGvizTable(json) {
  const headers = json.table.cols.map(col => col.label);
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ""))
  );
  return { headers, rows };
}

let prevAlive = {};
let queue = [];
let running = false;

// Create card
function showCard(data) {
  const container = document.getElementById("elim-card-container");

  if (!data) {
    container.innerHTML = "";
    return;
  }

  container.innerHTML = `
<div id="elim-card" class="elim-card">

  <div class="logo-side">
    <img src="${data.logo}" class="team-logo"
         onerror="this.style.display='none'">
  </div>

  <div class="info-side">
    <div class="eliminated-text">ELIMINATED</div>

    <div class="team-name">
      ${data.name}
    </div>

    <div class="team-finishes">
      FINISHES: ${data.finishes}
    </div>
  </div>

</div>
`;
}

// Play animation
async function play(data) {
  showCard(data);

  // Card visible time
  await new Promise(r => setTimeout(r, 2900));

  const card = document.getElementById("elim-card");

  if (card) {
    card.classList.add("exit")
  }

  // Exit animation complete hone ka wait
  await new Promise(r => setTimeout(r, 1100));

  showCard(null);
}
// Queue system
async function processQueue() {
  if (running) return;

  running = true;

  while (queue.length > 0) {
    const team = queue.shift();
    await play(team);

    if (queue.length > 0) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  running = false;
}

// Fetch data from sheet
function fetchData() {
  const url = getGvizUrl(SHEET_URL);

  fetch(url)
    .then(res => res.text())
    .then(text => {
      const json = JSON.parse(
        text.substring(text.indexOf("{"), text.lastIndexOf("}") + 1)
      );

      const table = parseGvizTable(json);

      const idx = key =>
        table.headers.findIndex(
          h => h.toLowerCase().replace(/\s/g, "_") === key
        );

      const nameIdx = idx("team_name");
      const logoIdx = idx("team_logo");
      const aliveIdx = idx("players_alive");
      const finishIdx = idx("finish_points");

      table.rows.forEach(row => {
        const name = row[nameIdx];
        const logo = row[logoIdx];
        const alive = parseInt(row[aliveIdx]) || 0;
        const finishes = row[finishIdx] || 0;

        if (prevAlive[name] > 0 && alive === 0) {
          queue.push({
            name: name,
            logo: logo,
            finishes: finishes
          });
        }

        prevAlive[name] = alive;
      });

      processQueue();
    })
    .catch(err => {
      console.log("Sheet error:", err);
    });
}

// Initial fetch
fetchData();

// Refresh every 1 second
setInterval(fetchData, 1000);
