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

function login() {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  firebase.auth().signInWithEmailAndPassword(email, password)
    .then((userCredential) => {
      window.location.href = "Dashboard.html";
    })
    .catch((error) => {
      alert("Login failed: " + error.message);
    });
}



function resetPassword() {
  const email = document.getElementById("email").value;

  if (!email) {
    alert("من فضلك أدخل الإيميل أولاً.");
    return;
  }

  firebase.auth().sendPasswordResetEmail(email)
    .then(() => {
      alert("تم إرسال رابط إعادة تعيين كلمة السر إلى بريدك الإلكتروني.");
    })
    .catch((error) => {
      alert("فشل في إرسال الرابط: " + error.message);
    });
}
