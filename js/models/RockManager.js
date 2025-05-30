class RockManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.rocks = [];
    this.showRock = true;
    this.showRockWireframe = true;
    this.speedMultiplier = 1.0;
    this.densityMultiplier = 1.0; // Add density multiplier
    this.spawnInterval = 1500; // Base spawn interval in ms
    this.spawnIntervalIds = []; // Store interval IDs for updating
    this.modelsLoaded = 0;
    this.rockModels = ["rockmd", "rocksm"]; // Both rock model types

    // Preload rock models
    this.modelLoader
      .preloadModel("rockmd", "models/rockmd.fbx", "rock", "rockWireframe")
      .then(() => {
        this.modelsLoaded++;
        this.checkAndStartSpawning();
      })
      .catch((error) => {
        console.error("Error loading rockmd model:", error);
      });

    // Preload small rock model
    this.modelLoader
      .preloadModel("rocksm", "models/rocksm.fbx", "rock", "rockWireframe")
      .then(() => {
        this.modelsLoaded++;
        this.checkAndStartSpawning();
      })
      .catch((error) => {
        console.error("Error loading rocksm model:", error);
      });
  }

  checkAndStartSpawning() {
    // Start spawning once at least one model is loaded
    if (this.modelsLoaded > 0 && this.spawnIntervalIds.length === 0) {
      this.startSpawning();
    }
  }

  startSpawning() {
    // Clear any existing intervals
    this.spawnIntervalIds.forEach((id) => clearInterval(id));
    this.spawnIntervalIds = [];

    console.log("Starting rock spawning");

    // Calculate intervals based on speed and density multipliers
    const adjustedInterval = Math.max(
      500,
      this.spawnInterval / (this.speedMultiplier * this.densityMultiplier)
    );

    // First interval
    this.spawnIntervalIds.push(
      setInterval(() => this.spawnRocks(), adjustedInterval)
    );

    // Second interval with offset for more density
    this.spawnIntervalIds.push(
      setTimeout(() => {
        this.spawnIntervalIds.push(
          setInterval(() => this.spawnRocks(), adjustedInterval)
        );
      }, adjustedInterval / 2)
    );
  }

  spawnRocks() {
    // Generate random x position between -80 to -16 and 16 to 80
    let xPosition;
    if (Math.random() < 0.5) {
      // Left side (-80 to -16)
      xPosition = -80 + Math.random() * 64;
    } else {
      // Right side (16 to 80)
      xPosition = 16 + Math.random() * 64;
    }

    const rotationY = Math.random() * 2 * Math.PI;
    // Random scale between 1 and 4
    const scale = 1 + Math.random() * 3;

    // Randomly choose between rock models
    const rockModel =
      this.rockModels[Math.floor(Math.random() * this.rockModels.length)];

    this.createRock(xPosition, rotationY, scale, rockModel);
  }

  createRock(xPosition, rotationY, scale, modelKey = "rockmd") {
    // Use the specified model, fallback to rockmd if not available
    if (!this.modelLoader.getModel(modelKey)) {
      modelKey = "rockmd"; // Fallback

      // If even the fallback is not available, return
      if (!this.modelLoader.getModel(modelKey)) {
        return;
      }
    }

    // Create normal rock
    const rockNormal = this.modelLoader.createModelInstance(
      modelKey,
      { x: xPosition, y: 0, z: -100 },
      { y: rotationY }
    );

    if (!rockNormal) return;

    // Apply scale
    rockNormal.scale.set(scale, scale, scale);

    rockNormal.userData.isRock = true;
    rockNormal.visible = this.showRock;

    // Create wireframe rock with same model
    const rockWireframe = this.modelLoader.createModelInstance(
      `${modelKey}Wireframe`,
      { x: xPosition, y: 0, z: -100 },
      { y: rotationY }
    );

    if (!rockWireframe) return;

    // Apply same scale to wireframe
    rockWireframe.scale.set(scale, scale, scale);

    rockWireframe.userData.isRockWireframe = true;
    rockWireframe.visible = this.showRockWireframe;

    // Ensure perfect alignment
    this.syncModels(rockNormal, rockWireframe);

    // Store reference to both models
    const rock = { normal: rockNormal, wireframe: rockWireframe };
    this.rocks.push(rock);

    // Animate the rock pair together
    this.animateRockPair(rock, () => {
      // Remove both models from scene and from our array when animation is complete
      this.scene.remove(rockNormal);
      this.scene.remove(rockWireframe);

      const index = this.rocks.findIndex((r) => r.normal === rockNormal);
      if (index !== -1) {
        this.rocks.splice(index, 1);
      }
    });

    return rock;
  }

  // Synchronize the positions of two models
  syncModels(modelA, modelB) {
    // Ensure identical position, rotation, and scale
    modelB.position.copy(modelA.position);
    modelB.rotation.copy(modelA.rotation);
    modelB.scale.copy(modelA.scale);
  }

  // Animate both normal and wireframe models together
  animateRockPair(rock, onComplete) {
    const startTime = Date.now();
    // Apply speed multiplier to make rocks move faster
    const duration = 14000 / this.speedMultiplier; // Time in milliseconds for the rock to move across the road

    const update = () => {
      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Move from -100 to +100 along z-axis - update normal model
      rock.normal.position.z = -100 + progress * 200;

      // Sync wireframe position to match normal model
      this.syncModels(rock.normal, rock.wireframe);

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

  updateVisibility(showRock, showRockWireframe) {
    this.showRock = showRock;
    this.showRockWireframe = showRockWireframe;

    // Update visibility for all existing rocks
    this.rocks.forEach((rock) => {
      rock.normal.visible = showRock;
      rock.wireframe.visible = showRockWireframe;
    });
  }
}

export default RockManager;
