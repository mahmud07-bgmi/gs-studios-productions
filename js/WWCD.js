google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(init);

const sheetId = '1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8';
const gid = '1956336669';
const refreshEvery = 2000;

let currentDataHash = '';

function init() {
  updateData();
  setInterval(updateData, refreshEvery);
}

function updateData() {

  const url =
    `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&headers=1&tq=SELECT%20*`;

  const script = document.createElement('script');
  script.src = url;

  const originalSetResponse =
    window.google?.visualization?.Query?.setResponse;

  window.google = window.google || {};
  window.google.visualization =
    window.google.visualization || {};
  window.google.visualization.Query =
    window.google.visualization.Query || {};

  window.google.visualization.Query.setResponse =
    function(response) {

      try {

        if (
          response.table &&
          response.table.rows &&
          response.table.rows.length > 0
        ) {

          const row = response.table.rows[0];

          const wwcdData = {

            team_name: row.c[0]?.v || '',
            team_logo: row.c[1]?.v || '',

            p1_name: row.c[2]?.v || '',
            p1_kill: Number(row.c[3]?.v || 0),

            p2_name: row.c[4]?.v || '',
            p2_kill: Number(row.c[5]?.v || 0),

            p3_name: row.c[6]?.v || '',
            p3_kill: Number(row.c[7]?.v || 0),

            p4_name: row.c[8]?.v || '',
            p4_kill: Number(row.c[9]?.v || 0)

          };

          const dataHash =
            JSON.stringify(wwcdData);

          if (dataHash !== currentDataHash) {

            updateWWCDDisplay(wwcdData);

            currentDataHash = dataHash;
          }

        } else {

          clearWWCDDisplay();

        }

      } catch (error) {

        console.error(error);

      }

      if (script.parentNode) {
        document.head.removeChild(script);
      }

      if (originalSetResponse) {

        window.google.visualization
          .Query.setResponse =
            originalSetResponse;
      }
    };

  document.head.appendChild(script);
}

function updateWWCDDisplay(data) {

  const totalFinish =
  data.p1_kill +
  data.p2_kill +
  data.p3_kill +
  data.p4_kill;

const totalPoints = totalFinish + 10;

  // TEAM

  document.getElementById('team-logo').src =
    data.team_logo;

  document.getElementById('team-finishes').textContent =
    totalFinish;

  document.getElementById('team-total').textContent =
  totalPoints;

  // PLAYER 1

  document.getElementById('p1-name').textContent =
    data.p1_name;

  document.getElementById('p1-kills').textContent =
    data.p1_kill;

  document.getElementById('p1-contri').textContent =
    totalFinish
      ? ((data.p1_kill / totalFinish) * 100)
          .toFixed(1) + '%'
      : '0%';

  // PLAYER 2

  document.getElementById('p2-name').textContent =
    data.p2_name;

  document.getElementById('p2-kills').textContent =
    data.p2_kill;

  document.getElementById('p2-contri').textContent =
    totalFinish
      ? ((data.p2_kill / totalFinish) * 100)
          .toFixed(1) + '%'
      : '0%';

  // PLAYER 3

  document.getElementById('p3-name').textContent =
    data.p3_name;

  document.getElementById('p3-kills').textContent =
    data.p3_kill;

  document.getElementById('p3-contri').textContent =
    totalFinish
      ? ((data.p3_kill / totalFinish) * 100)
          .toFixed(1) + '%'
      : '0%';

  // PLAYER 4

  document.getElementById('p4-name').textContent =
    data.p4_name;

  document.getElementById('p4-kills').textContent =
    data.p4_kill;

  document.getElementById('p4-contri').textContent =
    totalFinish
      ? ((data.p4_kill / totalFinish) * 100)
          .toFixed(1) + '%'
      : '0%';

  animateCards();
}

function clearWWCDDisplay() {

  document.getElementById('team-finishes').textContent = '0';
  document.getElementById('team-total').textContent = '0';

  ['1','2','3','4'].forEach(i => {

    document.getElementById(`p${i}-name`).textContent =
      `PLAYER ${i}`;

    document.getElementById(`p${i}-kills`).textContent =
      '0';

    document.getElementById(`p${i}-contri`).textContent =
      '0%';
  });
}

function animateCards() {

  const cards =
    document.querySelectorAll('.stat-card');

  cards.forEach(card => {

    card.style.transform = 'scale(1.03)';
    card.style.transition = '.25s';

    setTimeout(() => {

      card.style.transform = 'scale(1)';

    }, 250);

  });
}