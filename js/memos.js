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
const memoTable = document.getElementById("memo-table");
const loader = document.getElementById("loading-indicator");
const storage = firebase.storage(); // FIXED: Initialize Storage
const itemsPerPage = 15;
let lastVisible = null;
let isFetching = false; // Prevent multiple requests
// **Fetch memos when scrolling down**
function fetchMemos() {
    if (isFetching) return; // Prevent multiple calls
    isFetching = true;
    loader.style.display = "block"; // Show loading indicator

    firebase.auth().onAuthStateChanged((user) => {
        if (!user) {
            console.warn("User not logged in, status check unavailable.");
            loader.style.display = "none";
            isFetching = false;
            return;
        }

        let memoTable = document.getElementById("memo-table");
        memoTable.innerHTML = ""; // Clear previous data

        db.collection("spaces").where("joinedParticipants", "array-contains", user.uid).get()
            .then(spacesSnapshot => {
                let joinedSpaceIds = [];
                let spaceNames = {};

                spacesSnapshot.forEach(spaceDoc => {
                    joinedSpaceIds.push(spaceDoc.id);
                    spaceNames[spaceDoc.id] = spaceDoc.data().name;
                });

                if (joinedSpaceIds.length === 0) {
                    console.warn("No joined spaces found.");
                    loader.style.display = "none";
                    isFetching = false;
                    return;
                }

                // Step 2: Fetch memos and verify the space contains the user
                let query = db.collection("memos").orderBy("timestamp", "desc").limit(itemsPerPage);
                if (lastVisible) {
                    query = query.startAfter(lastVisible);
                }

                query.get().then((querySnapshot) => {
                    if (!querySnapshot.empty) {
                        querySnapshot.forEach((doc) => {
                            const memo = doc.data();
                            const memoId = doc.id;

                            // Verify spaceId exists and matches a joined space
                            if (joinedSpaceIds.includes(memo.spaceId)) {
                                const spaceName = spaceNames[memo.spaceId] || "Unknown Space";
                                const acknowledgments = memo.acknowledgedDetails ? memo.acknowledgedDetails.length : 0;
                                const timestamp = memo.timestamp ? memo.timestamp.toDate().toLocaleString() : "N/A";

                                // Check if user acknowledged memo
                                const acknowledged = memo.acknowledgedDetails?.some(entry => entry.uid === user.uid);

                                // Set button style
                                const statusButton = acknowledged 
                                    ? `<button class="bg-green-500 px-4 py-2 rounded">✅</button>` 
                                    : `<button class="bg-gray-500 px-4 py-2 rounded">❔</button>`;

                                const row = `
                                    <tr class="border-b border-gray-700">
                                        <td class="p-2">${memo.title}</td>
                                        <td class="p-2">${spaceName}</td> <!-- Display space name -->
                                        <td class="p-2">${timestamp}</td>
                                        <td class="p-2">${memo.postedBy}</td>
                                        <td class="p-2">${acknowledgments}</td>
                                        <td class="p-2">${statusButton}</td> <!-- Status -->
                                        <td class="p-2">
                                            <button class="view-btn text-blue-400 hover:underline" data-id="${memoId}">👁️ View</button>
                                        </td>
                                    </tr>
                                `;

                                memoTable.innerHTML += row;
                            }
                        });

                        lastVisible = querySnapshot.docs[querySnapshot.docs.length - 1]; // Track last document
                    } else {
                        console.warn("No memos found in joined spaces.");
                    }

                    loader.style.display = "none"; // Hide loading indicator
                    isFetching = false; // Allow next request
                }).catch(error => console.error("Error fetching memos:", error));
            })
            .catch(error => console.error("Error fetching spaces:", error));
    });
}


// **Detect scroll position & load more when reaching bottom**
window.addEventListener("scroll", () => {
    if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 100) {
        fetchMemos();
    }
});

// **Initial Load**
fetchMemos();

