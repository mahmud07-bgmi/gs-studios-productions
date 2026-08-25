google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(init);

const sheetId = '1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8';
const gid = '1932659852'; // overall_result tab
const refreshEvery = 2000;

let currentShowState = false;
let lastDataHash = '';

function init() {
  updateData();
  setInterval(updateData, refreshEvery);
}

function updateData() {
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&headers=1&tq=SELECT%20*`;
  const script = document.createElement('script');
  script.src = url;

  const originalSetResponse = window.google?.visualization?.Query?.setResponse;

  window.google = window.google || {};
  window.google.visualization = window.google.visualization || {};
  window.google.visualization.Query = window.google.visualization.Query || {};

  window.google.visualization.Query.setResponse = function(response) {
    try {
      if (!response.table || !response.table.rows) {
        throw new Error('Invalid response format');
      }

      const rows = response.table.rows
        .map(row => ({
          sr_no: +(row.c[0]?.v) || 0,
          team_name: row.c[1]?.v || '',
          team_logo: row.c[2]?.v || '',
          wwcd: row.c[3]?.v !== null && row.c[3]?.v !== undefined ? row.c[3].v : 0,
          position_points: +(row.c[4]?.v) || 0,
          finish_points: +(row.c[5]?.v) || 0,
          total_points: +(row.c[6]?.v) || 0,
          show_result: row.c[7]?.v || false
        }))
        .filter(team => team.team_name);

      const shouldShowResults =
        rows.length > 0 &&
        (rows[0].show_result === true ||
         rows[0].show_result === 'TRUE' ||
         rows[0].show_result === 'true');

      if (shouldShowResults) {
        rows.sort((a, b) =>
          b.total_points - a.total_points ||
          b.wwcd - a.wwcd ||
          b.position_points - a.position_points ||
          b.finish_points - a.finish_points
        );

        const dataHash = JSON.stringify(rows.map(r => ({
          team_name: r.team_name,
          team_logo: r.team_logo,
          wwcd: r.wwcd,
          position_points: r.position_points,
          finish_points: r.finish_points,
          total_points: r.total_points
        })));

        const firstTeam = rows[0] || null;
        const leftTeams = rows.slice(1, 6);
        const rightTeams = rows.slice(6, 16);

        const isFirstShow = !currentShowState;
        const dataChanged = dataHash !== lastDataHash;

        if (isFirstShow) {
          renderFirstPlace(firstTeam);
          renderTable('table-left', leftTeams, 2);
          renderTable('table-right', rightTeams, 7);
          lastDataHash = dataHash;
          showTablesWithAnimation();
          currentShowState = true;
        } else if (dataChanged) {
          renderFirstPlace(firstTeam);
          renderTable('table-left', leftTeams, 2);
          renderTable('table-right', rightTeams, 7);
          lastDataHash = dataHash;
          updateTablesWithoutAnimation();
        }
      } else {
        if (currentShowState) {
          hideTablesWithAnimation();
          currentShowState = false;
          lastDataHash = '';
        }
      }
    } catch (error) {
      console.error('Error processing data:', error);
    }

    if (script.parentNode) {
      document.head.removeChild(script);
    }

    if (originalSetResponse) {
      window.google.visualization.Query.setResponse = originalSetResponse;
    }
  };

  script.onerror = function() {
    console.error('Error loading Google Sheets data');
    if (script.parentNode) {
      document.head.removeChild(script);
    }
  };

  document.head.appendChild(script);
}

function renderFirstPlace(team) {
  if (!team) return;

  const firstPlaceBlock = document.getElementById('first-place-block');
  const firstLogo = document.getElementById('first-logo');
  const firstTeamName = document.getElementById('first-team-name');
  const firstWwcd = document.getElementById('first-wwcd');
  const firstPp = document.getElementById('first-pp');
  const firstFp = document.getElementById('first-fp');
  const firstTp = document.getElementById('first-tp');

  if (firstLogo) {
    firstLogo.src = team.team_logo || '';
    firstLogo.alt = team.team_name || '';
  }

  if (firstTeamName) firstTeamName.textContent = team.team_name || 'TEAM NAME';
  if (firstWwcd) firstWwcd.textContent = team.wwcd || 0;
  if (firstPp) firstPp.textContent = team.position_points || 0;
  if (firstFp) firstFp.textContent = team.finish_points || 0;
  if (firstTp) firstTp.textContent = team.total_points || 0;

  if (firstPlaceBlock) firstPlaceBlock.style.display = 'block';
}

function renderTable(tableId, teams, startRank) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;

  tbody.innerHTML = teams.map((team, index) => {
    const rank = startRank + index;

    let wwcdDisplay = '0';
    const wwcdValue = team.wwcd;

    if (wwcdValue && (wwcdValue > 0 || wwcdValue === '1' || wwcdValue === 1)) {
      wwcdDisplay = `<img src="https://i.postimg.cc/KjWwwpvc/Chat-GPT-Image-Aug-23-2026-07-26-43-PM.png" class="wwcd-icon"> x${wwcdValue}`;
    }

    return `
      <tr>
        <td class="rank">${rank}</td>
        <td>
          <div class="team-cell">
            <img src="${team.team_logo || ''}" alt="${team.team_name || ''}" onerror="this.style.display='none'">
            <span>${team.team_name || ''}</span>
          </div>
        </td>
        <td>${wwcdDisplay}</td>
        <td>${team.position_points || 0}</td>
        <td>${team.finish_points || 0}</td>
        <td class="total-points">${team.total_points || 0}</td>
      </tr>
    `;
  }).join('');
}

function updateTablesWithoutAnimation() {
  const firstPlaceBlock = document.getElementById('first-place-block');
  const secondBlock = document.querySelector('.second-block');
  const thirdBlock = document.querySelector('.third-block');
  const leftTable = document.getElementById('table-left');
  const rightTable = document.getElementById('table-right');

  if (firstPlaceBlock) {
    firstPlaceBlock.style.opacity = '1';
    firstPlaceBlock.style.transform = 'translateY(0)';
    firstPlaceBlock.classList.add('show');
  }

  if (secondBlock) {
    secondBlock.style.opacity = '1';
    secondBlock.style.transform = 'translateY(0)';
    secondBlock.classList.add('show');
  }

  if (thirdBlock) {
    thirdBlock.style.opacity = '1';
    thirdBlock.style.transform = 'translateY(0)';
    thirdBlock.classList.add('show');
  }

  if (leftTable) {
    leftTable.style.opacity = '1';
    leftTable.style.transform = 'translateY(0)';
  }

  if (rightTable) {
    rightTable.style.opacity = '1';
    rightTable.style.transform = 'translateY(0)';
  }

  document.querySelectorAll('#table-left tbody tr, #table-right tbody tr').forEach(row => {
    row.style.opacity = '1';
    row.style.transform = 'translateX(0)';
  });
}

function showTablesWithAnimation() {
  const firstPlaceBlock = document.getElementById('first-place-block');
  const secondBlock = document.querySelector('.second-block');
  const thirdBlock = document.querySelector('.third-block');

  if (firstPlaceBlock) {
    firstPlaceBlock.style.opacity = '0';
    firstPlaceBlock.style.transform = 'translateY(-30px)';
  }

  if (secondBlock) {
    secondBlock.style.opacity = '0';
    secondBlock.style.transform = 'translateY(50px)';
  }

  if (thirdBlock) {
    thirdBlock.style.opacity = '0';
    thirdBlock.style.transform = 'translateY(50px)';
  }

  setTimeout(() => {
    if (firstPlaceBlock) firstPlaceBlock.classList.add('show');

    setTimeout(() => {
      if (secondBlock) secondBlock.classList.add('show');

      setTimeout(() => {
        if (thirdBlock) thirdBlock.classList.add('show');
        setTimeout(() => animateTeamsOneByOne(), 400);
      }, 300);
    }, 300);
  }, 100);
}

function animateTeamsOneByOne() {
  const rows = document.querySelectorAll('#table-left tbody tr, #table-right tbody tr');

  rows.forEach(row => {
    row.style.opacity = '0';
    row.style.transform = 'translateX(-30px)';
    row.style.transition = 'all 0.4s ease-out';
  });

  rows.forEach((row, index) => {
    setTimeout(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateX(0)';
    }, index * 120);
  });
}

function hideTablesWithAnimation() {
  const firstPlaceBlock = document.getElementById('first-place-block');
  const secondBlock = document.querySelector('.second-block');
  const thirdBlock = document.querySelector('.third-block');
  const leftTable = document.getElementById('table-left');
  const rightTable = document.getElementById('table-right');

  if (leftTable) {
    leftTable.style.opacity = '0';
    leftTable.style.transform = 'translateY(-30px)';
  }

  if (rightTable) {
    rightTable.style.opacity = '0';
    rightTable.style.transform = 'translateY(-30px)';
  }

  setTimeout(() => {
    if (secondBlock) secondBlock.classList.remove('show');
    if (thirdBlock) thirdBlock.classList.remove('show');
    if (firstPlaceBlock) {
      firstPlaceBlock.classList.remove('show');
      firstPlaceBlock.style.display = 'none';
    }
  }, 200);
}
