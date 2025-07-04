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
        if (!lastVisible) { // Only clear on initial load
            memoTable.innerHTML = ""; // Clear previous data
        }

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
        timestamp: timestamp
    };

    // Ensure user profile exists
    userRef.get().then(async (userDoc) => {
        if (!userDoc.exists) {
            await userRef.set({
                email: user.email,
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





// ✅ إضافة الزر في HTML موجود مسبقًا (check-overall-btn)
// ✅ إضافة modal في HTML موجود مسبقًا (overall-compliance-modal)
// الكود الكامل بعد الضغط على الزر


document.addEventListener("DOMContentLoaded", () => {
  const checkBtn = document.getElementById("check-overall-btn");
  const modal = document.getElementById("overall-compliance-modal");
  const contentDiv = document.getElementById("overall-compliance-content");

  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;

    const spacesSnapshot = await db.collection("spaces").where("createdBy", "==", user.uid).get();
    if (spacesSnapshot.empty) return;

    checkBtn.style.display = "inline-block";

    checkBtn.addEventListener("click", async () => {
      contentDiv.innerHTML = "<p class='text-gray-300'>Loading data...</p>";
      modal.classList.remove("hidden");

      let html = "";

      for (const spaceDoc of spacesSnapshot.docs) {
        const spaceData = spaceDoc.data();
        const spaceId = spaceDoc.id;
        const spaceName = spaceData.name || "Unnamed Space";
        const participants = spaceData.joinedParticipants || [];

        const memosSnapshot = await db.collection("memos").where("spaceId", "==", spaceId).get();
        const totalMemos = memosSnapshot.size;

        const ackCount = {};
        const userUnackMemos = {};
        participants.forEach(uid => {
          ackCount[uid] = 0;
          userUnackMemos[uid] = [];
        });

        memosSnapshot.forEach(memoDoc => {
          const memoData = memoDoc.data();
          const ackDetails = memoData.acknowledgedDetails || [];
          participants.forEach(uid => {
            const acknowledged = ackDetails.some(entry => entry.uid === uid);
            if (acknowledged) {
              ackCount[uid]++;
            } else {
              userUnackMemos[uid].push(memoData.title || "Untitled Memo");
            }
          });
        });

        const userDocs = await db.collection("users").where(firebase.firestore.FieldPath.documentId(), "in", participants).get();

        let table = `
          <div class="mb-6">
            <h3 class="text-lg font-semibold text-indigo-300 mb-2">📁 ${spaceName}</h3>
            <table class="w-full text-left border border-gray-600 text-white">
              <thead class="bg-gray-700">
                <tr>
                  <th class="p-2">User</th>
                  <th class="p-2">Acknowledged</th>
                  <th class="p-2">Total Memos</th>
                  <th class="p-2">Compliance %</th>
                </tr>
              </thead>
              <tbody>
        `;

        userDocs.forEach(userDoc => {
          const uid = userDoc.id;
          const user = userDoc.data();
          const name = user.name || user.email || "Unknown";
          const acknowledged = ackCount[uid];
          const percentage = totalMemos > 0 ? ((acknowledged / totalMemos) * 100).toFixed(1) : 0;
          const color = percentage >= 80 ? "text-green-400" : percentage >= 50 ? "text-yellow-400" : "text-red-400";

          const unacknowledgedTitles = userUnackMemos[uid];
          const tooltipText = unacknowledgedTitles.length > 0
            ? unacknowledgedTitles.map(t => `• ${t}`).join('\n')
            : "✅ Acknowledged All";

          table += `
            <tr class="border-b border-gray-700">
              <td class="p-2">
                <span title="${tooltipText.replace(/"/g, '&quot;')}" class="underline cursor-help hover:text-blue-300">
                  ${name}
                </span>
              </td>
              <td class="p-2">${acknowledged}</td>
              <td class="p-2">${totalMemos}</td>
              <td class="p-2 font-bold ${color}">${percentage}%</td>
            </tr>
          `;
        });

        table += "</tbody></table></div>";
        html += table;
      }

      contentDiv.innerHTML = html || "<p class='text-red-400'>No data available.</p>";
    });
  });
});





    // ✅ Firebase Auth Listener + Latest Acknowledge Fetch
  firebase.auth().onAuthStateChanged(async (user) => {
    if (!user) return;

    try {
      const memosSnapshot = await db.collection("memos").get();
      const latestAcknowledges = [];

      memosSnapshot.forEach(doc => {
        const memo = doc.data();
        const title = memo.title || "Untitled Memo";

        (memo.acknowledgedDetails || []).forEach(entry => {
          if (entry.timestamp && entry.uid) {
            latestAcknowledges.push({
              memoTitle: title,
              uid: entry.uid,
              timestamp: entry.timestamp.toDate()
            });
          }
        });
      });

      // Sort by timestamp descending
      latestAcknowledges.sort((a, b) => b.timestamp - a.timestamp);
      const top3 = latestAcknowledges.slice(0, 3);

      // Fetch usernames
      const uids = [...new Set(top3.map(x => x.uid))];
      const userSnapshots = await db.collection("users")
        .where(firebase.firestore.FieldPath.documentId(), "in", uids).get();

      const uidToName = {};
      userSnapshots.forEach(doc => {
        const data = doc.data();
        uidToName[doc.id] = data.name || data.email || "Unknown";
      });

      // Render Notification List
      const notificationList = document.getElementById("notification-list");
      notificationList.innerHTML = "";

      top3.forEach(entry => {
        const name = uidToName[entry.uid] || "Unknown";
        const memoTitle = entry.memoTitle;
        const timeString = entry.timestamp.toLocaleString();

        const item = document.createElement("li");
        item.innerHTML = `
          <span class="text-yellow-400 font-semibold">${name}</span>
          acknowledged
          <span class="text-green-400 font-semibold">"${memoTitle}"</span>
          <span class="text-gray-400 text-xs">at ${timeString}</span>
        `;
        notificationList.appendChild(item);
      });
    } catch (err) {
      console.error("Error loading latest acknowledgments", err);
    }
  });

  // 🔄 Show All Notifications Button
  document.getElementById("show-all-notifications").addEventListener("click", async () => {
    try {
      const memosSnapshot = await db.collection("memos").get();
      const allAcknowledges = [];

      memosSnapshot.forEach(doc => {
        const memo = doc.data();
        const title = memo.title || "Untitled Memo";

        (memo.acknowledgedDetails || []).forEach(entry => {
          if (entry.timestamp && entry.uid) {
            allAcknowledges.push({
              memoTitle: title,
              uid: entry.uid,
              timestamp: entry.timestamp.toDate()
            });
          }
        });
      });

      allAcknowledges.sort((a, b) => b.timestamp - a.timestamp);

      const uids = [...new Set(allAcknowledges.map(x => x.uid))];
      const userSnapshots = await db.collection("users")
        .where(firebase.firestore.FieldPath.documentId(), "in", uids).get();

      const uidToName = {};
      userSnapshots.forEach(doc => {
        const data = doc.data();
        uidToName[doc.id] = data.name || data.email || "Unknown";
      });

      const notificationList = document.getElementById("notification-list");
      notificationList.innerHTML = "";

      allAcknowledges.forEach(entry => {
        const name = uidToName[entry.uid] || "Unknown";
        const memoTitle = entry.memoTitle;
        const timeString = entry.timestamp.toLocaleString();

        const item = document.createElement("li");
        item.innerHTML = `
          <span class="text-yellow-400 font-semibold">${name}</span>
          acknowledged
          <span class="text-green-400 font-semibold">"${memoTitle}"</span>
          <span class="text-gray-400 text-xs">at ${timeString}</span>
        `;
        notificationList.appendChild(item);
      });
    } catch (err) {
      console.error("Error fetching all notifications:", err);
    }
  });
