import { easeInOutCubic } from "../utils/easing.js";

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
    this.disableKeyboardInputs = false;

    this.currentSteeringAngle = 0;
    this.targetSteeringAngle = 0;
    this.rotationEasing = 0.15;
    this.isLeftPressed = false;
    this.isRightPressed = false;
    this.lastKeyPressTime = 0;

    this.enterKeyListeners = [];

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);

    this.isTransitioning = false;
    this.transitionCallback = null;

    this.isSteeringLocked = false;
  }

  initialize() {
    this.polonezModel = this.modelLoader.getModel("polonez");
    this.polonezWireframeModel = this.modelLoader.getModel("polonezWireframe");

    if (!this.polonezModel) {
      console.error("Polonez model not found");
      return;
    }

    this.initialPosition = this.polonezModel.position.clone();
    this.initialRotation = this.polonezModel.rotation.clone();

    document.addEventListener("keydown", this.onKeyDown);
    document.addEventListener("keyup", this.onKeyUp);
  }

  addEnterKeyListener(listener) {
    this.enterKeyListeners.push(listener);
  }

  removeEnterKeyListener(listener) {
    const index = this.enterKeyListeners.indexOf(listener);
    if (index !== -1) {
      this.enterKeyListeners.splice(index, 1);
    }
  }

  onKeyDown(event) {
    if (this.disableKeyboardInputs) return;

    if (event.key === "Enter") {
      this.resetPosition();

      if (!this.isSteeringEnabled) {
        this.isSteeringEnabled = true;
      }

      this.enterKeyListeners.forEach((listener) => {
        if (typeof listener === "function") {
          listener(event);
        }
      });
    }

    if (event.key === "Escape" && this.isSteeringEnabled) {
      this.resetPosition();
      this.isSteeringEnabled = false;
    }

    if (!this.isSteeringEnabled) return;

    if (event.key === "ArrowLeft") {
      this.isLeftPressed = true;
      this.lastKeyPressTime = Date.now();
    } else if (event.key === "ArrowRight") {
      this.isRightPressed = true;
      this.lastKeyPressTime = Date.now();
    }
  }

  onKeyUp(event) {
    if (this.disableKeyboardInputs) return;

    if (event.key === "ArrowLeft") {
      this.isLeftPressed = false;
      this.currentSpeed *= 0.45;
    } else if (event.key === "ArrowRight") {
      this.isRightPressed = false;
      this.currentSpeed *= 0.45;
    }
  }

  steerLeft() {
    this.steer(-1);
  }

  steerRight() {
    this.steer(1);
  }

  /** @param {number} direction -1 for left, 1 for right */
  steer(direction) {
    if (!this.polonezModel || !this.isSteeringEnabled || this.isSteeringLocked)
      return;

    const keyPressDuration = (Date.now() - this.lastKeyPressTime) / 1000;

    const targetSpeed =
      this.movementSpeed + this.acceleration * keyPressDuration * 2;
    this.currentSpeed +=
      (Math.min(targetSpeed, this.maxMovementSpeed) - this.currentSpeed) * 0.1;

    const potentialPositionX =
      this.polonezModel.position.x + direction * this.currentSpeed;

    const limit = this.initialPosition.x + direction * this.maxDisplacement;
    const wouldExceed =
      direction > 0 ? potentialPositionX > limit : potentialPositionX < limit;

    if (wouldExceed) return;

    this.polonezModel.position.x = potentialPositionX;

    // Negative direction = positive angle for visual tilt
    this.targetSteeringAngle = -direction * this.maxSteeringAngle;
    this.currentSteeringAngle +=
      (this.targetSteeringAngle - this.currentSteeringAngle) *
      this.rotationEasing;

    const targetRotation = this.initialRotation.z + this.currentSteeringAngle;
    this.polonezModel.rotation.z +=
      (targetRotation - this.polonezModel.rotation.z) * this.rotationEasing;

    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.position.x = this.polonezModel.position.x;
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  returnToNeutralSteering() {
    if (!this.polonezModel || !this.isSteeringEnabled || this.isSteeringLocked)
      return;

    this.targetSteeringAngle = 0;
    this.currentSteeringAngle +=
      (this.targetSteeringAngle - this.currentSteeringAngle) *
      this.rotationEasing;

    const targetRotation = this.initialRotation.z + this.currentSteeringAngle;
    this.polonezModel.rotation.z +=
      (targetRotation - this.polonezModel.rotation.z) * this.rotationEasing;

    if (this.polonezWireframeModel) {
      this.polonezWireframeModel.rotation.z = this.polonezModel.rotation.z;
    }

    if (this.environment) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  resetPositionWithTransition(duration = 1000, callback = null) {
    if (!this.polonezModel || !this.initialPosition) return;

    this.isTransitioning = true;
    this.transitionCallback = callback;

    const startPos = {
      x: this.polonezModel.position.x,
      y: this.polonezModel.position.y,
      z: this.polonezModel.position.z,
    };
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeInOutCubic(progress);

      this.polonezModel.position.x =
        startPos.x + (this.initialPosition.x - startPos.x) * eased;
      this.polonezModel.position.y =
        startPos.y + (this.initialPosition.y - startPos.y) * eased;
      this.polonezModel.position.z =
        startPos.z + (this.initialPosition.z - startPos.z) * eased;

      if (this.polonezWireframeModel) {
        this.polonezWireframeModel.position.copy(this.polonezModel.position);
      }

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

  resetPosition() {
    this.resetPositionWithTransition(1000);
  }

  update(deltaTime) {
    if (this.isSteeringEnabled && !this.isSteeringLocked) {
      if (this.isLeftPressed) {
        this.steerLeft();
      } else if (this.isRightPressed) {
        this.steerRight();
      } else {
        if (this.currentSpeed > 0) {
          this.currentSpeed = Math.max(
            0,
            this.currentSpeed - this.acceleration * 2 * deltaTime * 60
          );
        }

        if (Math.abs(this.currentSteeringAngle) > 0.001) {
          this.returnToNeutralSteering();
        }
      }

      // Apply momentum when slowing down
      if (!this.isLeftPressed && !this.isRightPressed && this.currentSpeed > 0) {
        const direction = this.currentSteeringAngle > 0 ? -1 : 1;
        const potentialPositionX =
          this.polonezModel.position.x + direction * this.currentSpeed;

        if (
          potentialPositionX > this.initialPosition.x - this.maxDisplacement &&
          potentialPositionX < this.initialPosition.x + this.maxDisplacement
        ) {
          this.polonezModel.position.x = potentialPositionX;

          if (this.polonezWireframeModel) {
            this.polonezWireframeModel.position.x = this.polonezModel.position.x;
          }
        }
      }
    }

    if (this.environment && this.polonezModel) {
      this.environment.updateWheelsPosition(this.polonezModel);
    }
  }

  cleanup() {
    document.removeEventListener("keydown", this.onKeyDown);
    document.removeEventListener("keyup", this.onKeyUp);
    this.enterKeyListeners = [];
  }

  setSteeringLock(locked) {
    this.isSteeringLocked = locked;
    if (locked) {
      this.currentSteeringAngle = 0;
      this.targetSteeringAngle = 0;
      this.currentSpeed = 0;
      this.isLeftPressed = false;
      this.isRightPressed = false;
    }
  }
}

export default PolonezController;
