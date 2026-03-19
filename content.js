const isGamePage = window.location.href.match(/^https:\/\/store\.steampowered\.com\/app\/(\d+)/);
const isChartsPage = window.location.href.match(/^https:\/\/store\.steampowered\.com\/charts\/topselling/);

// Redirect-Logik für Steam-Links
chrome.storage.local.get(['redirectEnabled'], function(result) {
  const redirectEnabled = result.redirectEnabled !== false;
  if (!redirectEnabled) return;

  document.addEventListener('click', function(event) {
    let target = event.target;
    while (target && target.tagName !== 'A') {
      target = target.parentElement;
    }
    
    if (target && target.tagName === 'A') {
      let url = target.href;
      
      const steamStorePattern = /^https:\/\/store\.steampowered\.com\/app\/(\d+)/;
      let match = url.match(steamStorePattern);
      
      const patchBotPattern = /^https:\/\/patchbot\.io\/click\/(.+)/;
      if (!match && url.match(patchBotPattern)) {
        try {
          const encodedPart = url.match(patchBotPattern)[1];
          const decodedUrl = decodeURIComponent(encodedPart.split('|')[2]);
          match = decodedUrl.match(steamStorePattern);
        } catch (e) {
          console.error('Error decoding PatchBot URL:', e);
        }
      }
      
      if (match) {
        event.preventDefault();
        const appId = match[1];
        window.location.href = `steam://store/${appId}`;
      }
    }
  });
});

// Automatischer Age-Check für Steam
function handleAgeCheck() {
  const isAgeCheckPage = window.location.href.match(/^https:\/\/store\.steampowered\.com\/agecheck\/app\/(\d+)/);
  if (!isAgeCheckPage) return;

  console.log('Altersverifikationsseite erkannt:', window.location.href);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', performAgeCheck);
  } else {
    performAgeCheck();
  }

  function performAgeCheck() {
    const daySelect = document.querySelector('#ageDay');
    const monthSelect = document.querySelector('#ageMonth');
    const yearSelect = document.querySelector('#ageYear');
    const submitButton = document.querySelector('#view_product_page_btn');

    if (!daySelect || !monthSelect || !yearSelect || !submitButton) {
      console.error('Altersverifikationsformular-Elemente nicht gefunden');
      return;
    }

    daySelect.value = '1';
    monthSelect.value = 'January';
    yearSelect.value = new Date().getFullYear() - 18;

    console.log('Altersverifikationsformular ausgefüllt:', {
      day: daySelect.value,
      month: monthSelect.value,
      year: yearSelect.value
    });

    submitButton.click();
    console.log('Altersverifikation abgeschickt');
  }
}

handleAgeCheck();

// Hilfsfunktion: Levenshtein-Distanz für String-Ähnlichkeit
function levenshteinDistance(str1, str2) {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= str1.length; j++) {
    matrix[0][j] = j;
  }
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[str2.length][str1.length];
}

// Bewertungsübersicht nur mit Steam-Reviews
async function showRatingsOverview(appId, titleElement, parentElement = titleElement) {
  if (!appId || !titleElement) {
    console.error('Fehlende App-ID oder Titel-Element für Bewertungsübersicht', { appId, titleElement });
    return;
  }
  console.log('Lade Bewertungsübersicht für App-ID:', appId);

  // Steam Reviews lokal fetchen
  let reviewData = null;
  try {
    const reviewUrl = `https://store.steampowered.com/appreviews/${appId}?json=1&num_reviews=1&filter=recent&language=english`;
    const reviewResponse = await fetch(reviewUrl, { signal: AbortSignal.timeout(5000) });
    reviewData = await reviewResponse.json();
    console.log('Steam Reviews geladen:', reviewData.query_summary);
  } catch (reviewError) {
    console.error('Fehler bei Steam Reviews:', reviewError);
  }

  // Badge anzeigen
  displayRatingsBadge(appId, reviewData, titleElement, parentElement);
}

