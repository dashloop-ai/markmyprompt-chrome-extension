// X (Twitter) content script for Promptean Sync
console.log('🐦 Promptean: X (Twitter) content script loaded');

(async function() {
  'use strict';
  console.log('🐦 Promptean: Starting initialization...');

  // Check if PrompteanUtils is available
  if (typeof PrompteanUtils === 'undefined') {
    console.error('❌ Promptean: PrompteanUtils class not found! utils.js may not have loaded.');
    return;
  }
  console.log('✅ Promptean: PrompteanUtils class found');

  // Initialize utils
  const utils = new PrompteanUtils('twitter');
  console.log('✅ Promptean: Utils initialized');

  // Check if extension is active
  const isActive = await utils.isExtensionActive();
  if (!isActive) {
    console.log('mark my prompt Sync: Extension not activated. Please configure API key in settings.');
    return;
  }

  console.log('mark my prompt Sync: Active on X (Twitter)');

  // Debug mode - set to true to see detailed logs
  const DEBUG = true;

  // Track processed elements
  const processedElements = new WeakSet();

  function debugLog(...args) {
    if (DEBUG) {
      console.log('[Promptean Twitter]', ...args);
    }
  }

  // Extract tweet text content
  function extractTweetText(tweetElement) {
    // Try multiple selectors for tweet text content
    const textSelectors = [
      '[data-testid="tweetText"]',
      '[lang] > span',
      '.css-1dbjc4n .css-901oao',
      '.tweet-text',
      '[role="group"] [lang]'
    ];

    for (const selector of textSelectors) {
      const textElement = tweetElement.querySelector(selector);
      if (textElement) {
        const text = textElement.innerText || textElement.textContent;
        if (text && text.trim().length > 10) {
          debugLog('Found tweet text using selector:', selector, 'Text:', text.substring(0, 100) + '...');
          return text.trim();
        }
      }
    }

    // Fallback: try to find any text content in the tweet
    const allTextElements = tweetElement.querySelectorAll('[lang], .css-901oao, span');
    for (const element of allTextElements) {
      const text = element.innerText || element.textContent;
      if (text && text.trim().length > 10 && !text.includes('·') && !text.includes('Show this thread')) {
        debugLog('Found tweet text using fallback:', text.substring(0, 100) + '...');
        return text.trim();
      }
    }

    return null;
  }

  // Extract images from tweet
  function extractTweetImages(tweetElement) {
    const images = [];
    
    // Try multiple selectors for tweet images
    const imageSelectors = [
      '[data-testid="tweetPhoto"] img',
      '[data-testid="tweet"] img[src*="pbs.twimg.com"]',
      '.css-1dbjc4n img[src*="twimg.com"]',
      'img[alt*="Image"]'
    ];

    for (const selector of imageSelectors) {
      const imageElements = tweetElement.querySelectorAll(selector);
      for (const img of imageElements) {
        if (img.src && img.src.includes('twimg.com')) {
          // Get the original/larger version of the image
          let imageSrc = img.src;
          
          // Convert to larger format if possible
          if (imageSrc.includes('name=small')) {
            imageSrc = imageSrc.replace('name=small', 'name=large');
          } else if (imageSrc.includes('name=thumb')) {
            imageSrc = imageSrc.replace('name=thumb', 'name=large');
          } else if (!imageSrc.includes('name=')) {
            imageSrc += '&name=large';
          }
          
          images.push({
            src: imageSrc,
            alt: img.alt || 'Tweet image'
          });
          
          debugLog('Found tweet image:', imageSrc);
        }
      }
    }

    return images;
  }

  // Convert image URL to base64
  async function imageUrlToBase64(imageUrl) {
    try {
      const response = await fetch(imageUrl);
      const blob = await response.blob();
      
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsDataURL(blob);
      });
    } catch (error) {
      debugLog('Error converting image to base64:', error);
      return null;
    }
  }

  // Add sync buttons to tweets
  function addSyncButtons() {
    debugLog('Scanning for tweets...');
    
    // Try multiple selector strategies for Twitter's DOM structure
    const tweetSelectors = [
      '[data-testid="tweet"]',
      '[data-testid="cellInnerDiv"] article',
      'article[role="article"]',
      '.css-1dbjc4n[role="article"]'
    ];

    let tweets = [];
    let usedSelector = '';
    
    // Try each selector until we find tweets
    for (const selector of tweetSelectors) {
      try {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          tweets = Array.from(elements);
          usedSelector = selector;
          debugLog(`Found ${elements.length} tweets using selector: ${selector}`);
          break;
        }
      } catch (e) {
        debugLog(`Selector failed: ${selector}`, e);
        continue;
      }
    }
    
    if (tweets.length === 0) {
      debugLog('No tweets found on page');
      return;
    }
    
    tweets.forEach(tweetElement => {
      // Skip if already processed
      if (processedElements.has(tweetElement)) {
        return;
      }

      // Extract tweet text and images
      const tweetText = extractTweetText(tweetElement);
      const tweetImages = extractTweetImages(tweetElement);
      
      // Skip if no text and no images
      if ((!tweetText || tweetText.length < 10) && tweetImages.length === 0) {
        debugLog('Skipping tweet - no valid text content or images');
        return;
      }

      // Find the action bar (like, retweet, share buttons)
      const actionBarSelectors = [
        '[role="group"]',
        '[data-testid="tweet"] [role="group"]',
        '.css-1dbjc4n[role="group"]'
      ];

      let actionBar = null;
      for (const selector of actionBarSelectors) {
        actionBar = tweetElement.querySelector(selector);
        if (actionBar) {
          debugLog('Found action bar using selector:', selector);
          break;
        }
      }

      if (!actionBar) {
        debugLog('No action bar found for tweet, skipping');
        return;
      }

      // Check if we already added a sync button to this action bar
      if (actionBar.querySelector('.promptean-sync-btn')) {
        return;
      }

      // Create and add sync button
      const syncButton = createTwitterSyncButton();
      syncButton.addEventListener('click', async (e) => {
        e.stopPropagation();
        e.preventDefault();
        
        // Prioritize image extraction if images are present
        // This ensures we capture prompts from images even when there's also text
        if (tweetImages.length > 0) {
          debugLog('Tweet has images, attempting image extraction first');
          await syncTweetWithImages(tweetImages, syncButton, tweetText);
        } else if (tweetText && tweetText.length >= 10) {
          // Regular text sync when no images
          debugLog('No images found, syncing text content');
          utils.syncPrompt(tweetText, syncButton);
        } else {
          // No meaningful content
          utils.showToast('No content found to sync', 'error');
        }
      });

      // Add the button to the action bar
      actionBar.appendChild(syncButton);
      processedElements.add(tweetElement);
      
      debugLog('Added sync button to tweet:', tweetText.substring(0, 50) + '...');
    });
  }

  // Create Twitter-specific sync button
  function createTwitterSyncButton() {
    const button = document.createElement('div');
    button.className = 'promptean-sync-btn';
    button.style.cssText = `
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34.75px;
      height: 34.75px;
      border-radius: 9999px;
      cursor: pointer;
      transition: background-color 0.2s;
      margin-left: 12px;
    `;
    
    button.innerHTML = `
      <div style="
        display: flex;
        align-items: center;
        justify-content: center;
        width: 20px;
        height: 20px;
      ">
        <svg viewBox="0 0 24 24" style="width: 18px; height: 18px; fill: rgb(113, 118, 123);">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.94-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/>
        </svg>
      </div>
    `;
    
    button.title = 'Sync to mark my prompt';
    
    // Hover effects
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = 'rgba(29, 155, 240, 0.1)';
      const svg = button.querySelector('svg');
      if (svg) {
        svg.style.fill = 'rgb(29, 155, 240)';
      }
    });
    
    button.addEventListener('mouseleave', () => {
      if (!button.classList.contains('syncing') && !button.classList.contains('synced')) {
        button.style.backgroundColor = 'transparent';
        const svg = button.querySelector('svg');
        if (svg) {
          svg.style.fill = 'rgb(113, 118, 123)';
        }
      }
    });
    
    return button;
  }

  // Sync tweet with images
  async function syncTweetWithImages(images, button, fallbackText = null) {
    if (images.length === 0) {
      if (fallbackText && fallbackText.length >= 10) {
        debugLog('No images found, falling back to text sync');
        utils.syncPrompt(fallbackText, button);
        return;
      }
      utils.showToast('No images found in tweet', 'error');
      return;
    }

    // Update button state
    button.classList.add('syncing');
    const originalContent = button.innerHTML;
    button.innerHTML = '';
    button.appendChild(utils.createSpinner());
    button.disabled = true;

    try {
      // Process first image (can be extended to handle multiple images)
      const firstImage = images[0];
      debugLog('Processing image:', firstImage.src);
      const base64Data = await imageUrlToBase64(firstImage.src);
      
      if (!base64Data) {
        throw new Error('Failed to convert image to base64');
      }

      debugLog('Image converted to base64, sending to backend...');

      // Send sync request to background script with image data
      const response = await new Promise((resolve) => {
        chrome.runtime.sendMessage(
          {
            action: 'syncPromptWithImage',
            imageData: base64Data,
            imageFormat: 'base64',
            source: 'twitter'
          },
          resolve
        );
      });

      if (response.success) {
        // Update button to success state
        button.classList.remove('syncing');
        button.classList.add('synced');
        button.innerHTML = `
          <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        `;
        button.title = 'Synced to mark my prompt';
        
        utils.showToast('✓ Image prompt extracted and synced!', 'success');

        // Revert button after 2 seconds
        setTimeout(() => {
          button.classList.remove('synced');
          button.innerHTML = originalContent;
          button.disabled = false;
          button.title = 'Sync to mark my prompt';
        }, 2000);
      } else {
        throw new Error(response.error || 'Failed to sync image prompt');
      }
    } catch (error) {
      debugLog('Image sync failed:', error);
      
      // If image sync fails and we have fallback text, try text sync
      if (fallbackText && fallbackText.length >= 10) {
        debugLog('Image extraction failed, falling back to text sync');
        button.classList.remove('syncing');
        button.innerHTML = originalContent;
        button.disabled = false;
        
        // Small delay before attempting text sync
        setTimeout(() => {
          utils.syncPrompt(fallbackText, button);
        }, 500);
        return;
      }
      
      // Handle error without fallback
      button.classList.remove('syncing');
      button.innerHTML = originalContent;
      button.disabled = false;
      
      utils.showToast(`Image sync failed: ${error.message}`, 'error');
    }
  }

  // Observe DOM changes for dynamically loaded tweets
  const observer = new MutationObserver((mutations) => {
    // Debounce the addSyncButtons call
    clearTimeout(observer.timeout);
    observer.timeout = setTimeout(() => {
      addSyncButtons();
    }, 500);
  });

  // Start observing
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });

  // Initial scan after page loads
  setTimeout(addSyncButtons, 2000); // Give Twitter a moment to render

  // Re-scan periodically to catch any missed tweets
  setInterval(addSyncButtons, 5000);

  debugLog('Twitter content script initialization complete');

})();
