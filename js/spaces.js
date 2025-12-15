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


function showToast(type, message) {
  let host = document.getElementById("toastContainer") || document.getElementById("toasts");
  if (!host) {
    host = document.createElement("div");
    host.id = "toastContainer";
    host.className = "toast toast-end toast-bottom z-[9999]";
    document.body.appendChild(host);
  }

  const alert = document.createElement("div");
  const cls =
    type === "success" ? "alert-success" :
    type === "warning" ? "alert-warning" :
    type === "info"    ? "alert-info"    : "alert-error";

  alert.className = `alert ${cls} shadow-lg`;
  alert.innerHTML = `<span>${message}</span>`;

  host.appendChild(alert);
  setTimeout(() => alert.remove(), 3500);
}

function setBtnLoading(btn, isLoading, text) {
  if (!btn) return;
  btn.disabled = !!isLoading;
  btn.classList.toggle("loading", !!isLoading); // DaisyUI loading
  if (text) btn.dataset._oldText ??= btn.textContent;
  if (text && isLoading) btn.textContent = text;
  if (!isLoading && btn.dataset._oldText) btn.textContent = btn.dataset._oldText;
}


let unsubSpaces = null;

function loadSpaces() {
  if (unsubSpaces) return; // already listening

  unsubSpaces = db.collection("spaces")
    .orderBy("createdAt", "desc")
    .onSnapshot((snapshot) => {
      spacesData = [];
      const spacesTable = document.getElementById("spaces-table");
      spacesTable.innerHTML = "";

      const fetchPromises = [];

      snapshot.forEach((doc) => {
        const spaceData = doc.data();
        spaceData.id = doc.id;
        spacesData.push(spaceData);

        const p = db.collection("users").doc(spaceData.createdBy).get()
          .then((userDoc) => {
            spaceData.creatorName = userDoc.exists ? (userDoc.data().name || "Unknown User") : "Unknown User";
          })
          .catch(() => { spaceData.creatorName = "Unknown User"; });

        fetchPromises.push(p);
      });

      Promise.all(fetchPromises).then(() => renderSpaces(spacesData));
    }, (error) => {
      console.error("Error loading spaces:", error);
      showToast("error", "❌ Error loading spaces: " + (error.message || error));
    });
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

                    let pendingNames = pendingDocs.map((userDoc, i) => {
                        return userDoc.exists
                            ? { index: i + 1, name: userDoc.data().name, uid: userDoc.id }
                            : { index: i + 1, name: "Unknown User", uid: "Unknown" };
                    });

                    let joinedNames = joinedDocs.map((userDoc, i) =>
                        `${i + 1}. ${userDoc.exists ? userDoc.data().name : "Unknown User"}`
                    );

                    let modalContent = `
                        <h2 class="text-xl font-bold text-blue-300">${spaceData.name}</h2>
                        <p class="mt-2 text-sm text-yellow-300">Created by: ${creatorName}</p>
                        <p class="mt-2 text-gray-300">${spaceData.description}</p>

                        <h3 class="mt-4 text-lg font-bold text-indigo-300">Participants:</h3>
                        <p class="text-green-400">✔ Joined:<br> ${joinedNames.join("<br>") || "None"}</p>

                        <h3 class="mt-4 text-lg font-bold text-yellow-400">⏳ Pending Approval:</h3>
                        <ul class="text-yellow-300">
                            ${pendingNames.map(p => `
                                <li>${p.index}. ${p.name}
                                    ${currentUserUID === createdByUID ? `
                                        <button onclick="approveParticipant('${spaceId}', '${p.uid}')" class="bg-green-500 px-2 py-1 ml-2 rounded text-white">Approve</button>
                                        <button onclick="rejectParticipant('${spaceId}', '${p.uid}')" class="bg-red-500 px-2 py-1 ml-1 rounded text-white">Reject</button>
                                    ` : ""}
                                </li>
                            `).join("")}
                        </ul>
                    `;

document.getElementById("space-modal-content").innerHTML = modalContent;
document.getElementById("space-modal").classList.remove("hidden");

const joinBtn = document.getElementById("join-space-btn");

// ✅ لو المستخدم هو صاحب الـ space → أظهر زر إدارة المشاركين
if (currentUserUID === createdByUID || (spaceData.admins && spaceData.admins.includes(currentUserUID))) {

    const manageBtn = document.createElement("button");
    manageBtn.textContent = "🛠 Manage Participants";
    manageBtn.className = "bg-yellow-500 px-4 py-2 mt-4 rounded w-full";
    manageBtn.onclick = () => {
        window.location.href = `space-details.html?spaceId=${spaceId}`;
    };
    document.getElementById("space-modal-content").appendChild(manageBtn);
}

// ✅ لو المستخدم مش صاحب الـ space ومش ضمن المشاركين → أظهر زر الانضمام
if (
    currentUserUID !== createdByUID &&
    !participantsJoinedUIDs.includes(currentUserUID) &&
    !participantsPendingUIDs.includes(currentUserUID)
) {
    joinBtn.style.display = "block";
    joinBtn.onclick = () => sendJoinRequest(spaceId, currentUserUID);
} else {
    joinBtn.style.display = "none";
}
                })
                .catch(error => console.error("Error fetching user details:", error));
        })
        .catch(error => console.error("Error fetching space details:", error));
}