// Hilfsfunktion: Badge anzeigen
function displayRatingsBadge(appId, reviewData, titleElement, parentElement) {
  const gameTitle = document.querySelector('#appHubAppName')?.textContent?.trim() || 'Unbekannt';

  const badge = document.createElement('div');
  badge.style.cssText = `
    background-color: rgba(139, 92, 246, 0.5);
    color: white;
    padding: 8px 12px;
    border-radius: 4px;
    margin-top: 8px;
    font-size: 14px;
    border: 1px solid #7c3aed;
    display: flex;
    flex-direction: column;
    gap: 4px;
  `;

  let badgeContent = `
    <div>⭐ Review summary for ${gameTitle}</div>
    <ul style="margin: 0; padding-left: 20px; font-size: 12px;">
  `;

  // Steam Reviews
  if (reviewData?.query_summary) {
    const scoreDesc = reviewData.query_summary.review_score_desc || 'N/A';
    const positive = reviewData.query_summary.total_positive || 0;
    const total = reviewData.query_summary.total_reviews || 0;
    const percentage = total > 0 ? Math.round((positive / total) * 100) : 0;
    badgeContent += `<li>Steam-Reviews: ${percentage}% ${scoreDesc} (${total.toLocaleString()} Reviews)</li>`;
  } else {
    badgeContent += `<li>Steam-Reviews: Not available</li>`;
  }

  badgeContent += '</ul>';
  badge.innerHTML = badgeContent;

  if (parentElement && parentElement.parentNode) {
    parentElement.parentNode.insertBefore(badge, parentElement.nextSibling);
  } else {
    const appHub = document.querySelector('#appHubAppName');
    if (appHub) appHub.parentNode.insertBefore(badge, appHub.nextSibling);
  }

  console.log('Bewertungs-Badge hinzugefügt für App-ID:', appId);
}

// Review-Badge für Spielseiten mit Toggle-Prüfung anzeigen
chrome.storage.local.get(['reviewBadgeEnabled'], function(result) {
  const reviewBadgeEnabled = result.reviewBadgeEnabled !== false; // Standardmäßig an
  if (!reviewBadgeEnabled) return;

  if (isGamePage) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const titleElement = document.querySelector('#appHubAppName');
        const appId = window.location.href.match(/^https:\/\/store\.steampowered\.com\/app\/(\d+)/)?.[1];
        if (appId && titleElement) {
          showRatingsOverview(appId, titleElement);
        } else {
          console.error('Konnte App-ID oder Titel-Element nicht finden:', { appId, titleElement });
        }
      });
    } else {
      const titleElement = document.querySelector('#appHubAppName');
      const appId = window.location.href.match(/^https:\/\/store\.steampowered\.com\/app\/(\d+)/)?.[1];
      if (appId && titleElement) {
        showRatingsOverview(appId, titleElement);
      } else {
        console.error('Konnte App-ID oder Titel-Element nicht finden:', { appId, titleElement });
      }
    }
  }
});

// ============================================
// STEAM AUTO-CLAIM FUNCTIONALITY
// ============================================

// Listener für Auto-Claim Messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'startAutoClaimProcess') {
    const platform = request.platform || 'steam';
    console.log(`🚀 Auto-Claim Prozess gestartet (${platform.toUpperCase()}) auf:`, window.location.href);
    console.log(`📍 URL: ${window.location.href}`);
    console.log(`🔗 Expected URL: ${platform === 'steam' ? 'https://store.steampowered.com' : 'https://www.epicgames.com'}`);
    
    if (platform === 'steam') {
      startSteamAutoClaim().then(() => {
        console.log('✅ Steam Auto-Claim erfolgreich abgeschlossen');
        sendResponse({ success: true });
      }).catch(err => {
        console.error('❌ Steam Auto-Claim Fehler:', err);
        sendResponse({ success: false, error: err.message });
      });
    } else if (platform === 'epic') {
      startEpicAutoClaim().then(() => {
        console.log('✅ Epic Games Auto-Claim erfolgreich abgeschlossen');
        sendResponse({ success: true });
      }).catch(err => {
        console.error('❌ Epic Games Auto-Claim Fehler:', err);
        sendResponse({ success: false, error: err.message });
      });
    }
    
    return true; // Sagt Chrome dass wir später antworten werden
  }
});

