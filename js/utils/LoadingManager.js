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
    this.forceCompleteTimeout = null;

    this.createLoader();
  }

  createLoader() {
    this.loaderElement = document.createElement("div");
    this.loaderElement.className = "loader-overlay";

    const terminalContainer = document.createElement("div");
    terminalContainer.className = "terminal-container";

    const header = document.createElement("div");
    header.className = "terminal-header";
    header.textContent = "AUTODRIVE.SYS";

    const terminalContent = document.createElement("div");
    terminalContent.className = "terminal-content";

    const cursor = document.createElement("span");
    cursor.className = "cursor";
    cursor.textContent = "█";

    this.loadingText = document.createElement("div");
    this.loadingText.className = "terminal-text";
    this.loadingText.textContent = "INITIALIZING POLONEZ AUTODRIVE SYSTEM...";

    this.statusText = document.createElement("div");
    this.statusText.className = "terminal-text";
    this.statusText.style.marginTop = "10px";

    this.progressElement = document.createElement("div");
    this.progressElement.className = "terminal-progress";
    this.progressElement.textContent = "LOADING: [                    ] 0%";

    terminalContent.appendChild(this.loadingText);
    terminalContent.appendChild(this.progressElement);
    terminalContent.appendChild(this.statusText);
    terminalContent.appendChild(cursor);

    terminalContainer.appendChild(header);
    terminalContainer.appendChild(terminalContent);
    this.loaderElement.appendChild(terminalContainer);

    document.body.appendChild(this.loaderElement);

    this.typeLoadingText();

    this.forceCompleteTimeout = setTimeout(() => {
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
          this.loadingText.textContent = currentMessage.substring(0, charIndex + 1);
          charIndex++;
          this.loadingTimeout = setTimeout(typeNextChar, 30 + Math.random() * 30);
        } else {
          messageIndex++;
          charIndex = 0;
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
    this.totalItems = Math.min(Math.max(this.totalItems, count), 10);
    this.updateProgress();
  }

  itemLoaded(itemDescription = "") {
    this.loadedItems++;

    if (itemDescription) {
      this.statusText.textContent = `LOADING: ${itemDescription.toUpperCase()}`;
    }

    this.updateProgress();

    if (this.loadedItems >= this.totalItems ||
        (this.totalItems > 0 && this.loadedItems / this.totalItems > 0.75)) {
      this.completeLoading();
    }
  }

  updateProgress() {
    const percentage = this.totalItems > 0
      ? Math.min(Math.floor((this.loadedItems / this.totalItems) * 100), 100)
      : 0;

    const progressChars = 20;
    const filledChars = Math.floor((percentage / 100) * progressChars);
    const emptyChars = progressChars - filledChars;

    this.progressElement.textContent = `LOADING: [${"=".repeat(filledChars)}${" ".repeat(emptyChars)}] ${percentage}%`;
  }

  completeLoading() {
    this.statusText.textContent = "SYSTEM READY!";
    this.progressElement.textContent = "LOADING: [====================] 100%";

    setTimeout(() => this.hideLoader(), 300);
  }

  hideLoader() {
    if (this.isLoaded) return;

    if (this.loadingTimeout) clearTimeout(this.loadingTimeout);
    if (this.forceCompleteTimeout) clearTimeout(this.forceCompleteTimeout);

    this.isLoaded = true;
    this.loaderElement.style.backgroundColor = "transparent";

    const terminalContainer = this.loaderElement.querySelector(".terminal-container");
    if (terminalContainer) {
      terminalContainer.style.transition = "opacity 1s ease-out";
      terminalContainer.style.opacity = "0";
    }

    setTimeout(() => {
      if (this.loaderElement?.parentNode) {
        this.loaderElement.parentNode.removeChild(this.loaderElement);
      }
    }, 1000);
  }
}

export default LoadingManager;
