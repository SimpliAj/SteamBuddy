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
  if (request.action === 'openHelp') {
    chrome.tabs.create({ url: chrome.runtime.getURL('help.html') });
    sendResponse({ success: true });
  }
});

// ============================================
// STEAM AUTO-CLAIM SYSTEM
// ============================================

const ALARM_NAME = "steamAutoClaim";

chrome.runtime.onStartup.addListener(() => {
  initializeAlarms();
});

chrome.runtime.onInstalled.addListener(() => {
  initializeAlarms();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    handleAlarmTriggered();
  }
});

function initializeAlarms() {
  chrome.storage.local.get(['autoClaimEnabled', 'autoClaimFrequency'], function(result) {
    const autoClaimEnabled = result.autoClaimEnabled === true;
    const frequency = result.autoClaimFrequency || 'daily';

    if (!autoClaimEnabled) {
      chrome.alarms.clear(ALARM_NAME);
      return;
    }

    const frequencyMap = {
      'browser_start': 0,
      'hourly': 60,
      'every_6h': 360,
      'every_12h': 720,
      'daily': 1440
    };

    const minutes = frequencyMap[frequency];

    if (minutes > 0) {
      chrome.alarms.create(ALARM_NAME, { periodInMinutes: minutes });
      console.log(`Auto-Claim Alarm gesetzt: Alle ${minutes} Minuten`);
    }
  });
}

function handleAlarmTriggered() {
  chrome.storage.local.get(['autoClaimEnabled', 'autoClaimSteam', 'autoClaimEpic'], function(result) {
    if (result.autoClaimEnabled !== true) {
      console.log('Auto-Claim ist deaktiviert');
      return;
    }

    const autoClaimSteam = result.autoClaimSteam !== false;
    const autoClaimEpic = result.autoClaimEpic === true;

    console.log('🎮 Auto-Claim Alarm ausgelöst');
    console.log(`Steam: ${autoClaimSteam}, Epic: ${autoClaimEpic}`);

    if (autoClaimSteam) {
      console.log('📂 Starte Steam Auto-Claim...');
      startSteamAutoClaim();
    }

    if (autoClaimEpic) {
      console.log('📂 Starte Epic Games Auto-Claim...');
      startEpicAutoClaim();
    }
  });
}

function startSteamAutoClaim() {
  const STEAM_FREE_GAMES_URL = 'https://store.steampowered.com/search/?sort_by=Price_ASC&maxprice=free&category1=998&specials=1&ndl=1';
  
  chrome.storage.local.get(['redirectEnabled'], function(result) {
    chrome.storage.local.set({ redirectEnabled: false });
    console.log('🔒 Redirect temporär deaktiviert für Auto-Claim');
  });
  
  chrome.tabs.create({ url: STEAM_FREE_GAMES_URL }, (tab) => {
    if (!tab || !tab.id) {
      console.error('❌ Steam Tab konnte nicht erstellt werden');
      showNotification('Error', 'Could not open Steam tab', 'error');
      chrome.storage.local.set({ redirectEnabled: true });
      return;
    }
    
    console.log(`📂 Steam Tab ${tab.id} erstellt, warte auf vollständiges Laden...`);
    
    const tabLoadListener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(tabLoadListener);
        
        console.log(`✅ Steam Tab ${tab.id} vollständig geladen, sende Auto-Claim Signal...`);
        
        setTimeout(() => {
          sendAutoClaimMessage(tab.id, 0, 'steam');
        }, 1000);
      }
    };
    
    chrome.tabs.onUpdated.addListener(tabLoadListener);
    
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(tabLoadListener);
      console.warn('⏱️ Steam Tab-Loading Timeout nach 10s, versuche trotzdem...');
      sendAutoClaimMessage(tab.id, 0, 'steam');
    }, 10000);
    
    setTimeout(() => {
      chrome.storage.local.set({ redirectEnabled: true });
      console.log('🔓 Redirect wieder aktiviert nach Auto-Claim');
    }, 30 * 60 * 1000);
  });
}

