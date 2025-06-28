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

function signup() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const phoneNumber = document.getElementById("phoneNumber").value.trim();
    if (!name || !email || !password) {
        alert("Please fill in all fields.");
        return;
    }

    firebase.auth().createUserWithEmailAndPassword(email, password)
        .then((userCredential) => {
            const user = userCredential.user;
            const userId = user.uid;
            
            // Store user data in Firestore with canCreateSpaces set to false
            return db.collection("users").doc(userId).set({
                name: name,
                email: email,
                admin: false, // Default Admin Status
                profilePic: "https://i.imgur.com/6VBx3io.png", // Default profile pic
                createdAt: new Date().toISOString(),
                phoneNumber: phoneNumber,
                canCreateSpaces: false // 🚫 Default: Users cannot create spaces
            });
        })
        .then(() => {
            alert("Signup successful!");
            window.location.href = "Dashboard.html"; // Redirect to dashboard
        })
        .catch((error) => {
            console.error("Error signing up:", error);
            alert("Signup failed: " + error.message);
        });
}
