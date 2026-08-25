// Google Sheets Configuration
const SHEET_ID = '1gyzPFtG3ubxzrqGEtQI-dr4aiExDU6Fx0tzFS2W4iG8';
const SHEET_GID = '853961301';
const SHEET_URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${SHEET_GID}`;

// MVP Data Storage
let mvpData = [];
let shouldShowMVP = false;

// Character images mapping
const characterImages = [
    'assets/c1.png',
    'assets/c2.png',
    'assets/c3.png',
    'assets/c4.png'
];

// Initialize MVP System
document.addEventListener('DOMContentLoaded', function() {
    fetchMVPData();
    
    // Auto-refresh every 2 seconds to check show status
    setInterval(fetchMVPData, 2000);
});

// Fetch MVP Data from Google Sheets
async function fetchMVPData() {
    try {
        const response = await fetch(SHEET_URL);
        const text = await response.text();
        
        // Parse Google Sheets JSON response
        const jsonText = text.substring(47).slice(0, -2);
        const data = JSON.parse(jsonText);
        
        if (data && data.table && data.table.rows) {
            parseMVPData(data.table.rows);
        } else {
            console.error('Invalid data structure received');
            showErrorState();
        }
    } catch (error) {
        console.error('Error fetching MVP data:', error);
        showErrorState();
    }
}

// Parse MVP Data from Google Sheets Response
function parseMVPData(rows) {
    mvpData = [];
    shouldShowMVP = false;
    
    // Check if first row is header by looking at the content
    let startIndex = 0;
    if (rows.length > 0 && rows[0] && rows[0].c) {
        const firstRowData = getCellValue(rows[0].c[0]) || '';
        // If first row contains "team_name" or similar header text, skip it
        if (firstRowData.toLowerCase().includes('team') || firstRowData.toLowerCase().includes('name')) {
            startIndex = 1;
        }
    }
    
    // Check the "show" value from column E (index 4) of the first data row
    if (rows.length > startIndex && rows[startIndex] && rows[startIndex].c) {
        const showValue = getCellValue(rows[startIndex].c[4]);
        shouldShowMVP = (showValue === 'TRUE' || showValue === 'true' || showValue === true || showValue === 'TRUE');
    }
    
    // If show is FALSE, hide everything and return
    if (!shouldShowMVP) {
        hideAllCards();
        return;
    }
    
    // Process data rows (get exactly 4 players, or as many as available)
    const endIndex = Math.min(rows.length, startIndex + 4);
    
    for (let i = startIndex; i < endIndex; i++) {
        const row = rows[i];
        
        if (row && row.c) {
            const teamName = getCellValue(row.c[0]);
            const playerName = getCellValue(row.c[1]);
            const finish = getCellValue(row.c[2]);
            const contribution = getCellValue(row.c[3]);
            
            // Only require team name and player name to be non-empty
            if (teamName && playerName) {
                const mvpEntry = {
                    teamName: teamName,
                    playerName: playerName,
                    finish: formatFinish(finish || '0'),
                    contribution: formatContribution(contribution || '0')
                };
                
                mvpData.push(mvpEntry);
            }
        }
    }
    
    updateMVPDisplay();
}

// Get Cell Value Helper
function getCellValue(cell) {
    if (!cell) {
        return '';
    }
    
    let value = '';
    if (cell.v !== null && cell.v !== undefined) {
        value = cell.v.toString().trim();
    } else if (cell.f !== null && cell.f !== undefined) {
        value = cell.f.toString().trim();
    }
    
    return value;
}

// Update MVP Display
function updateMVPDisplay() {
    // If show is FALSE, hide all cards
    if (!shouldShowMVP) {
        hideAllCards();
        return;
    }
    
    // Show/hide cards based on available data
    for (let i = 0; i < 4; i++) {
        const cardIndex = i + 1;
        const mvpCard = document.getElementById(`mvp-card-${cardIndex}`);
        
        if (i < mvpData.length && mvpData[i]) {
            const data = mvpData[i];
            
            // Update card content
            updateCardContent(cardIndex, data);
            
            // Update character image
            updateCharacterImage(cardIndex, i);
            
            // Show card with animation
            showMVPCard(mvpCard, i);
        } else {
            // Hide card if no data
            hideMVPCard(mvpCard);
        }
    }
}

// Update Card Content
function updateCardContent(cardIndex, data) {
    const card = document.getElementById(`mvp-card-${cardIndex}`);
    
    // Update team name
    const teamNameElement = card.querySelector('.team-name');
    if (teamNameElement) {
        teamNameElement.textContent = data.teamName;
        teamNameElement.classList.remove('loading');
    }
    
    // Update player name
    const playerNameElement = card.querySelector('.player-name');
    if (playerNameElement) {
        playerNameElement.textContent = data.playerName;
        playerNameElement.classList.remove('loading');
    }
    
    // Update finish stat
    const finishElement = document.getElementById(`finish-${cardIndex}`);
    if (finishElement) {
        finishElement.textContent = data.finish;
    }
    
    // Update contribution stat
    const contElement = document.getElementById(`cont-${cardIndex}`);
    if (contElement) {
        contElement.textContent = data.contribution;
    }
}

// Update Character Image
function updateCharacterImage(cardIndex, dataIndex) {
    const card = document.getElementById(`mvp-card-${cardIndex}`);
    const characterImg = card.querySelector('.character-img');
    
    if (characterImg && characterImages[dataIndex]) {
        characterImg.src = characterImages[dataIndex];
        characterImg.alt = `Character ${dataIndex + 1}`;
    }
}

// Show MVP Card with Animation
function showMVPCard(card, index) {
    if (!card) return;
    
    // Remove any existing animation classes
    card.classList.remove('hide-card');
    
    // Add show animation with delay
    setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
        
        // Add special effects for first place
        if (index === 0) {
            card.classList.add('first-place');
            addCrownEffect(card);
        }
    }, index * 200);
}

// Hide MVP Card
function hideMVPCard(card) {
    if (!card) return;
    
    card.classList.add('hide-card');
    card.style.opacity = '0';
    card.style.transform = 'translateY(50px) scale(0.9)';
}

// Hide All Cards (when show is FALSE)
function hideAllCards() {
    for (let i = 1; i <= 4; i++) {
        const card = document.getElementById(`mvp-card-${i}`);
        hideMVPCard(card);
    }
}

// Add Crown Effect for First Place
function addCrownEffect(card) {
    const playerAvatar = card.querySelector('.player-avatar');
    const existingCrown = playerAvatar.querySelector('.crown-icon');
    
    if (!existingCrown) {
        const crownIcon = document.createElement('div');
        crownIcon.className = 'crown-icon';
        crownIcon.textContent = '👑';
        playerAvatar.appendChild(crownIcon);
    }
}

// Show Error State
function showErrorState() {
    console.log('Showing error state...');
    
    for (let i = 1; i <= 4; i++) {
        const card = document.getElementById(`mvp-card-${i}`);
        const teamName = card.querySelector('.team-name');
        const playerName = card.querySelector('.player-name');
        const finish = document.getElementById(`finish-${i}`);
        const cont = document.getElementById(`cont-${i}`);
        
        if (teamName) teamName.textContent = 'Connection Failed';
        if (playerName) playerName.textContent = 'Retrying...';
        if (finish) finish.textContent = '-';
        if (cont) cont.textContent = '-';
    }
}

// No hover effects - all animations are automatic

// Animation Control Functions
function startMVPAnimations() {
    const container = document.querySelector('.main-container');
    const headerSection = document.querySelector('.header-section');
    const cardsContainer = document.querySelector('.mvp-cards-container');
    
    // Reset and start animations
    container.style.animation = 'none';
    headerSection.style.animation = 'none';
    cardsContainer.style.animation = 'none';
    
    setTimeout(() => {
        container.style.animation = 'containerLoop 40s infinite';
        headerSection.style.animation = 'headerLoop 40s infinite';
        cardsContainer.style.animation = 'cardsLoop 40s infinite';
    }, 100);
}

// Utility Functions
function formatContribution(value) {
    if (!value || value === '0' || value === '') return '0%';
    
    // Convert to string and clean up
    let cleanValue = value.toString().trim();
    
    // If it already has %, just return it
    if (cleanValue.includes('%')) {
        return cleanValue;
    }
    
    // If it's a decimal (like 0.3158 for 31.58%), convert to percentage
    const numValue = parseFloat(cleanValue);
    if (!isNaN(numValue)) {
        if (numValue <= 1 && numValue > 0) {
            // It's a decimal between 0 and 1, convert to percentage
            return (numValue * 100).toFixed(2) + '%';
        } else if (numValue > 1) {
            // It's already a percentage number (like 31.58)
            return numValue.toFixed(2) + '%';
        } else {
            // It's 0 or negative
            return '0%';
        }
    }
    
    return cleanValue;
}

function formatFinish(value) {
    if (!value || value === '0' || value === '') return '0';
    
    // Convert to string and clean up
    let cleanValue = value.toString().trim();
    
    // Parse as integer
    const numValue = parseInt(cleanValue);
    if (!isNaN(numValue)) {
        return numValue.toString();
    }
    
    return cleanValue;
}

function getOrdinalSuffix(num) {
    const j = num % 10;
    const k = num % 100;
    
    if (j === 1 && k !== 11) return 'st';
    if (j === 2 && k !== 12) return 'nd';
    if (j === 3 && k !== 13) return 'rd';
    return 'th';
}

// Debug Functions (accessible via browser console)
function debugMVPData() {
    console.log('Should Show MVP:', shouldShowMVP);
    console.log('Current MVP Data:', mvpData);
    console.log('Sheet URL:', SHEET_URL);
}

// Add debug to global scope for console access
window.debugMVP = debugMVPData;
window.refreshMVP = fetchMVPData;
