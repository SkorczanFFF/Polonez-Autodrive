class GUIManager {
  constructor(scene, materialManager, palmManager, environment) {
    this.scene = scene;
    this.materialManager = materialManager;
    this._palmManager = palmManager; // Use private property with setter
    this._environment = environment; // Use private property with setter
    this._rockManager = null; // Add rockManager property
    this.gui = new dat.GUI();
    this.parameters = {
      // Polonez parameters
      polonezColor: "#3b8ceb",
      showPolonez: true,
      polonezWireframeColor: "#fff6ba",
      showPolonezWireframe: true,

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
      palmDensity: 1.0,

      // Rock parameters
      rockColor: "#8b8b8b",
      showRock: true,
      rockWireframeColor: "#ff5a5a",
      showRockWireframe: true,
      rockDensity: 1.0,

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

    this.isTransitioning = false;

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
  }

  // Getter and setter for environment
  get environment() {
    return this._environment;
  }

  set environment(env) {
    this._environment = env;
  }

  // Getter and setter for rockManager
  get rockManager() {
    return this._rockManager;
  }

  set rockManager(manager) {
    this._rockManager = manager;
  }

  setupGUI() {
    // Polonez folder
    this.setupPolonezFolder();

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

    // Rock folder
    this.setupRockFolder();

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

        // Also update wheels color when polonez color changes (linked to polonez)
        if (this._environment) {
          const wheelsMaterial = material.clone();
          this._environment.setWheelsColor(wheelsMaterial);
        }
      });

    folder
      .add(this.parameters, "showPolonez")
      .name("Show model")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("polonez");
        material.visible = value;

        // Also update wheels visibility (linked to polonez)
        if (this._environment) {
          this._environment.setWheelsVisibility(value);
        }
      });

    folder
      .addColor(this.parameters, "polonezWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("polonezWireframe");
        material.color.setHex(color.replace("#", "0x"));

        // Also update wheels wireframe color (linked to polonez)
        if (this._environment) {
          const wheelsWireframeMaterial = material.clone();
          this._environment.setWheelsWireframeColor(wheelsWireframeMaterial);
        }
      });

    folder
      .add(this.parameters, "showPolonezWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        const material = this.materialManager.getMaterial("polonezWireframe");
        material.visible = value;

        // Also update wheels wireframe visibility (linked to polonez)
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

    folder
      .addColor(this.parameters, "palmColor")
      .name("Palm color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("palm");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showPalm")
      .name("Show palms")
      .onChange((value) => {
        this.parameters.showPalm = value;
        this._palmManager?.updateVisibility(value, this.parameters.showPalmWireframe);
      });

    folder
      .add(this.parameters, "palmDensity", 0.1, 2.0)
      .name("Palm density")
      .step(0.1)
      .onChange((value) => this._palmManager?.setDensity(value));

    folder
      .addColor(this.parameters, "palmWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("palmWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showPalmWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        this.parameters.showPalmWireframe = value;
        this._palmManager?.updateVisibility(this.parameters.showPalm, value);
      });

    folder.close();
  }

  setupRockFolder() {
    const folder = this.gui.addFolder("Rocks");

    folder
      .addColor(this.parameters, "rockColor")
      .name("Rock color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("rock");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showRock")
      .name("Show rocks")
      .onChange((value) => {
        this.parameters.showRock = value;
        this._rockManager?.updateVisibility(value, this.parameters.showRockWireframe);
      });

    folder
      .add(this.parameters, "rockDensity", 0.1, 2.0)
      .name("Rock density")
      .step(0.1)
      .onChange((value) => this._rockManager?.setDensity(value));

    folder
      .addColor(this.parameters, "rockWireframeColor")
      .name("Wireframe color")
      .onChange((color) => {
        const material = this.materialManager.getMaterial("rockWireframe");
        material.color.setHex(color.replace("#", "0x"));
      });

    folder
      .add(this.parameters, "showRockWireframe")
      .name("Show wireframe")
      .onChange((value) => {
        this.parameters.showRockWireframe = value;
        this._rockManager?.updateVisibility(this.parameters.showRock, value);
      });

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
      .onChange(() => this.updateCRTScanLineColor());

    folder
      .add(this.parameters, "crtScanLineOpacity", 0, 1)
      .step(0.05)
      .name("Scan line opacity")
      .onChange(() => this.updateCRTScanLineColor());

    folder
      .add(this.parameters, "enableCRTFlicker")
      .name("Enable flicker")
      .onChange(() => this.updateCRTFlickerState());

    folder
      .add(this.parameters, "crtFlickerSpeed", 0.05, 0.5)
      .step(0.01)
      .name("Flicker speed")
      .onChange(() => this.updateCRTFlickerState());

    folder
      .add(this.parameters, "crtFlickerIntensity", 0, 2)
      .step(0.1)
      .name("Flicker intensity")
      .onChange(() => this.updateCRTFlickerState());

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

    // Add randomize button to GUI
    this.gui
      .add({ randomize: () => this.randomizeAllColors() }, "randomize")
      .name("🎨 Randomize all");
  }

  // Helper to interpolate between colors
  lerpColor(startColor, endColor, t) {
    const start = parseInt(startColor.replace("#", "0x"), 16);
    const end = parseInt(endColor.replace("#", "0x"), 16);

    const sr = (start >> 16) & 255;
    const sg = (start >> 8) & 255;
    const sb = start & 255;

    const er = (end >> 16) & 255;
    const eg = (end >> 8) & 255;
    const eb = end & 255;

    const r = Math.round(sr + (er - sr) * t);
    const g = Math.round(sg + (eg - sg) * t);
    const b = Math.round(sb + (eb - sb) * t);

    return "#" + ((r << 16) | (g << 8) | b).toString(16).padStart(6, "0");
  }

  // Randomize all colors with smooth transition
  randomizeAllColors() {
    if (this.isTransitioning) return;
    this.isTransitioning = true;

    // Disable orbit controls
    if (this.scene.orbitControls) {
      this.scene.orbitControls.enabled = false;
    }

    // Store initial colors
    const startColors = {
      polonezColor: this.parameters.polonezColor,
      polonezWireframeColor: this.parameters.polonezWireframeColor,
      hillsColor: this.parameters.hillsColor,
      hillsWireframeColor: this.parameters.hillsWireframeColor,
      sideColor: this.parameters.sideColor,
      sideWireframeColor: this.parameters.sideWireframeColor,
      roadColor: this.parameters.roadColor,
      roadWireframeColor: this.parameters.roadWireframeColor,
      terrainColor: this.parameters.terrainColor,
      terrainWireframeColor: this.parameters.terrainWireframeColor,
      palmColor: this.parameters.palmColor,
      palmWireframeColor: this.parameters.palmWireframeColor,
      rockColor: this.parameters.rockColor,
      rockWireframeColor: this.parameters.rockWireframeColor,
      sunColorTop: this.parameters.sunColorTop,
      sunColorBottom: this.parameters.sunColorBottom,
      backgroundColor: this.parameters.backgroundColor,
      fogColor: this.parameters.fogColor,
      crtScanLineColor: this.parameters.crtScanLineColor,
    };

    // Generate target colors
    const targetColors = {};
    for (const key in startColors) {
      targetColors[key] = this.generateRandomColor();
    }

    // Animation duration in milliseconds
    const duration = 1000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Smooth easing function
      const t =
        progress < 0.5
          ? 4 * progress * progress * progress
          : 1 - Math.pow(-2 * progress + 2, 3) / 2;

      // Interpolate all colors
      for (const key in startColors) {
        this.parameters[key] = this.lerpColor(
          startColors[key],
          targetColors[key],
          t
        );
      }

      // Apply color changes
      const materials = this.materialManager.materials;

      // Update all materials
      materials.polonez.color.setHex(
        this.parameters.polonezColor.replace("#", "0x")
      );
      materials.polonezWireframe.color.setHex(
        this.parameters.polonezWireframeColor.replace("#", "0x")
      );
      if (this._environment) {
        this._environment.setWheelsColor(materials.polonez.clone());
        this._environment.setWheelsWireframeColor(
          materials.polonezWireframe.clone()
        );
      }

      materials.hills.color.setHex(
        this.parameters.hillsColor.replace("#", "0x")
      );
      materials.hillsWireframe.color.setHex(
        this.parameters.hillsWireframeColor.replace("#", "0x")
      );

      materials.side.color.setHex(this.parameters.sideColor.replace("#", "0x"));
      materials.sideWireframe.color.setHex(
        this.parameters.sideWireframeColor.replace("#", "0x")
      );

      materials.road.color.setHex(this.parameters.roadColor.replace("#", "0x"));
      materials.roadWireframe.color.setHex(
        this.parameters.roadWireframeColor.replace("#", "0x")
      );

      materials.terrain.color.setHex(
        this.parameters.terrainColor.replace("#", "0x")
      );
      materials.terrainWireframe.color.setHex(
        this.parameters.terrainWireframeColor.replace("#", "0x")
      );

      materials.palm.color.setHex(this.parameters.palmColor.replace("#", "0x"));
      materials.palmWireframe.color.setHex(
        this.parameters.palmWireframeColor.replace("#", "0x")
      );

      materials.rock.color.setHex(this.parameters.rockColor.replace("#", "0x"));
      materials.rockWireframe.color.setHex(
        this.parameters.rockWireframeColor.replace("#", "0x")
      );

      materials.sun.color.setHex(
        this.parameters.sunColorTop.replace("#", "0x")
      );
      materials.sunEffect.color.setHex(
        this.parameters.sunColorBottom.replace("#", "0x")
      );

      this.scene.background.setHex(
        this.parameters.backgroundColor.replace("#", "0x")
      );
      this.scene.fog.color.setHex(this.parameters.fogColor.replace("#", "0x"));

      this.updateCRTScanLineColor();

      // Update GUI controllers
      for (const folder of Object.values(this.gui.__folders)) {
        for (const controller of folder.__controllers) {
          controller.updateDisplay();
        }
      }
      for (const controller of this.gui.__controllers) {
        controller.updateDisplay();
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        // Re-enable orbit controls
        if (this.scene.orbitControls) {
          this.scene.orbitControls.enabled = true;
        }
        this.isTransitioning = false;
      }
    };

    animate();
  }

  // Generate random hex color
  generateRandomColor() {
    return (
      "#" +
      Math.floor(Math.random() * 16777215)
        .toString(16)
        .padStart(6, "0")
    );
  }
}

export default GUIManager;
