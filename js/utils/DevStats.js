class DevStats {
  constructor(renderer, scene) {
    if (!renderer) {
      console.error("DevStats: Renderer is required");
      return;
    }

    this.renderer = renderer;
    this.scene = scene;
    this.visible = false;
    this.lastTime = performance.now();
    this.frames = 0;
    this.fps = 0;

    // Create stats container
    this.container = document.createElement("div");
    this.container.style.position = "fixed";
    this.container.style.bottom = "20px"; // Position at bottom
    this.container.style.left = "20px"; // Position at left
    this.container.style.backgroundColor = "rgba(0, 0, 0, 0.85)"; // More opaque background
    this.container.style.color = "#00ff00";
    this.container.style.padding = "15px";
    this.container.style.fontFamily = "monospace";
    this.container.style.fontSize = "14px"; // Slightly larger font
    this.container.style.lineHeight = "1.5"; // Better line spacing
    this.container.style.zIndex = "1000";
    this.container.style.display = "none";
    this.container.style.borderRadius = "5px"; // Rounded corners
    this.container.style.border = "1px solid #00ff00"; // Retro-style border
    this.container.style.boxShadow = "0 0 10px rgba(0, 255, 0, 0.3)"; // Subtle glow
    document.body.appendChild(this.container);

    // Bind event listener
    this.handleKeyPress = this.handleKeyPress.bind(this);
    document.addEventListener("keydown", this.handleKeyPress);
  }

  handleKeyPress(event) {
    if (event.key === "F10") {
      event.preventDefault();
      this.visible = !this.visible;
      this.container.style.display = this.visible ? "block" : "none";
    }
  }

  update() {
    if (!this.visible || !this.renderer) return;

    this.frames++;
    const time = performance.now();

    // Update FPS every second
    if (time >= this.lastTime + 1000) {
      this.fps = Math.round((this.frames * 1000) / (time - this.lastTime));
      this.frames = 0;
      this.lastTime = time;
    }

    // Get renderer info
    const info = this.renderer.info;
    const memory = info.memory;
    const render = info.render;

    // Update stats display with better formatting
    this.container.innerHTML = `
      <div style="margin-bottom: 5px; border-bottom: 1px solid #00ff00;">PERFORMANCE STATS</div>
      <table style="border-spacing: 10px 0; border-collapse: separate;">
        <tr><td>FPS:</td><td>${this.fps}</td></tr>
        <tr><td>Triangles:</td><td>${render.triangles.toLocaleString()}</td></tr>
        <tr><td>Vertices:</td><td>${memory.geometries.toLocaleString()}</td></tr>
        <tr><td>Draw calls:</td><td>${render.calls}</td></tr>
        <tr><td>Textures:</td><td>${memory.textures}</td></tr>
        <tr><td>Programs:</td><td>${
          info.programs ? info.programs.length : 0
        }</td></tr>
        <tr><td>Frame #:</td><td>${render.frame}</td></tr>
      </table>
    `;
  }

  dispose() {
    document.removeEventListener("keydown", this.handleKeyPress);
    if (this.container && this.container.parentNode) {
      this.container.parentNode.removeChild(this.container);
    }
  }
}

export default DevStats;
