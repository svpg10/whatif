/**
 * intro.js — Cinematic Marvel-Inspired Flashcard-to-Logo Opening
 * ===============================================================
 * "WHAT IF? — Future Decision Simulator"
 *
 * Full Marvel Studios style cinematic audio & visual progression (15–19s):
 * 0:00–0:02 — Darkness & atmosphere + low mysterious D-pedal drone
 * 0:02–0:04 — First flashcard ("What is an FPGA?") emerges from fog + resonant whoosh
 * 0:04–0:06 — Secondary triad cards (Ohm's Law, FSM, Transistor) glide in
 * 0:06–0:11 — Knowledge nebula flight + accelerating comic book page flutter rustle
 * 0:11–0:14 — Marvel letter silhouette (W-H-A-T-I-F) card flips + heroic orchestral brass fanfare
 * 0:14–0:16 — Rapid consolidation + convergence flash + iconic sub-bass BOOM & orchestral impact!
 * 0:16–0:18 — WHATIF logo reveal with diagonal specular gleam, gold embers, Watcher eye & tagline
 * 0:18–0:19 — Smooth cinematic transition directly into the application interface
 */
(function () {
  'use strict';

  /* ── Master Timing Constants (seconds) ── */
  const T = {
    ATMOSPHERE_START: 0.0,
    SOLO_CARD_START: 1.8,
    SOLO_CARD_EXIT: 3.8,
    TRIAD_START: 4.0,
    NEBULA_START: 6.0,
    CONVERGENCE_START: 9.0,
    LETTERS_START: 11.5,
    COLLAPSE_START: 14.2,
    BOOM_TIME: 15.2,
    LOGO_REVEAL: 15.4,
    LIGHT_SWEEP: 15.9,
    EYE_OPEN: 16.3,
    TAGLINE_FADE: 16.7,
    TRANSITION_TO_APP: 18.2,
    SKIP_VISIBLE: 0.5,
  };

  /* ── Educational Flashcard Content ── */
  const KNOWLEDGE_ITEMS = [
    { cat: 'DIGITAL LOGIC', q: 'What is an FPGA?', a: 'A field-programmable gate array configured after manufacturing.' },
    { cat: 'PHYSICS', q: "What is Ohm's Law?", a: 'V = I × R (current is proportional to voltage across resistance).' },
    { cat: 'AUTOMATA', q: 'What is an FSM?', a: 'A finite state machine transitioning through discrete behavioral states.' },
    { cat: 'SEMICONDUCTORS', q: 'What is a transistor?', a: 'A solid-state device used to amplify or switch electrical signals.' },
    { cat: 'COMPUTER SCIENCE', q: 'What is recursion?', a: 'A function that solves problem instances by invoking itself.' },
    { cat: 'ARTIFICIAL INTEL.', q: 'What is a neural network?', a: 'Interconnected computational nodes learning weighted representations.' },
    { cat: 'SOFTWARE', q: 'What is an API?', a: 'An application programming interface defining software communication.' },
    { cat: 'NETWORKING', q: 'What is TCP/IP?', a: 'Transmission control & internet protocols governing network packets.' },
    { cat: 'SYSTEMS', q: 'What is a compiler?', a: 'Translates high-level source code into target machine instructions.' },
    { cat: 'OPERATING SYSTEMS', q: 'What is virtual memory?', a: 'Memory management technique mapping virtual to physical addresses.' },
    { cat: 'CIRCUITS', q: 'What is a capacitor?', a: 'A passive two-terminal component storing energy in an electric field.' },
    { cat: 'BIOLOGY', q: 'What is photosynthesis?', a: 'Conversion of light energy into chemical energy by green plants.' },
    { cat: 'ALGORITHMS', q: 'What is Big-O notation?', a: 'Mathematical classification of algorithm runtime and space growth.' },
    { cat: 'SOLID STATE', q: 'What is a semiconductor?', a: 'Material with conductivity between conductors and insulators.' },
    { cat: 'DATA SYSTEMS', q: 'What is an ACID transaction?', a: 'Atomicity, Consistency, Isolation, and Durability guarantees.' },
    { cat: 'ELECTRONICS', q: 'What is a diode?', a: 'A semiconductor device permitting electric current flow in one direction.' },
    { cat: 'MACHINE LEARNING', q: 'What is gradient descent?', a: 'First-order optimization algorithm finding local parameter minima.' },
    { cat: 'EMBEDDED', q: 'What is a microcontroller?', a: 'A compact integrated circuit executing dedicated embedded firmware.' },
    { cat: 'INFORMATION', q: 'What is Shannon entropy?', a: 'The average expected information content in an outcome message.' },
    { cat: 'DIGITAL LOGIC', q: 'What is a flip-flop?', a: 'A bi-stable multivibrator circuit storing one bit of data state.' },
    { cat: 'COMPLEXITY', q: 'What is P vs NP?', a: 'Whether problems verifiable in polynomial time are solvable in polynomial time.' },
    { cat: 'QUANTUM', q: 'What is superposition?', a: 'Quantum state existing as a linear combination of basis eigenstates.' },
    { cat: 'PHYSICS', q: 'What is Heisenberg uncertainty?', a: 'Fundamental limit on precision of conjugate observable measurements.' },
    { cat: 'NETWORKS', q: 'What is packet routing?', a: 'Forwarding network traffic along paths determined by routing tables.' },
    { cat: 'SYSTEMS', q: 'What is a cache hit?', a: 'Retrieving data directly from high-speed temporary SRAM storage.' },
    { cat: 'MATHEMATICS', q: 'What is a Fourier transform?', a: 'Decomposes a time-domain function into constituent frequencies.' },
    { cat: 'NEUROSCIENCE', q: 'What is an action potential?', a: 'Rapid voltage spike traveling along a neuron membrane.' },
    { cat: 'SECURITY', q: 'What is asymmetric cryptography?', a: 'Public-key encryption enabling secure key exchange over open channels.' },
  ];

  /* ── Global State ── */
  window.WhatIf = window.WhatIf || {};
  window.WhatIf.soundEnabled = true; // ALWAYS ON by default (No sound toggle button)
  window.WhatIf.introPlayed = false;

  let mainTimeline = null;
  let audioCtx = null;
  let animFrameId = null;
  let isTransitioned = false;
  let activeAudioNodes = [];

  /* ────────────────── AVENGERS BGM AUDIO ENGINE ────────────────── */
  /* Plays the pre-generated Avengers theme WAV from assets/avengers_theme.wav
   * starting at t=0 of the animation. No oscillator synthesis needed. */

  let bgmAudioBuffer = null; // Decoded AudioBuffer
  let bgmSource = null;      // Currently playing BufferSourceNode
  let bgmGain = null;        // Master gain node for BGM
  let bgmStartCtxTime = 0;   // ctx.currentTime when BGM playback began
  let bgmOffset = 0;         // Offset (seconds) into the WAV when playback started

  function getAudioCtx() {
    if (!audioCtx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        audioCtx = new AudioCtx();
      }
    }
    return audioCtx;
  }

  function stopAllAudio() {
    if (bgmSource) {
      try { bgmSource.stop(); } catch (e) {}
      try { bgmSource.disconnect(); } catch (e) {}
      bgmSource = null;
    }
    activeAudioNodes.forEach((node) => {
      try { if (node.stop) node.stop(); } catch (e) {}
      try { if (node.disconnect) node.disconnect(); } catch (e) {}
    });
    activeAudioNodes = [];
  }

  /**
   * Fetch and decode the Avengers BGM WAV file.
   * Called once during initialization; the decoded buffer is cached.
   */
  function preloadBGM() {
    const ctx = getAudioCtx();
    if (!ctx || bgmAudioBuffer) return Promise.resolve();

    return fetch('assets/avengers_endgame.mp3')
      .then((response) => {
        if (!response.ok) throw new Error('BGM fetch failed: ' + response.status);
        return response.arrayBuffer();
      })
      .then((arrayBuffer) => ctx.decodeAudioData(arrayBuffer))
      .then((decodedBuffer) => {
        bgmAudioBuffer = decodedBuffer;
        console.log('[WHATIF] Avengers BGM loaded:', decodedBuffer.duration.toFixed(1) + 's');
      })
      .catch((err) => {
        console.warn('[WHATIF] Could not load Avengers BGM:', err);
      });
  }

  /**
   * Start playing the Avengers BGM from the given offset (seconds).
   * If the AudioContext is suspended (browser autoplay policy), it attempts
   * to resume first, then plays from the correct position in the track.
   *
   * @param {number} startOffset — How many seconds into the animation we are
   *                                (used to seek into the WAV so audio stays in sync).
   */
  function startMarvelSoundtrack(startOffset = 0) {
    const ctx = getAudioCtx();
    if (!ctx || !bgmAudioBuffer) return;

    const playFromOffset = () => {
      // Stop any currently playing instance
      if (bgmSource) {
        try { bgmSource.stop(); } catch (e) {}
        try { bgmSource.disconnect(); } catch (e) {}
        bgmSource = null;
      }

      // Create fresh source and gain
      bgmSource = ctx.createBufferSource();
      bgmSource.buffer = bgmAudioBuffer;

      bgmGain = ctx.createGain();
      bgmGain.gain.setValueAtTime(1.0, ctx.currentTime);
      bgmSource.connect(bgmGain);
      bgmGain.connect(ctx.destination);

      // Clamp offset to valid range
      const offset = Math.max(0, Math.min(startOffset, bgmAudioBuffer.duration - 0.1));
      bgmOffset = offset;
      bgmStartCtxTime = ctx.currentTime;

      bgmSource.start(0, offset);
      activeAudioNodes.push(bgmSource, bgmGain);
    };

    if (ctx.state === 'suspended') {
      ctx.resume().then(() => {
        if (ctx.state === 'running') playFromOffset();
      }).catch(() => {});
    } else if (ctx.state === 'running') {
      playFromOffset();
    }
  }

  /* ────────────────── ATMOSPHERIC CANVAS FOG & PARTICLES ────────────────── */

  function setupAtmosphericCanvas(canvas) {
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    window.addEventListener('resize', () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    });

    const particles = [];
    const count = 45;
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.35 + 0.08,
        dx: (Math.random() - 0.5) * 0.35,
        dy: (Math.random() - 0.5) * 0.35,
      });
    }

    let fogTime = 0;

    function renderAtmosphere() {
      ctx.clearRect(0, 0, width, height);

      // Deep cosmic gradient
      const grad = ctx.createRadialGradient(
        width * 0.5, height * 0.5, 0,
        width * 0.5, height * 0.5, width * 0.7
      );
      grad.addColorStop(0, 'rgba(16, 20, 36, 0.45)');
      grad.addColorStop(0.6, 'rgba(10, 11, 20, 0.6)');
      grad.addColorStop(1, 'rgba(3, 3, 7, 0.95)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);

      // Atmospheric fog drift
      fogTime += 0.004;
      const fogX = width * 0.5 + Math.sin(fogTime) * 60;
      const fogY = height * 0.5 + Math.cos(fogTime * 0.8) * 40;
      const fogGrad = ctx.createRadialGradient(fogX, fogY, 50, fogX, fogY, 450);
      fogGrad.addColorStop(0, 'rgba(56, 225, 255, 0.04)');
      fogGrad.addColorStop(0.5, 'rgba(167, 139, 250, 0.025)');
      fogGrad.addColorStop(1, 'transparent');
      ctx.fillStyle = fogGrad;
      ctx.fillRect(0, 0, width, height);

      // Floating particles
      particles.forEach((p) => {
        p.x += p.dx;
        p.y += p.dy;
        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200, 220, 255, ${p.alpha})`;
        ctx.fill();
      });

      animFrameId = requestAnimationFrame(renderAtmosphere);
    }

    renderAtmosphere();
  }

  /* ────────────────── DOM CREATION ────────────────── */

  function buildDOM() {
    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    overlay.innerHTML = '';
    overlay.style.display = 'flex';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Cinematic introduction');

    // 1. Accessible Heading
    const sr = document.createElement('h1');
    sr.className = 'sr-only';
    sr.textContent = 'WHAT IF? — Future Decision Simulator';
    overlay.appendChild(sr);

    // 2. Atmospheric Canvas
    const canvas = document.createElement('canvas');
    canvas.className = 'intro-canvas';
    canvas.id = 'intro-canvas';
    overlay.appendChild(canvas);
    setupAtmosphericCanvas(canvas);

    // 3. 3D Flight Stage & Camera Rig
    const flightStage = document.createElement('div');
    flightStage.className = 'intro-flight-stage';
    flightStage.id = 'intro-flight-stage';
    flightStage.setAttribute('aria-hidden', 'true');

    const cameraRig = document.createElement('div');
    cameraRig.className = 'intro-camera-rig';
    cameraRig.id = 'intro-camera-rig';

    // A. First Solo Hero Card (0:02–0:04): "What is an FPGA?"
    const solo = KNOWLEDGE_ITEMS[0];
    const soloCard = document.createElement('div');
    soloCard.className = 'cinematic-card hero-solo-card';
    soloCard.id = 'hero-solo-card';
    soloCard.innerHTML = `
      <span class="cinematic-card-tag">● ${solo.cat}</span>
      <h2 class="cinematic-card-q">${solo.q}</h2>
      <p class="cinematic-card-a">${solo.a}</p>
    `;
    cameraRig.appendChild(soloCard);

    // B. Secondary Triad Cards (0:04–0:06)
    const triadItems = [KNOWLEDGE_ITEMS[1], KNOWLEDGE_ITEMS[2], KNOWLEDGE_ITEMS[3]];
    triadItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = `cinematic-card triad-card-${idx}`;
      card.id = `triad-card-${idx}`;
      card.innerHTML = `
        <span class="cinematic-card-tag">● ${item.cat}</span>
        <h3 class="cinematic-card-q">${item.q}</h3>
        <p class="cinematic-card-a">${item.a}</p>
      `;
      cameraRig.appendChild(card);
    });

    // C. Knowledge Nebula Field (0:06–0:09: 30+ 3D floating cards)
    const remainingItems = KNOWLEDGE_ITEMS.slice(4);
    remainingItems.forEach((item, idx) => {
      const card = document.createElement('div');
      card.className = 'cinematic-card nebula-card';
      card.dataset.index = idx;

      const zPos = -300 - idx * 45;
      const xPos = ((idx % 5) - 2) * 220 + (Math.sin(idx) * 60);
      const yPos = (((idx * 7) % 6) - 2.5) * 140 + (Math.cos(idx) * 40);
      const rotY = (Math.sin(idx * 2) * 25);
      const rotX = (Math.cos(idx * 1.5) * 15);

      card.style.left = '50%';
      card.style.top = '50%';
      card.style.marginLeft = '-150px';
      card.style.marginTop = '-60px';
      card.style.transform = `translate3d(${xPos}px, ${yPos}px, ${zPos}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      card.style.opacity = '0';

      card.innerHTML = `
        <span class="cinematic-card-tag">● ${item.cat}</span>
        <h4 class="cinematic-card-q">${item.q}</h4>
        <p class="cinematic-card-a">${item.a}</p>
      `;

      cameraRig.appendChild(card);
    });

    flightStage.appendChild(cameraRig);
    overlay.appendChild(flightStage);

    // 4. Marvel-style Silhouette Letters (0:11.5–0:14: W-H-A-T-I-F)
    const lettersWrap = document.createElement('div');
    lettersWrap.className = 'intro-letters-wrap';
    lettersWrap.id = 'intro-letters-wrap';
    lettersWrap.setAttribute('aria-hidden', 'true');

    const letters = ['W', 'H', 'A', 'T', 'I', 'F'];
    letters.forEach((char) => {
      const slot = document.createElement('div');
      slot.className = 'intro-letter-slot';
      slot.setAttribute('data-letter', char);

      // Inner flipping cards track
      const flipper = document.createElement('div');
      flipper.className = 'intro-letter-flipper';
      for (let f = 0; f < 8; f++) {
        const mini = document.createElement('div');
        mini.className = 'intro-mini-card';
        const qSample = KNOWLEDGE_ITEMS[(f * 3) % KNOWLEDGE_ITEMS.length].q;
        mini.textContent = qSample;
        flipper.appendChild(mini);
      }
      slot.appendChild(flipper);
      lettersWrap.appendChild(slot);
    });
    overlay.appendChild(lettersWrap);

    // 5. Convergence Flash & Shockwave (0:15.2s)
    const conv = document.createElement('div');
    conv.className = 'intro-convergence';
    conv.id = 'intro-convergence';
    conv.setAttribute('aria-hidden', 'true');

    const flash = document.createElement('div');
    flash.className = 'intro-flash';
    flash.id = 'intro-flash';
    conv.appendChild(flash);

    const shockwave = document.createElement('div');
    shockwave.className = 'intro-shockwave';
    shockwave.id = 'intro-shockwave';
    conv.appendChild(shockwave);

    overlay.appendChild(conv);


    // 7. Exact WHATIF Chrome Logo
    const logoWrap = document.createElement('div');
    logoWrap.className = 'intro-logo';
    logoWrap.id = 'intro-logo';
    logoWrap.setAttribute('aria-hidden', 'true');

    const logoImg = document.createElement('img');
    logoImg.src = 'assets/logo.png';
    logoImg.alt = 'WHAT IF...?';
    logoImg.className = 'intro-logo-img';
    logoWrap.appendChild(logoImg);

    const lightSweep = document.createElement('div');
    lightSweep.className = 'intro-light-sweep';
    logoWrap.appendChild(lightSweep);

    overlay.appendChild(logoWrap);

    // 8. Gold Ember Particles
    const embers = document.createElement('div');
    embers.className = 'intro-embers';
    embers.id = 'intro-embers';
    embers.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 28; i++) {
      const ember = document.createElement('div');
      ember.className = 'ember-particle';
      ember.style.left = (32 + Math.random() * 36) + '%';
      embers.appendChild(ember);
    }
    overlay.appendChild(embers);

    // 9. Tagline
    const tagline = document.createElement('p');
    tagline.className = 'intro-tagline';
    tagline.id = 'intro-tagline';
    tagline.textContent = "Don't just imagine the future. Simulate it before you build it.";
    overlay.appendChild(tagline);

    // 10. Call to action button ("ENTER THE MULTIVERSE ▸")
    const cta = document.createElement('button');
    cta.className = 'intro-cta';
    cta.id = 'intro-cta';
    cta.innerHTML = 'ENTER THE MULTIVERSE ▸';
    cta.setAttribute('aria-label', 'Enter the multiverse and open the future decision simulator');
    overlay.appendChild(cta);

    // 11. Controls (Skip and Replay ONLY — NO sound button as requested)
    const skip = document.createElement('button');
    skip.className = 'intro-skip';
    skip.id = 'intro-skip';
    skip.textContent = 'Skip ▸';
    skip.setAttribute('aria-label', 'Skip introduction');
    overlay.appendChild(skip);

    const replay = document.createElement('button');
    replay.className = 'intro-replay';
    replay.id = 'intro-replay';
    replay.innerHTML = '↻';
    replay.title = 'Replay introduction';
    replay.setAttribute('aria-label', 'Replay introduction');
    replay.style.display = 'none';
    overlay.appendChild(replay);
  }

  /* ────────────────── MASTER GSAP TIMELINE ────────────────── */

  function buildTimeline() {
    const tl = gsap.timeline({ paused: true });

    const cameraRig = document.getElementById('intro-camera-rig');
    const heroCard = document.getElementById('hero-solo-card');
    const triad0 = document.getElementById('triad-card-0');
    const triad1 = document.getElementById('triad-card-1');
    const triad2 = document.getElementById('triad-card-2');
    const lettersWrap = document.getElementById('intro-letters-wrap');
    const flash = document.getElementById('intro-flash');
    const shockwave = document.getElementById('intro-shockwave');
    const logo = document.getElementById('intro-logo');
    const lightSweep = document.querySelector('.intro-light-sweep');
    const embers = document.getElementById('intro-embers');
    const eyeWrap = document.getElementById('intro-eye');
    const eyeOuter = document.getElementById('eye-outer');
    const eyeInner = document.getElementById('eye-inner');
    const eyeIris = document.getElementById('eye-iris');
    const eyePupil = document.getElementById('eye-pupil');
    const tagline = document.getElementById('intro-tagline');
    const cta = document.getElementById('intro-cta');
    const skip = document.getElementById('intro-skip');

    // Show skip button early
    tl.to(skip, {
      opacity: 1,
      duration: 0.35,
      ease: 'power2.out',
    }, T.SKIP_VISIBLE);

    /* ── 0:00–0:02 — Darkness & atmosphere ── */
    // Continuous slow camera push forward
    tl.to(cameraRig, {
      z: 400,
      duration: T.NEBULA_START,
      ease: 'none',
    }, 0);

    /* ── 0:02–0:04 — First Flashcard Appears ("What is an FPGA?") ── */
    tl.fromTo(heroCard, {
      opacity: 0,
      z: -500,
      rotateX: 12,
      rotateY: -16,
      scale: 0.75,
    }, {
      opacity: 1,
      z: 50,
      rotateX: 4,
      rotateY: -4,
      scale: 1,
      duration: 1.8,
      ease: 'power1.out',
    }, T.SOLO_CARD_START);

    // Card glides past camera into blur
    tl.to(heroCard, {
      opacity: 0,
      z: 350,
      rotateX: -6,
      rotateY: 8,
      scale: 1.25,
      duration: 0.9,
      ease: 'power2.in',
    }, T.SOLO_CARD_EXIT);

    /* ── 0:04–0:06 — Secondary Flashcards (Triad) ── */
    tl.fromTo(triad0, {
      opacity: 0,
      x: -260,
      z: -300,
      rotateY: 28,
    }, {
      opacity: 1,
      x: 0,
      z: 20,
      rotateY: 14,
      duration: 1.4,
      ease: 'power2.out',
    }, T.TRIAD_START);

    tl.fromTo(triad1, {
      opacity: 0,
      x: 260,
      z: -250,
      rotateY: -28,
    }, {
      opacity: 1,
      x: 0,
      z: 40,
      rotateY: -14,
      duration: 1.4,
      ease: 'power2.out',
    }, T.TRIAD_START + 0.35);

    tl.fromTo(triad2, {
      opacity: 0,
      y: 180,
      z: -200,
      rotateX: -20,
    }, {
      opacity: 1,
      y: 0,
      z: 60,
      rotateX: -6,
      duration: 1.4,
      ease: 'power2.out',
    }, T.TRIAD_START + 0.7);

    /* ── 0:06–0:09 — Large Flashcard Environment / Camera Flight ── */
    tl.to(cameraRig, {
      z: 1400,
      y: -40,
      duration: 3.2,
      ease: 'power1.inOut',
    }, T.NEBULA_START);

    tl.to('.nebula-card', {
      opacity: 0.9,
      duration: 0.8,
      stagger: { each: 0.08, from: 'random' },
      ease: 'power1.out',
    }, T.NEBULA_START);

    tl.to([triad0, triad1, triad2], {
      opacity: 0,
      duration: 0.8,
      ease: 'power1.in',
    }, T.NEBULA_START + 0.5);

    /* ── 0:09–0:12 — Flashcards Begin Converging ── */
    tl.to('.nebula-card', {
      x: 0,
      y: 0,
      rotateX: 0,
      rotateY: 0,
      scale: 0.5,
      opacity: 0.7,
      duration: 2.2,
      stagger: { each: 0.03, from: 'edges' },
      ease: 'power2.inOut',
    }, T.CONVERGENCE_START);

    /* ── 0:11.5–0:14 — Flashcards Form the WHATIF Silhouette ── */
    tl.to('.nebula-card', {
      opacity: 0,
      scale: 0.2,
      duration: 0.5,
      ease: 'power2.in',
    }, T.LETTERS_START);

    tl.fromTo(lettersWrap, {
      opacity: 0,
      scale: 1.35,
    }, {
      opacity: 1,
      scale: 1.0,
      duration: 0.6,
      ease: 'power2.out',
    }, T.LETTERS_START);

    tl.fromTo('.intro-letter-slot', {
      borderColor: 'rgba(230, 36, 41, 0.4)',
      boxShadow: '0 0 10px rgba(230, 36, 41, 0.3)',
    }, {
      borderColor: 'rgba(255, 255, 255, 0.95)',
      boxShadow: '0 0 35px rgba(230, 36, 41, 0.85)',
      stagger: 0.12,
      duration: 0.4,
      yoyo: true,
      repeat: 1,
      ease: 'power1.inOut',
    }, T.LETTERS_START + 0.4);

    /* ── 0:14–0:16 — Flashcards Collapse into Logo + Flash + BOOM ── */
    tl.to(lettersWrap, {
      scale: 0.85,
      opacity: 0,
      duration: 0.4,
      ease: 'power3.in',
    }, T.COLLAPSE_START);

    // Energy Flash
    tl.to(flash, {
      opacity: 1,
      duration: 0.12,
      ease: 'power2.in',
    }, T.BOOM_TIME);

    tl.to(flash, {
      opacity: 0,
      duration: 0.3,
      ease: 'power2.out',
    }, T.BOOM_TIME + 0.12);

    // Outward Circular Shockwave
    tl.fromTo(shockwave, {
      scale: 0.1,
      opacity: 1,
    }, {
      scale: 5.5,
      opacity: 0,
      duration: 0.65,
      ease: 'power2.out',
    }, T.BOOM_TIME + 0.05);

    /* ── 0:16–0:18 — WHATIF Logo Reveal ── */
    tl.fromTo(logo, {
      opacity: 0,
      scale: 0.05,
      y: 0,
    }, {
      opacity: 1,
      scale: 1.0,
      y: 0,
      duration: 0.6,
      ease: 'back.out(2.2)',
    }, T.LOGO_REVEAL);

    // Screen shake on landing
    tl.to(document.getElementById('intro-overlay'), {
      keyframes: [
        { x: -6, y: -4, duration: 0.025 },
        { x: 6, y: 3, duration: 0.025 },
        { x: -5, y: 4, duration: 0.025 },
        { x: 5, y: -2, duration: 0.025 },
        { x: -3, y: 2, duration: 0.025 },
        { x: 0, y: 0, duration: 0.025 },
      ],
    }, T.LOGO_REVEAL + 0.08);

    // Diagonal light sweep
    tl.fromTo(lightSweep, {
      x: '-120%',
      opacity: 1,
    }, {
      x: '130%',
      opacity: 0,
      duration: 0.65,
      ease: 'power2.inOut',
    }, T.LIGHT_SWEEP);

    // Gold ember particles
    tl.to(embers, {
      opacity: 1,
      duration: 0.35,
    }, T.LOGO_REVEAL + 0.2);

    tl.to('.ember-particle', {
      y: () => -(60 + Math.random() * 80),
      x: () => (Math.random() - 0.5) * 40,
      opacity: 0,
      duration: 1.6,
      stagger: { each: 0.035, from: 'random' },
      ease: 'power1.out',
    }, T.LOGO_REVEAL + 0.3);


    // Tagline fades up
    tl.fromTo(tagline, {
      opacity: 0,
      y: 18,
    }, {
      opacity: 1,
      y: 0,
      duration: 0.65,
      ease: 'power2.out',
    }, T.TAGLINE_FADE);

    // CTA button appears
    tl.fromTo(cta, {
      opacity: 0,
      y: 16,
      scale: 0.95,
    }, {
      opacity: 1,
      y: 0,
      scale: 1,
      duration: 0.5,
      ease: 'power2.out',
      onComplete: onSequenceFinished,
    }, T.TAGLINE_FADE + 0.4);

    /* ── 0:18–0:19 — Transition into the actual website interface ── */
    tl.call(() => {
      transitionToApp();
    }, null, T.TRANSITION_TO_APP);

    return tl;
  }

  /* ────────────────── TRANSITION INTO APPLICATION ────────────────── */

  function onSequenceFinished() {
    const replay = document.getElementById('intro-replay');
    if (replay) {
      replay.style.display = 'flex';
      gsap.fromTo(replay, { opacity: 0, scale: 0.7 }, { opacity: 1, scale: 1, duration: 0.35 });
    }
  }

  function transitionToApp() {
    if (isTransitioned) return;
    isTransitioned = true;

    stopAllAudio();

    const overlay = document.getElementById('intro-overlay');
    if (!overlay) return;

    const curtain = document.createElement('div');
    curtain.className = 'intro-transition-out';
    curtain.style.background = '#FFFFFF';
    curtain.style.opacity = '0';
    overlay.appendChild(curtain);

    gsap.to(curtain, {
      opacity: 1,
      duration: 0.25,
      ease: 'power2.in',
      onComplete: () => {
        curtain.style.background = '#07070B';
        gsap.to(curtain, {
          opacity: 1,
          duration: 0.25,
          ease: 'power2.out',
          onComplete: () => {
            if (animFrameId) cancelAnimationFrame(animFrameId);
            if (mainTimeline) mainTimeline.kill();
            gsap.killTweensOf('*');

            const isStandaloneLanding = window.location.pathname.endsWith('landing.html');
            if (isStandaloneLanding) {
              window.location.href = 'index.html#home';
              return;
            }

            overlay.style.display = 'none';
            const navbar = document.getElementById('navbar');
            if (navbar) navbar.style.display = 'flex';

            sessionStorage.setItem('whatif-intro-played', 'true');
            window.WhatIf.introPlayed = true;

            // Signal cursor-dots.js to activate
            window.dispatchEvent(new CustomEvent('whatif:intro-complete'));

            const target = window.WhatIf.pendingTargetPage || 'home';
            window.WhatIf.pendingTargetPage = null;

            try {
              history.pushState(null, '', '#' + target);
            } catch (e) {
              window.location.hash = '#' + target;
            }

            if (window.WhatIf.navigate) {
              window.WhatIf.navigate(target);
            }
          },
        });
      },
    });
  }

  function skipIntro() {
    stopAllAudio();
    transitionToApp();
  }

  function replayIntro() {
    isTransitioned = false;
    const replay = document.getElementById('intro-replay');
    if (replay) replay.style.display = 'none';

    stopAllAudio();
    if (animFrameId) cancelAnimationFrame(animFrameId);
    if (mainTimeline) mainTimeline.kill();
    gsap.killTweensOf('*');

    buildDOM();
    bindEvents();

    preloadBGM().then(() => {
      mainTimeline = buildTimeline();
      mainTimeline.play();
      startMarvelSoundtrack(0);
    });
  }

  /* ────────────────── EVENT BINDING ────────────────── */

  function bindEvents() {
    const skip = document.getElementById('intro-skip');
    const cta = document.getElementById('intro-cta');
    const replayBtn = document.getElementById('intro-replay');

    if (skip) skip.addEventListener('click', skipIntro);
    if (cta) cta.addEventListener('click', transitionToApp);
    if (replayBtn) replayBtn.addEventListener('click', replayIntro);

    document.addEventListener('keydown', (e) => {
      const overlay = document.getElementById('intro-overlay');
      if (!overlay || overlay.style.display === 'none') return;

      if (e.key === 'Escape') {
        e.preventDefault();
        skipIntro();
      }
      if (e.key === 'Enter' || e.key === ' ') {
        if (document.activeElement === cta) {
          e.preventDefault();
          transitionToApp();
        }
      }
    });

    // Auto-unlock WebAudio on first user interaction if browser blocked autoplay.
    // Browsers REQUIRE a user gesture before AudioContext can play.
    // This handler keeps firing on every interaction until audio is confirmed playing.
    let audioUnlocked = false;
    const unlockAudio = () => {
      if (audioUnlocked) return;

      const ctx = getAudioCtx();
      if (!ctx) return;

      // Resume suspended context
      if (ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      // If BGM buffer is ready, start playing from current timeline position
      if (bgmAudioBuffer && (!bgmSource || ctx.state === 'running')) {
        const currentTimelineTime = mainTimeline ? mainTimeline.time() : 0;
        startMarvelSoundtrack(currentTimelineTime);
        audioUnlocked = true;
        // Remove all listeners once audio is confirmed playing
        ['pointerdown', 'touchstart', 'click', 'keydown', 'mousedown'].forEach((evt) => {
          window.removeEventListener(evt, unlockAudio);
        });
      } else if (!bgmAudioBuffer) {
        // BGM not loaded yet — preload and play as soon as ready
        preloadBGM().then(() => {
          const ct = getAudioCtx();
          if (ct && ct.state === 'suspended') ct.resume().catch(() => {});
          const currentTimelineTime = mainTimeline ? mainTimeline.time() : 0;
          startMarvelSoundtrack(currentTimelineTime);
          audioUnlocked = true;
          ['pointerdown', 'touchstart', 'click', 'keydown', 'mousedown'].forEach((evt) => {
            window.removeEventListener(evt, unlockAudio);
          });
        });
      }
    };
    // Listen on MULTIPLE events, do NOT use once — keep retrying until audio plays
    ['pointerdown', 'touchstart', 'click', 'keydown', 'mousedown'].forEach((evt) => {
      window.addEventListener(evt, unlockAudio, { passive: true });
    });
  }

  /* ────────────────── REDUCED MOTION ────────────────── */

  function checkReducedMotion() {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    return mq && mq.matches;
  }

  /* ────────────────── INITIALIZATION ────────────────── */

  function start() {
    const isStandaloneLanding = window.location.pathname.endsWith('landing.html');
    const rawHash = (window.location.hash || '').replace('#', '').trim();
    if (rawHash && rawHash !== 'intro') {
      window.WhatIf.pendingTargetPage = rawHash;
    }

    // Strict Intro Guard: No user can access any page without completing intro first.
    // If already played in this session, skip overlay and resume.
    const alreadyPlayed = sessionStorage.getItem('whatif-intro-played') === 'true';
    if (!isStandaloneLanding && alreadyPlayed) {
      const overlay = document.getElementById('intro-overlay');
      if (overlay) overlay.style.display = 'none';
      const navbar = document.getElementById('navbar');
      if (navbar) navbar.style.display = 'flex';
      window.WhatIf.introPlayed = true;
      const target = window.WhatIf.pendingTargetPage || 'home';
      window.WhatIf.pendingTargetPage = null;
      if (window.WhatIf.navigate) {
        window.WhatIf.navigate(target);
      }
      return;
    }

    if (checkReducedMotion()) {
      buildDOM();
      bindEvents();
      transitionToApp();
      return;
    }

    // ── GATE SCREEN: Forces a user gesture so browser allows audio from t=0 ──
    // Preload fonts + BGM in the background while the gate is shown.
    const overlay = document.getElementById('intro-overlay');
    if (overlay) {
      overlay.innerHTML = '';
      overlay.style.display = 'flex';
    }

    // Create the click-to-start gate
    const gate = document.createElement('div');
    gate.id = 'intro-gate';
    gate.style.cssText = `
      position: fixed; inset: 0; z-index: 99999;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      background: #05060F; cursor: pointer;
      font-family: 'Inter', sans-serif;
    `;
    gate.innerHTML = `
      <img src="assets/logo.png" alt="WHAT IF?" style="width: min(320px, 60vw); margin-bottom: 32px; opacity: 0.92; filter: drop-shadow(0 0 30px rgba(242,184,75,0.35));">
      <div style="color: #F2B84B; font-family: 'Oswald', sans-serif; font-size: clamp(16px, 3vw, 22px); letter-spacing: 4px; text-transform: uppercase; animation: gatePulse 2s ease-in-out infinite;">
        ▶ &nbsp; CLICK ANYWHERE TO EXPERIENCE
      </div>
      <style>
        @keyframes gatePulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      </style>
    `;
    document.body.appendChild(gate);

    // Start preloading in the background
    const fontsReady = (document.fonts && document.fonts.ready)
      ? document.fonts.ready
      : Promise.resolve();
    const bgmReady = preloadBGM();
    let assetsReady = false;

    Promise.all([fontsReady, bgmReady]).then(() => {
      assetsReady = true;
    }).catch(() => {
      assetsReady = true; // proceed anyway
    });

    // On ANY click/touch/key on the gate → launch the full cinematic experience with audio
    const launchExperience = () => {
      gate.removeEventListener('click', launchExperience);
      gate.removeEventListener('touchstart', launchExperience);
      gate.removeEventListener('keydown', launchExperience);

      // Ensure AudioContext is created and resumed inside this user gesture
      const ctx = getAudioCtx();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume().catch(() => {});
      }

      const doLaunch = () => {
        // Remove gate
        if (gate.parentNode) gate.parentNode.removeChild(gate);

        // Build and start the intro
        buildDOM();
        bindEvents();
        mainTimeline = buildTimeline();
        mainTimeline.play();
        startMarvelSoundtrack(0); // Audio plays from the VERY BEGINNING — guaranteed!
      };

      if (assetsReady) {
        doLaunch();
      } else {
        // Assets still loading — show a brief "Loading..." then launch
        gate.querySelector('div').textContent = 'LOADING...';
        Promise.all([fontsReady, bgmReady]).finally(() => {
          doLaunch();
        });
      }
    };

    gate.addEventListener('click', launchExperience);
    gate.addEventListener('touchstart', launchExperience, { passive: true });
    gate.addEventListener('keydown', launchExperience);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
