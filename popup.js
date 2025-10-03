// JavaScript logic for popup page
document.addEventListener('DOMContentLoaded', async function() {
  const toggleSwitch = document.getElementById('toggleSwitch');
  const status = document.getElementById('status');
  const replaceCount = document.getElementById('replaceCount');
  const wordCount = document.getElementById('wordCount');
  const highlightStatus = document.getElementById('highlightStatus');
  const optionsBtn = document.getElementById('optionsBtn');
  const refreshBtn = document.getElementById('refreshBtn');
  
  // Get current status
  const result = await chrome.storage.sync.get(['isEnabled', 'replaceCount', 'showHighlight']);
  const isEnabled = result.isEnabled !== false;
  const showHighlight = result.showHighlight !== false;
  
  // Update UI
  updateUI(isEnabled);
  highlightStatus.textContent = showHighlight ? 'On' : 'Off';
  
  // Get replacement count from content script
  try {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    
    // 检查是否是扩展页面
    if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'getReplaceCount' });
      if (response && response.count !== undefined) {
        replaceCount.textContent = response.count;
      }
    } else {
      // 对于扩展页面，从存储中获取计数
      const storageResult = await chrome.storage.sync.get(['replaceCount']);
      replaceCount.textContent = storageResult.replaceCount || 0;
    }
  } catch (error) {
    console.log('Unable to get replacement count:', error);
    // 从存储中获取计数作为备选
    const storageResult = await chrome.storage.sync.get(['replaceCount']);
    replaceCount.textContent = storageResult.replaceCount || 0;
  }
  
  // Toggle switch event
  toggleSwitch.addEventListener('click', async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否是扩展页面
      if (tab.url.startsWith('chrome://') || tab.url.startsWith('chrome-extension://')) {
        console.log('无法在扩展页面中切换');
        return;
      }
      
      // 尝试注入 content script（如果还没有注入）
      try {
        await chrome.scripting.executeScript({
          target: { tabId: tab.id },
          files: ['content.js']
        });
      } catch (injectError) {
        console.log('Content script 可能已经注入或无法注入:', injectError);
      }
      
      // 等待一下让 content script 加载
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const response = await chrome.tabs.sendMessage(tab.id, { action: 'toggle' });
      
      if (response && response.success) {
        updateUI(response.isEnabled);
        // Save state to storage
        await chrome.storage.sync.set({ isEnabled: response.isEnabled });
      }
    } catch (error) {
      console.error('Toggle failed:', error);
      // If content script doesn't respond, update local state directly
      const newState = !isEnabled;
      updateUI(newState);
      await chrome.storage.sync.set({ isEnabled: newState });
      
      // 显示用户友好的错误信息
      status.textContent = 'Error - Try refreshing page';
      setTimeout(() => {
        updateUI(newState);
      }, 2000);
      
      // 尝试重新注入 content script
      try {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
          await chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js']
          });
          console.log('Content script 重新注入成功');
        }
      } catch (injectError) {
        console.log('重新注入 content script 失败:', injectError);
      }
    }
  });
  
  // Settings button event
  optionsBtn.addEventListener('click', function() {
    chrome.runtime.openOptionsPage();
  });
  
  // Refresh page button event
  refreshBtn.addEventListener('click', function() {
    chrome.tabs.query({ active: true, currentWindow: true }, function(tabs) {
      chrome.tabs.reload(tabs[0].id);
    });
  });
  
  function updateUI(enabled) {
    if (enabled) {
      toggleSwitch.classList.add('active');
      status.textContent = 'Enabled';
    } else {
      toggleSwitch.classList.remove('active');
      status.textContent = 'Disabled';
    }
  }
  
  // Periodically update replacement count
  setInterval(async function() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      
      // 检查是否是扩展页面
      if (!tab.url.startsWith('chrome://') && !tab.url.startsWith('chrome-extension://')) {
        const response = await chrome.tabs.sendMessage(tab.id, { action: 'getReplaceCount' });
        if (response && response.count !== undefined) {
          replaceCount.textContent = response.count;
        }
      } else {
        // 对于扩展页面，从存储中获取计数
        const storageResult = await chrome.storage.sync.get(['replaceCount']);
        replaceCount.textContent = storageResult.replaceCount || 0;
      }
    } catch (error) {
      // 从存储中获取计数作为备选
      try {
        const storageResult = await chrome.storage.sync.get(['replaceCount']);
        replaceCount.textContent = storageResult.replaceCount || 0;
      } catch (storageError) {
        // Silently handle errors
      }
    }
  }, 2000);
  
  // ===== TAB SWITCHING =====
  // Check if D3 is loaded
  if (typeof d3 === 'undefined') {
    console.error('D3.js failed to load. Charts will not work.');
  } else {
    console.log('D3.js loaded successfully, version:', d3.version);
  }
  
  const tabButtons = document.querySelectorAll('.tab-button');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabName = button.getAttribute('data-tab');
      
      // Update active states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      tabContents.forEach(content => content.classList.remove('active'));
      
      button.classList.add('active');
      document.getElementById(`${tabName}-tab`).classList.add('active');
      
      // Load dashboard if switching to it
      if (tabName === 'dashboard') {
        loadDashboard();
      }
    });
  });
  
  // ===== DASHBOARD FUNCTIONS =====
  async function loadDashboard() {
    try {
      const response = await chrome.runtime.sendMessage({ action: 'getAnalytics' });
      
      if (response.success) {
        const { totalCount, history, dailyStats } = response.data;
        
        // Update stat cards
        updateStatCards(totalCount, history, dailyStats);
        
        // Render charts
        renderTimelineChart(dailyStats, history);
        renderDomainChart(history);
        renderRecentList(history);
      }
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }
  
  function updateStatCards(totalCount, history, dailyStats) {
    // Total count
    document.getElementById('dash-total-count').textContent = totalCount || 0;
    
    // Last hour count (from real data)
    const hourCount = getHourCount(history);
    document.getElementById('dash-hour-count').textContent = hourCount;
    
    // Average toxicity (from recent history)
    const avgToxicity = getAverageToxicity(history);
    document.getElementById('dash-avg-toxicity').textContent = 
      (avgToxicity * 100).toFixed(0) + '%';
    
    // Week count
    const weekCount = getWeekCount(dailyStats);
    document.getElementById('dash-week-count').textContent = weekCount;
  }
  
  function getHourCount(history) {
    if (!history || history.length === 0) return 0;
    
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    return history.filter(item => {
      const itemTime = new Date(item.timestamp);
      return itemTime >= oneHourAgo && itemTime <= now;
    }).length;
  }
  
  function getAverageToxicity(history) {
    if (!history || history.length === 0) return 0;
    
    // Calculate from recent items (last 24 hours)
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    
    const recentItems = history.filter(item => {
      const itemTime = new Date(item.timestamp);
      return itemTime >= oneDayAgo && itemTime <= now;
    });
    
    if (recentItems.length === 0) return 0;
    
    const totalToxicity = recentItems.reduce((sum, item) => sum + (item.toxicityScore || 0), 0);
    return totalToxicity / recentItems.length;
  }
  
  function getWeekCount(dailyStats) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    
    let count = 0;
    for (const [date, stats] of Object.entries(dailyStats)) {
      const dateObj = new Date(date);
      if (dateObj >= weekAgo && dateObj <= now) {
        count += stats.count || 0;
      }
    }
    return count;
  }
  
  function renderTimelineChart(dailyStats, history) {
    const svg = d3.select('#timeline-chart');
    svg.selectAll('*').remove(); // Clear previous
    
    const width = 400;
    const height = 150;
    const margin = { top: 20, right: 20, bottom: 30, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    // Get last 7 hours of data from actual history
    const now = new Date();
    const sevenHoursAgo = new Date(now.getTime() - 7 * 60 * 60 * 1000);
    
    // Create hourly buckets
    const hourlyData = {};
    for (let i = 6; i >= 0; i--) {
      const hourTime = new Date(now.getTime() - i * 60 * 60 * 1000);
      const hourLabel = hourTime.getHours() + ':00';
      hourlyData[hourLabel] = { hour: hourLabel, count: 0, timestamp: hourTime };
    }
    
    // Fill buckets with real data from history
    if (history && history.length > 0) {
      history.forEach(item => {
        const itemTime = new Date(item.timestamp);
        if (itemTime >= sevenHoursAgo && itemTime <= now) {
          const hourLabel = itemTime.getHours() + ':00';
          if (hourlyData[hourLabel]) {
            hourlyData[hourLabel].count++;
          }
        }
      });
    }
    
    // Convert to array and sort by time
    const data = Object.values(hourlyData).sort((a, b) => a.timestamp - b.timestamp);
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scalePoint()
      .domain(data.map(d => d.hour))
      .range([0, chartWidth])
      .padding(0.5);
    
    const maxCount = d3.max(data, d => d.count) || 5;
    const yScale = d3.scaleLinear()
      .domain([0, maxCount])
      .range([chartHeight, 0]);
    
    // Line
    const line = d3.line()
      .x(d => xScale(d.hour))
      .y(d => yScale(d.count))
      .curve(d3.curveMonotoneX);
    
    g.append('path')
      .datum(data)
      .attr('fill', 'none')
      .attr('stroke', '#4CAF50')
      .attr('stroke-width', 2)
      .attr('d', line);
    
    // Points
    g.selectAll('circle')
      .data(data)
      .enter()
      .append('circle')
      .attr('cx', d => xScale(d.hour))
      .attr('cy', d => yScale(d.count))
      .attr('r', 4)
      .attr('fill', '#4CAF50')
      .attr('stroke', 'white')
      .attr('stroke-width', 2);
    
    // Axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .style('font-size', '10px');
  }
  
  function renderDomainChart(history) {
    const svg = d3.select('#domain-chart');
    svg.selectAll('*').remove();
    
    if (!history || history.length === 0) {
      svg.append('text')
        .attr('x', 200)
        .attr('y', 75)
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .style('font-size', '12px')
        .text('No data available');
      return;
    }
    
    // Aggregate data by domain with toxicity info
    const domainData = {};
    history.forEach(item => {
      const domain = item.domain || 'unknown';
      if (!domainData[domain]) {
        domainData[domain] = {
          count: 0,
          totalToxicity: 0,
          avgToxicity: 0
        };
      }
      domainData[domain].count++;
      domainData[domain].totalToxicity += (item.toxicityScore || 0);
    });
    
    // Calculate averages
    Object.keys(domainData).forEach(domain => {
      domainData[domain].avgToxicity = 
        domainData[domain].totalToxicity / domainData[domain].count;
    });
    
    // Get top 5 by count
    const data = Object.entries(domainData)
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([domain, stats]) => ({
        domain: domain,
        count: stats.count,
        avgToxicity: stats.avgToxicity
      }));
    
    if (data.length === 0) {
      svg.append('text')
        .attr('x', 200)
        .attr('y', 75)
        .attr('text-anchor', 'middle')
        .attr('fill', '#999')
        .style('font-size', '12px')
        .text('No data available');
      return;
    }
    
    const width = 400;
    const height = 150;
    const margin = { top: 20, right: 20, bottom: 60, left: 40 };
    const chartWidth = width - margin.left - margin.right;
    const chartHeight = height - margin.top - margin.bottom;
    
    const g = svg.append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);
    
    // Scales
    const xScale = d3.scaleBand()
      .domain(data.map(d => d.domain))
      .range([0, chartWidth])
      .padding(0.3);
    
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count)])
      .range([chartHeight, 0]);
    
    // Color scale based on toxicity (darker = more toxic)
    const colorScale = d3.scaleLinear()
      .domain([0.6, 1.0])
      .range(['#9b59b6', '#c0392b']);
    
    // Bars with color gradient based on toxicity
    g.selectAll('rect')
      .data(data)
      .enter()
      .append('rect')
      .attr('x', d => xScale(d.domain))
      .attr('y', d => yScale(d.count))
      .attr('width', xScale.bandwidth())
      .attr('height', d => chartHeight - yScale(d.count))
      .attr('fill', d => colorScale(d.avgToxicity))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);
    
    // Add count labels on top of bars
    g.selectAll('.count-label')
      .data(data)
      .enter()
      .append('text')
      .attr('class', 'count-label')
      .attr('x', d => xScale(d.domain) + xScale.bandwidth() / 2)
      .attr('y', d => yScale(d.count) - 5)
      .attr('text-anchor', 'middle')
      .attr('fill', '#333')
      .style('font-size', '11px')
      .style('font-weight', 'bold')
      .text(d => d.count);
    
    // Axes
    g.append('g')
      .attr('transform', `translate(0,${chartHeight})`)
      .call(d3.axisBottom(xScale))
      .selectAll('text')
      .attr('transform', 'rotate(-45)')
      .style('text-anchor', 'end')
      .style('font-size', '10px');
    
    g.append('g')
      .call(d3.axisLeft(yScale).ticks(5))
      .style('font-size', '10px');
  }
  
  function renderRecentList(history) {
    const list = document.getElementById('recent-list');
    list.innerHTML = '';
    
    if (history.length === 0) {
      list.innerHTML = '<li class="loading">No transformations yet</li>';
      return;
    }
    
    // Show last 10
    history.slice(0, 10).forEach(item => {
      const li = document.createElement('li');
      li.className = 'recent-item';
      
      const time = new Date(item.timestamp).toLocaleString();
      const toxicity = (item.toxicityScore * 100).toFixed(0);
      
      li.innerHTML = `
        <div class="recent-item-time">${time} • ${item.domain}</div>
        <div class="recent-item-text">
          <strong>Toxicity:</strong> ${toxicity}% • 
          <strong>Service:</strong> ${item.aiService}
        </div>
      `;
      
      list.appendChild(li);
    });
  }
});
