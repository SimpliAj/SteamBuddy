// content.js
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
    <div>Review summary for ${gameTitle}</div>
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
}

if (isGamePage) {
  const appId = isGamePage[1];
  const titleElement = document.querySelector('#appHubAppName');

  chrome.storage.local.get(['reviewBadgeEnabled'], function(result) {
    const reviewBadgeEnabled = result.reviewBadgeEnabled !== false;
    if (reviewBadgeEnabled) {
      showRatingsOverview(appId, titleElement);
    }
  });
}