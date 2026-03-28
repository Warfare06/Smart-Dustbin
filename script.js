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

        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: initialLabels,
                datasets: [{
                    label: 'Avg Street Load',
                    data: initialData,
                    borderColor: '#00d2ff',
                    fill: true,
                    backgroundColor: 'rgba(0, 210, 255, 0.1)',
                    tension: 0.3, 
                    borderWidth: 3
                }]
            },
            options: { 
                responsive: true, 
                scales: { 
                    y: { min: 0, max: 100, ticks: { color: 'white' } },
                    x: { ticks: { color: 'white' } }
                },
                plugins: {
                    legend: { labels: { color: 'white' } }
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

// 7. Core Functions
function loadStreetData() {
    db.ref("smart_city/" + currentStreet).on("value", (snapshot) => {
        const data = snapshot.val();
        if (!data) return;
        updateUI(data);
        updateStats(data);
        drawOptimizedRoute(data);
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
