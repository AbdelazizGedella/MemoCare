const firebaseConfig = {
  apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
  authDomain: "ctwo-eee79.firebaseapp.com",
  projectId: "ctwo-eee79",
  storageBucket: "ctwo-eee79.appspot.com",
  messagingSenderId: "788657051205",
  appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
  measurementId: "G-4VTCQR4ZVR"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

function postMemo() {
  const title = document.getElementById("memo-title").value;
  const content = document.getElementById("memo-content").value;

  db.collection("memos").add({
    title,
    content,
    timestamp: firebase.firestore.FieldValue.serverTimestamp()
  }).then(() => {
    alert("Memo posted successfully");
    document.getElementById("memo-title").value = "";
    document.getElementById("memo-content").value = "";
  }).catch((error) => {
    alert("Error posting memo: " + error.message);
  });
}
