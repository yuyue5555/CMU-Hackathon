// Background script for Chrome extension
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize on first install
    chrome.storage.sync.set({
      isEnabled: true,
      replaceCount: 0,
      customWords: [],
      sensitivity: 'medium'
    });
    
    // Show welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// Listen for messages from content script
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'updateReplaceCount') {
    // Update replacement count
    chrome.storage.sync.get(['replaceCount'], (result) => {
      const newCount = (result.replaceCount || 0) + request.count;
      chrome.storage.sync.set({ replaceCount: newCount });
      sendResponse({ success: true });
    });
    return true; // Keep message channel open
  }
});

// Listen for tab updates
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete' && tab.url) {
    // Check if auto-enable is needed
    chrome.storage.sync.get(['isEnabled'], (result) => {
      if (result.isEnabled) {
        // Send enable message to content script
        chrome.tabs.sendMessage(tabId, { action: 'enable' }).catch(() => {
          // Ignore errors, content script may not be loaded yet
        });
      }
    });
  }
});
