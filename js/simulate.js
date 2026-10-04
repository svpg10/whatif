window.WhatIf = window.WhatIf || {};

window.WhatIf.Simulate = {
  init() {
    const state = window.WhatIf.state;
    if (!state.currentPreset) {
      state.currentPreset = 'hormuz';
    }

    // Run simulation
    state.simulationResults = window.WhatIf.Engine.simulate(state.currentPreset, state.sliderValues || {});
    
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
      
      newTab.addEventListener('click', (e) => {
        const target = e.currentTarget;
        const branch = target.getAttribute('data-branch');
        this.switchBranch(branch);
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
      }
    };

    if (btnAssumptions && drawer && body) {
      const newBtn = btnAssumptions.cloneNode(true);
      btnAssumptions.parentNode.replaceChild(newBtn, btnAssumptions);
      
      newBtn.addEventListener('click', () => {
        drawer.classList.add('open');
        drawer.setAttribute('aria-hidden', 'false');
        
        const preset = window.WhatIf.Presets[window.WhatIf.state.currentPreset] || window.WhatIf.Presets.hormuz;
        const sVals = window.WhatIf.state.sliderValues || {};
        
        let html = '<div class="drawer-assumptions-list" style="display:flex; flex-direction:column; gap:12px;">';
        preset.sliders.forEach(s => {
          const val = sVals[s.id] !== undefined ? sVals[s.id] : s.default;
          html += `
            <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid rgba(26,31,77,0.6);">
              <span style="color:#F4F6FF; font-size:0.85rem;">${s.label}</span>
              <span style="font-family:'JetBrains Mono',monospace; color:#38E1FF; font-size:0.85rem;">${val} ${s.unit}</span>
            </div>
          `;
        });
        html += '</div>';
        body.innerHTML = html;
      });
    }

    if (closeBtn) {
      closeBtn.onclick = closeDrawer;
    }
    if (backdrop) {
      backdrop.onclick = closeDrawer;
    }
  },

  switchBranch(branch) {
    const state = window.WhatIf.state;
    state.activeBranch = branch;
    const preset = window.WhatIf.Presets[state.currentPreset] || window.WhatIf.Presets.hormuz;
    const results = state.simulationResults;
    if (!results || !results.branches) return;

    // Update active tab
    document.querySelectorAll('#branch-tabs .branch-tab').forEach(btn => {
      const isCurrent = btn.getAttribute('data-branch') === branch;
      btn.classList.toggle('active', isCurrent);
      btn.setAttribute('aria-selected', isCurrent ? 'true' : 'false');
    });

    const titleEl = document.getElementById('simulate-title');
    const watcherEl = document.getElementById('watcher-text');

    if (branch === 'all') {
      if (titleEl) titleEl.textContent = 'All Timelines Compared';
      if (watcherEl) watcherEl.textContent = 'Observing all candidate branches simultaneously across the 90-day simulation window.';
      
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
    
    if (titleEl) titleEl.innerHTML = `Timeline <span style="color:var(--branch-${branch.toLowerCase()})">${presetBranch ? presetBranch.shape : ''} ${branch}</span>: ${branchName}`;
    
    // Pick appropriate narration
    if (watcherEl && branchData.narration && branchData.narration.length > 0) {
      const duration = (state.sliderValues && state.sliderValues.duration) || 30;
      let text = branchData.narration[0];
      if (duration > 45 && branch === 'B' && branchData.narration[2]) {
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
        const numVal = parseFloat(val);
        if (!isNaN(numVal) && window.WhatIf.Animations && window.WhatIf.Animations.countUp) {
          const decimals = val.includes('.') ? (val.split('.')[1] || '').length : 0;
          window.WhatIf.Animations.countUp(el, 0, numVal, 500, decimals);
        } else {
          el.textContent = val;
        }
      }
    }
  }
};
