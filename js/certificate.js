// Firebase Configuration
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
const storage = firebase.storage();

let currentUID = null;
auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUID = user.uid;
    const userDoc = await db.collection("users").doc(currentUID).get();
    const name = userDoc.exists ? userDoc.data().name : "User";
    document.getElementById("user-greeting").textContent = `Welcome, ${name}`;

    loadUserCertificates();
    checkIfAdminAndLoadSpaceCertificates();
    loadRecentUploads();
  }
});




function loadRecentUploads() {
  console.log("🚀 loadRecentUploads بدأت تشتغل");

  const ul = document.getElementById("recentUploads");
  ul.innerHTML = "<li class='italic text-gray-400'>Now Loading...</li>";

  db.collection("Database").limit(50).get().then(async (snapshot) => {
    const items = [];

    console.log("📦 عدد المستندات:", snapshot.size);

    snapshot.forEach(doc => {
      const uid = doc.id;
      const data = doc.data();

      console.log("🧾 مستند:", uid, data);

      Object.entries(data).forEach(([certType, certData]) => {
        console.log(`📂 شهادة: ${certType}`, certData);

        if (
  typeof certData === "object" &&
  certData?.uploadedAt &&
  certData?.fileURL &&
  certData.status === "approved"
)
 {
          console.log("✅ تمت الإضافة:", certType, certData);
          items.push({
            uid,
            certType,
            expiry: certData.expiryDate || "N/A",
            uploadedAt: certData.uploadedAt.toDate()
          });
        }
      });
    });

    console.log("📌 عدد العناصر النهائية:", items.length);

    items.sort((a, b) => b.uploadedAt - a.uploadedAt);
    const sliced = items.slice(0, 5);

    const htmlItems = await Promise.all(
      sliced.map(async (item) => {
        const userDoc = await db.collection("users").doc(item.uid).get();
        const name = userDoc.exists ? userDoc.data().name : item.uid;

        // Calculate days left until expiry
        const today = new Date();
        const expiryDate = new Date(item.expiry);
        const daysLeft = Math.ceil((expiryDate - today) / (1000 * 60 * 60 * 24));

        let colorClass = "text-green-400";
        if (daysLeft < 0) {
          colorClass = "text-red-400";
        } else if (daysLeft < 60) {
          colorClass = "text-yellow-400";
        } else if (daysLeft > 90) {
          colorClass = "text-green-400";
        } else {
          colorClass = "text-gray-300";
        }

        return `<li class="bg-gray-700 p-3 rounded shadow border-l-4 border-blue-500">
          <span class="text-sm font-semibold text-blue-300">${name}</span>
          <span class="text-xs">Upload <strong>${item.certType}</strong> - 
            <span class="${colorClass}">Will Expire in ( ${item.expiry} )</span>
          </span>
        </li>`;
      })
    );

    ul.innerHTML = htmlItems.join("") || "<li class='text-gray-400 italic'>لا توجد مشاركات حديثة.</li>";
  });
}




async function uploadCertificate() {
  const file = certificateFile.files[0];
  const expiry = expiryDate.value;
  const type = certificateType.value;
  if (!file || !expiry || !type) return alert("Fill all fields");

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading...";

  const fileName = `${type}_${Date.now()}_${file.name}`;
  const ref = storage.ref(`certificates/${currentUID}/${fileName}`);
  await ref.put(file);
  const url = await ref.getDownloadURL();

  const docRef = db.collection("Database").doc(currentUID);
  const oldDoc = await docRef.get();
  const data = oldDoc.exists ? oldDoc.data() : {};
  data[type] = {
    fileURL: url,
    expiryDate: expiry,
    uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
    status: "pending"
  };
  await docRef.set(data);
  alert("Uploaded successfully.");
  certificateFile.value = "";
  expiryDate.value = "";
  loadUserCertificates();
  uploadBtn.disabled = false;
  uploadBtn.textContent = "Upload Certificate";
}

