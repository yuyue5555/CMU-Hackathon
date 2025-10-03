// JavaScript logic for options page
document.addEventListener('DOMContentLoaded', function() {
  const isEnabledCheckbox = document.getElementById('isEnabled');
  const sensitivitySelect = document.getElementById('sensitivity');
  const showHighlightCheckbox = document.getElementById('showHighlight');
  const negativeWordInput = document.getElementById('negativeWord');
  const positiveWordInput = document.getElementById('positiveWord');
  const addWordBtn = document.getElementById('addWordBtn');
  const wordList = document.getElementById('wordList');
  const bulkImportTextarea = document.getElementById('bulkImport');
  const importBtn = document.getElementById('importBtn');
  const saveBtn = document.getElementById('saveBtn');
  const resetBtn = document.getElementById('resetBtn');
  const totalReplaces = document.getElementById('totalReplaces');
  const customWordsCount = document.getElementById('customWords');
  
  let customWords = [];
  
  // Load settings
  loadSettings();
  
  // Event listeners
  addWordBtn.addEventListener('click', addCustomWord);
  importBtn.addEventListener('click', importBulkWords);
  saveBtn.addEventListener('click', saveSettings);
  resetBtn.addEventListener('click', resetSettings);
  
  // Add words with Enter key
  negativeWordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addCustomWord();
    }
  });
  
  positiveWordInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
      addCustomWord();
    }
  });
  
  async function loadSettings() {
    try {
      const result = await chrome.storage.sync.get([
        'isEnabled', 'sensitivity', 'customWords', 'replaceCount', 'showHighlight'
      ]);
      
      isEnabledCheckbox.checked = result.isEnabled !== false;
      sensitivitySelect.value = result.sensitivity || 'medium';
      showHighlightCheckbox.checked = result.showHighlight !== false;
      customWords = result.customWords || [];
      
      updateWordList();
      updateStats();
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  }
  
  function addCustomWord() {
    const negative = negativeWordInput.value.trim().toLowerCase();
    const positive = positiveWordInput.value.trim();
    
    if (!negative || !positive) {
      alert('Please enter both negative and positive words');
      return;
    }
    
    if (negative === positive) {
      alert('Negative and positive words cannot be the same');
      return;
    }
    
    // Check if already exists
    const exists = customWords.some(item => item.negative === negative);
    if (exists) {
      alert('This negative word already exists');
      return;
    }
    
    customWords.push({ negative, positive });
    negativeWordInput.value = '';
    positiveWordInput.value = '';
    
    updateWordList();
    updateStats();
  }
  
  function removeCustomWord(index) {
    customWords.splice(index, 1);
    updateWordList();
    updateStats();
  }
  
  function updateWordList() {
    if (customWords.length === 0) {
      wordList.innerHTML = '<div class="word-item"><span>No custom words yet</span></div>';
      return;
    }
    
    wordList.innerHTML = customWords.map((item, index) => `
      <div class="word-item">
        <span><strong>${item.negative}</strong> → ${item.positive}</span>
        <button class="remove-btn" onclick="removeCustomWord(${index})">Remove</button>
      </div>
    `).join('');
  }
  
  function importBulkWords() {
    const text = bulkImportTextarea.value.trim();
    if (!text) {
      alert('Please enter words to import');
      return;
    }
    
    const lines = text.split('\n');
    let addedCount = 0;
    let errorCount = 0;
    
    lines.forEach(line => {
      const parts = line.split(',');
      if (parts.length === 2) {
        const negative = parts[0].trim().toLowerCase();
        const positive = parts[1].trim();
        
        if (negative && positive && negative !== positive) {
          const exists = customWords.some(item => item.negative === negative);
          if (!exists) {
            customWords.push({ negative, positive });
            addedCount++;
          }
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    });
    
    if (addedCount > 0) {
      updateWordList();
      updateStats();
      bulkImportTextarea.value = '';
      alert(`Successfully imported ${addedCount} words${errorCount > 0 ? `, ${errorCount} format errors` : ''}`);
    } else {
      alert('No words were imported successfully, please check the format');
    }
  }
  
  async function saveSettings() {
    try {
      const settings = {
        isEnabled: isEnabledCheckbox.checked,
        sensitivity: sensitivitySelect.value,
        showHighlight: showHighlightCheckbox.checked,
        customWords: customWords
      };
      
      await chrome.storage.sync.set(settings);
      
      // Notify all tabs to update settings
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        try {
          await chrome.tabs.sendMessage(tab.id, { 
            action: 'updateSettings', 
            settings: settings 
          });
        } catch (error) {
          // Ignore tabs that cannot receive messages
        }
      }
      
      alert('Settings saved!');
    } catch (error) {
      console.error('Failed to save settings:', error);
      alert('Failed to save settings, please try again');
    }
  }
  
  async function resetSettings() {
    if (confirm('Are you sure you want to reset all settings to default? This will delete all custom words.')) {
      try {
        await chrome.storage.sync.clear();
        await chrome.storage.sync.set({
          isEnabled: true,
          sensitivity: 'medium',
          showHighlight: true,
          customWords: [],
          replaceCount: 0
        });
        
        // Reload settings
        await loadSettings();
        alert('Settings reset to default!');
      } catch (error) {
        console.error('Failed to reset settings:', error);
        alert('Failed to reset settings, please try again');
      }
    }
  }
  
  async function updateStats() {
    try {
      const result = await chrome.storage.sync.get(['replaceCount']);
      totalReplaces.textContent = result.replaceCount || 0;
      customWordsCount.textContent = customWords.length;
    } catch (error) {
      console.error('Failed to update statistics:', error);
    }
  }
  
  // Expose removeCustomWord function to global scope
  window.removeCustomWord = removeCustomWord;
});
