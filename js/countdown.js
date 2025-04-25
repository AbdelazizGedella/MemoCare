document.addEventListener("DOMContentLoaded", () => {
    const countdownScreen = document.getElementById("countdown-screen");
    const countdownText = document.getElementById("countdown-text");
    const mainContent = document.getElementById("main-content");

    let countdown = 3;
    const interval = setInterval(() => {
        countdownText.textContent = countdown;
        countdown--;

        if (countdown < 0) {
            clearInterval(interval);
            countdownScreen.classList.add("hidden"); // Hide countdown overlay
            mainContent.classList.remove("hidden"); // Show main content
            setTimeout(() => {
                window.location.href = "login.html"; // Redirect to login page
            }, 1000); // Redirect delay
        }
    }, 1000); // 1-second interval
});
