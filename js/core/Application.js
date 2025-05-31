import SceneManager from "./SceneManager.js";
import MaterialManager from "./MaterialManager.js";
import ModelLoader from "../models/ModelLoader.js";
import Environment from "../models/Environment.js";
import PalmManager from "../models/PalmManager.js";
import RockManager from "../models/RockManager.js";
import MinigameManager from "../models/MinigameManager.js";
import GUIManager from "../utils/GUIManager.js";
import LoadingManager from "../utils/LoadingManager.js";
import PolonezController from "../models/PolonezController.js";

class Application {
  constructor() {
    // Initialize loading manager first
    this.loadingManager = new LoadingManager();

    // Track loading state
    this.modelsLoaded = false;

    // Initialize core components
    this.sceneManager = new SceneManager();

    // Initialize material manager immediately to avoid undefined errors
    this.materialManager = new MaterialManager();

    // Start animation loop
    this.animate();

    // Initialize remaining components with lower priority
    requestIdleCallback(
      () => {
        this.modelLoader = new ModelLoader(
          this.sceneManager.scene,
          this.materialManager,
          this.sceneManager,
          this.loadingManager
        );

        // Initialize environment
        this.environment = new Environment(
          this.sceneManager.scene,
          this.materialManager
        );

        // Register environment update with scene manager
        this.sceneManager.addUpdateCallback((delta) =>
          this.environment.update(delta)
        );

        // Initialize GUI controls
        this.guiManager = new GUIManager(
          this.sceneManager.scene,
          this.materialManager,
          null,
          this.environment
        );

        // For faster loading, set a smaller number of items
        this.loadingManager.setItemsToLoad(5);

        // Start loading models
        this.loadModels();
      },
      { timeout: 2000 }
    ); // Set a reasonable timeout
  }

  loadModels() {
    // Use Promise.all for better load management
    const modelPromises = [
      this.loadModelWithPromise(
        "polonez",
        "models/polonez.FBX",
        "polonez",
        "polonezWireframe",
        true,
        THREE.MeshPhongMaterial // Specify material type
      ),
      this.loadModelWithPromise(
        "hills",
        "models/hills.FBX",
        "hills",
        "hillsWireframe",
        false,
        THREE.MeshPhongMaterial // Specify material type
      ),
      this.loadSideHillsModelsWithPromise(),
    ];

    Promise.all(modelPromises)
      .then(() => {
        this.initializeControllers();
      })
      .catch((error) => {
        console.error("Error loading models:", error);
        // Still try to initialize with what we have
        this.initializeControllers();
      });
  }

  loadModelWithPromise(
    modelKey,
    modelPath,
    materialName,
    wireframeMaterialName,
    hasAnimation = false,
    materialType = THREE.MeshPhongMaterial
  ) {
    return new Promise((resolve) => {
      this.modelLoader.loadModel(
        modelKey,
        modelPath,
        materialName,
        wireframeMaterialName,
        materialType,
        hasAnimation
      );

      // Mark as loaded after a timeout
      setTimeout(() => {
        this.loadingManager.itemLoaded(`${modelKey.toUpperCase()} MODEL`);
        resolve();
      }, 2000);
    });
  }

