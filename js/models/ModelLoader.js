class ModelLoader {
  constructor(scene, materialManager, sceneManager, loadingManager) {
    this.scene = scene;
    this.materialManager = materialManager;
    this.sceneManager = sceneManager;
    this.loadingManager = loadingManager;
    this.fbxLoader = new THREE.FBXLoader();
    this.models = {};
    this.mixers = {};

    this.setupLoaderEvents();
  }

  setupLoaderEvents() {
    if (this.fbxLoader.manager) {
      this.fbxLoader.manager.onStart = (url) => {
        if (this.loadingManager?.statusText) {
          this.loadingManager.statusText.textContent = `PREPARING: ${url.split("/").pop().toUpperCase()}`;
        }
      };
    }
  }

  loadModel(
    modelKey,
    modelPath,
    materialName,
    wireframeMaterialName = null,
    position = null,
    hasAnimation = false
  ) {
    const material = this.materialManager.getMaterial(materialName);

    this.fbxLoader.load(
      modelPath,
      (model) => {
        this.applyMaterialToModel(model, material);

        if (position) {
          model.position.set(position.x || 0, position.y || 0, position.z || 0);
        }

        this.scene.add(model);
        this.models[modelKey] = model;

        if (hasAnimation && model.animations?.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          mixer.clipAction(model.animations[0]).play();
          this.mixers[modelKey] = mixer;
          this.sceneManager.addMixer(mixer);
        }

        this.loadingManager?.itemLoaded(`${modelKey.toUpperCase()}`);

        if (wireframeMaterialName) {
          this.createWireframeClone(model, modelKey, wireframeMaterialName, hasAnimation);
        }
      },
      (xhr) => {
        if (this.loadingManager?.statusText) {
          const progress = Math.round((xhr.loaded / xhr.total) * 100);
          this.loadingManager.statusText.textContent = `LOADING: ${modelKey.toUpperCase()} ${progress}%`;
        }
      },
      (error) => {
        console.error(`Error loading model ${modelKey}:`, error);
        this.loadingManager?.itemLoaded(`${modelKey.toUpperCase()} (ERROR)`);
      }
    );
  }

  createWireframeClone(model, modelKey, wireframeMaterialName, hasAnimation) {
    const wireframeMaterial = this.materialManager.getMaterial(wireframeMaterialName);
    const wireframeModel = model.clone();

    this.applyMaterialToModel(wireframeModel, wireframeMaterial);
    wireframeModel.position.copy(model.position);
    wireframeModel.rotation.copy(model.rotation);
    wireframeModel.scale.copy(model.scale);

    this.scene.add(wireframeModel);
    this.models[`${modelKey}Wireframe`] = wireframeModel;

    if (hasAnimation && model.animations?.length > 0) {
      const mixer = new THREE.AnimationMixer(wireframeModel);
      mixer.clipAction(model.animations[0]).play();
      this.mixers[`${modelKey}Wireframe`] = mixer;
      this.sceneManager.addMixer(mixer);
    }
  }

  applyMaterialToModel(model, material) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  preloadModel(modelKey, modelPath, materialName, wireframeMaterialName = null) {
    const material = this.materialManager.getMaterial(materialName);

    return new Promise((resolve, reject) => {
      this.fbxLoader.load(
        modelPath,
        (model) => {
          this.applyMaterialToModel(model, material);
          this.models[modelKey] = model;

          this.loadingManager?.itemLoaded(`${modelKey.toUpperCase()}`);

          if (wireframeMaterialName) {
            const wireframeMaterial = this.materialManager.getMaterial(wireframeMaterialName);
            const wireframeModel = model.clone();

            this.applyMaterialToModel(wireframeModel, wireframeMaterial);
            wireframeModel.position.copy(model.position);
            wireframeModel.rotation.copy(model.rotation);
            wireframeModel.scale.copy(model.scale);

            this.models[`${modelKey}Wireframe`] = wireframeModel;
            resolve({ model, wireframeModel });
          } else {
            resolve({ model });
          }
        },
        (xhr) => {
          if (this.loadingManager?.statusText) {
            const progress = Math.round((xhr.loaded / xhr.total) * 100);
            this.loadingManager.statusText.textContent = `LOADING: ${modelKey.toUpperCase()} ${progress}%`;
          }
        },
        (error) => {
          console.error(`Error loading model ${modelKey} from ${modelPath}:`, error);
          this.loadingManager?.itemLoaded(`${modelKey.toUpperCase()} (ERROR)`);
          reject(error);
        }
      );
    });
  }

  createModelInstance(modelKey, position, rotation = null) {
    const model = this.models[modelKey];
    if (!model) {
      console.error(`Model ${modelKey} not found`);
      return null;
    }

    const instance = model.clone();

    if (position) {
      instance.position.set(position.x || 0, position.y || 0, position.z || 0);
    }

    if (rotation) {
      instance.rotation.set(rotation.x || 0, rotation.y || 0, rotation.z || 0);
    }

    this.scene.add(instance);
    return instance;
  }

  getModel(modelKey) {
    return this.models[modelKey];
  }
}

export default ModelLoader;
