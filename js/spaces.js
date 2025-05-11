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
  

let spacesData = []; // Store spaces globally for filtering

document.addEventListener("DOMContentLoaded", () => {
    loadSpaces();

    // Attach event listener for search
    document.getElementById("search-box").addEventListener("input", filterSpaces);
});

function loadSpaces() {
    db.collection("spaces").orderBy("createdAt", "desc").get()
        .then(snapshot => {
            spacesData = []; // Reset spaces data
            const spacesTable = document.getElementById("spaces-table");
            spacesTable.innerHTML = ""; // Clear previous data

            let fetchPromises = [];

            snapshot.forEach(doc => {
                const spaceData = doc.data();
                spaceData.id = doc.id; // Store ID in object
                spacesData.push(spaceData); // Store space for search

                // Fetch creator's name
                let fetchCreator = db.collection("users").doc(spaceData.createdBy).get()
                    .then(userDoc => {
                        if (userDoc.exists) {
                            spaceData.creatorName = userDoc.data().name; // ✅ Store correct name
                        } else {
                            spaceData.creatorName = "Unknown User";
                        }
                    })
                    .catch(error => console.error("Error fetching creator name:", error));

                fetchPromises.push(fetchCreator);
            });

            // Wait for all user names before updating UI
            Promise.all(fetchPromises).then(() => {
                renderSpaces(spacesData);
            });
        })
        .catch(error => console.error("Error loading spaces:", error));
}


function renderSpaces(spaces) {
    const spacesTable = document.getElementById("spaces-table");
    spacesTable.innerHTML = ""; // Clear previous table data

    spaces.forEach(spaceData => {
        let row = document.createElement("tr");
        row.classList.add("border-b", "border-gray-700");

        let pendingCount = spaceData.pendingParticipants ? spaceData.pendingParticipants.length : 0;
        let acceptedCount = spaceData.joinedParticipants ? spaceData.joinedParticipants.length : 0;
        let postedMemos = spaceData.postedMemos ? spaceData.postedMemos.length : 0; // Assuming `postedMemos` array exists

        row.innerHTML = `
            <td class="p-2">${spaceData.name}</td>
            <td class="p-2">${spaceData.creatorName}</td>
            <td class="p-2">${new Date(spaceData.createdAt.toDate()).toLocaleString()}</td>
            <td class="p-2">${pendingCount}</td>
            <td class="p-2">${acceptedCount}</td>
            <td class="p-2">${postedMemos}</td>
            <td class="p-2">
                <button onclick="viewSpaceDetails('${spaceData.id}')" class="bg-blue-500 px-2 py-1 rounded text-white">View</button>
            </td>
        `;

        spacesTable.appendChild(row);
    });
}





function filterSpaces() {
    const query = document.getElementById("search-box").value.toLowerCase();
    const filteredSpaces = spacesData.filter(space => space.name.toLowerCase().includes(query));
    renderSpaces(filteredSpaces);
}



// Create Space
document.getElementById("createSpaceBtn").addEventListener("click", () => {
    const currentUserUID = firebase.auth().currentUser.uid;

    // Check if the user has permission
    db.collection("users").doc(currentUserUID).get()
        .then(userDoc => {
            if (!userDoc.exists || !userDoc.data().canCreateSpaces) {
                alert("🚫 You are not authorized to create spaces.");
                return;
            }

            const spaceName = prompt("Enter space name:");
            const spaceDescription = prompt("Enter description:");

            if (spaceName && spaceDescription) {
                db.collection("spaces").add({
                    name: spaceName,
                    description: spaceDescription,
                    createdBy: currentUserUID,
                    createdAt: firebase.firestore.Timestamp.now(),
                    joinedParticipants: [currentUserUID] // Include creator's UID in participants
                })
                .then(() => {
                    alert("✅ Space created successfully!");
                    loadSpaces(); // Refresh the list
                })
                .catch(error => console.error("Error creating space:", error));
            }
        })
        .catch(error => console.error("Error checking user permissions:", error));
});



function deleteSpace(spaceId) {
    db.collection("spaces").doc(spaceId).delete()
        .then(() => {
            alert("Space deleted successfully!");
            loadSpaces(); // Refresh list
        })
        .catch(error => console.error("Error deleting space:", error));
}


