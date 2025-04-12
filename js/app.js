
// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
  authDomain: "ctwo-eee79.firebaseapp.com",
  projectId: "ctwo-eee79",
  storageBucket: "ctwo-eee79.appspot.com",
  messagingSenderId: "788657051205",
  appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
  measurementId: "G-4VTCQR4ZVR"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

firebase.auth();
firebase.firestore();
firebase.analytics();



const db = firebase.firestore();
const auth = firebase.auth();



function loadMemos() {
  const user = auth.currentUser;
  const userId = user ? user.uid : null;

  db.collection("memos")
    .orderBy("timestamp", "desc")
    .get()
    .then(async (querySnapshot) => {
      const memoList = document.getElementById("memo-list");
      memoList.innerHTML = "";

      if (querySnapshot.empty) {
        memoList.innerHTML = "<p class='text-gray-400'>No memos found.</p>";
        return;
      }

      for (const doc of querySnapshot.docs) {
        const memo = doc.data();
        const memoId = doc.id;
        
        const acknowledgedDetails = memo.acknowledgedDetails || [];
        const hasAcknowledged = acknowledgedDetails.some(entry => entry.uid === userId);

        const memoTimestamp = memo.timestamp?.toDate();
        const now = new Date();

        let btnClass = "btn-warning"; // Default: yellow
        if (hasAcknowledged) {
          btnClass = "btn-success"; // Green
        } else if (memoTimestamp && now.toDateString() !== memoTimestamp.toDateString()) {
          btnClass = "btn-error"; // Red
        }

        let memoAgo = "";
        if (memoTimestamp) {
          const diffMs = now.getTime() - memoTimestamp.getTime();
          const seconds = Math.floor(diffMs / 1000);
          const days = Math.floor(seconds / (3600 * 24));
          const hours = Math.floor((seconds % (3600 * 24)) / 3600);
          const minutes = Math.floor((seconds % 3600) / 60);
          const secs = seconds % 60;
        
          memoAgo = `${days}d ${hours}h ${minutes}m ${secs}s ago`;
        }

        // Calculate time difference and sort acknowledgers by response time
        const acknowledgersWithDiff = acknowledgedDetails.map((entry) => {
          const ackTime = entry.timestamp?.toDate();
          const ackSeconds = ackTime && memoTimestamp
            ? Math.floor((ackTime.getTime() - memoTimestamp.getTime() ) / 1000)
            : null;
          return { ...entry, ackSeconds };
        });

        const sorted = acknowledgersWithDiff
          .filter(e => e.ackSeconds !== null)
          .sort((a, b) => a.ackSeconds - b.ackSeconds);

        const topTimes = sorted.slice(0, 3).map(e => e.ackSeconds);
        const fastestTime = sorted.length > 0 ? sorted[0].ackSeconds : null;

        const acknowledgers = sorted.map((e, index) => {
          let medal = "";
          if (index === 0) medal = "🥇 ";
          else if (index === 1) medal = "🥈 ";
          else if (index === 2) medal = "🥉 ";

          const fastEmoji = e.ackSeconds === fastestTime ? " " : "";

          return `<li class="text-xs text-gray-300">
                    ${medal}${fastEmoji}${e.name} ( ${e.ackSeconds}s ) ${new Date(e.timestamp?.seconds * 1000).toLocaleString()}
                  </li>`;
        }).join("");

        const memoDiv = document.createElement("div");

// Calculate the number of acknowledgers based on the acknowledgedDetails map
const acknowledgedCount = acknowledgedDetails.length;  // Count the number of entries in the acknowledgedDetails map

// Create the memo div
memoDiv.className = "bg-gray-800 text-white p-4 mb-4 rounded-xl shadow-md";
memoDiv.innerHTML = `
  <h2 class="text-xl font-bold text-blue-300 mb-1">${memo.title}</h2>
  <p class="mb-2 text-gray-200">${memo.content}</p>
  <p class="text-xs text-gray-400 mb-2">
    🕒 Posted at: ${memoTimestamp?.toLocaleString() || 'N/A'} (${memoAgo})
  </p>

  ${!hasAcknowledged ? `<button class="btn ${btnClass} mb-2" onclick="acknowledgeMemo('${memoId}')">
    Acknowledge
  </button>` : ''}

  <p class="text-sm text-blue-400 font-semibold">Acknowledged by: ${acknowledgedDetails.length}</p>
  <ul class="ml-4">${acknowledgers}</ul>
`;


memoList.appendChild(memoDiv);


      }
    })
    .catch((error) => {
      console.error("Error fetching memos:", error);
    });
}


function loadUserProfile() {
  const user = auth.currentUser;
  if (!user) return;

  const userRef = db.collection("users").doc(user.uid);

  userRef.get().then(userDoc => {
    if (!userDoc.exists) return;

    const data = userDoc.data();
    const name = data.name || user.displayName || "Unknown";
    const email = user.email;
    const picUrl = data.profilePic || 'https://i.imgur.com/6VBx3io.png'; // default pic

    // Populate fields
    document.getElementById("profile-name-input").value = name;
    document.getElementById("profile-email").textContent = email;
    document.getElementById("profile-uid").textContent = user.uid;
    document.getElementById("profile-points").textContent = data.points || 0;
    document.getElementById("profile-pic").src = picUrl;
  });
}

