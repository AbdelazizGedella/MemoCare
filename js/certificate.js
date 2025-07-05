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
const isAdmin = true; // عدل حسب صلاحياتك

auth.onAuthStateChanged(async (user) => {
  if (user) {
    currentUID = user.uid;

    // Load user's name
    const userDoc = await db.collection("users").doc(currentUID).get();
    const name = userDoc.exists ? userDoc.data().name : "User";
    document.getElementById("user-greeting").textContent = `Welcome, ${name}`;

    // Load user certificates after login
    loadUserCertificates();

    if (isAdmin) {
      document.getElementById("adminView").classList.remove("hidden");
      loadPendingCertificates();
    }
  } else {
    console.log("User not logged in");
  }
});

async function uploadCertificate() {
  const fileInput = document.getElementById("certificateFile");
  const expiryInput = document.getElementById("expiryDate");
  const certTypeInput = document.getElementById("certificateType");
  const uploadBtn = document.getElementById("uploadBtn");

  if (!fileInput.files[0] || !expiryInput.value || !certTypeInput.value) {
    alert("Please select certificate type, file and expiry date");
    return;
  }

  uploadBtn.disabled = true;
  uploadBtn.textContent = "Uploading... ⏳";

  const file = fileInput.files[0];
  const expiryDate = expiryInput.value;
  const certType = certTypeInput.value;

  const fileName = `${certType}_${Date.now()}_${file.name}`;
  const storageRef = storage.ref(`certificates/${currentUID}/${fileName}`);

  try {
    await storageRef.put(file);
    const downloadURL = await storageRef.getDownloadURL();

    const certRef = db.collection("Database").doc(currentUID);

    // اجلب الوثيقة القديمة عشان تحافظ على باقي الشهادات
    const oldDoc = await certRef.get();
    let oldData = oldDoc.exists ? oldDoc.data() : {};

    // حدّث أو اضف شهادة جديدة
    oldData[certType] = {
      fileURL: downloadURL,
      expiryDate: expiryDate,
      uploadedAt: firebase.firestore.FieldValue.serverTimestamp(),
      status: "pending"
    };

    await certRef.set(oldData);

    alert("Certificate uploaded and pending approval.");
    fileInput.value = "";
    expiryInput.value = "";

    // اعادة تحميل الجدول بعد الرفع
    loadUserCertificates();

  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload error, please try again.");
  } finally {
    uploadBtn.disabled = false;
    uploadBtn.textContent = "Upload Certificate";
  }
}

async function loadUserCertificates() {
  const container = document.getElementById("userCertTable");
  if (!container) return;
  container.innerHTML = "";

  try {
    const doc = await db.collection("Database").doc(currentUID).get();
    if (!doc.exists) {
      container.textContent = "No certificates found.";
      return;
    }
    const data = doc.data();

    const table = document.createElement("table");
    table.className = "w-full text-sm text-left text-white border border-gray-600 mt-6";
    table.innerHTML = `
  <thead class="text-xs uppercase bg-gray-700 text-gray-300">
        <tr>
          <th class="px-4 py-2">Certificate</th>
          <th class="px-4 py-2">Expiry Date</th>
          <th class="px-4 py-2">Days Left</th>
          <th class="px-4 py-2">Status</th>
                    <th class="px-4 py-2">Admin Comment</th>

          <th class="px-4 py-2">View</th>

          
        </tr>
      </thead>
      <tbody class="bg-gray-800 text-white"></tbody>
    `;

    const tbody = table.querySelector("tbody");
    const today = new Date();

    ["BLS", "ACLS", "PALS", "C.SEDATION", "MOH" ,"SCFHS"].forEach(certType => {
      if (data[certType]) {
        const cert = data[certType];
        const expiry = new Date(cert.expiryDate);
        const diff = expiry - today;
        const daysLeft = Math.ceil(diff / (1000 * 60 * 60 * 24));

        const row = document.createElement("tr");
        row.className = "border-t border-gray-600";
        row.innerHTML = `
          <td class="px-4 py-2 font-semibold">${certType}</td>
          <td class="px-4 py-2">${cert.expiryDate}</td>
          <td class="px-4 py-2 ${daysLeft <= 30 ? "text-red-400" : "text-green-400"}">${daysLeft > 0 ? daysLeft + " days" : "Expired"}</td>
          <td class="px-4 py-2 capitalize ${
            cert.status === "approved"
              ? "text-green-400"
              : cert.status === "pending"
              ? "text-yellow-400"
              : "text-red-400"
          }">${cert.status}</td>
            <td class="px-4 py-2 italic text-sm text-gray-300">${cert.comment || "-"}</td>

          <td class="px-4 py-2"><a href="${cert.fileURL}" target="_blank" class="text-blue-400 underline">View</a></td>
        `;
        tbody.appendChild(row);
      }
    });

    container.appendChild(table);
  } catch (error) {
    console.error("Error loading user certificates:", error);
    container.textContent = "Error loading certificates.";
  }
}

async function loadPendingCertificates() {
  const certList = document.getElementById("certList");
  certList.innerHTML = "";

  const snapshot = await db.collection("Database").get();

  snapshot.forEach(async (doc) => {
    const data = doc.data();
    const uid = doc.id;
    const userDoc = await db.collection("users").doc(uid).get();
    const userName = userDoc.exists ? userDoc.data().name : uid;

     ["BLS", "ACLS", "PALS", "C.SEDATION", "MOH" ,"SCFHS"].forEach(certType => {
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


document.getElementById("logout-btn").addEventListener("click", () => {
  auth.signOut();
});
