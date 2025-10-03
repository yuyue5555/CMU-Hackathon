// AI-powered content replacement - No hardcoded words
class PositiveContentReplacer {
  constructor() {
    // 简单的负面词汇列表，仅用于快速检测是否需要调用 AI
    this.negativeKeywords = new Set([
      'hate', 'stupid', 'ugly', 'terrible', 'awful', 'horrible', 'disgusting',
      'bad', 'wrong', 'fail', 'loser', 'idiot', 'moron', 'dumb', 'suck',
      'annoying', 'angry', 'sad', 'depressed', 'boring', 'useless', 'hopeless'
    ]);
    
    this.isEnabled = true;
    this.replaceCount = 0;
    this.observer = null;
    this.showHighlight = true;
    this.useAI = true;
    this.aiService = 'openai';
    this.systemPromptKey = 'WORD_REPLACER';
    this.init();
  }
  
  async init() {
    // Get settings from storage
    const result = await chrome.storage.sync.get([
      'isEnabled', 'showHighlight', 'useAI', 'aiService', 'systemPromptKey'
    ]);
    
    this.isEnabled = result.isEnabled !== false;
    this.showHighlight = result.showHighlight !== false;
    this.useAI = result.useAI !== false;
    this.aiService = result.aiService || 'openai';
    this.systemPromptKey = result.systemPromptKey || 'WORD_REPLACER';
    
    console.log('Content Script 初始化:', {
      isEnabled: this.isEnabled,
      useAI: this.useAI,
      aiService: this.aiService
    });
    
    // 如果 AI 被禁用，自动启用
    if (!this.useAI) {
      console.log('AI 模式被禁用，自动启用');
      this.useAI = true;
      await chrome.storage.sync.set({ useAI: true });
      
      // 通知 background script 强制启用
      chrome.runtime.sendMessage({ action: 'forceEnableAI' }).catch(() => {
        // Ignore errors
      });
    }
    
    // Inject CSS styles
    this.injectStyles();
    
    if (this.isEnabled) {
      this.startReplacement();
    }
  }
  
