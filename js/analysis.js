window.WhatIf = window.WhatIf || {};

window.WhatIf.Analysis = {
  controller: null,
  init() {
    const W = window.WhatIf;
    this.controller?.abort();
    if (W.state.currentPreset === 'custom' && !W.state.customScenario) {
      this.prepareCustom();
      return;
    }
    this.render();
  },

  async prepareCustom() {
    const W = window.WhatIf;
    const question = W.state.decision;
    const controller = new AbortController();
    this.controller = controller;
    const timeout = setTimeout(() => controller.abort('timeout'), 45000);
    const button = document.getElementById('btn-branch');
    const grid = document.getElementById('sliders-grid');
    document.getElementById('analysis-decision').textContent = question;
    document.getElementById('stakeholder-list').replaceChildren();
    document.getElementById('branch-cards').replaceChildren();
    grid.replaceChildren();
    const status = document.getElementById('problem-statement');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.textContent = 'Preparing three strategies for your question. This can take up to 45 seconds.';
    button.disabled = true;
    const page = document.getElementById('page-analysis');
    page.setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('/api/scenario', {
        method: 'POST', signal: controller.signal,
        headers: { 'Content-Type': 'application/json', 'X-WhatIf-Request': '1' },
        body: JSON.stringify({ question })
      });
      if (response.status === 404 || response.status === 405) {
        const error = new Error('The custom-scenario API is missing from this deployment. The site owner needs to deploy the server function. Built-in examples still work.');
        error.code = 'API_ROUTE_MISSING';
        throw error;
      }
      let payload;
      try { payload = await response.json(); } catch { throw new Error('The custom-scenario API did not return a valid response. The site owner should check the deployment. Your question is preserved.'); }
      if (!response.ok) {
        const error = new Error(typeof payload.error === 'string' ? payload.error : 'Could not prepare this scenario. Please retry.');
        error.code = payload.code;
        throw error;
      }
      if (controller.signal.aborted || question !== W.state.decision) return;
      W.Scenarios.start(question, 'custom', payload.scenario);
      this.render();
    } catch (error) {
      if (controller.signal.aborted && controller.signal.reason !== 'timeout') return;
      status.textContent = controller.signal.reason === 'timeout' ?
        'The request took too long. Your question is preserved. Retry to prepare your scenario.' :
        error instanceof TypeError ? 'Could not reach the server. Check your connection and retry.' : error.message;
      const retry = document.createElement('button');
      retry.className = 'btn-secondary';
      retry.textContent = 'Retry this question';
      retry.addEventListener('click', () => this.init());
      grid.appendChild(retry);
      const back = document.createElement('button');
      back.className = 'btn-secondary';
      back.textContent = 'Edit question';
      back.addEventListener('click', () => W.navigate('home'));
      grid.appendChild(back);
      if (['API_ROUTE_MISSING', 'DEPLOYMENT_CONFIG_INVALID', 'GEMINI_KEY_MISSING', 'GEMINI_KEY_INVALID', 'GEMINI_ACCESS_DENIED', 'GEMINI_MODEL_UNAVAILABLE'].includes(error.code)) {
        const guide = document.createElement('a');
        guide.className = 'btn-secondary';
        guide.href = 'https://github.com/svpg10/whatif/blob/main/docs/GEMINI-SETUP.md';
        guide.target = '_blank'; guide.rel = 'noopener noreferrer';
        guide.textContent = 'Deployment setup guide (site owner)';
        grid.appendChild(guide);
      }
    } finally {
      clearTimeout(timeout);
      if (this.controller === controller) page.removeAttribute('aria-busy');
    }
  },

  render() {
    const W = window.WhatIf;
    const preset = W.Scenarios.current();
    const button = document.getElementById('btn-branch');
    button.disabled = !preset;
    if (!preset) {
      document.getElementById('analysis-decision').textContent = 'Choose a decision to explore';
      document.getElementById('problem-statement').textContent = 'Enter your question or select a built-in scenario from Home.';
      for (const id of ['stakeholder-list', 'branch-cards', 'sliders-grid']) document.getElementById(id).replaceChildren();
      return;
    }
    const e = W.Scenarios.escapeHTML;
    document.getElementById('analysis-decision').textContent = W.state.decision || preset.decision;
    document.getElementById('problem-statement').textContent = preset.problem;
    const stakeholders = document.getElementById('stakeholder-list');
    stakeholders.replaceChildren();
    preset.stakeholders.forEach(value => {
      const li = document.createElement('li'); li.textContent = value; stakeholders.appendChild(li);
    });
    const cards = document.getElementById('branch-cards');
    cards.replaceChildren();
    for (const key of ['A', 'B', 'C']) {
      const branch = preset.branches[key];
      const card = document.createElement('div');
      card.className = `branch-card branch-card-${key.toLowerCase()}`;
      card.innerHTML = `<div class="branch-name">${branch.shape} Branch ${key}: ${e(branch.name)}</div><div class="branch-strategy">${e(branch.strategy)}</div>`;
      cards.appendChild(card);
    }
    const grid = document.getElementById('sliders-grid');
    grid.replaceChildren();
    if (preset.id === 'custom') {
      const note = document.createElement('p');
      note.className = 'hint-text';
      note.textContent = 'AI-generated assumptions: ' + preset.assumptions.join(' • ') +
        ' Scores are illustrative indices, not forecasts. Resource availability improves cost and impact; uncertainty reduces safety; pace trades cost and safety for speed.';
      grid.appendChild(note);
    }
    W.state.sliderValues = W.Scenarios.values(preset, W.state.sliderValues);
    preset.sliders.forEach(slider => {
      const value = W.state.sliderValues[slider.id];
      const wrap = document.createElement('div');
      wrap.className = 'slider-wrap';
      wrap.innerHTML = `<div class="slider-label-row"><label class="slider-label" for="slider-${slider.id}">${e(slider.label)}</label><span class="slider-value" id="val-${slider.id}">${value} ${e(slider.unit)}</span></div><input type="range" id="slider-${slider.id}" min="${slider.min}" max="${slider.max}" step="${slider.step}" value="${value}">`;
      wrap.querySelector('input').addEventListener('input', event => {
        W.state.sliderValues[slider.id] = Number(event.target.value);
        W.state.simulationResults = null;
        document.getElementById(`val-${slider.id}`).textContent = `${event.target.value} ${slider.unit}`;
      });
      grid.appendChild(wrap);
    });
    button.onclick = () => W.navigate('multiverse');
    W.UI?.update('analysis');
  }
};
