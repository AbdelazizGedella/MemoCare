const firebaseConfig = {
  apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
  authDomain: "ctwo-eee79.firebaseapp.com",
  projectId: "ctwo-eee79",
  storageBucket: "ctwo-eee79.appspot.com",
  messagingSenderId: "788657051205",
  appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
  measurementId: "G-4VTCQR4ZVR"
};
// Ensure Firebase initializes only once
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();
const auth = firebase.auth();
const storage = firebase.storage();


document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserSpaces(user.uid);
            loadAdminRequests(user.uid); // ✅ Load requests only if user is an admin
        } else {
            console.error("No authenticated user found.");
        }
    });
    document.getElementById("submit-request-btn").addEventListener("click", async () => {
        await submitRequest();
        // Only show this dialog (remove any other dialog logic)
        const dialog = document.createElement("div");
        dialog.style.position = "fixed";
        dialog.style.top = "50%";
        dialog.style.left = "50%";
        dialog.style.transform = "translate(-50%, -50%)";
        dialog.style.background = "#222";
        dialog.style.color = "#fff";
        dialog.style.padding = "32px 48px";
        dialog.style.borderRadius = "12px";
        dialog.style.boxShadow = "0 4px 24px rgba(0,0,0,0.2)";
        dialog.style.fontSize = "1.25rem";
        dialog.style.zIndex = "9999";
        dialog.innerHTML = `<span style="font-size:2rem;vertical-align:middle;">✅</span> Request submitted successfully!`;
        document.body.appendChild(dialog);

        setTimeout(() => {
            dialog.remove();
            window.location.reload();
        }, 1500);
    });
});



