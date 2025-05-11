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
const storage = firebase.storage(); // FIXED: Initialize Storage

// Logout
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

// Toggle Update Box Visibility
document.getElementById("toggle-update-btn").addEventListener("click", () => {
  document.getElementById("update-box").classList.toggle("hidden");
});

document.getElementById("toggle-update-btn2").addEventListener("click", () => {
  document.getElementById("update-box2").classList.toggle("hidden");
});

// Checking Admin Status in JavaScript
firebase.auth().onAuthStateChanged((user) => {
  if (user) {
      db.collection("users").doc(user.uid).get().then((doc) => {
          if (doc.exists && doc.data().admin) {
              document.getElementById("update-box").classList.remove("hidden");
          } else {
              window.location.href = "/401.html";
          }
      });
  } else {
      window.location.href = "/home";
  }
});

// Posting Updates
document.getElementById("post-update-btn").addEventListener("click", () => {
  const message = document.getElementById("update-message").value;
  const link = document.getElementById("update-link").value;
  const user = firebase.auth().currentUser;

  if (user) {
      db.collection("users").doc(user.uid).get().then((doc) => {
          if (doc.exists && doc.data().admin) {
              db.collection("updates").add({
                  message: message,
                  link: link,
                  timestamp: firebase.firestore.FieldValue.serverTimestamp(),
              }).then(() => {
                  alert("Update posted successfully!");
              }).catch((error) => {
                  console.error("Error posting update:", error);
              });
          } else {
              alert("You do not have permission to post updates.");
          }
      });
  }
});

// Fetching and Displaying Updates
document.addEventListener("DOMContentLoaded", () => {
  const activityLogElement = document.getElementById("activity-log");

  db.collection("updates")
      .orderBy("timestamp", "desc")
      .limit(10)
      .onSnapshot((querySnapshot) => {
          activityLogElement.innerHTML = "";
          querySnapshot.forEach((doc) => {
              const update = doc.data();
              const listItem = document.createElement("li");
              listItem.innerHTML = `<a href="${update.link}" class="text-blue-400 hover:underline">${update.message}</a>`;
              activityLogElement.appendChild(listItem);
          });
      });
});

// Create New Memo with Multi-File Handling
document.getElementById("create-memo-btn").addEventListener("click", async () => {
  const title = document.getElementById("memo-title").value.trim();
  const content = document.getElementById("memo-content").value.trim();
  const fileInput = document.getElementById("memo-file");

  if (!title || !content) {
      alert("Title and content are required.");
      return;
  }

  const user = firebase.auth().currentUser;
  if (!user) {
      alert("You must be logged in.");
      return;
  }

  // Fetch user details from Firestore
  const userDoc = await db.collection("users").doc(user.uid).get();
  const postedBy = userDoc.exists ? userDoc.data().name : "Unknown User";

  let fileURLs = [];

  if (fileInput.files.length > 0) {
      const storageRef = firebase.storage().ref();

      for (const file of fileInput.files) {
          const fileRef = storageRef.child(`memo_attachments/${user.uid}_${file.name}`);
          await fileRef.put(file);
          const downloadURL = await fileRef.getDownloadURL();
          fileURLs.push(downloadURL);
      }
  }

  // Convert multiple file URLs into a single string for Google Form submission
  const fileLinks = fileURLs.join(", ");

  // Auto-fill and submit Google Form entry
  const googleFormURL = `https://docs.google.com/forms/d/e/1FAIpQLSd2S4kVxtDUudaHNLnmdgb__bFJMBlTQJy8pUC0SSRw-bnwEA/viewform?usp=pp_url&entry.600430372=${encodeURIComponent(title)}&entry.123456789=${encodeURIComponent(fileLinks)}`;
  
  window.open(googleFormURL, "_blank"); // Opens the form with Memo Title and file links auto-filled

  const newMemo = {
      title: title,
      content: content,
      timestamp: firebase.firestore.Timestamp.now(),
      postedBy: postedBy,
      acknowledgedBy: [],
      acknowledgedDetails: [],
      attachments: fileURLs // Stores multiple file URLs
  };

  firebase.firestore().collection("memos").add(newMemo)
      .then(() => {
          alert("Memo created successfully!");
          loadMemos();
      })
      .catch((error) => {
          console.error("Error creating memo:", error);
          alert("Error creating memo: " + error.message);
      });
});




// assign space creator


document.getElementById("toggle-space-btn").addEventListener("click", () => { const spaceBox = document.getElementById("space-box"); spaceBox.classList.toggle("hidden"); });


document.addEventListener("DOMContentLoaded", () => {
    fetchUsers();
});

// Fetch users directly from Firestore
function fetchUsers() {
    db.collection("users").get()
        .then(snapshot => {
            const userSelect = document.getElementById("userSelect");
            userSelect.innerHTML = ""; // Clear dropdown

            snapshot.forEach(doc => {
                const userData = doc.data();
                let option = document.createElement("option");
                option.value = doc.id; // Use Firestore doc ID (UID)
                option.textContent = `${userData.name} (${userData.email})`;

                // Apply different colors based on access permissions
                if (userData.canCreateSpaces) {
                    option.style.color = "limegreen"; // Bright green for users with access
                } else {
                    option.style.color = "goldenrod"; // Dark yellow for users without access
                }

                userSelect.appendChild(option);
            });
        })
        .catch(error => console.error("Error fetching users from Firestore:", error));
}



// Assign Space Creator

function assignSpaceCreator() {
    const selectedUID = document.getElementById("userSelect").value;
    const statusMessage = document.getElementById("statusMessage");

    if (!statusMessage) {
        console.error("statusMessage element is missing.");
        return;
    }

    // Update Firestore (no admin check needed)
    db.collection("users").doc(selectedUID).update({ canCreateSpaces: true })
        .then(() => {
            statusMessage.textContent = "User granted space creation permissions.";

            // Update UI instantly
            const userSelect = document.getElementById("userSelect");
            const options = userSelect.options;

            for (let i = 0; i < options.length; i++) {
                if (options[i].value === selectedUID) {
                    options[i].style.color = "limegreen"; // Update color
                }
            }
        })
        .catch(error => {
            console.error("Error assigning role in Firestore:", error);
            statusMessage.textContent = "Failed to update permissions.";
        });
}