async function loadUserCertificates() {
  const container = document.getElementById("userCertTableBody");
  container.innerHTML = "";

  const doc = await db.collection("Database").doc(currentUID).get();
  if (!doc.exists) return;
  const data = doc.data();
  const today = new Date();

  ["BLS", "ACLS", "PALS", "SEDATION", "MOH", "SCFHS"].forEach(cert => {
    if (!data[cert]) return;
    const c = data[cert];
    const exp = new Date(c.expiryDate);
    const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
    const status = daysLeft <= 0 ? "Expired" : daysLeft <= 30 ? "Near Expiry" : "Active";

    let months = 0;
    let temp = new Date(today);
    while (temp < exp) {
      temp.setMonth(temp.getMonth() + 1);
      if (temp <= exp) months++;
    }
    const rem = new Date(today);
    rem.setMonth(rem.getMonth() + months);
    const remDays = Math.ceil((exp - rem) / (1000 * 60 * 60 * 24));
    const left = daysLeft <= 0 ? "Expired" : `${months > 0 ? months + " mo " : ""}${remDays > 0 ? remDays + " d" : ""}`;

    const row = document.createElement("tr");
    row.innerHTML = `
      <td class="px-4 py-2 font-semibold">${cert}</td>
      <td class="px-4 py-2">${c.expiryDate}</td>
      <td class="px-4 py-2 ${daysLeft <= 30 ? 'text-red-400' : 'text-green-400'}">${left}</td>
      <td class="px-4 py-2 capitalize ${c.status === 'approved' ? 'text-green-400' : c.status === 'pending' ? 'text-yellow-400' : 'text-red-400'}">${c.status}</td>
      <td class="px-4 py-2"><a href="${c.fileURL}" target="_blank" class="text-blue-400 underline">View</a></td>
      <td class="px-4 py-2 italic text-sm text-gray-300">${c.comment || '-'}</td>
    `;
    container.appendChild(row);
  });
}

async function checkIfAdminAndLoadSpaceCertificates() {
  const user = auth.currentUser;
  if (!user) return;
  const snap = await db.collection("spaces").get();

  for (const doc of snap.docs) {
    const data = doc.data();
    if (data.createdBy === user.uid) {
      const uids = data.joinedParticipants || [];
      document.getElementById("spaceCertSummary").classList.remove("hidden");
loadOverviewCertificateTable();

      document.getElementById("spaceSummaryBtnContainer").innerHTML = `
        <button onclick="document.getElementById('spaceCertSummary').classList.remove('hidden'); document.getElementById('spaceCertSummary').scrollIntoView({behavior:'smooth'});"
          class="bg-gradient-to-br from-[#10b981] via-[#0f172a] to-[#1e293b] p-4 rounded-xl shadow-lg flex flex-col items-center justify-center hover:scale-105 transition duration-300 mt-2 backdrop-blur-md bg-opacity-60 border border-white/10">
          <i class="fas fa-users text-white text-2xl mb-2"></i>
          <span class="text-white text-sm font-medium text-center">Space Members Summary</span>
        </button>
        <button onclick="openCertSummaryReport()" class="bg-gradient-to-br from-indigo-600 via-indigo-800 to-indigo-900 p-4 rounded-xl shadow-lg flex flex-col items-center justify-center hover:scale-105 transition duration-300 mt-2 backdrop-blur-md bg-opacity-60 border border-white/10">
          <i class="fas fa-chart-bar text-2xl mb-1"></i>
          <span class="text-white text-sm font-medium text-center">Certificate Report</span>
        </button>
        <button onclick="openCertRankingReport()" class="bg-gradient-to-br from-pink-600 via-pink-800 to-pink-900 p-4 rounded-xl shadow-lg flex flex-col items-center justify-center hover:scale-105 transition duration-300 mt-2 backdrop-blur-md bg-opacity-60 border border-white/10">
          <i class="fas fa-trophy text-2xl mb-1"></i>
          <span class="text-white text-sm font-medium text-center">Staff Ranking</span>
        </button>
      `;
      break;
    }
  }
}



