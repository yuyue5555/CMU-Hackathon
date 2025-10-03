// Debug test page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  // 添加调试信息
  console.log('调试页面已加载');
  
  // 检查扩展是否加载
  if (typeof chrome !== 'undefined' && chrome.runtime) {
    console.log('Chrome 扩展环境已检测到');
  } else {
    console.log('未检测到 Chrome 扩展环境');
  }
  
  // 监听页面变化
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'childList') {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const spans = node.querySelectorAll('.positive-replacement');
            if (spans.length > 0) {
              console.log('检测到转换后的内容:', spans);
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
});