// ✅ Fetch Spaces the User Is In
function loadUserSpaces(currentUserUID) {
    db.collection("spaces").where("joinedParticipants", "array-contains", currentUserUID).get()
        .then(snapshot => {
            const spaceSelect = document.getElementById("space-select");
            spaceSelect.innerHTML = "";
            snapshot.forEach(doc => {
                const spaceData = doc.data();
                const option = document.createElement("option");
                option.value = doc.id; // 🔥 Space ID
                option.textContent = spaceData.name;
                spaceSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Error fetching joined spaces:", error));
}


// ✅ Submit a Request with Space & Admin Details
async function submitRequest() {
    const title = document.getElementById("request-title").value.trim();

    const description = document.getElementById("request-description").value.trim();
    const files = document.getElementById("request-file").files;
    const spaceId = document.getElementById("space-select").value;
    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in to submit a request.");
        return;
    }
    if (!title || !description || !spaceId) {
        alert("Please fill in all fields.");
        return;
    }
    try {
        const spaceRef = db.collection("spaces").doc(spaceId);
        const spaceDoc = await spaceRef.get();
        if (!spaceDoc.exists) {
            alert("Selected space not found.");
            return;
        }
        const adminId = spaceDoc.data().createdBy; // 🔥 Get Admin ID
        const adminRef = db.collection("users").doc(adminId);
        const adminDoc = await adminRef.get();
        const adminName = adminDoc.exists ? adminDoc.data().name : "Unknown Admin";
        // 🔥 Prepare request data
        const requestRef = db.collection("requests").doc();
        const requestId = requestRef.id;
        let attachmentUrls = [];
        // ✅ Upload Attachments to Firebase Storage
        let uploadPromises = [];
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            const storageRef = storage.ref(`requests/${requestId}/${file.name}`);
            const uploadTask = storageRef.put(file).then(async () => {
                const fileUrl = await storageRef.getDownloadURL();
                attachmentUrls.push(fileUrl);
            });
            uploadPromises.push(uploadTask);
        }
        await Promise.all(uploadPromises);
        // ✅ Save Request to Firestore
        await requestRef.set({
            title,
            
            description,
            attachments: attachmentUrls,
            createdAt: firebase.firestore.FieldValue.serverTimestamp(),
            status: "pending",
            space: {
                id: spaceId,
                name: spaceDoc.data().name,
                adminId: adminId,
                adminName: adminName
            },
            approvals: [{ adminId: adminId, adminName: adminName, decision: "pending" }],
            discussion: [],
            userId: user.uid
        });
        alert("Request submitted successfully!");
        document.getElementById("request-title").value = "";
        document.getElementById("request-description").value = "";
        document.getElementById("request-file").value = "";
    } catch (error) {
        console.error("Error submitting request:", error);
        alert("Failed to submit request.");
    }
}



// access to status and date for each request
function loadAdminRequests(userId) {
    db.collection("requests").where("userId", "==", userId).get()
        .then(snapshot => {
            let requestTable = document.getElementById("request-table");
            requestTable.innerHTML = "";
            snapshot.forEach(doc => {
                const requestData = doc.data();
                const requestRow = document.createElement("tr");
                requestRow.innerHTML = `
                    <td class="p-2">${requestData.title || "Untitled Request"}</td>
                    <td class="p-2 ${requestData.status === 'fulfilled' ? 'text-green-400' : requestData.status === 'rejected' ? 'text-red-400' : 'text-yellow-400'}">${requestData.status || "Pending"}</td>
                    <td class="p-2">${requestData.createdAt ? new Date(requestData.createdAt.seconds * 1000).toLocaleDateString() : "Unknown Date"}</td>
                    <td class="p-2">
                        <button class="bg-blue-500 px-3 py-1 text-sm rounded" onclick="showRequestDetails('${doc.id}')">🔍 View</button>
                    </td>
                `;
                requestTable.appendChild(requestRow);
            });
        })
        .catch(error => console.error("Error loading admin requests:", error));
}




    // ✅ Load User Requests count for Dashboard
    document.addEventListener("DOMContentLoaded", () => {
        auth.onAuthStateChanged(user => {
            if (user) {
                loadUserProfile(user);
                loadUserRequests(user.uid);
                loadRequestStats(user.uid);
            } else {
                alert("You must be logged in to view your requests.");
            }
        });
    });
    // ✅ Load User Profile Info
// ✅ Load User Profile from Firestore
function loadUserProfile(user) {
    const userRef = db.collection("users").doc(user.uid);

    userRef.get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            document.getElementById("profile-name").textContent = data.name || "User"; // 🔥 Correctly gets stored name
            document.getElementById("profile-picture").src = data.profilePic || user.photoURL || "default-avatar.png";
        } else {
            console.error("User profile not found in Firestore.");
        }
    }).catch((error) => {
        console.error("Error loading user profile:", error);
    });
}
// ✅ Function to Load & Count User Requests for Dashboard
function loadRequestStats(userId) {
    db.collection("requests").where("userId", "==", userId).get()
        .then(snapshot => {
            let pendingCount = 0, resolvedCount = 0, rejectedCount = 0, totalCount = 0;
            snapshot.forEach(doc => {
                const requestData = doc.data();
                totalCount++; // Count total requests
                // ✅ Count requests based on status
                if (requestData.status === "pending") pendingCount++;
                else if (requestData.status === "approved") resolvedCount++;
                else if (requestData.status === "rejected") rejectedCount++;
            });
            // ✅ Update Dashboard UI
            document.getElementById("pending-count").textContent = pendingCount;
            document.getElementById("resolved-count").textContent = resolvedCount;
            document.getElementById("rejected-count").textContent = rejectedCount;
            document.getElementById("total-count").textContent = totalCount;
        })
        .catch(error => console.error("Error loading request stats:", error));
}
// ✅ Ensure the function runs when the user logs in
auth.onAuthStateChanged(user => {
    if (user) {
        loadUserProfile(user);
        loadUserRequests(user.uid);
        loadRequestStats(user.uid);
    } else {
        alert("You must be logged in to view your requests.");
    }
});


