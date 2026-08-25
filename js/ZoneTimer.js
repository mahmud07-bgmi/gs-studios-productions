// CONFIG: Set your Google Sheet URL here (published to web, not private)
const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8/';
const SHEET_NAME = 'alive_status';

// Zone timer state
let isZoneActive = false;
let countdownTimer = null;
let currentCount = 10;
let lastZoneStatus = null;
let isTimerRunning = false;

// Get Google Visualization API URL
function getGvizUrl(sheetUrl, sheetName) {
  const match = sheetUrl.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (!match) return null;
  const sheetId = match[1];
  return `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json&sheet=${encodeURIComponent(sheetName)}`;
}

// Parse Google Visualization API response
function parseGvizTable(json) {
  if (!json.table) return { headers: [], rows: [] };
  const headers = json.table.cols.map(col => col.label || '');
  const rows = json.table.rows.map(row =>
    row.c.map(cell => (cell ? cell.v : ''))
  );
  return { headers, rows };
}

// Get zone status from the sheet
function getZoneStatus(table) {
  if (!table.headers.length || !table.rows.length) return null;
  
  // Find the zone column index
  const zoneIdx = table.headers.findIndex(h => 
    h.toLowerCase().replace(/\s/g, '_') === 'zone' || 
    h.toLowerCase() === 'zone'
  );
  
  if (zoneIdx === -1) {
    console.error('Zone column not found in sheet');
    return null;
  }
  
  // Get the first row's zone value (assuming single zone status)
  if (table.rows.length > 0) {
    const zoneValue = table.rows[0][zoneIdx];
    return String(zoneValue).toLowerCase() === 'true';
  }
  
  return null;
}

// Show zone timer with slide down animation
function showZoneTimer() {
  const container = document.getElementById('zone-timer-container');
  const rectangle = document.getElementById('zone-timer-rectangle');
  const fill = document.getElementById('zone-timer-fill');
  
  // Reset states
  container.className = 'zone-timer-visible zone-slide-down';
  fill.className = 'zone-fill';
  fill.style.width = '0%';
  
  // Start initial fill animation (right to left)
  setTimeout(() => {
    fill.className = 'zone-fill zone-fill-initial';
  }, 500); // Wait for slide down to complete
  
  // Start countdown after initial fill
  setTimeout(() => {
    startCountdown();
  }, 1000); // Wait for slide down + initial fill
}

// Hide zone timer with slide up animation
function hideZoneTimer() {
  const container = document.getElementById('zone-timer-container');
  container.className = 'zone-timer-hidden zone-slide-up';
  
  // Reset timer state
  isZoneActive = false;
  isTimerRunning = false;
  if (countdownTimer) {
    clearInterval(countdownTimer);
    countdownTimer = null;
  }
}

// Start the countdown timer
function startCountdown() {
  if (isTimerRunning) return;
  
  isTimerRunning = true;
  currentCount = 10;
  
  const countdownElement = document.getElementById('countdown');
  const fill = document.getElementById('zone-timer-fill');
  
  // Setup fill for countdown phase (left to right)
  fill.className = 'zone-fill zone-fill-countdown';
  fill.style.width = '100%';
  
  // Update countdown display
  countdownElement.textContent = currentCount;
  countdownElement.className = 'countdown-active';
  
  // Smooth fill animation - update every 100ms for smoother effect
  const totalDuration = 10000; // 10 seconds in milliseconds
  const updateInterval = 100; // Update every 100ms
  const steps = totalDuration / updateInterval;
  let currentStep = 0;
  
  const smoothTimer = setInterval(() => {
    currentStep++;
    
    // Calculate smooth fill percentage
    const fillPercentage = Math.max(0, ((steps - currentStep) / steps) * 100);
    fill.style.width = fillPercentage + '%';
    
    // Update countdown number every second (every 10 steps)
    if (currentStep % 10 === 0) {
      currentCount--;
      countdownElement.textContent = Math.max(0, currentCount);
    }
    
    // When countdown reaches 0, hide the timer
    if (currentStep >= steps) {
      clearInterval(smoothTimer);
      countdownElement.className = '';
      
      // Hide timer after a brief delay
      setTimeout(() => {
        hideZoneTimer();
      }, 500);
    }
  }, updateInterval);
  
  // Store the timer reference for cleanup
  countdownTimer = smoothTimer;
}

// Handle zone status change
function handleZoneStatusChange(newStatus) {
  console.log('Zone status changed:', lastZoneStatus, '->', newStatus);
  
  // Trigger zone timer when status changes from false to true
  if (lastZoneStatus === false && newStatus === true && !isZoneActive) {
    console.log('Triggering zone timer');
    isZoneActive = true;
    showZoneTimer();
  }
  
  lastZoneStatus = newStatus;
}

// Fetch data from Google Sheets
function fetchZoneData() {
  const gvizUrl = getGvizUrl(SHEET_URL, SHEET_NAME);
  
  if (!gvizUrl) {
    document.getElementById('error').style.display = 'block';
    document.getElementById('error').textContent = 'Invalid sheet URL';
    return;
  }
  
  fetch(gvizUrl)
    .then(res => res.text())
    .then(text => {
      // Parse the JSONP response
      const jsonStart = text.indexOf('{');
      const jsonEnd = text.lastIndexOf('}') + 1;
      const json = JSON.parse(text.substring(jsonStart, jsonEnd));
      
      const table = parseGvizTable(json);
      
      // Hide error indicator
      document.getElementById('error').style.display = 'none';
      
      if (!table.headers.length || !table.rows.length) {
        return; // Just return silently if no data
      }
      
      // Get zone status
      const zoneStatus = getZoneStatus(table);
      
      if (zoneStatus !== null) {
        // Only handle status change if we have a previous status to compare
        if (lastZoneStatus !== null) {
          handleZoneStatusChange(zoneStatus);
        } else {
          // First time reading, just store the status
          lastZoneStatus = zoneStatus;
          console.log('Initial zone status:', zoneStatus);
        }
      }
    })
    .catch(err => {
      console.error('Error fetching zone data:', err);
      document.getElementById('error').style.display = 'block';
      document.getElementById('error').textContent = 'Failed to load zone data';
    });
}

// Initialize the zone timer
function initZoneTimer() {
  console.log('Initializing Zone Timer...');
  
  // Initial data fetch
  fetchZoneData();
  
  // Set up interval checking every 2 seconds
  setInterval(fetchZoneData, 2000);
}

// Start the zone timer when page loads
document.addEventListener('DOMContentLoaded', initZoneTimer);