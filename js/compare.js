window.WhatIf = window.WhatIf || {};

window.WhatIf.Compare = {
  init() {
    const state = window.WhatIf.state;
    if (!state.currentPreset) {
      state.currentPreset = 'hormuz';
    }

    if (!state.simulationResults) {
      state.simulationResults = window.WhatIf.Engine.simulate(state.currentPreset, state.sliderValues || {});
    }

    this.setupPrioritySliders();
    
    const btnRestart = document.getElementById('btn-restart');
    if (btnRestart) {
      const newBtn = btnRestart.cloneNode(true);
      btnRestart.parentNode.replaceChild(newBtn, btnRestart);
      newBtn.addEventListener('click', () => {
        window.WhatIf.state.currentPreset = null;
        window.WhatIf.state.sliderValues = {};
        window.WhatIf.navigate('home');
      });
    }

    const btnExport = document.getElementById('btn-export');
    if (btnExport) {
      const newBtn = btnExport.cloneNode(true);
      btnExport.parentNode.replaceChild(newBtn, btnExport);
      newBtn.addEventListener('click', () => this.exportSummary());
    }

    this.recalculate();
    this.recordToHistory();
  },

  setupPrioritySliders() {
    const sliders = document.querySelectorAll('.priority-slider');
    sliders.forEach(slider => {
      const newSlider = slider.cloneNode(true);
      slider.parentNode.replaceChild(newSlider, slider);
      
      newSlider.addEventListener('input', (e) => {
        const priorityType = e.target.getAttribute('data-priority');
        const val = Number(e.target.value);
        if (priorityType && window.WhatIf.state.priorities) {
          window.WhatIf.state.priorities[priorityType] = val;
        }
        
        const parent = e.target.closest('.priority-slider-wrap');
        if (parent) {
          const display = parent.querySelector('.priority-value');
          if (display) display.textContent = val;
        }
        
        // Live re-ranking under 100ms
        this.recalculate();
      });
    });
  },

  recalculate() {
    const t0 = performance.now();
    const state = window.WhatIf.state;
    const results = state.simulationResults;
    if (!results || !results.branches) return;

    const p = state.priorities || { cost: 50, risk: 50, speed: 50, impact: 50 };
    const totalWeight = (p.cost || 0) + (p.risk || 0) + (p.speed || 0) + (p.impact || 0) || 1;

    const scores = {};
    let winner = 'B';
    let maxScore = -1;

    ['A', 'B', 'C'].forEach(branch => {
      const raw = results.branches[branch].rawScores;
      let finalScore = (
        (raw.costScore * (p.cost || 50)) +
        (raw.riskScore * (p.risk || 50)) +
        (raw.speedScore * (p.speed || 50)) +
        (raw.impactScore * (p.impact || 50))
      ) / totalWeight;
      
      scores[branch] = Math.max(0, Math.min(100, Math.round(finalScore)));
      if (scores[branch] > maxScore) {
        maxScore = scores[branch];
        winner = branch;
      }
    });

    this.lastWinner = winner;
    this.lastMaxScore = maxScore;

    this.updateTable(scores, winner, results);
    this.updateVerdict(winner, maxScore, results);
    this.updateDetails(results);

    const t1 = performance.now();
    if (t1 - t0 > 100) {
      console.warn(`Re-ranking calculation took ${(t1 - t0).toFixed(2)}ms`);
    }
  },

  updateTable(scores, winner, results) {
    const tbody = document.getElementById('compare-tbody');
    if (!tbody) return;

    let html = `<tr><td>Overall Score</td>`;
    ['A', 'B', 'C'].forEach(b => {
      const isWinner = b === winner ? 'score-cell winner text-gold' : 'score-cell';
      html += `<td class="${isWinner}" style="font-weight:700;">${scores[b]}</td>`;
    });
    html += `</tr>`;

    const metrics = [
      { key: 'costScore', label: 'Fiscal Cost Score' },
      { key: 'riskScore', label: 'Public Safety Score' },
      { key: 'speedScore', label: 'Recovery Speed' },
      { key: 'impactScore', label: 'Economic Impact Score' }
    ];

    metrics.forEach(m => {
      html += `<tr><td>${m.label}</td>`;
      ['A', 'B', 'C'].forEach(b => {
        const val = results.branches[b].rawScores[m.key];
        const highlight = b === winner ? 'style="color:var(--star-white); font-weight:600;"' : '';
        html += `<td ${highlight}>${val}/100</td>`;
      });
      html += `</tr>`;
    });

    tbody.innerHTML = html;
  },

  updateVerdict(winner, score, results) {
    const textEl = document.getElementById('verdict-text');
    if (!textEl) return;
    
    const state = window.WhatIf.state;
    const duration = (state.sliderValues && state.sliderValues.duration) !== undefined ? state.sliderValues.duration : 30;
    const preset = window.WhatIf.Presets[state.currentPreset] || window.WhatIf.Presets.hormuz;
    const branchInfo = preset.branches ? preset.branches[winner] : { name: `Branch ${winner}` };

    if (state.currentPreset === 'hormuz' || !state.currentPreset) {
      if (duration >= 60) {
        textEl.innerHTML = `<strong>Under a ${duration}-day closure, Timeline ${winner} (${branchInfo.name}) leads with ${score}/100.</strong> Reserves run out around day 41, so demand-side measures become the only lever that holds. Timeline B fails as prolonged disruption exhausts national stockpiles.`;
        return;
      } else {
        textEl.innerHTML = `<strong>Under a ${duration}-day closure, Timeline ${winner} (${branchInfo.name}) leads with ${score}/100.</strong> Reserves cover the gap and prices stay contained, but the buffer is nearly spent by day 30. Timeline C is the closest alternative if prolonged disruption is expected.`;
        return;
      }
    }

    const branchData = results.branches[winner];
    const benefit = branchData.benefits ? branchData.benefits[0] : 'delivers optimal balance';
    const risk = branchData.risks ? branchData.risks[0] : 'requires careful execution';
    const alt = winner === 'A' ? 'B' : (winner === 'B' ? 'C' : 'B');

    textEl.innerHTML = `<strong>Under your priorities, Timeline ${winner} (${branchInfo.name}) leads with ${score}/100.</strong> It ${benefit.toLowerCase()}, but ${risk.toLowerCase()}. Timeline ${alt} is the closest alternative if priorities shift.`;
  },

  updateDetails(results) {
    const container = document.getElementById('compare-details');
    if (!container) return;
    
    const state = window.WhatIf.state;
    const preset = window.WhatIf.Presets[state.currentPreset] || window.WhatIf.Presets.hormuz;

    container.innerHTML = '';
    ['A', 'B', 'C'].forEach(b => {
      const bInfo = preset.branches ? preset.branches[b] : { name: `Timeline ${b}`, shape: '●', strategy: '' };
      const bData = results.branches[b];

      const div = document.createElement('div');
      div.className = 'compare-branch-detail';
      div.innerHTML = `
        <div class="detail-title" style="color:var(--branch-${b.toLowerCase()});">
          <span>${bInfo.shape}</span> Timeline ${b}: ${bInfo.name}
        </div>
        <div style="font-size:0.8rem; color:var(--mist); margin-bottom:12px;">${bInfo.strategy}</div>
        <div class="detail-section">
          <div class="detail-section-title">Benefits</div>
          <ul class="detail-list benefits">
            ${(bData.benefits || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Risks</div>
          <ul class="detail-list risks">
            ${(bData.risks || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Trade-offs</div>
          <ul class="detail-list tradeoffs">
            ${(bData.tradeoffs || []).map(item => `<li>${item}</li>`).join('')}
          </ul>
        </div>
      `;
      container.appendChild(div);
    });
  },

  exportSummary() {
    const state = window.WhatIf.state;
    const preset = window.WhatIf.Presets[state.currentPreset] || window.WhatIf.Presets.hormuz;
    const verdict = document.getElementById('verdict-text')?.textContent || '';
    
    let content = `WHAT IF? — Future Decision Simulator\n`;
    content += `==========================================\n\n`;
    content += `Decision: ${state.decision || preset.decision}\n`;
    content += `Preset: ${preset.title}\n`;
    content += `Simulation Date: ${new Date().toLocaleDateString()}\n\n`;
    content += `VERDICT:\n${verdict}\n\n`;
    content += `KEY PARAMETERS:\n`;
    for (const [k, v] of Object.entries(state.sliderValues || {})) {
      content += `- ${k}: ${v}\n`;
    }
    content += `\nPRIORITIES:\n`;
    for (const [k, v] of Object.entries(state.priorities || {})) {
      content += `- ${k}: ${v}%\n`;
    }
    content += `\n------------------------------------------\n`;
    content += `Illustrative model for decision support. Not a forecast.\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `WhatIf-${preset.id}-decision-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  recordToHistory() {
    if (window.WhatIf.History && window.WhatIf.History.record) {
      const state = window.WhatIf.state;
      const presetKey = state.currentPreset || 'hormuz';
      const preset = window.WhatIf.Presets[presetKey] || window.WhatIf.Presets.hormuz;
      const winner = this.lastWinner || 'B';
      const branchInfo = preset.branches ? preset.branches[winner] : { name: `Branch ${winner}` };
      const textEl = document.getElementById('verdict-text');
      const verdict = textEl ? textEl.innerText : 'Simulation evaluated across all timeline branches.';

      window.WhatIf.History.record({
        prompt: state.decision || preset.decision,
        presetKey: presetKey,
        presetTitle: preset.title,
        sector: preset.title ? `SECTOR · ${preset.title.toUpperCase()}` : 'ACTIVE TIMELINE SECTOR',
        winnerBranch: `Branch ${winner} (${branchInfo.name})`,
        score: `${this.lastMaxScore || 78}/100`,
        verdict: verdict
      });
    }
  }
};
