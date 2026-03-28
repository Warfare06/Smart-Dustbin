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
function drawOptimizedRoute(data) {
    // 1. Structure your JSON data into an array
    // Assuming your JSON has coordinates, or you can hardcode them here
    let binArray = [
        { id: "Bin 1", level: data.bin1.level, coord: [12.8406, 80.1533] },
        { id: "Bin 2", level: data.bin2.level, coord: [12.8425, 80.1500] },
        { id: "Bin 3", level: data.bin3.level, coord: [12.8380, 80.1565] },
        { id: "Bin 4", level: data.bin4.level, coord: [12.8365, 80.1520] }
    ];

    // 2. THE MAGIC: Sort bins from Highest (Fullest) to Lowest
    binArray.sort((a, b) => b.level - a.level);

    // 3. Clear previous lines and markers to prevent overlapping
    if (routeLine) map.removeLayer(routeLine);
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // 4. Extract just the ordered coordinates for the polyline
    let routePath = binArray.map(b => b.coord);

    // 5. Draw the Route Line
    routeLine = L.polyline(routePath, {
        color: '#00d2ff', // A nice neon blue to match your UI
        weight: 5,
        opacity: 0.8,
        dashArray: '10, 10' // Makes it a dashed line (optional)
    }).addTo(map);

    // 6. ADD ARROWHEADS
    routeLine.arrowheads({
        size: '18px',              // Make arrows big enough to see
        frequency: 'allvertices',  // Places an arrow pointing at every single bin stop
        fill: true,
        color: '#ff4d4d'           // Red arrows for visibility
    });

    // 7. Add Map Markers with "Stop Number"
    binArray.forEach((bin, index) => {
        let marker = L.marker(bin.coord).addTo(map);
        
        // The popup tells the driver which stop this is
        marker.bindPopup(`
            <div style="text-align:center;">
                <b>Stop #${index + 1}</b><br>
                ${bin.id}<br>
                Level: <b>${bin.level}%</b>
            </div>
        `);
        markers.push(marker);
    });

    // 8. Auto-center the map to fit the whole route
    if (routePath.length > 0) {
        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });
    }
}
// 5. Update UI Components
function updateUI(data) {
    for (let i = 1; i <= 4; i++) {
        let binData = data[`bin${i}`];
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
    let levels = [data.bin1.level, data.bin2.level, data.bin3.level, data.bin4.level];
    let avg = levels.reduce((a, b) => a + b) / 4;
    
    document.getElementById("avgLevel").innerText = avg.toFixed(1) + "%";
    document.getElementById("fullBins").innerText = levels.filter(l => l >= 80).length;
    document.getElementById("prediction").innerText = (avg + 5 > 100 ? 100 : avg + 5).toFixed(1) + "%";

    updateChart(avg);
}

function updateChart(avgLevel) {
    const ctx = document.getElementById('wasteChart').getContext('2d');
    const now = new Date().toLocaleTimeString();

    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [now],
                datasets: [{
                    label: 'Avg Street Load',
                    data: [avgLevel],
                    borderColor: '#00d2ff',
                    fill: true,
                    backgroundColor: 'rgba(0, 210, 255, 0.1)'
                }]
            },
            options: { responsive: true, scales: { y: { min: 0, max: 100 } } }
        });
    } else {
        chart.data.labels.push(now);
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
    currentStreet = street;
    document.getElementById("streetTitle").innerText = street.toUpperCase();
    db.ref("smart_city/").off(); // Stop previous listeners
    loadStreetData();
}

window.onload = () => {
    initMap();
    loadStreetData();
};
