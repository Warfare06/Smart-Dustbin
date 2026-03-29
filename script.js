// 1. Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyBowxOjZiwCQdBIsmPigIdKRGjY6ObVtKQ",
    authDomain: "smart-dustbin-b43d8.firebaseapp.com",
    databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "smart-dustbin-b43d8",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// 2. Global Variables
let currentStreet = "street1";
let chart;
let map;
let routeLine;
let markers = [];
let notifiedBins = {};

// Fix for Leaflet Default Icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// 3. Initialize Map
function initMap() {
    map = L.map('map').setView([12.8406, 80.1533], 15);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; OpenStreetMap contributors &copy; CARTO'
    }).addTo(map);
}

// 4. Draw Optimized Route (Logic: Fullest Bins First)
// 4. Draw Optimized Route (Logic: Fullest Bins First)
function drawOptimizedRoute(data) {
    // 0. Safety Check: Make sure we actually have data!
    if (!data) {
        console.error("No data received from Firebase for mapping.");
        return; 
    }

    // 1. Structure JSON data. If a bin is missing, default it to 0% so the code doesn't crash.
    let binArray = [
        { id: "Bin 1", level: data.bin1 && data.bin1.level ? data.bin1.level : 0, coord: [12.8406, 80.1533] },
        { id: "Bin 2", level: data.bin2 && data.bin2.level ? data.bin2.level : 0, coord: [12.8425, 80.1500] },
        { id: "Bin 3", level: data.bin3 && data.bin3.level ? data.bin3.level : 0, coord: [12.8380, 80.1565] },
        { id: "Bin 4", level: data.bin4 && data.bin4.level ? data.bin4.level : 0, coord: [12.8365, 80.1520] }
    ];

    console.log("Sorting these bins for the route:", binArray);

    // 2. Sort bins from Highest (Fullest) to Lowest
    binArray.sort((a, b) => b.level - a.level);

    // 3. Clear previous lines and markers
    if (routeLine) {
        map.removeLayer(routeLine);
    }
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // 4. Extract ordered coordinates
    let routePath = binArray.map(b => b.coord);

    // 5. Draw the Route Line FIRST
    routeLine = L.polyline(routePath, {
        color: '#00d2ff', 
        weight: 5,
        opacity: 0.8
    }).addTo(map);

    // 6. Attempt to add Arrowheads (Wrapped in a try-catch in case the library fails)
    try {
        if (typeof routeLine.arrowheads === 'function') {
            routeLine.arrowheads({
                size: '20px',             
                frequency: 'allvertices', 
                fill: true,
                color: '#ff4d4d'          
            });
        } else {
            console.warn("Arrowheads library not loaded correctly. Drawing line without arrows.");
        }
    } catch (error) {
        console.error("Arrowhead error:", error);
    }

    // 7. Add Map Markers
    binArray.forEach((bin, index) => {
        let marker = L.marker(bin.coord).addTo(map);
        
        marker.bindPopup(`
            <div style="text-align:center;">
                <b>Stop #${index + 1}</b><br>
                ${bin.id}<br>
                Level: <b>${bin.level}%</b>
            </div>
        `);
        markers.push(marker);
    });

    // 8. Auto-center the map
    if (routePath.length > 0) {
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
}

// 5. Update UI Components
function updateUI(data) {
    for (let i = 1; i <= 4; i++) {
        let binData = data[`bin${i}`];
        if (!binData) continue; // Skip if bin data is missing

        let fill = document.getElementById(`fill${i}`);
        let levelText = document.getElementById(`level${i}`);
        let typeText = document.getElementById(`type${i}`);
        let statusText = document.getElementById(`status${i}`);

        // Update Fill Level & Color
        fill.style.height = binData.level + "%";
        levelText.innerText = binData.level;
        typeText.innerText = binData.waste_type;
        statusText.innerText = binData.level >= 80 ? "FULL" : "Normal";

        if (binData.level >= 80) {
            fill.style.background = "#ff4d4d";
            fill.classList.add("blink-animation");
        } else if (binData.level >= 50) {
            fill.style.background = "#ffa502";
            fill.classList.remove("blink-animation");
        } else {
            fill.style.background = "#2ecc71";
            fill.classList.remove("blink-animation");
        }
    }
}

// 6. Statistics & Charts
function updateStats(data) {
    // Only calculate using bins that actually exist in the data
    let levels = [];
    if(data.bin1) levels.push(data.bin1.level);
    if(data.bin2) levels.push(data.bin2.level);
    if(data.bin3) levels.push(data.bin3.level);
    if(data.bin4) levels.push(data.bin4.level);
    
    // Prevent math errors if data is temporarily empty
    if(levels.length === 0) return;

    let avg = levels.reduce((a, b) => a + b) / levels.length;
    
    document.getElementById("avgLevel").innerText = avg.toFixed(1) + "%";
    document.getElementById("fullBins").innerText = levels.filter(l => l >= 80).length;
    document.getElementById("prediction").innerText = (avg + 5 > 100 ? 100 : avg + 5).toFixed(1) + "%";

    updateChart(avg);
    runAIPrediction(avg);
}

function updateChart(avgLevel) {
    const ctx = document.getElementById('wasteChart').getContext('2d');
    const now = new Date();

    if (!chart) {
        // Generate historical fake points on initial load
        let initialLabels = [];
        let initialData = [];
        
        for (let i = 5; i > 0; i--) {
            let pastTime = new Date(now.getTime() - i * 60000); 
            initialLabels.push(pastTime.toLocaleTimeString());
            let variation = avgLevel + (Math.random() * 10 - 5); 
            initialData.push(Math.max(0, Math.min(100, variation)).toFixed(1)); 
        }
        
        // Add real current point
        initialLabels.push(now.toLocaleTimeString());
        initialData.push(avgLevel);

        // --- NEW: Create a beautiful fading gradient for the graph fill ---
        let gradient = ctx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(0, 210, 255, 0.6)'); // Bright blue at the top
        gradient.addColorStop(1, 'rgba(0, 210, 255, 0.0)'); // Fades to transparent at the bottom

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: initialLabels,
                datasets: [{
                    label: 'Avg Street Load (%)',
                    data: initialData,
                    borderColor: '#00d2ff', // Neon blue line
                    backgroundColor: gradient, // Uses the fading gradient
                    fill: true,
                    tension: 0.4, // Smoother flowing curves
                    borderWidth: 4, // Thicker, bolder line
                    pointBackgroundColor: '#ffffff', // Bright white dots
                    pointBorderColor: '#00d2ff', // Blue ring around the white dots
                    pointBorderWidth: 2,
                    pointRadius: 5, // Larger dots
                    pointHoverRadius: 8 // Dots get even bigger when hovered
                }]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, // Allows us to control the height perfectly
                scales: { 
                    y: { 
                        min: 0, 
                        max: 100, 
                        ticks: { color: '#ffffff', font: { size: 14, weight: 'bold' } }, // Bigger, brighter Y-axis text
                        grid: { color: 'rgba(255, 255, 255, 0.1)' } // Faint horizontal gridlines
                    },
                    x: { 
                        ticks: { color: '#e2e8f0', font: { size: 12 } }, // Brighter X-axis time text
                        grid: { color: 'rgba(255, 255, 255, 0.1)' } // Faint vertical gridlines
                    }
                },
                plugins: {
                    legend: { labels: { color: '#ffffff', font: { size: 16, weight: 'bold' } } } // Bigger Title
                }
            }
        });
    } else {
        // Update with live data
        chart.data.labels.push(now.toLocaleTimeString());
        chart.data.datasets[0].data.push(avgLevel);
        
        if (chart.data.labels.length > 10) {
            chart.data.labels.shift();
            chart.data.datasets[0].data.shift();
        }
        chart.update();
    }
}

