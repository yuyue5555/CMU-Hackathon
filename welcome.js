// Welcome page JavaScript
document.addEventListener('DOMContentLoaded', function() {
  const startBtn = document.getElementById('startBtn');
  const settingsBtn = document.getElementById('settingsBtn');
  
  if (startBtn) {
    startBtn.addEventListener('click', function() {
      window.close();
    });
  }
  
  if (settingsBtn) {
    settingsBtn.addEventListener('click', function() {
      chrome.runtime.openOptionsPage();
    });
  }
});
