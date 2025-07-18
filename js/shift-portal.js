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

let currentUserId = null;
let userData = null;
let matchedSpaceId = null;



auth.onAuthStateChanged(async user => {
  if (!user) return;

  currentUserId = user.uid;
  const userDoc = await db.collection("users").doc(currentUserId).get();
  if (!userDoc.exists) return;

  userData = userDoc.data();
  document.getElementById("welcome").textContent = `Welcome, ${userData.name || "User"}`;

  const spacesSnap = await db.collection("spaces").get();
  for (const spaceDoc of spacesSnap.docs) {
    const spaceData = spaceDoc.data();
    if (Array.isArray(spaceData.joinedParticipants) &&
        spaceData.joinedParticipants.includes(currentUserId)) {
      matchedSpaceId = spaceDoc.id;
      break;
    }
  }

  if (!matchedSpaceId) return;
  document.getElementById("loading").style.display = "none";

  const pending = await db.collection("shiftRequests")
    .where("managerId", "==", currentUserId)
    .where("status", "==", "waiting-manager")
    .limit(1).get();

  const spaceDoc = await db.collection("spaces").doc(matchedSpaceId).get();
  const isApprover = spaceDoc.data().createdBy !== currentUserId &&
                     spaceDoc.data().joinedParticipants?.includes(currentUserId);
  const isAdmin = userData.admin === true || !pending.empty;

  if (isAdmin) {
    document.getElementById("full-log-btn").classList.remove("hidden");
    loadFullLog();
    showManagerView();
  }

  if (isApprover) {
    showApproverView();
  }

  showUserForm();
  loadFullHistory();
});



async function showUserForm() {
  const spaceDoc = await db.collection("spaces").doc(matchedSpaceId).get();
  const data = spaceDoc.data();
  const select = document.getElementById("target-user");
  select.innerHTML = '<option value="">-- Select colleague --</option>';

  for (const id of data.joinedParticipants || []) {
    if (id === currentUserId) continue;
    const doc = await db.collection("users").doc(id).get();
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = doc.data().name || "Unnamed User";
    select.appendChild(opt);
  }

  document.getElementById("request-form").classList.remove("hidden");
}

document.getElementById("submit-request").onclick = async () => {
  const fromDate = document.getElementById("from-date").value;
  const toDate = document.getElementById("to-date").value;
  const fromShift = document.getElementById("from-shift").value;
  const toShift = document.getElementById("to-shift").value;
  const targetUser = document.getElementById("target-user").value;

  if (!fromDate || !toDate || !targetUser) {
    alert("⚠️ Please complete all required fields.");
    return;
  }

  const check = await db.collection("shiftRequests")
    .where("createdBy", "==", currentUserId)
    .where("fromDate", "==", fromDate)
    .where("status", "!=", "approved")
    .get();

  if (!check.empty) {
    alert("🚫 You’ve already submitted a request for this date.");
    return;
  }

  const data = {
    createdBy: currentUserId,
    createdByName: userData.name,
    fromDate,
    fromShift,
    toDate,
    toShift,
    targetUser,
    spaceId: matchedSpaceId,
    status: "waiting-approver",
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };

  await db.collection("shiftRequests").add(data);
  document.getElementById("feedback").classList.remove("hidden");
};


async function showApproverView() {
  const snap = await db.collection("shiftRequests")
    .where("targetUser", "==", currentUserId)
    .where("status", "==", "waiting-approver")
    .get();

  const list = document.getElementById("approval-list");
  list.innerHTML = "";

  if (snap.empty) {
    list.innerHTML = `<li class="text-sm text-gray-400">No requests for you right now ✅</li>`;
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const li = document.createElement("li");
    li.className = "bg-gray-700 p-3 rounded";
   li.innerHTML = `
  <div><strong>${data.createdByName}</strong> requested to swap 
    from <b>${data.fromDate}</b> to <b>${data.toDate}</b>
    (${data.fromShift} → ${data.toShift})</div>
  <div class="mt-2 flex gap-2">
    <button class="bg-green-600 px-3 py-1 rounded hover:bg-green-700" onclick="approve('${doc.id}')">✅ Approve</button>
    <button class="bg-red-600 px-3 py-1 rounded hover:bg-red-700" onclick="reject('${doc.id}')">❌ Reject</button>
  </div>
`;

    list.appendChild(li);
  }

  document.getElementById("approval-section").classList.remove("hidden");
}

window.approve = async (id) => {
  const docRef = db.collection("shiftRequests").doc(id);
  const req = await docRef.get();
  const data = req.data();

  const spaceDoc = await db.collection("spaces").doc(data.spaceId).get();
  const adminId = spaceDoc.data()?.createdBy;

  if (!adminId) {
    alert("⚠️ Manager not found for this space.");
    return;
  }

  await docRef.update({
    status: "waiting-manager",
    managerId: adminId
  });

  alert("✔️ Request forwarded to the manager.");
  location.reload();
};

