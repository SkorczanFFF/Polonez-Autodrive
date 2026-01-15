class Environment {
  constructor(scene, materialManager) {
    this.scene = scene;
    this.materialManager = materialManager;
    this.elements = {};
    this.wheelRotationSpeed = -0.22;
    this.speedMultiplier = 1.0;
    this.wheels = {
      models: [],
      wireframes: [],
      positions: [
        { x: -1.227, y: 0.56, z: 1.975 },  // back left
        { x: -1.227, y: 0.56, z: -2.55 },  // front left
        { x: 1.227, y: 0.56, z: 1.975 },   // back right
        { x: 1.227, y: 0.56, z: -2.55 },   // front right
      ],
      visible: true,
      wireframeVisible: true,
    };

    this.createSun();
    this.createTerrain();
    this.createRoad();
    this.createWheels();
  }

  createSun() {
    const sunGeometry = new THREE.CircleBufferGeometry(200, 20, 0, 3.1);
    const sunMaterial = this.materialManager.getMaterial("sun");
    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(1, -20, -350);
    this.scene.add(sun);
    this.elements.sun = sun;

    const sunEffectGeometry = new THREE.PlaneGeometry(460, 460, 1);
    const sunEffectMaterial = this.materialManager.getMaterial("sunEffect");
    const sunEffect = new THREE.Mesh(sunEffectGeometry, sunEffectMaterial);
    sunEffect.position.set(0, -35, -349.5);
    this.scene.add(sunEffect);
    this.elements.sunEffect = sunEffect;
  }

  createRoad() {
    const roadGeometry = new THREE.BoxGeometry(15.95, 200, 0.02);
    roadGeometry.rotateX(-Math.PI / 2);
    const roadMaterial = this.materialManager.getMaterial("road");
    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
    this.elements.road = roadMesh;

    const roadWireframeGeometry = new THREE.PlaneGeometry(15.8, 200, 1, 1);
    roadWireframeGeometry.rotateX(-Math.PI / 2);
    const roadWireframeMaterial = this.materialManager.getMaterial("roadWireframe");
    const roadWireframeMesh = new THREE.Mesh(roadWireframeGeometry, roadWireframeMaterial);
    roadWireframeMesh.position.y = 0.06;
    roadWireframeMesh.receiveShadow = true;
    this.scene.add(roadWireframeMesh);
    this.elements.roadWireframe = roadWireframeMesh;
  }

  createTerrain() {
    const terrainGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainMaterial = this.materialManager.getMaterial("terrain");
    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
    this.elements.terrain = terrainMesh;

    const terrainWireframeGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    terrainWireframeGeometry.rotateX(-Math.PI / 2);
    const terrainWireframeMaterial = this.materialManager.getMaterial("terrainWireframe");
    const terrainWireframeMesh = new THREE.Mesh(terrainWireframeGeometry, terrainWireframeMaterial);
    terrainWireframeMesh.receiveShadow = true;
    this.scene.add(terrainWireframeMesh);
    this.elements.terrainWireframe = terrainWireframeMesh;
  }

  createWheels() {
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load("models/wheel.fbx", (wheelOriginal) => {
      this.wheels.positions.forEach((position, index) => {
        const wheel = wheelOriginal.clone();
        const wheelMaterial = this.materialManager.getMaterial("polonez");
        wheel.traverse((child) => {
          if (child.isMesh) {
            child.material = wheelMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        wheel.position.set(position.x, position.y, position.z);
        if (index >= 2) wheel.rotation.y = Math.PI; // Mirror right wheels

        this.scene.add(wheel);
        this.wheels.models.push(wheel);

        const wheelWireframe = wheelOriginal.clone();
        const wheelWireframeMaterial = this.materialManager.getMaterial("polonezWireframe");
        wheelWireframe.traverse((child) => {
          if (child.isMesh) {
            child.material = wheelWireframeMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        wheelWireframe.position.set(position.x, position.y, position.z);
        if (index >= 2) wheelWireframe.rotation.y = Math.PI;

        this.scene.add(wheelWireframe);
        this.wheels.wireframes.push(wheelWireframe);
      });
    });
  }

  setWheelsVisibility(visible) {
    this.wheels.visible = visible;
    this.wheels.models.forEach((wheel) => (wheel.visible = visible));
  }

  setWheelsWireframeVisibility(visible) {
    this.wheels.wireframeVisible = visible;
    this.wheels.wireframes.forEach((wheel) => (wheel.visible = visible));
  }

  setWheelsColor(material) {
    this.wheels.models.forEach((wheel) => {
      wheel.traverse((child) => {
        if (child.isMesh) child.material = material;
      });
    });
  }

  setWheelsWireframeColor(material) {
    this.wheels.wireframes.forEach((wheel) => {
      wheel.traverse((child) => {
        if (child.isMesh) child.material = material;
      });
    });
  }

  rotateWheels(amount) {
    [...this.wheels.models, ...this.wheels.wireframes].forEach((wheel) => {
      wheel.rotation.x += amount;
    });
  }

  updateWheelsPosition(polonezModel) {
    if (!polonezModel || this.wheels.models.length === 0) return;

    const carX = polonezModel.position.x;
    const carRotationZ = polonezModel.rotation.z;
    const leftOffset = 1.227;
    const rightOffset = 1.227;

    for (let i = 0; i < this.wheels.positions.length; i++) {
      const basePosition = this.wheels.positions[i];
      let wheelX, wheelY;

      // Adjust Y based on car tilt (Z rotation)
      if (i < 2) {
        wheelX = carX - leftOffset;
        wheelY = basePosition.y - carRotationZ * 0.5;
      } else {
        wheelX = carX + rightOffset;
        wheelY = basePosition.y + carRotationZ * 0.5;
      }

      this.wheels.models[i].position.x = wheelX;
      this.wheels.models[i].position.y = wheelY;
      this.wheels.wireframes[i].position.x = wheelX;
      this.wheels.wireframes[i].position.y = wheelY;
    }
  }

  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    this.wheelRotationSpeed = -0.22 * this.speedMultiplier;
  }

  update(deltaTime) {
    if (this.wheels.models.length > 0) {
      this.rotateWheels(this.wheelRotationSpeed * deltaTime * 60);
    }
  }
}

export default Environment;