// ✅ Load User Profile Info
function loadUserProfile(user) {
    const userRef = db.collection("users").doc(user.uid);
    userRef.onSnapshot(doc => {
        if (!doc.exists) {
            alert("Please complete your profile!");
            return;
        }
        const data = doc.data();
        document.getElementById("profile-pic").src = data.profilePic || "https://i.imgur.com/6VBx3io.png"; // Default avatar
        document.getElementById("profile-name").textContent = data.name || "User";
    });
}




document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserRequests(user.uid);
        } else {
            alert("You must be logged in to view your requests.");
        }
    });
});
// ✅ Load Requests for on table
function loadUserRequests(userId) {
    db.collection("requests").where("userId", "==", userId).get()
        .then(snapshot => {
            let requestTable = document.getElementById("request-table");
            requestTable.innerHTML = "";
            if (snapshot.empty) {
                requestTable.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 p-4">No requests found.</td></tr>`;
                return;
            }
            snapshot.forEach(doc => {
                const requestData = doc.data();

                // Title: show first 6 words, add ... if more
                let title = requestData.title || "Untitled Request";
                let titleWords = title.split(/\s+/);
                let shortTitle = titleWords.length > 6 ? titleWords.slice(0, 6).join(" ") + "..." : title;

                // Created At: show date and time
                let createdAt = requestData.createdAt
                    ? new Date(requestData.createdAt.seconds * 1000).toLocaleString()
                    : "Unknown Date";

                // Number of comments
                let commentCount = Array.isArray(requestData.discussion) ? requestData.discussion.length : 0;

                const requestRow = document.createElement("tr");
                // Choose icon based on status
                let statusIcon = "";
                if (requestData.status === "approved") {
                    statusIcon = '<span title="Approved" class="text-green-400">🟢</span>';
                } else if (requestData.status === "rejected") {
                    statusIcon = '<span title="Rejected" class="text-red-400">❌</span>';
                } else {
                    statusIcon = '<span title="Pending" class="text-yellow-400">⏳</span>';
                }

                requestRow.innerHTML = `
                    <td class="p-2 text-s text-blue-400 font-bold" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">
                        ${shortTitle}
                    </td>
                    <td class="p-2 text-center align-middle">${statusIcon}</td>
                    <td class="p-2 text-xs text-gray-400 text-center align-middle">${createdAt}</td>
                    <td class="p-2 text-s text-orange-400 text-center align-middle">${commentCount}</td>
                    <td class="p-2 text-center align-middle">
                        <button class="bg-blue-500 px-3 py-1 text-sm rounded" onclick="showRequestDetails('${doc.id}')">🔍 View</button>
                    </td>
                `;
                // Add a bottom border to visually separate each row
                requestRow.classList.add("border-b", "border-gray-600");
                requestTable.appendChild(requestRow);
            });
        })
        .catch(error => console.error("Error loading requests:", error));
}

// ✅ Show Request Details in Right Panel (Fully Fetches Space & Admin Details)
function showRequestDetails(requestId) {
    const requestPanel = document.getElementById("request-details-panel");
    requestPanel.setAttribute("data-request-id", requestId); // 🔥 Store request ID

    db.collection("requests").doc(requestId).get()
        .then(doc => {
            if (doc.exists) {
                const requestData = doc.data();

                document.getElementById("request-title-display").textContent = requestData.title;
                document.getElementById("request-description-display").textContent = requestData.description;
                document.getElementById("request-createdAt-display").textContent = requestData.createdAt
                    ? new Date(requestData.createdAt.seconds * 1000).toLocaleString()
                    : "Unknown Date";
                document.getElementById("request-status-display").textContent = requestData.status;

                // ✅ Space & Admin Information
                if (requestData.space) {
                    document.getElementById("request-space-display").textContent = ` ${requestData.space.name}`;
                    document.getElementById("request-admin-display").textContent = ` ${requestData.space.adminName}`;
                } else {
                    document.getElementById("request-space-display").textContent = " Not assigned";
                    document.getElementById("request-admin-display").textContent = " Not assigned";
                }

                // ✅ Attachments
                let attachmentsContainer = document.getElementById("request-attachments-display");
                attachmentsContainer.innerHTML = "";
                if (requestData.attachments && requestData.attachments.length > 0) {
                    requestData.attachments.forEach(url => {
                        attachmentsContainer.innerHTML += `<a href="${url}" target="_blank" class="text-blue-400 block mt-2">📎 View Attachment</a>`;
                    });
                } else {
                    attachmentsContainer.innerHTML = `<p class="text-gray-400">No attachments</p>`;
                }

                // ✅ Approvals
                let approvalsContainer = document.getElementById("request-approvals-display");
                approvalsContainer.innerHTML = "";
                if (requestData.approvals && requestData.approvals.length > 0) {
                    requestData.approvals.forEach(approval => {
                        approvalsContainer.innerHTML += `<li>${approval.adminName} - ${approval.decision} on ${new Date(approval.timestamp?.seconds * 1000).toLocaleDateString()}</li>`;
                    });
                } else {
                    approvalsContainer.innerHTML = `<p class="text-gray-400">No approvals yet</p>`;
                }

                // ✅ Load Discussion Below Request
                loadRequestDiscussion(requestId);

                requestPanel.classList.remove("hidden"); // Show details panel
            } else {
                console.error("Error: Request not found.");
            }
        })
        .catch(error => console.error("Error fetching request details:", error));
}


