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
    this.baseSpawnInterval = 2000; // Base interval for box spawning
    this.minSpawnInterval = 750; // Minimum spawn interval
    this.maxSpawnInterval = 2000; // Maximum spawn interval
    this.safeZone = { min: -3.6, max: 3.6 }; // Safe zone where boxes shouldn't spawn
    this.gui = null; // Reference to the GUI to hide/show it
    this.sceneManager = null; // Reference to the scene manager for camera control
    this.defaultCameraPosition = { x: 0, y: 1.975, z: 7 }; // Default camera position
    this.gameCameraPosition = { x: 0, y: 4, z: 7 }; // Game camera position
    this.boxSpawningActive = false; // Track if box spawning is active
    this.boxSpawningInterval = null; // Reference to the interval
    this.nextSpawnTimeout = null; // Timeout for the next spawn
    this.debugMode = false; // For debugging the speed issue

    // Create overlay for minigame UI
    this.createMinigameUI();

    // Bind methods
    this.onEnterKeyPress = this.onEnterKeyPress.bind(this);
    this.onEscKeyPress = this.onEscKeyPress.bind(this);

    // Register for Enter key events from PolonezController
    if (this.polonezController) {
      this.polonezController.addEnterKeyListener(this.onEnterKeyPress);
    }

    // Add escape key listener to end minigame
    document.addEventListener("keydown", this.onEscKeyPress);
  }

  // Set GUI reference to handle visibility
  setGUI(gui) {
    this.gui = gui;
  }

  // Set SceneManager reference to handle camera position
  setSceneManager(sceneManager) {
    this.sceneManager = sceneManager;
    // Store the initial camera position
    if (sceneManager && sceneManager.camera) {
      this.defaultCameraPosition = {
        x: sceneManager.camera.position.x,
        y: sceneManager.camera.position.y,
        z: sceneManager.camera.position.z,
      };
    }
  }

  createMinigameUI() {
    // Create overlay for minigame
    this.overlay = document.createElement("div");
    this.overlay.className = "minigame-overlay";

    // Create countdown element styled like loader
    this.countdownElement = document.createElement("div");
    this.countdownElement.className = "minigame-countdown minigame-text-glow";
    this.overlay.appendChild(this.countdownElement);

    // Create score element
    this.scoreElement = document.createElement("div");
    this.scoreElement.className =
      "minigame-score minigame-terminal-style minigame-text-glow";
    this.scoreElement.textContent = "SCORE: 0";
    this.overlay.appendChild(this.scoreElement);

    // Create game over display
    this.gameOverElement = document.createElement("div");
    this.gameOverElement.className = "minigame-gameover minigame-text-glow";
    this.gameOverElement.innerHTML =
      "GAME OVER<br><span style=\"font-family: 'Courier New', monospace;\">SCORE: 0</span>";
    this.overlay.appendChild(this.gameOverElement);

    // Create instructions popup in top left corner
    this.instructionsElement = document.createElement("div");
    this.instructionsElement.className =
      "minigame-instructions minigame-terminal-style minigame-text-glow";
    this.instructionsElement.innerHTML = "Press <b>ENTER</b> to start minigame";

    // Create escape info - shown during game
    this.escapeInfoElement = document.createElement("div");
    this.escapeInfoElement.className =
      "minigame-escape minigame-terminal-style minigame-text-glow";
    this.escapeInfoElement.innerHTML = "Press <b>ESC</b> to exit";

    // Add to document
    document.body.appendChild(this.overlay);
    document.body.appendChild(this.instructionsElement);
    document.body.appendChild(this.escapeInfoElement);
  }

  onEnterKeyPress(event) {
    // Start minigame on Enter key if not already active
    if (!this.isMinigameActive) {
      this.startMinigame();
    }
  }

  onEscKeyPress(event) {
    // End minigame on Escape key
    if (event.key === "Escape" && this.isMinigameActive) {
      this.endMinigame(false);
    }
  }

  startMinigame() {
    if (this.isMinigameActive) return;
    this.isMinigameActive = true;
    this.score = 0;
    this.countdown = 3;
    this.speedMultiplier = 1.0;

    // First reset camera to default position, then change to game view
    if (
      this.sceneManager &&
      this.sceneManager.camera &&
      this.sceneManager.controls
    ) {
      // Disable orbit controls first
      this.sceneManager.controls.enabled = false;

      // Reset camera to default position immediately
      this.sceneManager.camera.position.set(
        this.defaultCameraPosition.x,
        this.defaultCameraPosition.y,
        this.defaultCameraPosition.z
      );

      // Reset controls target to default
      this.sceneManager.controls.target.set(0, 1.8, 0);
      this.sceneManager.controls.update();

      // Now animate to game position
      const startPos = {
        x: this.defaultCameraPosition.x,
        y: this.defaultCameraPosition.y,
        z: this.defaultCameraPosition.z,
      };
      const endPos = this.gameCameraPosition;

      // Animate camera position change
      this.animateCameraPosition(startPos, endPos, 1000);
    }

    // Hide GUI during game
    if (this.gui) {
      this.gui.domElement.style.display = "none";
    }

    // Hide instructions when game starts
    this.instructionsElement.style.display = "none";

    // Show escape info
    this.escapeInfoElement.style.display = "block";

    // Hide game over display if visible
    this.gameOverElement.style.display = "none";

    // Reset and show elements
    this.countdownElement.style.display = "block";
    this.overlay.style.display = "flex";
    this.updateCountdown();

    // Start countdown
    const countdownInterval = setInterval(() => {
      this.countdown--;
      if (this.countdown > 0) {
        this.updateCountdown();

        if (this.countdown === 2) {
          this.startSpawningBoxes();
        }
      } else if (this.countdown === 0) {
        this.countdownElement.textContent = "START!";
      } else {
        // Clear countdown interval
        clearInterval(countdownInterval);

        // Hide countdown and show score
        this.countdownElement.style.display = "none";
        this.scoreElement.style.display = "block";
        this.updateScore();

        // Update game speed progressively
        this.updateGameSpeed();
      }
    }, 1000);
  }

  animateCameraPosition(startPos, endPos, duration) {
    if (!this.sceneManager || !this.sceneManager.camera) return;

    const camera = this.sceneManager.camera;
    const startTime = Date.now();

    const updateCamera = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use easing function for smooth transition
      const easedProgress = this.easeInOutCubic(progress);

      // Interpolate between start and end positions
      camera.position.x = startPos.x + (endPos.x - startPos.x) * easedProgress;
      camera.position.y = startPos.y + (endPos.y - startPos.y) * easedProgress;
      camera.position.z = startPos.z + (endPos.z - startPos.z) * easedProgress;

      if (progress < 1) {
        requestAnimationFrame(updateCamera);
      }
    };

    updateCamera();
  }

  // Easing function for smooth transitions
  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  updateCountdown() {
    this.countdownElement.textContent = this.countdown.toString();
  }

  updateScore() {
    this.scoreElement.textContent = `SCORE: ${this.score}`;
  }

  updateGameSpeed() {
    // Calculate speed multiplier based on score
    const tier = Math.floor(this.score / 20);

    // Ensure minimum speed is 1.0
    const newSpeedMultiplier = tier > 0 ? 1.0 + tier * 0.15 : 1.0; // +15% speed per tier

    if (this.debugMode) {
      console.log(
        `Speed update - Score: ${this.score}, Tier: ${tier}, New multiplier: ${newSpeedMultiplier}, Old multiplier: ${this.speedMultiplier}`
      );
    }

    // Only update if the speed has changed
    if (newSpeedMultiplier !== this.speedMultiplier) {
      this.speedMultiplier = newSpeedMultiplier;

      // Apply speed changes to environment elements
      if (this.environment) {
        this.environment.setSpeed(this.speedMultiplier);
      }

      // Update textures speed
      if (this.materialManager) {
        this.materialManager.setTextureSpeed(this.speedMultiplier);
      }

      // Update palm speed
      if (this._palmManager) {
        this._palmManager.setSpeed(this.speedMultiplier);
      }

      // Update rock speed
      if (this._rockManager) {
        this._rockManager.setSpeed(this.speedMultiplier);
      }

      // Update box spawning rate if active
      if (this.boxSpawningActive && this.boxSpawningInterval) {
        this.updateBoxSpawningRate();
      }

      if (this.debugMode) {
        console.log(`Speed updated to ${this.speedMultiplier}`);
      }
    }
  }

  updateBoxSpawningRate() {
    // Clear existing interval and timeout
    if (this.boxSpawningInterval) {
      clearInterval(this.boxSpawningInterval);
      this.boxSpawningInterval = null;
    }

    if (this.nextSpawnTimeout) {
      clearTimeout(this.nextSpawnTimeout);
      this.nextSpawnTimeout = null;
    }

    // Schedule the next spawn with randomized timing
    this.scheduleNextBoxSpawn();
  }

  // New method to schedule spawns with random intervals
  scheduleNextBoxSpawn() {
    if (!this.isMinigameActive || !this.boxSpawningActive) return;

    // Calculate random interval within range, adjusted by speed multiplier
    const minInterval = this.minSpawnInterval / this.speedMultiplier;
    const maxInterval = this.maxSpawnInterval / this.speedMultiplier;
    const randomInterval =
      minInterval + Math.random() * (maxInterval - minInterval);

    if (this.debugMode) {
      console.log(`Scheduling next box spawn in ${randomInterval}ms`);
    }

    // Schedule next spawn
    this.nextSpawnTimeout = setTimeout(() => {
      this.spawnBox();
      // Schedule the next spawn after this one
      this.scheduleNextBoxSpawn();
    }, randomInterval);
  }

  startSpawningBoxes() {
    if (this.boxSpawningActive) return;

    this.boxSpawningActive = true;

    // Start spawning boxes with randomized timing
    this.scheduleNextBoxSpawn();

    if (this.debugMode) {
      console.log("Box spawning started with randomized intervals");
    }
  }

  spawnBox() {
    // Get polonez position to determine spawn location within steering range
    const polonezPosition = this.polonezController.polonezModel.position.x;
    const maxSteeringRange = this.polonezController.maxDisplacement;

    // Generate random position within polonez steering range
    // But avoid the middle zone (safeZone) where the player usually is
    let xPosition;
    const safeZoneWidth = this.safeZone.max - this.safeZone.min;

    if (Math.random() < 0.5) {
      // Left side - between the left edge of steering range and the left safe zone boundary
      xPosition =
        polonezPosition -
        maxSteeringRange +
        Math.random() * (maxSteeringRange - Math.abs(this.safeZone.min));
    } else {
      // Right side - between the right safe zone boundary and the right edge of steering range
      xPosition =
        polonezPosition +
        this.safeZone.max +
        Math.random() * (maxSteeringRange - this.safeZone.max);
    }

    // Create a box geometry
    const boxGeometry = new THREE.BoxGeometry(4.5, 4, 8);
    const boxMaterial = new THREE.MeshPhongMaterial({ color: 0xffff00 });
    const box = new THREE.Mesh(boxGeometry, boxMaterial);

    box.position.set(xPosition, 0, -80);

    // Add collision box for detection - use the actual box dimensions
    const boxSize = new THREE.Vector3(4.5, 4, 8);
    box.userData.collisionBox = new THREE.Box3().setFromCenterAndSize(
      box.position,
      boxSize
    );
    box.userData.isBox = true;
    box.userData.scored = false;

    this.scene.add(box);

    // Add to boxes array
    this.boxes.push(box);

    // Animate the box with current speed multiplier
    this.animateBox(box, () => {
      // Remove box from scene and array when animation is complete
      this.scene.remove(box);
      const index = this.boxes.findIndex((b) => b === box);
      if (index !== -1) {
        this.boxes.splice(index, 1);
      }
    });
  }

  animateBox(box, onComplete) {
    const startTime = Date.now();
    // Apply speed multiplier to make boxes move faster
    const duration = 6000 / this.speedMultiplier;

    const update = () => {
      if (!this.isMinigameActive) {
        // If minigame ended, remove the box
        this.scene.remove(box);
        const index = this.boxes.indexOf(box);
        if (index !== -1) {
          this.boxes.splice(index, 1);
        }
        return;
      }

      const elapsedTime = Date.now() - startTime;
      const progress = Math.min(elapsedTime / duration, 1);

      // Move from -100 to +100 along z-axis
      box.position.z = -100 + progress * 200;

      // Update collision box position to match the actual box geometry
      if (box.userData.collisionBox) {
        // Get the actual box size from the geometry to create accurate collision box
        const boxSize = new THREE.Vector3(4.5, 4, 8);
        box.userData.collisionBox.setFromCenterAndSize(box.position, boxSize);
      }

      // Check for collision with polonez
      if (this.checkCollision(box)) {
        // Game over if collision detected
        this.endMinigame(true);
        return;
      }

      // Check if the box has passed the polonez model
      if (
        !box.userData.scored &&
        box.position.z > this.polonezController.polonezModel.position.z
      ) {
        this.score++;
        this.updateScore();
        box.userData.scored = true;

        // Check if we need to update game speed (every 20 points)
        if (this.score % 20 === 0) {
          this.updateGameSpeed();
        }
      }

      if (progress < 1) {
        requestAnimationFrame(update);
      } else {
        if (onComplete) onComplete();
      }
    };

    update();
  }

  checkCollision(box) {
    if (!this.polonezController || !this.polonezController.polonezModel) {
      return false;
    }

    // Create a bounding box for the polonez
    const polonezModel = this.polonezController.polonezModel;
    const polonezBox = new THREE.Box3().setFromObject(polonezModel);

    // Check intersection with box
    return polonezBox.intersectsBox(box.userData.collisionBox);
  }

  endMinigame(collision) {
    if (!this.isMinigameActive) return;

    this.isMinigameActive = false;
    this.boxSpawningActive = false;

    // Stop spawning boxes
    if (this.boxSpawningInterval) {
      clearInterval(this.boxSpawningInterval);
      this.boxSpawningInterval = null;
    }

    // Clear any pending spawn timeout
    if (this.nextSpawnTimeout) {
      clearTimeout(this.nextSpawnTimeout);
      this.nextSpawnTimeout = null;
    }

    // Remove all boxes
    this.boxes.forEach((box) => {
      this.scene.remove(box);
    });
    this.boxes = [];

    // Reset speed multiplier
    this.speedMultiplier = 1.0;
    if (this.environment) {
      this.environment.setSpeed(1.0);
    }
    if (this.materialManager) {
      this.materialManager.setTextureSpeed(1.0);
    }
    if (this._palmManager) {
      this._palmManager.setSpeed(1.0);
    }
    if (this._rockManager) {
      this._rockManager.setSpeed(1.0);
    }

    // Reset camera position to default
    if (this.sceneManager && this.sceneManager.camera) {
      const startPos = {
        x: this.sceneManager.camera.position.x,
        y: this.sceneManager.camera.position.y,
        z: this.sceneManager.camera.position.z,
      };

      // Animate camera back to default position
      this.animateCameraPosition(startPos, this.defaultCameraPosition, 1000);

      // Re-enable orbit controls after animation completes
      setTimeout(() => {
        if (this.sceneManager && this.sceneManager.controls) {
          this.sceneManager.controls.enabled = true;
        }
      }, 1000);
    }

    // Show GUI again
    if (this.gui) {
      this.gui.domElement.style.display = "block";
    }

    // Hide escape info
    this.escapeInfoElement.style.display = "none";

    if (collision) {
      // Show game over screen with final score
      this.scoreElement.style.display = "none";
      this.gameOverElement.style.display = "block";
      this.gameOverElement.querySelector(
        "span"
      ).textContent = `SCORE: ${this.score}`;

      // Show game over for a few seconds before hiding
      setTimeout(() => {
        this.overlay.style.display = "none";
        this.gameOverElement.style.display = "none";
        this.instructionsElement.style.display = "block";
      }, 3000);
    } else {
      // Normal end, just hide overlay
      this.overlay.style.display = "none";
      this.countdownElement.style.display = "block"; // Reset countdown visibility for next game
      this.scoreElement.style.display = "none";
      this.instructionsElement.style.display = "block";
    }
  }

  // Set references to update speed
  setEnvironment(environment) {
    this.environment = environment;
  }

  setMaterialManager(materialManager) {
    this.materialManager = materialManager;
  }

  // Set palm manager reference
  setPalmManager(manager) {
    this._palmManager = manager;
  }

  // Set rock manager reference
  setRockManager(manager) {
    this._rockManager = manager;
  }

  update(deltaTime) {
    // Toggle instructions visibility
    if (this.showMinigameInstructions && !this.isMinigameActive) {
      this.instructionsElement.style.display = "block";
    }
  }

  cleanup() {
    // Clear all intervals and timeouts
    if (this.boxSpawningInterval) {
      clearInterval(this.boxSpawningInterval);
    }

    if (this.nextSpawnTimeout) {
      clearTimeout(this.nextSpawnTimeout);
    }

    // Remove event listeners
    if (this.polonezController) {
      this.polonezController.removeEnterKeyListener(this.onEnterKeyPress);
    }
    document.removeEventListener("keydown", this.onEscKeyPress);

    // Remove UI elements
    if (this.overlay && this.overlay.parentNode) {
      this.overlay.parentNode.removeChild(this.overlay);
    }

    if (this.instructionsElement && this.instructionsElement.parentNode) {
      this.instructionsElement.parentNode.removeChild(this.instructionsElement);
    }

    if (this.escapeInfoElement && this.escapeInfoElement.parentNode) {
      this.escapeInfoElement.parentNode.removeChild(this.escapeInfoElement);
    }
  }
}

export default MinigameManager;