  injectStyles() {
    // Check if styles have already been injected
    if (document.getElementById('positive-replacement-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'positive-replacement-styles';
    style.textContent = `
      .positive-replacement {
        background: linear-gradient(120deg, #a8edea 0%, #fed6e3 100%) !important;
        padding: 2px 4px !important;
        border-radius: 4px !important;
        border: 1px solid #ffd700 !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
        position: relative !important;
        display: inline-block !important;
        margin: 0 1px !important;
        transition: all 0.3s ease !important;
        font-weight: 500 !important;
        color: #333 !important;
        text-decoration: none !important;
      }
      
      .positive-replacement:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2) !important;
        background: linear-gradient(120deg, #74b9ff 0%, #0984e3 100%) !important;
        color: white !important;
      }
      
      .positive-replacement::before {
        content: "✨" !important;
        position: absolute !important;
        top: -8px !important;
        right: -8px !important;
        font-size: 10px !important;
        opacity: 0.7 !important;
        pointer-events: none !important;
      }
      
      .positive-replacement-no-highlight {
        background: none !important;
        padding: 0 !important;
        border: none !important;
        box-shadow: none !important;
        margin: 0 !important;
        transition: none !important;
        font-weight: normal !important;
        color: inherit !important;
        text-decoration: none !important;
      }
      
      .positive-replacement-no-highlight::before {
        display: none !important;
      }
    `;
    document.head.appendChild(style);
  }
  
  startReplacement() {
    // Stop previous observer
    if (this.observer) {
      this.observer.disconnect();
    }
    
    // Monitor DOM changes
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType === Node.TEXT_NODE) {
              this.replaceTextInNode(node);
            } else if (node.nodeType === Node.ELEMENT_NODE) {
              this.replaceTextInElement(node);
            }
          });
        }
      });
    });
    
    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });
    
    // Initial replacement
    this.replaceTextInElement(document.body);
  }
  
  replaceTextInElement(element) {
    if (!element) return;
    
    // Skip script and style tags
    if (element.tagName === 'SCRIPT' || element.tagName === 'STYLE') {
      return;
    }
    
    // Process text nodes
    if (element.nodeType === Node.TEXT_NODE) {
      this.replaceTextInNode(element);
      return;
    }
    
    // Recursively process child nodes
    const childNodes = element.childNodes;
    for (let i = 0; i < childNodes.length; i++) {
      this.replaceTextInElement(childNodes[i]);
    }
  }
  
  async replaceTextInNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    const text = textNode.textContent.trim();
    
    // Skip empty or very short text
    if (!text || text.length < 3) return;
    
    // Quick check: does this text contain any negative keywords?
    if (!this.containsNegativeKeywords(text)) {
      return;
    }
    
    // Use AI to transform the text
    await this.replaceWithAI(textNode, text);
  }
  
  containsNegativeKeywords(text) {
    const lowerText = text.toLowerCase();
    for (const keyword of this.negativeKeywords) {
      if (lowerText.includes(keyword)) {
        return true;
      }
    }
    return false;
  }
  
  async replaceWithAI(textNode, text) {
    try {
      console.log('开始 AI 转换:', text);
      
      // Call background script to transform text using AI
      const response = await chrome.runtime.sendMessage({
        action: 'transformText',
        text: text
      });
      
      console.log('AI 转换响应:', response);
      
      if (response.success && response.transformedText) {
        const transformedText = response.transformedText;
        
        // Only replace if actually different
        if (transformedText !== text && transformedText.length > 0) {
          console.log('转换成功:', text, '→', transformedText);
          
          // Create highlighted HTML content
          const service = response.service || this.aiService;
          const highlightedHTML = this.createAIHighlight(text, transformedText, service);
          
          console.log('生成的 HTML:', highlightedHTML);
          
          // Create temporary container
          const tempDiv = document.createElement('div');
          tempDiv.innerHTML = highlightedHTML;
          
          // Replace text node
          const parent = textNode.parentNode;
          if (parent && parent.nodeType === Node.ELEMENT_NODE) {
            try {
              while (tempDiv.firstChild) {
                parent.insertBefore(tempDiv.firstChild, textNode);
              }
              parent.removeChild(textNode);
              
              this.replaceCount++;
              
              // Notify background script to update count
              chrome.runtime.sendMessage({
                action: 'updateReplaceCount',
                count: 1
              }).catch(() => {
                // Ignore errors
              });
            } catch (error) {
              console.warn('DOM 操作失败:', error);
              // 如果 DOM 操作失败，尝试直接替换文本内容
              textNode.textContent = transformedText;
            }
          } else {
            console.warn('无法找到有效的父节点');
          }
        } else {
          console.log('转换结果相同，跳过替换');
        }
      } else if (response.error) {
        // AI 转换失败，记录错误但不做替换
        console.warn(`AI 转换失败: ${response.error}`);
      } else {
        console.log('AI 转换无响应或失败');
      }
    } catch (error) {
      console.warn(`AI 转换异常:`, error);
    }
  }
  
  createAIHighlight(originalText, transformedText, service = 'AI') {
    const serviceLabel = service === 'openai' ? 'OpenAI' : 
                        service === 'huggingface' ? 'HuggingFace' : 'AI';
    
    // 简化 title 内容，避免 HTML 转义问题
    const titleText = `${serviceLabel}转换: ${originalText}`;
    
    if (this.showHighlight) {
      return `<span class="positive-replacement" title="${titleText}">${this.escapeHtml(transformedText)}</span>`;
    } else {
      return `<span class="positive-replacement-no-highlight" title="${titleText}">${this.escapeHtml(transformedText)}</span>`;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  async toggle() {
    this.isEnabled = !this.isEnabled;
    await chrome.storage.sync.set({ isEnabled: this.isEnabled });
    
    if (this.isEnabled) {
      this.startReplacement();
    } else {
      // Stop observer
      if (this.observer) {
        this.observer.disconnect();
        this.observer = null;
      }
      // Reload page to restore original content
      window.location.reload();
    }
  }
  
  async updateSettings(settings) {
    this.isEnabled = settings.isEnabled !== false;
    this.showHighlight = settings.showHighlight !== false;
    this.useAI = settings.useAI !== false;
    this.aiService = settings.aiService || 'openai';
    this.systemPromptKey = settings.systemPromptKey || 'WORD_REPLACER';
    
    if (this.isEnabled) {
      this.startReplacement();
    } else if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
  }
}

// Initialize replacer
const replacer = new PositiveContentReplacer();

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'toggle') {
    replacer.toggle().then(() => {
      sendResponse({ success: true, isEnabled: replacer.isEnabled });
    });
    return true; // Keep message channel open
  } else if (request.action === 'getStatus') {
    sendResponse({ isEnabled: replacer.isEnabled });
  } else if (request.action === 'getReplaceCount') {
    sendResponse({ count: replacer.replaceCount });
  } else if (request.action === 'updateSettings') {
    replacer.updateSettings(request.settings).then(() => {
      sendResponse({ success: true });
    });
    return true; // Keep message channel open
  } else if (request.action === 'enable') {
    if (!replacer.isEnabled) {
      replacer.toggle();
    }
    sendResponse({ success: true });
  }
});