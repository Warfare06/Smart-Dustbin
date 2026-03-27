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