// Helper to calculate status
function getCertStatus(expiryDate) {
  const today = new Date();
  const exp = new Date(expiryDate);
  const daysLeft = Math.ceil((exp - today) / (1000 * 60 * 60 * 24));
  let status = "✅ Active";
  if (daysLeft <= 0) status = "❌ Expired";
  else if (daysLeft <= 30) status = "⚠️ Near Expiry";
  return { daysLeft, status };
}

function getColorClass(status) {
  if (status.includes("Expired")) return "text-red-400";
  if (status.includes("Near")) return "text-yellow-400";
  return "text-green-400";
}


function getCertCell(cert) {
  if (!cert) return `<td class="px-4 py-2 text-gray-400 italic">-</td>`;
  const { daysLeft, status } = getCertStatus(cert.expiryDate);

  let months = 0;
  const today = new Date();
  let temp = new Date(today);
  while (temp < new Date(cert.expiryDate)) {
    temp.setMonth(temp.getMonth() + 1);
    if (temp <= new Date(cert.expiryDate)) months++;
  }
  const rem = new Date(today);
  rem.setMonth(rem.getMonth() + months);
  const remDays = Math.ceil((new Date(cert.expiryDate) - rem) / (1000 * 60 * 60 * 24));
  const left = daysLeft <= 0 ? "Expired" : `${months > 0 ? months + " mo " : ""}${remDays > 0 ? remDays + " d" : ""}`;

  return `<td class="px-4 py-2 ${getColorClass(status)}">
    <div class="font-bold">${status}</div>
    <div class="text-sm text-gray-300">${cert.expiryDate}</div>
    <div class="text-xs text-blue-400">${left}</div>
    <div class="mt-1"><button onclick="viewCert('${cert.fileURL}')" class="text-white hover:text-blue-400"><i class='fas fa-eye'></i></button></div>
  </td>`;
}

let allCertRows = [];

async function loadOverviewCertificateTable() {
  const tbody = document.getElementById("overviewCertTableBody");
  tbody.innerHTML = "";
  allCertRows = [];

  const spaceSnap = await db.collection("spaces").get();
  const adminUID = auth.currentUser?.uid;
  const space = spaceSnap.docs.find(doc => doc.data().createdBy === adminUID);
  if (!space) return;

  const uids = space.data().joinedParticipants || [];

  for (const uid of uids) {
    const [userDoc, certDoc] = await Promise.all([
      db.collection("users").doc(uid).get(),
      db.collection("Database").doc(uid).get()
    ]);

    const name = userDoc.exists ? userDoc.data().name || uid : uid;
const allCerts = certDoc.exists ? certDoc.data() : {};
const certs = {};

// فقط خذ الشهادات اللي حالتها approved
for (const [key, value] of Object.entries(allCerts)) {
  if (value.status === "approved") {
    certs[key] = value;
  }
}

    const rowHTML = `
      <tr>
        <td class="px-4 py-2 font-semibold">${name}</td>
        ${getCertCell(certs.BLS)}
        ${getCertCell(certs.ACLS)}
        ${getCertCell(certs.PALS)}
        ${getCertCell(certs.SEDATION)}
        ${getCertCell(certs.MOH)}
        ${getCertCell(certs.SCFHS)}
      </tr>
    `;

    const totalDaysLeft = [certs.BLS, certs.ACLS, certs.PALS, certs.SEDATION, certs.MOH, certs.SCFHS]
      .filter(Boolean)
      .reduce((acc, cert) => acc + getCertStatus(cert.expiryDate).daysLeft, 0);

 allCertRows.push({
  name,
  html: rowHTML,
  certs,
  totalDaysLeft,
  nearExpiry: countCertStatus(certs, "Near Expiry"),
  expired: countCertStatus(certs, "Expired"),
  active: countCertStatus(certs, "Active"),
  missing: 6 - Object.keys(certs).length
});

    tbody.innerHTML += rowHTML;
  }

  // Optional: Sort by shortest remaining days first
allCertRows.sort((a, b) => {
  if (b.nearExpiry !== a.nearExpiry) return b.nearExpiry - a.nearExpiry;
  if (b.missing !== a.missing) return b.missing - a.missing;
  if (b.expired !== a.expired) return b.expired - a.expired;
  return b.active - a.active;
});}

