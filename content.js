// AI-powered content replacement - No hardcoded words
// 检查是否已经存在，避免重复声明
if (typeof window.PositiveContentReplacer === 'undefined') {
  window.PositiveContentReplacer = class PositiveContentReplacer {
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
      aiService: this.aiService,
      storageResult: result
    });
    
    // 如果 AI 被禁用，自动启用
    if (!this.useAI) {
      console.log('AI 模式被禁用，自动启用');
      this.useAI = true;
      await chrome.storage.sync.set({ useAI: true });
      
      // 通知 background script 强制启用
      if (this.isExtensionContextValid()) {
        chrome.runtime.sendMessage({ action: 'forceEnableAI' }).catch(() => {
          // Ignore errors
        });
      }
    }
    
    // Inject CSS styles
    this.injectStyles();
    
    // 添加悬停事件监听器
    this.addHoverListeners();
    
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
        cursor: pointer !important;
      }
      
      .positive-replacement:hover {
        transform: translateY(-1px) !important;
        box-shadow: 0 3px 8px rgba(0,0,0,0.2) !important;
        background: white !important;
        color: #dc3545 !important;
        border: 2px solid #dc3545 !important;
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
        transition: all 0.3s ease !important;
        font-weight: normal !important;
        color: inherit !important;
        text-decoration: none !important;
        cursor: pointer !important;
      }
      
      .positive-replacement-no-highlight:hover {
        background: white !important;
        color: #dc3545 !important;
        border: 2px solid #dc3545 !important;
        padding: 2px 4px !important;
        border-radius: 4px !important;
        box-shadow: 0 1px 3px rgba(0,0,0,0.1) !important;
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
            // 跳过已经处理过的元素
            if (node.nodeType === Node.ELEMENT_NODE && 
                (node.classList.contains('positive-replacement') || 
                 node.classList.contains('positive-replacement-no-highlight'))) {
              return;
            }
            
            // 跳过由我们自己的悬停事件产生的文本变化
            if (node.nodeType === Node.TEXT_NODE && node.parentElement && 
                (node.parentElement.classList.contains('positive-replacement') || 
                 node.parentElement.classList.contains('positive-replacement-no-highlight'))) {
              return;
            }
            
            // 跳过正在悬停处理的元素
            if (node.nodeType === Node.TEXT_NODE && node.parentElement && 
                node.parentElement.dataset && node.parentElement.dataset.hovering === 'true') {
              return;
            }
            
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
    
    // Skip already processed elements
    if (element.classList && 
        (element.classList.contains('positive-replacement') || 
         element.classList.contains('positive-replacement-no-highlight'))) {
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
    
    // 检查文本节点是否仍然在 DOM 中
    if (!textNode.isConnected) {
      return;
    }
    
    // 检查是否已经处理过
    if (textNode.dataset && textNode.dataset.processed) {
      return;
    }
    
    const text = textNode.textContent.trim();
    
    // Skip empty or very short text
    if (!text || text.length < 3) return;
    
    // Quick check: does this text contain any negative keywords?
    if (!this.containsNegativeKeywords(text)) {
      return;
    }
    
    // 标记为已处理
    if (textNode.dataset) {
      textNode.dataset.processed = 'true';
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
  
  isExtensionContextValid() {
    try {
      // 尝试访问 chrome.runtime 来检查扩展上下文是否有效
      return chrome.runtime && chrome.runtime.id;
    } catch (error) {
      return false;
    }
  }
  
  async replaceWithAI(textNode, text) {
    try {
      // 再次检查文本节点是否仍然有效
      if (!textNode || !textNode.isConnected) {
        console.log('文本节点已无效，跳过转换');
        return;
      }
      
      // 检查扩展上下文是否有效
      if (!this.isExtensionContextValid()) {
        console.log('扩展上下文已失效，跳过转换');
        return;
      }
      
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
          
          // 最后一次检查文本节点是否仍然有效
          if (!textNode || !textNode.isConnected) {
            console.log('文本节点在转换过程中变为无效，跳过替换');
            return;
          }
          
          // 使用安全的 DOM 替换方法
          this.safeReplaceTextNode(textNode, text, transformedText, response.service);
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
      if (error.message && error.message.includes('Extension context invalidated')) {
        console.log('扩展上下文已失效，停止 AI 转换');
        // 停止观察器，避免继续尝试
        if (this.observer) {
          this.observer.disconnect();
          this.observer = null;
        }
        return;
      }
      console.warn(`AI 转换异常:`, error);
    }
  }
  
  safeReplaceTextNode(textNode, originalText, transformedText, service = 'AI') {
    try {
      // 创建高亮的 HTML 内容
      const highlightedHTML = this.createAIHighlight(originalText, transformedText, service);
      
      // 创建临时容器
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedHTML;
      
      // 获取父节点
      const parent = textNode.parentNode;
      
      // 检查父节点是否有效
      if (!parent || parent.nodeType !== Node.ELEMENT_NODE || !parent.isConnected) {
        console.warn('父节点无效，使用简单文本替换');
        textNode.textContent = transformedText;
        return;
      }
      
      // 检查父节点是否仍在文档中
      if (!document.contains(parent)) {
        console.warn('父节点不在文档中，使用简单文本替换');
        textNode.textContent = transformedText;
        return;
      }
      
      // 执行 DOM 替换
      const fragment = document.createDocumentFragment();
      while (tempDiv.firstChild) {
        fragment.appendChild(tempDiv.firstChild);
      }
      
      parent.insertBefore(fragment, textNode);
      parent.removeChild(textNode);
      
      this.replaceCount++;
      
      // 通知 background script 更新计数
      if (this.isExtensionContextValid()) {
        chrome.runtime.sendMessage({
          action: 'updateReplaceCount',
          count: 1
        }).catch(() => {
          // Ignore errors
        });
      }
      
    } catch (error) {
      console.warn('DOM 替换失败，使用简单文本替换:', error);
      try {
        textNode.textContent = transformedText;
      } catch (textError) {
        console.warn('简单文本替换也失败:', textError);
      }
    }
  }
  
  createAIHighlight(originalText, transformedText, service = 'AI') {
    // 创建可切换显示的内容
    const originalEscaped = this.escapeHtml(originalText);
    const transformedEscaped = this.escapeHtml(transformedText);
    
    if (this.showHighlight) {
      return `<span class="positive-replacement" data-original="${originalEscaped}" data-transformed="${transformedEscaped}" data-current="transformed">${transformedEscaped}</span>`;
    } else {
      return `<span class="positive-replacement-no-highlight" data-original="${originalEscaped}" data-transformed="${transformedEscaped}" data-current="transformed">${transformedEscaped}</span>`;
    }
  }
  
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  
  addHoverListeners() {
    // 使用事件委托来处理动态添加的元素
    document.addEventListener('mouseenter', (event) => {
      const target = event.target;
      if (target && target.classList && 
          (target.classList.contains('positive-replacement') || target.classList.contains('positive-replacement-no-highlight'))) {
        // 检查当前状态，避免重复切换
        if (target.dataset && target.dataset.current === 'original') return;
        
        // 标记正在处理悬停事件，防止 MutationObserver 重新处理
        if (target.dataset) {
          target.dataset.hovering = 'true';
        }
        
        const original = target.getAttribute('data-original');
        if (original) {
          target.textContent = original;
          if (target.dataset) {
            target.dataset.current = 'original';
          }
        }
      }
    }, true);
    
    document.addEventListener('mouseleave', (event) => {
      const target = event.target;
      if (target && target.classList && 
          (target.classList.contains('positive-replacement') || target.classList.contains('positive-replacement-no-highlight'))) {
        // 检查当前状态，避免重复切换
        if (target.dataset && target.dataset.current === 'transformed') return;
        
        const transformed = target.getAttribute('data-transformed');
        if (transformed) {
          target.textContent = transformed;
          if (target.dataset) {
            target.dataset.current = 'transformed';
            // 清除悬停标记
            delete target.dataset.hovering;
          }
        }
      }
    }, true);
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
      // 移除所有转换后的元素，恢复原始文本
      this.removeAllReplacements();
    }
  }
  
  removeAllReplacements() {
    // 移除所有转换后的元素，恢复原始文本
    const replacements = document.querySelectorAll('.positive-replacement, .positive-replacement-no-highlight');
    replacements.forEach(element => {
      const parent = element.parentNode;
      if (parent) {
        // 获取原始文本
        const originalText = element.getAttribute('data-original');
        if (originalText) {
          // 创建文本节点替换
          const textNode = document.createTextNode(originalText);
          parent.replaceChild(textNode, element);
        } else {
          // 如果没有原始文本，使用转换后的文本
          const textNode = document.createTextNode(element.textContent);
          parent.replaceChild(textNode, element);
        }
      }
    });
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
  };
}

// 检查是否已经初始化，避免重复初始化
if (typeof window.positiveContentReplacer === 'undefined') {
  window.positiveContentReplacer = new window.PositiveContentReplacer();
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  try {
    // 检查扩展上下文是否有效
    if (!chrome.runtime || !chrome.runtime.id) {
      console.log('扩展上下文已失效，忽略消息');
      return;
    }
    
    if (request.action === 'toggle') {
      if (window.positiveContentReplacer) {
        window.positiveContentReplacer.toggle().then(() => {
          sendResponse({ success: true, isEnabled: window.positiveContentReplacer.isEnabled });
        }).catch(error => {
          console.warn('Toggle 失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Replacer not initialized' });
      }
      return true; // Keep message channel open
    } else if (request.action === 'getStatus') {
      sendResponse({ isEnabled: window.positiveContentReplacer ? window.positiveContentReplacer.isEnabled : false });
    } else if (request.action === 'getReplaceCount') {
      sendResponse({ count: window.positiveContentReplacer ? window.positiveContentReplacer.replaceCount : 0 });
    } else if (request.action === 'updateSettings') {
      if (window.positiveContentReplacer) {
        window.positiveContentReplacer.updateSettings(request.settings).then(() => {
          sendResponse({ success: true });
        }).catch(error => {
          console.warn('更新设置失败:', error);
          sendResponse({ success: false, error: error.message });
        });
      } else {
        sendResponse({ success: false, error: 'Replacer not initialized' });
      }
      return true; // Keep message channel open
    } else if (request.action === 'enable') {
      if (window.positiveContentReplacer && !window.positiveContentReplacer.isEnabled) {
        window.positiveContentReplacer.toggle();
      }
      sendResponse({ success: true });
    }
  } catch (error) {
    console.warn('消息处理失败:', error);
    if (sendResponse) {
      sendResponse({ success: false, error: error.message });
    }
  }
});