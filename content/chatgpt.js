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
  const processedCopyButtons = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log("[MMP ChatGPT]", ...args);
    }
  }

  // Monitor ChatGPT's copy button for user-friendly answer sync
  function monitorCopyActivity() {
    // Find all copy buttons - ChatGPT uses various selectors
    const copyButtons = document.querySelectorAll(
      'button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="copy"], button[title*="copy"], button[class*="copy"], button[data-testid*="copy"]'
    );
    
    copyButtons.forEach(copyButton => {
      // Skip if already monitoring this button
      if (processedCopyButtons.has(copyButton)) {
        return;
      }
      
      // Add click listener to copy button
      copyButton.addEventListener('click', async () => {
        debugLog('ChatGPT copy button clicked, waiting for clipboard...');
        
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
              source: 'chatgpt'
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
      monitorCopyActivity();
    }, 300);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  // Initial scan
  addSyncButtons();
  monitorCopyActivity();

  // Re-scan periodically to catch any missed messages
  setInterval(() => {
    addSyncButtons();
    monitorCopyActivity();
  }, 2000);
})();
