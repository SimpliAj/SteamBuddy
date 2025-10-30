// background.js
chrome.webNavigation.onCompleted.addListener(function(details) {
  chrome.storage.local.get(['redirectEnabled'], function(result) {
    const redirectEnabled = result.redirectEnabled !== false;
    if (!redirectEnabled) return;

    const url = details.url;
    const steamStorePattern = /^https:\/\/store\.steampowered\.com\/app\/(\d+)/;
    const match = url.match(steamStorePattern);
    
    if (match) {
      const appId = match[1];
      setTimeout(() => {
        chrome.scripting.executeScript({
          target: { tabId: details.tabId },
          func: (appId) => {
            window.location.href = `steam://store/${appId}`;
          },
          args: [appId]
        });
      }, 2000);
    }
  });
}, { url: [{ urlMatches: 'https://store.steampowered.com/app/*' }] });

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'reloadSteamTabs') {
    chrome.tabs.query({ url: 'https://store.steampowered.com/*' }, function(tabs) {
      tabs.forEach(tab => {
        chrome.tabs.reload(tab.id, {}, function() {
          console.log(`Tab ${tab.id} reloaded`);
        });
      });
      sendResponse({ success: true });
    });
    return true;
  } else if (request.action === 'openHelp') {
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
    sendResponse({ success: true });
  }
});