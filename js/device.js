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





/* Required scripts:
    - Firebase SDK (already initialized above)
    - Barcode scanning library (using ZXing for browser)
*/

// Load ZXing barcode scanner
const script = document.createElement('script');
script.src = 'https://unpkg.com/@zxing/library@latest';
document.head.appendChild(script);

script.onload = () => {
     const codeReader = new ZXing.BrowserBarcodeReader();
     const videoElement = document.getElementById('barcode-video');
     const scanStatus = document.getElementById('scan-status');
     const form = document.getElementById('device-form');
     const deviceIdInput = document.getElementById('device-id');
     const itemInfoInput = document.getElementById('item-info');
     const timestampInput = document.getElementById('timestamp');
     const availableInput = document.getElementById('available');
     const functioningInput = document.getElementById('functioning');
     const cleanInput = document.getElementById('clean');
     const locationInput = document.getElementById('device-location');

     let scannedBarcode = null;

     // Start camera and scan
     codeReader.getVideoInputDevices().then(videoInputDevices => {
          if (videoInputDevices.length === 0) {
                scanStatus.textContent = 'No camera found';
                return;
          }
          codeReader.decodeFromVideoDevice(videoInputDevices[0].deviceId, videoElement, (result, err) => {
                if (result) {
                     scannedBarcode = result.text;
                     scanStatus.textContent = 'Barcode scanned: ' + scannedBarcode;
                     deviceIdInput.value = scannedBarcode;
                     itemInfoInput.value = 'Loading...';
                     timestampInput.value = new Date().toLocaleString();
                     form.classList.remove('hidden');
                     // Fetch item info from Firestore if exists
                     db.collection('devices').doc(scannedBarcode).get().then(doc => {
                          if (doc.exists) {
                                itemInfoInput.value = doc.data().itemInfo || 'No info';
                          } else {
                                itemInfoInput.value = 'Unknown device';
                          }
                     });
                     // Stop scanning after first scan
                     codeReader.reset();
                } else if (err && !(err instanceof ZXing.NotFoundException)) {
                     scanStatus.textContent = 'Error: ' + err;
                }
          });
     });

     // Handle form submit
     form.addEventListener('submit', async (e) => {
          e.preventDefault();
          if (!scannedBarcode) return;
          // Get current user
          const user = firebase.auth().currentUser;
          if (!user) {
                alert('You must be logged in to submit.');
                return;
          }
          const data = {
                barcode: scannedBarcode,
                user: user.email || user.uid,
                timestamp: firebase.firestore.FieldValue.serverTimestamp(),
                available: availableInput.checked,
                functioning: functioningInput.checked,
                clean: cleanInput.checked,
                location: locationInput.value,
                itemInfo: itemInfoInput.value
          };
          try {
                await db.collection('device_scans').add(data);
                scanStatus.textContent = 'Device saved successfully!';
                // Add a button to allow reopening the scanner
                let reopenBtn = document.createElement('button');
                reopenBtn.textContent = 'Scan Another Device';
                reopenBtn.type = 'button';
                reopenBtn.onclick = () => {
                    form.classList.add('hidden');
                    scanStatus.textContent = 'Ready to scan...';
                    // Restart scanning
                    codeReader.decodeFromVideoDevice(null, videoElement, (result, err) => {
                        if (result) {
                            scannedBarcode = result.text;
                            scanStatus.textContent = 'Barcode scanned: ' + scannedBarcode;
                            deviceIdInput.value = scannedBarcode;
                            itemInfoInput.value = 'Loading...';
                            timestampInput.value = new Date().toLocaleString();
                            form.classList.remove('hidden');
                            db.collection('devices').doc(scannedBarcode).get().then(doc => {
                                if (doc.exists) {
                                    itemInfoInput.value = doc.data().itemInfo || 'No info';
                                } else {
                                    itemInfoInput.value = 'Unknown device';
                                }
                            });
                            codeReader.reset();
                            reopenBtn.remove();
                        } else if (err && !(err instanceof ZXing.NotFoundException)) {
                            scanStatus.textContent = 'Error: ' + err;
                        }
                    });
                };
                // Remove any existing button before adding
                let existingBtn = document.getElementById('reopen-scan-btn');
                if (existingBtn) existingBtn.remove();
                reopenBtn.id = 'reopen-scan-btn';
                scanStatus.appendChild(reopenBtn);
                form.reset();
                form.classList.add('hidden');
          } catch (error) {
                scanStatus.textContent = 'Error saving: ' + error.message;
          }
     });
};

// Firebase Auth state listener (ensure user is logged in)
firebase.auth().onAuthStateChanged(user => {
     if (!user) {
          document.getElementById('scan-status').textContent = 'Please log in to scan devices.';
     }
});