function renderFilteredCertTable() {
  const certFilter = document.getElementById("filterCertificateType").value;
  const statusFilter = document.getElementById("filterStatus").value;
  const tbody = document.getElementById("overviewCertTableBody");
  tbody.innerHTML = "";

  allCertRows.forEach(row => {
    if (certFilter === "ALL" && statusFilter === "ALL") {
      tbody.innerHTML += row.html;
    } else {
      const cert = row.certs[certFilter];
      if (!cert && certFilter !== "ALL") return;
      const { status } = getCertStatus(cert?.expiryDate || null);

      if (
        (certFilter === "ALL" || cert) &&
        (statusFilter === "ALL" || status.includes(statusFilter))
      ) {
        tbody.innerHTML += row.html;
      }
    }
  });
}

document.getElementById("filterCertificateType").addEventListener("change", renderFilteredCertTable);
document.getElementById("filterStatus").addEventListener("change", renderFilteredCertTable);



async function loadPendingCertificates() {
  const certList = document.getElementById("certList");
  certList.innerHTML = "";

  const snapshot = await db.collection("Database").get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const uid = doc.id;
    const userDoc = await db.collection("users").doc(uid).get();
    const userName = userDoc.exists ? userDoc.data().name : uid;

["BLS", "ACLS", "PALS", "SEDATION", "MOH", "SCFHS"].forEach(certType => {
      if (data[certType] && data[certType].status === "pending") {
        const cert = data[certType];

        const div = document.createElement("div");
        div.className = "p-4 bg-gray-700 rounded shadow";
        div.innerHTML = `
          <p><strong>Name:</strong> ${userName}</p>
          <p><strong>Certificate:</strong> ${certType}</p>
          <p><strong>Expiry:</strong> ${cert.expiryDate}</p>
          <a href="${cert.fileURL}" target="_blank" class="text-blue-400 underline">View Certificate</a>
          <div class="mt-3 space-x-2">
            <button class="btn btn-success" onclick="approve('${uid}', '${certType}')">✅ Approve</button>
            <button class="btn btn-error" onclick="reject('${uid}', '${certType}')">❌ Reject</button>
          </div>
        `;
        certList.appendChild(div);
      }
    });
  });
}

async function approve(uid, certType) {
  const comment = prompt("Enter approval comment (optional):");
  await db.collection("Database").doc(uid).update({
    [`${certType}.status`]: "approved",
    [`${certType}.comment`]: comment || ""
  });
  alert("Certificate approved.");
  loadPendingCertificates();
}

async function reject(uid, certType) {
  const comment = prompt("Enter rejection comment (required):");
  if (!comment) {
    alert("Please enter a comment for rejection.");
    return;
  }
  await db.collection("Database").doc(uid).update({
    [`${certType}.status`]: "rejected",
    [`${certType}.comment`]: comment
  });
  alert("Certificate rejected.");
  loadPendingCertificates();
}





  function viewCert(url) {
    document.getElementById("certIframe").src = url;
    document.getElementById("certViewerModal").classList.remove("hidden");
  }


  function countCertStatus(certs, targetStatus) {
  return Object.values(certs || {}).filter(cert => {
    if (!cert?.expiryDate) return targetStatus === "missing";
    const status = getCertStatus(cert.expiryDate).status;
    if (targetStatus === "missing") return false;
    return status.includes(targetStatus);
  }).length;
}




document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});