function viewSpaceDetails(spaceId) {
    db.collection("spaces").doc(spaceId).get()
        .then(doc => {
            if (!doc.exists) {
                alert("Space not found.");
                return;
            }

            const spaceData = doc.data();
            const participantsPendingUIDs = spaceData.pendingParticipants || [];
            const participantsJoinedUIDs = spaceData.joinedParticipants || [];
            const createdByUID = spaceData.createdBy;
            const currentUserUID = firebase.auth().currentUser.uid;

            let fetchCreator = db.collection("users").doc(createdByUID).get();
            let fetchPendingNames = Promise.all(participantsPendingUIDs.map(uid => db.collection("users").doc(uid).get()));
            let fetchJoinedNames = Promise.all(participantsJoinedUIDs.map(uid => db.collection("users").doc(uid).get()));

            Promise.all([fetchCreator, fetchPendingNames, fetchJoinedNames])
                .then(([creatorDoc, pendingDocs, joinedDocs]) => {
                    let creatorName = creatorDoc.exists ? creatorDoc.data().name : "Unknown User";

                    let pendingNames = pendingDocs.map(userDoc => userDoc.exists ? { name: userDoc.data().name, uid: userDoc.id } : { name: "Unknown User", uid: "Unknown" });
                    let joinedNames = joinedDocs.map(userDoc => userDoc.exists ? userDoc.data().name : "Unknown User");

                    let modalContent = `
                        <h2 class="text-xl font-bold text-blue-300">${spaceData.name}</h2>
                        <p class="mt-2 text-sm text-yellow-300">Created by: ${creatorName}</p>
                        <p class="mt-2 text-gray-300">${spaceData.description}</p>

                        <h3 class="mt-4 text-lg font-bold text-indigo-300">Participants:</h3>
                        <p class="text-green-400">✔ Joined: ${joinedNames.join(", ") || "None"}</p>
                        <h3 class="mt-4 text-lg font-bold text-yellow-400">⏳ Pending Approval:</h3>
                        <ul class="text-yellow-300">
                            ${pendingNames.map(p => 
                                `<li>${p.name} 
                                    ${currentUserUID === createdByUID ? `
                                        <button onclick="approveParticipant('${spaceId}', '${p.uid}')" class="bg-green-500 px-2 py-1 rounded text-white">Approve</button>
                                        <button onclick="rejectParticipant('${spaceId}', '${p.uid}')" class="bg-red-500 px-2 py-1 rounded text-white">Reject</button>
                                    ` : ""}
                                </li>`).join("")}
                        </ul>
                    `;

                    document.getElementById("space-modal-content").innerHTML = modalContent;
                    document.getElementById("space-modal").classList.remove("hidden");

                    const joinBtn = document.getElementById("join-space-btn");
                    if (currentUserUID !== createdByUID && !participantsJoinedUIDs.includes(currentUserUID) && !participantsPendingUIDs.includes(currentUserUID)) {
                        joinBtn.style.display = "block";
                        joinBtn.onclick = () => sendJoinRequest(spaceId, currentUserUID);
                    } else {
                        joinBtn.style.display = "none"; // Hide for the creator or if already joined/pending
                    }
                })
                .catch(error => console.error("Error fetching user details:", error));
        })
        .catch(error => console.error("Error fetching space details:", error));
}






function sendJoinRequest(spaceId, userUID) {
    db.collection("spaces").doc(spaceId).update({
        pendingParticipants: firebase.firestore.FieldValue.arrayUnion(userUID)
    })
    .then(() => {
        alert("Join request sent!");
        viewSpaceDetails(spaceId); // Refresh space details
    })
    .catch(error => console.error("Error sending join request:", error));
}



// Close modal
function approveParticipant(spaceId, userUID) {
    db.collection("spaces").doc(spaceId).update({
        pendingParticipants: firebase.firestore.FieldValue.arrayRemove(userUID),
        joinedParticipants: firebase.firestore.FieldValue.arrayUnion(userUID)
    })
    .then(() => {
        alert("✅ Participant Approved!");
        viewSpaceDetails(spaceId); // Refresh modal
    })
    .catch(error => console.error("Error approving participant:", error));
}

function rejectParticipant(spaceId, userUID) {
    db.collection("spaces").doc(spaceId).update({
        pendingParticipants: firebase.firestore.FieldValue.arrayRemove(userUID)
    })
    .then(() => {
        alert("❌ Participant Rejected!");
        viewSpaceDetails(spaceId); // Refresh modal
    })
    .catch(error => console.error("Error rejecting participant:", error));
}




  //Logout
  document.addEventListener("DOMContentLoaded", () => {
    const logoutBtn = document.getElementById("logout-btn");
    
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        firebase.auth().signOut().then(() => {
          alert("Logged out successfully!");
          window.location.replace("login.html"); // Redirect to login page
        }).catch((error) => {
          console.error("Error logging out:", error);
          alert("Error logging out: " + error.message);
        });
      });
    }
  });
  

