import Application from "./core/Application.js";

document.addEventListener("DOMContentLoaded", () => {
  const app = new Application();

  // Make app available globally for debugging
  window.app = app;
});
