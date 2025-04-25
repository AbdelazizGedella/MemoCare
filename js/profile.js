// 🔥 Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
    authDomain: "ctwo-eee79.firebaseapp.com",
    projectId: "ctwo-eee79",
    storageBucket: "ctwo-eee79.appspot.com",
    messagingSenderId: "788657051205",
    appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
    measurementId: "G-4VTCQR4ZVR"
};

// 🔥 Initialize Firebase
firebase.initializeApp(firebaseConfig);
// 🔥 Initialize Firebase services
// 🔥 Initialize Firebase services
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage(); // FIXED: Initialize Storage

document.addEventListener("DOMContentLoaded", () => {
    // Get DOM elements
    const profilePicElement = document.getElementById("profile-pic");
    const profilePicPreviewElement = document.getElementById("profile-pic-preview");
        const profileNameElement = document.getElementById("profile-name-input");
    const profileEmailElement = document.getElementById("profile-email");
    const profileUidElement = document.getElementById("profile-uid");
    const profilePointsElement = document.getElementById("profile-points");
    const uploadBtn = document.getElementById("upload-btn");
    const fileInput = document.getElementById("profile-pic-upload");
        const updateNameBtn = document.getElementById("update-name-btn");

    auth.onAuthStateChanged((user) => {
        if (!user) return;

        const userRef = db.collection("users").doc(user.uid);

        // ✅ Real-time profile updates
        userRef.onSnapshot((doc) => {
            if (!doc.exists) {
                alert("Please enter your name and upload a profile picture to complete your profile.");
                return;
            }

            const data = doc.data();

            // ✅ Ensure profile details update properly
            profilePicElement.src = data.profilePic || "https://i.imgur.com/6VBx3io.png"; // Default avatar
            if (profilePicPreviewElement) {
                profilePicPreviewElement.src = data.profilePic || "https://i.imgur.com/6VBx3io.png"; // Preview image
            }
            profileNameElement.value = data.name || "";
            profileEmailElement.textContent = data.email || user.email;
            profileUidElement.textContent = user.uid;
            profilePointsElement.textContent = data.points || 0;
        });
    });

    // ✅ Fix: Update User Name (Remove duplicate event listener)
    updateNameBtn.addEventListener("click", async () => {
        const user = auth.currentUser;
        if (!user) {
            alert("You must be logged in!");
            return;
        }

        const nameInput = profileNameElement.value.trim();
        if (!nameInput) {
            alert("Please enter your name.");
            return;
        }

        const userRef = db.collection("users").doc(user.uid);
        try {
            await userRef.update({ name: nameInput });
            alert("Profile updated successfully!");
        } catch (error) {
            console.error("Error updating name:", error);
            alert("Failed to update name. Check console for details.");
        }
    });

    // ✅ Fix Profile Picture Upload
    uploadBtn.addEventListener("click", async () => {
        const file = fileInput.files[0];
        if (!file) return alert("Please select a file.");

        const user = auth.currentUser;
        if (!user) return alert("You must be logged in.");

        try {
            const storageRef = storage.ref(`profile_pictures/${user.uid}`);
            const snapshot = await storageRef.put(file);
            const downloadURL = await snapshot.ref.getDownloadURL();

            await db.collection("users").doc(user.uid).update({
                profilePic: downloadURL
            });

            profilePicElement.src = downloadURL;
            if (profilePicPreviewElement) {
                profilePicPreviewElement.src = downloadURL;
            }

            alert("Profile picture uploaded successfully!");
        } catch (error) {
            console.error("Upload failed:", error);
            alert("Upload failed: " + error.message);
        }
    });
});