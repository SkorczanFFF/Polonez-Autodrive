class PolonezController {
  constructor(modelLoader, environment) {
    this.modelLoader = modelLoader;
    this.environment = environment;
    this.isSteeringEnabled = false;
    this.initialPosition = null;
    this.initialRotation = null;
    this.steeringSpeed = 0.05;
    this.movementSpeed = 0.1;
    this.maxMovementSpeed = 0.5; // Increased max speed for more noticeable effect
    this.acceleration = 0.03; // Increased acceleration for more noticeable effect
    this.currentSpeed = 0; // Current movement speed
    this.maxSteeringAngle = 0.1; // Maximum rotation when steering
    this.maxDisplacement = 6.0; // Maximum left/right displacement
    this.polonezModel = null;
    this.polonezWireframeModel = null;

    // Current state
    this.currentSteeringAngle = 0;
    this.isLeftPressed = false;
    this.isRightPressed = false;
    this.lastKeyPressTime = 0;

    // Bind event handlers
    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
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

  onKeyDown(event) {
    // Enter key - enable steering mode
    if (event.key === "Enter" && !this.isSteeringEnabled) {
      this.isSteeringEnabled = true;
      console.log("Steering mode enabled");
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
      this.currentSpeed = this.currentSpeed * 0.75; // Keep some momentum
    } else if (event.key === "ArrowRight") {
      this.isRightPressed = false;
      // Start slowing down gradually
      this.currentSpeed = this.currentSpeed * 0.75; // Keep some momentum
    }
  }

  steerLeft() {
    if (!this.polonezModel || !this.isSteeringEnabled) return;

    // Calculate how long the key has been pressed - make it more noticeable
    const keyPressDuration = (Date.now() - this.lastKeyPressTime) / 1000; // in seconds

    // Increase speed based on how long the key has been pressed - enhanced effect
    this.currentSpeed = Math.min(
      this.movementSpeed + this.acceleration * keyPressDuration * 3,
      this.maxMovementSpeed
    );

    // Calculate potential new position
    const potentialPositionX = this.polonezModel.position.x - this.currentSpeed;

    // Check if the movement would exceed the maximum displacement
    if (potentialPositionX < this.initialPosition.x - this.maxDisplacement) {
      return; // Don't move further if at max displacement
    }

    // Move the car laterally to the left
    this.polonezModel.position.x = potentialPositionX;

    // Rotate the model on the Z axis for tilting effect during turning
    this.currentSteeringAngle = Math.min(
      this.currentSteeringAngle + this.steeringSpeed,
      this.maxSteeringAngle
    );
    this.polonezModel.rotation.z =
      this.initialRotation.z + this.currentSteeringAngle;

    // If wireframe model exists, apply the same transformations
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.position.x = this.polonezModel.position.x;
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }

    // We no longer rotate wheels during steering
  }

  steerRight() {
    if (!this.polonezModel || !this.isSteeringEnabled) return;

    // Calculate how long the key has been pressed - make it more noticeable
    const keyPressDuration = (Date.now() - this.lastKeyPressTime) / 1000; // in seconds

    // Increase speed based on how long the key has been pressed - enhanced effect
    this.currentSpeed = Math.min(
      this.movementSpeed + this.acceleration * keyPressDuration * 3,
      this.maxMovementSpeed
    );

    // Calculate potential new position
    const potentialPositionX = this.polonezModel.position.x + this.currentSpeed;

    // Check if the movement would exceed the maximum displacement
    if (potentialPositionX > this.initialPosition.x + this.maxDisplacement) {
      return; // Don't move further if at max displacement
    }

    // Move the car laterally to the right
    this.polonezModel.position.x = potentialPositionX;

    // Rotate the model on the Z axis for tilting effect during turning
    this.currentSteeringAngle = Math.max(
      this.currentSteeringAngle - this.steeringSpeed,
      -this.maxSteeringAngle
    );
    this.polonezModel.rotation.z =
      this.initialRotation.z + this.currentSteeringAngle;

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
    if (!this.polonezModel || !this.isSteeringEnabled) return;

    // Gradually return to neutral steering angle
    const returnSpeed = this.steeringSpeed * 0.5;

    // Smoothly return to neutral
    if (Math.abs(this.currentSteeringAngle) < returnSpeed) {
      this.currentSteeringAngle = 0;
    } else if (this.currentSteeringAngle > 0) {
      this.currentSteeringAngle -= returnSpeed;
    } else if (this.currentSteeringAngle < 0) {
      this.currentSteeringAngle += returnSpeed;
    }

    // Apply the updated rotation on the Z axis
    this.polonezModel.rotation.z =
      this.initialRotation.z + this.currentSteeringAngle;

    // If wireframe model exists, apply the same rotation
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }

    // Reset wheels to neutral orientation - no rotation during steering
  }

  resetPosition() {
    if (!this.polonezModel || !this.initialPosition || !this.initialRotation)
      return;

    // Reset the model position and rotation
    this.polonezModel.position.copy(this.initialPosition);
    this.polonezModel.rotation.copy(this.initialRotation);
    this.currentSteeringAngle = 0;
    this.currentSpeed = 0;
    this.isLeftPressed = false;
    this.isRightPressed = false;

    // Reset wireframe model if it exists
    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.position.copy(this.initialPosition);
      this.polonezWireframeModel.rotation.copy(this.initialRotation);
    }

    // Update wheel positions to stay with the car
    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }

    // Reset wheels to their initial orientation - no rotation
  }

  update(deltaTime) {
    // Process active steering
    if (this.isSteeringEnabled) {
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
  }
}

export default PolonezController;
