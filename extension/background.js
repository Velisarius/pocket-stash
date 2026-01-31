// Background service worker
// Handles context menus and saving

importScripts('config.js', 'supabase.js');

let supabase = null;

// Initialize on startup
chrome.runtime.onInstalled.addListener(() => {
  initSupabase();
  setupContextMenu();
});

chrome.runtime.onStartup.addListener(() => {
  initSupabase();
});

async function initSupabase() {
  supabase = new SupabaseClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);
  await supabase.init();
}

// Context menu for "Save highlight to Stash"
function setupContextMenu() {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: 'save-highlight',
      title: 'Save highlight to Stash',
      contexts: ['selection'],
    });

    chrome.contextMenus.create({
      id: 'save-page',
      title: 'Save page to Stash',
      contexts: ['page'],
    });
  });
}

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!supabase) await initSupabase();

  if (info.menuItemId === 'save-highlight') {
    await saveHighlight(tab, info.selectionText);
  } else if (info.menuItemId === 'save-page') {
    await savePage(tab);
  }
});

function isRestrictedUrl(url) {
  if (!url) return true;
  try {
    const u = new URL(url);
    return u.protocol === 'chrome:' || u.protocol === 'edge:' || u.protocol === 'about:' || u.protocol === 'chrome-extension:';
  } catch {
    return true;
  }
}

function sendToastToTab(tabId, message, isError) {
  if (!tabId) return;
  chrome.tabs.sendMessage(tabId, { action: 'showToast', message, isError }).catch(() => {});
}

// Save highlighted text
async function saveHighlight(tab, selectionText) {
  if (!tab?.id) {
    console.error('Save highlight: no tab');
    return;
  }
  try {
    await supabase.insert('saves', {
      user_id: CONFIG.USER_ID,
      url: tab.url,
      title: tab.title,
      highlight: selectionText,
      site_name: new URL(tab.url).hostname.replace('www.', ''),
      source: 'extension',
    });
    sendToastToTab(tab.id, 'Highlight saved!', false);
  } catch (err) {
    console.error('Save highlight failed:', err);
    sendToastToTab(tab.id, 'Failed to save: ' + err.message, true);
  }
}

// Save full page
async function savePage(tab) {
  if (!tab?.id) {
    console.error('Save page: no tab');
    return;
  }
  if (isRestrictedUrl(tab.url)) {
    console.error('Save page: cannot save this page (restricted URL)');
    sendToastToTab(tab.id, "Can't save this page. Open a normal webpage and try again.", true);
    return;
  }

  try {
    console.log('savePage called for:', tab.url);
    let article;

    try {
      article = await chrome.tabs.sendMessage(tab.id, { action: 'extractArticle' });
    } catch (e) {
      // Content script not loaded, inject it first
      if (typeof chrome.scripting === 'undefined' || !chrome.scripting.executeScript) {
        throw new Error("Extension scripting not available. Reload the extension and try again.");
      }
      console.log('Content script not loaded, injecting...');
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['Readability.js', 'content.js']
        });
      } catch (injectErr) {
        throw new Error("Can't run on this page. Try a different website.");
      }
      await new Promise(r => setTimeout(r, 150));
      article = await chrome.tabs.sendMessage(tab.id, { action: 'extractArticle' });
    }

    if (!article) {
      throw new Error('Failed to extract article content');
    }

    await supabase.insert('saves', {
      user_id: CONFIG.USER_ID,
      url: tab.url,
      title: article.title,
      content: article.content,
      excerpt: article.excerpt,
      site_name: article.siteName,
      author: article.author,
      published_at: article.publishedTime,
      image_url: article.imageUrl,
      source: 'extension',
    });

    sendToastToTab(tab.id, 'Page saved!', false);
  } catch (err) {
    console.error('Save page failed:', err);
    sendToastToTab(tab.id, err.message || 'Failed to save: ' + err.message, true);
  }
}

// Handle messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'savePage') {
    chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      try {
        if (!tabs?.[0]) {
          sendResponse({ success: false, error: 'No tab found' });
          return;
        }
        await savePage(tabs[0]);
        sendResponse({ success: true });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    });
    return true;
  }

  if (request.action === 'getUser') {
    (async () => {
      if (!supabase) await initSupabase();
      const user = await supabase.getUser();
      sendResponse({ user });
    })();
    return true;
  }

  if (request.action === 'signIn') {
    (async () => {
      if (!supabase) await initSupabase();
      try {
        await supabase.signIn(request.email, request.password);
        const user = await supabase.getUser();
        sendResponse({ success: true, user });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }

  if (request.action === 'signOut') {
    (async () => {
      if (!supabase) await initSupabase();
      await supabase.signOut();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (request.action === 'getRecentSaves') {
    (async () => {
      if (!supabase) await initSupabase();
      try {
        const saves = await supabase.select('saves', {
          order: 'created_at.desc',
          limit: 10,
        });
        sendResponse({ success: true, saves });
      } catch (err) {
        sendResponse({ success: false, error: err.message });
      }
    })();
    return true;
  }
});
