/**
 * cursor-dots.js — Subtle Crimson Proximity Brightening
 * 
 * Provides a clean, elegant red brightening effect for the background grid:
 * - When the cursor or finger moves over the screen, nearby dots smoothly
 *   brighten to a vibrant crimson red.
 * - Soft, subtle red ambient warmth beneath the pointer.
 * - Clean and refined: no aim-lock crosshairs, no reticles, no harsh white flares.
 * - Supports both mouse movement and responsive touch.
 */
(function () {
  'use strict';

  if (window.location.pathname.endsWith('landing.html')) return;

  const DOT_SPACING = 24;          // Grid spacing in px (matches body::before)
  const INFLUENCE_RADIUS = 130;    // Interaction radius in px
  const DOT_BASE_RADIUS = 1.1;     // Resting dot radius in px
  const DOT_MAX_RADIUS = 2.4;      // Brightened dot radius in px

  let canvas = null;
  let ctx = null;
  let animId = null;
  let mouseX = -9999;
  let mouseY = -9999;
  let targetMouseX = -9999;
  let targetMouseY = -9999;
  let isPointerActive = false;
  let isActive = true;
  let cols = 0;
  let rows = 0;

  function buildCanvas() {
    canvas = document.createElement('canvas');
    canvas.id = 'nexus-cursor-canvas';
    canvas.style.cssText = [
      'position: fixed',
      'inset: 0',
      'width: 100vw',
      'height: 100vh',
      'pointer-events: none',
      'z-index: 50',             // Sits above dark panels with additive blending
      'mix-blend-mode: screen',   // Additive screen blend
      'will-change: contents'
    ].join(';');
    canvas.setAttribute('aria-hidden', 'true');
    document.body.appendChild(canvas);
    ctx = canvas.getContext('2d', { alpha: true });
    resize();
  }

  function resize() {
    if (!canvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = window.innerWidth * dpr;
    canvas.height = window.innerHeight * dpr;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);
    cols = Math.ceil(window.innerWidth / DOT_SPACING) + 2;
    rows = Math.ceil(window.innerHeight / DOT_SPACING) + 2;
  }

  function render() {
    animId = requestAnimationFrame(render);
    if (!isActive || !ctx || !isPointerActive) {
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }

    // Smooth pointer interpolation
    mouseX += (targetMouseX - mouseX) * 0.4;
    mouseY += (targetMouseY - mouseY) * 0.4;

    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight);

    // Additive blending for clean light projection
    ctx.globalCompositeOperation = 'lighter';

    // 1. Soft, subtle red ambient warmth under the pointer
    const ambientBloom = ctx.createRadialGradient(
      mouseX, mouseY, 0,
      mouseX, mouseY, INFLUENCE_RADIUS
    );
    ambientBloom.addColorStop(0, 'rgba(255, 43, 52, 0.16)');    // Soft red core
    ambientBloom.addColorStop(0.5, 'rgba(255, 43, 52, 0.06)');  // Gentle fade
    ambientBloom.addColorStop(1, 'rgba(0, 0, 0, 0)');

    ctx.beginPath();
    ctx.arc(mouseX, mouseY, INFLUENCE_RADIUS, 0, Math.PI * 2);
    ctx.fillStyle = ambientBloom;
    ctx.fill();

    // 2. Brighten grid dots within the influence radius
    const startCol = Math.max(0, Math.floor((mouseX - INFLUENCE_RADIUS) / DOT_SPACING));
    const endCol = Math.min(cols, Math.ceil((mouseX + INFLUENCE_RADIUS) / DOT_SPACING));
    const startRow = Math.max(0, Math.floor((mouseY - INFLUENCE_RADIUS) / DOT_SPACING));
    const endRow = Math.min(rows, Math.ceil((mouseY + INFLUENCE_RADIUS) / DOT_SPACING));

    for (let c = startCol; c <= endCol; c++) {
      for (let r = startRow; r <= endRow; r++) {
        const dotX = c * DOT_SPACING;
        const dotY = r * DOT_SPACING;

        const dx = mouseX - dotX;
        const dy = mouseY - dotY;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        if (dist > INFLUENCE_RADIUS) continue;

        // Proximity falloff (1.0 at center, 0.0 at radius edge)
        const t = 1 - dist / INFLUENCE_RADIUS;
        const curve = t * t * (3 - 2 * t); // Smooth ease curve

        // Gently expand dot radius (from ~1.1px to 2.4px)
        const dotRadius = DOT_BASE_RADIUS + curve * (DOT_MAX_RADIUS - DOT_BASE_RADIUS);

        // Rich, vibrant crimson red (no harsh white glare)
        const redAlpha = 0.25 + curve * 0.70; // Reaches 0.95 at center

        ctx.beginPath();
        ctx.arc(dotX, dotY, dotRadius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(255, 43, 52, ${redAlpha})`;
        ctx.fill();
      }
    }

    // Reset composite operation
    ctx.globalCompositeOperation = 'source-over';
  }

  function activate() {
    isActive = true;
  }

  function deactivate() {
    isActive = false;
    if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
  }

  function init() {
    buildCanvas();

    // --- Mouse Listeners ---
    window.addEventListener('mousemove', (e) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
      if (!isPointerActive) {
        mouseX = e.clientX;
        mouseY = e.clientY;
        isPointerActive = true;
      }
    }, { passive: true });

    window.addEventListener('mouseleave', () => {
      isPointerActive = false;
      targetMouseX = -9999;
      targetMouseY = -9999;
    });

    window.addEventListener('mouseenter', (e) => {
      isPointerActive = true;
      mouseX = e.clientX;
      mouseY = e.clientY;
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    });

    // --- Responsive Touch Listeners ---
    window.addEventListener('touchstart', (e) => {
      if (e.touches && e.touches[0]) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
        mouseX = targetMouseX;
        mouseY = targetMouseY;
        isPointerActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchmove', (e) => {
      if (e.touches && e.touches[0]) {
        targetMouseX = e.touches[0].clientX;
        targetMouseY = e.touches[0].clientY;
        isPointerActive = true;
      }
    }, { passive: true });

    window.addEventListener('touchend', () => {
      isPointerActive = false;
    }, { passive: true });

    window.addEventListener('touchcancel', () => {
      isPointerActive = false;
    }, { passive: true });

    window.addEventListener('resize', () => {
      resize();
    }, { passive: true });

    // Handle intro overlay visibility
    const observer = new MutationObserver(() => {
      const overlay = document.getElementById('intro-overlay');
      if (!overlay) {
        activate();
        return;
      }
      const hidden = overlay.style.display === 'none' || overlay.hasAttribute('hidden');
      if (hidden) {
        activate();
      } else {
        deactivate();
      }
    });

    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      observer.observe(overlay, { attributes: true, attributeFilter: ['style', 'hidden'] });
      const hidden = overlay.style.display === 'none' || overlay.hasAttribute('hidden');
      if (!hidden) deactivate(); else activate();
    } else {
      activate();
    }

    window.addEventListener('whatif:intro-complete', activate, { once: false });

    render();
  }

  // Expose global API
  window.WhatIf = window.WhatIf || {};
  window.WhatIf.CursorDots = { activate, deactivate };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
