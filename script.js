const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "smart-dustbin-b43d8.firebaseapp.com",
  databaseURL: "https://smart-dustbin-b43d8-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "smart-dustbin-b43d8"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

let currentStreet = "street1";

function selectStreet(street) {
    currentStreet = street;
    document.getElementById("streetTitle").innerText =
        street.replace("street", "Street ");
    loadStreetData();
}

function setBinFill(fillId, level) {
    document.getElementById(fillId).style.height = level + "%";

    if (level < 30)
        document.getElementById(fillId).style.background = "green";
    else if (level < 70)
        document.getElementById(fillId).style.background = "yellow";
    else
        document.getElementById(fillId).style.background = "red";
}

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
    });
}

loadStreetData();
