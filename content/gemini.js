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
  const processedAnswers = new WeakSet();
  const processedCopyButtons = new WeakSet();

  // Add sync buttons to existing user prompts (restore original functionality)
  function addSyncButtons() {
    // Check if there's an actual conversation first
    // Don't show buttons on empty/new chat screens
    const hasConversation = document.querySelector('[class*="conversation"], [class*="chat"]');
    if (!hasConversation) {
      return; // Exit early if no conversation container exists
    }

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

    // Only process if we actually found valid user messages
    if (userMessages.length === 0) {
      return; // Exit if no valid user messages found
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

      // Additional validation: skip if this looks like a placeholder or empty state
      const lowerText = promptText.toLowerCase();
      if (lowerText.includes('enter a prompt') || 
          lowerText.includes('where should we start') ||
          lowerText.includes('what can i help') ||
          promptText.length < 10) {
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

      // Create and add sync button for prompts
      const syncButton = utils.createSyncButton();
      syncButton.addEventListener("click", (e) => {
        e.stopPropagation();
        utils.syncPrompt(promptText, syncButton);
      });

      container.appendChild(syncButton);
      processedElements.add(messageElement);
    });
  }

  // Monitor Gemini's copy button and toast for user-friendly answer sync
  function monitorCopyActivity() {
    // Check if there's an actual conversation first
    // Don't monitor buttons on empty/new chat screens
    const hasConversation = document.querySelector('[class*="conversation"], [class*="chat"]');
    if (!hasConversation) {
      return; // Exit early if no conversation container exists
    }

    // Find all copy buttons
    const copyButtons = document.querySelectorAll('button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label*="Copy"]');
    
    // Only process if we found copy buttons
    if (copyButtons.length === 0) {
      return; // Exit if no copy buttons found
    }
    
    copyButtons.forEach(copyButton => {
      // Skip if already monitoring this button
      if (processedCopyButtons.has(copyButton)) {
        return;
      }
      
      // Add click listener to copy button
      copyButton.addEventListener('click', async () => {
        console.log('Gemini copy button clicked, waiting for toast...');
        
        // Wait for Gemini's toast to appear
        let toastFound = false;
        let attempts = 0;
        const maxAttempts = 10;
        
        while (!toastFound && attempts < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Look for Gemini's "Copied to clipboard" toast
          const toast = document.querySelector('[class*="toast"], [class*="snackbar"], [role="alert"], [class*="notification"]');
          
          if (toast && (toast.textContent?.includes('Copied') || toast.textContent?.includes('copied'))) {
            toastFound = true;
            console.log('Found Gemini toast, showing sync modal...');
            
            // Wait a moment for the toast to be visible
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Get clipboard content
            try {
              const clipboardContent = await navigator.clipboard.readText();
              if (clipboardContent && clipboardContent.trim().length > 10) {
                // Show sync modal for answers
                showSyncModal(clipboardContent);
              }
            } catch (error) {
              console.log('Failed to read clipboard:', error);
            }
            
            break;
          }
          
          attempts++;
        }
        
        if (!toastFound) {
          console.log('No toast found after copy, might be using different notification method');
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
      const originalSyncButtonContent = syncButton.innerHTML; // Store original content
      syncButton.innerHTML = 'Syncing...';
      syncButton.appendChild(utils.createSpinner()); // Add spinner
      syncButton.disabled = true;
      cancelButton.disabled = true;

      try {
        // Perform sync
        const response = await new Promise((resolve) => {
          chrome.runtime.sendMessage(
            {
              action: 'syncAnswer',
              answer: content,
              source: 'gemini'
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
          syncButton.innerHTML = originalSyncButtonContent; // Revert to original content
          syncButton.style.background = ''; // Revert background
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

  

  // Observe DOM changes for dynamically added content
  const observer = new MutationObserver((mutations) => {
    // Check if mutations might affect prompts or copy buttons
    const shouldRescan = mutations.some(mutation => {
      // Check for added nodes that might contain messages or copy buttons
      if (mutation.addedNodes.length > 0) {
        return Array.from(mutation.addedNodes).some(node => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            return node.matches('[class*="message"], [class*="query"], [class*="response"], [class*="content"], [class*="turn"]') ||
                   node.querySelector('[class*="message"], [class*="query"], [class*="response"], [class*="content"], [class*="turn"]') ||
                   node.matches('button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label*="Copy"]') ||
                   node.querySelector('button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label*="Copy"]');
          }
          return false;
        });
      }
      // Check for character data changes (content updates)
      if (mutation.type === 'characterData' && mutation.target.parentNode) {
        const parent = mutation.target.parentNode;
        return parent.matches('[class*="message"], [class*="query"], [class*="response"], [class*="content"]') ||
               parent.closest('[class*="message"], [class*="query"], [class*="response"], [class*="content"]');
      }
      return false;
    });

    if (shouldRescan) {
      // Debounce the rescan calls
      clearTimeout(observer.timeout);
      observer.timeout = setTimeout(() => {
        addSyncButtons();
        monitorCopyActivity();
      }, 500);
    }
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true,
    characterData: true
  });

  // Initial scan
  setTimeout(() => {
    addSyncButtons();
    monitorCopyActivity();
  }, 1500); // Give Gemini more time to render

  // Re-scan periodically to catch any missed messages or copy buttons
  setInterval(() => {
    addSyncButtons();
    monitorCopyActivity();
  }, 5000);
})();
