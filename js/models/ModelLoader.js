class ModelLoader {
  constructor(scene, materialManager, sceneManager, loadingManager) {
    this.scene = scene;
    this.materialManager = materialManager;
    this.sceneManager = sceneManager;
    this.loadingManager = loadingManager;
    this.fbxLoader = new THREE.FBXLoader();
    this.models = {};
    this.mixers = {};

    // Track models being loaded
    this.activeLoads = 0;

    // Flag to prioritize speed over accuracy
    this.prioritizeSpeed = true;

    // Set up loading events
    this.setupLoaderEvents();
  }

  setupLoaderEvents() {
    // Optimize loader for faster loading
    if (this.prioritizeSpeed) {
      // Reduce the precision/quality for faster loading
      if (this.fbxLoader.manager) {
        this.fbxLoader.manager.onStart = (url, itemsLoaded, itemsTotal) => {
          if (this.loadingManager && this.loadingManager.statusText) {
            this.loadingManager.statusText.textContent = `PREPARING: ${url
              .split("/")
              .pop()
              .toUpperCase()}`;
          }
        };
      }
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

    // Simplify loading count tracking for speed
    if (this.loadingManager && !this.prioritizeSpeed) {
      this.activeLoads++;
      this.loadingManager.setItemsToLoad(this.loadingManager.totalItems + 1);
    }

    // Load main model with optimized callbacks for speed
    this.fbxLoader.load(
      modelPath,
      (model) => {
        this.applyMaterialToModel(model, material);

        if (position) {
          model.position.set(position.x || 0, position.y || 0, position.z || 0);
        }

        this.scene.add(model);
        this.models[modelKey] = model;

        // Setup animation mixer if model has animations
        if (hasAnimation && model.animations && model.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(model);
          const action = mixer.clipAction(model.animations[0]);
          action.play();

          this.mixers[modelKey] = mixer;
          this.sceneManager.addMixer(mixer);
        }

        // Report to loading manager
        if (this.loadingManager) {
          this.loadingManager.itemLoaded(`${modelKey.toUpperCase()}`);
          this.activeLoads--;
        }

        // Load wireframe version if needed
        if (wireframeMaterialName) {
          // We're combining the loading of both models into one progress item for speed
          const wireframeMaterial = this.materialManager.getMaterial(
            wireframeMaterialName
          );

          // Clone the model for wireframe instead of loading it again
          // This is much faster than loading the model again
          if (this.prioritizeSpeed) {
            const wireframeModel = model.clone();
            this.applyMaterialToModel(wireframeModel, wireframeMaterial);

            // Ensure identical position, rotation, and scale
            wireframeModel.position.copy(model.position);
            wireframeModel.rotation.copy(model.rotation);
            wireframeModel.scale.copy(model.scale);

            this.scene.add(wireframeModel);
            this.models[`${modelKey}Wireframe`] = wireframeModel;

            // Setup animation mixer if needed
            if (
              hasAnimation &&
              model.animations &&
              model.animations.length > 0
            ) {
              const mixer = new THREE.AnimationMixer(wireframeModel);
              const action = mixer.clipAction(model.animations[0]);
              action.play();

              this.mixers[`${modelKey}Wireframe`] = mixer;
              this.sceneManager.addMixer(mixer);
            }
          } else {
            // Fast path always used with prioritizeSpeed=true
            console.warn("Slow path requested but ignored - using fast path");
            const wireframeModel = model.clone();
            this.applyMaterialToModel(wireframeModel, wireframeMaterial);

            // Ensure identical position, rotation, and scale
            wireframeModel.position.copy(model.position);
            wireframeModel.rotation.copy(model.rotation);
            wireframeModel.scale.copy(model.scale);

            this.scene.add(wireframeModel);
            this.models[`${modelKey}Wireframe`] = wireframeModel;

            // Setup animation mixer if needed
            if (
              hasAnimation &&
              model.animations &&
              model.animations.length > 0
            ) {
              const mixer = new THREE.AnimationMixer(wireframeModel);
              const action = mixer.clipAction(model.animations[0]);
              action.play();

              this.mixers[`${modelKey}Wireframe`] = mixer;
              this.sceneManager.addMixer(mixer);
            }
          }
        }
      },
      // Progress callback - simplified for speed
      (xhr) => {
        if (this.loadingManager && this.loadingManager.statusText) {
          const progress = Math.round((xhr.loaded / xhr.total) * 100);
          this.loadingManager.statusText.textContent = `LOADING: ${modelKey.toUpperCase()} ${progress}%`;
        }
      },
      // Error callback
      (error) => {
        console.error(`Error loading model ${modelKey}:`, error);
        if (this.loadingManager) {
          this.loadingManager.itemLoaded(`${modelKey.toUpperCase()} (ERROR)`);
          this.activeLoads--;
        }
      }
    );
  }

  // Removed unused loadWireframeModel method

  applyMaterialToModel(model, material) {
    model.traverse((child) => {
      if (child.isMesh) {
        child.material = material;
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  /**
   * Load a model and store it for later use
   * Used for models that will be cloned multiple times (palm, rock)
   */
  preloadModel(
    modelKey,
    modelPath,
    materialName,
    wireframeMaterialName = null
  ) {
    const material = this.materialManager.getMaterial(materialName);

    // Track loading for non-prioritized speed mode
    if (this.loadingManager && !this.prioritizeSpeed) {
      this.activeLoads++;
      this.loadingManager.setItemsToLoad(this.loadingManager.totalItems + 1);
    }

    return new Promise((resolve, reject) => {
      console.log(`Attempting to load model: ${modelPath}`);

      this.fbxLoader.load(
        modelPath,
        (model) => {
          console.log(`Successfully loaded model: ${modelPath}`);
          this.applyMaterialToModel(model, material);
          this.models[modelKey] = model;

          // Report to loading manager
          if (this.loadingManager) {
            this.loadingManager.itemLoaded(`${modelKey.toUpperCase()}`);
            this.activeLoads--;
          }

          // Load wireframe version if needed
          if (wireframeMaterialName) {
            const wireframeMaterial = this.materialManager.getMaterial(
              wireframeMaterialName
            );

            // Fast path: clone the model for wireframe instead of loading again
            if (this.prioritizeSpeed) {
              const wireframeModel = model.clone();
              this.applyMaterialToModel(wireframeModel, wireframeMaterial);

              // Ensure wireframe has the same transform as the regular model
              wireframeModel.position.copy(model.position);
              wireframeModel.rotation.copy(model.rotation);
              wireframeModel.scale.copy(model.scale);

              this.models[`${modelKey}Wireframe`] = wireframeModel;
              resolve({ model, wireframeModel });
            } else {
              // Original approach - load wireframe separately
              this.fbxLoader.load(
                modelPath,
                (wireframeModel) => {
                  this.applyMaterialToModel(wireframeModel, wireframeMaterial);

                  // Ensure wireframe has the same transform as the regular model
                  wireframeModel.position.copy(model.position);
                  wireframeModel.rotation.copy(model.rotation);
                  wireframeModel.scale.copy(model.scale);

                  this.models[`${modelKey}Wireframe`] = wireframeModel;

                  // Report loading complete
                  if (this.loadingManager) {
                    this.loadingManager.itemLoaded(
                      `${modelKey.toUpperCase()} WIREFRAME`
                    );
                    this.activeLoads--;
                  }

                  resolve({ model, wireframeModel });
                },
                // Progress callback for wireframe
                (xhr) => {
                  if (this.loadingManager && this.loadingManager.statusText) {
                    const progress = Math.round((xhr.loaded / xhr.total) * 100);
                    this.loadingManager.statusText.textContent = `LOADING: ${modelKey.toUpperCase()} WIREFRAME ${progress}%`;
                  }
                },
                // Error callback for wireframe
                (error) => {
                  console.error(
                    `Error loading wireframe model ${modelKey}:`,
                    error
                  );
                  if (this.loadingManager) {
                    this.loadingManager.itemLoaded(
                      `${modelKey.toUpperCase()} WIREFRAME (ERROR)`
                    );
                    this.activeLoads--;
                  }
                  resolve({ model }); // Resolve with just the main model
                }
              );
            }
          } else {
            resolve({ model });
          }
        },
        // Progress callback
        (xhr) => {
          if (this.loadingManager && this.loadingManager.statusText) {
            const progress = Math.round((xhr.loaded / xhr.total) * 100);
            this.loadingManager.statusText.textContent = `LOADING: ${modelKey.toUpperCase()} ${progress}%`;
          }
        },
        // Error callback
        (error) => {
          console.error(
            `Error loading model ${modelKey} from ${modelPath}:`,
            error
          );
          console.error(`Browser: ${navigator.userAgent}`);
          console.error(`Host: ${window.location.hostname}`);
          if (this.loadingManager) {
            this.loadingManager.itemLoaded(`${modelKey.toUpperCase()} (ERROR)`);
            this.activeLoads--;
          }
          reject(error);
        }
      );
    });
  }

  /**
   * Create a clone of a preloaded model
   */
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

  /**
   * Check if all models have finished loading
   */
  isLoadingComplete() {
    return this.activeLoads === 0;
  }
}

export default ModelLoader;
