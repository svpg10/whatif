window.WhatIf = window.WhatIf || {};

window.WhatIf.Demo = {
  timeouts: [],
  isActive: false,

  start() {
    this.stop(); // Clear any ongoing demo
    this.isActive = true;

    const banner = document.getElementById('demo-banner');
    if (banner) banner.removeAttribute('hidden');

    const keyListener = (e) => {
      // Ignore keypress if it was the triggering 'D' key
      if (e.key === 'D' || e.key === 'd') return;
      this.stop();
    };
    // Delay key listener by 500ms to avoid instant cancel from keydown
    setTimeout(() => {
      if (this.isActive) {
        document.addEventListener('keydown', keyListener, { once: true });
        this.keyListener = keyListener;
      }
    }, 500);

    let time = 0;
    const schedule = (delayMs, action) => {
      time += delayMs;
      const t = setTimeout(() => {
        if (this.isActive) action();
      }, time);
      this.timeouts.push(t);
    };

    // 1. Go to Home
    schedule(0, () => {
      window.WhatIf.navigate('home');
      const input = document.getElementById('decision-input');
      if (input) input.value = '';
    });

    // 2. Select Hormuz preset chip
    schedule(2000, () => {
      const hormuzChip = document.querySelector('.chip[data-preset="hormuz"]');
      if (hormuzChip) {
        document.querySelectorAll('.chip').forEach(c => c.classList.remove('selected'));
        hormuzChip.classList.add('selected');
        const input = document.getElementById('decision-input');
        if (input) input.value = 'India responds to a 30-day oil-chokepoint disruption';
        window.WhatIf.state.currentPreset = 'hormuz';
        window.WhatIf.state.decision = 'India responds to a 30-day oil-chokepoint disruption';
        window.WhatIf.state.sliderValues = { duration: 30, reserveRate: 50, altSuppliers: 15, priceCap: 10, globalSpike: 30 };
      }
    });

    // 3. Open Multiverse (go to Analysis)
    schedule(2000, () => {
      window.WhatIf.navigate('analysis');
    });

    // 4. Branch timeline (go to Multiverse tree)
    schedule(3500, () => {
      window.WhatIf.navigate('multiverse');
    });

    // 5. Simulate timeline (go to Simulation Dashboard)
    schedule(3500, () => {
      window.WhatIf.navigate('simulate');
      if (window.WhatIf.Simulate) window.WhatIf.Simulate.switchBranch('A');
    });

    // 6. Switch to Branch B
    schedule(3000, () => {
      if (window.WhatIf.Simulate) window.WhatIf.Simulate.switchBranch('B');
    });

    // 7. Switch to Branch C
    schedule(3000, () => {
      if (window.WhatIf.Simulate) window.WhatIf.Simulate.switchBranch('C');
    });

    // 8. Go to Compare & Decide
    schedule(3000, () => {
      window.WhatIf.navigate('compare');
    });

    // 9. Demonstrate Ranking Flip: Duration 30 -> 75
    schedule(3500, () => {
      // Modify duration slider to 75
      window.WhatIf.state.sliderValues['duration'] = 75;
      window.WhatIf.state.simulationResults = window.WhatIf.Engine.simulate('hormuz', window.WhatIf.state.sliderValues);
      
      if (window.WhatIf.Compare) {
        window.WhatIf.Compare.recalculate();
      }
      
      const verdict = document.getElementById('verdict-text');
      if (verdict) {
        verdict.innerHTML = `<span style="display:inline-block; background:var(--rift-crimson); color:#fff; padding:2px 8px; border-radius:4px; font-weight:bold; font-size:0.8rem; margin-bottom:6px;">⚡ RANKING FLIP DETECTED</span><br>` + verdict.innerHTML;
      }
    });

    // 10. Complete demo
    schedule(7000, () => {
      this.stop();
    });
  },

  stop() {
    this.isActive = false;
    this.timeouts.forEach(clearTimeout);
    this.timeouts = [];
    
    const banner = document.getElementById('demo-banner');
    if (banner) banner.setAttribute('hidden', 'true');

    if (this.keyListener) {
      document.removeEventListener('keydown', this.keyListener);
      this.keyListener = null;
    }
  }
};