// Check for Full Bins and Trigger Popup Alert
function checkAlerts(data) {
    for (let i = 1; i <= 4; i++) {
        let bin = data[`bin${i}`];
        if (!bin) continue; // Skip if no data

        // Create a unique name like "street1_bin2" to track it
        let binKey = currentStreet + "_bin" + i; 

        // Check if level is 80% or higher
        if (bin.level >= 80) {
            // Only alert if we haven't already notified the user
            if (!notifiedBins[binKey]) {
                
                // Format the text nicely (e.g., turns "street1" into "Street 1")
                let formatStreet = currentStreet.replace("street", "Street ");
                
                // Trigger the browser popup alert
                alert(`🚨 URGENT: ${formatStreet}, Bin ${i} is FULL at ${bin.level}%!\nPlease dispatch a truck.`);
                
                // Mark as notified so it doesn't spam you
                notifiedBins[binKey] = true;
            }
        } else {
            // If the bin level drops below 80 (meaning the truck emptied it), 
            // reset the tracker so it can alert you again next time it fills up!
            if (notifiedBins[binKey]) {
                notifiedBins[binKey] = false;
            }
        }
    }
}

// AI Predictive Algorithm (Simulated ML)
function runAIPrediction(currentAvg) {
    const forecastDiv = document.getElementById("aiForecast");
    forecastDiv.innerHTML = ""; // Clear old predictions

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const today = new Date().getDay(); // Gets current day as a number (0-6)

    // "Trained Weights" - The algorithm assumes weekends generate way more trash 
    // than mid-week days. You can adjust these multipliers!
    const dayWeights = { 
        0: 1.5, // Sunday (High trash)
        1: 0.8, // Monday (Low)
        2: 0.9, // Tuesday
        3: 0.9, // Wednesday
        4: 1.1, // Thursday
        5: 1.3, // Friday (Rising)
        6: 1.6  // Saturday (Highest trash)
    };

    // Generate the next 7 days
    for (let i = 1; i <= 7; i++) {
        let targetDayIndex = (today + i) % 7;
        let dayName = days[targetDayIndex];

        // The Math: Base average * the day's weight + a tiny bit of random noise for realism
        let basePrediction = currentAvg * dayWeights[targetDayIndex];
        let randomNoise = (Math.random() * 8) - 4; // +/- 4% variation
        
        // Ensure it stays between 0% and 100%
        let finalPrediction = Math.min(100, Math.max(0, basePrediction + randomNoise)).toFixed(1);

        // Determine color/status based on the AI's prediction
        let statusClass = "status-low";
        let statusText = "NORMAL";
        if (finalPrediction >= 80) { 
            statusClass = "status-high"; 
            statusText = "CRITICAL"; 
        } else if (finalPrediction >= 50) { 
            statusClass = "status-med"; 
            statusText = "ELEVATED"; 
        }

        // Inject the card into the HTML
        forecastDiv.innerHTML += `
            <div class="forecast-card">
                <div class="forecast-day">${dayName}</div>
                <div class="forecast-value">${finalPrediction}%</div>
                <div class="forecast-status ${statusClass}">${statusText}</div>
            </div>
        `;
    }
}


// 7. Core Functions
function loadStreetData() {
    db.ref("smart_city/" + currentStreet).on("value", (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        
        updateUI(data);
        updateStats(data);
        drawOptimizedRoute(data);
        
        // ADD THIS LINE HERE:
        checkAlerts(data); 
    });
}

function selectStreet(street) {
    // 1. Turn off the listener for the OLD street first
    db.ref("smart_city/" + currentStreet).off(); 

    // 2. Now update to the new street
    currentStreet = street;
    document.getElementById("streetTitle").innerText = street.toUpperCase();
    
    // 3. Load the data for the new street
    loadStreetData();
}

window.onload = () => {
    initMap();
    loadStreetData();
};