// SEARCH
const searchInput = document.getElementById("search-box");
const clearSearchBtn = document.getElementById("clear-search");
searchInput.addEventListener("input", () => {
    const searchTerm = searchInput.value.toLowerCase();
    const rows = document.querySelectorAll("#memo-table tr");
    rows.forEach((row) => {
        const title = row.cells[0].textContent.toLowerCase();
        row.style.display = title.includes(searchTerm) ? "" : "none";
    });
    // Show "X" only if text is entered
    clearSearchBtn.style.visibility = searchTerm ? "visible" : "hidden";
});
// Clear the search box when clicking "X"
clearSearchBtn.addEventListener("click", () => {
    searchInput.value = "";
    clearSearchBtn.style.visibility = "hidden";
    // Reset table rows to show all results
    document.querySelectorAll("#memo-table tr").forEach(row => {
        row.style.display = "";
    });
    // Refocus on search box after clearing
    searchInput.focus();
});
// **View Memo Details in Modal**
document.addEventListener("click", async (event) => {
  if (event.target.classList.contains("view-btn")) {
    const memoId = event.target.dataset.id;
    try {
      const memoDoc = await db.collection("memos").doc(memoId).get();
      if (!memoDoc.exists) {
        alert("Memo not found!");
        return;
      }
      const memo = memoDoc.data();

      // Show memo basic info
      document.getElementById("modal-title").innerText = memo.title;
      document.getElementById("modal-postedBy").innerText = `Posted By: ${memo.postedBy}`;
      document.getElementById("modal-timestamp").innerText = `Posted on: ${memo.timestamp.toDate().toLocaleString()}`;
      document.getElementById("modal-content").innerText = memo.content;

      // Set Memo ID for acknowledgment button
      const acknowledgeBtn = document.getElementById("acknowledge-btn");
      acknowledgeBtn.dataset.memoId = memoId;

      // Show attachments
      const attachmentsDiv = document.getElementById("modal-attachments");
      attachmentsDiv.innerHTML = "";
      memo.attachments?.forEach(url => {
        const link = document.createElement("a");
        link.href = url;
        link.target = "_blank";
        link.classList.add("text-blue-300", "underline", "block", "mt-2");
        link.innerText = "📎 View Attachment";
        attachmentsDiv.appendChild(link);
      });

// Fetch the space doc to get joinedParticipants
const spaceDoc = await db.collection("spaces").doc(memo.spaceId).get();
const joinedParticipants = spaceDoc.exists ? spaceDoc.data().joinedParticipants || [] : [];

// التحقق من صلاحيات الأدمن
const currentUser = firebase.auth().currentUser;
const isAdmin = currentUser && spaceDoc.exists && spaceDoc.data().createdBy === currentUser.uid;

// إظهار زر التقرير لو المستخدم أدمن
const reportBtn = document.getElementById("report-modal");
if (reportBtn) {
  reportBtn.style.display = isAdmin ? "block" : "none";
}

// Get arrays of UIDs who acknowledged
const acknowledgedUIDs = (memo.acknowledgedDetails || []).map(entry => entry.uid);

// Helper: Fetch user details for given uids
async function fetchUsersInfo(uids) {
  if (uids.length === 0) return [];
  const usersSnapshots = await db.collection("users").where(firebase.firestore.FieldPath.documentId(), "in", uids).get();
  return usersSnapshots.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
}

// Fetch user info
const acknowledgedUsers = await fetchUsersInfo(acknowledgedUIDs);
const pendingUIDs = joinedParticipants.filter(uid => !acknowledgedUIDs.includes(uid));
const pendingUsers = await fetchUsersInfo(pendingUIDs);

// عرض قائمة Acknowledged فقط لو أدمن
const ackListDiv = document.getElementById("acknowledgment-list");
ackListDiv.innerHTML = "";

if (isAdmin) {
  if (acknowledgedUsers.length > 0) {
    const title = document.createElement("h4");
    title.textContent = "Acknowledged By:";
    title.classList.add("font-semibold", "mb-2");
    ackListDiv.appendChild(title);

    acknowledgedUsers.forEach(user => {
      const ackDetail = (memo.acknowledgedDetails || []).find(a => a.uid === user.uid);
      const ackTime = ackDetail?.timestamp?.toDate().toLocaleString() || "N/A";

      const item = document.createElement("div");
      item.classList.add("flex", "items-center", "space-x-3", "mb-1");

      const img = document.createElement("img");
      img.src = user.profilePic || "https://i.imgur.com/6VBx3io.png";
      img.alt = user.name;
      img.classList.add("w-10", "h-10", "rounded-full", "object-cover");

      const info = document.createElement("div");
      info.innerHTML = `<p class="font-semibold">${user.name}</p><p class="text-xs text-gray-400">${ackTime}</p>`;

      item.appendChild(img);
      item.appendChild(info);
      ackListDiv.appendChild(item);
    });
  } else {
    ackListDiv.innerHTML = "<p class='text-gray-400'>No acknowledgments yet.</p>";
  }
}

// عرض قائمة Pending فقط لو أدمن
const pendingListDiv = document.getElementById("pending-list");
pendingListDiv.innerHTML = "";

if (isAdmin) {
  if (pendingUsers.length > 0) {
    const title = document.createElement("h4");
    title.textContent = "Pending Acknowledgment:";
    title.classList.add("font-semibold", "mb-2", "mt-4");
    pendingListDiv.appendChild(title);

    pendingUsers.forEach(user => {
      const item = document.createElement("div");
      item.classList.add("flex", "items-center", "space-x-3", "mb-1");

      const img = document.createElement("img");
      img.src = user.profilePic || "https://i.imgur.com/6VBx3io.png";
      img.alt = user.name;
      img.classList.add("w-10", "h-10", "rounded-full", "object-cover");

      const info = document.createElement("div");
      info.innerHTML = `<p class="font-semibold">${user.name}</p>`;

      item.appendChild(img);
      item.appendChild(info);
      pendingListDiv.appendChild(item);
    });
  } else {
    pendingListDiv.innerHTML = "<p class='text-gray-400'>All users have acknowledged.</p>";
  }
}

      // Check if current user acknowledged, show/hide acknowledge button accordingly
      if (currentUser) {
        const acknowledgedEntry = (memo.acknowledgedDetails || []).find(entry => entry.uid === currentUser.uid);
        if (acknowledgedEntry) {
          acknowledgeBtn.style.display = "none";
          document.getElementById("acknowledgment-info").classList.remove("hidden");
          document.getElementById("acknowledgment-timestamp").innerText = acknowledgedEntry.timestamp.toDate().toLocaleString();
        } else {
          acknowledgeBtn.style.display = "block";
          document.getElementById("acknowledgment-info").classList.add("hidden");
        }
      }

      // Show the modal
      document.getElementById("memo-modal").classList.remove("hidden");

    } catch (error) {
      console.error("Error fetching memo details:", error);
      alert("Failed to load memo details.");
    }
  }
});