async function startSteamAutoClaim() {
  try {
    // Prüfe ob User eingeloggt ist
    const isLoggedIn = isSteamLoggedIn();
    if (!isLoggedIn) {
      console.error('❌ Steam: Benutzer nicht eingeloggt!');
      showNotification('❌ Steam Login Required', 'Please login to Steam Store to use auto-claim', 'error');
      throw new Error('User not logged in to Steam');
    }

    console.log('✅ Steam: Benutzer eingeloggt');

    // Warte bis Seite vollständig geladen ist
    if (document.readyState === 'loading') {
      console.log('⏳ Warte auf DOMContentLoaded...');
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    console.log('🔍 Suche nach kostenlosen Steam Spielen...');

    // Finde alle kostenlosen Spiele
    const gameRows = document.querySelectorAll('a.search_result_row');
    console.log(`✅ ${gameRows.length} Spiele gefunden`);

    if (gameRows.length === 0) {
      console.warn('⚠️ Keine Spiele auf dieser Seite gefunden');
      return;
    }

    let claimedCount = 0;
    let skippedCount = 0;
    let claimedGames = [];

    for (let i = 0; i < gameRows.length; i++) {
      const gameRow = gameRows[i];
      
      try {
        // Prüfe ob Spiel bereits in Library
        const ownedBadge = gameRow.querySelector('.ds_owned');
        if (ownedBadge) {
          console.log(`⏭️ [${i + 1}/${gameRows.length}] Spiel bereits in Library, überspringe`);
          skippedCount++;
          continue;
        }

        const gameTitle = gameRow.querySelector('span.title')?.textContent || 'Unknown';
        console.log(`\n🎮 [${i + 1}/${gameRows.length}] Verarbeite: ${gameTitle}`);

        // Klicke auf Spiel um zur Detailseite zu gehen
        gameRow.click();
        
        // Warte bis neue Seite lädt
        console.log('⏳ Warte 2 Sekunden auf Seite...');
        await sleep(2000);

        // Navigiere zur eigentlichen Seite wenn nötig
        const gameUrl = gameRow.href;
        if (gameUrl) {
          console.log(`📂 Navigiere zu: ${gameUrl}`);
          window.location.href = gameUrl;
          
          // Warte auf neue Seite
          await sleep(3000);
          
          // Mache Auto-Claim auf der Game-Seite
          const claimed = await performSteamClaimOnGamePage();
          
          if (claimed) {
            claimedCount++;
            claimedGames.push(gameTitle);
            console.log(`✅ Erfolgreich claimed! (${claimedCount} insgesamt)`);
          }
          
          // Kurze Pause vor nächstem Spiel um nicht gebannt zu werden
          console.log('⏱️ Pause von 5 Sekunden...');
          await sleep(5000);
          
          // Gehe zurück zur Free Games Liste
          console.log('⬅️ Gehe zurück zur Liste...');
          window.history.back();
          await sleep(2000);
        }
      } catch (err) {
        console.error(`❌ Fehler bei Spiel ${i + 1}:`, err);
      }
    }

    console.log(`\n✅ Steam Auto-Claim abgeschlossen!`);
    console.log(`📊 Zusammenfassung: ${claimedCount} claimed, ${skippedCount} übersprungen, ${gameRows.length - claimedCount - skippedCount} Fehler`);
    
    // Sende Discord Nachricht IMMER (ob erfolgreich oder nicht)
    try {
      if (claimedCount > 0) {
        await sendToDiscord('✅ Steam Auto-Claim Success', `Successfully claimed ${claimedCount} game(s)!`, claimedGames, 0x2ECC71);
        showNotification('✅ Steam Auto-Claim Complete', `${claimedCount} games claimed!`, 'success');
      } else {
        await sendToDiscord('ℹ️ Steam Auto-Claim Status', 'No new games available to claim. All games already in library.', [], 0x3498db);
        showNotification('ℹ️ Steam Auto-Claim Complete', 'No new games available.', 'info');
      }
    } catch (discordErr) {
      console.error('❌ Fehler beim Senden der Discord Nachricht:', discordErr);
      // Fallback notification
      showNotification('✅ Steam Auto-Claim Complete', `${claimedCount} games claimed!`, 'success');
    }
  } catch (err) {
    console.error('❌ Kritischer Fehler im Steam Auto-Claim Prozess:', err);
    // Sende Error zu Discord
    try {
      await sendToDiscord('❌ Steam Auto-Claim Error', `An error occurred: ${err.message}`, [], 0xE74C3C);
    } catch (e) {
      console.error('Discord Error Notification auch fehlgeschlagen:', e);
    }
    showNotification('❌ Steam Auto-Claim Error', err.message || 'Unknown error', 'error');
  }
}

function isSteamLoggedIn() {
  // Prüfe mehrere Indikatoren
  // 1. Prüfe ob Login-Link existiert
  const noLoginElement = document.querySelector('[href*="login"]');
  if (noLoginElement && noLoginElement.textContent.toLowerCase().includes('login')) {
    return false;
  }
  
  // 2. Prüfe ob Account-Menu existiert
  const accountElement = document.querySelector('#account_pulldown, .profile_link, [href*="/account/"]');
  if (accountElement) {
    return true;
  }
  
  // 3. Prüfe ob bestimmte Elemente für angemeldete User existieren
  const loggedInElement = document.querySelector('.global_header_menu_button, .login_area');
  if (loggedInElement && loggedInElement.textContent.includes('account')) {
    return true;
  }
  
  // Default: Annahme dass nicht eingeloggt
  return false;
}

async function performSteamClaimOnGamePage() {
  try {
    console.log('🔎 Suche nach "Add to Account" Button...');

    // Warte bis die Seite geladen ist
    await sleep(1500);

    // Finde den "Add to Account" Button
    const buyButtons = document.querySelectorAll('div.game_area_purchase_game');
    
    if (buyButtons.length === 0) {
      console.warn('⚠️ Keine Purchase-Buttons gefunden');
      return false;
    }
    
    console.log(`Found ${buyButtons.length} purchase buttons`);
    
    for (const buyButton of buyButtons) {
      try {
        // Prüfe ob Spiel kostenlos ist (100% Rabatt)
        const priceElement = buyButton.querySelector('div.discount_pct');
        
        if (priceElement && priceElement.textContent.trim() === '-100%') {
          console.log('💰 Kostenloses Spiel gefunden!');

          // Suche nach "Add to Account" Link
          const addToAccountButton = buyButton.querySelector('div.btn_addtocart a');
          
          if (addToAccountButton) {
            console.log('🖱️ Add to Account Button gefunden, klicke...');
            
            // Extrahiere appId aus href wenn möglich
            const href = addToAccountButton.getAttribute('href') || '';
            const match = href.match(/javascript:\s*addToCart\(\s*(\d+)\s*\)/);
            
            if (match) {
              const appId = match[1];
              console.log(`📦 Rufe addToCart mit appId: ${appId}`);
              
              // Rufe die addToCart Funktion auf
              if (typeof window.addToCart === 'function') {
                window.addToCart(appId);
                console.log('✅ addToCart erfolgreich aufgerufen');
                await sleep(2000);
                return true;
              } else if (typeof window.AddToCart === 'function') {
                window.AddToCart(appId);
                console.log('✅ AddToCart erfolgreich aufgerufen');
                await sleep(2000);
                return true;
              } else {
                console.warn('⚠️ addToCart Funktion nicht gefunden, versuche direkten Klick...');
                addToAccountButton.click();
                console.log('✅ Button direkt geklickt');
                await sleep(2000);
                return true;
              }
            } else {
              console.warn('⚠️ appId konnte nicht extrahiert werden, versuche direkten Klick...');
              addToAccountButton.click();
              console.log('✅ Button direkt geklickt (Fallback)');
              await sleep(2000);
              return true;
            }
          } else {
            console.warn('⚠️ Add to Account Button nicht gefunden');
          }
        } else if (priceElement) {
          console.log(`⏭️ Spiel kostet: ${priceElement.textContent}`);
        } else {
          console.log('⏭️ Keine Preis-Info gefunden');
        }
      } catch (err) {
        console.error('❌ Fehler bei Button:', err);
      }
    }

    console.log('⚠️ Kein kostenloses Spiel auf dieser Seite gefunden');
    return false;
  } catch (err) {
    console.error('❌ Fehler bei performSteamClaimOnGamePage:', err);
    return false;
  }
}

// ============================================
// EPIC GAMES AUTO-CLAIM FUNCTIONALITY
// ============================================

async function startEpicAutoClaim() {
  try {
    // Prüfe ob User eingeloggt ist
    const isLoggedIn = isEpicLoggedIn();
    if (!isLoggedIn) {
      console.error('❌ Epic Games: Benutzer nicht eingeloggt!');
      showNotification('❌ Epic Games Login Required', 'Please login to Epic Games Store to use auto-claim', 'error');
      throw new Error('User not logged in to Epic Games');
    }

    console.log('✅ Epic Games: Benutzer eingeloggt');

    // Warte bis Seite vollständig geladen ist
    if (document.readyState === 'loading') {
      console.log('⏳ Warte auf DOMContentLoaded...');
      await new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve));
    }

    console.log('🔍 Suche nach kostenlosen Epic Games Spielen mit "Free Now"...');
    
    // Warte extra für Epic Games weil sie viel JS laden
    await sleep(2000);

    // Suche nach Elements die "Free Now" Badge enthalten (css-82y1uz ist die Klasse für "Free Now")
    // Struktur: <a><img><div class="css-82y1uz">Free Now</div></a>
    let freeGameLinks = document.querySelectorAll('a:has(div.css-82y1uz)');
    
    console.log(`✅ ${freeGameLinks.length} freie Spiele mit "Free Now" Label gefunden`);

    if (freeGameLinks.length === 0) {
      console.warn('⚠️ Keine Spiele mit "Free Now" Label gefunden');
      return;
    }

    let claimedCount = 0;
    let skippedCount = 0;
    let claimedGames = [];

    for (let i = 0; i < freeGameLinks.length; i++) {
      try {
        const gameLink = freeGameLinks[i];
        const gameTitle = gameLink.querySelector('h6')?.textContent || 
                         gameLink.querySelector('[data-component="Text"]')?.textContent || 
                         'Unknown Game';
        
        console.log(`\n🎮 [${i + 1}/${freeGameLinks.length}] Verarbeite: ${gameTitle}`);

        // Navigiere zur Game-Seite
        const gameUrl = gameLink.href;
        if (gameUrl) {
          console.log(`📂 Navigiere zu: ${gameUrl}`);
          window.location.href = gameUrl;
          
          // Warte auf neue Seite
          await sleep(3000);
          
          // Versuche zu Claim
          const claimed = await performEpicClaimOnGamePage();
          
          if (claimed) {
            claimedCount++;
            claimedGames.push(gameTitle);
            console.log(`✅ Erfolgreich claimed! (${claimedCount} insgesamt)`);
          }
          
          // Pause vor nächstem
          console.log('⏱️ Pause von 5 Sekunden...');
          await sleep(5000);
          
          // Zurück zur Free Games Liste
          console.log('⬅️ Gehe zurück zur Liste...');
          window.history.back();
          await sleep(2000);
        }
      } catch (err) {
        console.error(`❌ Fehler bei Spiel ${i + 1}:`, err);
      }
    }

    console.log(`\n✅ Epic Games Auto-Claim abgeschlossen!`);
    console.log(`📊 Zusammenfassung: ${claimedCount} claimed, ${skippedCount} übersprungen`);
    
    // Sende Discord Nachricht IMMER (ob erfolgreich oder nicht)
    try {
      if (claimedCount > 0) {
        await sendToDiscord('✅ Epic Games Auto-Claim Success', `Successfully claimed ${claimedCount} game(s)!`, claimedGames, 0xF0E14F);
        showNotification('✅ Epic Games Auto-Claim Complete', `${claimedCount} games claimed!`, 'success');
      } else {
        await sendToDiscord('ℹ️ Epic Games Auto-Claim Status', 'No new games available to claim. All games already in library.', [], 0x3498db);
        showNotification('ℹ️ Epic Games Auto-Claim Complete', 'No new games available.', 'info');
      }
    } catch (discordErr) {
      console.error('❌ Fehler beim Senden der Discord Nachricht:', discordErr);
      // Fallback notification
      showNotification('✅ Epic Games Auto-Claim Complete', `${claimedCount} games claimed!`, 'success');
    }
  } catch (err) {
    console.error('❌ Kritischer Fehler im Epic Games Auto-Claim Prozess:', err);
    // Sende Error zu Discord
    try {
      await sendToDiscord('❌ Epic Games Auto-Claim Error', `An error occurred: ${err.message}`, [], 0xE74C3C);
    } catch (e) {
      console.error('Discord Error Notification auch fehlgeschlagen:', e);
    }
    showNotification('❌ Epic Games Auto-Claim Error', err.message || 'Unknown error', 'error');
  }
}

