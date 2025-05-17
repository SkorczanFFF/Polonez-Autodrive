class MaterialManager {
  constructor() {
    // Default colors
    this.colors = {
      pink: "#c348dd",
      lightpink: "#eb94c1",
      violet: "#4f33d9",
      aqua: "#40d5db",
      blue: "#4790ff",
      yellow: "#ffebac",
      red: "#fc3b96",
      white: "#ededed",
      tweety: "#ffdf7c",
      laguna: "#3b8ceb",
    };

    // Texture speed multiplier
    this.textureSpeedMultiplier = 1.0;

    // Materials for models
    this.materials = {
      // Polonez materials
      polonez: this.createMeshPhongMaterial({ color: this.colors.laguna }),
      polonezWireframe: this.createMeshPhongMaterial({
        color: this.colors.tweety,
        wireframe: true,
      }),

      // Hills materials
      hills: this.createMeshPhongMaterial({ color: this.colors.violet }),
      hillsWireframe: this.createMeshPhongMaterial({
        color: this.colors.pink,
        wireframe: true,
      }),

      // Side hills materials
      side: this.createMeshPhongMaterial({ color: this.colors.blue }),
      sideWireframe: this.createMeshPhongMaterial({
        color: this.colors.violet,
        wireframe: true,
      }),

      // Road materials
      road: this.createMeshPhongMaterial({ color: this.colors.pink }),
      roadWireframe: null, // Will be set with texture

      // Terrain materials
      terrain: this.createMeshPhongMaterial({ color: this.colors.aqua }),
      terrainWireframe: null, // Will be set with texture

      // Sun materials
      sun: this.createMeshPhongMaterial({
        color: this.colors.yellow,
        fog: false,
        shininess: 20,
      }),
      sunEffect: null, // Will be set with texture

      // Palm materials
      palm: this.createMeshPhongMaterial({ color: "#56a0ff" }),
      palmWireframe: this.createMeshBasicMaterial({
        color: this.colors.tweety,
        wireframe: true,
      }),

      // Rock materials
      rock: this.createMeshPhongMaterial({ color: "#9047c3" }),
      rockWireframe: this.createMeshBasicMaterial({
        color: "#66b6cf",
        wireframe: true,
      }),
    };

    // Setup materials that require textures
    this.setupTexturedMaterials();
  }

  createMeshPhongMaterial(options) {
    const defaults = {
      fog: true,
      visible: true,
      transparent: false,
    };

    return new THREE.MeshPhongMaterial({ ...defaults, ...options });
  }

  createMeshBasicMaterial(options) {
    const defaults = {
      fog: true,
      visible: true,
      transparent: false,
    };

    return new THREE.MeshBasicMaterial({ ...defaults, ...options });
  }

  setupTexturedMaterials() {
    // Road wireframe with texture
    const texture2 = this.loadTexture(
      "models/materials/roadline.png",
      2,
      50,
      THREE.MirroredRepeatWrapping
    );
    this.materials.roadWireframe = this.createMeshPhongMaterial({
      map: texture2,
      transparent: true,
      color: this.colors.aqua,
    });

    // Terrain wireframe with texture
    const texture = this.loadTexture(
      "models/materials/gridline2.png",
      50,
      50,
      THREE.RepeatWrapping
    );
    this.materials.terrainWireframe = this.createMeshPhongMaterial({
      map: texture,
      transparent: true,
      color: this.colors.pink,
    });

    // Sun effect with texture
    const sunTexture = this.loadTexture(
      "models/materials/suneffectalt.png",
      1,
      1,
      THREE.RepeatWrapping
    );
    this.materials.sunEffect = this.createMeshPhongMaterial({
      map: sunTexture,
      transparent: true,
      color: this.colors.red,
      fog: false,
    });

    // Store textures for animation (scrolling)
    this.textures = { roadGrid: texture2, terrainGrid: texture };
  }

  loadTexture(path, repeatX, repeatY, wrapMode) {
    const texture = new THREE.TextureLoader().load(path);
    texture.anisotropy = 16;
    texture.wrapS = texture.wrapT = wrapMode;
    texture.repeat.set(repeatX, repeatY);
    return texture;
  }

  getMaterial(name) {
    return this.materials[name];
  }

  setTextureSpeed(multiplier) {
    this.textureSpeedMultiplier = multiplier;
  }

  updateTextures() {
    // Update texture offsets for animation - apply speed multiplier
    const baseSpeed = 0.06;
    const speed = baseSpeed * this.textureSpeedMultiplier;

    if (this.textures.terrainGrid) {
      this.textures.terrainGrid.offset.y += speed;
    }

    if (this.textures.roadGrid) {
      this.textures.roadGrid.offset.y += speed;
    }
  }
}

export default MaterialManager;
