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
let currentBin = "bin1";

function selectStreet(street) {
    currentStreet = street;
    document.getElementById("streetTitle").innerText = street.toUpperCase() + " Bins";
    loadStreetBins();
    loadData();
}

function selectBin(bin) {
    currentBin = bin;
    loadData();
}

function loadStreetBins() {
    const bins = document.getElementsByClassName("small-bin");

    db.ref("smart_city/" + currentStreet).once("value", function(snapshot) {
        const streetData = snapshot.val();
        let i = 0;

        for (let bin in streetData) {
            let level = streetData[bin].level;

            if (level < 30) bins[i].style.background = "green";
            else if (level < 70) bins[i].style.background = "yellow";
            else bins[i].style.background = "red";

            i++;
        }
    });
}

function loadData() {
    db.ref("smart_city/" + currentStreet + "/" + currentBin)
      .on("value", function(snapshot) {

        const data = snapshot.val();

        if (data) {
            document.getElementById("level").innerText = data.level;
            document.getElementById("waste_type").innerText = data.waste_type;
            document.getElementById("status").innerText = data.status;
            document.getElementById("moisture").innerText = data.moisture_value;

            document.getElementById("fillLevel").style.height = data.level + "%";

            if (data.lid_status === "open") {
                document.getElementById("lid").style.transform = "rotate(-60deg)";
            } else {
                document.getElementById("lid").style.transform = "rotate(0deg)";
            }
        }
    });
}

function openBin() {
    document.getElementById("lid").style.transform = "rotate(-60deg)";
    db.ref("smart_city/" + currentStreet + "/" + currentBin + "/lid_command").set("open");
}

function closeBin() {
    document.getElementById("lid").style.transform = "rotate(0deg)";
    db.ref("smart_city/" + currentStreet + "/" + currentBin + "/lid_command").set("close");
}

function sendAlert() {
    db.ref("alerts/" + currentStreet + "_" + currentBin).set("FULL_BIN_ALERT");
    alert("Alert sent!");
}

loadStreetBins();
loadData();
