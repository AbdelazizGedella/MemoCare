// ===== Firebase init (compat) =====
const firebaseConfig = {
  apiKey: "AIzaSyCByQute9IKG_2nvSFWcAThgEH7PKIhMDw",
  authDomain: "ctwo-eee79.firebaseapp.com",
  projectId: "ctwo-eee79",
  storageBucket: "ctwo-eee79.appspot.com",
  messagingSenderId: "788657051205",
  appId: "1:788657051205:web:5d4b6884a0ca09e4cb352c",
  measurementId: "G-4VTCQR4ZVR"
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

// ===== Toast helper (DaisyUI) =====
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function showToast(type, message, duration = 2500) {
  const container = document.getElementById("toastContainer");
  if (!container) {
    alert(message); // fallback
    return;
  }

  const cls =
    type === "success" ? "alert-success" :
    type === "error"   ? "alert-error"   :
    type === "warning" ? "alert-warning" : "alert-info";

  const el = document.createElement("div");
  el.className = `alert ${cls} shadow-lg`;
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;

  container.appendChild(el);

  // fade out
  setTimeout(() => {
    el.style.transition = "opacity .25s ease";
    el.style.opacity = "0";
  }, Math.max(0, duration - 300));

  setTimeout(() => el.remove(), duration);
}

// ===== Auto redirect if already logged in (staff يدخل Dashboard مباشرة) =====
auth.onAuthStateChanged((user) => {
  if (user) window.location.replace("Dashboard.html");
});

// ===== Signup =====
async function signup() {
  const name = document.getElementById("name")?.value?.trim();
  const email = document.getElementById("email")?.value?.trim();
  const password = document.getElementById("password")?.value?.trim();
  const phoneNumber = document.getElementById("phoneNumber")?.value?.trim();

  if (!name || !email || !password) {
    showToast("warning", "Please fill in all fields.");
    return;
  }

  const btn = document.getElementById("btnSignup");
  const oldText = btn?.textContent;

  try {
    if (btn) {
      btn.disabled = true;
      btn.classList.add("loading");
      btn.textContent = "Creating...";
    }

    // Keep user logged in
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (_) {}

    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    const userId = user.uid;

    await db.collection("users").doc(userId).set({
      name,
      email,
      admin: false,
      profilePic: "https://i.imgur.com/6VBx3io.png",
      createdAt: new Date().toISOString(),
      phoneNumber: phoneNumber || "",
      canCreateSpaces: false
    }, { merge: true });

    showToast("success", "Signup successful! Redirecting...");
    setTimeout(() => window.location.replace("Dashboard.html"), 800);

  } catch (error) {
    console.error("Error signing up:", error);
    showToast("error", "Signup failed: " + (error?.message || "Unknown error"));
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.classList.remove("loading");
      btn.textContent = oldText || "Create Account";
    }
  }
}

// لازم تكون global عشان onclick يشتغل
window.signup = signup;
window.showToast = showToast;
