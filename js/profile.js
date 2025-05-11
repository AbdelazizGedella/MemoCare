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



document.addEventListener("DOMContentLoaded", () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadUserSpaces(user.uid); // Pass UID to the function
        } else {
            console.error("No authenticated user found.");
        }
    });
});


// Load user spaces

function loadUserSpaces(currentUserUID) {
    db.collection("spaces").get().then(snapshot => {
        const joinedTable = document.getElementById("joined-spaces-table");
        const pendingTable = document.getElementById("pending-spaces-table");
        
        joinedTable.innerHTML = "";
        pendingTable.innerHTML = "";

        snapshot.forEach(doc => {
            const spaceData = doc.data();
            const spaceId = doc.id;

            // Check joinedParticipants and pendingParticipants, ensuring no duplicates
            const isJoined = spaceData.joinedParticipants?.includes(currentUserUID);
            const isPending = spaceData.pendingParticipants?.includes(currentUserUID);

            if (isJoined) {
                appendSpaceRow(joinedTable, spaceData);
            } else if (isPending) {
                appendSpaceRow(pendingTable, spaceData);
            }
        });
    }).catch(error => console.error("Error fetching spaces:", error));
}



function appendSpaceRow(table, spaceData) {
    db.collection("users").doc(spaceData.createdBy).get()
        .then(userDoc => {
            let creatorName = userDoc.exists ? userDoc.data().name : "Unknown User";
            
            let row = document.createElement("tr");
            row.classList.add("border-b", "border-gray-700");

            row.innerHTML = `
                <td class="p-2">${spaceData.name}</td>
                <td class="p-2">${creatorName}</td>
                <td class="p-2">${new Date(spaceData.createdAt.toDate()).toLocaleString()}</td>
            `;

            table.appendChild(row);
        })
        .catch(error => console.error("Error fetching creator name:", error));
}



document.addEventListener("DOMContentLoaded", () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadUserSpaces(user.uid);
            loadCreatedSpaces(user.uid); // Fetch spaces created by the user
        } else {
            console.error("No authenticated user found.");
        }
    });
});

function loadCreatedSpaces(currentUserUID) {
    db.collection("spaces").where("createdBy", "==", currentUserUID).get()
        .then(snapshot => {
            const createdTable = document.getElementById("created-spaces-table");
            createdTable.innerHTML = ""; // Clear previous data

            snapshot.forEach(doc => {
                const spaceData = doc.data();

                let row = document.createElement("tr");
                row.classList.add("border-b", "border-gray-700");

                row.innerHTML = `
                    <td class="p-2">${spaceData.name}</td>
                    <td class="p-2">${new Date(spaceData.createdAt.toDate()).toLocaleString()}</td>
                `;

                createdTable.appendChild(row);
            });
        })
        .catch(error => console.error("Error fetching created spaces:", error));
}



document.getElementById("toggle-update-btn2").addEventListener("click", () => {
    const updateBox = document.getElementById("update-box2");
    updateBox.classList.toggle("hidden"); // Toggle visibility
});



document.addEventListener("DOMContentLoaded", () => {
    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            loadCreatedSpaces(user.uid);
            populateSpaceDropdown(user.uid); // Load available spaces in dropdown
        } else {
            console.error("No authenticated user found.");
        }
    });
});

function populateSpaceDropdown(currentUserUID) {
    const spaceSelect = document.getElementById("space-select");

    db.collection("spaces").where("createdBy", "==", currentUserUID).get()
        .then(snapshot => {
            spaceSelect.innerHTML = ""; // Clear previous options

            snapshot.forEach(doc => {
                const spaceData = doc.data();
                let option = document.createElement("option");
                option.value = doc.id; // Store space ID
                option.textContent = spaceData.name;
                spaceSelect.appendChild(option);
            });

            if (spaceSelect.options.length === 0) {
                spaceSelect.innerHTML = `<option disabled>No spaces available</option>`;
            }
        })
        .catch(error => console.error("Error fetching spaces:", error));
}



document.getElementById("create-memo-btn").addEventListener("click", async () => {
    const title = document.getElementById("memo-title").value.trim();
    const content = document.getElementById("memo-content").value.trim();
    const spaceId = document.getElementById("space-select").value; // Get selected space ID
    const fileInput = document.getElementById("memo-file");

    if (!title || !content || !spaceId) {
        alert("Title, content, and space selection are required.");
        return;
    }

    const user = firebase.auth().currentUser;
    if (!user) {
        alert("You must be logged in.");
        return;
    }

    const userDoc = await db.collection("users").doc(user.uid).get();
    const postedBy = userDoc.exists ? userDoc.data().name : "Unknown User";

    let fileURLs = [];

    if (fileInput.files.length > 0) {
        const storageRef = firebase.storage().ref();

        for (const file of fileInput.files) {
            const fileRef = storageRef.child(`memo_attachments/${user.uid}_${file.name}`);
            await fileRef.put(file);
            const downloadURL = await fileRef.getDownloadURL();
            fileURLs.push(downloadURL);
        }
    }

    const newMemo = {
        title: title,
        content: content,
        spaceId: spaceId, // Link memo to space
        timestamp: firebase.firestore.Timestamp.now(),
        postedBy: postedBy,
        acknowledgedBy: [],
        acknowledgedDetails: [],
        attachments: fileURLs
    };

    firebase.firestore().collection("memos").add(newMemo)
        .then(() => {
            alert("✅ Memo created successfully!");
        })
        .catch((error) => {
            console.error("Error creating memo:", error);
            alert("Error creating memo: " + error.message);
        });
});
