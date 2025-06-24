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
  document.getElementById("welcome").textContent = `مرحبًا ${userData.name || "مستخدم"}`;

  const spacesSnap = await db.collection("spaces").get();
  for (const spaceDoc of spacesSnap.docs) {
    const spaceData = spaceDoc.data();
    if (Array.isArray(spaceData.joinedParticipants) && spaceData.joinedParticipants.includes(currentUserId)) {
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

  if (isAdmin) showManagerView();
  if (isApprover) showApproverView();

  showUserForm();
  loadFullHistory();
});

async function showUserForm() {
  const spaceDoc = await db.collection("spaces").doc(matchedSpaceId).get();
  const data = spaceDoc.data();
  const select = document.getElementById("target-user");
  select.innerHTML = '<option value="">-- اختر الموظف الآخر --</option>';

  for (const id of data.joinedParticipants || []) {
    if (id === currentUserId) continue;
    const doc = await db.collection("users").doc(id).get();
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = doc.data().name || "موظف";
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
    alert("⚠️ يُرجى ملء جميع الحقول");
    return;
  }

  const check = await db.collection("shiftRequests")
    .where("createdBy", "==", currentUserId)
    .where("fromDate", "==", fromDate)
    .where("status", "!=", "approved")
    .get();

  if (!check.empty) {
    alert("⛔ لديك طلب سابق في نفس التاريخ لم يُعتمد بعد.");
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
    list.innerHTML = `<li class="text-sm text-gray-400">لا توجد طلبات حالياً ✅</li>`;
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const li = document.createElement("li");
    li.className = "bg-gray-700 p-3 rounded";
    li.innerHTML = `
      <div><b>${data.createdByName}</b> يطلب التبديل من <b>${data.fromDate}</b> إلى <b>${data.toDate}</b></div>
      <button class="mt-2 bg-green-600 px-3 py-1 rounded" onclick="approve('${doc.id}')">✅ موافقة</button>
    `;
    list.appendChild(li);
  }

  document.getElementById("approval-section").classList.remove("hidden");
}

window.approve = async (id) => {
  const docRef = db.collection("shiftRequests").doc(id);
  const req = await docRef.get();
  const spaceId = req.data().spaceId;
  const spaceDoc = await db.collection("spaces").doc(spaceId).get();
  const adminId = spaceDoc.data()?.createdBy;

  await docRef.update({
    status: "waiting-manager",
    managerId: adminId
  });

  alert("👍 تم إرسال الطلب للمدير");
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
    row.innerHTML = `<td colspan="5" class="text-center text-gray-400 py-3">لا توجد طلبات للمدير حاليًا</td>`;
    tableBody.appendChild(row);
    return;
  }

  for (const doc of snap.docs) {
    const data = doc.data();
    const targetUserId = data.targetUser;
    let targetName = targetUserId;

    try {
      const userSnap = await db.collection("users").doc(targetUserId).get();
      if (userSnap.exists()) targetName = userSnap.data().name || targetUserId;
    } catch {}

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 text-center">${data.createdByName}</td>
      <td class="p-2 text-center">${data.fromDate} (${data.fromShift})</td>
      <td class="p-2 text-center">${data.toDate} (${data.toShift})</td>
      <td class="p-2 text-center">${targetName}</td>
      <td class="p-2 text-center">
        <button class="bg-green-600 px-3 py-1 rounded hover:bg-green-700"
          onclick="finalApprove('${doc.id}')">✅ اعتماد</button>
      </td>
    `;
    tableBody.appendChild(tr);
  }

  document.getElementById("manager-section").classList.remove("hidden");
}

window.finalApprove = async (id) => {
  await db.collection("shiftRequests").doc(id).update({ status: "approved" });
  alert("🎉 تم اعتماد الطلب");
  location.reload();
};

async function loadFullHistory() {
  const tbody = document.getElementById("history-body");
  tbody.innerHTML = "";

  const requests = await db.collection("shiftRequests")
    .where("createdBy", "in", [currentUserId])
    .get();

  const received = await db.collection("shiftRequests")
    .where("targetUser", "==", currentUserId)
    .get();

  const allDocs = [...requests.docs, ...received.docs];
  const seen = new Set();
  const unique = allDocs.filter(d => {
    if (seen.has(d.id)) return false;
    seen.add(d.id);
    return true;
  });

  if (unique.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="text-center text-gray-400 py-3">لا توجد طلبات في السجل</td></tr>`;
    return;
  }

  for (const doc of unique) {
    const data = doc.data();
    let statusLabel = "🚫 غير معروف";
       let color = "text-gray-400";

    if (data.status === "waiting-approver") {
      statusLabel = "🕓 بانتظار الطرف الآخر";
      color = "text-yellow-300";
    } else if (data.status === "waiting-manager") {
      statusLabel = "🔒 بانتظار المدير";
      color = "text-blue-300";
    } else if (data.status === "approved") {
      statusLabel = "✅ تم الاعتماد";
      color = "text-green-400";
    }

    let targetName = data.targetUser;
    try {
      const userSnap = await db.collection("users").doc(data.targetUser).get();
      if (userSnap.exists()) {
        targetName = userSnap.data().name || data.targetUser;
      }
    } catch {}

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="p-2 text-center">${data.fromDate}</td>
      <td class="p-2 text-center">${data.toDate}</td>
      <td class="p-2 text-center">${targetName}</td>
      <td class="p-2 text-center ${color}">${statusLabel}</td>
    `;
    tbody.appendChild(tr);
  }
}
