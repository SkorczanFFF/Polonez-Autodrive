class LoadingManager {
  constructor() {
    this.totalItems = 0;
    this.loadedItems = 0;
    this.loaderElement = null;
    this.progressElement = null;
    this.loadingText = null;
    this.statusText = null;
    this.isLoaded = false;
    this.loadingTimeout = null;

    // Flag to force completion after timeout
    this.forceCompleteTimeout = null;

    this.createLoader();
  }

  createLoader() {
    // Create loading overlay
    this.loaderElement = document.createElement("div");
    this.loaderElement.className = "loader-overlay";

    // Terminal-style container
    const terminalContainer = document.createElement("div");
    terminalContainer.className = "terminal-container";

    // Create header
    const header = document.createElement("div");
    header.className = "terminal-header";
    header.textContent = "AUTODRIVE.SYS";

    // Create terminal content area
    const terminalContent = document.createElement("div");
    terminalContent.className = "terminal-content";

    // Create blinking cursor
    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = "█";

    // Create loading text with retro computer style
    this.loadingText = document.createElement("div");
    this.loadingText.className = "terminal-text";
    this.loadingText.textContent = "INITIALIZING POLONEZ AUTODRIVE SYSTEM...";

    // Create status text
    this.statusText = document.createElement("div");
    this.statusText.className = "terminal-text";
    this.statusText.style.marginTop = "10px";

    // Create textual progress indicator
    this.progressElement = document.createElement("div");
    this.progressElement.className = "terminal-progress";
    this.progressElement.textContent = "LOADING: [                    ] 0%";

    // Assemble terminal
    terminalContent.appendChild(this.loadingText);
    terminalContent.appendChild(this.progressElement);
    terminalContent.appendChild(this.statusText);
    terminalContent.appendChild(cursor);

    terminalContainer.appendChild(header);
    terminalContainer.appendChild(terminalContent);
    this.loaderElement.appendChild(terminalContainer);

    // Add loader to document
    document.body.appendChild(this.loaderElement);

    // Simulate typing effect
    this.typeLoadingText();

    // Set a fallback timeout to hide the loader after 8 seconds instead of 20
    // This ensures the loader doesn't get stuck too long
    this.forceCompleteTimeout = setTimeout(() => {
      console.warn("Loading timeout reached, forcing completion");
      this.hideLoader();
    }, 8000);
  }

  typeLoadingText() {
    const messages = [
      "BOOTING SYSTEM...",
      "INITIALIZING GRAPHICS...",
      "LOADING VECTOR DATA...",
      "CHECKING SYSTEM...",
      "LOADING ASSETS...",
    ];

    let messageIndex = 0;
    let charIndex = 0;

    const typeNextChar = () => {
      if (this.isLoaded) return;

      if (messageIndex < messages.length) {
        const currentMessage = messages[messageIndex];

        if (charIndex < currentMessage.length) {
          this.loadingText.textContent = currentMessage.substring(
            0,
            charIndex + 1
          );
          charIndex++;
          // Faster typing - reduce delay
          this.loadingTimeout = setTimeout(
            typeNextChar,
            30 + Math.random() * 30
          );
        } else {
          messageIndex++;
          charIndex = 0;
          // Faster message change
          this.loadingTimeout = setTimeout(typeNextChar, 500);
        }
      } else {
        messageIndex = 0;
        this.loadingTimeout = setTimeout(typeNextChar, 500);
      }
    };

    typeNextChar();
  }

  setItemsToLoad(count) {
    // Limit max items to 10 to ensure faster loading
    this.totalItems = Math.min(Math.max(this.totalItems, count), 10);
    this.updateProgress();
  }

  itemLoaded(itemDescription = "") {
    this.loadedItems++;

    if (itemDescription) {
      this.statusText.textContent = `LOADING: ${itemDescription.toUpperCase()}`;
    }

    this.updateProgress();

    // Check if all items are loaded or if we're past 75%
    if (
      this.loadedItems >= this.totalItems ||
      (this.totalItems > 0 && this.loadedItems / this.totalItems > 0.75)
    ) {
      this.completeLoading();
    }
  }

  updateProgress() {
    const percentage =
      this.totalItems > 0
        ? Math.min(Math.floor((this.loadedItems / this.totalItems) * 100), 100)
        : 0;

    // Update text-based progress bar (20 characters wide)
    const progressChars = 20;
    const filledChars = Math.floor((percentage / 100) * progressChars);
    const emptyChars = progressChars - filledChars;

    const progressBar =
      "[" + "=".repeat(filledChars) + " ".repeat(emptyChars) + "]";
    this.progressElement.textContent = `LOADING: ${progressBar} ${percentage}%`;
  }

  completeLoading() {
    this.statusText.textContent = "SYSTEM READY!";
    this.progressElement.textContent = "LOADING: [====================] 100%";

    // Very short delay before hiding
    setTimeout(() => {
      this.hideLoader();
    }, 300);
  }

  hideLoader() {
    if (this.isLoaded) return;

    // Clear all timeouts
    if (this.loadingTimeout) {
      clearTimeout(this.loadingTimeout);
    }

    if (this.forceCompleteTimeout) {
      clearTimeout(this.forceCompleteTimeout);
    }

    this.isLoaded = true;

    // Make background transparent
    this.loaderElement.style.backgroundColor = "transparent";

    // Keep terminal visible but make it fade out
    const terminalContainer = this.loaderElement.querySelector(
      ".terminal-container"
    );
    if (terminalContainer) {
      terminalContainer.style.transition = "opacity 1s ease-out";
      terminalContainer.style.opacity = "0";
    }

    // Remove loader after the fade-out transition without animation
    setTimeout(() => {
      if (this.loaderElement && this.loaderElement.parentNode) {
        this.loaderElement.parentNode.removeChild(this.loaderElement);
      }
    }, 1000);
  }

  showLoader() {
    this.isLoaded = false;
    this.loaderElement.style.backgroundColor = "#004671";

    const terminalContainer = this.loaderElement.querySelector(
      ".terminal-container"
    );
    if (terminalContainer) {
      terminalContainer.style.opacity = "1";
    }
  }
}

export default LoadingManager;
