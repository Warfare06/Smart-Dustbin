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

let currentBin = "bin1";

function selectBin(bin) {
    currentBin = bin;

    db.ref("smart_dustbin/" + bin).on("value", function(snapshot) {
        const data = snapshot.val();

        if(data){
            document.getElementById("level").innerText = data.level;
            document.getElementById("waste_type").innerText = data.waste_type;
            document.getElementById("status").innerText = data.status;
            document.getElementById("moisture").innerText = data.moisture_value;

            document.getElementById("fillLevel").style.height = data.level + "%";
        }
    });
}

function openLid() {
    db.ref("smart_dustbin/" + currentBin + "/lid_command").set("open");
}

function sendAlert() {
    db.ref("alerts/" + currentBin).set("FULL_BIN_ALERT");
}

function openBin() {
    // Lid animation
    document.getElementById("lid").style.transform = "rotate(-60deg)";

    // Send command to Firebase
    db.ref("smart_dustbin/" + currentBin + "/lid_command").set("open");
}

function closeBin() {
    // Lid animation
    document.getElementById("lid").style.transform = "rotate(0deg)";

    // Send command to Firebase
    db.ref("smart_dustbin/" + currentBin + "/lid_command").set("close");
}

function sendAlert() {
    db.ref("alerts/" + currentBin).set("FULL_BIN_ALERT");
}

selectBin("bin1");
