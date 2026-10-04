window.WhatIf = window.WhatIf || {};

window.WhatIf.Charts = (function() {
  const COLORS = {
    branchA: '#E62429',  // Marvel Crimson Red
    branchB: '#38E1FF',  // Cosmic Cyan
    branchC: '#A78BFA',  // Variant Violet
    grid: '#26141B',     // Dark Crimson Slate
    text: '#94A3B8',     // Silver Mist
    bg: '#0C0D14',       // Deep Void
    white: '#FFFFFF'     // Star White
  };

  const BRANCH_SHAPES = {
    A: '●',
    B: '◆',
    C: '▲'
  };

  const BRANCH_NAMES = {
    A: 'Branch A',
    B: 'Branch B',
    C: 'Branch C'
  };

  const activeAnimations = new Map();
  const eventListeners = new Map();

  /**
   * Helper to handle high DPI displays for crisp rendering
   */
  function setupCanvas(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return null;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    const displayW = rect.width > 0 ? rect.width : (canvas.clientWidth > 0 ? canvas.clientWidth : (canvas.getAttribute('width') ? Number(canvas.getAttribute('width')) : 700));
    const displayH = rect.height > 0 ? rect.height : (canvas.clientHeight > 0 ? canvas.clientHeight : (canvas.getAttribute('height') ? Number(canvas.getAttribute('height')) : 350));

    if (canvas.width !== Math.round(displayW * dpr) || canvas.height !== Math.round(displayH * dpr)) {
      canvas.width = Math.round(displayW * dpr);
      canvas.height = Math.round(displayH * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    
    return { canvas, ctx, width: displayW, height: displayH };
  }

  function clearChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (canvas) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    if (activeAnimations.has(canvasId)) {
      cancelAnimationFrame(activeAnimations.get(canvasId));
      activeAnimations.delete(canvasId);
    }
  }

  function easeOutQuart(x) {
    return 1 - Math.pow(1 - x, 4);
  }

  function drawLineChart(canvasId, data, activeBranch = 'all', metric = 'fuelPrice') {
    clearChart(canvasId);
    const canvasInfo = setupCanvas(canvasId);
    if (!canvasInfo) return;
    const { canvas, ctx, width, height } = canvasInfo;

    const pad = { left: 60, right: 20, top: 20, bottom: 40 };
    const chartW = width - pad.left - pad.right;
    const chartH = height - pad.top - pad.bottom;

    // Extract data
    const branches = ['A', 'B', 'C'];
    let allValues = [];
    let days = [];

    branches.forEach(b => {
      const bData = data?.branches?.[b]?.timeSeries;
      if (bData && bData[metric]) {
        if (!days.length && bData.days) days = bData.days;
        allValues = allValues.concat(bData[metric]);
      }
    });

    if (!allValues.length || !days.length) return; // No data

    const maxVal = Math.max(...allValues);
    const minVal = Math.min(...allValues);
    const range = maxVal - minVal || 1;
    const yMin = Math.max(0, minVal - range * 0.1); 
    const yMax = maxVal + range * 0.1;

    // Draw background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    // Setup animation
    const duration = 600;
    const startTime = performance.now();

    function draw(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      // Reset
      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      drawGridAndAxes(ctx, width, height, chartW, chartH, pad, yMin, yMax, days);
      
      // Save context and clip for left-to-right animation
      ctx.save();
      ctx.beginPath();
      ctx.rect(pad.left, 0, chartW * easedProgress + pad.right, height);
      ctx.clip();

      // Draw lines
      branches.forEach(b => {
        const bData = data?.branches?.[b]?.timeSeries?.[metric];
        if (!bData) return;
        
        const isFaded = activeBranch !== 'all' && activeBranch !== b;
        const color = COLORS[`branch${b}`];
        
        ctx.beginPath();
        bData.forEach((val, i) => {
          const x = pad.left + (i / (days.length - 1)) * chartW;
          const y = pad.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        });

        ctx.strokeStyle = color;
        ctx.lineWidth = isFaded ? 1 : 2.5;
        ctx.globalAlpha = isFaded ? 0.3 : 1.0;
        ctx.stroke();

        // Draw markers every 15 days (assuming days array has 1 day intervals or mapping it)
        // Find indices where day is a multiple of 15
        ctx.fillStyle = color;
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        bData.forEach((val, i) => {
          const day = days[i];
          if (day % 15 === 0) {
            const x = pad.left + (i / (days.length - 1)) * chartW;
            const y = pad.top + chartH - ((val - yMin) / (yMax - yMin)) * chartH;
            ctx.fillText(BRANCH_SHAPES[b], x, y);
          }
        });
        
        ctx.globalAlpha = 1.0; // Reset alpha
      });

      ctx.restore();
      drawLegend(ctx, width, pad);

      if (progress < 1) {
        activeAnimations.set(canvasId, requestAnimationFrame(draw));
      } else {
        activeAnimations.delete(canvasId);
      }
    }

    activeAnimations.set(canvasId, requestAnimationFrame(draw));
    setupTooltip(canvas, canvasId, pad, chartW, chartH, days, yMin, yMax, data, metric, activeBranch, branches);
  }

  function drawGridAndAxes(ctx, width, height, chartW, chartH, pad, yMin, yMax, days) {
    // Grid Lines (Horizontal)
    ctx.beginPath();
    ctx.strokeStyle = COLORS.grid;
    ctx.setLineDash([2, 4]);
    ctx.lineWidth = 1;
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (i / gridLines) * chartH;
      ctx.moveTo(pad.left, y);
      ctx.lineTo(pad.left + chartW, y);
      
      // Y-axis labels
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px JetBrains Mono';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const val = yMax - (i / gridLines) * (yMax - yMin);
      ctx.fillText(val.toFixed(1), pad.left - 10, y);
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // X-axis labels (Day 0, 15, 30...)
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    days.forEach((day, i) => {
      if (day % 15 === 0) {
        const x = pad.left + (i / (days.length - 1)) * chartW;
        ctx.fillText(`Day ${day}`, x, pad.top + chartH + 10);
      }
    });
  }

  function drawLegend(ctx, width, pad) {
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    let x = width - pad.right;
    const y = pad.top;

    ['C', 'B', 'A'].forEach(b => {
      const text = `${BRANCH_SHAPES[b]} ${BRANCH_NAMES[b]}`;
      ctx.fillStyle = COLORS[`branch${b}`];
      ctx.fillText(text, x, y);
      x -= ctx.measureText(text).width + 15;
    });
  }

  function setupTooltip(canvas, canvasId, pad, chartW, chartH, days, yMin, yMax, data, metric, activeBranch, branches) {
    // Cleanup old event listeners
    if (eventListeners.has(canvasId)) {
      const old = eventListeners.get(canvasId);
      canvas.removeEventListener('mousemove', old.move);
      canvas.removeEventListener('mouseleave', old.leave);
    }

    let tooltip = document.getElementById(`whatif-tooltip-${canvasId}`);
    if (!tooltip) {
      tooltip = document.createElement('div');
      tooltip.id = `whatif-tooltip-${canvasId}`;
      tooltip.style.position = 'absolute';
      tooltip.style.pointerEvents = 'none';
      tooltip.style.background = 'rgba(11, 16, 48, 0.9)';
      tooltip.style.border = `1px solid ${COLORS.grid}`;
      tooltip.style.color = COLORS.white;
      tooltip.style.padding = '8px';
      tooltip.style.borderRadius = '4px';
      tooltip.style.fontFamily = 'JetBrains Mono, monospace';
      tooltip.style.fontSize = '11px';
      tooltip.style.display = 'none';
      tooltip.style.zIndex = '1000';
      document.body.appendChild(tooltip);
    }

    const moveHandler = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      if (x >= pad.left && x <= pad.left + chartW && y >= pad.top && y <= pad.top + chartH) {
        const ratio = (x - pad.left) / chartW;
        const index = Math.round(ratio * (days.length - 1));
        const day = days[index];
        
        let html = `<strong>Day ${day}</strong><br>`;
        branches.forEach(b => {
          if (activeBranch !== 'all' && activeBranch !== b) return;
          const val = data?.branches?.[b]?.timeSeries?.[metric]?.[index];
          if (val !== undefined) {
            html += `<span style="color:${COLORS[`branch${b}`]}">${BRANCH_SHAPES[b]} ${b}: ${val.toFixed(2)}</span><br>`;
          }
        });
        
        tooltip.innerHTML = html;
        tooltip.style.display = 'block';
        tooltip.style.left = `${e.clientX + 15}px`;
        tooltip.style.top = `${e.clientY + 15}px`;
      } else {
        tooltip.style.display = 'none';
      }
    };

    const leaveHandler = () => {
      tooltip.style.display = 'none';
    };

    canvas.addEventListener('mousemove', moveHandler);
    canvas.addEventListener('mouseleave', leaveHandler);
    eventListeners.set(canvasId, { move: moveHandler, leave: leaveHandler });
  }

  function drawRadarChart(canvasId, data, activeBranch = 'all') {
    clearChart(canvasId);
    const canvasInfo = setupCanvas(canvasId);
    if (!canvasInfo) return;
    const { ctx, width, height } = canvasInfo;

    const centerX = width / 2;
    const centerY = height / 2;
    const radius = Math.min(width, height) / 2 - 40; // padding

    const axes = ['Cost', 'Supply', 'Price stability', 'Fiscal', 'Political', 'Recovery'];
    const numAxes = axes.length;
    const angleStep = (Math.PI * 2) / numAxes;

    // Draw background
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, width, height);

    const duration = 400;
    const startTime = performance.now();

    function draw(timestamp) {
      const elapsed = timestamp - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutQuart(progress);

      ctx.fillStyle = COLORS.bg;
      ctx.fillRect(0, 0, width, height);

      // Draw Grid (Hexagons)
      ctx.strokeStyle = COLORS.grid;
      ctx.lineWidth = 1;
      [0.33, 0.66, 1.0].forEach(scale => {
        ctx.beginPath();
        for (let i = 0; i < numAxes; i++) {
          const angle = i * angleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius * scale;
          const y = centerY + Math.sin(angle) * radius * scale;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.stroke();
      });

      // Draw Axes Lines & Labels
      ctx.fillStyle = COLORS.text;
      ctx.font = '11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      
      for (let i = 0; i < numAxes; i++) {
        const angle = i * angleStep - Math.PI / 2;
        const x = centerX + Math.cos(angle) * radius;
        const y = centerY + Math.sin(angle) * radius;
        
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(x, y);
        ctx.stroke();

        // Labels
        const labelX = centerX + Math.cos(angle) * (radius + 20);
        const labelY = centerY + Math.sin(angle) * (radius + 15);
        ctx.fillText(axes[i], labelX, labelY);
      }

      // Draw Branch Data
      const branches = ['A', 'B', 'C'];
      branches.forEach(b => {
        if (activeBranch !== 'all' && activeBranch !== b) return;
        
        const bData = data?.branches?.[b]?.radar; // expects array of 6 values 0-100
        if (!bData || bData.length !== numAxes) return;

        const color = COLORS[`branch${b}`];
        
        ctx.beginPath();
        const points = [];
        for (let i = 0; i < numAxes; i++) {
          const valScale = (bData[i] / 100) * easedProgress;
          const angle = i * angleStep - Math.PI / 2;
          const x = centerX + Math.cos(angle) * radius * valScale;
          const y = centerY + Math.sin(angle) * radius * valScale;
          points.push({x, y});
          
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();

        // Fill and Stroke
        ctx.fillStyle = color;
        ctx.globalAlpha = 0.15;
        ctx.fill();
        
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.stroke();

        // Draw Markers
        ctx.font = '10px sans-serif';
        points.forEach(pt => {
          ctx.fillText(BRANCH_SHAPES[b], pt.x, pt.y);
        });
      });

      if (progress < 1) {
        activeAnimations.set(canvasId, requestAnimationFrame(draw));
      } else {
        activeAnimations.delete(canvasId);
      }
    }

    activeAnimations.set(canvasId, requestAnimationFrame(draw));
  }

  // Handle Resize Events (Debounced)
  let resizeTimeout;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Logic to redraw active charts would go here
      // Ideally, the main app listens to window resize and calls draw functions again
      // with current state data.
    }, 150);
  });

  return {
    drawLineChart,
    drawRadarChart,
    clearChart,
    COLORS
  };
})();
