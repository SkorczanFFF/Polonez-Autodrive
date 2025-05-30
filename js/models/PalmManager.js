class PalmManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.palms = [];
    this.showPalm = true;
    this.showPalmWireframe = true;
    this.speedMultiplier = 1.0;
    this.densityMultiplier = 1.0; // Add density multiplier
    this.spawnInterval = 1500; // Base spawn interval in ms
    this.spawnIntervalId = null; // Store the interval ID for updating

    // Preload palm model - ensure correct case sensitivity
    this.modelLoader
      .preloadModel("palm", "models/palm.FBX", "palm", "palmWireframe")
      .then(() => {
        // Start spawning palms periodically once models are loaded
        this.startSpawning();
      })
      .catch((error) => {
        console.error("Error loading palm model:", error);
        // Try a fallback with lowercase extension
        this.modelLoader
          .preloadModel("palm", "models/palm.fbx", "palm", "palmWireframe")
          .then(() => {
            // Start spawning palms periodically once models are loaded
            this.startSpawning();
          })
          .catch((error) => {
            console.error("Failed to load palm model with both cases:", error);
          });
      });
  }

  startSpawning() {
    // Only start spawning if we successfully loaded the palm model
    if (this.modelLoader.getModel("palm")) {
      console.log("Starting palm spawning");

      // Clear any existing interval
      if (this.spawnIntervalId) {
        clearInterval(this.spawnIntervalId);
      }

      // Calculate interval based on speed and density multipliers
      const adjustedInterval = Math.max(
        500,
        this.spawnInterval / (this.speedMultiplier * this.densityMultiplier)
      );

      // Start spawning with updated interval
      this.spawnIntervalId = setInterval(
        () => this.spawnPalms(),
        adjustedInterval
      );
    } else {
      console.error("Cannot start palm spawning - model not loaded");
    }
  }

  spawnPalms() {
    const rotationLeft = Math.random() * 2 * Math.PI;
    const rotationRight = Math.random() * 2 * Math.PI;

    // Create left and right palms
    this.createPalm(-11, rotationLeft);
    this.createPalm(11, rotationRight);
  }

  createPalm(xPosition, rotationY) {
    // Create normal palm
    const palmNormal = this.modelLoader.createModelInstance(
      "palm",
      { x: xPosition, y: 0, z: -100 },
      { y: rotationY }
    );

    if (!palmNormal) return;

    palmNormal.userData.isPalm = true;
    palmNormal.visible = this.showPalm;

    // Create wireframe palm
    const palmWireframe = this.modelLoader.createModelInstance(
      "palmWireframe",
      { x: xPosition, y: 0, z: -100 },
      { y: rotationY }
    );

    if (!palmWireframe) return;

    palmWireframe.userData.isPalmWireframe = true;
    palmWireframe.visible = this.showPalmWireframe;

    // Ensure perfect alignment
    this.syncModels(palmNormal, palmWireframe);

    // Store reference to both models
    const palm = { normal: palmNormal, wireframe: palmWireframe };
    this.palms.push(palm);

    // Animate the palm pair together
    this.animatePalmPair(palm, () => {
      // Remove both models from scene and from our array when animation is complete
      this.scene.remove(palmNormal);
      this.scene.remove(palmWireframe);

      const index = this.palms.findIndex((p) => p.normal === palmNormal);
      if (index !== -1) {
        this.palms.splice(index, 1);
      }
    });

    return palm;
  }

  // New method to synchronize the positions of two models
  syncModels(modelA, modelB) {
    // Ensure identical position, rotation, and scale
    modelB.position.copy(modelA.position);
    modelB.rotation.copy(modelA.rotation);
    modelB.scale.copy(modelA.scale);
  }

  // Animate both normal and wireframe models together
  animatePalmPair(palm, onComplete) {
    const startTime = Date.now();
    // Apply speed multiplier to make palms move faster
    const duration = 14000 / this.speedMultiplier; // Time in milliseconds for the palm to move across the road

    const update = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Move from -100 to +100 along z-axis - update normal model
      palm.normal.position.z = -100 + progress * 200;

      // Sync wireframe position to match normal model
      this.syncModels(palm.normal, palm.wireframe);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (onComplete) onComplete();
      }
    };

    update();
  }

  // Set speed multiplier
  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;

    // Update spawning rate when speed changes
    this.startSpawning();
  }

  // Add density control method
  setDensity(multiplier) {
    this.densityMultiplier = multiplier;
    this.startSpawning(); // Restart spawning with new density
  }

  updateVisibility(showPalm, showPalmWireframe) {
    this.showPalm = showPalm;
    this.showPalmWireframe = showPalmWireframe;

    // Update visibility for all existing palms
    this.palms.forEach((palm) => {
      palm.normal.visible = showPalm;
      palm.wireframe.visible = showPalmWireframe;
    });
  }
}

export default PalmManager;
