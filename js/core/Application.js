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
    this.loadingManager = new LoadingManager();
    this.modelsLoaded = false;

    this.sceneManager = new SceneManager();
    this.materialManager = new MaterialManager();
    this.modelLoader = new ModelLoader(
      this.sceneManager.scene,
      this.materialManager,
      this.sceneManager,
      this.loadingManager
    );

    this.environment = new Environment(
      this.sceneManager.scene,
      this.materialManager
    );

    this.sceneManager.addUpdateCallback((delta) =>
      this.environment.update(delta)
    );

    this.guiManager = new GUIManager(
      this.sceneManager.scene,
      this.materialManager,
      null,
      this.environment
    );

    this.loadingManager.setItemsToLoad(5);

    // Fallback timeout if loading stalls
    setTimeout(() => {
      if (!this.modelsLoaded) {
        this.loadingManager.completeLoading();
      }
    }, 4000);

    this.loadModels();
    this.animate();
  }

  loadModels() {
    let polonezLoaded = false;
    let hillsLoaded = false;
    let sideLoaded = false;

    const loadModelWithFallback = (
      modelKey,
      modelPath,
      materialName,
      wireframeMaterialName,
      position,
      hasAnimation
    ) => {
      this.modelLoader.loadModel(
        modelKey,
        modelPath,
        materialName,
        wireframeMaterialName,
        position,
        hasAnimation
      );

      setTimeout(() => {
        this.loadingManager.itemLoaded(`${modelKey.toUpperCase()} MODEL`);
        if (modelKey === "polonez") polonezLoaded = true;
        if (modelKey === "hills") hillsLoaded = true;

        if (polonezLoaded && hillsLoaded && sideLoaded) {
          this.initializeControllers();
        }
      }, 2000);
    };

    loadModelWithFallback(
      "polonez",
      "models/polonez.FBX",
      "polonez",
      "polonezWireframe",
      { x: -0.013 },
      true
    );

    loadModelWithFallback(
      "hills",
      "models/hills.FBX",
      "hills",
      "hillsWireframe"
    );

    this.loadSideHillsModels();

    setTimeout(() => {
      sideLoaded = true;
      if (polonezLoaded && hillsLoaded) {
        this.initializeControllers();
      }
    }, 3000);

    setTimeout(() => {
      if (!this.modelsLoaded) {
        this.initializeControllers();
      }
    }, 5000);
  }

  loadSideHillsModels() {
    if (this.loadingManager) {
      this.loadingManager.setItemsToLoad(this.loadingManager.totalItems + 1);
    }

    const sideMaterial = this.materialManager.getMaterial("side");
    const sideWireframeMaterial = this.materialManager.getMaterial("sideWireframe");

    this.modelLoader.fbxLoader.load(
      "models/side.FBX",
      (sideModel) => {
        this.modelLoader.applyMaterialToModel(sideModel, sideMaterial);
        this.modelLoader.scene.add(sideModel);
        this.modelLoader.models["side"] = sideModel;

        const mixerSide = new THREE.AnimationMixer(sideModel);
        const actionSide = mixerSide.clipAction(sideModel.animations[0]);

        if (this.loadingManager) {
          this.loadingManager.itemLoaded("SIDE MODELS");
        }

        this.modelLoader.fbxLoader.load(
          "models/side.FBX",
          (sideWireframeModel) => {
            this.modelLoader.applyMaterialToModel(sideWireframeModel, sideWireframeMaterial);

            sideWireframeModel.position.copy(sideModel.position);
            sideWireframeModel.rotation.copy(sideModel.rotation);
            sideWireframeModel.scale.copy(sideModel.scale);

            this.modelLoader.scene.add(sideWireframeModel);
            this.modelLoader.models["sideWireframe"] = sideWireframeModel;

            const mixerSideWireframe = new THREE.AnimationMixer(sideWireframeModel);
            const actionSideWireframe = mixerSideWireframe.clipAction(sideWireframeModel.animations[0]);

            // Start both animations synced
            actionSide.play();
            actionSideWireframe.play();

            this.sceneManager.addMixer(mixerSide);
            this.sceneManager.addMixer(mixerSideWireframe);

            this.modelLoader.mixers["side"] = mixerSide;
            this.modelLoader.mixers["sideWireframe"] = mixerSideWireframe;
          },
          (xhr) => {
            if (this.loadingManager?.statusText) {
              const progress = Math.round((xhr.loaded / xhr.total) * 100);
              this.loadingManager.statusText.textContent = `LOADING: SIDE WIREFRAME ${progress}%`;
            }
          },
          (error) => {
            console.error("Error loading side wireframe model:", error);
          }
        );
      },
      (xhr) => {
        if (this.loadingManager?.statusText) {
          const progress = Math.round((xhr.loaded / xhr.total) * 100);
          this.loadingManager.statusText.textContent = `LOADING: SIDE MODEL ${progress}%`;
        }
      },
      (error) => {
        console.error("Error loading side model:", error);
        if (this.loadingManager) {
          this.loadingManager.itemLoaded("SIDE MODEL (ERROR)");
        }
      }
    );
  }

  animate() {
    this.animationFrameId = requestAnimationFrame(() => this.animate());
    const delta = this.sceneManager.clock.getDelta();
    this.sceneManager.update(delta);
    this.materialManager.updateTextures(delta);
    this.sceneManager.render();
  }

  initializeControllers() {
    if (this.modelsLoaded) return;

    this.palmManager = new PalmManager(this.sceneManager.scene, this.modelLoader);
    this.rockManager = new RockManager(this.sceneManager.scene, this.modelLoader);

    this.polonezController = new PolonezController(this.modelLoader, this.environment);
    this.polonezController.initialize();

    this.minigameManager = new MinigameManager(
      this.sceneManager.scene,
      this.modelLoader,
      this.polonezController
    );

    this.minigameManager.setEnvironment(this.environment);
    this.minigameManager.setMaterialManager(this.materialManager);
    this.minigameManager.setGUI(this.guiManager.gui);
    this.minigameManager.setSceneManager(this.sceneManager);
    this.minigameManager.setPalmManager(this.palmManager);
    this.minigameManager.setRockManager(this.rockManager);

    this.guiManager.palmManager = this.palmManager;
    this.guiManager.rockManager = this.rockManager;

    this.sceneManager.addUpdateCallback((delta) => {
      this.polonezController?.update(delta);
      this.minigameManager?.update(delta);
    });

    this.modelsLoaded = true;
  }

  cleanup() {
    this.polonezController?.cleanup();
    this.minigameManager?.cleanup();

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

export default Application;
