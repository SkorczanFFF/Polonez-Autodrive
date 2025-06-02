class PolonezController {
  constructor(modelLoader, environment) {
    this.modelLoader = modelLoader;
    this.environment = environment;
    this.isSteeringEnabled = false;
    this.initialPosition = null;
    this.initialRotation = null;
    this.steeringSpeed = 0.045;
    this.movementSpeed = 0.08;
    this.maxMovementSpeed = 0.4;
    this.acceleration = 0.02;
    this.currentSpeed = 0;
    this.maxSteeringAngle = 0.1;
    this.maxDisplacement = 6.0;
    this.polonezModel = null;
    this.polonezWireframeModel = null;

    // Current state
    this.currentSteeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.rotationEasing = 0.15;
    this.isLeftPressed = false;
    this.isRightPressed = false;
    this.lastKeyPressTime = 0;

    // Listeners for Enter key for minigame
    this.enterKeyListeners = [];

    // Bind event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    this.isTransitioning = false;
    this.transitionCallback = null;

    this.isSteeringLocked = false;
  }

  initialize() {
    // Get the Polonez models
    this.polonezModel = this.modelLoader.getModel("polonez");
    this.polonezWireframeModel = this.modelLoader.getModel("polonezWireframe");

    if (!this.polonezModel) {
      console.error("Polonez model not found");
      return;
    }

    // Store initial position and rotation
    this.initialPosition = this.polonezModel.position.clone();
    this.initialRotation = this.polonezModel.rotation.clone();

    // Add event listeners for keyboard input
    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  /**
   * Allow other components to register for Enter key press events
   * Used by MinigameManager to start minigame when Enter is pressed
   */
  addEnterKeyListener(listener) {
    this.enterKeyListeners.push(listener);
  }

  /**
   * Remove Enter key listener
   */
  removeEnterKeyListener(listener) {
    const index = this.enterKeyListeners.indexOf(listener);
    if (index !== -1) {
      this.enterKeyListeners.splice(index, 1);
    }
  }

  onKeyDown(event) {
    // Enter key - enable steering mode
    if (event.key === "Enter") {
      // Reset the position when Enter is pressed
      this.resetPosition();

      if (!this.isSteeringEnabled) {
        this.isSteeringEnabled = true;
        console.log("Steering mode enabled");
      }

      // Notify all enter key listeners
      this.enterKeyListeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
        }
      });
    }

    // Escape key - disable steering mode and reset position
    if (event.key === "Escape" && this.isSteeringEnabled) {
      this.resetPosition();
      this.isSteeringEnabled = false;
      console.log("Steering mode disabled");
    }

    // Only handle steering if steering mode is enabled
    if (!this.isSteeringEnabled) return;

    // Handle left/right arrow keys for steering by setting flags
    if (event.key === "ArrowLeft") {
      this.isLeftPressed = true;
      this.lastKeyPressTime = Date.now();
    } else if (event.key === "ArrowRight") {
      this.isRightPressed = true;
      this.lastKeyPressTime = Date.now();
    }
  }

  onKeyUp(event) {
    // Clear steering flags when keys are released
    if (event.key === "ArrowLeft") {
      this.isLeftPressed = false;
      // Start slowing down gradually
      this.currentSpeed = this.currentSpeed * 0.45; // Keep some momentum
    } else if (event.key === "ArrowRight") {
      this.isRightPressed = false;
      // Start slowing down gradually
      this.currentSpeed = this.currentSpeed * 0.45; // Keep some momentum
    }
  }

  steerLeft() {
    if (!this.polonezModel || !this.isSteeringEnabled || this.isSteeringLocked)
      return;

    // Calculate how long the key has been pressed
    const keyPressDuration = (Date.now() - this.lastKeyPressTime) / 1000;

    // Increase speed with easing
    const targetSpeed =
      this.movementSpeed + this.acceleration * keyPressDuration * 2;
    this.currentSpeed =
      this.currentSpeed +
      (Math.min(targetSpeed, this.maxMovementSpeed) - this.currentSpeed) * 0.1;

    // Calculate potential new position
    const potentialPositionX = this.polonezModel.position.x - this.currentSpeed;

    // Check if the movement would exceed the maximum displacement
    if (potentialPositionX < this.initialPosition.x - this.maxDisplacement) {
      return;
    }

    // Move the car laterally to the left
    this.polonezModel.position.x = potentialPositionX;

    // Set target steering angle with easing
    this.targetSteeringAngle = this.maxSteeringAngle;
    this.currentSteeringAngle +=
      (this.targetSteeringAngle - this.currentSteeringAngle) *
      this.rotationEasing;

    // Apply rotation with easing
    const targetRotation = this.initialRotation.z + this.currentSteeringAngle;
    this.polonezModel.rotation.z +=
      (targetRotation - this.polonezModel.rotation.z) * this.rotationEasing;

    // If wireframe model exists, apply the same transformations
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.position.x = this.polonezModel.position.x;
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  steerRight() {
    if (!this.polonezModel || !this.isSteeringEnabled || this.isSteeringLocked)
      return;

    // Calculate how long the key has been pressed
    const keyPressDuration = (Date.now() - this.lastKeyPressTime) / 1000;

    // Increase speed with easing
    const targetSpeed =
      this.movementSpeed + this.acceleration * keyPressDuration * 2;
    this.currentSpeed =
      this.currentSpeed +
      (Math.min(targetSpeed, this.maxMovementSpeed) - this.currentSpeed) * 0.1;

    // Calculate potential new position
    const potentialPositionX = this.polonezModel.position.x + this.currentSpeed;

    // Check if the movement would exceed the maximum displacement
    if (potentialPositionX > this.initialPosition.x + this.maxDisplacement) {
      return;
    }

    // Move the car laterally to the right
    this.polonezModel.position.x = potentialPositionX;

    // Set target steering angle with easing
    this.targetSteeringAngle = -this.maxSteeringAngle;
    this.currentSteeringAngle +=
      (this.targetSteeringAngle - this.currentSteeringAngle) *
      this.rotationEasing;

    // Apply rotation with easing
    const targetRotation = this.initialRotation.z + this.currentSteeringAngle;
    this.polonezModel.rotation.z +=
      (targetRotation - this.polonezModel.rotation.z) * this.rotationEasing;

    // If wireframe model exists, apply the same transformations
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.position.x = this.polonezModel.position.x;
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  returnToNeutralSteering() {
    if (!this.polonezModel || !this.isSteeringEnabled || this.isSteeringLocked)
      return;

    // Reset target angle to neutral
    this.targetSteeringAngle = 0;

    // Apply easing to steering angle
    this.currentSteeringAngle +=
      (this.targetSteeringAngle - this.currentSteeringAngle) *
      this.rotationEasing;

    // Apply rotation with easing
    const targetRotation = this.initialRotation.z + this.currentSteeringAngle;
    this.polonezModel.rotation.z +=
      (targetRotation - this.polonezModel.rotation.z) * this.rotationEasing;

    // If wireframe model exists, apply the same rotation
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  resetPositionWithTransition(duration = 1000, callback = null) {
    if (!this.polonezModel || !this.initialPosition) return;

    this.isTransitioning = true;
    this.transitionCallback = callback;

    // Store start positions
    const startPos = {
      x: this.polonezModel.position.x,
      y: this.polonezModel.position.y,
      z: this.polonezModel.position.z,
    };

    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);

      // Use cubic easing for smooth transition
      const eased = this.easeInOutCubic(progress);

      // Update position only
      this.polonezModel.position.x =
        startPos.x + (this.initialPosition.x - startPos.x) * eased;
      this.polonezModel.position.y =
        startPos.y + (this.initialPosition.y - startPos.y) * eased;
      this.polonezModel.position.z =
        startPos.z + (this.initialPosition.z - startPos.z) * eased;

      // Update wireframe model if it exists
      if (this.polonezWireframeModel) {
        this.polonezWireframeModel.position.copy(this.polonezModel.position);
      }

      // Update wheel positions
      if (this.environment) {
        this.environment.updateWheelsPosition(this.polonezModel);
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        this.isTransitioning = false;
        this.currentSpeed = 0;
        this.isLeftPressed = false;
        this.isRightPressed = false;

        if (this.transitionCallback) {
          this.transitionCallback();
          this.transitionCallback = null;
        }
      }
    };

    animate();
  }

  easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  resetPosition() {
    // Replace immediate reset with transition
    this.resetPositionWithTransition(1000);
  }

  update(deltaTime) {
    // Process active steering only if not locked
    if (this.isSteeringEnabled && !this.isSteeringLocked) {
      // Show key hold duration visually
      const elapsedTime =
        this.isLeftPressed || this.isRightPressed
          ? (Date.now() - this.lastKeyPressTime) / 1000
          : 0;

      // Calculate acceleration and deceleration
      if (this.isLeftPressed) {
        this.steerLeft();
      } else if (this.isRightPressed) {
        this.steerRight();
      } else {
        // Gradually slow down when no keys are pressed
        if (this.currentSpeed > 0) {
          this.currentSpeed = Math.max(
            0,
            this.currentSpeed - this.acceleration * 2 * deltaTime * 60
          );
        }

        // Return steering to neutral
        if (Math.abs(this.currentSteeringAngle) > 0.001) {
          this.returnToNeutralSteering();
        }
      }

      // Apply natural momentum when slowing down
      if (
        !this.isLeftPressed &&
        !this.isRightPressed &&
        this.currentSpeed > 0
      ) {
        // Calculate the direction based on steering angle
        const direction = this.currentSteeringAngle > 0 ? -1 : 1;

        // Move the car with decreasing speed
        const potentialPositionX =
          this.polonezModel.position.x + direction * this.currentSpeed;

        // Check displacement limits
        if (
          potentialPositionX > this.initialPosition.x - this.maxDisplacement &&
          potentialPositionX < this.initialPosition.x + this.maxDisplacement
        ) {
          this.polonezModel.position.x = potentialPositionX;

          // Update wireframe model
          if (this.polonezWireframeModel) {
            this.polonezWireframeModel.position.x =
              this.polonezModel.position.x;
          }
        }
      }
    }

    // Keep wheels attached to the car during animation
    if (this.environment && this.polonezModel) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  cleanup() {
    // Remove event listeners
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);

    // Clear references
    this.enterKeyListeners = [];
  }

  // Add method to lock/unlock steering
  setSteeringLock(locked) {
    this.isSteeringLocked = locked;
    if (locked) {
      // Reset steering state when locked
      this.currentSteeringAngle = 0;
      this.targetSteeringAngle = 0;
      this.currentSpeed = 0;
      this.isLeftPressed = false;
      this.isRightPressed = false;
    }
  }
}

export default PolonezController;
