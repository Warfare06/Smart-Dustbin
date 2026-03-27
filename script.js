const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "smart-dustbin-b43d8.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b43d8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentBin = "bin1";

function selectBin(bin) {
    currentBin = bin;

    db.ref("smart_dustbin/" + bin).on("value", function(snapshot) {
        const data = snapshot.val();

        document.getElementById("level").innerText = data.level;
        document.getElementById("waste_type").innerText = data.waste_type;
        document.getElementById("status").innerText = data.status;
        document.getElementById("moisture").innerText = data.moisture_value;

        document.getElementById("fillLevel").style.height = data.level + "%";
    });
}

function openLid() {
    db.ref("smart_dustbin/" + currentBin + "/lid_command").set("open");
}

function sendAlert() {
    db.ref("alerts/" + currentBin).set("FULL_BIN_ALERT");
}

selectBin("bin1");
