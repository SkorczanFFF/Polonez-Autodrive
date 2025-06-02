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

    this.defaultCameraPosition = {
      x: 0,
      y: 1.975,
      z: 7,
    };
    this.defaultControlsTarget = {
      x: 0,
      y: 1.8,
      z: 0,
    };

    this.init();

    // Initialize dev stats after renderer is created
    this.devStats = new DevStats(this.renderer, this.scene);

    // Start animation loop
    this.animate();
  }

  init() {
    // Create renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMapSoft = true;
    this.renderer.shadowMap.type = THREE.VSMShadowMap;

    this.canvas = this.renderer.domElement;
    document.body.appendChild(this.canvas);

    // Create camera
    this.camera = new THREE.PerspectiveCamera(90, 0.8, 0.1, 1000);
    this.camera.position.set(
      this.defaultCameraPosition.x,
      this.defaultCameraPosition.y,
      this.defaultCameraPosition.z
    );
    this.camera.lookAt(this.scene.position);

    // Setup controls
    this.controls = new THREE.OrbitControls(this.camera, this.canvas);
    this.controls.enablePan = false;
    this.controls.minDistance = 4.5;
    this.controls.maxDistance = 7;
    this.controls.maxPolarAngle = Math.PI * 0.55;
    this.controls.minPolarAngle = Math.PI * 0.15;
    this.controls.target.set(
      this.defaultControlsTarget.x,
      this.defaultControlsTarget.y,
      this.defaultControlsTarget.z
    );
    this.controls.update();

    // Setup scene background and fog
    this.scene.background = new THREE.Color("#eb94c1");
    this.scene.fog = new THREE.Fog("#c348dd", 32.5, 200);

    // Setup lights
    this.setupLights();
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

    // Update dev stats
    this.devStats.update();

    // Update all mixers
    const delta = this.clock.getDelta();
    this.mixers.forEach((mixer) => mixer.update(delta));

    // Update all callbacks
    this.updateCallbacks.forEach((callback) => callback(delta));

    // Check if we need to resize
    if (this.resize()) {
      this.updateCameraAspect();
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

  resize() {
    const canvas = this.renderer.domElement;
    const width = canvas.clientWidth / 2; // Reduced resolution for 80s feel + performance
    const height = canvas.clientHeight / 2;
    const resize = canvas.width !== width || canvas.height !== height;
    if (resize) {
      this.renderer.setSize(width, height, false);
    }
    return resize;
  }

  updateCameraAspect() {
    this.camera.aspect = this.canvas.clientWidth / this.canvas.clientHeight;
    this.camera.updateProjectionMatrix();
  }

  resetCameraWithTransition(duration = 1000) {
    if (!this.camera || !this.controls) return;

    // Store current positions
    const startCameraPos = {
      x: this.camera.position.x,
      y: this.camera.position.y,
      z: this.camera.position.z,
    };

    const startTargetPos = {
      x: this.controls.target.x,
      y: this.controls.target.y,
      z: this.controls.target.z,
    };

    // Start animation
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Easing function for smooth transition
      const eased = this.easeInOutCubic(progress);

      // Update camera position
      this.camera.position.x =
        startCameraPos.x +
        (this.defaultCameraPosition.x - startCameraPos.x) * eased;
      this.camera.position.y =
        startCameraPos.y +
        (this.defaultCameraPosition.y - startCameraPos.y) * eased;
      this.camera.position.z =
        startCameraPos.z +
        (this.defaultCameraPosition.z - startCameraPos.z) * eased;

      // Update controls target
      this.controls.target.x =
        startTargetPos.x +
        (this.defaultControlsTarget.x - startTargetPos.x) * eased;
      this.controls.target.y =
        startTargetPos.y +
        (this.defaultControlsTarget.y - startTargetPos.y) * eased;
      this.controls.target.z =
        startTargetPos.z +
        (this.defaultControlsTarget.z - startTargetPos.z) * eased;

      // Update controls
      this.controls.update();

      if (progress < 1) {
        requestAnimationFrame(animate);
      }
    };

    animate();
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}

export default SceneManager;
