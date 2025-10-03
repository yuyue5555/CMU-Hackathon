// Core logic for negative content detection and replacement
class PositiveContentReplacer {
  constructor() {
    this.negativeWords = new Set([
      'hate', 'stupid', 'ugly', 'terrible', 'awful', 'horrible', 'disgusting',
      'hateful', 'mean', 'cruel', 'evil', 'bad', 'wrong', 'fail', 'loser',
      'idiot', 'moron', 'dumb', 'suck', 'sucks', 'sucked', 'sucking',
      'annoying', 'irritating', 'frustrating', 'angry', 'mad', 'furious',
      'disappointed', 'disappointing', 'sad', 'depressed', 'miserable',
      'boring', 'bored', 'tired', 'exhausted', 'sick', 'ill', 'painful',
      'hurt', 'hurtful', 'damage', 'destroy', 'ruin', 'break', 'broken',
      'useless', 'worthless', 'pointless', 'meaningless', 'empty', 'void',
      'hopeless', 'helpless', 'powerless', 'weak', 'pathetic', 'pitiful',
      'shameful', 'embarrassing', 'disgraceful', 'disgusting', 'revolting',
      'nasty', 'gross', 'vile', 'filthy', 'dirty', 'contaminated',
      'corrupted', 'tainted', 'polluted', 'infected', 'diseased',
      'cursed', 'damned', 'doomed', 'fated', 'destined', 'condemned'
    ]);
    
    this.positiveReplacements = {
      'hate': 'love',
      'stupid': 'clever',
      'ugly': 'beautiful',
      'terrible': 'wonderful',
      'awful': 'amazing',
      'horrible': 'fantastic',
      'disgusting': 'delightful',
      'hateful': 'loving',
      'mean': 'kind',
      'cruel': 'gentle',
      'evil': 'good',
      'bad': 'great',
      'wrong': 'right',
      'fail': 'succeed',
      'loser': 'winner',
      'idiot': 'genius',
      'moron': 'brilliant',
      'dumb': 'smart',
      'suck': 'excel',
      'sucks': 'exceeds',
      'sucked': 'excelled',
      'sucking': 'excelling',
      'annoying': 'pleasing',
      'irritating': 'soothing',
      'frustrating': 'encouraging',
      'angry': 'calm',
      'mad': 'peaceful',
      'furious': 'serene',
      'disappointed': 'pleased',
      'disappointing': 'satisfying',
      'sad': 'happy',
      'depressed': 'cheerful',
      'miserable': 'joyful',
      'boring': 'exciting',
      'bored': 'engaged',
      'tired': 'energetic',
      'exhausted': 'refreshed',
      'sick': 'healthy',
      'ill': 'well',
      'painful': 'comfortable',
      'hurt': 'heal',
      'hurtful': 'healing',
      'damage': 'repair',
      'destroy': 'build',
      'ruin': 'improve',
      'break': 'fix',
      'broken': 'fixed',
      'useless': 'useful',
      'worthless': 'valuable',
      'pointless': 'meaningful',
      'meaningless': 'significant',
      'empty': 'full',
      'void': 'complete',
      'hopeless': 'hopeful',
      'helpless': 'helpful',
      'powerless': 'powerful',
      'weak': 'strong',
      'pathetic': 'admirable',
      'pitiful': 'respectable',
      'shameful': 'proud',
      'embarrassing': 'confident',
      'disgraceful': 'honorable',
      'disgusting': 'appealing',
      'revolting': 'attractive',
      'nasty': 'pleasant',
      'gross': 'lovely',
      'vile': 'noble',
      'filthy': 'clean',
      'dirty': 'pure',
      'contaminated': 'pure',
      'corrupted': 'honest',
      'tainted': 'genuine',
      'polluted': 'fresh',
      'infected': 'healthy',
      'diseased': 'well',
      'cursed': 'blessed',
      'damned': 'blessed',
      'doomed': 'destined for success',
      'fated': 'blessed',
      'destined': 'blessed',
      'condemned': 'redeemed'
    };
    
    this.customWords = [];
    this.sensitivity = 'medium';
    this.isEnabled = true;
    this.replaceCount = 0;
    this.observer = null;
    this.init();
  }
  