function updateUserName() {
  const user = firebase.auth().currentUser;
  if (!user) return;

  const userId = user.uid;
  const userRef = db.collection("users").doc(userId);
  const nameInput = document.getElementById("profile-name-input").value.trim();

  if (!nameInput) {
    alert("Please enter your name.");
    return;
  }

  userRef.get().then(doc => {
    if (doc.exists) {
      return userRef.update({ name: nameInput });
    } else {
      return userRef.set({
        name: nameInput,
        email: user.email,
        points: 0,
        acknowledgedMemos: []
      });
    }
  }).then(() => {
    alert("Profile updated successfully!");
    document.getElementById("profile-name-input").value = nameInput;
    document.getElementById("profile-email").textContent = user.email;
  }).catch(error => {
    console.error("Error updating profile:", error);
    alert("An error occurred while updating your profile.");
  });
}

// Upload profile picture
document.getElementById('upload-btn').addEventListener('click', async () => {
  const fileInput = document.getElementById('profile-pic-upload');
  const file = fileInput.files[0];
  if (!file) return alert('Please select a file.');

  const user = firebase.auth().currentUser;
  if (!user) return alert('You must be logged in.');

  const storageRef = firebase.storage().ref(`profile_pictures/${user.uid}`);
  try {
    await storageRef.put(file);
    const downloadURL = await storageRef.getDownloadURL();

    await firebase.firestore().collection('users').doc(user.uid).update({
      profilePic: downloadURL // Save the URL as text
    });

    const profilePicPreview = document.getElementById('profile-pic-preview');
    if (profilePicPreview) {
      profilePicPreview.src = downloadURL; // Update the profile picture preview
    } else {
      console.error('Profile picture preview element not found.');
    }

    alert('Profile picture uploaded successfully!');
  } catch (error) {
    console.error("Upload failed:", error);
    alert("Upload failed: " + error.message);
  }
});

// Acknowledge memo
function acknowledgeMemo(memoId) {
  const user = auth.currentUser;

  if (!user) {
    alert("Please log in to acknowledge a memo.");
    return;
  }

  const userId = user.uid;
  const userRef = db.collection("users").doc(userId);
  const memoRef = db.collection("memos").doc(memoId);

  userRef.get().then(async (userDoc) => {
    // If user doesn't exist in DB, create user document
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

      // Check if user has already acknowledged
      const alreadyAcknowledged = acknowledgedDetails.some(entry => entry.uid === userId);
      if (alreadyAcknowledged) {
        alert("You have already acknowledged this memo.");
        return;
      }

      // Prepare new acknowledgment entry
const userData = userSnap.data();
const newAck = {
  uid: userId,
  name: userData.name || "Unknown",
  timestamp: firebase.firestore.Timestamp.now()
};

      // Update memo
      transaction.update(memoRef, {
        acknowledgedDetails: firebase.firestore.FieldValue.arrayUnion(newAck)
      });

      // Update user
      transaction.update(userRef, {
        acknowledgedMemos: firebase.firestore.FieldValue.arrayUnion(memoId),
        points: firebase.firestore.FieldValue.increment(10)
      });
    });
  }).then(() => {
    alert("Memo acknowledged successfully!");
    loadMemos();
  }).catch((error) => {
    console.error("Error acknowledging memo:", error);
    alert("An error occurred while acknowledging the memo.");
  });
}


// Function to handle the acknowledgment logic
function proceedWithAcknowledge(userRef, memoId, userId) {
  db.runTransaction((transaction) => {
    return transaction.get(userRef).then((userDoc) => {
      if (!userDoc.exists) {
        throw "User not found!";
      }

      const userData = userDoc.data();
      const acknowledgedMemos = userData.acknowledgedMemos || [];
      const points = userData.points || 0;

      if (acknowledgedMemos.includes(memoId)) {
        alert("You have already acknowledged this memo.");
        return;
      }

      // Add memoId to the user's acknowledged list and update points
      acknowledgedMemos.push(memoId);

      // Update the user's document and memo's acknowledgedBy list
      transaction.update(userRef, {
        acknowledgedMemos: acknowledgedMemos,
        points: points + 1,
      });

      // Update the memo's acknowledgedBy list
      const memoRef = db.collection("memos").doc(memoId);
      transaction.update(memoRef, {
        acknowledgedBy: firebase.firestore.FieldValue.arrayUnion(userId),
      });
    });
  }).then(() => {
    alert("Memo acknowledged successfully!");
    loadMemos();  // Reload memos to reflect changes
  }).catch(error => {
    console.error("Acknowledge failed:", error);
  });
}

firebase.auth().onAuthStateChanged(user => {
  if (user) {
    const userRef = db.collection("users").doc(user.uid);
    userRef.get().then(doc => {
      if (!doc.exists) {
        showSection("profile");
        document.getElementById("profile-email").textContent = user.email;
        alert("Welcome! Please complete your profile.");
      } else {
        const data = doc.data();
        document.getElementById("profile-name-input").value = data.name || "";
        document.getElementById("profile-email").textContent = data.email || user.email;
        document.getElementById("profile-points").textContent = data.points || 0;
        showSection("memos");
      }
    });
  }
});
