import { easeInOutCubic } from "../utils/easing.js";

class MinigameManager {
  constructor(scene, modelLoader, polonezController) {
    this.scene = scene;
    this.modelLoader = modelLoader;
    this.polonezController = polonezController;
    this.boxes = [];
    this.isMinigameActive = false;
    this.score = 0;
    this.countdown = 3;
    this.showMinigameInstructions = true;
    this.speedMultiplier = 1.0;
    this.minSpawnInterval = 600;
    this.maxSpawnInterval = 1300;
    this.safeZone = { min: -0.1, max: 0.1 };
    this.gui = null;
    this.sceneManager = null;
    this.defaultCameraPosition = { x: 0, y: 1.975, z: 7 };
    this.gameCameraPosition = { x: 0, y: 4, z: 7 };
    this.boxSpawningActive = false;
    this.boxSpawningInterval = null;
    this.nextSpawnTimeout = null;
    this.currentLane = "left";
    this.laneBoxCount = 0;
    this.boxesThisBatch = Math.floor(Math.random() * 3) + 1;

    this.boxWidth = 4.25;
    this.innerGapFromCenter = 0.9;
    this.outerSpawnMargin = 0.5;

    this.createMinigameUI();

    this.onEnterKeyPress = this.onEnterKeyPress.bind(this);
    this.onEscKeyPress = this.onEscKeyPress.bind(this);

    if (this.polonezController) {
      this.polonezController.addEnterKeyListener(this.onEnterKeyPress);
    }

    document.addEventListener("keydown", this.onEscKeyPress);
  }

  setGUI(gui) {
    this.gui = gui;
  }

  setSceneManager(sceneManager) {
    this.sceneManager = sceneManager;
    if (sceneManager?.camera) {
      this.defaultCameraPosition = { ...sceneManager.camera.position };
    }
  }

  createMinigameUI() {
    this.overlay = document.createElement("div");
    this.overlay.className = "minigame-overlay";

    this.countdownElement = document.createElement("div");
    this.countdownElement.className = "minigame-countdown minigame-text-glow";
    this.overlay.appendChild(this.countdownElement);

    this.scoreElement = document.createElement("div");
    this.scoreElement.className = "minigame-score minigame-terminal-style minigame-text-glow";
    this.scoreElement.textContent = "SCORE: 0";
    this.overlay.appendChild(this.scoreElement);

    this.gameOverElement = document.createElement("div");
    this.gameOverElement.className = "minigame-gameover minigame-text-glow";
    this.gameOverElement.innerHTML = "GAME OVER<br><span style=\"font-family: 'Courier New', monospace;\">SCORE: 0</span>";
    this.overlay.appendChild(this.gameOverElement);

    this.instructionsElement = document.createElement("div");
    this.instructionsElement.className = "minigame-instructions minigame-terminal-style minigame-text-glow";
    this.instructionsElement.innerHTML = "Press <b>ENTER</b> to start minigame";

    this.escapeInfoElement = document.createElement("div");
    this.escapeInfoElement.className = "minigame-escape minigame-terminal-style minigame-text-glow";
    this.escapeInfoElement.innerHTML = "Press <b>ESC</b> to exit";

    document.body.appendChild(this.overlay);
    document.body.appendChild(this.instructionsElement);
    document.body.appendChild(this.escapeInfoElement);
  }

  onEnterKeyPress() {
    if (!this.isMinigameActive) {
      this.startMinigame();
    }
  }

  onEscKeyPress(event) {
    if (event.key === "Escape" && this.isMinigameActive && this.countdown <= 0) {
      this.endMinigame(false);
    }
  }

