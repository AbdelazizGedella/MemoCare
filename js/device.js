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

let scannedBarcode = null;
let deviceExists = false;

const script = document.createElement("script");
script.src = "https://unpkg.com/@zxing/library@latest";
document.head.appendChild(script);

script.onload = () => {
  const codeReader = new ZXing.BrowserBarcodeReader();
  const videoElement = document.getElementById("barcode-video");
  const scanStatus = document.getElementById("scan-status");
  const form = document.getElementById("device-form");
  const infoForm = document.getElementById("device-info-form");

  const deviceIdInput = document.getElementById("device-id");
  const itemInfoInput = document.getElementById("item-info");
  const timestampInput = document.getElementById("timestamp");
  const availableInput = document.getElementById("available");
  const functioningInput = document.getElementById("functioning");
  const cleanInput = document.getElementById("clean");
  const locationInput = document.getElementById("device-location");
  const commentInput = document.getElementById("comment-input");

  const fullNameInput = document.getElementById("device-fullname");
  const manufacturerInput = document.getElementById("device-manufacturer");
  const serialInput = document.getElementById("device-serial");
  const fixedLocInput = document.getElementById("device-fixed-location");

  codeReader.getVideoInputDevices().then(videoInputDevices => {
    if (!videoInputDevices.length) {
      scanStatus.textContent = "No camera found";
      return;
    }

    codeReader.decodeFromVideoDevice(videoInputDevices[0].deviceId, videoElement, async (result, err) => {
      if (result) {
        scannedBarcode = result.text;
        scanStatus.textContent = "Barcode scanned: " + scannedBarcode;
        deviceIdInput.value = scannedBarcode;
        itemInfoInput.value = "Loading...";
        timestampInput.value = new Date().toLocaleString();

        const doc = await db.collection("devices").doc(scannedBarcode).get();
        if (doc.exists) {
          deviceExists = true;

          const infoDoc = await db.collection("devices")
            .doc(scannedBarcode)
            .collection("information")
            .doc("generalData")
            .get();

          itemInfoInput.value = infoDoc.exists
            ? infoDoc.data().fullName || "Unnamed device"
            : "Unnamed device";

          infoForm.classList.add("hidden");
          form.classList.remove("hidden");
        } else {
          deviceExists = false;
          itemInfoInput.value = "Unknown device";
          infoForm.classList.remove("hidden");
          form.classList.remove("hidden");
        }

        codeReader.reset();
      } else if (err && !(err instanceof ZXing.NotFoundException)) {
        scanStatus.textContent = "Error: " + err;
      }
    });
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!scannedBarcode) return;

    const user = firebase.auth().currentUser;
    if (!user) {
      alert("You must be logged in to submit.");
      return;
    }

    try {
      if (!deviceExists) {
        const fullName = fullNameInput.value.trim();
        const manufacturer = manufacturerInput.value.trim();
        const serial = serialInput.value.trim();
        const fixedLoc = fixedLocInput.value.trim();

        if (!fullName || !manufacturer || !serial || !fixedLoc) {
          alert("Please fill in all required device information.");
          return;
        }

        await db.collection("devices")
          .doc(scannedBarcode)
          .collection("information")
          .doc("generalData")
          .set({
            fullName,
            manufacturer,
            serialNumber: serial,
            fixedLocation: fixedLoc,
            addedBy: user.email || user.uid,
            addedAt: firebase.firestore.FieldValue.serverTimestamp()
          });

        deviceExists = true;
        infoForm.classList.add("hidden");
      }

      const scanData = {
        user: user.uid,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        available: availableInput.checked,
        functioning: functioningInput.checked,
        clean: cleanInput.checked,
        location: locationInput.value,
        itemInfo: itemInfoInput.value,
        comment: commentInput.value
      };

      await db.collection("devices").doc(scannedBarcode).collection("scans").add(scanData);

      await db.collection("devices").doc(scannedBarcode).set({
        itemInfo: itemInfoInput.value,
        available: availableInput.checked,
        functioning: functioningInput.checked,
        clean: cleanInput.checked,
        location: locationInput.value,
        lastUpdatedBy: user.email || user.uid,
        lastUpdated: firebase.firestore.FieldValue.serverTimestamp(),
        comment: commentInput.value
      }, { merge: true });

    scanStatus.textContent = "Device saved successfully!";

    // Show a box/button to reopen the module (scan again)
    const reopenBox = document.createElement("div");
    reopenBox.style.marginTop = "16px";
    reopenBox.style.padding = "12px";
    reopenBox.style.background = "#e0f7fa";
    reopenBox.style.border = "1px solid #26c6da";
    reopenBox.style.borderRadius = "6px";
    reopenBox.style.textAlign = "center";

    const reopenBtn = document.createElement("button");
    reopenBtn.textContent = "Scan Another Device";
    reopenBtn.style.padding = "8px 16px";
    reopenBtn.style.background = "#26c6da";
    reopenBtn.style.color = "#fff";
    reopenBtn.style.border = "none";
    reopenBtn.style.borderRadius = "4px";
    reopenBtn.style.cursor = "pointer";

    reopenBtn.onclick = () => {
      reopenBox.remove();
      scanStatus.textContent = "Ready to scan.";
      form.classList.remove("hidden");
      scannedBarcode = null;
      deviceExists = false;
      // Optionally, re-initialize the scanner
      script.onload();
    };

    reopenBox.appendChild(reopenBtn);
    scanStatus.parentNode.insertBefore(reopenBox, scanStatus.nextSibling);
      form.reset();
      fullNameInput.value = "";
      manufacturerInput.value = "";
      serialInput.value = "";
      fixedLocInput.value = "";
      form.classList.add("hidden");

    } catch (error) {
      scanStatus.textContent = "Error saving: " + error.message;
    }
  });
};

firebase.auth().onAuthStateChanged(user => {
  const status = document.getElementById("scan-status");
  if (!user) {
    status.textContent = "Please log in to scan devices.";
  }
});





// Load all devices into the table
async function loadDevicesToTable() {
  const tableBody = document.getElementById("device-table-body");
  if (!tableBody) return;

  const snapshot = await db.collection("devices").get();
  tableBody.innerHTML = "";

  for (const doc of snapshot.docs) {
    const barcode = doc.id;

    const infoDoc = await db.collection("devices")
      .doc(barcode)
      .collection("information")
      .doc("generalData")
      .get();

    const data = infoDoc.data() || {};

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="px-4 py-2">${barcode}</td>
      <td class="px-4 py-2">${data.fullName || "-"}</td>
      <td class="px-4 py-2">${data.manufacturer || "-"}</td>
      <td class="px-4 py-2">${data.serialNumber || "-"}</td>
      <td class="px-4 py-2">
        <button class="btn btn-sm btn-primary" onclick="openDetails('${barcode}', '${data.serialNumber || ""}')">
          Details
        </button>
      </td>
    `;
    tableBody.appendChild(tr);
  }
}

// Filter search
const searchInput = document.getElementById("search-input");
if (searchInput) {
  searchInput.addEventListener("input", function () {
    const keyword = this.value.toLowerCase();
    const rows = document.querySelectorAll("#device-table-body tr");
    rows.forEach(row => {
      const match = [...row.children].some(td =>
        td.textContent.toLowerCase().includes(keyword)
      );
      row.style.display = match ? "" : "none";
    });
  });
}

// Navigation to detailed scan page
function openDetails(barcode, serial) {
  const url = `scans.html?device=${barcode}&serial=${encodeURIComponent(serial || "")}`;
  window.open(url, "_blank");
}

loadDevicesToTable();
