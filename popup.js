// popup.js
document.addEventListener('DOMContentLoaded', function() {
  const toggle = document.getElementById('toggleRedirect');
  const toggleLabel = document.getElementById('toggleLabel');
  const statusIcon = document.getElementById('statusIcon');
  const freeGamesButton = document.getElementById('freeGamesButton');
  const reviewToggle = document.getElementById('toggleReviewBadge');
  const reviewToggleLabel = document.getElementById('reviewToggleLabel');
  const helpButton = document.getElementById('helpButton');
  
  // Debug
  console.log('toggle:', toggle);
  console.log('toggleLabel:', toggleLabel);
  console.log('statusIcon:', statusIcon);
  console.log('freeGamesButton:', freeGamesButton);
  console.log('reviewToggle:', reviewToggle);
  console.log('reviewToggleLabel:', reviewToggleLabel);
  console.log('helpButton:', helpButton);

  if (!toggle || !toggleLabel || !statusIcon || !freeGamesButton || !reviewToggle || !reviewToggleLabel || !helpButton) {
    console.error('Error: One or more elements not found in popup.html');
    return;
  }
  
  // Load Redirect
  chrome.storage.local.get(['redirectEnabled'], function(result) {
    const isEnabled = result.redirectEnabled !== false;
    toggle.checked = isEnabled;
    toggleLabel.textContent = isEnabled ? 'Open in Steam Deactivate' : 'Open in Steam Activate';
    statusIcon.src = isEnabled ? 'OIS-active.png' : 'OIS-offline.png';
    console.log('Initial redirectEnabled:', isEnabled);
    
    chrome.action.setIcon({
      path: {
        "16": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "32": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "48": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "128": isEnabled ? "OIS-active.png" : "OIS-offline.png"
      }
    });
  });

  // Load Steam Reviews
  chrome.storage.local.get(['reviewBadgeEnabled'], function(result) {
    const isReviewEnabled = result.reviewBadgeEnabled !== false;
    reviewToggle.checked = isReviewEnabled;
    reviewToggleLabel.textContent = isReviewEnabled ? 'Steam Reviews On' : 'Steam Reviews Off';
    console.log('Initial reviewBadgeEnabled:', isReviewEnabled);
  });
  
  // Save Redirect
  toggle.addEventListener('change', function() {
    const isEnabled = toggle.checked;
    chrome.storage.local.set({ redirectEnabled: isEnabled });
    toggleLabel.textContent = isEnabled ? 'Open in Steam Deactivate' : 'Open in Steam Activate';
    statusIcon.src = isEnabled ? 'OIS-active.png' : 'OIS-offline.png';
    
    chrome.action.setIcon({
      path: {
        "16": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "32": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "48": isEnabled ? "OIS-active.png" : "OIS-offline.png",
        "128": isEnabled ? "OIS-active.png" : "OIS-offline.png"
      }
    });
  });

  // Save Steam Reviews and reload Steam tabs
  reviewToggle.addEventListener('change', function() {
    const isReviewEnabled = reviewToggle.checked;
    chrome.storage.local.set({ reviewBadgeEnabled: isReviewEnabled });
    reviewToggleLabel.textContent = isReviewEnabled ? 'Steam Reviews On' : 'Steam Reviews Off';
    
    chrome.runtime.sendMessage({ action: 'reloadSteamTabs' }, function(response) {
      if (response && response.success) {
        console.log('Steam tabs reload requested successfully');
      } else {
        console.error('Error requesting Steam tabs reload');
      }
    });
  });
  
  // Free Games Button
  freeGamesButton.addEventListener('click', function() {
    console.log('Button clicked, attempting to open URL');
    try {
      window.open('https://store.steampowered.com/search?maxprice=free&specials=1&ndl=1', '_blank');
      console.log('URL opened successfully');
    } catch (error) {
      console.error('Error opening URL:', error);
    }
  });

  // Help Button
  helpButton.addEventListener('click', function() {
    chrome.runtime.sendMessage({ action: 'openHelp' }, function(response) {
      if (response && response.success) {
        console.log('Help page opened');
      }
    });
  });
});