function sendJoinRequest(spaceId, userUID) {
  if (!userUID) { showToast("warning", "⚠️ Please login first."); return; }

  const btn = document.getElementById("join-space-btn");
  setBtnLoading(btn, true, "Requesting...");

  db.collection("spaces").doc(spaceId).update({
    pendingParticipants: firebase.firestore.FieldValue.arrayUnion(userUID)
  })
  .then(() => {
    showToast("success", "✅ Join request sent!");
    viewSpaceDetails(spaceId);
  })
  .catch((error) => {
    console.error("Error sending join request:", error);
    showToast("error", `❌ Join request failed: ${error.code || ""} ${error.message || error}`);
  })
  .finally(() => setBtnLoading(btn, false));
}

function approveParticipant(spaceId, userUID) {
  db.collection("spaces").doc(spaceId).update({
    pendingParticipants: firebase.firestore.FieldValue.arrayRemove(userUID),
    joinedParticipants: firebase.firestore.FieldValue.arrayUnion(userUID)
  })
  .then(() => {
    showToast("success", "✅ Participant approved!");
    viewSpaceDetails(spaceId);
  })
  .catch((error) => {
    console.error("Error approving participant:", error);
    showToast("error", `❌ Approve failed: ${error.code || ""} ${error.message || error}`);
  });
}

function rejectParticipant(spaceId, userUID) {
  db.collection("spaces").doc(spaceId).update({
    pendingParticipants: firebase.firestore.FieldValue.arrayRemove(userUID)
  })
  .then(() => {
    showToast("warning", "❌ Participant rejected!");
    viewSpaceDetails(spaceId);
  })
  .catch((error) => {
    console.error("Error rejecting participant:", error);
    showToast("error", `❌ Reject failed: ${error.code || ""} ${error.message || error}`);
  });
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
  


// request space creation permission
document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            const currentUserUID = user.uid;
            checkUserPermission(currentUserUID);
        } else {
            document.getElementById("statusMessage").innerText = "⚠️ Please log in.";
        }
    });
});


// Check user permission
document.addEventListener("DOMContentLoaded", () => {
    const canCreateSpacesElement = document.getElementById("canCreateSpaces");
    const requestSpaceBtn = document.getElementById("requestSpaceBtn"); // Add a button for applying

    auth.onAuthStateChanged((user) => {
        if (!user) return;

        db.collection("users").doc(user.uid).get().then((doc) => {
            if (doc.exists) {
                const canCreateSpaces = doc.data().canCreateSpaces;
                
                // ✅ Display status with emojis
                if (canCreateSpaces === true) {
                    canCreateSpacesElement.innerHTML = "✅ You’ve got the ability to create spaces!";
                    requestSpaceBtn.classList.add("hidden"); // Hide request button
                } else if (canCreateSpaces === false) {
                    canCreateSpacesElement.innerHTML = "🚫 You don’t have the ability to create spaces.";
                    requestSpaceBtn.classList.remove("hidden"); // Show request button
                } else {
                    canCreateSpacesElement.innerHTML = "⏳ Pending admin approval...";
                    requestSpaceBtn.classList.add("hidden"); // Hide request button while waiting
                }
            } else {
                console.error("User document not found.");
            }
        }).catch(error => console.error("Error fetching user data:", error));
    });

    // Handle request submission
requestSpaceBtn.addEventListener("click", () => {
    auth.onAuthStateChanged((user) => {
        if (!user) return;

        db.collection("users").doc(user.uid).update({
            pendingSpacesCreationRequest: {
                requestedAt: firebase.firestore.Timestamp.now(),
                status: "pending"
            }
        }).then(() => {
            alert("⏳ Request submitted! Waiting for admin approval.");
            requestSpaceBtn.classList.add("hidden");
            canCreateSpacesElement.innerHTML = "⏳ Pending admin approval...";
        }).catch(error => console.error("Error submitting request:", error));
    });
});

});

