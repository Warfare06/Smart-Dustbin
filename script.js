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

// Select Street
function selectStreet(street) {
    currentStreet = street;
    document.getElementById("streetTitle").innerText =
        street.replace("street", "Street ");
    loadStreetData();
}

let map;
let directionsService;
let directionsRenderer;

// Initialize Map
let map;

function initMap() {
    // Center map near VIT Chennai
    map = L.map('map').setView([12.8406, 80.1533], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: 'OpenStreetMap'
    }).addTo(map);

    // Example streets around VIT Chennai
    var street1 = [12.8406, 80.1533];
    var street2 = [12.8425, 80.1500];
    var street3 = [12.8380, 80.1565];
    var street4 = [12.8365, 80.1520];

    // Markers
    L.marker(street1).addTo(map).bindPopup("Street 1");
    L.marker(street2).addTo(map).bindPopup("Street 2");
    L.marker(street3).addTo(map).bindPopup("Street 3");
    L.marker(street4).addTo(map).bindPopup("Street 4");

    // Truck Route Line
    var route = L.polyline([street1, street2, street3, street4], {
        color: 'yellow',
        weight: 5
    }).addTo(map);

    map.fitBounds(route.getBounds());
}

function calculateBestRoute() {
    const waypoints = [
        { location: { lat: 12.9716, lng: 77.5946 } }, // Street 1
        { location: { lat: 12.9616, lng: 77.5846 } }, // Street 2
        { location: { lat: 12.9516, lng: 77.5746 } }, // Street 3
        { location: { lat: 12.9416, lng: 77.5646 } }  // Street 4
    ];

    directionsService.route({
        origin: waypoints[0].location,
        destination: waypoints[waypoints.length - 1].location,
        waypoints: waypoints.slice(1, -1),
        optimizeWaypoints: true,
        travelMode: 'DRIVING'
    }, function(result, status) {
        if (status === 'OK') {
            directionsRenderer.setDirections(result);
        }
    });
}

// Bin Fill + Color
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

// Load Data from Firebase
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

        updateChart(data.bin1.level);
        calculateRoute(data);
    });
}

// Waste Graph
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
                        labels: {
                            color: 'white'
                        }
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

// Truck Route Optimization
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

window.onload = function() {
    loadStreetData();
    initMap();
};

// Load Default
loadStreetData();
