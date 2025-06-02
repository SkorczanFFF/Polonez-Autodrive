import DevStats from "../utils/DevStats.js";

class SceneManager {
  constructor() {
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.canvas = null;
    this.controls = null;
    this.clock = new THREE.Clock();
    this.mixers = [];
    this.updateCallbacks = [];
    this.devStats = null;
    this.lastWidth = 0;
    this.lastHeight = 0;
    this.resizeThrottleId = null;
    this.isResizing = false;

    this.init();

    // Initialize dev stats after renderer is created
    this.devStats = new DevStats(this.renderer, this.scene);

    // Add resize listener with throttling
    window.addEventListener("resize", () => this.handleResize(), {
      passive: true,
    });

    // Start animation loop
    this.animate();
  }

  init() {
    // Create renderer with optimized settings
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: "high-performance",
      stencil: false,
      depth: true,
    });

    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio

    this.canvas = this.renderer.domElement;
    document.body.appendChild(this.canvas);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(90, 0.8, 0.1, 1000);
    this.camera.position.set(0, 1.975, 7);
    this.camera.lookAt(this.scene.position);

    // Setup controls
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.controls.minPolarAngle = Math.PI * 0.15;
    this.controls.target.set(0, 1.8, 0);
    this.controls.update();

    // Setup scene background and fog
    this.scene.background = new THREE.Color("#eb94c1");
    this.scene.fog = new THREE.Fog("#c348dd", 32.5, 200);

    // Setup lights
    this.setupLights();

    // Initial resize
    this.handleResize();
  }

  handleResize() {
    if (this.resizeThrottleId) return;

    this.resizeThrottleId = requestAnimationFrame(() => {
      this.resize();
      this.resizeThrottleId = null;
    });
  }

  resize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth / 2;
    const height = canvas.clientHeight / 2;

    if (this.lastWidth !== width || this.lastHeight !== height) {
      this.lastWidth = width;
      this.lastHeight = height;

      this.renderer.setSize(width, height, false);
      this.camera.aspect = width / height;
      this.camera.updateProjectionMatrix();

      return true;
    }
    return false;
  }

  setupLights() {
    const white = "#ededed";

    // Ambient light
    const light = new THREE.AmbientLight(white, 0.95);
    this.scene.add(light);

    // Directional lights
    this.addDirectionalLight(0, 15, -50, white, 0.5);
    this.addDirectionalLight(-5, 17, -50, white, 0.25);
    this.addDirectionalLight(5, 17, -50, white, 0.25);
    this.addDirectionalLight(-10, 20, -50, white, 0.15);
    this.addDirectionalLight(10, 20, -50, white, 0.15);

    // Configure shadow settings
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }

  addDirectionalLight(x, y, z, color, intensity) {
    const light = new THREE.DirectionalLight(color, intensity);
    light.position.set(x, y, z);
    light.castShadow = true;
    light.shadow.bias = 0;
    light.shadow.mapSize.width = 1024;
    light.shadow.mapSize.height = 1024;
    light.shadow.camera.near = 1;
    light.shadow.camera.far = 500;
    light.shadow.camera.left = -50;
    light.shadow.camera.right = 50;
    light.shadow.camera.top = 50;
    light.shadow.camera.bottom = -50;
    this.scene.add(light);
    return light;
  }

  addMixer(mixer) {
    this.mixers.push(mixer);
  }

  addUpdateCallback(callback) {
    if (typeof callback === "function") {
      this.updateCallbacks.push(callback);
    }
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const delta = this.clock.getDelta();

    // Batch updates
    if (this.mixers.length > 0 || this.updateCallbacks.length > 0) {
      // Update all mixers
      for (let i = 0; i < this.mixers.length; i++) {
        this.mixers[i].update(delta);
      }

      // Update all callbacks
      for (let i = 0; i < this.updateCallbacks.length; i++) {
        this.updateCallbacks[i](delta);
      }
    }

    // Update controls if needed
    if (this.controls.enabled) {
      this.controls.update();
    }

    // Update dev stats
    if (this.devStats) {
      this.devStats.update();
    }

    // Render the scene
    this.renderer.render(this.scene, this.camera);
  }

  update() {
    // Update all animation mixers
    const delta = this.clock.getDelta();
    this.mixers.forEach((mixer) => mixer.update(delta));

    // Call all update callbacks
    this.updateCallbacks.forEach((callback) => callback(delta));
  }

  render() {
    if (this.resize()) {
      this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
      this.camera.updateProjectionMatrix();
    }
    this.renderer.render(this.scene, this.camera);
  }

  updateCameraAspect() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  // Add method to set PolonezController for DevStats
  setPolonezController(controller) {
    if (this.devStats) {
      this.devStats.setPolonezController(controller);
    }
  }
}

export default SceneManager;
