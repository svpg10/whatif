window.WhatIf = window.WhatIf || {};

window.WhatIf.Compare = {
  init() {
    const state = window.WhatIf.state;
    if (!window.WhatIf.Scenarios.current()) { window.WhatIf.navigate('analysis'); return; }
    state.simulationResults = window.WhatIf.Engine.simulate(state.currentPreset, state.sliderValues || {});

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
      const type = newSlider.getAttribute('data-priority');
      newSlider.value = window.WhatIf.state.priorities?.[type] ?? 50;
      newSlider.closest('.priority-slider-wrap').querySelector('.priority-value').textContent = newSlider.value;
      
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
        this.recordToHistory();
      });
    });
  },

  recalculate() {
    const t0 = performance.now();
    const state = window.WhatIf.state;
    const results = state.simulationResults;
    if (!results || !results.branches) return;

    let p = window.WhatIf.Scenarios.priorities(state.priorities);
    if (Object.values(p).every(value => value === 0)) p = { cost: 25, risk: 25, speed: 25, impact: 25 };
    const totalWeight = p.cost + p.risk + p.speed + p.impact;

    const scores = {};
    let winner = 'B';
    let maxScore = -1;

    ['A', 'B', 'C'].forEach(branch => {
      const raw = results.branches[branch].rawScores;
      let finalScore = (
        (raw.costScore * p.cost) +
        (raw.riskScore * p.risk) +
        (raw.speedScore * p.speed) +
        (raw.impactScore * p.impact)
      ) / totalWeight;
      
      scores[branch] = Math.max(0, Math.min(100, Math.round(finalScore)));
      if (scores[branch] > maxScore) {
        maxScore = scores[branch];
        winner = branch;
      }
    });

    this.lastWinner = winner;
    this.lastMaxScore = maxScore;
    this.lastScores = scores;

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

    let html = `<tr><th scope="row">Overall Score</th>`;
    ['A', 'B', 'C'].forEach(b => {
      const isWinner = scores[b] === scores[winner] ? 'score-cell winner text-gold' : 'score-cell';
      html += `<td class="${isWinner}" style="font-weight:700;">${scores[b]}</td>`;
    });
    html += `</tr>`;

    const metrics = [
      { key: 'costScore', label: 'Cost efficiency' },
      { key: 'riskScore', label: 'Safety' },
      { key: 'speedScore', label: 'Delivery speed' },
      { key: 'impactScore', label: 'Impact' }
    ];

    metrics.forEach(m => {
      html += `<tr><th scope="row">${m.label}</th>`;
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
    const preset = window.WhatIf.Scenarios.current();
    const branchInfo = preset.branches[winner];
    const branchData = results.branches[winner];
    const alternatives = ['A', 'B', 'C'].filter(key => key !== winner).sort((a, b) => this.lastScores[b] - this.lastScores[a]);
    const ties = ['A', 'B', 'C'].filter(key => this.lastScores[key] === score);
    const headline = ties.length > 1 ? `Timelines ${ties.join(' and ')} tie at ${score}/100.` :
      `Timeline ${winner} (${branchInfo.name}) leads with ${score}/100 under your priorities.`;
    textEl.textContent = headline + ` Benefit: ${branchData.benefits[0]} Risk: ${branchData.risks[0]} ` +
      `Timeline ${alternatives[0]} is the closest alternative. Scores are illustrative, not probabilities or forecasts.` +
      (Object.values(window.WhatIf.Scenarios.priorities(state.priorities)).every(n => n === 0) ? ' All priorities are zero, so equal weights are used.' : '');
  },

  updateDetails(results) {
    const container = document.getElementById('compare-details');
    if (!container) return;
    
    const state = window.WhatIf.state;
    const preset = window.WhatIf.Scenarios.current();

    const e = window.WhatIf.Scenarios.escapeHTML;
    const hadDetails = container.dataset.runId === state.runId && Boolean(container.querySelector('details'));
    const opened = new Set(Array.from(container.querySelectorAll('details[open]')).map(node => node.dataset.branch));
    container.dataset.runId = state.runId;
    container.innerHTML = '';
    ['A', 'B', 'C'].forEach(b => {
      const bInfo = preset.branches ? preset.branches[b] : { name: `Timeline ${b}`, shape: '●', strategy: '' };
      const bData = results.branches[b];

      const div = document.createElement('details');
      div.className = 'compare-branch-detail';
      div.dataset.branch = b;
      div.open = hadDetails ? opened.has(b) : b === this.lastWinner;
      div.innerHTML = `
        <summary><span class="detail-title" style="color:var(--branch-${b.toLowerCase()});">
          <span>${bInfo.shape}</span> Timeline ${b}: ${e(bInfo.name)}
        </span></summary>
        <div class="ui-detail-body">
        <p class="ui-detail-strategy">${e(bInfo.strategy)}</p>
        <div class="detail-section">
          <div class="detail-section-title">Benefits</div>
          <ul class="detail-list benefits">
            ${(bData.benefits || []).map(item => `<li>${e(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Risks</div>
          <ul class="detail-list risks">
            ${(bData.risks || []).map(item => `<li>${e(item)}</li>`).join('')}
          </ul>
        </div>
        <div class="detail-section">
          <div class="detail-section-title">Trade-offs</div>
          <ul class="detail-list tradeoffs">
            ${(bData.tradeoffs || []).map(item => `<li>${e(item)}</li>`).join('')}
          </ul>
        </div>
        </div>
      `;
      container.appendChild(div);
    });
  },

  exportSummary() {
    const state = window.WhatIf.state;
    const preset = window.WhatIf.Scenarios.current();
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
    if (preset.assumptions) content += `\nASSUMPTIONS:\n${preset.assumptions.join('\n')}\n`;
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
      const presetKey = state.currentPreset;
      const preset = window.WhatIf.Scenarios.current();
      const winner = this.lastWinner || 'B';
      const branchInfo = preset.branches ? preset.branches[winner] : { name: `Branch ${winner}` };
      const textEl = document.getElementById('verdict-text');
      const verdict = textEl ? textEl.textContent : 'Simulation evaluated across all timeline branches.';

      window.WhatIf.History.record({
        prompt: state.decision || preset.decision,
        presetKey: presetKey,
        presetTitle: preset.title,
        sector: preset.title ? `SECTOR · ${preset.title.toUpperCase()}` : 'ACTIVE TIMELINE SECTOR',
        winnerBranch: `Branch ${winner} (${branchInfo.name})`,
        score: `${this.lastMaxScore ?? 0}/100`,
        verdict: verdict
      });
    }
  }
};
