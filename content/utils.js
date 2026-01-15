// Shared utility functions for content scripts

class PrompteanUtils {
  constructor(platform) {
    this.platform = platform; // 'chatgpt' or 'gemini'
    this.syncedPrompts = new Set();
  }

  // Create sync button
  createSyncButton() {
    const button = document.createElement('button');
    button.className = 'promptean-sync-btn';
    button.title = 'Sync to mark my prompt';
    button.innerHTML = `
      <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
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