// ✅ Close Request Details Panel 
document.getElementById("close-details-btn").addEventListener("click", () => { document.getElementById("request-details-panel").classList.add("hidden"); });








// ✅ Load User Requests and Comments
document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadUserRequests(user.uid);
        } else {
            alert("You must be logged in to view your requests.");
        }
    });
    document.getElementById("send-comment-btn").addEventListener("click", postComment);
});
// ✅ Post a Comment with Timestamp
// ✅ Post a Comment with Timestamp
// ✅ Post a Comment with Timestamp (Fixed Firebase Error)
// ✅ Post a Comment with the Correct User Name
// ✅ Post a Comment with Timestamp
// ✅ Post a Comment with the Correct User Name
function postComment() {
    const commentInput = document.getElementById("comment-input");
    const commentText = commentInput.value.trim();
    const user = auth.currentUser;

    if (!user) {
        alert("You must be logged in to post a comment.");
        return;
    }

    if (!commentText) {
        alert("Please enter a comment.");
        return;
    }

    const requestPanel = document.getElementById("request-details-panel");
    const requestId = requestPanel.getAttribute("data-request-id");

    if (!requestId) {
        alert("Error: No request selected!");
        return;
    }

    const userRef = db.collection("users").doc(user.uid);

    userRef.get().then((doc) => {
        if (doc.exists) {
            const userName = doc.data().name || "User"; // 🔥 Fetch stored name

            const requestRef = db.collection("requests").doc(requestId);

            const commentData = {
                userId: user.uid,
                userName: userName, // ✅ Correct Name
                message: commentText,
                timestamp: firebase.firestore.Timestamp.now() // ✅ Correct Timestamp Usage
            };

            return requestRef.update({
                discussion: firebase.firestore.FieldValue.arrayUnion(commentData)
            });
        } else {
            alert("User profile not found.");
        }
    }).then(() => {
        commentInput.value = "";
        loadRequestDiscussion(requestId);
    }).catch((error) => {
        console.error("Error posting comment:", error);
    });
}

