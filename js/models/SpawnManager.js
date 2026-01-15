class SpawnManager {
  constructor(scene, modelLoader) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.instances = [];
    this.showNormal = true;
    this.showWireframe = true;
    this.speedMultiplier = 1.0;
    this.densityMultiplier = 1.0;
    this.spawnInterval = 1500;
    this.spawnIntervalIds = [];
    this.baseDuration = 14000;
  }

  startSpawning() {
    this.clearIntervals();

    const adjustedInterval = Math.max(
      500,
      this.spawnInterval / (this.speedMultiplier * this.densityMultiplier)
    );

    this.spawnIntervalIds.push(
      setInterval(() => this.spawn(), adjustedInterval)
    );
  }

  clearIntervals() {
    this.spawnIntervalIds.forEach((id) => clearInterval(id));
    this.spawnIntervalIds = [];
  }

  spawn() {}

  createInstance(modelKey, wireframeKey, position, rotation, scale = 1) {
    const normal = this.modelLoader.createModelInstance(modelKey, position, rotation);
    if (!normal) return null;

    normal.scale.set(scale, scale, scale);
    normal.visible = this.showNormal;

    const wireframe = this.modelLoader.createModelInstance(wireframeKey, position, rotation);
    if (!wireframe) return null;

    wireframe.scale.set(scale, scale, scale);
    wireframe.visible = this.showWireframe;

    this.syncModels(normal, wireframe);

    const instance = { normal, wireframe };
    this.instances.push(instance);

    this.animatePair(instance, () => {
      this.scene.remove(normal);
      this.scene.remove(wireframe);

      const index = this.instances.findIndex((i) => i.normal === normal);
      if (index !== -1) {
        this.instances.splice(index, 1);
      }
    });

    return instance;
  }

  syncModels(modelA, modelB) {
    modelB.position.copy(modelA.position);
    modelB.rotation.copy(modelA.rotation);
    modelB.scale.copy(modelA.scale);
  }

  animatePair(instance, onComplete) {
    const startTime = Date.now();
    const duration = this.baseDuration / this.speedMultiplier;

    const update = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      instance.normal.position.z = -100 + progress * 200;
      this.syncModels(instance.normal, instance.wireframe);

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        onComplete?.();
      }
    };

    update();
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    this.startSpawning();
  }

  setDensity(multiplier) {
    this.densityMultiplier = multiplier;
    this.startSpawning();
  }

  updateVisibility(showNormal, showWireframe) {
    this.showNormal = showNormal;
    this.showWireframe = showWireframe;

    this.instances.forEach((instance) => {
      instance.normal.visible = showNormal;
      instance.wireframe.visible = showWireframe;
    });
  }
}

export default SpawnManager;
