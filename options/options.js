// Options page script for Promptean Sync extension

document.addEventListener('DOMContentLoaded', () => {
  const baseUrlInput = document.getElementById('baseUrl');
  const apiKeyInput = document.getElementById('apiKey');
  const verifyBtn = document.getElementById('verifyBtn');
  const saveBtn = document.getElementById('saveBtn');
  const messageDiv = document.getElementById('message');
  const statusSpan = document.getElementById('status');
  const apiKeyStatusSpan = document.getElementById('apiKeyStatus');

  // Load saved settings
  loadSettings();

  // Event listeners
  verifyBtn.addEventListener('click', verifyAndActivate);
  saveBtn.addEventListener('click', saveSettings);

  // Load settings from storage
  function loadSettings() {
    chrome.storage.sync.get(['apiKey', 'baseUrl', 'isActive'], (result) => {
      if (result.baseUrl) {
        baseUrlInput.value = result.baseUrl;
      }
      if (result.apiKey) {
        apiKeyInput.value = result.apiKey;
        apiKeyStatusSpan.textContent = 'Configured (hidden)';
        apiKeyStatusSpan.classList.remove('inactive');
        apiKeyStatusSpan.classList.add('active');
      }
      if (result.isActive) {
        statusSpan.textContent = 'Active';
        statusSpan.classList.remove('inactive');
        statusSpan.classList.add('active');
      }
    });
  }

  // Save settings
  function saveSettings() {
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!baseUrl) {
      showMessage('Please enter a base URL', 'error');
      return;
    }

    if (!apiKey) {
      showMessage('Please enter an API key', 'error');
      return;
    }

    // Save to storage
    chrome.storage.sync.set({
      baseUrl,
      apiKey
    }, () => {
      showMessage('Settings saved successfully!', 'success');
      updateStatus(false); // Mark as inactive until verified
    });
  }

  // Verify API key and activate extension
  function verifyAndActivate() {
    const baseUrl = baseUrlInput.value.trim();
    const apiKey = apiKeyInput.value.trim();

    if (!baseUrl) {
      showMessage('Please enter a base URL', 'error');
      return;
    }

    if (!apiKey) {
      showMessage('Please enter an API key', 'error');
      return;
    }

    // Disable button and show loading
    verifyBtn.disabled = true;
    verifyBtn.textContent = 'Verifying...';
    messageDiv.classList.add('hidden');

    // Send verification request to background script
    chrome.runtime.sendMessage(
      {
        action: 'verifyApiKey',
        apiKey,
        baseUrl
      },
      (response) => {
        verifyBtn.disabled = false;
        verifyBtn.textContent = 'Verify & Activate';

        if (response.success) {
          // Save settings and mark as active
          chrome.storage.sync.set({
            baseUrl,
            apiKey,
            isActive: true
          }, () => {
            showMessage('✓ API key verified! Extension is now active.', 'success');
            updateStatus(true);
            apiKeyStatusSpan.textContent = 'Configured & Verified';
            apiKeyStatusSpan.classList.remove('inactive');
            apiKeyStatusSpan.classList.add('active');
          });
        } else {
          showMessage(`Verification failed: ${response.error}`, 'error');
          updateStatus(false);
        }
      }
    );
  }

  // Show message to user
  function showMessage(text, type) {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.classList.remove('hidden');
  }

  // Update status display
  function updateStatus(isActive) {
    if (isActive) {
      statusSpan.textContent = 'Active';
      statusSpan.classList.remove('inactive');
      statusSpan.classList.add('active');
    } else {
      statusSpan.textContent = 'Inactive';
      statusSpan.classList.remove('active');
      statusSpan.classList.add('inactive');
    }
  }
});