  async init() {
    // Get settings from storage
    const result = await chrome.storage.sync.get(['isEnabled', 'customWords', 'sensitivity', 'showHighlight']);
    this.isEnabled = result.isEnabled !== false; // Default to true
    this.customWords = result.customWords || [];
    this.sensitivity = result.sensitivity || 'medium';
    this.showHighlight = result.showHighlight !== false; // Default to true
    
    // Update word mappings
    this.updateWordMappings();
    
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
  
  updateWordMappings() {
    // Add custom words to replacement table
    this.customWords.forEach(item => {
      this.negativeWords.add(item.negative);
      this.positiveReplacements[item.negative] = item.positive;
    });
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
  
  replaceTextInNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    
    let text = textNode.textContent;
    let hasChanges = false;
    let replaceCount = 0;
    
    // Use regex to match word boundaries
    const words = text.split(/\b/);
    const newWords = words.map(word => {
      const lowerWord = word.toLowerCase();
      if (this.negativeWords.has(lowerWord)) {
        hasChanges = true;
        replaceCount++;
        return this.positiveReplacements[lowerWord] || word;
      }
      return word;
    });
    
    if (hasChanges) {
      // Create highlighted HTML content
      const highlightedText = this.createHighlightedText(words, newWords);
      
      // Create temporary container
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = highlightedText;
      
      // Replace text node
      const parent = textNode.parentNode;
      while (tempDiv.firstChild) {
        parent.insertBefore(tempDiv.firstChild, textNode);
      }
      parent.removeChild(textNode);
      
      this.replaceCount += replaceCount;
      
      // Notify background script to update count
      chrome.runtime.sendMessage({
        action: 'updateReplaceCount',
        count: replaceCount
      }).catch(() => {
        // Ignore errors
      });
    }
  }
  
  createHighlightedText(originalWords, newWords) {
    let result = '';
    for (let i = 0; i < originalWords.length; i++) {
      const originalWord = originalWords[i];
      const newWord = newWords[i];
      
      if (originalWord !== newWord) {
        // Replaced words
        if (this.showHighlight) {
          // Add highlight style
          result += `<span class="positive-replacement" title="Replaced: ${originalWord} → ${newWord}">${newWord}</span>`;
        } else {
          // Don't add highlight style
          result += `<span class="positive-replacement-no-highlight" title="Replaced: ${originalWord} → ${newWord}">${newWord}</span>`;
        }
      } else {
        // Unreplaced words, keep as is
        result += originalWord;
      }
    }
    return result;
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
    this.isEnabled = settings.isEnabled;
    this.customWords = settings.customWords || [];
    this.sensitivity = settings.sensitivity || 'medium';
    this.showHighlight = settings.showHighlight !== false;
    
    // Rebuild word mappings
    this.negativeWords.clear();
    this.positiveReplacements = {};
    
    // Re-add built-in words
    const builtInWords = [
      'hate', 'stupid', 'ugly', 'terrible', 'awful', 'horrible', 'disgusting',
      'hateful', 'mean', 'cruel', 'evil', 'bad', 'wrong', 'fail', 'loser',
      'idiot', 'moron', 'dumb', 'suck', 'sucks', 'sucked', 'sucking',
      'annoying', 'irritating', 'frustrating', 'angry', 'mad', 'furious',
      'disappointed', 'disappointing', 'sad', 'depressed', 'miserable',
      'boring', 'bored', 'tired', 'exhausted', 'sick', 'ill', 'painful',
      'hurt', 'hurtful', 'damage', 'destroy', 'ruin', 'break', 'broken',
      'useless', 'worthless', 'pointless', 'meaningless', 'empty', 'void',
      'hopeless', 'helpless', 'powerless', 'weak', 'pathetic', 'pitiful',
      'shameful', 'embarrassing', 'disgraceful', 'disgusting', 'revolting',
      'nasty', 'gross', 'vile', 'filthy', 'dirty', 'contaminated',
      'corrupted', 'tainted', 'polluted', 'infected', 'diseased',
      'cursed', 'damned', 'doomed', 'fated', 'destined', 'condemned'
    ];
    
    const builtInReplacements = {
      'hate': 'love', 'stupid': 'clever', 'ugly': 'beautiful', 'terrible': 'wonderful',
      'awful': 'amazing', 'horrible': 'fantastic', 'disgusting': 'delightful',
      'hateful': 'loving', 'mean': 'kind', 'cruel': 'gentle', 'evil': 'good',
      'bad': 'great', 'wrong': 'right', 'fail': 'succeed', 'loser': 'winner',
      'idiot': 'genius', 'moron': 'brilliant', 'dumb': 'smart', 'suck': 'excel',
      'sucks': 'exceeds', 'sucked': 'excelled', 'sucking': 'excelling',
      'annoying': 'pleasing', 'irritating': 'soothing', 'frustrating': 'encouraging',
      'angry': 'calm', 'mad': 'peaceful', 'furious': 'serene',
      'disappointed': 'pleased', 'disappointing': 'satisfying', 'sad': 'happy',
      'depressed': 'cheerful', 'miserable': 'joyful', 'boring': 'exciting',
      'bored': 'engaged', 'tired': 'energetic', 'exhausted': 'refreshed',
      'sick': 'healthy', 'ill': 'well', 'painful': 'comfortable',
      'hurt': 'heal', 'hurtful': 'healing', 'damage': 'repair', 'destroy': 'build',
      'ruin': 'improve', 'break': 'fix', 'broken': 'fixed', 'useless': 'useful',
      'worthless': 'valuable', 'pointless': 'meaningful', 'meaningless': 'significant',
      'empty': 'full', 'void': 'complete', 'hopeless': 'hopeful', 'helpless': 'helpful',
      'powerless': 'powerful', 'weak': 'strong', 'pathetic': 'admirable',
      'pitiful': 'respectable', 'shameful': 'proud', 'embarrassing': 'confident',
      'disgraceful': 'honorable', 'disgusting': 'appealing', 'revolting': 'attractive',
      'nasty': 'pleasant', 'gross': 'lovely', 'vile': 'noble', 'filthy': 'clean',
      'dirty': 'pure', 'contaminated': 'pure', 'corrupted': 'honest',
      'tainted': 'genuine', 'polluted': 'fresh', 'infected': 'healthy',
      'diseased': 'well', 'cursed': 'blessed', 'damned': 'blessed',
      'doomed': 'destined for success', 'fated': 'blessed', 'destined': 'blessed',
      'condemned': 'redeemed'
    };
    
    builtInWords.forEach(word => {
      this.negativeWords.add(word);
      this.positiveReplacements[word] = builtInReplacements[word];
    });
    
    // Add custom words
    this.updateWordMappings();
    
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
