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
  const processedCopyButtons = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log("[MMP Perplexity]", ...args);
    }
  }

  // Monitor Perplexity's copy button for user-friendly answer sync
  function monitorCopyActivity() {
    // Find all copy buttons - Perplexity uses various selectors
    const copyButtons = document.querySelectorAll(
      'button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="copy"], button[title*="copy"], button[class*="copy"], button[data-testid*="copy"], [class*="copy-button"]'
    );
    
    copyButtons.forEach(copyButton => {
      // Skip if already monitoring this button
      if (processedCopyButtons.has(copyButton)) {
        return;
      }
      
      // Add click listener to copy button
      copyButton.addEventListener('click', async () => {
        debugLog('Perplexity copy button clicked, waiting for clipboard...');
        
        // Wait a moment for clipboard to update
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Get clipboard content
        try {
          const clipboardContent = await navigator.clipboard.readText();
          if (clipboardContent && clipboardContent.trim().length > 10) {
            debugLog('Found clipboard content, showing sync modal...');
            // Show sync modal for answers
            showSyncModal(clipboardContent);
          }
        } catch (error) {
          debugLog('Failed to read clipboard:', error);
        }
      });
      
      processedCopyButtons.add(copyButton);
    });
  }

  // Show sync modal to user
  function showSyncModal(content) {
    // Remove any existing modal
    const existingModal = document.querySelector('.promptean-sync-modal');
    if (existingModal) {
      existingModal.remove();
    }

    // Create modal overlay
    const overlay = document.createElement('div');
    overlay.className = 'promptean-sync-modal-overlay';
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10000;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    // Create modal
    const modal = document.createElement('div');
    modal.className = 'promptean-sync-modal';
    modal.style.cssText = `
      background: white;
      border-radius: 12px;
      padding: 24px;
      max-width: 520px;
      width: 90%;
      box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
      position: relative;
    `;

    modal.innerHTML = `
      <div style="display: flex; align-items: center; margin-bottom: 16px;">
        <div style="width: 48px; height: 48px; background: #f84f4f; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 16px;">
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 24px; height: 24px; fill: white;">
            <path d="M11 14.98h2v-7.97l3.2 3.19L17.61 9 12 3.39 6.39 9l1.42 1.41L11 7.01v7.97zm-7 0v4.02h16v-4.02h2v4.02c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2v-4.02h2z"/>
          </svg>
        </div>
        <div>
          <h3 style="margin: 0; font-size: 18px; font-weight: 600; color: #1f2937;">Sync to mark my prompt?</h3>
          <p style="margin: 4px 0 0 0; font-size: 14px; color: #6b7280;">Save this answer to your prompt library</p>
        </div>
      </div>
      
      <div style="margin-bottom: 20px;">
        <div style="font-size: 12px; color: #9ca3af; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.05em;">Preview</div>
        <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; max-height: 120px; overflow-y: auto; font-size: 13px; color: #374151; line-height: 1.4;">
          ${content.substring(0, 200)}${content.length > 200 ? '...' : ''}
        </div>
      </div>
      
      <div style="display: flex; gap: 12px; justify-content: flex-end;">
        <button class="promptean-modal-cancel" style="padding: 8px 16px; border: 1px solid #d1d5db; background: white; color: #374151; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s;">
          Cancel
        </button>
        <button class="promptean-modal-sync" style="padding: 8px 16px; border: none; background: #f84f4f; color: white; border-radius: 6px; font-size: 14px; cursor: pointer; transition: all 0.2s; font-weight: 500; white-space: nowrap; min-width: 160px; display: flex; align-items: center; justify-content: center; gap: 8px;">
          Sync Answer
        </button>
      </div>
    `;

    // Add modal to overlay
    overlay.appendChild(modal);
    document.body.appendChild(overlay);

    // Add event listeners
    const cancelButton = modal.querySelector('.promptean-modal-cancel');
    const syncButton = modal.querySelector('.promptean-modal-sync');

    // Cancel button
    cancelButton.addEventListener('click', () => {
      closeModal();
    });

    // Sync button
    syncButton.addEventListener('click', async () => {
      // Update button state
      const originalSyncButtonContent = syncButton.innerHTML;
      syncButton.innerHTML = 'Syncing...';
      syncButton.appendChild(utils.createSpinner());
      syncButton.disabled = true;
      cancelButton.disabled = true;

      try {
        // Perform sync
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: 'syncAnswer',
              answer: content,
              source: 'perplexity'
            },
            resolve
          );
        });

        if (response.success) {
          // Show success state
          syncButton.innerHTML = `
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px; fill: white;">
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
            </svg>
          `;
          syncButton.style.background = '#10b981';
          syncButton.title = 'Synced to mark my prompt';

          // Show success toast
          utils.showToast('✓ Answer synced successfully!', 'success');
          
          // Close modal after delay
          setTimeout(() => {
            closeModal();
          }, 1500);
        } else {
          throw new Error(response.error || 'Failed to sync answer');
        }
      } catch (error) {
        // Show error state
        syncButton.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px; fill: white;">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
          </svg>
        `;
        syncButton.style.background = '#ef4444';
        syncButton.title = 'Failed to sync';
        
        utils.showToast(`Failed to sync: ${error.message}`, 'error');
        
        // Re-enable buttons after error
        setTimeout(() => {
          syncButton.innerHTML = originalSyncButtonContent;
          syncButton.style.background = '';
          syncButton.disabled = false;
          cancelButton.disabled = false;
          syncButton.title = 'Sync Answer';
        }, 2000);
      }
    });

    // Close on overlay click
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) {
        closeModal();
      }
    });

    // Close on Escape key
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        closeModal();
        document.removeEventListener('keydown', handleEscape);
      }
    };
    document.addEventListener('keydown', handleEscape);

    // Close modal function
    function closeModal() {
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        overlay.remove();
        document.removeEventListener('keydown', handleEscape);
      }, 300);
    }

    // Animate modal entrance
    setTimeout(() => {
      modal.style.transform = 'scale(1)';
      modal.style.opacity = '1';
    }, 10);
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
    const button = document.createElement("button");
    button.className = "promptean-sync-btn promptean-perplexity-btn";
    button.type = "button";
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 32px;
      height: 32px;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: all 0.2s ease;
      background: linear-gradient(135deg, #20B2AA 0%, #008B8B 100%);
      box-shadow: 0 2px 8px rgba(32, 178, 170, 0.3);
      opacity: 0.8;
      padding: 0;
    `;

    button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 18px;
        height: 18px;
      ">
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px; fill: white;">
          <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
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
      monitorCopyActivity();
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
    monitorCopyActivity();
  }, 3000);

  // Re-scan periodically to catch any missed content
  setInterval(() => {
    addSyncButtons();
    monitorCopyActivity();
  }, 8000);

  debugLog("Perplexity content script initialization complete");
})();
