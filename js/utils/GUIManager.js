class GUIManager {
  constructor(scene, materialManager, palmManager, environment) {
    this.scene = scene;
    this.materialManager = materialManager;
    this._palmManager = palmManager; // Use private property with setter
    this._environment = environment; // Use private property with setter
    this.gui = new dat.GUI();
    this.parameters = {
      // Polonez parameters
      polonezColor: "#3b8ceb",
      showPolonez: true,
      polonezWireframeColor: "#fff6ba",
      showPolonezWireframe: true,

      // Wheels parameters
      wheelsColor: "#3b8ceb",
      showWheels: true,
      wheelsWireframeColor: "#fff6ba",
      showWheelsWireframe: true,

      // Hills parameters
      hillsColor: "#4f33d9",
      showHills: true,
      hillsWireframeColor: "#c348dd",
      showHillsWireframe: true,

      // Side hills parameters
      sideColor: "#4790ff",
      showSide: true,
      sideWireframeColor: "#4f33d9",
      showSideWireframe: true,

      // Road parameters
      roadColor: "#c348dd",
      roadWireframeColor: "#40d5db",
      showRoadWireframe: true,

      // Terrain parameters
      terrainColor: "#40d5db",
      terrainWireframeColor: "#c348dd",
      showTerrainWireframe: true,

      // Palm parameters
      palmColor: "#56a0ff",
      showPalm: true,
      palmWireframeColor: "#ffdf7c",
      showPalmWireframe: true,

      // Sun parameters
      sunColorTop: "#ffebac",
      sunColorBottom: "#fc3b96",
      showSunEffect: true,

      // CRT effect parameters
      showCRTEffect: true,
      crtScanLineColor: "#eba2a2",
      crtScanLineOpacity: 0.15,
      enableCRTFlicker: true,
      crtFlickerSpeed: 0.15,
      crtFlickerIntensity: 0.4,

      // Scene parameters
      fogColor: "#c348dd",
      fogNear: 32.5,
      fogFar: 200,
      backgroundColor: "#eb94c1",
    };

    // Palm controls that need to be updated when palmManager is set
    this.palmControls = {
      folder: null,
      showPalm: null,
      showPalmWireframe: null,
    };

    // Initialize CRT effect settings
    this.initCRTEffect();

    this.setupGUI();
  }

  initCRTEffect() {
    // Initialize CRT overlay
    const crtOverlay = document.querySelector(".crt-overlay");
    if (crtOverlay) {
      // Set initial visibility
      crtOverlay.style.display = this.parameters.showCRTEffect
        ? "block"
        : "none";

      // Apply initial colors
      this.updateCRTScanLineColor();

      // Apply initial flicker settings
      if (this.parameters.enableCRTFlicker) {
        crtOverlay.style.animationName = "crtFlicker";
        crtOverlay.style.setProperty(
          "--flicker-intensity",
          this.parameters.crtFlickerIntensity
        );
      } else {
        crtOverlay.style.animationName = "none";
        crtOverlay.style.setProperty("--flicker-opacity", "1");
      }
    }
  }

  // Getter and setter for palmManager
  get palmManager() {
    return this._palmManager;
  }

  set palmManager(manager) {
    this._palmManager = manager;

    // Update palm controls if they exist
    if (manager && this.palmControls.folder) {
      this.updatePalmControls();
    }
  }

  updatePalmControls() {
    // Update the onChange handlers for palm visibility controls
    if (this.palmControls.showPalm) {
      this.palmControls.showPalm.onChange((value) => {
        this.parameters.showPalm = value;
        this._palmManager.updateVisibility(
          value,
          this.parameters.showPalmWireframe
        );
      });
    }

    if (this.palmControls.showPalmWireframe) {
      this.palmControls.showPalmWireframe.onChange((value) => {
        this.parameters.showPalmWireframe = value;
        this._palmManager.updateVisibility(this.parameters.showPalm, value);
      });
    }
  }

  // Getter and setter for environment
  get environment() {
    return this._environment;
  }

  set environment(env) {
    this._environment = env;
  }

  setupGUI() {
    // Polonez folder
    this.setupPolonezFolder();

    // Wheels folder
    this.setupWheelsFolder();

    // Hills folder
    this.setupHillsFolder();

    // Side hills folder
    this.setupSideFolder();

    // Road folder
    this.setupRoadFolder();

    // Terrain folder
    this.setupTerrainFolder();

    // Palm folder
    this.setupPalmFolder();

    // Sun folder
    this.setupSunFolder();

    // CRT effect folder
    this.setupCRTEffectFolder();

    // Scene parameters
    this.setupSceneParameters();
  }

  setupPolonezFolder() {
    const folder = this.gui.addFolder("Polonez");

    folder
      .addColor(this.parameters, "polonezColor")
      .name("Color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("polonez");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showPolonez")
      .name("Show model")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("polonez");
        material.visible = value;
      });

    folder
      .addColor(this.parameters, "polonezWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("polonezWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showPolonezWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("polonezWireframe");
        material.visible = value;
      });

    folder.close();
  }

  setupWheelsFolder() {
    const folder = this.gui.addFolder("Wheels");

    folder
      .addColor(this.parameters, "wheelsColor")
      .name("Color")
      .onChange((color) => {
        if (this._environment) {
          const material = this.materialManager.getMaterial("polonez").clone();
          material.color.setHex(color.replace("#", "0x"));
          this._environment.setWheelsColor(material);
        }
      });

    folder
      .add(this.parameters, "showWheels")
      .name("Show wheels")
      .onChange((value) => {
        if (this._environment) {
          this._environment.setWheelsVisibility(value);
        }
      });

    folder
      .addColor(this.parameters, "wheelsWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        if (this._environment) {
          const material = this.materialManager
            .getMaterial("polonezWireframe")
            .clone();
          material.color.setHex(color.replace("#", "0x"));
          this._environment.setWheelsWireframeColor(material);
        }
      });

    folder
      .add(this.parameters, "showWheelsWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        if (this._environment) {
          this._environment.setWheelsWireframeVisibility(value);
        }
      });

    folder.close();
  }

  setupHillsFolder() {
    const folder = this.gui.addFolder("Hills");

    folder
      .addColor(this.parameters, "hillsColor")
      .name("Color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("hills");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showHills")
      .name("Show hills")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("hills");
        material.visible = value;
      });

    folder
      .addColor(this.parameters, "hillsWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("hillsWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showHillsWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("hillsWireframe");
        material.visible = value;
      });

    folder.close();
  }

  setupSideFolder() {
    const folder = this.gui.addFolder("Side hills");

    folder
      .addColor(this.parameters, "sideColor")
      .name("Color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("side");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showSide")
      .name("Show side hills")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("side");
        material.visible = value;
      });

    folder
      .addColor(this.parameters, "sideWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("sideWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showSideWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("sideWireframe");
        material.visible = value;
      });

    folder.close();
  }

  setupRoadFolder() {
    const folder = this.gui.addFolder("Road");

    folder
      .addColor(this.parameters, "roadColor")
      .name("Road color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("road");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .addColor(this.parameters, "roadWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("roadWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showRoadWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("roadWireframe");
        material.visible = value;
      });

    folder.close();
  }

  setupTerrainFolder() {
    const folder = this.gui.addFolder("Terrain");

    folder
      .addColor(this.parameters, "terrainColor")
      .name("Terrain color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("terrain");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .addColor(this.parameters, "terrainWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("terrainWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showTerrainWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("terrainWireframe");
        material.visible = value;
      });

    folder.close();
  }

  setupPalmFolder() {
    const folder = this.gui.addFolder("Palms");
    this.palmControls.folder = folder;

    folder
      .addColor(this.parameters, "palmColor")
      .name("Palm color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("palm");
        material.color.setHex(color.replace("#", "0x"));
      });

    // Store the control for later updates when palmManager is set
    this.palmControls.showPalm = folder
      .add(this.parameters, "showPalm")
      .name("Show palms");

    // Add initial onChange handler
    if (this._palmManager) {
      this.palmControls.showPalm.onChange((value) => {
        this.parameters.showPalm = value;
        this._palmManager.updateVisibility(
          value,
          this.parameters.showPalmWireframe
        );
      });
    } else {
      // Dummy handler when palmManager is not available
      this.palmControls.showPalm.onChange((value) => {
        this.parameters.showPalm = value;
        console.log("Palm manager not available yet");
      });
    }

    folder
      .addColor(this.parameters, "palmWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("palmWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    // Store the control for later updates when palmManager is set
    this.palmControls.showPalmWireframe = folder
      .add(this.parameters, "showPalmWireframe")
      .name("Show wireframe");

    // Add initial onChange handler
    if (this._palmManager) {
      this.palmControls.showPalmWireframe.onChange((value) => {
        this.parameters.showPalmWireframe = value;
        this._palmManager.updateVisibility(this.parameters.showPalm, value);
      });
    } else {
      // Dummy handler when palmManager is not available
      this.palmControls.showPalmWireframe.onChange((value) => {
        this.parameters.showPalmWireframe = value;
        console.log("Palm manager not available yet");
      });
    }

    folder.close();
  }

  setupSunFolder() {
    const folder = this.gui.addFolder("Sun");

    folder
      .addColor(this.parameters, "sunColorTop")
      .name("Sun color top")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("sun");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .addColor(this.parameters, "sunColorBottom")
      .name("Sun color bott")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("sunEffect");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showSunEffect")
      .name("Show effect")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("sunEffect");
        material.visible = value;
      });

    folder.close();
  }

  setupCRTEffectFolder() {
    const folder = this.gui.addFolder("CRT Effect");

    folder
      .add(this.parameters, "showCRTEffect")
      .name("Show CRT effect")
      .onChange((value) => {
        const crtOverlay = document.querySelector(".crt-overlay");
        if (crtOverlay) {
          crtOverlay.style.display = value ? "block" : "none";
        }
      });

    folder
      .addColor(this.parameters, "crtScanLineColor")
      .name("Scan line color")
      .onChange((color) => {
        this.updateCRTScanLineColor();
      });

    folder
      .add(this.parameters, "crtScanLineOpacity", 0, 1)
      .step(0.05)
      .name("Scan line opacity")
      .onChange((value) => {
        this.updateCRTScanLineColor();
      });

    folder
      .add(this.parameters, "enableCRTFlicker")
      .name("Enable flicker")
      .onChange((value) => {
        this.updateCRTFlickerState();
      });

    folder
      .add(this.parameters, "crtFlickerSpeed", 0.05, 0.5)
      .step(0.01)
      .name("Flicker speed")
      .onChange((value) => {
        this.updateCRTFlickerState();
      });

    folder
      .add(this.parameters, "crtFlickerIntensity", 0, 2)
      .step(0.1)
      .name("Flicker intensity")
      .onChange((value) => {
        this.updateCRTFlickerState();
      });

    // Apply initial settings
    this.updateCRTScanLineColor();
    this.updateCRTFlickerState();

    folder.open();
  }

  updateCRTScanLineColor() {
    const color = this.parameters.crtScanLineColor;
    const opacity = this.parameters.crtScanLineOpacity;

    // Convert hex color to RGB
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);

    const crtOverlay = document.querySelector(".crt-overlay");
    if (crtOverlay) {
      // Set the scan line color with base opacity
      const colorStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
      crtOverlay.style.setProperty("--scan-line-color", colorStyle);
    } else {
      setTimeout(() => this.updateCRTScanLineColor(), 100);
    }
  }

  updateCRTFlickerState() {
    const crtOverlay = document.querySelector(".crt-overlay");
    if (crtOverlay) {
      if (this.parameters.enableCRTFlicker) {
        // Enable flicker animation with custom speed
        crtOverlay.style.animation = `flicker ${this.parameters.crtFlickerSpeed}s infinite`;
        // Apply intensity to both the main overlay and its pseudo-elements
        crtOverlay.style.setProperty(
          "--flicker-intensity",
          this.parameters.crtFlickerIntensity
        );
        crtOverlay.style.opacity = "1";
      } else {
        // Disable flicker animation
        crtOverlay.style.animation = "none";
        crtOverlay.style.opacity = "1";
      }
    } else {
      setTimeout(() => this.updateCRTFlickerState(), 100);
    }
  }

  setupSceneParameters() {
    this.gui
      .addColor(this.parameters, "backgroundColor")
      .name("Sky color")
      .onChange((color) => {
        this.scene.background.setHex(color.replace("#", "0x"));
      });

    this.gui
      .addColor(this.parameters, "fogColor")
      .name("Fog color")
      .onChange((color) => {
        this.scene.fog.color.setHex(color.replace("#", "0x"));
      });

    this.gui
      .add(this.parameters, "fogNear")
      .min(1)
      .max(200)
      .name("Fog near")
      .onChange((value) => {
        this.scene.fog.near = value;
      });

    this.gui
      .add(this.parameters, "fogFar")
      .min(50)
      .max(400)
      .name("Fog far")
      .onChange((value) => {
        this.scene.fog.far = value;
      });
  }
}

export default GUIManager;
