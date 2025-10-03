// Test AI page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // 显示当前配置
  chrome.storage.sync.get(['aiService', 'useAI'], function(result) {
    const serviceEl = document.getElementById('ai-service');
    if (serviceEl) {
      if (result.useAI) {
        const service = result.aiService || 'openai';
        serviceEl.textContent = service === 'openai' ? 'OpenAI' : 'Hugging Face';
      } else {
        serviceEl.textContent = '硬编码模式';
      }
    }
  });
});