  loadSideHillsModelsWithPromise() {
    return new Promise((resolve) => {
      if (this.loadingManager) {
        this.loadingManager.setItemsToLoad(this.loadingManager.totalItems + 1);
      }

      const sideMaterial = this.materialManager.getMaterial("side");
      const sideWireframeMaterial =
        this.materialManager.getMaterial("sideWireframe");

      this.modelLoader.fbxLoader.load(
        "models/side.FBX",
        (sideModel) => {
          // Set material type to MeshPhongMaterial
          this.modelLoader.applyMaterialToModel(
            sideModel,
            sideMaterial,
            THREE.MeshPhongMaterial
          );
          this.modelLoader.scene.add(sideModel);
          this.modelLoader.models["side"] = sideModel;

          // Check if model has animations before creating mixer
          let mixerSide, actionSide;
          if (sideModel.animations && sideModel.animations.length > 0) {
            mixerSide = new THREE.AnimationMixer(sideModel);
            actionSide = mixerSide.clipAction(sideModel.animations[0]);
          }

          if (this.loadingManager) {
            this.loadingManager.itemLoaded("SIDE MODELS");
          }

          // Load wireframe as clone instead of separate load
          const sideWireframeModel = sideModel.clone();
          this.modelLoader.applyMaterialToModel(
            sideWireframeModel,
            sideWireframeMaterial,
            THREE.MeshPhongMaterial
          );

          sideWireframeModel.position.copy(sideModel.position);
          sideWireframeModel.rotation.copy(sideModel.rotation);
          sideWireframeModel.scale.copy(sideModel.scale);

          this.modelLoader.scene.add(sideWireframeModel);
          this.modelLoader.models["sideWireframe"] = sideWireframeModel;

          // Only setup animation if we have animations
          if (mixerSide && actionSide) {
            const mixerSideWireframe = new THREE.AnimationMixer(
              sideWireframeModel
            );
            const actionSideWireframe = mixerSideWireframe.clipAction(
              sideModel.animations[0]
            );

            actionSide.play();
            actionSideWireframe.play();

            this.sceneManager.addMixer(mixerSide);
            this.sceneManager.addMixer(mixerSideWireframe);

            this.modelLoader.mixers["side"] = mixerSide;
            this.modelLoader.mixers["sideWireframe"] = mixerSideWireframe;
          }

          resolve();
        },
        (xhr) => {
          if (this.loadingManager && this.loadingManager.statusText) {
            const progress = Math.round((xhr.loaded / xhr.total) * 100);
            this.loadingManager.statusText.textContent = `LOADING: SIDE MODEL ${progress}%`;
          }
        },
        (error) => {
          console.error("Error loading side model:", error);
          if (this.loadingManager) {
            this.loadingManager.itemLoaded("SIDE MODEL (ERROR)");
          }
          resolve(); // Resolve even on error to continue loading
        }
      );
    });
  }

  animate() {
    // Store animation frame ID for potential cleanup
    this.animationFrameId = requestAnimationFrame(() => this.animate());

    // Update animations
    this.sceneManager.update();

    // Update texture animations only if materialManager exists
    if (this.materialManager) {
      this.materialManager.updateTextures();
    }

    // Render the scene
    this.sceneManager.render();
  }

  // Separate method to initialize controllers
  initializeControllers() {
    // Only initialize once
    if (this.modelsLoaded) return;

    // Initialize palm manager
    this.palmManager = new PalmManager(
      this.sceneManager.scene,
      this.modelLoader
    );

    // Initialize rock manager
    this.rockManager = new RockManager(
      this.sceneManager.scene,
      this.modelLoader
    );

    // Initialize Polonez controller for steering
    this.polonezController = new PolonezController(
      this.modelLoader,
      this.environment
    );
    this.polonezController.initialize();

    // Set PolonezController in SceneManager for DevStats
    this.sceneManager.setPolonezController(this.polonezController);

    // Initialize Minigame manager after polonez controller is ready
    this.minigameManager = new MinigameManager(
      this.sceneManager.scene,
      this.modelLoader,
      this.polonezController
    );

    // Set additional references for the minigame manager
    this.minigameManager.setEnvironment(this.environment);
    this.minigameManager.setMaterialManager(this.materialManager);
    this.minigameManager.setGUI(this.guiManager.gui);
    this.minigameManager.setSceneManager(this.sceneManager);

    // Connect PalmManager and RockManager to speed control system
    this.minigameManager.setPalmManager(this.palmManager);
    this.minigameManager.setRockManager(this.rockManager);

    // Update GUI with manager references
    this.guiManager.palmManager = this.palmManager;
    this.guiManager.rockManager = this.rockManager;

    // Register the controller's update method
    this.sceneManager.addUpdateCallback((delta) => {
      if (this.polonezController) {
        this.polonezController.update(delta);
      }

      if (this.minigameManager) {
        this.minigameManager.update(delta);
      }
    });

    console.log("All models loaded successfully");
    this.modelsLoaded = true;
  }

  /**
   * Cleanup and dispose resources when the application is destroyed
   */
  cleanup() {
    // Cleanup controllers
    if (this.polonezController) {
      this.polonezController.cleanup();
    }

    if (this.minigameManager) {
      this.minigameManager.cleanup();
    }

    // Stop animation loop
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    // Other cleanup as needed
    console.log("Application cleanup complete");
  }
}

export default Application;
