// 简单的测试脚本
console.log('测试页面已加载');

// 检查扩展
if (typeof chrome !== 'undefined') {
  chrome.storage.sync.get(['useAI', 'isEnabled'], function(result) {
    console.log('扩展状态:', result);
  });
}
