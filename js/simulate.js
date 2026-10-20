window.WhatIf = window.WhatIf || {};

window.WhatIf.Simulate = {
  init() {
    const state = window.WhatIf.state;
    const preset = window.WhatIf.Scenarios.current();
    if (!preset) { window.WhatIf.navigate('analysis'); return; }

    // Run simulation
    state.simulationResults = window.WhatIf.Engine.simulate(state.currentPreset, state.sliderValues || {});
    const chartTitle = document.querySelector('#page-simulate .chart-title');
    if (chartTitle) chartTitle.textContent = `${state.simulationResults.chartLabel} · Illustrative day 0–90 trajectory`;
    
    this.setupTabs();
    this.setupAssumptionsDrawer();
    
    const btnCompare = document.getElementById('btn-compare');
    if (btnCompare) {
      const newBtn = btnCompare.cloneNode(true);
      btnCompare.parentNode.replaceChild(newBtn, btnCompare);
      newBtn.addEventListener('click', () => {
        window.WhatIf.navigate('compare');
      });
    }

    // Default to active branch or 'A'
    const branchToOpen = state.activeBranch || 'A';
    this.switchBranch(branchToOpen);
  },

  setupTabs() {
    const tabs = document.querySelectorAll('#branch-tabs .branch-tab');
    tabs.forEach(tab => {
      const newTab = tab.cloneNode(true);
      tab.parentNode.replaceChild(newTab, tab);
      const key = newTab.getAttribute('data-branch');
      const preset = window.WhatIf.Scenarios.current();
      newTab.setAttribute('aria-label', key === 'all' ? 'All timelines' : `Timeline ${key}: ${preset.branches[key].name}`);
      
      newTab.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const branch = target.getAttribute('data-branch');
        this.switchBranch(branch);
      });
      newTab.addEventListener('keydown', event => {
        if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
        event.preventDefault();
        const all = Array.from(document.querySelectorAll('#branch-tabs .branch-tab'));
        const index = all.indexOf(event.currentTarget);
        const next = event.key === 'Home' ? 0 : event.key === 'End' ? all.length - 1 :
          (index + (event.key === 'ArrowRight' ? 1 : -1) + all.length) % all.length;
        all[next].click(); all[next].focus();
      });
    });
  },

  setupAssumptionsDrawer() {
    const btnAssumptions = document.getElementById('btn-assumptions');
    const drawer = document.getElementById('assumptions-drawer');
    const body = document.getElementById('drawer-body');
    const closeBtn = document.getElementById('drawer-close');
    const backdrop = document.getElementById('drawer-backdrop');
    
    const closeDrawer = () => {
      if (drawer) {
        drawer.classList.remove('open');
        drawer.setAttribute('aria-hidden', 'true');
        drawer.removeAttribute('aria-modal');
        document.getElementById('btn-assumptions')?.focus();
      }
    };

    if (btnAssumptions && drawer && body) {
      const newBtn = btnAssumptions.cloneNode(true);
      btnAssumptions.parentNode.replaceChild(newBtn, btnAssumptions);
      
      newBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        drawer.setAttribute('aria-modal', 'true');
        closeBtn?.focus();
        
        const preset = window.WhatIf.Scenarios.current();
        const e = window.WhatIf.Scenarios.escapeHTML;
        const sVals = window.WhatIf.state.sliderValues || {};
        
        let html = '<div class="drawer-assumptions-list" style="display:flex; flex-direction:column; gap:12px;">';
        preset.sliders.forEach(s => {
          const val = sVals[s.id] !== undefined ? sVals[s.id] : s.default;
          html += `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(26,31,77,0.6);">
              <span style="color:#F4F6FF; font-size:0.85rem;">${e(s.label)}</span>
              <span style="font-family:'JetBrains Mono',monospace; color:#38E1FF; font-size:0.85rem;">${e(val)} ${e(s.unit)}</span>
            </div>
          `;
        });
        html += '</div>';
        if (preset.assumptions) html += `<p>${preset.assumptions.map(e).join('<br>')}</p>`;
        html += '<p>Illustrative model only. Curves interpolate assumptions over 90 days; they are not observed or validated forecasts.</p>';
        body.innerHTML = html;
      });
    }

    if (closeBtn) {
      closeBtn.onclick = closeDrawer;
    }
    if (backdrop) {
      backdrop.onclick = closeDrawer;
    }
    if (drawer) drawer.onkeydown = event => {
      if (event.key === 'Escape') { event.preventDefault(); closeDrawer(); }
      if (event.key === 'Tab') {
        const items = Array.from(drawer.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])'));
        const first = items[0], last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }
    };
  },

  switchBranch(branch) {
    const state = window.WhatIf.state;
    if (!['A', 'B', 'C', 'all'].includes(branch)) return;
    state.activeBranch = branch;
    const preset = window.WhatIf.Scenarios.current();
    if (!preset) return;
    const results = state.simulationResults;
    if (!results || !results.branches) return;

    // Update active tab
    document.querySelectorAll('#branch-tabs .branch-tab').forEach(btn => {
      const isCurrent = btn.getAttribute('data-branch') === branch;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
      btn.tabIndex = isCurrent ? 0 : -1;
    });

    const titleEl = document.getElementById('simulate-title');
    const watcherEl = document.getElementById('watcher-text');

    if (branch === 'all') {
      if (titleEl) titleEl.textContent = 'All Timelines Compared';
      if (watcherEl) watcherEl.textContent = 'All three illustrative trajectories are shown. The metric cards below summarize Timeline B; select A, B, or C to inspect that timeline.';
      
      // Update KPIs to show summary or primary branch B
      const repData = results.branches.B;
      this.updateKPICards(repData.kpis);

      // Render charts with 'all'
      if (window.WhatIf.Charts) {
        window.WhatIf.Charts.drawLineChart('line-chart', results, 'all');
        window.WhatIf.Charts.drawRadarChart('radar-chart', results, 'all');
      }
      return;
    }

    const branchData = results.branches[branch];
    const presetBranch = preset.branches ? preset.branches[branch] : null;
    const branchName = presetBranch ? presetBranch.name : `Timeline ${branch}`;
    
    if (titleEl) titleEl.textContent = `Timeline ${presetBranch ? presetBranch.shape : ''} ${branch}: ${branchName}`;
    
    // Pick appropriate narration
    if (watcherEl && branchData.narration && branchData.narration.length > 0) {
      const duration = (state.sliderValues && state.sliderValues.duration) || 30;
      let text = branchData.narration[0];
      if (state.currentPreset === 'hormuz' && duration > Math.floor(90 * (state.sliderValues.reserveRate ?? 50) / 100) && branch === 'B' && branchData.narration[2]) {
        text = branchData.narration[2];
      }
      watcherEl.textContent = `"${text}"`;
    }

    // Update KPIs
    if (branchData && branchData.kpis) {
      this.updateKPICards(branchData.kpis);
    }

    // Draw charts
    if (window.WhatIf.Charts) {
      window.WhatIf.Charts.drawLineChart('line-chart', results, branch);
      window.WhatIf.Charts.drawRadarChart('radar-chart', results, branch);
    }
  },

  updateKPICards(kpis) {
    const preset = window.WhatIf.Scenarios.current();
    const labels = Object.values(preset.kpiLabels);
    document.querySelectorAll('#kpi-panel .kpi-card').forEach((card, index) => {
      card.querySelector('.kpi-label').textContent = labels[index].label;
      card.querySelector('.kpi-unit').textContent = labels[index].unit;
      card.title = labels[index].tooltip || 'Illustrative index; higher is better.';
    });
    const mapping = {
      'kpi-fuel': kpis.fuelPrice || '0',
      'kpi-buffer': kpis.buffer || '0',
      'kpi-fiscal': kpis.fiscal || '0',
      'kpi-inflation': kpis.inflation || '0',
      'kpi-gdp': kpis.gdp || '0',
      'kpi-risk': kpis.publicRisk || '0'
    };

    for (const [id, val] of Object.entries(mapping)) {
      const el = document.getElementById(id);
      if (el) {
        el.textContent = val;
      }
    }
  }
};
