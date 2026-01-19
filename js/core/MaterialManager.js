class MaterialManager {
  constructor() {
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

    this.textureSpeedMultiplier = 1.0;

    this.materials = {
      polonez: this.createMeshPhongMaterial({ color: this.colors.laguna }),
      polonezWireframe: this.createMeshPhongMaterial({ color: this.colors.tweety, wireframe: true }),

      hills: this.createMeshPhongMaterial({ color: this.colors.violet }),
      hillsWireframe: this.createMeshPhongMaterial({ color: this.colors.pink, wireframe: true }),

      side: this.createMeshPhongMaterial({ color: this.colors.blue }),
      sideWireframe: this.createMeshPhongMaterial({ color: this.colors.violet, wireframe: true }),

      road: this.createMeshPhongMaterial({ color: this.colors.pink }),
      roadWireframe: null,

      terrain: this.createMeshPhongMaterial({ color: this.colors.aqua }),
      terrainWireframe: null,

      sun: this.createMeshPhongMaterial({ color: this.colors.yellow, fog: false, shininess: 20 }),
      sunEffect: null,

      palm: this.createMeshPhongMaterial({ color: "#56a0ff" }),
      palmWireframe: this.createMeshBasicMaterial({ color: this.colors.tweety, wireframe: true }),

      rock: this.createMeshPhongMaterial({ color: "#9047c3" }),
      rockWireframe: this.createMeshBasicMaterial({ color: "#66b6cf", wireframe: true }),
    };

    this.setupTexturedMaterials();
  }

  createMeshPhongMaterial(options) {
    return new THREE.MeshPhongMaterial({ fog: true, visible: true, transparent: false, ...options });
  }

  createMeshBasicMaterial(options) {
    return new THREE.MeshBasicMaterial({ fog: true, visible: true, transparent: false, ...options });
  }

  setupTexturedMaterials() {
    const roadTexture = this.loadTexture("models/materials/roadline.png", 2, 50, THREE.MirroredRepeatWrapping);
    this.materials.roadWireframe = this.createMeshPhongMaterial({
      map: roadTexture,
      transparent: true,
      color: this.colors.aqua,
    });

    const terrainTexture = this.loadTexture("models/materials/gridline2.png", 50, 50, THREE.RepeatWrapping);
    this.materials.terrainWireframe = this.createMeshPhongMaterial({
      map: terrainTexture,
      transparent: true,
      color: this.colors.pink,
    });

    const sunTexture = this.loadTexture("models/materials/suneffectalt.png", 1, 1, THREE.RepeatWrapping);
    this.materials.sunEffect = this.createMeshPhongMaterial({
      map: sunTexture,
      transparent: true,
      color: this.colors.red,
      fog: false,
    });

    this.textures = { roadGrid: roadTexture, terrainGrid: terrainTexture };
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

  updateTextures(deltaTime = 1 / 60) {
    const frameScale = deltaTime * 60;
    const speed = 0.06 * this.textureSpeedMultiplier * frameScale;

    if (this.textures.terrainGrid) {
      this.textures.terrainGrid.offset.y += speed;
    }

    if (this.textures.roadGrid) {
      this.textures.roadGrid.offset.y += speed;
    }
  }
}

export default MaterialManager;
