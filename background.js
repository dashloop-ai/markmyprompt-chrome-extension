// Background service worker for Promptean Sync extension

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'verifyApiKey') {
    verifyApiKey(request.apiKey, request.baseUrl)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true; // Keep the message channel open for async response
  }
  
  if (request.action === 'syncPrompt') {
    syncPrompt(request.prompt, request.source)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'syncPromptWithImage') {
    syncPromptWithImage(request.imageData, request.imageFormat, request.source)
      .then(result => sendResponse({ success: true, result }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
  
  if (request.action === 'getConfig') {
    getConfig()
      .then(config => sendResponse({ success: true, config }))
      .catch(error => sendResponse({ success: false, error: error.message }));
    return true;
  }
});

// Verify API key with backend
async function verifyApiKey(apiKey, baseUrl) {
  try {
    const response = await fetch(`${baseUrl}/api/keys/sync/prompts?page=1&per_page=1`, {
      method: 'GET',
      headers: {
        'X-API-Key': apiKey,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      return { valid: true, message: 'API key verified successfully' };
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Invalid API key');
    }
  } catch (error) {
    throw new Error(`Verification failed: ${error.message}`);
  }
}

// Sync prompt to mark my prompt
async function syncPrompt(promptContent, source) {
  try {
    // Get stored configuration
    const config = await getConfig();
    
    if (!config.apiKey) {
      throw new Error('API key not configured. Please set up the extension first.');
    }
    
    if (!config.isActive) {
      throw new Error('Extension is not activated. Please verify your API key.');
    }
    
    const baseUrl = config.baseUrl || 'http://localhost:7070';
    
    // Create prompt object with source tag
    const promptData = {
      prompts: [
        {
          content: promptContent,
          is_public: false,
          tags: [source] // Tag with source platform (chatgpt or gemini)
        }
      ]
    };
    
    const response = await fetch(`${baseUrl}/api/keys/sync/prompts`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        created: result.created,
        message: 'Prompt synced successfully!'
      };
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync prompt');
    }
  } catch (error) {
    throw new Error(`Sync failed: ${error.message}`);
  }
}

// Sync prompt with image to mark my prompt
async function syncPromptWithImage(imageData, imageFormat, source) {
  try {
    // Get stored configuration
    const config = await getConfig();
    
    if (!config.apiKey) {
      throw new Error('API key not configured. Please set up the extension first.');
    }
    
    if (!config.isActive) {
      throw new Error('Extension is not activated. Please verify your API key.');
    }
    
    const baseUrl = config.baseUrl || 'http://localhost:7070';
    
    // Create prompt object with image data
    const promptData = {
      prompts: [
        {
          image_data: imageData,
          image_format: imageFormat,
          is_public: false,
          tags: [source, 'image-extracted'] // Tag with source platform and image indicator
        }
      ]
    };
    
    const response = await fetch(`${baseUrl}/api/keys/sync/prompts`, {
      method: 'POST',
      headers: {
        'X-API-Key': config.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(promptData)
    });
    
    if (response.ok) {
      const result = await response.json();
      return {
        success: true,
        created: result.created,
        message: 'Image prompt extracted and synced successfully!'
      };
    } else {
      const error = await response.json();
      throw new Error(error.error || 'Failed to sync image prompt');
    }
  } catch (error) {
    throw new Error(`Image sync failed: ${error.message}`);
  }
}

// Get stored configuration
async function getConfig() {
  return new Promise((resolve) => {
    chrome.storage.sync.get(['apiKey', 'baseUrl', 'isActive'], (result) => {
      resolve({
        apiKey: result.apiKey || '',
        baseUrl: result.baseUrl || 'http://localhost:7070',
        isActive: result.isActive || false
      });
    });
  });
}

// Save configuration
async function saveConfig(config) {
  return new Promise((resolve) => {
    chrome.storage.sync.set(config, () => {
      resolve();
    });
  });
}

// Listen for extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log('mark my prompt Sync extension installed');
  
  // Set default configuration
  getConfig().then(config => {
    if (!config.baseUrl) {
      saveConfig({ baseUrl: 'http://localhost:7070', isActive: false });
    }
  });
});
