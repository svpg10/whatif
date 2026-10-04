window.WhatIf = window.WhatIf || {};

window.WhatIf.Multiverse = (function() {
  const COLORS = {
    trunk: '#E62429',
    nexus: '#E62429',
    branchA: '#E62429',
    branchB: '#38E1FF',
    branchC: '#A78BFA'
  };

  const BRANCH_SHAPES = {
    A: '●',
    B: '◆',
    C: '▲'
  };

  function init() {
    renderSVG();
    renderCards();
    attachInteractions();
    triggerAnimation();
  }

  function renderSVG() {
    const container = document.getElementById('multiverse-svg');
    if (!container) return;
    
    // Clear and build SVG structure
    container.innerHTML = `
      <defs>
        <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <!-- Sacred Timeline Trunk -->
      <path id="path-trunk" d="M 400 40 L 400 180" stroke="${COLORS.trunk}" stroke-width="4" fill="none" class="energy-line" />
      
      <!-- Branch Paths -->
      <path id="path-A" data-branch="A" d="M 400 180 C 400 250, 150 250, 150 420" stroke="${COLORS.branchA}" stroke-width="3" fill="none" class="energy-line branch-path" style="cursor:pointer;" />
      <path id="path-B" data-branch="B" d="M 400 180 L 400 420" stroke="${COLORS.branchB}" stroke-width="3" fill="none" class="energy-line branch-path" style="cursor:pointer;" />
      <path id="path-C" data-branch="C" d="M 400 180 C 400 250, 650 250, 650 420" stroke="${COLORS.branchC}" stroke-width="3" fill="none" class="energy-line branch-path" style="cursor:pointer;" />
      
      <!-- Nexus Event Origin Point -->
      <circle id="nexus-point" cx="400" cy="180" r="9" fill="${COLORS.nexus}" filter="url(#glow)" style="transform-origin: 400px 180px;" />

      <!-- Timeline Endpoint Nodes -->
      <g id="node-A" class="mv-node" data-branch="A" style="transform-origin: 150px 420px; cursor:pointer;">
        <circle cx="150" cy="420" r="22" fill="#0B1030" stroke="${COLORS.branchA}" stroke-width="2" filter="url(#glow)" />
        <text x="150" y="420" fill="${COLORS.branchA}" font-size="14" text-anchor="middle" dominant-baseline="central">${BRANCH_SHAPES.A}</text>
        <text x="150" y="458" fill="#9AA3C7" font-size="13" font-weight="600" text-anchor="middle" font-family="'Inter', sans-serif">Branch A</text>
      </g>
      
      <g id="node-B" class="mv-node" data-branch="B" style="transform-origin: 400px 420px; cursor:pointer;">
        <circle cx="400" cy="420" r="22" fill="#0B1030" stroke="${COLORS.branchB}" stroke-width="2" filter="url(#glow)" />
        <text x="400" y="420" fill="${COLORS.branchB}" font-size="14" text-anchor="middle" dominant-baseline="central">${BRANCH_SHAPES.B}</text>
        <text x="400" y="458" fill="#9AA3C7" font-size="13" font-weight="600" text-anchor="middle" font-family="'Inter', sans-serif">Branch B</text>
      </g>
      
      <g id="node-C" class="mv-node" data-branch="C" style="transform-origin: 650px 420px; cursor:pointer;">
        <circle cx="650" cy="420" r="22" fill="#0B1030" stroke="${COLORS.branchC}" stroke-width="2" filter="url(#glow)" />
        <text x="650" y="420" fill="${COLORS.branchC}" font-size="14" text-anchor="middle" dominant-baseline="central">${BRANCH_SHAPES.C}</text>
        <text x="650" y="458" fill="#9AA3C7" font-size="13" font-weight="600" text-anchor="middle" font-family="'Inter', sans-serif">Branch C</text>
      </g>
    `;
  }

  function renderCards() {
    const container = document.getElementById('multiverse-branches');
    if (!container) return;
    
    const presetName = window.WhatIf?.state?.currentPreset || 'hormuz';
    const branchesData = window.WhatIf?.Presets?.[presetName]?.branches || {
      A: { name: 'Wait & See', strategy: 'Buy on the spot market. Intervene later, if at all.' },
      B: { name: 'Reserve + Reroute', strategy: 'Release strategic reserves in phases while shifting suppliers.' },
      C: { name: 'Demand Shield', strategy: 'Cap fuel prices, push conservation, expand public transport.' }
    };

    container.innerHTML = '';
    ['A', 'B', 'C'].forEach(b => {
      const data = branchesData[b];
      const card = document.createElement('div');
      card.className = 'mv-branch-card';
      card.dataset.branch = b;
      card.style.border = `1px solid ${COLORS['branch' + b]}`;
      card.style.padding = '18px';
      card.style.borderRadius = '10px';
      card.style.background = 'rgba(11, 16, 48, 0.75)';
      card.style.cursor = 'pointer';
      card.style.transition = 'all 0.25s cubic-bezier(.2,.8,.2,1)';
      
      card.innerHTML = `
        <div class="mv-branch-title" style="color: ${COLORS['branch' + b]}; font-weight: 600; margin-bottom: 6px; font-size: 0.95rem;">
          <span class="branch-shape shape-${b.toLowerCase()}">${BRANCH_SHAPES[b]}</span> Timeline ${b}: ${data.name}
        </div>
        <div class="mv-branch-desc" style="color: #9AA3C7; font-size: 0.85rem; line-height: 1.5;">${data.strategy}</div>
      `;

      card.addEventListener('mouseenter', () => {
        card.style.transform = 'translateY(-4px)';
        card.style.boxShadow = `0 6px 20px ${COLORS['branch' + b]}33`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'translateY(0)';
        card.style.boxShadow = 'none';
      });

      container.appendChild(card);
    });
  }

  function triggerAnimation() {
    const trunk = document.getElementById('path-trunk');
    const nexus = document.getElementById('nexus-point');
    const branches = ['A', 'B', 'C'].map(b => document.getElementById(`path-${b}`));
    const nodes = ['A', 'B', 'C'].map(b => document.getElementById(`node-${b}`));

    if (trunk) preparePathForAnim(trunk);
    branches.forEach(b => { if (b) preparePathForAnim(b); });
    if (nexus) nexus.style.transform = 'scale(0)';
    nodes.forEach(n => { if (n) n.style.transform = 'scale(0)'; });

    let delay = 100;

    // 1. Trunk
    if (trunk) {
      animatePath(trunk, delay, 500);
      delay += 500;
    }

    // 2. Nexus point appearance
    if (nexus) {
      setTimeout(() => {
        nexus.animate([
          { transform: 'scale(0)' },
          { transform: 'scale(1.3)' },
          { transform: 'scale(1)' }
        ], { duration: 300, fill: 'forwards', easing: 'ease-out' });
      }, delay);
      delay += 300;
    }

    // 3. Branches spread
    branches.forEach(b => {
      if (b) animatePath(b, delay, 800);
    });
    delay += 800;

    // 4. Branch nodes appear
    nodes.forEach(n => {
      if (n) {
        setTimeout(() => {
          const anim = n.animate([
            { transform: 'scale(0)' },
            { transform: 'scale(1.15)' },
            { transform: 'scale(1)' }
          ], { duration: 400, fill: 'forwards', easing: 'ease-out' });
          
          anim.onfinish = () => n.classList.add('node-pulse');
        }, delay);
      }
    });
  }

  function preparePathForAnim(path) {
    if (!path.getTotalLength) return;
    const len = path.getTotalLength();
    path.style.strokeDasharray = len;
    path.style.strokeDashoffset = len;
  }

  function animatePath(path, delay, duration) {
    if (!path.getTotalLength) return;
    const len = path.getTotalLength();
    setTimeout(() => {
      path.animate([
        { strokeDashoffset: len },
        { strokeDashoffset: 0 }
      ], {
        duration: duration,
        fill: 'forwards',
        easing: 'ease-in-out'
      });
      path.style.strokeDashoffset = '0';
    }, delay);
  }

  function attachInteractions() {
    const selectBranch = (branchId) => {
      if (window.WhatIf?.state) {
        window.WhatIf.state.activeBranch = branchId;
      }
      
      // Highlight selected branch in SVG
      ['A', 'B', 'C'].forEach(b => {
        const path = document.getElementById(`path-${b}`);
        if (path) {
          path.style.strokeWidth = (b === branchId) ? '5' : '2';
          path.style.opacity = (b === branchId) ? '1' : '0.4';
        }
      });
      
      // Auto-navigate to simulation
      if (typeof window.WhatIf?.navigate === 'function') {
        window.WhatIf.navigate('simulate');
      }
    };

    // Node Clicks
    ['A', 'B', 'C'].forEach(b => {
      const node = document.getElementById(`node-${b}`);
      if (node) {
        node.onclick = () => selectBranch(b);
      }
      const path = document.getElementById(`path-${b}`);
      if (path) {
        path.onclick = () => selectBranch(b);
      }
    });

    // Card Clicks
    const cards = document.querySelectorAll('.mv-branch-card');
    cards.forEach(c => {
      c.onclick = () => {
        selectBranch(c.dataset.branch);
      };
    });
    
    // Simulate all button
    const btnSimulateAll = document.getElementById('btn-simulate-all');
    if (btnSimulateAll) {
      btnSimulateAll.onclick = () => {
        if (window.WhatIf?.state) {
          window.WhatIf.state.activeBranch = 'all';
        }
        if (typeof window.WhatIf?.navigate === 'function') {
          window.WhatIf.navigate('simulate');
        }
      };
    }
  }

  return { init };
})();