function openCertSummaryReport() {
  const certTypes = ["BLS", "ACLS", "PALS", "SEDATION", "MOH", "SCFHS"];
  const summary = {};
  certTypes.forEach(type => summary[type] = {
    active: [], near: [], expired: [], missing: []
  });

  allCertRows.forEach(row => {
    certTypes.forEach(type => {
      const cert = row.certs[type];
      if (!cert) return summary[type].missing.push(row.name);
      const status = getCertStatus(cert.expiryDate).status;
      if (status.includes("Active")) summary[type].active.push(row.name);
      else if (status.includes("Near")) summary[type].near.push(row.name);
      else if (status.includes("Expired")) summary[type].expired.push(row.name);
    });
  });

  const tbody = document.getElementById("certSummaryTable");
  tbody.innerHTML = "";
  certTypes.forEach(type => {
    const s = summary[type];
    tbody.innerHTML += `<tr class='border-t border-gray-700'>
      <td class='px-4 py-2 font-bold'>${type}</td>
      <td class='px-4 py-2 text-green-400'>${s.active.length}</td>
      <td class='px-4 py-2 text-yellow-400'>${s.near.length}</td>
      <td class='px-4 py-2 text-red-400'>${s.expired.length}</td>
      <td class='px-4 py-2 text-gray-400'>${s.missing.length}</td>
      <td class='px-4 py-2'><button onclick="openDetailedCert('${type}')" class="text-blue-400 underline">👁 View</button></td>
    </tr>`;
  });
  window.certSummaryData = summary;
  document.getElementById("certSummaryModal").classList.remove("hidden");
}

function openDetailedCert(certType) {
  const data = window.certSummaryData[certType];
  const list = document.getElementById("detailedCertList");
  const title = document.getElementById("detailedCertTitle");
  title.textContent = `📄 ${certType} Details`;
  list.innerHTML = "";
  ["active", "near", "expired", "missing"].forEach(key => {
    const label = key === "active" ? "✅ Active" : key === "near" ? "⚠️ Near" : key === "expired" ? "❌ Expired" : "🚫 Missing";
    list.innerHTML += `<li class='font-bold mt-2'>${label} (${data[key].length})</li>`;
    if (data[key].length === 0) {
      list.innerHTML += `<li class='text-gray-400 italic'>No users</li>`;
    } else {
      data[key].forEach(name => {
        list.innerHTML += `<li class='pl-4'>• ${name}</li>`;
      });
    }
  });
  document.getElementById("detailedCertModal").classList.remove("hidden");
}

function openCertRankingReport() {
  const sorted = [...allCertRows].sort((a, b) => {
    if (b.active !== a.active) return b.active - a.active;
    if (a.nearExpiry !== b.nearExpiry) return a.nearExpiry - b.nearExpiry;
    return a.expired - b.expired;
  });
  window.fullRankingList = sorted;
  renderRankingList();
  document.getElementById("certRankingModal").classList.remove("hidden");
}

function renderRankingList() {
  const q = document.getElementById("searchRankingInput").value.toLowerCase();
  const div = document.getElementById("certRankingBody");
  div.innerHTML = "";
  let shown = 0;
  for (let i = 0; i < window.fullRankingList.length; i++) {
    const row = window.fullRankingList[i];
    if (!row.name.toLowerCase().includes(q)) continue;
    if (q === "" && shown >= 5) break; // فقط أول 5 لو مفيش بحث
    div.innerHTML += `<div class='border-b border-gray-700 pb-1'>
      <strong class='text-white'>${i + 1}. ${row.name}</strong><br>
      ✅ Active: <span class='text-green-400'>${row.active}</span>,
      ⚠️ Near: <span class='text-yellow-400'>${row.nearExpiry}</span>,
      ❌ Expired: <span class='text-red-400'>${row.expired}</span>,
      🚫 Missing: <span class='text-gray-400'>${row.missing}</span>
    </div>`;
    shown++;
  }
}


