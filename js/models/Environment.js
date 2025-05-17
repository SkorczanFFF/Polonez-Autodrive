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
        // Left side wheels
        { x: -1.227, y: 0.56, z: 1.975 }, // back left
        { x: -1.227, y: 0.56, z: -2.55 }, // front left
        // Right side wheels (mirrored from left)
        { x: 1.227, y: 0.56, z: 1.975 }, // back right
        { x: 1.227, y: 0.56, z: -2.55 }, // front right
      ],
      visible: true,
      wireframeVisible: true,
    };

    this.createSun();
    this.createTerrain();
    this.createRoad();
    this.createWheels();
    // this.createBox();
  }

  // createBox() {
  //   // 1. Create geometry
  //   const geometry = new THREE.BoxGeometry(1, 1, 1); // width, height, depth

  //   // 2. Create material
  //   const material = new THREE.MeshStandardMaterial({ color: 0x00ff00 });

  //   // 3. Combine into mesh
  //   const cube = new THREE.Mesh(geometry, material);
  //   cube.position.set(16, 0, 0);
  //   // 4. Add to scene
  //   this.scene.add(cube);
  // }

  createSun() {
    // Create sun
    const sunGeometry = new THREE.CircleBufferGeometry(200, 20, 0, 3.1);
    const sunMaterial = this.materialManager.getMaterial("sun");

    const sun = new THREE.Mesh(sunGeometry, sunMaterial);
    sun.position.set(1, -20, -350);
    this.scene.add(sun);
    this.elements.sun = sun;

    // Create sun effect
    const sunEffectGeometry = new THREE.PlaneGeometry(460, 460, 1);
    const sunEffectMaterial = this.materialManager.getMaterial("sunEffect");

    const sunEffect = new THREE.Mesh(sunEffectGeometry, sunEffectMaterial);
    sunEffect.position.set(0, -35, -349.5);
    this.scene.add(sunEffect);
    this.elements.sunEffect = sunEffect;
  }

  createRoad() {
    // Create road base
    const roadGeometry = new THREE.BoxGeometry(15.95, 200, 0.02);
    roadGeometry.rotateX(-Math.PI / 2);
    const roadMaterial = this.materialManager.getMaterial("road");

    const roadMesh = new THREE.Mesh(roadGeometry, roadMaterial);
    roadMesh.receiveShadow = true;
    this.scene.add(roadMesh);
    this.elements.road = roadMesh;

    // Create road wireframe/texture layer
    const roadWireframeGeometry = new THREE.PlaneGeometry(15.8, 200, 1, 1);
    roadWireframeGeometry.rotateX(-Math.PI / 2);
    const roadWireframeMaterial =
      this.materialManager.getMaterial("roadWireframe");

    const roadWireframeMesh = new THREE.Mesh(
      roadWireframeGeometry,
      roadWireframeMaterial
    );
    roadWireframeMesh.position.y = 0.06;
    roadWireframeMesh.receiveShadow = true;
    this.scene.add(roadWireframeMesh);
    this.elements.roadWireframe = roadWireframeMesh;
  }

  createTerrain() {
    // Create terrain base
    const terrainGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    terrainGeometry.rotateX(-Math.PI / 2);
    const terrainMaterial = this.materialManager.getMaterial("terrain");

    const terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
    terrainMesh.receiveShadow = true;
    this.scene.add(terrainMesh);
    this.elements.terrain = terrainMesh;

    // Create terrain wireframe/texture layer
    const terrainWireframeGeometry = new THREE.PlaneGeometry(200, 200, 1, 1);
    terrainWireframeGeometry.rotateX(-Math.PI / 2);
    const terrainWireframeMaterial =
      this.materialManager.getMaterial("terrainWireframe");

    const terrainWireframeMesh = new THREE.Mesh(
      terrainWireframeGeometry,
      terrainWireframeMaterial
    );
    terrainWireframeMesh.receiveShadow = true;
    this.scene.add(terrainWireframeMesh);
    this.elements.terrainWireframe = terrainWireframeMesh;
  }

  createWheels() {
    // Load the wheel model once and clone it for all four wheels
    const fbxLoader = new THREE.FBXLoader();
    fbxLoader.load("models/wheel.fbx", (wheelOriginal) => {
      // Create the wheels
      this.wheels.positions.forEach((position, index) => {
        // Create model wheel
        const wheel = wheelOriginal.clone();
        const wheelMaterial = this.materialManager.getMaterial("polonez");
        wheel.traverse((child) => {
          if (child.isMesh) {
            child.material = wheelMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Position the wheel
        wheel.position.set(position.x, position.y, position.z);

        // If it's a right wheel, flip it (mirror)
        if (index >= 2) {
          wheel.rotation.y = Math.PI;
        }

        // Add the wheel to the scene
        this.scene.add(wheel);
        this.wheels.models.push(wheel);

        // Create wireframe wheel
        const wheelWireframe = wheelOriginal.clone();
        const wheelWireframeMaterial =
          this.materialManager.getMaterial("polonezWireframe");
        wheelWireframe.traverse((child) => {
          if (child.isMesh) {
            child.material = wheelWireframeMaterial;
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        // Position the wireframe wheel exactly like the model wheel
        wheelWireframe.position.set(position.x, position.y, position.z);

        // If it's a right wheel, flip it (mirror)
        if (index >= 2) {
          wheelWireframe.rotation.y = Math.PI;
        }

        // Add the wireframe wheel to the scene
        this.scene.add(wheelWireframe);
        this.wheels.wireframes.push(wheelWireframe);
      });
    });
  }

  setWheelsVisibility(visible) {
    this.wheels.visible = visible;
    this.wheels.models.forEach((wheel) => {
      wheel.visible = visible;
    });
  }

  setWheelsWireframeVisibility(visible) {
    this.wheels.wireframeVisible = visible;
    this.wheels.wireframes.forEach((wheel) => {
      wheel.visible = visible;
    });
  }

  setWheelsColor(material) {
    this.wheels.models.forEach((wheel) => {
      wheel.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
        }
      });
    });
  }

  setWheelsWireframeColor(material) {
    this.wheels.wireframes.forEach((wheel) => {
      wheel.traverse((child) => {
        if (child.isMesh) {
          child.material = material;
        }
      });
    });
  }

  rotateWheels(amount) {
    // Rotate all wheels by the given amount
    [...this.wheels.models, ...this.wheels.wireframes].forEach((wheel) => {
      wheel.rotation.x += amount;
    });
  }

  // Update wheel positions relative to the Polonez model
  updateWheelsPosition(polonezModel) {
    if (!polonezModel || this.wheels.models.length === 0) return;

    // Get the model's current position and rotation
    const carX = polonezModel.position.x;
    const carY = polonezModel.position.y;
    const carZ = polonezModel.position.z;
    const carRotationZ = polonezModel.rotation.z; // Now using Z rotation instead of Y

    // Calculate wheel offsets
    const leftOffset = 1.227;
    const rightOffset = 1.227;

    // Update all wheel positions
    for (let i = 0; i < this.wheels.positions.length; i++) {
      const basePosition = this.wheels.positions[i];
      let wheelX, wheelY;

      // We need to adjust the position based on the car's Z rotation
      // The car now tilts on the Z axis rather than rotating on Y axis
      if (i < 2) {
        // Left wheels
        // Adjust Y position slightly based on Z rotation (to simulate tilt)
        wheelX = carX - leftOffset;
        wheelY = basePosition.y - carRotationZ * 0.5; // Wheels go up/down slightly as car tilts
      } else {
        // Right wheels
        // Adjust Y position slightly based on Z rotation (to simulate tilt)
        wheelX = carX + rightOffset;
        wheelY = basePosition.y + carRotationZ * 0.5; // Wheels go up/down slightly as car tilts
      }

      // Update the wheel positions
      this.wheels.models[i].position.x = wheelX;
      this.wheels.models[i].position.y = wheelY;
      this.wheels.wireframes[i].position.x = wheelX;
      this.wheels.wireframes[i].position.y = wheelY;
    }
  }

  // Set the speed multiplier for animations
  setSpeed(multiplier) {
    this.speedMultiplier = multiplier;
    // Update wheel rotation speed
    this.wheelRotationSpeed = -0.22 * this.speedMultiplier;
  }

  update(deltaTime) {
    // Rotate the wheels if they exist
    if (this.wheels.models.length > 0) {
      this.rotateWheels(this.wheelRotationSpeed * deltaTime * 60);
    }
  }
}

export default Environment;
