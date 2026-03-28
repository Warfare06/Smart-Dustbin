const firebaseConfig = {
  apiKey: "AIzaSyBowxOjZiwCQdBIsmPigIdKRGjY6ObVtKQ",
  authDomain: "smart-dustbin-b43d8.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b43d8",
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentStreet = "street1";
let chart;
let map;
let routeLine;
let markers = [];
let notifiedBins = {};

// Select Street
function selectStreet(street) {
    currentStreet = street;

    document.getElementById("streetTitle").innerText =
        street.replace("street", "Street ");

    if (chart) {
        chart.destroy();
        chart = null;
    }

    loadStreetData();
}

// Initialize Map
function initMap() {
    map = L.map('map').setView([12.8406, 80.1533], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap'
    }).addTo(map);
}

// Draw Optimized Route
function drawOptimizedRoute(streetData) {
    let streets = [
        { name: "Bin 1", coord: [12.8406, 80.1533], level: streetData.bin1.level },
        { name: "Bin 2", coord: [12.8425, 80.1500], level: streetData.bin2.level },
        { name: "Bin 3", coord: [12.8380, 80.1565], level: streetData.bin3.level },
        { name: "Bin 4", coord: [12.8365, 80.1520], level: streetData.bin4.level }
    ];

    // Sort by level (Full bins first)
    streets.sort((a, b) => b.level - a.level);

    let routeCoords = streets.map(s => s.coord);

    // Remove old route
    if (routeLine) {
        map.removeLayer(routeLine);
    }

    // Remove old markers
    markers.forEach(m => map.removeLayer(m));
    markers = [];

    // Draw route
    routeLine = L.polyline(routeCoords, {
        color: 'red',
        weight: 6
    }).addTo(map);

    // Add arrows
    routeLine.arrowheads({
        size: '20px',
        frequency: '50px'
    });

    // Add markers for bins
    streets.forEach((s, index) => {
        let marker = L.marker(s.coord).addTo(map);
        marker.bindPopup("Stop " + (index+1) + "<br>" + s.name + "<br>Level: " + s.level + "%");
        markers.push(marker);
    });

    // Fit map to route
    map.fitBounds(routeLine.getBounds());
}

// Bin Fill
function setBinFill(fillId, level) {
    let fill = document.getElementById(fillId);
    fill.style.height = level + "%";

    if (level < 30) fill.style.background = "green";
    else if (level < 70) fill.style.background = "yellow";
    else {
        fill.style.background = "red";
        fill.style.animation = "blink 1s infinite";
    }
}

// Prediction
function predictWaste(avgLevel) {
    let growthRate = 5;
    let predicted = avgLevel + growthRate;
    if (predicted > 100) predicted = 100;

    document.getElementById("prediction").innerText = predicted.toFixed(1) + "%";
}

// Full Bin Notification
function checkFullBins(data) {
    for (let bin in data) {
        if (data[bin].level >= 80 && !notifiedBins[bin]) {
            alert(currentStreet + " " + bin + " is FULL!");
            notifiedBins[bin] = true;
        }
    }
}

// Statistics
function updateStatistics(data) {
    let levels = [
        data.bin1.level,
        data.bin2.level,
        data.bin3.level,
        data.bin4.level
    ];

    let avg = (levels[0] + levels[1] + levels[2] + levels[3]) / 4;
    document.getElementById("avgLevel").innerText = avg.toFixed(1);

    let full = levels.filter(l => l >= 80).length;
    document.getElementById("fullBins").innerText = full;

    let dry = 0;
    let wet = 0;

    for (let bin in data) {
        if (data[bin].waste_type === "dry") dry++;
        else wet++;
    }

    document.getElementById("dryBins").innerText = dry;
    document.getElementById("wetBins").innerText = wet;
}

// updateChart Waste Graph
function updateChart(level) {
    const ctx = document.getElementById('wasteChart').getContext('2d');

    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [new Date().toLocaleTimeString()],
                datasets: [{
                    label: 'Waste Level %',
                    data: [level],
                    borderColor: '#4cafef',
                    backgroundColor: 'rgba(76,175,239,0.2)',
                    borderWidth: 3,
                    fill: true,
                    tension: 0.3
                }]
            },
            options: {
                animation: false,
                scales: {
                    x: {
                        ticks: { color: 'white' },
                        grid: { color: '#444' }
                    },
                    y: {
                        min: 0,
                        max: 100,
                        ticks: { color: 'white' },
                        grid: { color: '#444' }
                    }
                },
                plugins: {
                    legend: {
                        labels: { color: 'white' }
                    }
                }
            }
        });
    } else {
        let time = new Date().toLocaleTimeString();
        chart.data.labels.push(time);
        chart.data.datasets[0].data.push(level);
        if (chart.data.labels.length > 10) {
          chart.data.labels.shift();
          chart.data.datasets[0].data.shift();
        }
      chart.update();
    }
}


// Load Firebase Data
function loadStreetData() {
    db.ref("smart_city/" + currentStreet)
      .on("value", function(snapshot) {

        const data = snapshot.val();

        setBinFill("fill1", data.bin1.level);
        setBinFill("fill2", data.bin2.level);
        setBinFill("fill3", data.bin3.level);
        setBinFill("fill4", data.bin4.level);

        document.getElementById("level1").innerText = data.bin1.level;
        document.getElementById("level2").innerText = data.bin2.level;
        document.getElementById("level3").innerText = data.bin3.level;
        document.getElementById("level4").innerText = data.bin4.level;

        let avg = (data.bin1.level + data.bin2.level + data.bin3.level + data.bin4.level) / 4;

        updateChart(avg);
        predictWaste(avg);
        updateStatistics(data);
        checkFullBins(data);
        drawOptimizedRoute(data);
    });
}

// Start
window.onload = function() {
    initMap();
    loadStreetData();
};
