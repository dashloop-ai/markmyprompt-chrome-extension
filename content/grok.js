// X Grok conversation content script for Promptean Sync
console.log("🤖 Promptean: X Grok conversation content script loaded");

(async function () {
  "use strict";
  console.log("🤖 MMP: Starting Grok conversation initialization...");

  // Check if PrompteanUtils is available
  if (typeof PrompteanUtils === "undefined") {
    console.error(
      "❌ MMP: PrompteanUtils class not found! utils.js may not have loaded."
    );
    return;
  }
  console.log("✅ MMP: PrompteanUtils class found");

  // Initialize utils
  const utils = new PrompteanUtils("grok");
  console.log("✅ MMP: Utils initialized");

  // Check if extension is active
  const isActive = await utils.isExtensionActive();
  if (!isActive) {
    console.log(
      "mark my prompt Sync: Extension not activated. Please configure API key in settings."
    );
    return;
  }

  console.log("mark my prompt Sync: Active on X Grok conversations");

  // Debug mode - set to true to see detailed logs
  const DEBUG = true;

  // Track processed elements
  const processedElements = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log("[MMP Grok]", ...args);
    }
  }

  // Add sync buttons to user prompts only
  function addSyncButtons() {
    debugLog("Scanning for user prompts...");

    // Look for divs with dir="ltr" that have the conversation text color
    const textContainers = document.querySelectorAll(
      'div[dir="ltr"][style*="color: rgb(15, 20, 25)"]'
    );

    debugLog(`Found ${textContainers.length} text containers`);

    const userPrompts = Array.from(textContainers).filter((container) => {
      // Look for the display block child that contains spans
      const blockDiv = container.querySelector('div[style*="display: block"]');
      if (!blockDiv) return false;

      // Check if it contains meaningful text in spans
      const spans = blockDiv.querySelectorAll("span");
      if (spans.length === 0) return false;

      // Get the combined text from all spans
      let combinedText = "";
      spans.forEach((span) => {
        const text = span.innerText || span.textContent || "";
        if (text.trim()) combinedText += text.trim() + " ";
      });

      // Must have meaningful text
      if (!combinedText || combinedText.trim().length < 20) {
        return false;
      }

      // Use content-based heuristics to identify user prompts vs AI responses
      const text = combinedText.trim();

      // Heuristic 1: User prompts are typically shorter (questions/requests)
      const isReasonableLength = text.length < 500; // User prompts are usually shorter

      // Heuristic 2: Look for question patterns
      const hasQuestionWords =
        /\b(what|how|why|when|where|who|can|could|would|should|is|are|do|does|will|explain|tell|describe|analyze|create|make|build|show|give|provide)\b/i.test(
          text
        );
      const hasQuestionMark = text.includes("?");
      const looksLikeQuestion = hasQuestionWords || hasQuestionMark;

      // Heuristic 3: Check for typical AI response patterns
      const hasAIResponsePatterns =
        /\b(certification|course|skills|advanced|expert|security|exploitation|windows|development|techniques|knowledge|experience|understanding|comprehensive|detailed|extensive|professional)\b/i.test(
          text
        );
      const hasLongExplanation =
        text.length > 200 && text.includes(".") && text.split(".").length > 3;

      // Heuristic 4: Look for duplicate text patterns (which might indicate repeated content)
      const words = text.split(" ");
      const uniqueWords = new Set(words);
      const hasRepeatedContent =
        words.length > 20 && uniqueWords.size / words.length < 0.7;

      // Decision logic: It's likely a user prompt if:
      // - It's reasonably short AND looks like a question
      // - OR it's short and doesn't have typical AI response patterns
      const isUserPrompt =
        (isReasonableLength && looksLikeQuestion) ||
        (text.length < 150 && !hasLongExplanation && !hasRepeatedContent);

      if (isUserPrompt) {
        debugLog(`Found USER PROMPT: "${text.substring(0, 100)}..."`);
        return true;
      } else {
        debugLog(`Skipping AI response: "${text.substring(0, 100)}..."`);
        return false;
      }
    });

    debugLog(`Found ${userPrompts.length} user prompts`);

    if (userPrompts.length === 0) {
      debugLog("No user prompts found on page");
      return;
    }

    let buttonCount = 0;

    userPrompts.forEach((textContainer, index) => {
      // Skip if already processed
      if (processedElements.has(textContainer)) {
        return;
      }

      // Get the text content from spans within the display block div
      const blockDiv = textContainer.querySelector(
        'div[style*="display: block"]'
      );
      const spans = blockDiv.querySelectorAll("span");

      let combinedText = "";
      spans.forEach((span) => {
        const text = span.innerText || span.textContent || "";
        if (text.trim()) combinedText += text.trim() + " ";
      });

      debugLog(
        `Processing USER PROMPT ${index + 1}/${
          userPrompts.length
        }: "${combinedText.substring(0, 100)}..."`
      );

      // Find a suitable container for the button - go up a few levels to find a good positioning container
      let container = textContainer;
      let parent = textContainer.parentElement;
      let depth = 0;

      // Go up the DOM tree to find a container that's suitable for absolute positioning
      while (parent && depth < 5) {
        const computedStyle = window.getComputedStyle(parent);
        if (parent.offsetWidth > 200 && parent.offsetHeight > 50) {
          container = parent;
          break;
        }
        parent = parent.parentElement;
        depth++;
      }

      // Add container class and positioning
      if (!container.classList.contains("promptean-container")) {
        container.classList.add("promptean-container");
        container.style.position = "relative";
      }

      // Create and add sync button
      const syncButton = createGrokSyncButton();
      syncButton.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        utils.syncPrompt(combinedText.trim(), syncButton);
      });

      // Position the button in the top-right corner
      syncButton.style.position = "absolute";
      syncButton.style.top = "8px";
      syncButton.style.right = "8px";
      syncButton.style.zIndex = "1000";

      container.appendChild(syncButton);
      processedElements.add(textContainer);
      buttonCount++;

      debugLog(
        `Added sync button ${buttonCount} to USER PROMPT:`,
        combinedText.substring(0, 50) + "..."
      );
    });

    debugLog(`Scan complete. Added ${buttonCount} sync buttons`);
  }

  // Create Grok-specific sync button
  function createGrokSyncButton() {
    const button = document.createElement("div");
    button.className = "promptean-sync-btn promptean-grok-btn";
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      box-shadow: 0 2px 8px rgba(102, 126, 234, 0.3);
      opacity: 0.8;
    `;

    button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
      ">
        <svg viewBox="0 0 24 24" style="width: 16px; height: 16px; fill: white;">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
    `;

    button.title = "Sync to mark my prompt";

    // Hover effects
    button.addEventListener("mouseenter", () => {
      button.style.opacity = "1";
      button.style.transform = "scale(1.05)";
      button.style.boxShadow = "0 4px 12px rgba(102, 126, 234, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      if (
        !button.classList.contains("syncing") &&
        !button.classList.contains("synced")
      ) {
        button.style.opacity = "0.8";
        button.style.transform = "scale(1)";
        button.style.boxShadow = "0 2px 8px rgba(102, 126, 234, 0.3)";
      }
    });

    return button;
  }

  // Observe DOM changes for dynamically loaded content
  const observer = new MutationObserver((mutations) => {
    // Debounce the addSyncButtons call
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      addSyncButtons();
    }, 1000);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan after page loads
  setTimeout(addSyncButtons, 3000);

  // Re-scan periodically to catch any missed content
  setInterval(addSyncButtons, 8000);

  debugLog("Grok conversation content script initialization complete");
})();
