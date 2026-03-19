document.addEventListener('DOMContentLoaded', function() {
  // ========== TAB SWITCHING ==========
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');

  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Remove active class from all
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      // Add active class to selected
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // Save active tab
      chrome.storage.local.set({ activeTab: tabName });
    });
  });

  // Load last active tab
  chrome.storage.local.get(['activeTab'], function(result) {
    const activeTab = result.activeTab || 'main';
    const tabButton = document.querySelector(`[data-tab="${activeTab}"]`);
    if (tabButton) {
      tabButton.click();
    }
  });

  // ========== MAIN TAB ELEMENTS ==========
  const toggle = document.getElementById('toggleRedirect');
  const toggleLabel = document.getElementById('toggleLabel');
  const statusIcon = document.getElementById('statusIcon');
  const freeGamesButton = document.getElementById('freeGamesButton');
  const epicGamesButton = document.getElementById('epicGamesButton');
  const reviewToggle = document.getElementById('toggleReviewBadge');
  const reviewToggleLabel = document.getElementById('reviewToggleLabel');
  const helpButton = document.getElementById('helpButton');

  // ========== AUTO-CLAIM TAB ELEMENTS ==========
  const autoClaimToggle = document.getElementById('toggleAutoClaim');
  const autoClaimLabel = document.getElementById('autoClaimLabel');
  const claimFrequencySelect = document.getElementById('claimFrequency');
  const frequencyContainer = document.getElementById('frequencyContainer');
  const platformContainer = document.getElementById('platformContainer');
  const steamCheckbox = document.getElementById('steamCheckbox');
  const epicCheckbox = document.getElementById('epicCheckbox');

  // ========== SETTINGS TAB ELEMENTS ==========
  const discordWebhookInput = document.getElementById('discordWebhookUrl');
  const testDiscordButton = document.getElementById('testDiscordButton');
  const clearDiscordButton = document.getElementById('clearDiscordButton');
  
  // Debug
  console.log('toggle:', toggle);
  console.log('toggleLabel:', toggleLabel);
  console.log('statusIcon:', statusIcon);
  console.log('freeGamesButton:', freeGamesButton);
  console.log('autoClaimToggle:', autoClaimToggle);
  console.log('helpButton:', helpButton);
  console.log('discordWebhookInput:', discordWebhookInput);

  if (!toggle || !toggleLabel || !statusIcon || !freeGamesButton || !autoClaimToggle || !helpButton) {
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

  // Load Auto-Claim Settings
  chrome.storage.local.get(['autoClaimEnabled', 'autoClaimFrequency', 'autoClaimSteam', 'autoClaimEpic'], function(result) {
    const autoClaimEnabled = result.autoClaimEnabled === true;
    const frequency = result.autoClaimFrequency || 'daily';
    const autoClaimSteam = result.autoClaimSteam !== false;
    const autoClaimEpic = result.autoClaimEpic === true;
    
    autoClaimToggle.checked = autoClaimEnabled;
    autoClaimLabel.textContent = autoClaimEnabled ? 'Auto-Claim On' : 'Auto-Claim Off';
    claimFrequencySelect.value = frequency;
    frequencyContainer.style.display = autoClaimEnabled ? 'block' : 'none';
    platformContainer.style.display = autoClaimEnabled ? 'block' : 'none';
    steamCheckbox.checked = autoClaimSteam;
    epicCheckbox.checked = autoClaimEpic;
    
    console.log('Initial autoClaimEnabled:', autoClaimEnabled);
    console.log('Initial autoClaimFrequency:', frequency);
    console.log('Initial autoClaimSteam:', autoClaimSteam);
    console.log('Initial autoClaimEpic:', autoClaimEpic);
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

  // Save Steam Reviews
  reviewToggle.addEventListener('change', function() {
    const isReviewEnabled = reviewToggle.checked;
    chrome.storage.local.set({ reviewBadgeEnabled: isReviewEnabled });
    reviewToggleLabel.textContent = isReviewEnabled ? 'Steam Reviews On' : 'Steam Reviews Off';
  });

  // Save Auto-Claim Toggle
  autoClaimToggle.addEventListener('change', function() {
    const isAutoClaimEnabled = autoClaimToggle.checked;
    chrome.storage.local.set({ autoClaimEnabled: isAutoClaimEnabled });
    autoClaimLabel.textContent = isAutoClaimEnabled ? 'Auto-Claim On' : 'Auto-Claim Off';
    frequencyContainer.style.display = isAutoClaimEnabled ? 'block' : 'none';
    platformContainer.style.display = isAutoClaimEnabled ? 'block' : 'none';
    
    chrome.runtime.sendMessage({ action: 'updateAutoClaimSettings' }, function(response) {
      if (response && response.success) {
        console.log('Auto-Claim settings updated');
      }
    });
  });

  // Save Platform Selections
  steamCheckbox.addEventListener('change', function() {
    chrome.storage.local.set({ autoClaimSteam: steamCheckbox.checked });
    console.log('Auto-Claim Steam:', steamCheckbox.checked);
    chrome.runtime.sendMessage({ action: 'updateAutoClaimSettings' });
  });

  epicCheckbox.addEventListener('change', function() {
    chrome.storage.local.set({ autoClaimEpic: epicCheckbox.checked });
    console.log('Auto-Claim Epic:', epicCheckbox.checked);
    chrome.runtime.sendMessage({ action: 'updateAutoClaimSettings' });
  });

  // Save Claim Frequency
  claimFrequencySelect.addEventListener('change', function() {
    const frequency = claimFrequencySelect.value;
    chrome.storage.local.set({ autoClaimFrequency: frequency });
    console.log('Claim frequency changed to:', frequency);
    
    chrome.runtime.sendMessage({ action: 'updateAutoClaimSettings' }, function(response) {
      if (response && response.success) {
        console.log('Auto-Claim frequency updated');
      }
    });
  });
  
  // Free Games Button - Steam
  freeGamesButton.addEventListener('click', function() {
    console.log('Steam Free Games button clicked');
    try {
      window.open('https://store.steampowered.com/search?maxprice=free&specials=1&ndl=1', '_blank');
    } catch (error) {
      console.error('Error opening Steam URL:', error);
    }
  });

  // Epic Games Button - Epic
  epicGamesButton.addEventListener('click', function() {
    console.log('Epic Free Games button clicked');
    try {
      window.open('https://store.epicgames.com/en-US/free-games', '_blank');
    } catch (error) {
      console.error('Error opening Epic Games URL:', error);
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

  // ========== DISCORD WEBHOOK FUNCTIONS ==========
  
  // Load Discord Webhook URL
  chrome.storage.local.get(['discordWebhookUrl'], function(result) {
    const webhookUrl = result.discordWebhookUrl || '';
    discordWebhookInput.value = webhookUrl;
    console.log('Discord webhook URL loaded');
  });

  // Save Discord Webhook URL
  discordWebhookInput.addEventListener('change', function() {
    const webhookUrl = discordWebhookInput.value.trim();
    chrome.storage.local.set({ discordWebhookUrl: webhookUrl });
    console.log('Discord webhook URL saved:', webhookUrl ? 'Set' : 'Empty');
  });

  // Test Discord Webhook
  testDiscordButton.addEventListener('click', function() {
    const webhookUrl = discordWebhookInput.value.trim();
    
    if (!webhookUrl) {
      alert('Please enter a Discord webhook URL first');
      return;
    }

    testDiscordButton.disabled = true;
    testDiscordButton.textContent = 'Testing...';

    const embed = {
      title: '🧪 SteamBuddy Test',
      description: 'This is a test message from SteamBuddy extension',
      color: 0x00FF00,
      timestamp: new Date().toISOString(),
      footer: {
        text: 'SteamBuddy Auto-Claim'
      }
    };

    fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    })
    .then(response => {
      if (response.ok) {
        alert('✅ Webhook test successful!');
      } else {
        alert('❌ Webhook test failed: ' + response.statusText);
      }
    })
    .catch(error => {
      alert('❌ Error testing webhook: ' + error.message);
      console.error('Webhook test error:', error);
    })
    .finally(() => {
      testDiscordButton.disabled = false;
      testDiscordButton.textContent = 'Test Webhook';
    });
  });

  // Clear Discord Webhook
  clearDiscordButton.addEventListener('click', function() {
    if (confirm('Are you sure you want to clear the Discord webhook URL?')) {
      discordWebhookInput.value = '';
      chrome.storage.local.set({ discordWebhookUrl: '' });
      console.log('Discord webhook URL cleared');
    }
  });

  // ========== MAKE TOGGLE SWITCHES CLICKABLE ==========
  document.querySelectorAll('.toggle-switch').forEach(toggleSwitch => {
    toggleSwitch.addEventListener('click', function(e) {
      e.stopPropagation();
      
      const checkbox = this.previousElementSibling;
      if (checkbox && checkbox.classList.contains('toggle-checkbox')) {
        checkbox.checked = !checkbox.checked;
        checkbox.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  });
});