// Close modal when "Close" is clicked
document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("memo-modal").classList.add("hidden"); 
});
// Handle memo acknowledgment
// Handle memo acknowledgment
document.getElementById("acknowledge-btn").addEventListener("click", () => {
    const memoId = document.getElementById("acknowledge-btn").dataset.memoId;  // ✅ FIX: Get Memo ID Properly
    const user = firebase.auth().currentUser;
    if (!user) {
        alert("Please log in to acknowledge this memo.");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);
    const memoRef = db.collection("memos").doc(memoId);
    const timestamp = firebase.firestore.Timestamp.now();

    const newAck = {
        uid: user.uid,
        name: user.displayName || "Unknown",
        photoURL: user.photoURL || null,
        timestamp: timestamp
    };

    // Ensure user profile exists
    userRef.get().then(async (userDoc) => {
        if (!userDoc.exists) {
            await userRef.set({
                name: user.displayName || "Unknown",
                email: user.email,
                profilePic: user.photoURL || null,
                points: 0,
                acknowledgedMemos: []
            });
        }

        // Update memo and user docs
        const batch = db.batch();

        batch.update(memoRef, {
            acknowledgedDetails: firebase.firestore.FieldValue.arrayUnion(newAck)
        });

        batch.update(userRef, {
            acknowledgedMemos: firebase.firestore.FieldValue.arrayUnion(memoId)
        });

        batch.commit().then(() => {
            // Show UI update
            alert("Memo acknowledged successfully!");

            // Hide acknowledge button and show timestamp
            document.getElementById("acknowledge-btn").style.display = "none";
            const ackInfo = document.getElementById("acknowledgment-info");
            ackInfo.classList.remove("hidden");
            document.getElementById("acknowledgment-timestamp").innerText = new Date().toLocaleString();

            // Optionally: Close modal if desired
            // document.getElementById("memo-modal").classList.add("hidden");
        }).catch((error) => {
            console.error("Error during acknowledgment:", error);
            alert("Failed to acknowledge memo. " + error.message);
        });
    }).catch(error => {
        console.error("Error fetching user doc:", error);
        alert("Failed to load user profile. " + error.message);
    });
});
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
// **Filter Memos by Timestamp and Status**
document.getElementById("filter-timestamp").addEventListener("click", () => {
    const rows = Array.from(document.querySelectorAll("#memo-table tr"));
    rows.sort((a, b) => {
        const timestampA = new Date(a.cells[1].textContent); // Timestamp column
        const timestampB = new Date(b.cells[1].textContent);
        return timestampB - timestampA; // Sort newest first
    });
    document.getElementById("memo-table").innerHTML = ""; // Clear table
    rows.forEach(row => document.getElementById("memo-table").appendChild(row));
});
document.getElementById("filter-status").addEventListener("click", () => {
    document.querySelectorAll("#memo-table tr").forEach(row => {
        const status = row.cells[4].textContent.trim(); // Status column
        row.style.display = status.includes("❔") ? "" : "none"; // Show only "Not Acknowledged"
    });
});
document.getElementById("reset-filters").addEventListener("click", () => {
    document.querySelectorAll("#memo-table tr").forEach(row => {
        row.style.display = ""; // Reset visibility
    });
});




