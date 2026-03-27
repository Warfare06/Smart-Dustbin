const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  databaseURL: "YOUR_DATABASE_URL",
  projectId: "YOUR_PROJECT_ID"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

db.ref("smart_dustbin/bin1").on("value", function(snapshot) {
    const data = snapshot.val();

    document.getElementById("level").innerText = data.level + "%";
    document.getElementById("waste_type").innerText = data.waste_type;
    document.getElementById("status").innerText = data.status;
    document.getElementById("lid_status").innerText = data.lid_status;
});

function openLid() {
    db.ref("smart_dustbin/bin1/lid_command").set("open");
}
