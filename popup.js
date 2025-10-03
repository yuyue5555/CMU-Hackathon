// JavaScript logic for popup page
document.addEventListener('DOMContentLoaded', async function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const replaceCount = document.getElementById('replaceCount');
  const wordCount = document.getElementById('wordCount');
  const highlightStatus = document.getElementById('highlightStatus');
  const optionsBtn = document.getElementById('optionsBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  
  // Get current status
  const result = await chrome.storage.sync.get(['isEnabled', 'replaceCount', 'showHighlight']);
  const isEnabled = result.isEnabled !== false;
  const showHighlight = result.showHighlight !== false;
  
  // Update UI
  updateUI(isEnabled);
  highlightStatus.textContent = showHighlight ? 'On' : 'Off';
  
  // Get replacement count from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查是否是扩展页面
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getReplaceCount' });
      if (response && response.count !== undefined) {
        replaceCount.textContent = response.count;
      }
    } else {
      // 对于扩展页面，从存储中获取计数
      const storageResult = await chrome.storage.sync.get(['replaceCount']);
      replaceCount.textContent = storageResult.replaceCount || 0;
    }
  } catch (error) {
    console.log('Unable to get replacement count:', error);
    // 从存储中获取计数作为备选
    const storageResult = await chrome.storage.sync.get(['replaceCount']);
    replaceCount.textContent = storageResult.replaceCount || 0;
  }
  
  // Toggle switch event
  toggleSwitch.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否是扩展页面
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('无法在扩展页面中切换');
        return;
      }
      
      // 尝试注入 content script（如果还没有注入）
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectError) {
        console.log('Content script 可能已经注入或无法注入:', injectError);
      }
      
      // 等待一下让 content script 加载
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      
      if (response && response.success) {
        updateUI(response.isEnabled);
        // Save state to storage
        await chrome.storage.sync.set({ isEnabled: response.isEnabled });
      }
    } catch (error) {
      console.error('Toggle failed:', error);
      // If content script doesn't respond, update local state directly
      const newState = !isEnabled;
      updateUI(newState);
      await chrome.storage.sync.set({ isEnabled: newState });
      
      // 显示用户友好的错误信息
      status.textContent = 'Error - Try refreshing page';
      setTimeout(() => {
        updateUI(newState);
      }, 2000);
    }
  });
  
  // Settings button event
  optionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // Refresh page button event
  refreshBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  });
  
  function updateUI(enabled) {
    if (enabled) {
      toggleSwitch.classList.add('active');
      status.textContent = 'Enabled';
    } else {
      toggleSwitch.classList.remove('active');
      status.textContent = 'Disabled';
    }
  }
  
  // Periodically update replacement count
  setInterval(async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否是扩展页面
      if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getReplaceCount' });
        if (response && response.count !== undefined) {
          replaceCount.textContent = response.count;
        }
      } else {
        // 对于扩展页面，从存储中获取计数
        const storageResult = await chrome.storage.sync.get(['replaceCount']);
        replaceCount.textContent = storageResult.replaceCount || 0;
      }
    } catch (error) {
      // 从存储中获取计数作为备选
      try {
        const storageResult = await chrome.storage.sync.get(['replaceCount']);
        replaceCount.textContent = storageResult.replaceCount || 0;
      } catch (storageError) {
        // Silently handle errors
      }
    }
  }, 2000);
});
