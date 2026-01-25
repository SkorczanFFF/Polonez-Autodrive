import SpawnManager from "./SpawnManager.js";

class RockManager extends SpawnManager {
  constructor(scene, modelLoader) {
    super(scene, modelLoader);
    this.modelsLoaded = 0;
    this.rockModels = ["rockmd", "rocksm"];
    this.loadModels();
  }

  loadModels() {
    const onModelLoaded = () => {
      this.modelsLoaded++;
      if (this.modelsLoaded > 0 && this.spawnIntervalIds.length === 0) {
        this.startSpawning();
      }
    };

    this.modelLoader
      .preloadModel("rockmd", "models/rockmd.fbx", "rock", "rockWireframe")
      .then(onModelLoaded)
      .catch((error) => console.error("Error loading rockmd:", error));

    this.modelLoader
      .preloadModel("rocksm", "models/rocksm.fbx", "rock", "rockWireframe")
      .then(onModelLoaded)
      .catch((error) => console.error("Error loading rocksm:", error));
  }

  startSpawning() {
    this.clearIntervals();

    const adjustedInterval = Math.max(
      500,
      this.spawnInterval / (this.speedMultiplier * this.densityMultiplier)
    );

    // Two staggered intervals for higher density
    this.spawnIntervalIds.push(
      setInterval(() => this.spawn(), adjustedInterval)
    );

    this.spawnIntervalIds.push(
      setTimeout(() => {
        this.spawnIntervalIds.push(
          setInterval(() => this.spawn(), adjustedInterval)
        );
      }, adjustedInterval / 2)
    );
  }

  spawn() {
    // Random X: left side (-80 to -16) or right side (16 to 80)
    const xPosition = Math.random() < 0.5
      ? -80 + Math.random() * 64
      : 16 + Math.random() * 64;

    const rotation = Math.random() * 2 * Math.PI;
    const scale = 1 + Math.random() * 3;
    const modelKey = this.rockModels[Math.floor(Math.random() * this.rockModels.length)];

    this.createRock(xPosition, rotation, scale, modelKey);
  }

  createRock(xPosition, rotation, scale, modelKey = "rockmd") {
    if (!this.modelLoader.getModel(modelKey)) {
      modelKey = "rockmd";
      if (!this.modelLoader.getModel(modelKey)) return null;
    }

    const instance = this.createInstance(
      modelKey,
      `${modelKey}Wireframe`,
      { x: xPosition, y: 0, z: -100 },
      { y: rotation },
      scale
    );

    if (instance) {
      instance.normal.userData.isRock = true;
      instance.wireframe.userData.isRockWireframe = true;
    }

    return instance;
  }
}

export default RockManager;