// ✅ Load Discussion Comments
function loadRequestDiscussion(requestId) {
    db.collection("requests").doc(requestId).get()
        .then(doc => {
            if (doc.exists) {
                const requestData = doc.data();
                const discussionContainer = document.getElementById("request-discussion-display");
                discussionContainer.innerHTML = "";
                requestData.discussion.forEach(comment => {
                    const commentDate = comment.timestamp ? new Date(comment.timestamp.seconds * 1000).toLocaleString() : "Unknown time";
                    // Add a span with class 'comment-author' for highlighting
                    discussionContainer.innerHTML += `
                        <li class="mt-2 border-b border-gray-600 pb-1">
                            <strong class="text-blue-300 comment-author">${comment.userName}</strong>: ${comment.message} 
                            <span class="text-gray-400 text-xs">(${commentDate})</span>
                        </li>`;
                });
                // Highlight admin comments after rendering
                highlightAdmins();
            }
        })
        .catch(error => console.error("Error loading discussion:", error));
}
// Enhance discussion rendering: highlight [Admin] names
function highlightAdmins() {
    const discussionList = document.getElementById('request-discussion-display');
    if (!discussionList) return;
    discussionList.querySelectorAll('.comment-author').forEach(span => {
        if (span.textContent.includes('[Admin]')) {
            span.classList.add('font-bold');
            span.classList.add('text-orange-400');
        }
    });
}









document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadPendingApprovals(user.uid); // ✅ Fetch pending requests for the logged-in admin
        } else {
            console.error("You must be logged in to view approvals.");
        }
    });
});

// ✅ Load Pending Requests for Admin Approval
function loadPendingApprovals(adminId) {
    db.collection("requests").where("space.adminId", "==", adminId).get()
        .then(snapshot => {
            let approvalTable = document.getElementById("approval-table");
            approvalTable.innerHTML = "";

            if (snapshot.empty) {
                approvalTable.innerHTML = `<tr><td colspan="5" class="text-center text-gray-400 p-4">No requests found.</td></tr>`;
                return;
            }

            snapshot.forEach(doc => {
                const requestData = doc.data();

                // Title: show first 6 words, add ... if more
                let title = requestData.title || "Untitled Request";
                let titleWords = title.split(/\s+/);
                let shortTitle = titleWords.length > 6 ? titleWords.slice(0, 6).join(" ") + "..." : title;

                // Created At: show date and time
                let createdAt = requestData.createdAt
                    ? new Date(requestData.createdAt.seconds * 1000).toLocaleString()
                    : "Unknown Date";

                // Number of comments
                let commentCount = Array.isArray(requestData.discussion) ? requestData.discussion.length : 0;

                // Status color
                let statusClass = "";
                if (requestData.status === "approved") statusClass = "text-green-400";
                else if (requestData.status === "rejected") statusClass = "text-red-400";
                else statusClass = "text-yellow-400";

                // Button label
                let buttonLabel = requestData.status === "pending" ? "🔍 Review" : "🔍 View";

                const requestRow = document.createElement("tr");
                // Status icon based on status
                let statusIcon = "";
                if (requestData.status === "approved") {
                    statusIcon = '<span title="Approved" class="text-green-400">🟢</span>';
                } else if (requestData.status === "rejected") {
                    statusIcon = '<span title="Rejected" class="text-red-400">❌</span>';
                } else {
                    statusIcon = '<span title="Pending" class="text-yellow-400">⏳</span>';
                }

                requestRow.innerHTML = `
                    <td class="p-2 text-s text-blue-400 font-bold" style="max-width: 180px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${title}">${shortTitle}</td>
                    <td class="p-2 text-center align-middle">${statusIcon}</td>
                    <td class="p-2 text-xs text-gray-400 text-center align-middle">${createdAt}</td>
                    <td class="p-2 text-s text-orange-400 text-center align-middle">${commentCount}</td>
                    <td class="p-2">
                        <button class="bg-blue-500 px-3 py-1 text-sm rounded" onclick="showRequestDetails('${doc.id}'),showAdminRequestDetails('${doc.id}')">${buttonLabel}</button>
                    </td>
                `;
                approvalTable.appendChild(requestRow);
            });
        })
        .catch(error => console.error("Error loading approvals:", error));
}










// ✅ Admin Request Details Panel

document.addEventListener("DOMContentLoaded", () => {
    auth.onAuthStateChanged(user => {
        if (user) {
            loadPendingApprovals(user.uid); // ✅ Load pending approvals for the admin
        }
    });

    document.getElementById("admin-accept-btn").addEventListener("click", () => handleAdminDecision("approved"));
    document.getElementById("admin-reject-btn").addEventListener("click", () => handleAdminDecision("rejected"));
    document.getElementById("admin-close-details-btn").addEventListener("click", closeAdminDetailsPanel);
});

