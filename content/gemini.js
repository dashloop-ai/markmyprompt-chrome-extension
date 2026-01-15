// Gemini content script for Promptean Sync

(async function () {
  "use strict";

  // Initialize utils
  const utils = new PrompteanUtils("gemini");

  // Check if extension is active
  const isActive = await utils.isExtensionActive();
  if (!isActive) {
    console.log(
      "mark my prompt Sync: Extension not activated. Please configure API key in settings."
    );
    return;
  }

  console.log("mark my prompt Sync: Active on Gemini");

  // Track processed elements
  const processedElements = new WeakSet();

  // Add sync buttons to existing user prompts
  function addSyncButtons() {
    // Gemini uses different selectors - try multiple patterns
    const selectors = [
      '[data-test-id="user-query"]',
      ".query-content",
      '[class*="user-message"]',
      ".message-content.user",
    ];

    let userMessages = [];
    for (const selector of selectors) {
      const elements = document.querySelectorAll(selector);
      if (elements.length > 0) {
        userMessages = Array.from(elements);
        break;
      }
    }

    // Fallback: Look for message containers with user indicators
    if (userMessages.length === 0) {
      // Try to find user messages by structure
      const allMessages = document.querySelectorAll(
        '[class*="message"], [class*="query"]'
      );
      userMessages = Array.from(allMessages).filter((el) => {
        const text = el.innerText || el.textContent;
        // Skip if it's too short or looks like an AI response
        if (!text || text.trim().length < 10) return false;
        // Check if this looks like a user message (you can customize this logic)
        const parent = el.closest('[class*="conversation"], [class*="chat"]');
        return parent !== null;
      });
    }

    userMessages.forEach((messageElement) => {
      // Skip if already processed
      if (processedElements.has(messageElement)) {
        return;
      }

      // Get the text content
      const promptText = messageElement.innerText.trim();
      if (!promptText || promptText.length < 5) {
        return;
      }

      // Make sure we have a valid container
      let container = messageElement;

      // Try to find a better parent container
      const potentialParent = messageElement.closest(
        '[class*="message-container"], [class*="query-container"]'
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
    });
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
  setTimeout(addSyncButtons, 1000); // Give Gemini a moment to render

  // Re-scan periodically to catch any missed messages
  setInterval(addSyncButtons, 3000);
})();
