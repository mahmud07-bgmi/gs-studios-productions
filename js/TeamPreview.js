// CONFIG: Set your Google Sheet URL here (published to web, not private)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';

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

function renderTeams(table) {
  // Get column indices for team_name and team_logo
  const idx = key => table.headers.findIndex(h => h.toLowerCase().replace(/\s/g, '_') === key);
  const teamNameIdx = idx('team_name');
  const teamLogoIdx = idx('team_logo');
  
  // Check if required columns exist
  if (teamNameIdx === -1 || teamLogoIdx === -1) {
    console.error('Required columns not found. Expected: team_name, team_logo');
    document.getElementById('error').textContent = 'Required columns (team_name, team_logo) not found in spreadsheet';
    document.getElementById('error').style.display = '';
    document.getElementById('loading').style.display = 'none';
    return;
  }

  // Filter out rows with empty team names or logos
  const validTeams = table.rows.filter(row => {
    const teamName = row[teamNameIdx];
    const teamLogo = row[teamLogoIdx];
    return teamName && teamName.trim() !== '' && teamLogo && teamLogo.trim() !== '';
  });

  if (validTeams.length === 0) {
    document.getElementById('nodata').style.display = '';
    document.getElementById('teams-container').style.display = 'none';
    return;
  }

  // Build teams HTML
  let html = '';
  validTeams.forEach((row, index) => {
    const teamName = row[teamNameIdx];
    const teamLogo = row[teamLogoIdx];
    
    html += `
      <div class="team-card" style="animation-delay: ${(index + 1) * 0.1}s;">
        <img src="${teamLogo}" alt="${teamName} logo" class="team-logo" onerror="this.style.display='none'">
        <div class="team-name">${teamName}</div>
      </div>
    `;
  });
// Update the DOM and set appropriate grid class
const teamsGrid = document.getElementById('teams-grid');
teamsGrid.innerHTML = html;

// Remove existing team count classes
teamsGrid.className = 'teams-grid';

// Add appropriate class based on team count for optimal layout
const teamCount = validTeams.length;
if (teamCount <= 16) {
  teamsGrid.classList.add(`teams-${teamCount}`);
} else {
  // For more than 16 teams, use a 4-column layout
  teamsGrid.classList.add('teams-16');
}

document.getElementById('error').style.display = 'none';
document.getElementById('nodata').style.display = 'none';
document.getElementById('teams-container').style.display = '';
}

function showError(message) {
  document.getElementById('error').style.display = '';
  document.getElementById('error').textContent = message;
  document.getElementById('teams-container').style.display = 'none';
  document.getElementById('nodata').style.display = 'none';
}

// Main logic
const gvizUrl = getGvizUrl(SHEET_URL);
let lastTable = { headers: [], rows: [] };

function fetchTeamData() {
  if (!gvizUrl) {
    showError('Invalid Google Sheets URL');
    return;
  }

  fetch(gvizUrl)
    .then(res => {
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      return res.text();
    })
    .then(text => {
      // Parse the JSONP response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      
      if (jsonStart === -1 || jsonEnd === 0) {
        throw new Error('Invalid response format');
      }
      
      const jsonStr = text.substring(jsonStart, jsonEnd);
      const json = JSON.parse(jsonStr);
      
      lastTable = parseGvizTable(json);
      
      if (!lastTable.headers.length || !lastTable.rows.length) {
        document.getElementById('nodata').style.display = '';
        document.getElementById('teams-container').style.display = 'none';
        return;
      }
      
      renderTeams(lastTable);
    })
    .catch(err => {
      console.error('Error fetching team data:', err);
      showError('Failed to load team data. Please check the spreadsheet URL and permissions.');
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', function() {
  // Start fetching data
  fetchTeamData();
  
  // Refresh data every 30 seconds (less frequent than AliveStatus since team data changes less often)
  setInterval(fetchTeamData, 30000);
});

// Handle video loading
document.addEventListener('DOMContentLoaded', function() {
  const video = document.getElementById('background-video');
  
  video.addEventListener('loadeddata', function() {
    console.log('Background video loaded successfully');
  });
  
  video.addEventListener('error', function(e) {
    console.error('Error loading background video:', e);
    // Fallback: set a dark background if video fails to load
    document.body.style.background = 'linear-gradient(135deg, #181a23 0%, #2d1b69 100%)';
  });
});