// 修复 AI 设置的脚本
// 在浏览器控制台中运行此脚本来启用 AI 功能

console.log('开始修复 AI 设置...');

// 检查当前设置
chrome.storage.sync.get(['useAI', 'aiService', 'systemPromptKey', 'isEnabled'], function(result) {
  console.log('当前设置:', result);
  
  // 强制启用 AI 功能
  chrome.storage.sync.set({
    useAI: true,
    aiService: 'openai',
    systemPromptKey: 'WORD_REPLACER',
    isEnabled: true
  }, function() {
    console.log('✅ AI 设置已修复！');
    console.log('新设置:', {
      useAI: true,
      aiService: 'openai',
      systemPromptKey: 'WORD_REPLACER',
      isEnabled: true
    });
    
    // 刷新当前页面以应用新设置
    if (confirm('设置已更新，是否刷新页面以应用新设置？')) {
      location.reload();
    }
  });
});
