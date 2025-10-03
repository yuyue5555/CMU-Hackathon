// Background script for Chrome extension
// Import configuration and API client
importScripts('config.js', 'api-client.js');

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    // Initialize on first install - 使用配置文件中的 API keys
    chrome.storage.sync.set({
      isEnabled: true,
      replaceCount: 0,
      useAI: true, // 启用 AI 模式（使用配置文件中的 keys）
      aiService: CONFIG.DEFAULT_AI_SERVICE || 'openai', // 'openai' 或 'huggingface'
      systemPromptKey: 'WORD_REPLACER'
    });
    
    console.log('扩展安装完成，AI 模式已启用');
    
    // Show welcome page
    chrome.tabs.create({
      url: chrome.runtime.getURL('welcome.html')
    });
  }
});

// 确保 AI 模式始终启用
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.sync.get(['useAI'], (result) => {
    if (result.useAI === false || result.useAI === undefined) {
      chrome.storage.sync.set({
        useAI: true,
        aiService: CONFIG.DEFAULT_AI_SERVICE || 'openai',
        systemPromptKey: 'WORD_REPLACER'
      });
      console.log('AI 模式已自动启用');
    }
  });
});

// 强制启用 AI 模式 - 每次扩展启动时都检查
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'forceEnableAI') {
    chrome.storage.sync.set({
      useAI: true,
      aiService: CONFIG.DEFAULT_AI_SERVICE || 'openai',
      systemPromptKey: 'WORD_REPLACER',
      isEnabled: true
    }).then(() => {
      console.log('AI 模式已强制启用');
      sendResponse({ success: true });
    });
    return true;
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
  } else if (request.action === 'transformText') {
    // Handle AI text transformation request
    handleTransformText(request, sendResponse);
    return true; // Keep message channel open for async response
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

/**
 * Handle text transformation using AI API (OpenAI or Hugging Face)
 */
async function handleTransformText(request, sendResponse) {
  try {
    const { text } = request;
    console.log('Background: 收到转换请求:', text);
    
    // Get settings from storage
    const settings = await chrome.storage.sync.get([
      'useAI',
      'aiService',
      'systemPromptKey'
    ]);
    
    console.log('Background: 当前设置:', settings);
    
    if (!settings.useAI) {
      console.log('Background: AI 集成已禁用');
      sendResponse({
        success: false,
        error: 'AI 集成已禁用'
      });
      return;
    }
    
    // 检查 API keys 是否配置
    const service = settings.aiService || CONFIG.DEFAULT_AI_SERVICE;
    console.log('Background: 使用服务:', service);
    console.log('Background: CONFIG:', CONFIG);
    
    if (service === 'openai' && !CONFIG.OPENAI_API_KEY) {
      console.log('Background: OpenAI API Key 未配置');
      sendResponse({
        success: false,
        error: 'OpenAI API Key 未配置'
      });
      return;
    }
    
    if (service === 'huggingface' && !CONFIG.HF_TOKEN) {
      console.log('Background: Hugging Face Token 未配置');
      sendResponse({
        success: false,
        error: 'Hugging Face Token 未配置'
      });
      return;
    }
    
    // 调用 AI API
    console.log('Background: 开始调用 AI API');
    const result = await transformText(
      text,
      service,
      settings.systemPromptKey || 'WORD_REPLACER'
    );
    
    console.log('Background: AI API 结果:', result);
    sendResponse(result);
  } catch (error) {
    console.error('Background: 转换异常:', error);
    sendResponse({
      success: false,
      error: error.message
    });
  }
}
