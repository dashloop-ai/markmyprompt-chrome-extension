// ChatGPT content script for Promptean Sync
console.log("🔵 MMP: ChatGPT content script loaded");

(async function () {
  "use strict";
  console.log("🔵 MMP: Starting initialization...");

  // Check if PrompteanUtils is available
  if (typeof PrompteanUtils === "undefined") {
    console.error("❌ MMP: MMP class not found! utils.js may not have loaded.");
    return;
  }
  console.log("✅ MMP: PrompteanUtils class found");

  // Initialize utils
  const utils = new PrompteanUtils("chatgpt");
  console.log("✅ MMP: Utils initialized");

  // Check if extension is active
  const isActive = await utils.isExtensionActive();
  if (!isActive) {
    console.log(
      "mark my prompt Sync: Extension not activated. Please configure API key in settings."
    );
    return;
  }

  console.log("mark my prompt Sync: Active on ChatGPT");

  // Debug mode - set to true to see detailed logs
  const DEBUG = true;

  // Track processed elements
  const processedElements = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log("[MMP ChatGPT]", ...args);
    }
  }

  // Add sync buttons to existing user prompts
  function addSyncButtons() {
    debugLog("Scanning for user messages...");

    // Try multiple selector strategies for ChatGPT's frequently changing DOM
    const selectors = [
      '[data-message-author-role="user"]',
      '[data-testid*="conversation-turn"][data-testid*="user"]',
      '.group.w-full[class*="user"]',
      'div[class*="agent-turn"]:has(div[class*="user"])',
    ];

    let userMessages = [];
    let usedSelector = "";

    // Try each selector until we find messages
    for (const selector of selectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          userMessages = Array.from(elements);
          usedSelector = selector;
          debugLog(
            `Found ${elements.length} messages using selector: ${selector}`
          );
          break;
        }
      } catch (e) {
        debugLog(`Selector failed: ${selector}`, e);
        continue;
      }
    }

    // Fallback: Look for alternating message pattern
    if (userMessages.length === 0) {
      debugLog("Using fallback message detection...");
      const allGroups = document.querySelectorAll(
        '.group.w-full, [class*="turn"], [class*="message"]'
      );
      debugLog(`Found ${allGroups.length} potential message containers`);

      userMessages = Array.from(allGroups).filter((el, index) => {
        // User messages are typically at even indices (0, 2, 4...) in alternating pattern
        // Or check for background color differences
        const hasUserBg =
          window.getComputedStyle(el).backgroundColor !== "rgba(0, 0, 0, 0)";
        return index % 2 === 0 || hasUserBg;
      });

      debugLog(`Fallback found ${userMessages.length} user messages`);
    }

    if (userMessages.length === 0) {
      debugLog("No user messages found on page");
      return;
    }

    userMessages.forEach((messageElement) => {
      // Skip if already processed
      if (processedElements.has(messageElement)) {
        return;
      }

      // Find the content container - try multiple selectors
      let contentContainer = messageElement.querySelector(
        ".whitespace-pre-wrap"
      );
      if (!contentContainer) {
        contentContainer = messageElement.querySelector('[class*="markdown"]');
      }
      if (!contentContainer) {
        contentContainer = messageElement.querySelector(".text-base");
      }
      if (!contentContainer) {
        // Fallback: use the message element itself
        contentContainer = messageElement;
      }

      // Get the text content
      const promptText =
        contentContainer.innerText?.trim() ||
        contentContainer.textContent?.trim();
      if (!promptText || promptText.length < 5) {
        debugLog("Skipping message: text too short or empty");
        return;
      }

      debugLog(`Processing message: "${promptText.substring(0, 50)}..."`);

      // Make sure we have a valid container
      let container = messageElement;

      // Try to find a better parent container
      const potentialParent = messageElement.closest(
        '.group, [class*="turn"], [class*="message-wrap"]'
      );
      if (potentialParent) {
        container = potentialParent;
      }

      // Add container class and positioning
      if (!container.classList.contains("promptean-container")) {
        container.classList.add("promptean-container");
        container.style.position = "relative";
      }

      // Create and add sync button
      const syncButton = utils.createSyncButton();
      syncButton.addEventListener("click", (e) => {
        e.stopPropagation();
        utils.syncPrompt(promptText, syncButton);
      });

      container.appendChild(syncButton);
      processedElements.add(messageElement);
      debugLog("✓ Sync button added successfully");
    });

    debugLog(
      `Scan complete. Processed ${processedElements.size} total messages`
    );
  }

  // Observe DOM changes for dynamically added messages
  const observer = new MutationObserver((mutations) => {
    // Debounce the addSyncButtons call
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      addSyncButtons();
    }, 300);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan
  addSyncButtons();

  // Re-scan periodically to catch any missed messages
  setInterval(addSyncButtons, 2000);
})();
