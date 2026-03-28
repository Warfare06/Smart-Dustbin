// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyBowxOjZiwCQdBIsmPigIdKRGjY6ObVtKQ",
  authDomain: "smart-dustbin-b43d8.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b43d8",
  storageBucket: "smart-dustbin-b43d8.firebasestorage.app",
  messagingSenderId: "795207450873",
  appId: "1:795207450873:web:4f9f6a11f6fced31902228",
  measurementId: "G-5XSBSXF245"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentStreet = "street1";
let chart;
let map;
let routeLine;

// Select Street
function selectStreet(street) {
    currentStreet = street;

    document.getElementById("streetTitle").innerText =
        street.replace("street", "Street ");

    // Reset Graph
    if (chart) {
        chart.destroy();
        chart = null;
    }

    loadStreetData();
}

// Initialize Leaflet Map (VIT Chennai Area)
function initMap() {
    map = L.map('map').setView([12.8406, 80.1533], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap'
    }).addTo(map);

    drawRoute();
}

// predictWaste
function predictWaste(level) {
    let growthRate = 5; // % per hour (example)
    let predicted = level + growthRate;

    if (predicted > 100) predicted = 100;

    return predicted;
}

// Draw Truck Route Near VIT
// function drawRoute() {
//     var street1 = [12.8406, 80.1533];
//     var street2 = [12.8425, 80.1500];
//     var street3 = [12.8380, 80.1565];
//     var street4 = [12.8365, 80.1520];

//     L.marker(street1).addTo(map).bindPopup("Street 1");
//     L.marker(street2).addTo(map).bindPopup("Street 2");
//     L.marker(street3).addTo(map).bindPopup("Street 3");
//     L.marker(street4).addTo(map).bindPopup("Street 4");

//     routeLine = L.polyline([street1, street2, street3, street4], {
//         color: 'yellow',
//         weight: 5
//     }).addTo(map);

//     map.fitBounds(routeLine.getBounds());
// }

function drawOptimizedRoute(streetData) {
    let streets = [
        { name: "bin1", coord: [12.8406, 80.1533], level: streetData.bin1.level },
        { name: "bin2", coord: [12.8425, 80.1500], level: streetData.bin2.level },
        { name: "bin3", coord: [12.8380, 80.1565], level: streetData.bin3.level },
        { name: "bin4", coord: [12.8365, 80.1520], level: streetData.bin4.level }
    ];

    // Sort bins by level (descending)
    streets.sort((a, b) => b.level - a.level);

    let routeCoords = streets.map(s => s.coord);

    if (routeLine) {
        map.removeLayer(routeLine);
    }

    routeLine = L.polyline(routeCoords, {
        color: 'red',
        weight: 6
    }).addTo(map);
}

// Bin Fill Animation + Color
function setBinFill(fillId, level) {
    let fill = document.getElementById(fillId);
    fill.style.height = level + "%";

    if (level < 30) {
        fill.style.background = "green";
        fill.style.animation = "";
    } 
    else if (level < 70) {
        fill.style.background = "yellow";
        fill.style.animation = "";
    } 
    else {
        fill.style.background = "red";
        fill.style.animation = "blink 1s infinite";
    }
}

// Load Firebase Data
function loadStreetData() {
    db.ref("smart_city/" + currentStreet)
      .on("value", function(snapshot) {

        const data = snapshot.val();

        document.getElementById("level1").innerText = data.bin1.level;
        document.getElementById("type1").innerText = data.bin1.waste_type;
        document.getElementById("status1").innerText = data.bin1.status;
        setBinFill("fill1", data.bin1.level);

        document.getElementById("level2").innerText = data.bin2.level;
        document.getElementById("type2").innerText = data.bin2.waste_type;
        document.getElementById("status2").innerText = data.bin2.status;
        setBinFill("fill2", data.bin2.level);

        document.getElementById("level3").innerText = data.bin3.level;
        document.getElementById("type3").innerText = data.bin3.waste_type;
        document.getElementById("status3").innerText = data.bin3.status;
        setBinFill("fill3", data.bin3.level);

        document.getElementById("level4").innerText = data.bin4.level;
        document.getElementById("type4").innerText = data.bin4.waste_type;
        document.getElementById("status4").innerText = data.bin4.status;
        setBinFill("fill4", data.bin4.level);

        let avg = (data.bin1.level + data.bin2.level + data.bin3.level + data.bin4.level) / 4;
        updateChart(avg);
        calculateRoute(data);
        drawOptimizedRoute(data);
        let predicted = predictWaste(data.bin1.level);
        document.getElementById("prediction").innerText = predicted + "%";
        updateStatistics(data);
        checkFullBins(data);
        
    });
}

// Bin Full Notification
function checkFullBins(data) {
    for (let bin in data) {
        if (data[bin].level >= 80) {
            alert(currentStreet + " " + bin + " is FULL!");
        }
    }
}

// updateStatistics
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

// updateChart (Waste Graph)
function updateChart(level) {
    const ctx = document.getElementById('wasteChart').getContext('2d');

    if (!chart) {
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: [],
                datasets: [{
                    label: 'Waste Level %',
                    data: [],
                    borderColor: '#00ffcc',
                    backgroundColor: 'rgba(0,255,204,0.2)',
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
    }

    let time = new Date().toLocaleTimeString();

    chart.data.labels.push(time);
    chart.data.datasets[0].data.push(level);
    chart.update();
}

// Truck Route Optimization Console
function calculateRoute(streetData) {
    let bins = [];

    for (let bin in streetData) {
        bins.push({
            name: bin,
            level: streetData[bin].level
        });
    }

    bins.sort((a, b) => b.level - a.level);

    console.log("Truck Route Order:");
    bins.forEach(bin => console.log(bin.name));
}

// Load Everything
window.onload = function() {
    initMap();
    loadStreetData();
};
