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
const auth = firebase.auth();

// ===== Toast helper (DaisyUI) =====
function escapeHtml(str = "") {
  return String(str).replace(/[&<>"']/g, (m) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[m]));
}

function showToast(type, message, duration = 2600) {
  const container = document.getElementById("toastContainer");
  if (!container) { alert(message); return; }

  const cls =
    type === "success" ? "alert-success" :
    type === "error"   ? "alert-error"   :
    type === "warning" ? "alert-warning" : "alert-info";

  const el = document.createElement("div");
  el.className = `alert ${cls} shadow-lg`;
  el.innerHTML = `<span>${escapeHtml(message)}</span>`;
  container.appendChild(el);

  setTimeout(() => {
    el.style.transition = "opacity .25s ease";
    el.style.opacity = "0";
  }, Math.max(0, duration - 300));

  setTimeout(() => el.remove(), duration);
}

// ===== Auto redirect if already logged in =====
auth.onAuthStateChanged((user) => {
  if (user) window.location.replace("Dashboard.html");
});

// ===== Helpers =====
function setBtnLoading(isLoading, textLoading = "Logging in...") {
  const btn = document.getElementById("btnLogin");
  if (!btn) return;

  if (isLoading) {
    btn.disabled = true;
    btn.dataset.oldText = btn.textContent || "Login";
    btn.classList.add("loading");
    btn.textContent = textLoading;
  } else {
    btn.disabled = false;
    btn.classList.remove("loading");
    btn.textContent = btn.dataset.oldText || "Login";
  }
}

function normalizeAuthError(err) {
  const code = err?.code || "";
  if (code.includes("auth/invalid-email")) return "Invalid email format.";
  if (code.includes("auth/user-not-found")) return "No account found for this email.";
  if (code.includes("auth/wrong-password")) return "Wrong password.";
  if (code.includes("auth/too-many-requests")) return "Too many attempts. Try again later.";
  if (code.includes("auth/user-disabled")) return "This account is disabled.";
  return err?.message || "Login failed.";
}

// ===== Login =====
async function login() {
  const emailEl = document.getElementById("email");
  const passEl  = document.getElementById("password");

  const email = (emailEl?.value || "").trim();
  const password = (passEl?.value || "").trim();

  if (!email || !password) {
    showToast("warning", "Please enter email and password.");
    return;
  }

  try {
    setBtnLoading(true);

    // Keep session persistent
    try {
      await auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);
    } catch (_) {}

    await auth.signInWithEmailAndPassword(email, password);

    showToast("success", "Login successful! Redirecting...");
    setTimeout(() => window.location.replace("Dashboard.html"), 600);

  } catch (error) {
    console.error("Login failed:", error);
    showToast("error", normalizeAuthError(error));
  } finally {
    setBtnLoading(false);
  }
}

// ===== Reset Password =====
async function resetPassword() {
  const email = (document.getElementById("email")?.value || "").trim();

  if (!email) {
    showToast("warning", "Please enter your email first.");
    return;
  }

  try {
    setBtnLoading(true, "Sending reset email...");
    await auth.sendPasswordResetEmail(email);
    showToast("success", "Password reset email sent. Check your inbox (and spam).");
  } catch (error) {
    console.error("Reset password error:", error);
    showToast("error", normalizeAuthError(error));
  } finally {
    setBtnLoading(false);
  }
}

// لازم تكون global عشان onclick في الـ HTML يشتغل
window.login = login;
window.resetPassword = resetPassword;
window.showToast = showToast;