async function showManagerView() {
  const snap = await db.collection("shiftRequests")
    .where("managerId", "==", currentUserId)
    .where("status", "==", "waiting-manager")
    .get();

  const tableBody = document.getElementById("manager-table-body");
  tableBody.innerHTML = "";

  if (snap.empty) {
    const row = document.createElement("tr");
    row.innerHTML = `<td colspan="5" class="text-center text-gray-400 py-3">No pending requests</td>`;
    tableBody.appendChild(row);
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const targetUserId = data.targetUser;
    let targetName = "Loading...";

    try {
      const userSnap = await db.collection("users").doc(targetUserId).get();
      if (userSnap.exists) {
        const userData = userSnap.data();
        targetName = userData.name || targetUserId;
      } else {
        targetName = `Unknown (${targetUserId})`;
      }
    } catch (e) {
      console.error("Error fetching target user name:", e);
      targetName = `Unknown (${targetUserId})`;
    }

    const tr = document.createElement("tr");
   tr.innerHTML = `
  <td class="p-2 text-center">${data.createdByName}</td>
  <td class="p-2 text-center">${data.fromDate} (${data.fromShift})</td>
  <td class="p-2 text-center">${data.toDate} (${data.toShift})</td>
  <td class="p-2 text-center">${targetName}</td>
  <td class="p-2 text-center">
    <div class="flex gap-2 justify-center">
      <button class="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
        onclick="finalApprove('${doc.id}')">✅ Approve</button>
      <button class="bg-red-600 px-3 py-1 rounded hover:bg-red-700"
        onclick="reject('${doc.id}')">❌ Reject</button>

    </div>
  </td>
`;

    tableBody.appendChild(tr);
  }

  document.getElementById("manager-section").classList.remove("hidden");
}

window.finalApprove = async (id) => {
  await db.collection("shiftRequests").doc(id).update({ status: "approved" });
  alert("🎉 Request approved successfully");
  location.reload();
};

window.reject = async (id) => {
  const confirmReject = confirm("Are you sure you want to reject this request?");
  if (!confirmReject) return;

  try {
    await db.collection("shiftRequests").doc(id).update({
      status: "rejected"
    });
    alert("🚫 Request rejected.");
    location.reload();
  } catch (error) {
    console.error("Error rejecting request:", error);
    alert("❌ Failed to reject request.");
  }
};



async function loadFullHistory() {
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = "";

  // Fetch both submitted and received requests
  const submitted = await db.collection("shiftRequests")
    .where("createdBy", "==", currentUserId)
    .get();

  const received = await db.collection("shiftRequests")
    .where("targetUser", "==", currentUserId)
    .get();

  const allDocs = [...submitted.docs, ...received.docs];
  const uniqueMap = new Map();

  for (const doc of allDocs) {
    if (!uniqueMap.has(doc.id)) {
      uniqueMap.set(doc.id, doc.data());
    }
  }

  if (uniqueMap.size === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-3">No shift requests found</td></tr>`;
    return;
  }

  for (const [id, data] of uniqueMap) {
    // Determine status
    let statusText = "Unknown";
    let color = "text-gray-400";

    if (data.status === "waiting-approver") {
      statusText = "Pending Approver";
      color = "text-yellow-300";
    } else if (data.status === "waiting-manager") {
      statusText = "Awaiting Manager";
      color = "text-blue-300";
    } else if (data.status === "approved") {
      statusText = "Approved";
      color = "text-green-400";
      
    }else if (data.status === "rejected") {
  statusText = "Rejected";
  color = "text-red-400";
}


    // Determine other party
    let otherUserId = data.createdBy === currentUserId ? data.targetUser : data.createdBy;
    let otherUserName = "Loading...";

    try {
      const userSnap = await db.collection("users").doc(otherUserId).get();
      if (userSnap.exists) {
        const userInfo = userSnap.data();
        otherUserName = `${userInfo.name || "Unnamed"}`;
      } else {
        otherUserName = `Unknown (${otherUserId})`;
      }
    } catch (e) {
      console.error("Error fetching user:", e);
      otherUserName = `Unknown (${otherUserId})`;
    }

    // Add row to table
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 text-center">${data.fromDate} (${data.fromShift})</td>
      <td class="p-2 text-center">${data.toDate} (${data.toShift})</td>
      <td class="p-2 text-center">${otherUserName}</td>
      <td class="p-2 text-center ${color}">${statusText}</td>
    `;
    tbody.appendChild(tr);
  }
}


async function loadFullLog() {
  const tbody = document.getElementById("log-body");
  tbody.innerHTML = "";

  const snap = await db.collection("shiftRequests").orderBy("createdAt", "desc").get();

  if (snap.empty) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-400 py-3">No shift exchange logs found</td></tr>`;
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();

    let createdByName = "Loading...";
    let targetName = "Loading...";
    try {
      const createdByDoc = await db.collection("users").doc(data.createdBy).get();
      createdByName = createdByDoc.exists ? createdByDoc.data().name : `Unknown (${data.createdBy})`;

      const targetDoc = await db.collection("users").doc(data.targetUser).get();
      targetName = targetDoc.exists ? targetDoc.data().name : `Unknown (${data.targetUser})`;
    } catch (e) {
      console.error("Error fetching user info:", e);
    }

    let statusText = data.status || "N/A";
    let statusColor = "text-gray-300";
    if (statusText === "approved") statusColor = "text-green-400";
    else if (statusText === "waiting-approver") statusColor = "text-yellow-300";
    else if (statusText === "waiting-manager") statusColor = "text-blue-300";
 else if (data.status === "rejected") {
  statusText = "Rejected";
  statusColor = "text-red-400";
}



    const createdAt = data.createdAt?.toDate()?.toLocaleString() || "N/A";

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 text-center">${createdByName}</td>
      <td class="p-2 text-center">${targetName}</td>
      <td class="p-2 text-center">${data.fromDate} (${data.fromShift})</td>
      <td class="p-2 text-center">${data.toDate} (${data.toShift})</td>
      <td class="p-2 text-center ${statusColor}">${statusText}</td>
      <td class="p-2 text-center">${createdAt}</td>
    `;
    tbody.appendChild(tr);
  }
}

