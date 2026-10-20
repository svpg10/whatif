window.WhatIf = window.WhatIf || {};

// Page breadcrumbs mapping for active location indicator
const PAGE_TITLES = {
  'home': '// HOME',
  'history': '// CHAT HISTORY',
  'how': '// HOW IT WORKS',
  'model': '// ABOUT THE MODEL',
  'about': '// ABOUT WHAT IF?',
  'analysis': '// WATCHER ANALYSIS',
  'multiverse': '// MULTIVERSE BRANCHES',
  'simulate': '// SIMULATION DASHBOARD',
  'compare': '// COMPARE & DECIDE'
};

let isNavigating = false;

window.WhatIf.navigate = function(pageName, options = {}) {
  if (!pageName) pageName = 'home';
  pageName = pageName.replace(/^#/, '');
  if (pageName !== 'analysis' && window.WhatIf.Analysis) window.WhatIf.Analysis.controller?.abort();
  if (['multiverse', 'simulate', 'compare'].includes(pageName) && !window.WhatIf.Scenarios.current()) pageName = 'analysis';

  // STRICT INTRO GUARD:
  // If the user has not completed the intro sequence, they CANNOT access any internal pages.
  const introPlayed = window.WhatIf.introPlayed;
  const overlay = document.getElementById('intro-overlay');
  const isIntroOverlayVisible = overlay && overlay.style.display !== 'none' && !overlay.hasAttribute('hidden');

  if (!introPlayed || isIntroOverlayVisible) {
    // Record target page so intro can route them there after gate completion
    window.WhatIf.pendingTargetPage = pageName;
    console.log(`[Router Guard] Intro not completed. Queued pending page: ${pageName}`);
    return;
  }

  const targetPage = document.getElementById(`page-${pageName}`);
  if (!targetPage) {
    console.warn(`[Router] Page #page-${pageName} not found, defaulting to home.`);
    pageName = 'home';
  }

  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active', 'page-enter');
  });

  // Show target page
  const pageEl = document.getElementById(`page-${pageName}`);
  if (pageEl) {
    pageEl.classList.add('active', 'page-enter');
  }

  // Update Breadcrumb Pill in Navbar
  const activePill = document.getElementById('nav-active-pill');
  if (activePill) {
    activePill.textContent = PAGE_TITLES[pageName] || `// ${pageName.toUpperCase()}`;
  }

  // Update drawer nav items active class
  document.querySelectorAll('.drawer-nav-item').forEach(item => {
    const navTarget = (item.getAttribute('data-nav') || '').replace(/^#/, '');
    if (navTarget === pageName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Synchronize browser address bar URL hash dynamically
  if (!options.fromHashChange) {
    isNavigating = true;
    try {
      history.pushState(null, '', '#' + pageName);
    } catch (e) {
      window.location.hash = '#' + pageName;
    }
    setTimeout(() => { isNavigating = false; }, 50);
  }

  // Initialize page-specific logic
  if (pageName === 'analysis' && window.WhatIf.Analysis) {
    window.WhatIf.Analysis.init();
  } else if (pageName === 'multiverse' && window.WhatIf.Multiverse) {
    window.WhatIf.Multiverse.init();
  } else if (pageName === 'simulate' && window.WhatIf.Simulate) {
    window.WhatIf.Simulate.init();
  } else if (pageName === 'compare' && window.WhatIf.Compare) {
    window.WhatIf.Compare.init();
  } else if (pageName === 'history' && window.WhatIf.History) {
    window.WhatIf.History.render();
  } else if (pageName === 'model') {
    window.WhatIf.renderModelPage();
  }
  window.WhatIf.UI?.update(pageName);

  window.scrollTo({ top: 0, behavior: 'smooth' });
};

window.WhatIf.renderModelPage = function() {
  const container = document.getElementById('model-assumptions');
  if (!container) return;
  
  const preset = window.WhatIf.Scenarios.current();
  if (!preset) { container.textContent = 'Choose a scenario to view its assumptions.'; return; }
  const e = window.WhatIf.Scenarios.escapeHTML;
  const sVals = window.WhatIf.state.sliderValues || {};

  let html = '';
  preset.sliders.forEach(s => {
    const val = sVals[s.id] !== undefined ? sVals[s.id] : s.default;
    html += `
      <div class="assumption-item">
        <span class="assumption-name">${e(s.label)}</span>
        <span class="assumption-val">${e(val)} ${e(s.unit)}</span>
      </div>
    `;
  });
  container.innerHTML = html;
};

// Drawer controls — uses a simple boolean to avoid double-toggle bugs
window.WhatIf.Drawer = {
  _isOpen: false,

  open: function() {
    if (this._isOpen) return;
    var drawer = document.getElementById('nav-drawer');
    var toggleBtn = document.getElementById('nav-menu-toggle');
    if (!drawer) { console.warn('[Drawer] #nav-drawer not found'); return; }

    // Refresh System Terminal ID badge
    var sysIdEl = document.getElementById('drawer-sys-node-id');
    if (sysIdEl && window.WhatIf.History) {
      sysIdEl.textContent = window.WhatIf.History.getSystemId();
    }
    const status = drawer.querySelector('.drawer-sys-status');
    if (status) status.textContent = '● LOCAL BROWSER PROFILE · NO ACCOUNT';

    this._isOpen = true;
    drawer.removeAttribute('hidden');
    drawer.style.display = 'block';
    // Force reflow so CSS transition triggers
    void drawer.offsetWidth;
    drawer.classList.add('open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
    console.log('[Drawer] OPENED');
  },

  close: function() {
    if (!this._isOpen) return;
    var drawer = document.getElementById('nav-drawer');
    var toggleBtn = document.getElementById('nav-menu-toggle');
    if (!drawer) return;

    this._isOpen = false;
    drawer.classList.remove('open');
    if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
    console.log('[Drawer] CLOSED');
    setTimeout(function() {
      if (!drawer.classList.contains('open')) {
        drawer.style.display = 'none';
      }
    }, 350);
  },

  toggle: function() {
    console.log('[Drawer] toggle called, _isOpen=' + this._isOpen);
    if (this._isOpen) {
      this.close();
    } else {
      this.open();
    }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Ensure default state
  window.WhatIf.state = window.WhatIf.state || {};
  // Styles load in the document head to avoid a flash of the old layout.
  const uiScript = document.createElement('script');
  uiScript.src = 'js/app-ui.js';
  document.head.appendChild(uiScript);

  // Wire 3-line hamburger menu toggle button
  const menuToggle = document.getElementById('nav-menu-toggle');
  if (menuToggle) {
    menuToggle.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      window.WhatIf.Drawer.toggle();
    });
  }

  // Wire drawer close button
  const drawerClose = document.getElementById('nav-drawer-close');
  if (drawerClose) {
    drawerClose.addEventListener('click', (e) => {
      e.preventDefault();
      window.WhatIf.Drawer.close();
    });
  }

  // Wire drawer backdrop click
  const drawerBackdrop = document.getElementById('nav-drawer-backdrop');
  if (drawerBackdrop) {
    drawerBackdrop.addEventListener('click', () => {
      window.WhatIf.Drawer.close();
    });
  }

  // Wire escape key to close drawer
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      window.WhatIf.Drawer.close();
    }
  });

  // Wire nav links in drawer and throughout the app
  document.addEventListener('click', (e) => {
    const navEl = e.target.closest('[data-nav]');
    if (!navEl) return;

    e.preventDefault();
    const page = navEl.getAttribute('data-nav');
    if (navEl.hasAttribute('data-preset')) {
      const key = navEl.getAttribute('data-preset');
      if (Object.hasOwn(window.WhatIf.Presets, key)) window.WhatIf.Scenarios.start(window.WhatIf.Presets[key].decision, key);
    }

    // If clicked inside drawer, close it
    if (navEl.closest('#nav-drawer')) {
      window.WhatIf.Drawer.close();
    }

    window.WhatIf.navigate(page);
  });

  // Demo shortcut (Key D)
  document.addEventListener('keydown', (e) => {
    // If not typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
    if (e.key === 'D' || e.key === 'd') {
      if (window.WhatIf.Demo) window.WhatIf.Demo.start();
    }
  });

  // Demo trigger button in navbar (if present)
  const demoTrigger = document.getElementById('demo-trigger');
  if (demoTrigger) {
    demoTrigger.addEventListener('click', (e) => {
      e.preventDefault();
      if (window.WhatIf.Demo) window.WhatIf.Demo.start();
    });
  }

  // Listen to browser hash changes (Back/Forward navigation)
  window.addEventListener('hashchange', () => {
    if (isNavigating) return;
    const page = (window.location.hash || '').replace('#', '');
    if (page && document.getElementById(`page-${page}`)) {
      window.WhatIf.navigate(page, { fromHashChange: true });
    }
  });

  // Callback when intro completes
  window.WhatIf.onIntroComplete = function() {
    const target = window.WhatIf.pendingTargetPage || 'home';
    window.WhatIf.pendingTargetPage = null;
    window.WhatIf.navigate(target);
  };
});
