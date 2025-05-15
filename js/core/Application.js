import SceneManager from "./SceneManager.js";
import MaterialManager from "./MaterialManager.js";
import ModelLoader from "../models/ModelLoader.js";
import Environment from "../models/Environment.js";
import PalmManager from "../models/PalmManager.js";
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
    this.materialManager = new MaterialManager();
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
      null, // We'll set the palm manager after it's created
      this.environment
    );

    // For faster loading, set a smaller number of items
    this.loadingManager.setItemsToLoad(5);

    // Force loading to complete after a short delay if it's taking too long
    setTimeout(() => {
      if (!this.modelsLoaded) {
        this.loadingManager.completeLoading();
      }
    }, 4000);

    // Start loading models - don't wait for promise resolution to start animation
    this.loadModels();

    // Start animation loop immediately
    this.animate();
  }

  loadModels() {
    // Load Polonez car models - these are priority
    this.modelLoader.loadModel(
      "polonez",
      "models/polonez.FBX",
      "polonez",
      "polonezWireframe",
      { x: -0.013 },
      true
    );

    // Force progress update
    setTimeout(() => {
      this.loadingManager.itemLoaded("POLONEZ MODEL");
    }, 1000);

    // Load hills models
    this.modelLoader.loadModel(
      "hills",
      "models/hills.FBX",
      "hills",
      "hillsWireframe"
    );

    // Force another progress update
    setTimeout(() => {
      this.loadingManager.itemLoaded("HILLS MODEL");
    }, 2000);

    // Load side hills models with custom callback to ensure animation sync
    this.loadSideHillsModels();

    // Preload rock model
    this.modelLoader
      .preloadModel("rock", "models/rockmd.FBX", "rock")
      .then(() => {
        // Initialize palm manager after key models are loaded
        this.palmManager = new PalmManager(
          this.sceneManager.scene,
          this.modelLoader
        );

        // Update GUI with palm manager reference
        this.guiManager.palmManager = this.palmManager;

        // Initialize Polonez controller for steering
        this.polonezController = new PolonezController(
          this.modelLoader,
          this.environment
        );
        this.polonezController.initialize();

        // Register the controller's update method
        this.sceneManager.addUpdateCallback((delta) => {
          if (this.polonezController) {
            this.polonezController.update(delta);
          }
        });

        console.log("All models loaded successfully");
        this.modelsLoaded = true;
      })
      .catch((error) => {
        console.error("Error loading models:", error);
        // Even if there's an error, set modelsLoaded to true so the UI is accessible
        this.modelsLoaded = true;
        // Force hide the loading screen after an error
        setTimeout(() => {
          if (this.loadingManager) {
            this.loadingManager.hideLoader();
          }
        }, 2000);
      });
  }

  loadSideHillsModels() {
    // Register models with loading manager
    if (this.loadingManager) {
      // We're counting side models as a single item for faster completion
      this.loadingManager.setItemsToLoad(this.loadingManager.totalItems + 1);
    }

    const sideMaterial = this.materialManager.getMaterial("side");
    const sideWireframeMaterial =
      this.materialManager.getMaterial("sideWireframe");

    // Load the main side model first
    this.modelLoader.fbxLoader.load(
      "models/side.FBX",
      // Success callback
      (sideModel) => {
        // Apply material
        this.modelLoader.applyMaterialToModel(sideModel, sideMaterial);
        this.modelLoader.scene.add(sideModel);
        this.modelLoader.models["side"] = sideModel;

        // Setup animation mixer for main model
        const mixerSide = new THREE.AnimationMixer(sideModel);
        const actionSide = mixerSide.clipAction(sideModel.animations[0]);

        // Report to loading manager - count both as one item
        if (this.loadingManager) {
          this.loadingManager.itemLoaded("SIDE MODELS");
        }

        // Now load the wireframe model
        this.modelLoader.fbxLoader.load(
          "models/side.FBX",
          // Success callback for wireframe
          (sideWireframeModel) => {
            // Apply wireframe material
            this.modelLoader.applyMaterialToModel(
              sideWireframeModel,
              sideWireframeMaterial
            );

            // Ensure identical position, rotation, and scale
            sideWireframeModel.position.copy(sideModel.position);
            sideWireframeModel.rotation.copy(sideModel.rotation);
            sideWireframeModel.scale.copy(sideModel.scale);

            this.modelLoader.scene.add(sideWireframeModel);
            this.modelLoader.models["sideWireframe"] = sideWireframeModel;

            // Setup animation mixer for wireframe model
            const mixerSideWireframe = new THREE.AnimationMixer(
              sideWireframeModel
            );
            const actionSideWireframe = mixerSideWireframe.clipAction(
              sideWireframeModel.animations[0]
            );

            // Start both animations at the same time with identical settings
            actionSide.play();
            actionSideWireframe.play();

            // Add mixers to scene manager
            this.sceneManager.addMixer(mixerSide);
            this.sceneManager.addMixer(mixerSideWireframe);

            // Store mixers in model loader
            this.modelLoader.mixers["side"] = mixerSide;
            this.modelLoader.mixers["sideWireframe"] = mixerSideWireframe;
          },
          // Progress callback for wireframe
          (xhr) => {
            if (this.loadingManager && this.loadingManager.statusText) {
              const progress = Math.round((xhr.loaded / xhr.total) * 100);
              this.loadingManager.statusText.textContent = `LOADING: SIDE WIREFRAME ${progress}%`;
            }
          },
          // Error callback for wireframe
          (error) => {
            console.error("Error loading side wireframe model:", error);
          }
        );
      },
      // Progress callback
      (xhr) => {
        if (this.loadingManager && this.loadingManager.statusText) {
          const progress = Math.round((xhr.loaded / xhr.total) * 100);
          this.loadingManager.statusText.textContent = `LOADING: SIDE MODEL ${progress}%`;
        }
      },
      // Error callback
      (error) => {
        console.error("Error loading side model:", error);
        if (this.loadingManager) {
          this.loadingManager.itemLoaded("SIDE MODEL (ERROR)");
        }
      }
    );
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    // Update animations
    this.sceneManager.update();

    // Update texture animations
    this.materialManager.updateTextures();

    // Render the scene
    this.sceneManager.render();
  }
}

export default Application;
