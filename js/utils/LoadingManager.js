class LoadingManager {
  constructor() {
    this.totalItems = 0;
    this.loadedItems = 0;
    this.statusText = null;
    this.loadingScreen = null;
    this.loadingBar = null;
    this.loadingBarFill = null;
    this.loadingText = null;
    this.timeoutDuration = 10000; // 10 seconds timeout

    this.createLoader();
  }

  createLoader() {
    // Create loading screen container
    this.loadingScreen = document.createElement("div");
    this.loadingScreen.style.position = "fixed";
    this.loadingScreen.style.top = "0";
    this.loadingScreen.style.left = "0";
    this.loadingScreen.style.width = "100%";
    this.loadingScreen.style.height = "100%";
    this.loadingScreen.style.backgroundColor = "rgba(0, 0, 0, 0.8)";
    this.loadingScreen.style.display = "flex";
    this.loadingScreen.style.flexDirection = "column";
    this.loadingScreen.style.justifyContent = "center";
    this.loadingScreen.style.alignItems = "center";
    this.loadingScreen.style.zIndex = "1000";

    // Create loading bar container
    this.loadingBar = document.createElement("div");
    this.loadingBar.style.width = "50%";
    this.loadingBar.style.height = "20px";
    this.loadingBar.style.backgroundColor = "#333";
    this.loadingBar.style.borderRadius = "10px";
    this.loadingBar.style.overflow = "hidden";

    // Create loading bar fill
    this.loadingBarFill = document.createElement("div");
    this.loadingBarFill.style.width = "0%";
    this.loadingBarFill.style.height = "100%";
    this.loadingBarFill.style.backgroundColor = "#eb94c1";
    this.loadingBarFill.style.transition = "width 0.3s ease-out";

    // Create loading text
    this.loadingText = document.createElement("div");
    this.loadingText.style.color = "#fff";
    this.loadingText.style.marginTop = "20px";
    this.loadingText.style.fontFamily = "monospace";
    this.loadingText.textContent = "LOADING...";

    // Create status text
    this.statusText = document.createElement("div");
    this.statusText.style.color = "#eb94c1";
    this.statusText.style.marginTop = "10px";
    this.statusText.style.fontFamily = "monospace";
    this.statusText.style.fontSize = "12px";

    // Assemble loading screen
    this.loadingBar.appendChild(this.loadingBarFill);
    this.loadingScreen.appendChild(this.loadingBar);
    this.loadingScreen.appendChild(this.loadingText);
    this.loadingScreen.appendChild(this.statusText);
    document.body.appendChild(this.loadingScreen);

    // Set up timeout with progress check
    setTimeout(() => {
      if (this.loadedItems < this.totalItems) {
        console.warn(
          `Loading timeout reached with ${this.loadedItems}/${this.totalItems} items loaded`
        );
        this.completeLoading();
      }
    }, this.timeoutDuration);
  }

  setItemsToLoad(count) {
    this.totalItems = count;
    this.updateProgress();
  }

  itemLoaded(itemName) {
    this.loadedItems++;
    if (this.statusText) {
      this.statusText.textContent = `LOADED: ${itemName}`;
    }
    this.updateProgress();

    // Check if loading is complete
    if (this.loadedItems >= this.totalItems) {
      this.completeLoading();
    }
  }

  updateProgress() {
    if (this.totalItems > 0) {
      const progress = (this.loadedItems / this.totalItems) * 100;
      if (this.loadingBarFill) {
        this.loadingBarFill.style.width = `${progress}%`;
      }
      if (this.loadingText) {
        this.loadingText.textContent = `LOADING... ${Math.round(progress)}%`;
      }
    }
  }

  completeLoading() {
    // Add fade out animation
    if (this.loadingScreen) {
      this.loadingScreen.style.transition = "opacity 0.5s ease-out";
      this.loadingScreen.style.opacity = "0";

      // Remove loading screen after fade
      setTimeout(() => {
        if (this.loadingScreen && this.loadingScreen.parentNode) {
          this.loadingScreen.parentNode.removeChild(this.loadingScreen);
        }
      }, 500);
    }
  }
}

export default LoadingManager;
