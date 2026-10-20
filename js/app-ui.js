/** Internal-app refinements. Reading surfaces stay protected from cursor light. */
(function () {
  'use strict';

  function maskSVG(width, height, boxes) {
    const rects = boxes.filter(box => box.width > 0 && box.height > 0).map(box =>
      `<rect x="${Math.floor(box.left - 6)}" y="${Math.floor(box.top - 6)}" width="${Math.ceil(box.width + 12)}" height="${Math.ceil(box.height + 12)}" fill="black"/>`).join('');
    // An SVG luminance mask creates transparent holes; overlapping cards stay excluded.
    return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><defs><mask id="reading" maskUnits="userSpaceOnUse" x="0" y="0" width="${width}" height="${height}"><rect width="100%" height="100%" fill="white"/>${rects}</mask></defs><rect width="100%" height="100%" fill="white" mask="url(#reading)"/></svg>`;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = { maskSVG }; return; }

  const W = window.WhatIf;
  const SURFACES = '.info-glow-box,.home-introduction,.decision-composer,.home-journey,.scenario-card,.nexus-input-wrap,.home-disclosures-bar,.card,.analysis-col,.branch-card,.slider-wrap,.priority-slider-wrap,.kpi-card,.chart-container,.watcher-panel,.verdict-card,.compare-table-wrap,.compare-branch-detail,.mv-branch-card,.history-card,.system-recognition-box,.history-empty-state,.ui-decision-context,.pipeline-step,.dt-step';
  const PANELS = SURFACES + ',.assumption-item,.ui-flow,.ui-scroll-hint,.how-page,.about-page,.model-page';
  const TEXT = 'h1,h2,h3,p,li,button,a,input,textarea,select,summary';
  const OVERLAY_BOXES = '.consent-panel,#assumptions-drawer .drawer-content,#nav-drawer .nav-drawer-panel,#nav-drawer .drawer-system-card';
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const coarsePointer = matchMedia('(hover: none), (pointer: coarse)');
  const maskSupported = CSS.supports('mask-image', 'linear-gradient(black, black)');
  let glowingBox = null;
  function clearBoxGlow() {
    glowingBox?.style.removeProperty('--box-glow-opacity');
    glowingBox = null;
  }
  function prepareBoxGlow(page) {
    const boxes = [...page.querySelectorAll(`${SURFACES},.assumption-item,.dt-framework-box,.disclaimer-card`),
      ...document.querySelectorAll(OVERLAY_BOXES)];
    boxes.forEach(box => {
      // Keep nested input backing and decorative lists quiet; their containing panel glows.
      if (box.matches('.home-journey,.nexus-input-wrap') || box.classList.contains('ui-local-glow')) return;
      if (getComputedStyle(box).position === 'static') box.classList.add('ui-glow-positioned');
      box.classList.add('ui-local-glow');
      const light = document.createElement('span');
      light.className = 'ui-box-light';
      light.setAttribute('aria-hidden', 'true');
      box.appendChild(light);
    });
  }
  let activePage = null;
  let frame = 0;
  let pointerInContent = false;
  let entering = false;
  let transitionTimer = null;
  let cursorDefaults = null;
  function rememberCursorStyles(canvas) {
    if (!canvas || cursorDefaults) return;
    cursorDefaults = ['mask-image', 'mask-size', 'opacity', 'mix-blend-mode', 'z-index'].map(name =>
      [name, canvas.style.getPropertyValue(name), canvas.style.getPropertyPriority(name)]);
  }

  function scheduleMask() {
    if (frame) return;
    frame = requestAnimationFrame(() => { frame = 0; applyMask(); });
  }
  function applyMask() {
    if (activePage) prepareBoxGlow(activePage);
    const canvas = document.getElementById('nexus-cursor-canvas');
    if (!canvas) return;
    rememberCursorStyles(canvas);
    if (!activePage) {
      for (const [name, value, priority] of cursorDefaults) {
        if (value) canvas.style.setProperty(name, value, priority);
        else canvas.style.removeProperty(name);
      }
      return;
    }
    refreshScrollHint();
    // Put light underneath the .page stacking context, never above its text/cards.
    // Opaque card backing is a second barrier even if a mask is stale or unsupported.
    canvas.style.zIndex = '0';
    activePage.querySelectorAll(SURFACES).forEach(surface => {
      if (!surface.classList.contains('ui-glow-surface')) {
        // Retain the original panel hue while making its backing fully opaque.
        const color = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g);
        if (color?.length >= 3 && (color.length < 4 || Number(color[3]) > 0)) {
          surface.style.setProperty('--ui-glow-backing', `rgb(${color[0]}, ${color[1]}, ${color[2]})`);
        }
        surface.classList.add('ui-glow-surface');
      }
    });
    const boxes = [];
    for (const element of activePage.querySelectorAll(`${PANELS},${TEXT}`)) {
      // A whole card is already shielded; don't measure every line inside it.
      if (element.parentElement?.closest(PANELS)) continue;
      const rect = element.getBoundingClientRect();
      if (rect.width && rect.height && rect.bottom > 0 && rect.top < innerHeight && rect.right > 0 && rect.left < innerWidth) boxes.push(rect);
    }
    const navbar = document.getElementById('navbar');
    if (navbar) boxes.push(navbar.getBoundingClientRect());
    const footer = document.querySelector('.global-footer');
    if (footer) boxes.push(footer.getBoundingClientRect());
    const svg = maskSVG(innerWidth, innerHeight, boxes);
    canvas.style.maskImage = `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
    canvas.style.maskSize = '100% 100%';
    canvas.style.mixBlendMode = 'normal';
    const overlayOpen = document.querySelector('.consent-modal:not([hidden]),#nav-drawer.open,.drawer.open');
    canvas.style.opacity = !maskSupported || reduceMotion.matches || coarsePointer.matches || pointerInContent || entering || document.hidden || overlayOpen ? '0' : '0.45';
  }

  const STEPS = [['home', 'Question'], ['analysis', 'Assumptions'], ['multiverse', 'Explore'], ['compare', 'Compare']];
  function refreshScrollHint() {
    if (activePage?.id !== 'page-compare') return;
    const wrap = activePage.querySelector('.compare-table-wrap');
    const hint = activePage.querySelector('.ui-scroll-hint');
    if (!wrap || !hint) return;
    const hidden = wrap.scrollWidth <= wrap.clientWidth + 1;
    if (hint.hidden !== hidden) hint.hidden = hidden;
  }
  function flow(page, key) {
    let nav = page.querySelector('.ui-flow');
    if (!nav) {
      nav = document.createElement('nav');
      nav.className = 'ui-flow';
      nav.setAttribute('aria-label', 'Simulation progress');
      const list = document.createElement('ol');
      for (const [target, label] of STEPS) {
        const li = document.createElement('li');
        const button = document.createElement('button');
        button.type = 'button'; button.dataset.nav = target; button.textContent = label;
        li.appendChild(button); list.appendChild(li);
      }
      nav.appendChild(list); page.querySelector('.page-inner').prepend(nav);
    }
    const stage = key === 'simulate' ? 'multiverse' : key;
    nav.querySelectorAll('button').forEach(button => {
      if (button.dataset.nav === stage) button.setAttribute('aria-current', 'step');
      else button.removeAttribute('aria-current');
      button.disabled = ['multiverse', 'compare'].includes(button.dataset.nav) && !W.Scenarios.current();
    });
  }
  function context(page) {
    let bar = page.querySelector('.ui-decision-context');
    if (!bar) {
      bar = document.createElement('div'); bar.className = 'ui-decision-context';
      const question = document.createElement('p'); question.className = 'ui-current-question';
      const edit = document.createElement('button'); edit.type = 'button'; edit.className = 'btn-secondary';
      edit.dataset.nav = 'analysis'; edit.textContent = 'Edit assumptions';
      bar.append(question, edit);
      const heading = page.querySelector('h1'); heading.after(bar);
    }
    bar.querySelector('p').textContent = W.state.decision || W.Scenarios.current()?.decision || '';
  }
  function comparison(page) {
    const preset = W.Scenarios.current();
    if (!preset) return;
    page.querySelectorAll('thead th').forEach((cell, index) => {
      cell.scope = 'col';
      if (!index) { cell.textContent = 'Measure'; return; }
      const branch = preset.branches[['A', 'B', 'C'][index - 1]];
      cell.replaceChildren();
      const letter = document.createElement('span'); letter.className = 'ui-branch-letter';
      letter.textContent = `${branch.shape} ${['A', 'B', 'C'][index - 1]}`;
      const name = document.createElement('span'); name.className = 'ui-branch-name'; name.textContent = branch.name;
      cell.append(letter, name);
    });
    const wrap = page.querySelector('.compare-table-wrap');
    wrap.tabIndex = 0;
    wrap.setAttribute('role', 'region'); wrap.setAttribute('aria-label', 'Timeline scores comparison. Scroll horizontally to see all timelines.');
    let hint = page.querySelector('.ui-scroll-hint');
    if (!hint) {
      hint = document.createElement('p'); hint.className = 'ui-scroll-hint'; hint.id = 'compare-scroll-hint';
      hint.textContent = 'Scroll the table sideways to compare all three timelines →';
      wrap.before(hint); wrap.setAttribute('aria-describedby', hint.id);
    }
    refreshScrollHint();
  }

  const observer = new ResizeObserver(scheduleMask);
  function update(key) {
    clearBoxGlow();
    activePage = document.getElementById(`page-${key}`);
    document.body.dataset.uiPage = key;
    if (!activePage) return;
    const canvas = document.getElementById('nexus-cursor-canvas');
    rememberCursorStyles(canvas);
    canvas?.style.setProperty('opacity', '0');
    if (['analysis', 'multiverse', 'simulate', 'compare'].includes(key)) flow(activePage, key);
    if (['simulate', 'compare'].includes(key) && W.Scenarios.current()) context(activePage);
    if (key === 'compare') comparison(activePage);
    observer.disconnect(); observer.observe(activePage);
    pointerInContent = true; // Keep the effect quiet until the pointer next enters a background gap.
    entering = true;
    clearTimeout(transitionTimer);
    transitionTimer = setTimeout(() => { entering = false; scheduleMask(); }, 400);
    scheduleMask();
  }
  W.UI = { update };
  const onPointerMove = event => {
    // Only the nearest box lights up. Its decorative layer sits behind its content.
    const box = event.target.closest?.('.ui-local-glow');
    if (box && (box.closest('.page') === activePage || box.matches(OVERLAY_BOXES)) && !reduceMotion.matches && !coarsePointer.matches && !document.hidden) {
      if (glowingBox !== box) clearBoxGlow();
      glowingBox = box;
      const rect = box.getBoundingClientRect();
      box.style.setProperty('--box-glow-x', `${event.clientX - rect.left}px`);
      box.style.setProperty('--box-glow-y', `${event.clientY - rect.top}px`);
      box.style.setProperty('--box-glow-opacity', '1');
    } else clearBoxGlow();
    const quiet = Boolean(event.target.closest?.(`${PANELS},${TEXT},#navbar,[role="dialog"]`));
    if (quiet !== pointerInContent) {
      pointerInContent = quiet;
      // Do not wait for a new layout/mask before hiding light on reading surfaces.
      if (quiet) document.getElementById('nexus-cursor-canvas')?.style.setProperty('opacity', '0');
      scheduleMask();
    }
  };
  window.addEventListener('pointermove', onPointerMove, { passive: true });
  window.addEventListener('mousemove', onPointerMove, { passive: true });
  window.addEventListener('scroll', () => { clearBoxGlow(); scheduleMask(); }, { passive: true, capture: true });
  window.addEventListener('blur', clearBoxGlow);
  document.addEventListener('mouseleave', clearBoxGlow);
  window.addEventListener('resize', () => {
    scheduleMask();
  }, { passive: true });
  document.addEventListener('visibilitychange', () => { clearBoxGlow(); scheduleMask(); });
  document.addEventListener('keydown', event => {
    if (event.key === 'Tab') { clearBoxGlow(); pointerInContent = true; scheduleMask(); }
  });
  reduceMotion.addEventListener('change', () => { clearBoxGlow(); scheduleMask(); });
  coarsePointer.addEventListener('change', () => { clearBoxGlow(); scheduleMask(); });
  new MutationObserver(scheduleMask).observe(document.body, { childList: true, subtree: true, characterData: true,
    attributes: true, attributeFilter: ['class', 'hidden', 'open'] });
  update((document.querySelector('.page.active')?.id || 'page-home').replace('page-', ''));
})();
