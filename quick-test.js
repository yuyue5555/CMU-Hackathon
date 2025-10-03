// Quick test page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  console.log('快速测试页面已加载');
  
  // 检查扩展状态
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    chrome.storage.sync.get(['isEnabled', 'useAI'], function(result) {
      console.log('扩展状态:', result);
      
      if (!result.isEnabled) {
        console.warn('扩展未启用');
      }
      
      if (!result.useAI) {
        console.warn('AI 模式未启用');
      }
    });
  }
  
  // 监听页面变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const spans = node.querySelectorAll('.positive-replacement');
            if (spans.length > 0) {
              console.log('✅ 检测到转换后的内容:', spans);
              spans.forEach(span => {
                console.log('转换内容:', span.textContent, '提示:', span.title);
              });
            }
          }
        });
      }
    });
  });
  
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
  
  // 5秒后检查是否有转换
  setTimeout(() => {
    const convertedElements = document.querySelectorAll('.positive-replacement');
    if (convertedElements.length > 0) {
      console.log('✅ 成功！检测到', convertedElements.length, '个转换的元素');
    } else {
      console.log('❌ 没有检测到转换，可能存在问题');
    }
  }, 5000);
});
