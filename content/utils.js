// Shared utility functions for content scripts

class PrompteanUtils {
  constructor(platform) {
    this.platform = platform; // 'chatgpt' or 'gemini'
    this.syncedPrompts = new Set();
    this.syncedAnswers = new Set();
  }

  // Create sync button
  createSyncButton() {
    const button = document.createElement('button');
    button.className = 'promptean-sync-btn';
    button.title = 'Sync to mark my prompt';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="width: 18px; height: 18px; fill: white;">
        <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
      </svg>
    `;
    return button;
  }

  // Create loading spinner
  createSpinner() {
    const spinner = document.createElement('div');
    spinner.className = 'promptean-spinner';
    return spinner;
  }

  // Show toast notification
  showToast(message, type = 'success') {
    // Remove any existing toasts
    const existingToast = document.querySelector('.promptean-toast');
    if (existingToast) {
      existingToast.remove();
    }

    const toast = document.createElement('div');
    toast.className = `promptean-toast ${type}`;
    
    const icon = type === 'success' 
      ? '<svg class="promptean-toast-icon success" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>'
      : '<svg class="promptean-toast-icon error" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';

    toast.innerHTML = `
      ${icon}
      <div class="promptean-toast-message">${message}</div>
      <button class="promptean-toast-close">×</button>
    `;

    document.body.appendChild(toast);

    // Close button handler
    const closeBtn = toast.querySelector('.promptean-toast-close');
    closeBtn.addEventListener('click', () => {
      this.removeToast(toast);
    });

    // Auto-remove after 4 seconds
    setTimeout(() => {
      this.removeToast(toast);
    }, 4000);
  }

  // Remove toast with animation
  removeToast(toast) {
    toast.classList.add('hiding');
    setTimeout(() => {
      toast.remove();
    }, 300);
  }

  // Sync prompt to mark my prompt
  async syncPrompt(promptText, button) {
    // Check if already synced
    if (this.syncedPrompts.has(promptText)) {
      this.showToast('This prompt is already synced!', 'success');
      return;
    }

    // Update button state
    button.classList.add('syncing');
    const originalContent = button.innerHTML;
    button.innerHTML = '';
    button.appendChild(this.createSpinner());
    button.disabled = true;

    try {
      // Send sync request to background script
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: 'syncPrompt',
            prompt: promptText,
            source: this.platform
          },
          resolve
        );
      });

      if (response.success) {
        // Mark as synced
        this.syncedPrompts.add(promptText);
        
        // Update button to success state
        button.classList.remove('syncing');
        button.classList.add('synced');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        `;
        button.title = 'Synced to mark my prompt';
        
        this.showToast('✓ Prompt synced successfully!', 'success');

        // Revert button after 2 seconds
        setTimeout(() => {
          button.classList.remove('synced');
          button.innerHTML = originalContent;
          button.disabled = false;
          button.title = 'Sync to mark my prompt';
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to sync prompt');
      }
    } catch (error) {
      // Handle error
      button.classList.remove('syncing');
      button.classList.add('error');
      button.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      `;
      
      this.showToast(`Failed to sync: ${error.message}`, 'error');

      // Revert button after 2 seconds
      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = originalContent;
        button.disabled = false;
      }, 2000);
    }
  }

  // Sync answer to mark my prompt
  async syncAnswer(answerText, button) {
    // Check if already synced
    if (this.syncedAnswers.has(answerText)) {
      this.showToast('This answer is already synced!', 'success');
      return;
    }

    // Update button state
    button.classList.add('syncing');
    const originalContent = button.innerHTML;
    button.innerHTML = '';
    button.appendChild(this.createSpinner());
    button.disabled = true;

    try {
      // Send sync request to background script
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: 'syncAnswer',
            answer: answerText,
            source: this.platform
          },
          resolve
        );
      });

      if (response.success) {
        // Mark as synced
        this.syncedAnswers.add(answerText);
        
        // Update button to success state
        button.classList.remove('syncing');
        button.classList.add('synced');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        `;
        button.title = 'Synced to mark my prompt';
        
        this.showToast('✓ Answer synced successfully!', 'success');

        // Revert button after 2 seconds
        setTimeout(() => {
          button.classList.remove('synced');
          button.innerHTML = originalContent;
          button.disabled = false;
          button.title = 'Sync to mark my prompt';
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to sync answer');
      }
    } catch (error) {
      // Handle error
      button.classList.remove('syncing');
      button.classList.add('error');
      button.innerHTML = `
        <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
        </svg>
      `;
      
      this.showToast(`Failed to sync: ${error.message}`, 'error');

      // Revert button after 2 seconds
      setTimeout(() => {
        button.classList.remove('error');
        button.innerHTML = originalContent;
        button.disabled = false;
      }, 2000);
    }
  }

  // Extract answer content using copy-to-clipboard approach
  async extractAnswerContent(answerElement) {
    // First try to find copy button within the answer element - updated for Gemini's specific structure
    let copyButton = answerElement.querySelector('button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="copy"], button[title*="copy"], button[class*="copy"], button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label="Copy"]');
    
    // If not found within the element, look in nearby containers (Gemini often places copy buttons outside)
    if (!copyButton) {
      const parent = answerElement.closest('[class*="message"], [class*="response"], [class*="turn"], [class*="conversation"]');
      if (parent) {
        copyButton = parent.querySelector('button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="copy"], button[title*="copy"], button[class*="copy"], button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label="Copy"]');
      }
    }
    
    // If still not found, look in the entire document but prioritize ones near our element
    if (!copyButton) {
      const allCopyButtons = document.querySelectorAll('button[aria-label*="Copy"], button[title*="Copy"], button[aria-label*="copy"], button[title*="copy"], button[class*="copy"], button[data-test-id="copy-button"], button[mattooltip*="Copy"], button[aria-label="Copy"]');
      
// Find the copy button that's closest to our answer element
        let minDistance = Infinity;
        let closestButton = null;
        
        allCopyButtons.forEach(button => {
          const buttonRect = button.getBoundingClientRect();
          const answerRect = answerElement.getBoundingClientRect();
          
          // Skip if button is not visible
          if (buttonRect.width === 0 || buttonRect.height === 0) {
            return;
          }
          
          // Calculate distance between centers
          const buttonCenterX = buttonRect.left + buttonRect.width / 2;
          const buttonCenterY = buttonRect.top + buttonRect.height / 2;
          const answerCenterX = answerRect.left + answerRect.width / 2;
          const answerCenterY = answerRect.top + answerRect.height / 2;
          
          const distance = Math.sqrt(
            Math.pow(buttonCenterX - answerCenterX, 2) + 
            Math.pow(buttonCenterY - answerCenterY, 2)
          );
          
          // More permissive distance check for Gemini's layout
          // Consider buttons within 300px vertically and reasonable horizontal distance
          const verticalDistance = Math.abs(buttonRect.top - answerRect.top);
          const horizontalDistance = Math.abs(buttonRect.left - answerRect.left);
          
          if (distance < minDistance && 
              verticalDistance < 300 && 
              horizontalDistance < 500) {
            minDistance = distance;
            closestButton = button;
          }
        });
      
      copyButton = closestButton;
    }
    
    if (copyButton) {
      try {
        console.log('Found copy button, attempting to extract markdown...');
        console.log('Copy button attributes:', {
          'aria-label': copyButton.getAttribute('aria-label'),
          'data-test-id': copyButton.getAttribute('data-test-id'),
          'mattooltip': copyButton.getAttribute('mattooltip'),
          'class': copyButton.className
        });
        
        // Store original clipboard content
        const originalClipboard = await navigator.clipboard.readText().catch(() => '');
        
        // Clear clipboard to ensure we get fresh content
        await navigator.clipboard.writeText('').catch(() => {});
        
        // Click copy button
        copyButton.click();
        
        // Wait for clipboard to update - longer for markdown content
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Try multiple times to read from clipboard
        let clipboardContent = '';
        let attempts = 0;
        const maxAttempts = 5;
        
        while (attempts < maxAttempts) {
          try {
            clipboardContent = await navigator.clipboard.readText();
            
            // Check if we got meaningful content (markdown indicators)
            if (clipboardContent && clipboardContent.trim().length > 10) {
              // Check if it looks like markdown (has formatting indicators)
              const hasMarkdown = /[#*`_\-\[\]]/.test(clipboardContent) || 
                                 clipboardContent.includes('```') || 
                                 clipboardContent.includes('**') ||
                                 clipboardContent.includes('*');
              
              if (hasMarkdown || clipboardContent.trim().length > 50) {
                console.log('Successfully extracted markdown content, length:', clipboardContent.length);
                break;
              }
            }
          } catch (e) {
            console.log(`Clipboard read attempt ${attempts + 1} failed:`, e);
          }
          attempts++;
          if (attempts < maxAttempts) {
            await new Promise(resolve => setTimeout(resolve, 300));
          }
        }
        
        // Restore original clipboard if needed
        if (originalClipboard) {
          await navigator.clipboard.writeText(originalClipboard).catch(() => {});
        }
        
        if (clipboardContent && clipboardContent.trim().length > 10) {
          return clipboardContent.trim();
        }
      } catch (error) {
        console.log('Copy-to-clipboard extraction failed, falling back to DOM extraction:', error);
      }
    }
    
    // Additional fallback: Try specific Gemini copy button selector
    if (!copyButton) {
      console.log('Trying specific Gemini copy button selectors...');
      const geminiCopyButton = document.querySelector('button[data-test-id="copy-button"], button[mattooltip="Copy response"], button[aria-label="Copy"]');
      
      if (geminiCopyButton) {
        console.log('Found Gemini-specific copy button, trying again...');
        try {
          // Store original clipboard content
          const originalClipboard = await navigator.clipboard.readText().catch(() => '');
          
          // Clear clipboard
          await navigator.clipboard.writeText('').catch(() => {});
          
          // Click copy button
          geminiCopyButton.click();
          
          // Wait for clipboard
          await new Promise(resolve => setTimeout(resolve, 1500));
          
          // Read clipboard
          const clipboardContent = await navigator.clipboard.readText();
          
          // Restore original clipboard
          if (originalClipboard) {
            await navigator.clipboard.writeText(originalClipboard).catch(() => {});
          }
          
          if (clipboardContent && clipboardContent.trim().length > 10) {
            console.log('Successfully extracted markdown using Gemini-specific button, length:', clipboardContent.length);
            return clipboardContent.trim();
          }
        } catch (error) {
          console.log('Gemini-specific copy button failed:', error);
        }
      }
    }
    
    // Enhanced fallback: Try to reconstruct markdown from DOM
    console.log('Falling back to DOM markdown extraction...');
    return this.extractMarkdownFromDOM(answerElement);
  }

  // Extract markdown from DOM by analyzing structure
  extractMarkdownFromDOM(element) {
    // Prioritize specific Gemini answer content selectors if available
    const geminiContentSelectors = [
      '[data-test-id="model-response"] [class*="markdown"]',
      '[class*="model-response"] [class*="markdown"]',
      '[class*="assistant-message"] [class*="markdown"]',
      '.response-content [class*="markdown"]',
      '[class*="response"] [class*="markdown"]',
      '[class*="prose"]:not([class*="query"])',
      '[class*="message-content"]:not([class*="query"])'
    ];

    let targetElement = element;
    for (const selector of geminiContentSelectors) {
      const foundElement = element.querySelector(selector);
      if (foundElement) {
        targetElement = foundElement;
        break;
      }
    }

    let markdown = '';
    
    const processNode = (node, depth = 0) => {
      if (node.nodeType === Node.TEXT_NODE) {
        return node.textContent;
      }
      
      if (node.nodeType === Node.ELEMENT_NODE) {
        const tagName = node.tagName.toLowerCase();
        let content = '';
        
        // Process child nodes first
        for (const child of node.childNodes) {
          content += processNode(child, depth + 1);
        }
        
        // Convert HTML elements to markdown
        switch (tagName) {
          case 'h1':
            return `# ${content}\n\n`;
          case 'h2':
            return `## ${content}\n\n`;
          case 'h3':
            return `### ${content}\n\n`;
          case 'h4':
            return `#### ${content}\n\n`;
          case 'h5':
            return `##### ${content}\n\n`;
          case 'h6':
            return `###### ${content}\n\n`;
          case 'p':
            return `${content}\n\n`;
          case 'strong':
          case 'b':
            return `**${content}**`;
          case 'em':
          case 'i':
            return `*${content}*`;
          case 'code':
            return `\`${content}\``;
          case 'pre':
            return `\`\`\`\n${content}\n\`\`\`\n\n`;
          case 'a':
            const href = node.getAttribute('href') || '';
            return `[${content}](${href})`;
          case 'ul':
            return content + '\n';
          case 'ol':
            return content + '\n';
          case 'li':
            const prefix = node.parentElement?.tagName.toLowerCase() === 'ol' ? '1. ' : '- ';
            return `${prefix}${content}\n`;
          case 'br':
            return '\n';
          case 'div':
          case 'span':
            // For divs and spans, just return content without extra formatting
            return content;
          default:
            return content;
        }
      }
      
      return '';
    };
    
    // Process the element and clean up the result
    markdown = processNode(targetElement);
    
    // Clean up excessive whitespace
    markdown = markdown
      .replace(/\n{3,}/g, '\n\n')  // Reduce multiple newlines to max 2
      .replace(/^\s+|\s+$/g, '')   // Trim leading/trailing whitespace
      .trim();
    
    return markdown;
  }

  // Check if extension is active
  async isExtensionActive() {
    return new Promise((resolve) => {
      chrome.runtime.sendMessage({ action: 'getConfig' }, (response) => {
        if (response && response.success) {
          resolve(response.config.isActive);
        } else {
          resolve(false);
        }
      });
    });
  }
}
