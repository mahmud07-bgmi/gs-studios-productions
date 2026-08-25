google.charts.load('current', { packages: ['corechart'] });
google.charts.setOnLoadCallback(init);

const sheetId = '1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8';
const gid = '992722997';
const refreshEvery = 2000; // 2 seconds

let currentShowState = false; // Track current visibility state
let lastDataHash = ''; // Track if data actually changed

function init() {
  updateData();
  setInterval(updateData, refreshEvery);
}

function updateData() {
  // Use a simpler approach with direct URL construction
  const url = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?gid=${gid}&headers=1&tq=SELECT%20*`;
  
  // Create script element for JSONP request
  const script = document.createElement('script');
  script.src = url;
  
  // Override the default google.visualization.Query.setResponse function
  const originalSetResponse = window.google?.visualization?.Query?.setResponse;
  
  window.google = window.google || {};
  window.google.visualization = window.google.visualization || {};
  window.google.visualization.Query = window.google.visualization.Query || {};
  
  window.google.visualization.Query.setResponse = function(response) {
    try {
      if (response.table && response.table.rows) {
        console.log('Raw response:', response.table);
        
        const rows = response.table.rows.map((row, index) => {
          console.log(`Row ${index}:`, row.c);
          
          return {
            sr_no: row.c[0]?.v || 0,
            team_name: row.c[1]?.v || '',
            team_logo: row.c[2]?.v || '',
            wwcd: row.c[3]?.v !== null && row.c[3]?.v !== undefined ? row.c[3].v : 0,
            position_points: +(row.c[4]?.v) || 0,
            finish_points: +(row.c[5]?.v) || 0,
            total_points: +(row.c[6]?.v) || 0,
            show_result: row.c[7]?.v || false
          };
        });

        // Check if we should show results (use first row's show_result value)
        const shouldShowResults = rows.length > 0 && (rows[0].show_result === true || rows[0].show_result === 'TRUE' || rows[0].show_result === 'true');
        
        console.log('Show results:', shouldShowResults);

        if (shouldShowResults) {
          // Sort by: 1) Total Points, 2) WWCD, 3) Position Points, 4) Finish Points (all high to low)
          rows.sort((a, b) =>
            b.total_points - a.total_points ||
            b.wwcd - a.wwcd ||
            b.position_points - a.position_points ||
            b.finish_points - a.finish_points
          );

          // Create a hash of the data to check if it actually changed
          const dataHash = JSON.stringify(rows.map(r => ({
            team_name: r.team_name,
            total_points: r.total_points,
            wwcd: r.wwcd,
            position_points: r.position_points,
            finish_points: r.finish_points
          })));

          // Split data: #1 separate, #2-6 left table, #7-16 right table
          const firstTeam = rows[0];              // Team #1
          const leftTeams = rows.slice(1, 6);     // Teams #2-6
          const rightTeams = rows.slice(6, 16);   // Teams #7-16

          // Check if this is first time showing or data changed
          const isFirstShow = !currentShowState;
          const dataChanged = dataHash !== lastDataHash;

          // Only render and animate if data changed or first time showing
          if (isFirstShow) {
            renderFirstPlace(firstTeam);
            renderTable('table-left', leftTeams, 1);    // Start rank at 2
            renderTable('table-right', rightTeams, 6);  // Start rank at 7
            lastDataHash = dataHash;
            showTablesWithAnimation();
            currentShowState = true;
          } else if (dataChanged) {
            renderFirstPlace(firstTeam);
            renderTable('table-left', leftTeams, 1);
            renderTable('table-right', rightTeams, 6);
            lastDataHash = dataHash;
            updateTablesWithoutAnimation();
          }
        } else {
          // Only hide if state changed from true/visible to false/hidden
          if (currentShowState) {
            hideTablesWithAnimation();
            currentShowState = false;
            lastDataHash = '';
          }
        }
      } else {
        throw new Error('Invalid response format');
      }
    } catch (error) {
      console.error('Error processing data:', error);
    }
    
    // Clean up
    if (script.parentNode) {
      document.head.removeChild(script);
    }
    
    // Restore original function if it existed
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
  
  // Add script to head to trigger the request
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
  
  // Update first place data
  if (firstLogo) firstLogo.src = team.team_logo;
  if (firstLogo) firstLogo.alt = team.team_name;
  if (firstTeamName) firstTeamName.textContent = team.team_name;
  
  // Handle WWCD display
  let wwcdDisplay = '0';
  const wwcdValue = team.wwcd;
  if (wwcdValue && (wwcdValue > 0 || wwcdValue === '1' || wwcdValue === 1)) {
    wwcdDisplay = `${wwcdValue}`;
  }
  
  if (firstWwcd) firstWwcd.textContent = wwcdDisplay;
  if (firstPp) firstPp.textContent = team.position_points || 0;
  if (firstFp) firstFp.textContent = team.finish_points || 0;
  if (firstTp) firstTp.textContent = team.total_points || 0;
  
  if (firstPlaceBlock) firstPlaceBlock.style.display = 'block';
}

function renderTable(tableId, teams, startRank) {
  const tbody = document.querySelector(`#${tableId} tbody`);
  if (!tbody) return;
  
  tbody.innerHTML = teams.map((team, index) => {
    const rank = startRank + index + 1;
    
    // Debug WWCD data
    console.log(`Team: ${team.team_name}, WWCD: ${team.wwcd}, Type: ${typeof team.wwcd}`);
    
    // Handle WWCD display - check for both number and string values
    let wwcdDisplay = '';
    const wwcdValue = team.wwcd;
    
    if (wwcdValue && (wwcdValue > 0 || wwcdValue === '1' || wwcdValue === 1)) {
      wwcdDisplay = `<img src="https://i.postimg.cc/Vk8P8fsK/1780418958189.png" class="wwcd-icon"> x${wwcdValue}`;
    } else if (wwcdValue === 0 || wwcdValue === '0' || !wwcdValue) {
      wwcdDisplay = '0';
    } else {
      wwcdDisplay = wwcdValue || '0';
    }
    
    return `
      <tr>
        <td class="rank">${rank}</td>
        <td>
          <div class="team-cell">
            <img src="${team.team_logo}" alt="${team.team_name}" onerror="this.style.display='none'">
            <span>${team.team_name}</span>
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
  
  // Ensure first place block is visible
  if (firstPlaceBlock) {
    firstPlaceBlock.style.opacity = '1';
    firstPlaceBlock.style.transform = 'translateY(0)';
    firstPlaceBlock.classList.add('show');
  }
  
  // Ensure elements are visible without animation
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
  
  // Ensure headers are visible
  if (leftTable && leftTable.querySelector('thead')) {
    leftTable.querySelector('thead').style.opacity = '1';
    leftTable.querySelector('thead').style.transform = 'translateY(0)';
  }
  
  if (rightTable && rightTable.querySelector('thead')) {
    rightTable.querySelector('thead').style.opacity = '1';
    rightTable.querySelector('thead').style.transform = 'translateY(0)';
  }
  
  // Ensure all team rows are visible
  const leftTableRows = document.querySelectorAll('#table-left tbody tr');
  const rightTableRows = document.querySelectorAll('#table-right tbody tr');
  
  if (leftTable && leftTable.querySelector('tbody')) {
    leftTable.querySelector('tbody').style.opacity = '1';
  }
  
  if (rightTable && rightTable.querySelector('tbody')) {
    rightTable.querySelector('tbody').style.opacity = '1';
  }
  
  [...leftTableRows, ...rightTableRows].forEach(row => {
    row.style.opacity = '1';
    row.style.transform = 'translateX(0)';
  });
}

function showTablesWithAnimation() {
  const firstPlaceBlock = document.getElementById('first-place-block');
  const secondBlock = document.querySelector('.second-block');
  const thirdBlock = document.querySelector('.third-block');
  const leftTable = document.getElementById('table-left');
  const rightTable = document.getElementById('table-right');
  
  // Hide all initially
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
  
  // Step 1: Show first place block
  setTimeout(() => {
    if (firstPlaceBlock) {
      firstPlaceBlock.classList.add('show');
    }
    
    // Step 2: Show second block (left table container)
    setTimeout(() => {
      if (secondBlock) {
        secondBlock.classList.add('show');
      }
      
      // Step 3: Show third block (right table container)
      setTimeout(() => {
        if (thirdBlock) {
          thirdBlock.classList.add('show');
        }
        
        // Step 4: Show table content after blocks
        setTimeout(() => {
          // Show left table
          if (leftTable) {
            leftTable.style.opacity = '0';
            if (leftTable.querySelector('thead')) {
              leftTable.querySelector('thead').style.opacity = '0';
              leftTable.querySelector('thead').style.transform = 'translateY(-20px)';
            }
            if (leftTable.querySelector('tbody')) {
              leftTable.querySelector('tbody').style.opacity = '0';
            }
            
            setTimeout(() => {
              leftTable.style.opacity = '1';
              leftTable.style.transform = 'translateY(0)';
              if (leftTable.querySelector('thead')) {
                leftTable.querySelector('thead').style.transition = 'all 0.6s ease-out';
                leftTable.querySelector('thead').style.opacity = '1';
                leftTable.querySelector('thead').style.transform = 'translateY(0)';
              }
            }, 100);
          }
          
          // Show right table
          setTimeout(() => {
            if (rightTable) {
              rightTable.style.opacity = '0';
              if (rightTable.querySelector('thead')) {
                rightTable.querySelector('thead').style.opacity = '0';
                rightTable.querySelector('thead').style.transform = 'translateY(-20px)';
              }
              if (rightTable.querySelector('tbody')) {
                rightTable.querySelector('tbody').style.opacity = '0';
              }
              
              setTimeout(() => {
                rightTable.style.opacity = '1';
                rightTable.style.transform = 'translateY(0)';
                if (rightTable.querySelector('thead')) {
                  rightTable.querySelector('thead').style.transition = 'all 0.6s ease-out';
                  rightTable.querySelector('thead').style.opacity = '1';
                  rightTable.querySelector('thead').style.transform = 'translateY(0)';
                }
              }, 100);
            }
          }, 300);
          
          // Show teams one by one after headers
          setTimeout(() => {
            animateTeamsOneByOne();
          }, 800);
          
        }, 500);
      }, 350);
    }, 350);
  }, 100);
}

function animateTeamsOneByOne() {
  const rightTableRows = document.querySelectorAll('#table-right tbody tr');
  const leftTableRows = document.querySelectorAll('#table-left tbody tr');
  
  // Hide all rows initially
  [...rightTableRows, ...leftTableRows].forEach(row => {
    row.style.opacity = '0';
    row.style.transform = 'translateX(-30px)';
    row.style.transition = 'all 0.4s ease-out';
  });
  
  // Show tbody containers
  document.querySelector('#table-right tbody').style.opacity = '1';
  document.querySelector('#table-left tbody').style.opacity = '1';
  
  // Animate left table rows first
  leftTableRows.forEach((row, index) => {
    setTimeout(() => {
      row.style.opacity = '1';
      row.style.transform = 'translateX(0)';
    }, index * 200);
  });
  
  // Then animate right table rows
  setTimeout(() => {
    rightTableRows.forEach((row, index) => {
      setTimeout(() => {
        row.style.opacity = '1';
        row.style.transform = 'translateX(0)';
      }, index * 200);
    });
  }, leftTableRows.length * 200);
}

function hideTablesWithAnimation() {
  const firstPlaceBlock = document.getElementById('first-place-block');
  const secondBlock = document.querySelector('.second-block');
  const thirdBlock = document.querySelector('.third-block');
  const leftTable = document.getElementById('table-left');
  const rightTable = document.getElementById('table-right');
  
  // Add transition for smooth hiding
  if (secondBlock) {
    secondBlock.style.transition = 'all 0.5s ease-in';
  }
  
  if (thirdBlock) {
    thirdBlock.style.transition = 'all 0.5s ease-in';
  }
  
  if (leftTable) {
    leftTable.style.transition = 'all 0.5s ease-in';
    leftTable.style.opacity = '0';
    leftTable.style.transform = 'translateY(-30px)';
  }
  
  if (rightTable) {
    rightTable.style.transition = 'all 0.5s ease-in';
    rightTable.style.opacity = '0';
    rightTable.style.transform = 'translateY(-30px)';
  }
  
  // Then hide the blocks
  setTimeout(() => {
    if (secondBlock) secondBlock.classList.remove('show');
    if (thirdBlock) thirdBlock.classList.remove('show');
    if (firstPlaceBlock) {
      firstPlaceBlock.classList.remove('show');
      firstPlaceBlock.style.display = 'none';
    }
  }, 200);
}
