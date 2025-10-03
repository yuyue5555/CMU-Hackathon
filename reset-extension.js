// 重置扩展设置的脚本
// 在浏览器控制台中运行此脚本来重置扩展

chrome.storage.sync.clear().then(() => {
  console.log('扩展设置已清除');
  
  // 重新设置默认值
  chrome.storage.sync.set({
    isEnabled: true,
    replaceCount: 0,
    useAI: true,
    aiService: 'openai',
    systemPromptKey: 'WORD_REPLACER',
    showHighlight: true
  }).then(() => {
    console.log('扩展设置已重置为默认值');
    console.log('请重新加载扩展');
  });
});
