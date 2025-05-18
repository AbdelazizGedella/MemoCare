document.addEventListener("DOMContentLoaded", () => {
    // Animate Title
    gsap.fromTo(".hero-title", {opacity: 0, y: -50}, {opacity: 1, y: 0, duration: 1});
    gsap.fromTo(".hero-subtitle", {opacity: 0, y: -20}, {opacity: 1, y: 0, duration: 1.5});

    // Fetch & Display Memo Stats (Mocked for now)
    document.getElementById("acknowledgedCount").innerText = 42;
    document.getElementById("pendingCount").innerText = 18;
    document.getElementById("notParticipatedCount").innerText = 8;
});
