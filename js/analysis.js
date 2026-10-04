window.WhatIf = window.WhatIf || {};

window.WhatIf.Analysis = {
  init() {
    const state = window.WhatIf.state;
    if (!state.currentPreset) {
      document.getElementById('analysis-decision').textContent = "Custom Scenario";
      document.getElementById('problem-statement').textContent = "We don't have a model for that yet. Try a preset, or adjust the sliders on the closest match.";
      document.getElementById('sliders-grid').innerHTML = '';
      return;
    }

    const preset = window.WhatIf.Presets[state.currentPreset];
    
    // Set text elements
    document.getElementById('analysis-decision').textContent = preset.decision;
    document.getElementById('problem-statement').textContent = preset.problem;
    
    // Populate stakeholders
    const stakeholderList = document.getElementById('stakeholder-list');
    stakeholderList.innerHTML = '';
    preset.stakeholders.forEach(sh => {
      const li = document.createElement('li');
      li.textContent = sh;
      stakeholderList.appendChild(li);
    });

    // Populate branch cards
    const branchCards = document.getElementById('branch-cards');
    if (branchCards) {
      branchCards.innerHTML = '';
      ['A', 'B', 'C'].forEach(branchKey => {
        const branch = preset.branches[branchKey];
        const card = document.createElement('div');
        card.className = `branch-card branch-card-${branchKey.toLowerCase()}`;
        card.innerHTML = `<div class="branch-name">${branch.shape} Branch ${branchKey}: ${branch.name}</div><div class="branch-strategy">${branch.strategy}</div>`;
        branchCards.appendChild(card);
      });
    }

    // Build sliders
    const slidersGrid = document.getElementById('sliders-grid');
    slidersGrid.innerHTML = '';
    
    state.sliderValues = state.sliderValues || {};

    preset.sliders.forEach(slider => {
      if (state.sliderValues[slider.id] === undefined) {
        state.sliderValues[slider.id] = slider.default;
      }
      
      const val = state.sliderValues[slider.id];

      const wrap = document.createElement('div');
      wrap.className = 'slider-wrap';
      
      wrap.innerHTML = `
        <div class="slider-label-row">
          <span class="slider-label">${slider.label}</span>
          <span class="slider-value" id="val-${slider.id}">${val} ${slider.unit}</span>
        </div>
        <input type="range" id="slider-${slider.id}" min="${slider.min}" max="${slider.max}" step="${slider.step}" value="${val}" aria-label="${slider.label}">
      `;
      
      slidersGrid.appendChild(wrap);

      const input = wrap.querySelector('input');
      input.addEventListener('input', (e) => {
        const newValue = Number(e.target.value);
        document.getElementById(`val-${slider.id}`).textContent = `${newValue} ${slider.unit}`;
        state.sliderValues[slider.id] = newValue;
      });
    });

    const btnBranch = document.getElementById('btn-branch');
    if (btnBranch) {
      const newBtn = btnBranch.cloneNode(true);
      btnBranch.parentNode.replaceChild(newBtn, btnBranch);
      newBtn.addEventListener('click', () => {
        window.WhatIf.navigate('multiverse');
      });
    }
  }
};