// ✅ Load and Display Pending Request Details
function showAdminRequestDetails(requestId) {
    const requestPanel = document.getElementById("admin-request-details-panel");
    const requestContent = document.getElementById("admin-request-details-content");
    const placeholder = document.getElementById("admin-request-details-placeholder");

    requestPanel.setAttribute("data-request-id", requestId); // 🔥 Store request ID

    db.collection("requests").doc(requestId).get()
        .then(doc => {
            if (doc.exists) {
                const requestData = doc.data();

                document.getElementById("admin-request-title").textContent = requestData.title;
                document.getElementById("admin-request-description").textContent = requestData.description;
                document.getElementById("admin-request-createdAt").textContent = requestData.createdAt
                    ? new Date(requestData.createdAt.seconds * 1000).toLocaleString()
                    : "Unknown Date";
                document.getElementById("admin-request-status").textContent = requestData.status;
                document.getElementById("admin-request-space").textContent = requestData.space?.name || "Unknown Space";
                // Fetch and display the request creator's name
                db.collection("users").doc(requestData.userId).get().then(userDoc => {
                    document.getElementById("admin-request-user").textContent = userDoc.exists ? (userDoc.data().name || "Unknown User") : "Unknown User";
                });

                // ✅ Attachments
                let attachmentsContainer = document.getElementById("admin-request-attachments");
                attachmentsContainer.innerHTML = "";
                requestData.attachments?.forEach(url => {
                    attachmentsContainer.innerHTML += `<a href="${url}" target="_blank" class="text-blue-400 block mt-2">📎 View Attachment</a>`;
                });

                // ✅ Approvals
                let approvalsContainer = document.getElementById("admin-request-approvals");
                approvalsContainer.innerHTML = "";
                requestData.approvals?.forEach(approval => {
                    approvalsContainer.innerHTML += `<li>${approval.adminName} - ${approval.decision} (${new Date(approval.timestamp?.seconds * 1000).toLocaleDateString()})</li>`;
                });

                // ✅ Show/Hide Action Buttons
                const actionButtons = document.getElementById("admin-action-buttons");
                const statusMessage = document.getElementById("admin-status-message");
                if (requestData.status === "pending") {
                    actionButtons.classList.remove("hidden");
                    statusMessage.classList.add("hidden");
                } else {
                    actionButtons.classList.add("hidden");
                    statusMessage.classList.remove("hidden");
                    statusMessage.textContent = `This request has been ${requestData.status}.`;
                }

                placeholder.classList.add("hidden");
                requestContent.classList.remove("hidden");
            }
        })
        .catch(error => console.error("Error fetching admin request details:", error));
}

// ✅ Handle Admin Decision
function handleAdminDecision(decision) {
    const requestPanel = document.getElementById("admin-request-details-panel");
    const requestId = requestPanel.getAttribute("data-request-id");

    if (!requestId) {
        alert("No request selected!");
        return;
    }

    const user = auth.currentUser;
    if (!user) {
        alert("You must be logged in as an admin to approve/reject requests.");
        return;
    }

    db.collection("requests").doc(requestId).update({
        status: decision,
        approvals: firebase.firestore.FieldValue.arrayUnion({
            adminId: user.uid,
            adminName: user.displayName || "Admin",
            decision: decision,
            timestamp: firebase.firestore.Timestamp.now()
        })
    }).then(() => {
        showAdminRequestDetails(requestId); // 🔥 Refresh request details after approval/rejection
    }).catch(error => console.error("Error updating request status:", error));
}

// ✅ Close Admin Details Panel
function closeAdminDetailsPanel() {
    document.getElementById("admin-request-details-panel").removeAttribute("data-request-id");
    document.getElementById("admin-request-details-content").classList.add("hidden");
    document.getElementById("admin-request-details-placeholder").classList.remove("hidden");
}
