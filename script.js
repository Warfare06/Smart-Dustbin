// Firebase Configuration
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "smart-dustbin-b43d8.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b43d8",
  storageBucket: "smart-dustbin-b43d8.firebasestorage.app",
  messagingSenderId: "795207450873",
  appId: "1:795207450873:web:4f9f60a11f6fced31902228"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Current street and bin
let currentStreet = "street1";
let currentBin = "bin1";

// Select Street
function selectStreet(street) {
    currentStreet = street;
    loadData();
}

// Select Bin
function selectBin(bin) {
    currentBin = bin;
    loadData();
}

// Load Data from Firebase
function loadData() {
    db.ref("smart_city/" + currentStreet + "/" + currentBin)
      .on("value", function(snapshot) {

        const data = snapshot.val();

        if (data) {
            document.getElementById("level").innerText = data.level;
            document.getElementById("waste_type").innerText = data.waste_type;
            document.getElementById("status").innerText = data.status;
            document.getElementById("moisture").innerText = data.moisture_value;

            // Fill bin animation
            document.getElementById("fillLevel").style.height = data.level + "%";

            // Lid status animation
            if (data.lid_status === "open") {
                document.getElementById("lid").style.transform = "rotate(-60deg)";
            } else {
                document.getElementById("lid").style.transform = "rotate(0deg)";
            }
        }
    });
}

// Open Lid
function openBin() {
    document.getElementById("lid").style.transform = "rotate(-60deg)";
    db.ref("smart_city/" + currentStreet + "/" + currentBin + "/lid_command").set("open");
}

// Close Lid
function closeBin() {
    document.getElementById("lid").style.transform = "rotate(0deg)";
    db.ref("smart_city/" + currentStreet + "/" + currentBin + "/lid_command").set("close");
}

// Send Alert
function sendAlert() {
    db.ref("alerts/" + currentStreet + "_" + currentBin).set("FULL_BIN_ALERT");
    alert("Alert sent for " + currentStreet + " " + currentBin);
}

// Load default data on start
loadData();