function isEpicLoggedIn() {
  // Prüfe ob User eingeloggt ist auf Epic Games
  // 1. Prüfe ob Account-Menu existiert
  const accountButton = document.querySelector('[aria-label*="account"], .account, .profile-menu');
  if (accountButton) {
    return true;
  }
  
  // 2. Prüfe ob Login-Button existiert
  const loginButton = document.querySelector('[href*="/id/login"], button:contains("Sign In")');
  if (loginButton) {
    return false;
  }
  
  // 3. Prüfe ob bestimmte Text vorhanden ist
  const text = document.body.textContent;
  if (text.includes('Sign In') || text.includes('Login')) {
    return false;
  }
  
  // Default: Annahme dass eingeloggt (da wir auf der Store-Seite sind)
  return true;
}

async function performEpicClaimOnGamePage() {
  try {
    console.log('🔎 Suche nach Epic Games "Claim" Button...');

    // Warte bis Seite voll geladen ist
    await sleep(2000);

    // Epic Games hat verschiedene Button-Texte und Selektoren
    // Suche nach "Claim", "Get", "Add to Library"
    let claimButton = document.querySelector('button:contains("Claim"), button:contains("Get"), [data-testid="purchase-cta-button"]');
    
    if (!claimButton) {
      // Versuche mit anderen Selektoren
      const buttons = document.querySelectorAll('button');
      for (const btn of buttons) {
        if (btn.textContent.includes('Claim') || btn.textContent.includes('Get') || btn.textContent.includes('Free')) {
          claimButton = btn;
          break;
        }
      }
    }
    
    if (claimButton) {
      console.log('🖱️ Claim Button gefunden, klicke...');
      claimButton.click();
      
      // Warte auf Bestätigung
      await sleep(1500);
      
      // Suche nach Bestätigungs-Button (könnte ein Modal sein)
      const confirmButton = document.querySelector('button[data-testid="purchase-action-confirm"], button:contains("Confirm"), button:contains("Yes")');
      if (confirmButton) {
        console.log('✅ Bestätigungs-Button gefunden, klicke...');
        confirmButton.click();
        await sleep(2000);
      }
      
      console.log('✅ Epic Games Claim erfolgreich!');
      return true;
    } else {
      console.warn('⚠️ Claim Button nicht gefunden');
      return false;
    }
  } catch (err) {
    console.error('❌ Fehler bei Epic Games Claim:', err);
    return false;
  }
}

