import Application from "./core/Application.js";

// Add diagnostics before starting application
function printDiagnostics() {
  console.log("Diagnostics:");
  console.log("User agent:", navigator.userAgent);
  console.log("Hostname:", window.location.hostname);
  console.log("URL:", window.location.href);

  // Check if running on Vercel
  const isVercel =
    window.location.hostname.includes("vercel.app") ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";

  console.log("Environment:", isVercel ? "Vercel" : "Other");
}

// Global error handler
window.addEventListener("error", function (event) {
  console.error("Global error caught:", event.error);
  // Display visible error if needed
  // This helps catch errors that might not be visible in deployed environments
  if (
    window.location.hostname !== "localhost" &&
    window.location.hostname !== "127.0.0.1"
  ) {
    const errorMsg = document.createElement("div");
    errorMsg.style.position = "fixed";
    errorMsg.style.top = "10px";
    errorMsg.style.left = "10px";
    errorMsg.style.backgroundColor = "rgba(0,0,0,0.7)";
    errorMsg.style.color = "white";
    errorMsg.style.padding = "10px";
    errorMsg.style.zIndex = "9999";
    errorMsg.style.maxWidth = "80%";
    errorMsg.textContent = `Error: ${event.message || "Unknown error"}`;
    document.body.appendChild(errorMsg);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  // Print diagnostics to console
  printDiagnostics();

  try {
    // Create application
    const app = new Application();

    // Make app available globally for debugging
    window.app = app;
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
});
