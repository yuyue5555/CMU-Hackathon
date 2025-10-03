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
    // Update replacement count with detailed metrics
    handleUpdateMetrics(request, sender, sendResponse);
    return true; // Keep message channel open
  } else if (request.action === 'transformText') {
    // Handle AI text transformation request
    handleTransformText(request, sendResponse);
    return true; // Keep message channel open for async response
  } else if (request.action === 'getAnalytics') {
    // Handle analytics data request
    handleGetAnalytics(sendResponse);
    return true;
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
 * Handle updating metrics with detailed analytics data
 */
async function handleUpdateMetrics(request, sender, sendResponse) {
  try {
    const { count, metrics } = request;
    
    // Get current data
    const result = await chrome.storage.local.get(['replaceCount', 'replacementHistory', 'dailyStats']);
    
    // Update replacement count
    const newCount = (result.replaceCount || 0) + count;
    
    // Get tab URL for domain tracking
    let url = 'unknown';
    let domain = 'unknown';
    if (sender.tab && sender.tab.url) {
      url = sender.tab.url;
      try {
        domain = new URL(url).hostname;
      } catch (e) {
        domain = 'unknown';
      }
    }
    
    // Initialize history array if not exists
    const history = result.replacementHistory || [];
    
    // Add new entry with detailed metrics
    if (metrics) {
      const entry = {
        id: Date.now() + '-' + Math.random().toString(36).substr(2, 9),
        timestamp: new Date().toISOString(),
        url: url,
        domain: domain,
        originalText: metrics.originalText || '',
        transformedText: metrics.transformedText || '',
        toxicityScore: metrics.toxicityScore || 0,
        aiService: metrics.aiService || 'unknown',
        promptType: metrics.promptType || 'DEFAULT',
        processingTime: metrics.processingTime || 0
      };
      
      history.unshift(entry); // Add to beginning
      
      // Keep only last 500 entries to avoid storage limits
      if (history.length > 500) {
        history.splice(500);
      }
    }
    
    // Update daily stats
    const today = new Date().toISOString().split('T')[0];
    const dailyStats = result.dailyStats || {};
    if (!dailyStats[today]) {
      dailyStats[today] = { count: 0, totalToxicity: 0, avgToxicity: 0 };
    }
    dailyStats[today].count += count;
    if (metrics && metrics.toxicityScore) {
      dailyStats[today].totalToxicity += metrics.toxicityScore;
      dailyStats[today].avgToxicity = dailyStats[today].totalToxicity / dailyStats[today].count;
    }
    
    // Save to storage
    await chrome.storage.local.set({
      replaceCount: newCount,
      replacementHistory: history,
      dailyStats: dailyStats
    });
    
    // Also update sync storage for basic count
    await chrome.storage.sync.set({ replaceCount: newCount });
    
    sendResponse({ success: true });
  } catch (error) {
    console.error('Failed to update metrics:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle getting analytics data
 */
async function handleGetAnalytics(sendResponse) {
  try {
    const result = await chrome.storage.local.get([
      'replaceCount',
      'replacementHistory',
      'dailyStats'
    ]);
    
    sendResponse({
      success: true,
      data: {
        totalCount: result.replaceCount || 0,
        history: result.replacementHistory || [],
        dailyStats: result.dailyStats || {}
      }
    });
  } catch (error) {
    console.error('Failed to get analytics:', error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Handle text transformation using AI API (OpenAI or Hugging Face)
 */
async function handleTransformText(request, sendResponse) {
  try {
    const { text } = request;
    console.log('Background: 收到转换请求:', text);
    
    const startTime = Date.now();
    
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
    
    // Add processing time to result
    const processingTime = Date.now() - startTime;
    result.processingTime = processingTime;
    
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