function showNotification(title, message, type = 'info') {
  console.log(`📢 [${type.toUpperCase()}] ${title}: ${message}`);
  
  // Sende Notification an Background Script
  chrome.runtime.sendMessage({
    action: 'showNotification',
    title: title,
    message: message,
    type: type
  }).catch(err => {
    console.warn('Konnte Notification nicht senden:', err);
  });
}

async function sendToDiscord(title, description, gamesList = [], color = 0x3498db) {
  try {
    console.log('📤 [Discord] Versuche Webhook zu senden...');
    
    // Hole Discord Webhook URL aus Storage
    const result = await new Promise((resolve) => {
      chrome.storage.local.get(['discordWebhookUrl'], resolve);
    });

    const webhookUrl = result.discordWebhookUrl;
    
    if (!webhookUrl || !webhookUrl.trim()) {
      console.warn('⚠️ [Discord] Webhook URL nicht konfiguriert');
      return;
    }

    console.log(`📤 [Discord] Sende Embed: "${title}"`);

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

    // Add games list if provided
    if (gamesList && gamesList.length > 0) {
      const gameText = gamesList.slice(0, 25).join('\n'); // Limit to 25 games
      embed.fields.push({
        name: `Games (${gamesList.length})`,
        value: gameText || 'No games',
        inline: false
      });
    }

    console.log(`📤 [Discord] Body:`, JSON.stringify({ embeds: [embed] }));

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        embeds: [embed]
      })
    });

    console.log(`📤 [Discord] Response Status: ${response.status} ${response.statusText}`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`📤 [Discord] Error Body: ${errorText}`);
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    console.log('✅ [Discord] Embed erfolgreich gesendet!');
  } catch (error) {
    console.error('❌ [Discord] Fehler beim Senden:', error.message, error);
    throw error; // Re-throw damit caller das weiß
  }
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
