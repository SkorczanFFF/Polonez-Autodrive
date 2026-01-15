import SpawnManager from "./SpawnManager.js";

class PalmManager extends SpawnManager {
  constructor(scene, modelLoader) {
    super(scene, modelLoader);
    this.loadModels();
  }

  loadModels() {
    this.modelLoader
      .preloadModel("palm", "models/palm.FBX", "palm", "palmWireframe")
      .then(() => this.startSpawning())
      .catch(() => {
        this.modelLoader
          .preloadModel("palm", "models/palm.fbx", "palm", "palmWireframe")
          .then(() => this.startSpawning())
          .catch((error) => console.error("Failed to load palm model:", error));
      });
  }

  spawn() {
    this.createPalm(-11);
    this.createPalm(11);
  }

  createPalm(xPosition) {
    const rotation = Math.random() * 2 * Math.PI;

    const instance = this.createInstance(
      "palm",
      "palmWireframe",
      { x: xPosition, y: 0, z: -100 },
      { y: rotation }
    );

    if (instance) {
      instance.normal.userData.isPalm = true;
      instance.wireframe.userData.isPalmWireframe = true;
    }

    return instance;
  }
}

export default PalmManager;
