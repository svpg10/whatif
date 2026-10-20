/**
 * history.js — System Recognition & Chat/Simulation History Engine
 * ==============================================================
 * Recognizes the single user on this system (device terminal).
 * Persists and remembers past chat prompts, decision scenarios, 
 * variable configurations, and simulation outcomes across sessions.
 */
(function () {
  'use strict';

  const STORAGE_KEY = 'whatif_terminal_history';
  const SYSTEM_ID_KEY = 'whatif_system_id';

  window.WhatIf = window.WhatIf || {};

  /**
   * Generates or retrieves the persistent machine/system recognition ID.
   */
  let memory = [];
  let memoryOnly = false;
  let systemId = null;
  function getSystemId() {
    if (systemId) return systemId;
    try { systemId = localStorage.getItem(SYSTEM_ID_KEY); } catch { /* Memory-only mode. */ }
    if (!/^NEXUS-NODE-[A-F0-9]{6}$/.test(systemId || '')) {
      systemId = 'NEXUS-NODE-' + Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
      try { localStorage.setItem(SYSTEM_ID_KEY, systemId); } catch { /* Optional persistence. */ }
    }
    return systemId;
  }

  function validateEntry(entry) {
    if (!entry || typeof entry !== 'object' || !/^SIM-[A-Za-z0-9-]{1,80}$/.test(entry.id || '') ||
        typeof entry.prompt !== 'string' || entry.prompt.length < 6 || entry.prompt.length > 2000) return null;
    const result = {};
    for (const key of ['id', 'timestamp', 'prompt', 'presetKey', 'presetTitle', 'sector', 'winnerBranch', 'score', 'variables', 'verdict', 'notes']) {
      if (entry[key] !== undefined && (typeof entry[key] !== 'string' || entry[key].length > 4000)) return null;
      result[key] = entry[key] || '';
    }
    const W = window.WhatIf;
    try {
      if (result.presetKey === 'custom') {
        result.customScenario = W.Scenarios.validateCustom(entry.customScenario);
      } else if (!Object.hasOwn(W.Presets, result.presetKey)) return null;
    } catch { return null; }
    result.sliderValues = entry.sliderValues && typeof entry.sliderValues === 'object' ?
      Object.fromEntries(Object.entries(entry.sliderValues).filter(([key, value]) =>
        /^[a-zA-Z][a-zA-Z0-9]{0,40}$/.test(key) && typeof value === 'number' && Number.isFinite(value))) : {};
    result.priorities = W.Scenarios.priorities(entry.priorities);
    return result;
  }

  function getAllEntries() {
    try {
      const raw = memoryOnly ? null : localStorage.getItem(STORAGE_KEY);
      if (raw && raw.length <= 2 * 1024 * 1024) {
        const parsed = JSON.parse(raw);
        memory = Array.isArray(parsed) ? parsed.slice(0, 50).map(validateEntry).filter(Boolean) : [];
      } else if (!memoryOnly) memory = [];
    } catch { memoryOnly = true; }
    return memory.slice();
  }

  function saveEntries(entries) {
    memory = entries.slice(0, 50).map(validateEntry).filter(Boolean);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(memory)); memoryOnly = false; }
    catch { memoryOnly = true; }
  }

  /**
   * Record a new chat prompt / decision run in system memory.
   */
  function recordSimulation(data) {
    const entries = getAllEntries();
    const newEntry = {
      id: 'SIM-' + (window.WhatIf.state.runId || Date.now().toString(36)),
      timestamp: new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
      }),
      prompt: data.prompt || window.WhatIf.state.decision || "Custom Nexus Exploration",
      presetKey: data.presetKey || window.WhatIf.state.currentPreset || "custom",
      presetTitle: data.presetTitle || (window.WhatIf.Presets[data.presetKey] ? window.WhatIf.Presets[data.presetKey].title : "Custom Scenario"),
      sector: data.sector || "ACTIVE TIMELINE SECTOR",
      winnerBranch: data.winnerBranch || "Pending Analysis",
      score: data.score || "75/100",
      variables: data.variables || formatCurrentSliders(),
      verdict: data.verdict || "Simulation calculated across all 3 multiverse branches.",
      notes: data.notes || 'Saved in this browser when storage is available.',
      sliderValues: { ...window.WhatIf.state.sliderValues },
      priorities: window.WhatIf.Scenarios.priorities(window.WhatIf.state.priorities),
      customScenario: window.WhatIf.state.currentPreset === 'custom' ? window.WhatIf.state.customScenario : undefined
    };

    // Prepend new entry
    const existing = entries.findIndex(entry => entry.id === newEntry.id);
    if (existing >= 0) entries.splice(existing, 1);
    entries.unshift(newEntry);
    if (entries.length > 50) entries.pop(); // Keep last 50
    saveEntries(entries);

    // Refresh UI if on history page
    renderHistoryPage();
    return newEntry;
  }

  function formatCurrentSliders() {
    const sVals = window.WhatIf.state.sliderValues || {};
    const keys = Object.keys(sVals);
    if (keys.length === 0) return "Default parameters";
    return keys.slice(0, 3).map(k => `${k}: ${sVals[k]}`).join(' · ');
  }

  /**
   * Reloads a past historical scenario directly into the simulation engine.
   */
  function reloadScenario(id) {
    const entries = getAllEntries();
    const entry = entries.find(e => e.id === id);
    if (!entry) return;

    const W = window.WhatIf;
    W.Scenarios.start(entry.prompt, entry.presetKey, entry.customScenario);
    W.state.runId = entry.id.replace(/^SIM-/, '');
    W.state.sliderValues = W.Scenarios.values(W.Scenarios.current(), entry.sliderValues);
    W.state.priorities = W.Scenarios.priorities(entry.priorities);
    
    // Set input on home if present
    const input = document.getElementById('decision-input');
    if (input) input.value = entry.prompt;

    if (window.WhatIf.Consent && window.WhatIf.Consent.show) {
      window.WhatIf.Consent.show(function() {
        window.WhatIf.navigate('analysis');
      });
    } else {
      window.WhatIf.navigate('analysis');
    }
  }

  /**
   * Deletes a single history item.
   */
  function deleteEntry(id) {
    let entries = getAllEntries();
    entries = entries.filter(e => e.id !== id);
    saveEntries(entries);
    renderHistoryPage();
  }

  /**
   * Clears all history.
   */
  function clearAll() {
    if (confirm("Reset terminal system memory for this user? All past simulation logs will be wiped.")) {
      saveEntries([]);
      renderHistoryPage();
    }
  }

  /**
   * Renders the complete Chat & Decision History page UI.
   */
  function renderHistoryPage() {
    const container = document.getElementById('history-feed-container');
    const systemIdEl = document.getElementById('sys-rec-id');
    const systemCountEl = document.getElementById('sys-rec-count');

    const sysId = getSystemId();
    if (systemIdEl) systemIdEl.textContent = sysId;

    const entries = getAllEntries();
    if (systemCountEl) systemCountEl.textContent = `${entries.length} SESSIONS ${memoryOnly ? 'IN MEMORY (STORAGE UNAVAILABLE)' : 'SAVED'}`;

    if (!container) return;
    const page = document.getElementById('page-history');
    if (page) {
      page.querySelector('.history-subheading').textContent = 'Your last 50 simulation records are stored in this browser profile when storage is available. This is a random browser ID, not hardware recognition or an account. Custom questions are also sent to Google Gemini.';
      page.querySelector('.sys-rec-title').textContent = 'LOCAL BROWSER HISTORY';
      const items = page.querySelectorAll('.sys-rec-item');
      items[1].querySelector('.rec-val').textContent = 'SHARED WITH THIS BROWSER PROFILE';
      items[3].querySelector('.rec-label').textContent = 'CUSTOM QUESTION PROCESSING';
      items[3].querySelector('.rec-val').textContent = 'GOOGLE GEMINI VIA SERVER';
    }

    if (entries.length === 0) {
      container.innerHTML = `
        <div class="history-empty-state">
          <div class="empty-icon">📜</div>
          <h3>System Memory Is Empty</h3>
          <p>No previous simulation chats or timeline branches recorded on this terminal yet.</p>
          <button class="btn-primary" data-nav="home">Start First Simulation ▸</button>
        </div>
      `;
      // Wire button
      const btn = container.querySelector('[data-nav="home"]');
      if (btn) {
        btn.addEventListener('click', () => window.WhatIf.navigate('home'));
      }
      return;
    }

    let html = '';
    entries.forEach(entry => {
      html += `
        <article class="history-card" data-sim-id="${escapeHtml(entry.id)}">
          <div class="history-card-header">
            <div class="history-meta-left">
              <span class="history-id-badge">${escapeHtml(entry.id)}</span>
              <span class="history-time">${escapeHtml(entry.timestamp)}</span>
              <span class="history-sector-badge">${escapeHtml(entry.sector)}</span>
            </div>
            <button class="history-delete-btn" data-delete-id="${escapeHtml(entry.id)}" title="Remove this record">✕</button>
          </div>

          <div class="history-prompt-block">
            <span class="history-prompt-label">USER DECISION PROMPT:</span>
            <h3 class="history-prompt-text">"${escapeHtml(entry.prompt)}"</h3>
          </div>

          <div class="history-outcome-grid">
            <div class="history-outcome-item">
              <span class="outcome-label">SIMULATION LEADER</span>
              <span class="outcome-val text-gold">${escapeHtml(entry.winnerBranch)}</span>
            </div>
            <div class="history-outcome-item">
              <span class="outcome-label">WINNER SCORE</span>
              <span class="outcome-val text-cyan">${escapeHtml(entry.score)}</span>
            </div>
            <div class="history-outcome-item history-vars-item">
              <span class="outcome-label">VARIABLES TESTED</span>
              <span class="outcome-val">${escapeHtml(entry.variables)}</span>
            </div>
          </div>

          <div class="history-verdict-box">
            <span class="verdict-tag">SYSTEM ANALYSIS:</span>
            <p class="verdict-summary">${escapeHtml(entry.verdict)}</p>
          </div>

          <div class="history-card-footer">
            <span class="history-memory-tag">● ${memoryOnly ? 'IN MEMORY ONLY' : 'SAVED IN THIS BROWSER'}</span>
            <button class="btn-secondary btn-sm history-reload-btn" data-reload-id="${escapeHtml(entry.id)}">
              ↺ RELOAD TIMELINE ▸
            </button>
          </div>
        </article>
      `;
    });

    container.innerHTML = html;

    // Wire actions
    container.querySelectorAll('[data-reload-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-reload-id');
        reloadScenario(id);
      });
    });

    container.querySelectorAll('[data-delete-id]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const id = btn.getAttribute('data-delete-id');
        deleteEntry(id);
      });
    });
  }

  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  // Export module API
  window.WhatIf.History = {
    getSystemId,
    getAll: getAllEntries,
    record: recordSimulation,
    reload: reloadScenario,
    delete: deleteEntry,
    clear: clearAll,
    render: renderHistoryPage
  };

  document.addEventListener('DOMContentLoaded', () => {
    const clearBtn = document.getElementById('btn-clear-history');
    if (clearBtn) {
      clearBtn.addEventListener('click', clearAll);
    }
  });
})();