  startMinigame() {
    if (this.isMinigameActive) return;
    this.isMinigameActive = true;
    this.score = 0;
    this.countdown = 3;
    this.speedMultiplier = 1.0;

    if (this.polonezController) {
      this.polonezController.isSteeringEnabled = false;
      this.polonezController.disableKeyboardInputs = true;
    }

    if (this.sceneManager?.camera && this.sceneManager?.controls) {
      this.sceneManager.controls.enabled = false;

      const startPos = {
        x: this.sceneManager.camera.position.x,
        y: this.sceneManager.camera.position.y,
        z: this.sceneManager.camera.position.z,
        rotationX: this.sceneManager.camera.rotation.x,
        rotationY: this.sceneManager.camera.rotation.y,
        rotationZ: this.sceneManager.camera.rotation.z,
      };

      const endPos = {
        x: this.gameCameraPosition.x,
        y: this.gameCameraPosition.y,
        z: this.gameCameraPosition.z,
        rotationX: this.sceneManager.camera.rotation.x,
        rotationY: 0,
        rotationZ: this.sceneManager.camera.rotation.z,
      };

      this.animateCameraPosition(startPos, endPos, 1000);
    }

    if (this.gui) {
      this.gui.domElement.style.display = "none";
    }

    this.instructionsElement.style.display = "none";
    this.escapeInfoElement.style.display = "block";
    this.gameOverElement.style.display = "none";
    this.countdownElement.style.display = "block";
    this.overlay.style.display = "flex";
    this.updateCountdown();

    const countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown > 0) {
        this.updateCountdown();
        if (this.countdown === 2) {
          this.startSpawningBoxes();
        }
      } else if (this.countdown === 0) {
        this.countdownElement.textContent = "START!";

        if (this.polonezController) {
          this.polonezController.isSteeringEnabled = true;
          this.polonezController.disableKeyboardInputs = false;
        }
      } else {
        clearInterval(countdownInterval);
        this.countdownElement.style.display = "none";
        this.scoreElement.style.display = "block";
        this.updateScore();
        this.updateGameSpeed();
      }
    }, 1000);
  }

  animateCameraPosition(startPos, endPos, duration) {
    if (!this.sceneManager?.camera) return;

    const camera = this.sceneManager.camera;
    const controls = this.sceneManager.controls;
    const startTime = Date.now();
    const targetPos = new THREE.Vector3(0, 1.8, 0);

    const updateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      camera.position.x = startPos.x + (endPos.x - startPos.x) * eased;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * eased;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * eased;

      camera.rotation.x = startPos.rotationX + (endPos.rotationX - startPos.rotationX) * eased;
      camera.rotation.y = startPos.rotationY + (endPos.rotationY - startPos.rotationY) * eased;
      camera.rotation.z = startPos.rotationZ + (endPos.rotationZ - startPos.rotationZ) * eased;

      camera.lookAt(targetPos);

      if (controls) {
        controls.target.copy(targetPos);
        controls.update();
      }

      if (progress < 1) {
        requestAnimationFrame(updateCamera);
      } else {
        camera.position.set(endPos.x, endPos.y, endPos.z);
        camera.rotation.set(endPos.rotationX, endPos.rotationY, endPos.rotationZ);
        camera.lookAt(targetPos);
        controls?.target.copy(targetPos);
        controls?.update();
      }
    };

    updateCamera();
  }

  updateCountdown() {
    this.countdownElement.textContent = this.countdown.toString();
  }

  updateScore() {
    this.scoreElement.textContent = `SCORE: ${this.score}`;
  }

  updateGameSpeed() {
    const tier = Math.floor(this.score / 20);
    const newSpeedMultiplier = tier > 0 ? 1.0 + tier * 0.15 : 1.0;

    if (newSpeedMultiplier !== this.speedMultiplier) {
      this.speedMultiplier = newSpeedMultiplier;

      this.environment?.setSpeed(this.speedMultiplier);
      this.materialManager?.setTextureSpeed(this.speedMultiplier);
      this._palmManager?.setSpeed(this.speedMultiplier);
      this._rockManager?.setSpeed(this.speedMultiplier);

      if (this.boxSpawningActive && this.boxSpawningInterval) {
        this.updateBoxSpawningRate();
      }
    }
  }

  updateBoxSpawningRate() {
    if (this.boxSpawningInterval) {
      clearInterval(this.boxSpawningInterval);
      this.boxSpawningInterval = null;
    }

    if (this.nextSpawnTimeout) {
      clearTimeout(this.nextSpawnTimeout);
      this.nextSpawnTimeout = null;
    }

    this.scheduleNextBoxSpawn();
  }

  scheduleNextBoxSpawn() {
    if (!this.isMinigameActive || !this.boxSpawningActive) return;

    const minInterval = this.minSpawnInterval / this.speedMultiplier;
    const maxInterval = this.maxSpawnInterval / this.speedMultiplier;
    const randomInterval = minInterval + Math.random() * (maxInterval - minInterval);

    this.nextSpawnTimeout = setTimeout(() => {
      this.spawnBox();
      this.scheduleNextBoxSpawn();
    }, randomInterval);
  }

  startSpawningBoxes() {
    if (this.boxSpawningActive) return;
    this.boxSpawningActive = true;
    this.scheduleNextBoxSpawn();
  }

  spawnBox() {
    const maxSteeringRange = this.polonezController.maxDisplacement;
    const halfWidth = this.boxWidth / 2;

    let leftSpawnMin = -maxSteeringRange + this.outerSpawnMargin;
    let leftSpawnMax = this.safeZone.min - halfWidth - this.innerGapFromCenter;
    let rightSpawnMin = this.safeZone.max + halfWidth + this.innerGapFromCenter;
    let rightSpawnMax = maxSteeringRange - this.outerSpawnMargin;

    if (leftSpawnMax <= leftSpawnMin) leftSpawnMax = leftSpawnMin + 0.1;
    if (rightSpawnMax <= rightSpawnMin) rightSpawnMax = rightSpawnMin + 0.1;

    const spawnInLane = this.currentLane;
    this.laneBoxCount++;

    if (this.laneBoxCount >= this.boxesThisBatch) {
      this.currentLane = this.currentLane === "left" ? "right" : "left";
      this.laneBoxCount = 0;
      this.boxesThisBatch = Math.floor(Math.random() * 3) + 1;
    }

    let xPosition;
    if (spawnInLane === "left") {
      xPosition = leftSpawnMin + Math.random() * (leftSpawnMax - leftSpawnMin);
    } else {
      xPosition = rightSpawnMin + Math.random() * (rightSpawnMax - rightSpawnMin);
    }

    const boxGeometry = new THREE.BoxGeometry(this.boxWidth, 4, 6);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);
    box.position.set(xPosition, 0, -90);

    const boxSize = new THREE.Vector3(this.boxWidth, 4, 6);
    box.userData.collisionBox = new THREE.Box3().setFromCenterAndSize(box.position, boxSize);
    box.userData.isBox = true;
    box.userData.scored = false;

    this.scene.add(box);
    this.boxes.push(box);

    this.animateBox(box, () => {
      this.scene.remove(box);
      const index = this.boxes.indexOf(box);
      if (index !== -1) this.boxes.splice(index, 1);
    });
  }

  animateBox(box, onComplete) {
    const startTime = Date.now();
    const duration = 6000 / this.speedMultiplier;

    const update = () => {
      if (!this.isMinigameActive) {
        this.scene.remove(box);
        const index = this.boxes.indexOf(box);
        if (index !== -1) this.boxes.splice(index, 1);
        return;
      }

      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      box.position.z = -100 + progress * 200;

      if (box.userData.collisionBox) {
        const boxSize = new THREE.Vector3(4.5, 4, 8);
        box.userData.collisionBox.setFromCenterAndSize(box.position, boxSize);
      }

      if (this.checkCollision(box)) {
        this.endMinigame(true);
        return;
      }

      if (!box.userData.scored && box.position.z > this.polonezController.polonezModel.position.z) {
        this.score++;
        this.updateScore();
        box.userData.scored = true;

        if (this.score % 20 === 0) {
          this.updateGameSpeed();
        }
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        onComplete?.();
      }
    };

    update();
  }

  checkCollision(box) {
    if (!this.polonezController?.polonezModel) return false;

    const polonezBox = new THREE.Box3().setFromObject(this.polonezController.polonezModel);
    return polonezBox.intersectsBox(box.userData.collisionBox);
  }

  endMinigame(collision) {
    if (!this.isMinigameActive) return;

    this.isMinigameActive = false;
    this.boxSpawningActive = false;

    if (this.polonezController) {
      this.polonezController.isSteeringEnabled = true;
      this.polonezController.disableKeyboardInputs = false;
    }

    if (this.boxSpawningInterval) {
      clearInterval(this.boxSpawningInterval);
      this.boxSpawningInterval = null;
    }

    if (this.nextSpawnTimeout) {
      clearTimeout(this.nextSpawnTimeout);
      this.nextSpawnTimeout = null;
    }

    if (collision) {
      this.boxes.forEach((box) => this.scene.remove(box));
      this.boxes = [];
    }

    this.speedMultiplier = 1.0;
    this.environment?.setSpeed(1.0);
    this.materialManager?.setTextureSpeed(1.0);
    this._palmManager?.setSpeed(1.0);
    this._rockManager?.setSpeed(1.0);

    if (this.sceneManager?.camera) {
      const startPos = {
        x: this.sceneManager.camera.position.x,
        y: this.sceneManager.camera.position.y,
        z: this.sceneManager.camera.position.z,
        rotationX: this.sceneManager.camera.rotation.x,
        rotationY: this.sceneManager.camera.rotation.y,
        rotationZ: this.sceneManager.camera.rotation.z,
      };

      const endPos = {
        x: this.defaultCameraPosition.x,
        y: this.defaultCameraPosition.y,
        z: this.defaultCameraPosition.z,
        rotationX: this.sceneManager.camera.rotation.x,
        rotationY: 0,
        rotationZ: this.sceneManager.camera.rotation.z,
      };

      if (!collision && this.polonezController?.polonezModel) {
        this.polonezController.polonezModel.rotation.set(0, 0, 0);
        this.polonezController.polonezModel.updateMatrix();

        if (this.polonezController.polonezWireframeModel) {
          this.polonezController.polonezWireframeModel.rotation.set(0, 0, 0);
          this.polonezController.polonezWireframeModel.updateMatrix();
        }
      }

      this.animateCameraPosition(startPos, endPos, 1000);

      setTimeout(() => {
        if (this.sceneManager?.controls) {
          this.sceneManager.controls.enabled = true;
        }
      }, 1000);
    }

    if (this.gui) {
      this.gui.domElement.style.display = "block";
    }

    this.escapeInfoElement.style.display = "none";

    if (collision) {
      this.scoreElement.style.display = "none";
      this.gameOverElement.style.display = "block";
      this.gameOverElement.querySelector("span").textContent = `SCORE: ${this.score}`;

      setTimeout(() => {
        this.overlay.style.display = "none";
        this.gameOverElement.style.display = "none";
        this.instructionsElement.style.display = "block";
      }, 3000);
    } else {
      this.overlay.style.display = "none";
      this.countdownElement.style.display = "block";
      this.scoreElement.style.display = "none";
      this.instructionsElement.style.display = "block";
    }
  }

  setEnvironment(environment) {
    this.environment = environment;
  }

  setMaterialManager(materialManager) {
    this.materialManager = materialManager;
  }

  setPalmManager(manager) {
    this._palmManager = manager;
  }

  setRockManager(manager) {
    this._rockManager = manager;
  }

  update() {
    if (this.showMinigameInstructions && !this.isMinigameActive) {
      this.instructionsElement.style.display = "block";
    }
  }

  cleanup() {
    if (this.boxSpawningInterval) clearInterval(this.boxSpawningInterval);
    if (this.nextSpawnTimeout) clearTimeout(this.nextSpawnTimeout);

    this.polonezController?.removeEnterKeyListener(this.onEnterKeyPress);
    document.removeEventListener("keydown", this.onEscKeyPress);

    this.overlay?.parentNode?.removeChild(this.overlay);
    this.instructionsElement?.parentNode?.removeChild(this.instructionsElement);
    this.escapeInfoElement?.parentNode?.removeChild(this.escapeInfoElement);
  }
}

export default MinigameManager;
