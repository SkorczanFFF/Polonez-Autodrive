import Application from "./core/Application.js";

document.addEventListener("DOMContentLoaded", () => {
  try {
    const app = new Application();
    window.app = app; // Debug access
  } catch (error) {
    console.error("Failed to initialize application:", error);
  }
});
