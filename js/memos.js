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
document.addEventListener("click", (event) => {
    if (event.target.classList.contains("view-btn")) {
        const memoId = event.target.dataset.id;
        db.collection("memos").doc(memoId).get().then((doc) => {
            if (doc.exists) {
                const memo = doc.data();
                document.getElementById("modal-title").innerText = memo.title;
                document.getElementById("modal-postedBy").innerText = `Posted By: ${memo.postedBy}`;
                document.getElementById("modal-timestamp").innerText = `Posted on: ${memo.timestamp.toDate().toLocaleString()}`;
                document.getElementById("modal-content").innerText = memo.content;
                // Set Memo ID for acknowledgment
                document.getElementById("acknowledge-btn").dataset.memoId = memoId;
                // Display attachments
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
                // Check if the user already acknowledged the memo
                const user = firebase.auth().currentUser;
                if (user) {
                    const acknowledgedEntry = memo.acknowledgedDetails?.find(entry => entry.uid === user.uid);
                    if (acknowledgedEntry) {
                        // Hide the "Acknowledge" button
                        document.getElementById("acknowledge-btn").style.display = "none";
                        // Show the acknowledgment timestamp
                        document.getElementById("acknowledgment-info").classList.remove("hidden");
                        document.getElementById("acknowledgment-timestamp").innerText = acknowledgedEntry.timestamp.toDate().toLocaleString();
                    } else {
                        // Reset acknowledgment section and show button if not acknowledged
                        document.getElementById("acknowledge-btn").style.display = "block";
                        document.getElementById("acknowledgment-info").classList.add("hidden");
                    }
                }
                document.getElementById("memo-modal").classList.remove("hidden");
            } else {
                alert("Memo not found!");
            }
        }).catch(error => {
            console.error("Error fetching memo:", error);
            alert("Failed to load memo details.");
        });
    }
});
// Close modal when "Close" is clicked
document.getElementById("close-modal").addEventListener("click", () => {
    document.getElementById("memo-modal").classList.add("hidden"); 
});
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
        return db.runTransaction(async (transaction) => {
            const memoSnap = await transaction.get(memoRef);
            const userSnap = await transaction.get(userRef);
            if (!memoSnap.exists) throw new Error("Memo not found");
            if (!userSnap.exists) throw new Error("User not found");
            const memoData = memoSnap.data();
            const acknowledgedDetails = memoData.acknowledgedDetails || [];
            if (acknowledgedDetails.some(entry => entry.uid === user.uid)) {
                alert("You have already acknowledged this memo.");
                return;
            }
            acknowledgedDetails.push({
                uid: user.uid,
                name: userSnap.data().name,
                photoURL: userSnap.data().profilePic,
                timestamp: firebase.firestore.Timestamp.now()
            });
            transaction.update(memoRef, { acknowledgedDetails });
            alert("Memo acknowledged successfully!");
            // Hide the modal after acknowledging
            document.getElementById("memo-modal").classList.add("hidden");
        });
    }).catch(error => {
        console.error("Error acknowledging memo:", error);
        alert("Failed to acknowledge memo. " + error.message);
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
