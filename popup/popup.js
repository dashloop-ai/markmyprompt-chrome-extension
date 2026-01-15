// Popup script

document.addEventListener('DOMContentLoaded', () => {
  const statusBadge = document.getElementById('status');

  // Load and display current status
  chrome.storage.sync.get(['isActive'], (result) => {
    if (result.isActive) {
      statusBadge.textContent = 'Active';
      statusBadge.classList.remove('inactive');
      statusBadge.classList.add('active');
    } else {
      statusBadge.textContent = 'Inactive';
      statusBadge.classList.remove('active');
      statusBadge.classList.add('inactive');
    }
  });

  // Open settings when clicking the settings button
  const settingsButton = document.querySelector('.button');
  settingsButton.addEventListener('click', (e) => {
    e.preventDefault();
    chrome.runtime.openOptionsPage();
  });
});
