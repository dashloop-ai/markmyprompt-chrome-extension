// Perplexity.ai content script for Promptean Sync
console.log("🔍 MMP: Perplexity content script loaded");

(async function () {
  "use strict";
  console.log("🔍 MMP: Starting Perplexity initialization...");

  // Check if PrompteanUtils is available
  if (typeof PrompteanUtils === "undefined") {
    console.error(
      "❌ MMP: PrompteanUtils class not found! utils.js may not have loaded."
    );
    return;
  }
  console.log("✅ MMP: PrompteanUtils class found");

  // Initialize utils
  const utils = new PrompteanUtils("perplexity");
  console.log("✅ MMP: Utils initialized");

  // Check if extension is active
  const isActive = await utils.isExtensionActive();
  if (!isActive) {
    console.log(
      "mark my prompt Sync: Extension not activated. Please configure API key in settings."
    );
    return;
  }

  console.log("mark my prompt Sync: Active on Perplexity");

  // Debug mode - set to true to see detailed logs
  const DEBUG = false;

  // Track processed elements
  const processedElements = new WeakSet();
  const processedAnswers = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log("[MMP Perplexity]", ...args);
    }
  }

  // Add sync buttons to AI answers/responses
  function addAnswerSyncButtons() {
    debugLog("Scanning for AI answers...");

    // Perplexity shows answers in specific containers
    const answerSelectors = [
      '[class*="answer"]',
      '[class*="response"]',
      '[class*="result"]',
      '[class*="content"]',
      'div[class*="prose"]',
      'div[class*="markdown"]',
    ];

    let answerElements = [];
    for (const selector of answerSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        debugLog(`Trying selector "${selector}": found ${elements.length} elements`);

        if (elements.length > 0) {
          // Filter for elements that contain actual answer content
          const validAnswers = Array.from(elements).filter((element) => {
            const text = element.innerText || element.textContent || "";
            const trimmedText = text.trim();

            // Must have meaningful text length for an answer
            if (!trimmedText || trimmedText.length < 50) {
              return false;
            }

            // Skip very short text (likely UI elements)
            if (trimmedText.length < 50) {
              return false;
            }

            // Check if this looks like an answer (longer, structured content)
            const isLongAnswer = trimmedText.length > 100;
            const hasStructuredContent = trimmedText.includes('\n') || trimmedText.includes('. ') || trimmedText.includes('•');
            
            return isLongAnswer && hasStructuredContent;
          });

          if (validAnswers.length > 0) {
            answerElements = validAnswers;
            debugLog(`Found ${validAnswers.length} valid answers using selector: ${selector}`);
            break;
          }
        }
      } catch (e) {
        debugLog(`Selector failed: ${selector}`, e);
        continue;
      }
    }

    // Fallback: Look for main content areas
    if (answerElements.length === 0) {
      debugLog("Using fallback detection for Perplexity answers...");
      const mainContent = document.querySelector('main, [role="main"], [class*="main-content"]');
      if (mainContent) {
        const allDivs = mainContent.querySelectorAll('div');
        answerElements = Array.from(allDivs).filter((element) => {
          const text = element.innerText || element.textContent || "";
          const trimmedText = text.trim();
          return trimmedText.length > 100 && trimmedText.length < 50000;
        });
      }
      debugLog(`Fallback found ${answerElements.length} potential answers`);
    }

    debugLog(`Total answers found: ${answerElements.length}`);

    if (answerElements.length === 0) {
      debugLog("No answers found on page");
      return;
    }

    let buttonCount = 0;

    answerElements.forEach(async (element, index) => {
      // Skip if already processed
      if (processedAnswers.has(element)) {
        return;
      }

      // Extract answer content
      const answerText = await utils.extractAnswerContent(element);
      if (!answerText || answerText.length < 50) {
        debugLog(`Skipping answer ${index + 1}: content too short`);
        return;
      }

      debugLog(
        `Processing ANSWER ${index + 1}/${answerElements.length}: "${answerText.substring(0, 100)}..."`
      );

      // Find a suitable container for the sync button
      let container = element;

      // Look for the answer container in the parent hierarchy
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        const className = parent.className || "";
        const hasAnswerClasses =
          className.includes("answer") ||
          className.includes("response") ||
          className.includes("result") ||
          className.includes("prose") ||
          className.includes("rounded-2xl");

        // Look for a container that's large enough and has answer-related classes
        if (
          (hasAnswerClasses || parent.offsetWidth > 200) &&
          parent.offsetHeight > 100
        ) {
          container = parent;
          debugLog(
            `Found suitable container at depth ${depth}:`,
            parent.tagName,
            parent.className
          );
          break;
        }
        parent = parent.parentElement;
        depth++;
      }

      // If we couldn't find a good container, use a higher-level parent
      if (container === element && element.parentElement) {
        let fallbackParent = element.parentElement;
        for (let i = 0; i < 3 && fallbackParent; i++) {
          if (fallbackParent.offsetWidth > 200) {
            container = fallbackParent;
            debugLog("Using fallback container:", fallbackParent.tagName);
            break;
          }
          fallbackParent = fallbackParent.parentElement;
        }
      }

      // Add container class and positioning
      if (!container.classList.contains("promptean-container")) {
        container.classList.add("promptean-container");
        container.style.position = "relative";
      }

      // Create and add sync button (initially hidden)
      const syncButton = createPerplexitySyncButton();
      syncButton.addEventListener("click", async (e) => {
        e.stopPropagation();
        e.preventDefault();
        const answerContent = await utils.extractAnswerContent(element);
        if (answerContent && answerContent.length >= 50) {
          utils.syncAnswer(answerContent, syncButton);
        } else {
          utils.showToast("Failed to extract answer content", "error");
        }
      });

      // Position the button in the top-right corner and hide it initially
      syncButton.style.position = "absolute";
      syncButton.style.top = "8px";
      syncButton.style.right = "8px";
      syncButton.style.zIndex = "1000";
      syncButton.style.opacity = "0";
      syncButton.style.visibility = "hidden";
      syncButton.style.transition = "opacity 0.2s ease, visibility 0.2s ease";

      // Add hover effects to the container
      container.addEventListener("mouseenter", () => {
        syncButton.style.opacity = "0.8";
        syncButton.style.visibility = "visible";
      });

      container.addEventListener("mouseleave", () => {
        // Only hide if not currently syncing or synced
        if (
          !syncButton.classList.contains("syncing") &&
          !syncButton.classList.contains("synced")
        ) {
          syncButton.style.opacity = "0";
          syncButton.style.visibility = "hidden";
        }
      });

      container.appendChild(syncButton);
      processedAnswers.add(element);
      buttonCount++;

      debugLog(
        `Added hover sync button ${buttonCount} to ANSWER:`,
        answerText.substring(0, 50) + "..."
      );
    });

    debugLog(`Answer scan complete. Added ${buttonCount} sync buttons`);
  }

  // Add sync buttons to user prompts
  function addSyncButtons() {
    debugLog("Scanning for user prompts...");

    // Perplexity-specific approach: Target the actual user prompt structure
    let userMessages = [];

    // Strategy 1: Look for the specific Perplexity user prompt structure
    // Based on the provided DOM: span.select-text inside specific container structure
    const perplexityPromptSelectors = [
      "span.select-text",
      'span[class="select-text"]',
      ".select-text",
      // Fallback selectors for variations
      'h1 span[style*="overflow-wrap"]',
      'div[class*="group/query"] span',
      'div[class*="font-sans"] span.select-text',
    ];

    for (const selector of perplexityPromptSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        debugLog(
          `Trying selector "${selector}": found ${elements.length} elements`
        );

        if (elements.length > 0) {
          // Filter for elements that contain actual user queries
          const validPrompts = Array.from(elements).filter((element) => {
            const text = element.innerText || element.textContent || "";
            const trimmedText = text.trim();

            // Must have meaningful text
            if (!trimmedText || trimmedText.length < 3) {
              return false;
            }

            // Skip very long text (likely not user queries)
            if (trimmedText.length > 1000) {
              return false;
            }

            // Check if this looks like a user query
            const looksLikeQuery =
              trimmedText.length >= 3 && trimmedText.length <= 500;

            debugLog(
              `Checking element: "${trimmedText.substring(
                0,
                50
              )}..." (length: ${trimmedText.length})`
            );

            return looksLikeQuery;
          });

          if (validPrompts.length > 0) {
            userMessages = validPrompts;
            debugLog(
              `Found ${validPrompts.length} valid user prompts using selector: ${selector}`
            );
            break;
          }
        }
      } catch (e) {
        debugLog(`Selector failed: ${selector}`, e);
        continue;
      }
    }

    // Strategy 2: Fallback to broader search if specific selectors don't work
    if (userMessages.length === 0) {
      debugLog("Using fallback detection for Perplexity prompts...");

      const allSpans = document.querySelectorAll("span");
      debugLog(`Found ${allSpans.length} span elements for fallback analysis`);

      userMessages = Array.from(allSpans).filter((element) => {
        const text = element.innerText || element.textContent || "";
        const trimmedText = text.trim();

        // Must have meaningful text length for a query
        if (trimmedText.length < 5 || trimmedText.length > 500) {
          return false;
        }

        // Check if parent structure matches Perplexity pattern
        const parent = element.parentElement;
        const grandParent = parent ? parent.parentElement : null;

        // Look for Perplexity-specific class patterns in ancestors
        let hasPerplexityStructure = false;
        let currentElement = element;
        for (let i = 0; i < 5 && currentElement; i++) {
          const className = currentElement.className || "";
          if (
            className.includes("group/query") ||
            className.includes("font-sans") ||
            className.includes("text-foreground") ||
            className.includes("select-text")
          ) {
            hasPerplexityStructure = true;
            break;
          }
          currentElement = currentElement.parentElement;
        }

        return hasPerplexityStructure;
      });

      debugLog(`Fallback found ${userMessages.length} potential user prompts`);
    }

    debugLog(`Total user messages found: ${userMessages.length}`);

    // For Perplexity, we're targeting specific elements, so minimal filtering needed
    const userPrompts = userMessages.filter((element) => {
      const text = element.innerText || element.textContent || "";
      const trimmedText = text.trim();

      // Must have meaningful text
      if (!trimmedText || trimmedText.length < 3) {
        return false;
      }

      // Since we're targeting span.select-text elements, they should be user prompts
      // Just do basic validation to avoid edge cases

      // Skip very short or very long text
      if (trimmedText.length < 3 || trimmedText.length > 1000) {
        debugLog(
          `Skipping due to length (${
            trimmedText.length
          }): "${trimmedText.substring(0, 50)}..."`
        );
        return false;
      }

      // Skip obvious UI text patterns
      const isUIText =
        /^(edit|copy|share|save|delete|close|open|menu|settings|profile|login|logout|sign up|sign in)$/i.test(
          trimmedText
        );
      if (isUIText) {
        debugLog(`Skipping UI text: "${trimmedText}"`);
        return false;
      }

      // Skip empty or whitespace-only content
      if (!/\w/.test(trimmedText)) {
        debugLog(`Skipping non-word content: "${trimmedText}"`);
        return false;
      }

      debugLog(`Found USER PROMPT: "${trimmedText}"`);
      return true;
    });

    debugLog(`Found ${userPrompts.length} user prompts`);

    if (userPrompts.length === 0) {
      debugLog("No user prompts found on page");
      return;
    }

    let buttonCount = 0;

    userPrompts.forEach((element, index) => {
      // Skip if already processed
      if (processedElements.has(element)) {
        return;
      }

      const text = element.innerText || element.textContent || "";
      debugLog(
        `Processing USER PROMPT ${index + 1}/${
          userPrompts.length
        }: "${text.substring(0, 100)}..."`
      );

      // Find a suitable container for the sync button
      // For Perplexity span.select-text elements, we need to find the prompt container
      let container = element;

      // Look for the prompt container in the parent hierarchy
      let parent = element.parentElement;
      let depth = 0;
      while (parent && depth < 8) {
        const className = parent.className || "";
        const hasPromptClasses =
          className.includes("group/query") ||
          className.includes("font-sans") ||
          className.includes("text-foreground") ||
          className.includes("rounded-2xl");

        // Look for a container that's large enough and has prompt-related classes
        if (
          (hasPromptClasses || parent.offsetWidth > 100) &&
          parent.offsetHeight > 30
        ) {
          container = parent;
          debugLog(
            `Found suitable container at depth ${depth}:`,
            parent.tagName,
            parent.className
          );
          break;
        }
        parent = parent.parentElement;
        depth++;
      }

      // If we couldn't find a good container, use a higher-level parent
      if (container === element && element.parentElement) {
        let fallbackParent = element.parentElement;
        for (let i = 0; i < 3 && fallbackParent; i++) {
          if (fallbackParent.offsetWidth > 200) {
            container = fallbackParent;
            debugLog("Using fallback container:", fallbackParent.tagName);
            break;
          }
          fallbackParent = fallbackParent.parentElement;
        }
      }

      // Add container class and positioning
      if (!container.classList.contains("promptean-container")) {
        container.classList.add("promptean-container");
        container.style.position = "relative";
      }

      // Create and add sync button (initially hidden)
      const syncButton = createPerplexitySyncButton();
      syncButton.addEventListener("click", (e) => {
        e.stopPropagation();
        e.preventDefault();
        utils.syncPrompt(text.trim(), syncButton);
      });

      // Position the button in the top-right corner and hide it initially
      syncButton.style.position = "absolute";
      syncButton.style.top = "8px";
      syncButton.style.right = "8px";
      syncButton.style.zIndex = "1000";
      syncButton.style.opacity = "0";
      syncButton.style.visibility = "hidden";
      syncButton.style.transition = "opacity 0.2s ease, visibility 0.2s ease";

      // Add hover effects to the container
      container.addEventListener("mouseenter", () => {
        syncButton.style.opacity = "0.8";
        syncButton.style.visibility = "visible";
      });

      container.addEventListener("mouseleave", () => {
        // Only hide if not currently syncing or synced
        if (
          !syncButton.classList.contains("syncing") &&
          !syncButton.classList.contains("synced")
        ) {
          syncButton.style.opacity = "0";
          syncButton.style.visibility = "hidden";
        }
      });

      container.appendChild(syncButton);
      processedElements.add(element);
      buttonCount++;

      debugLog(
        `Added hover sync button ${buttonCount} to USER PROMPT:`,
        text.substring(0, 50) + "..."
      );
    });

    debugLog(`Scan complete. Added ${buttonCount} sync buttons`);
  }

  // Create Perplexity-specific sync button
  function createPerplexitySyncButton() {
    const button = document.createElement("div");
    button.className = "promptean-sync-btn promptean-perplexity-btn";
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: linear-gradient(135deg, #20B2AA 0%, #008B8B 100%);
      box-shadow: 0 2px 8px rgba(32, 178, 170, 0.3);
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

    // Hover effects for the button itself
    button.addEventListener("mouseenter", () => {
      button.style.opacity = "1";
      button.style.transform = "scale(1.05)";
      button.style.boxShadow = "0 4px 12px rgba(32, 178, 170, 0.4)";
    });

    button.addEventListener("mouseleave", () => {
      if (
        !button.classList.contains("syncing") &&
        !button.classList.contains("synced")
      ) {
        button.style.opacity = "0.8";
        button.style.transform = "scale(1)";
        button.style.boxShadow = "0 2px 8px rgba(32, 178, 170, 0.3)";
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
      addAnswerSyncButtons();
    }, 1000);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan after page loads
  setTimeout(() => {
    addSyncButtons();
    addAnswerSyncButtons();
  }, 3000);

  // Re-scan periodically to catch any missed content
  setInterval(() => {
    addSyncButtons();
    addAnswerSyncButtons();
  }, 8000);

  debugLog("Perplexity content script initialization complete");
})();
