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

firebase.auth().onAuthStateChanged(user => {
  if (!user) {
    console.log("User not signed in");
  } else {
    console.log("Signed in as:", user.email);
  }
});


async function loadDevicesWithLastCheck() {
  const tableBody = document.getElementById("checks-table-body");
  const summary = document.getElementById("summary");
  const searchInput = document.getElementById("search-input");
  tableBody.innerHTML = "";

  const deviceSnap = await db.collection("devices").get();

  const nameCount = {}; // for summary table
  const rows = [];

  for (const doc of deviceSnap.docs) {
    const id = doc.id;

    const infoSnap = await db.collection("devices").doc(id)
      .collection("information").doc("generalData").get();
    const info = infoSnap.data() || {};

    const scanSnap = await db.collection("devices").doc(id)
      .collection("scans").orderBy("timestamp", "desc").limit(1).get();
    const scan = scanSnap.docs[0]?.data();

    let bgClass = "", timeLabel = "", showDate = "-";

    if (scan?.timestamp) {
      const d = scan.timestamp.toDate();
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      const isYesterday = d.toDateString() === new Date(now.setDate(now.getDate() - 1)).toDateString();

      if (isToday) bgClass = "bg-green-700 text-white";
      else if (isYesterday) bgClass = "bg-red-700 text-white";

      const hour = d.getHours();
      const label = hour >= 8 && hour < 20 ? "Day" : "Night";
      timeLabel = `(${label})`;
      showDate = `${d.toLocaleDateString()} ${d.toLocaleTimeString()} ${timeLabel}`;
    }

    const name = info.fullName || "-";
    nameCount[name] = (nameCount[name] || 0) + 1;

    const row = document.createElement("tr");
    row.className = `text-white ${bgClass}`;
    row.innerHTML = `
      <td class="px-4 py-2">${id}</td>
      <td class="px-4 py-2">${name}</td>
      <td class="px-4 py-2">${info.manufacturer || "-"}</td>
      <td class="px-4 py-2">${info.serialNumber || "-"}</td>
      <td class="px-4 py-2">${scan?.location || "-"}</td>
      <td class="px-4 py-2">${scan?.user || "-"}</td>
      <td class="px-4 py-2">${showDate}</td>
      <td class="px-4 py-2">
        ${scan?.clean ? "🧼" : ""}
        ${scan?.functioning ? "⚙️" : ""}
        ${scan?.available ? "✅" : ""}
      </td>
      <td class="px-4 py-2">${scan?.comment || "-"}</td>
    `;
    rows.push(row);
    tableBody.appendChild(row);
  }

  // Summary panel
  let html = "<table class='table-auto border-collapse border border-gray-600 w-full'>";
  html += "<thead><tr class='bg-[#232B4D]'><th class='px-2 py-1 border'>Device Name</th><th class='px-2 py-1 border'>Count</th></tr></thead><tbody>";
  for (const [name, count] of Object.entries(nameCount)) {
    html += `<tr><td class='px-2 py-1 border text-white'>${name}</td><td class='px-2 py-1 border text-white'>${count}</td></tr>`;
  }
  html += "</tbody></table>";
  summary.innerHTML = html;

  // Search functionality
  searchInput.addEventListener("input", () => {
    const keyword = searchInput.value.toLowerCase();
    rows.forEach(row => {
      const match = [...row.children].some(td =>
        td.textContent.toLowerCase().includes(keyword)
      );
      row.style.display = match ? "" : "none";
    });
  });
}

loadDevicesWithLastCheck();