function startEpicAutoClaim() {
  const EPIC_FREE_GAMES_URL = 'https://www.epicgames.com/store/en-US/free-games';
  
  chrome.tabs.create({ url: EPIC_FREE_GAMES_URL }, (tab) => {
    if (!tab || !tab.id) {
      console.error('❌ Epic Games Tab konnte nicht erstellt werden');
      showNotification('Error', 'Could not open Epic Games tab', 'error');
      return;
    }
    
    console.log(`📂 Epic Games Tab ${tab.id} erstellt, warte auf vollständiges Laden...`);
    
    const tabLoadListener = (tabId, changeInfo) => {
      if (tabId === tab.id && changeInfo.status === 'complete') {
        chrome.tabs.onUpdated.removeListener(tabLoadListener);
        
        console.log(`✅ Epic Games Tab ${tab.id} vollständig geladen, sende Auto-Claim Signal...`);
        
        setTimeout(() => {
          sendAutoClaimMessage(tab.id, 0, 'epic');
        }, 1000);
      }
    };
    
    chrome.tabs.onUpdated.addListener(tabLoadListener);
    
    setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(tabLoadListener);
      console.warn('⏱️ Epic Games Tab-Loading Timeout nach 10s, versuche trotzdem...');
      sendAutoClaimMessage(tab.id, 0, 'epic');
    }, 10000);
  });
}

function sendAutoClaimMessage(tabId, retryCount, platform = 'steam') {
  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;
  
  chrome.tabs.sendMessage(tabId, { 
    action: 'startAutoClaimProcess',
    platform: platform
  }).then(() => {
    console.log(`✅ ${platform.toUpperCase()} Auto-Claim Message erfolgreich gesendet zu Tab ${tabId}`);
  }).catch(err => {
    console.warn(`⚠️ ${platform.toUpperCase()} Auto-Claim Message fehlgeschlagen (Versuch ${retryCount + 1}/${MAX_RETRIES}):`, err.message);
    
    if (retryCount < MAX_RETRIES) {
      console.log(`🔄 Versuche in ${RETRY_DELAY}ms erneut...`);
      setTimeout(() => {
        sendAutoClaimMessage(tabId, retryCount + 1, platform);
      }, RETRY_DELAY);
    } else {
      console.error(`❌ ${platform.toUpperCase()} Auto-Claim konnte nicht gestartet werden nach ${MAX_RETRIES} Versuchen`);
      showNotification('Auto-Claim Error', `Could not start ${platform} auto-claim. Please try manually.`, 'error');
    }
  });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateAutoClaimSettings') {
    initializeAlarms();
    sendResponse({ success: true });
  } else if (request.action === 'showNotification') {
    showNotification(request.title, request.message, request.type);
    sendResponse({ success: true });
  }
});

function showNotification(title, message, type = 'info') {
  const iconUrl = type === 'error' ? 'OIS-offline.png' : 'OIS-active.png';
  
  chrome.notifications.create({
    type: 'basic',
    iconUrl: iconUrl,
    title: title,
    message: message,
    priority: type === 'error' ? 2 : 1
  });
}

// ============================================
// DISCORD WEBHOOK FUNCTIONS
// ============================================

async function sendDiscordEmbed(webhookUrl, title, description, gamesList = [], color = 0x3498db) {
  if (!webhookUrl || !webhookUrl.trim()) {
    console.log('Discord webhook URL not configured, skipping notification');
    return;
  }

  try {
    const embed = {
      title: title,
      description: description,
      color: color,
      timestamp: new Date().toISOString(),
      fields: [],
      footer: {
        text: 'SteamBuddy Auto-Claim'
      }
    };

    if (gamesList && gamesList.length > 0) {
      const gameText = gamesList.slice(0, 25).join('\n');
      embed.fields.push({
        name: `Games (${gamesList.length})`,
        value: gameText || 'No games',
        inline: false
      });
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ Discord embed sent successfully');
  } catch (error) {
    console.error('❌ Failed to send Discord embed:', error.message);
  }
}
