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
  function getSystemId() {
    let sysId = localStorage.getItem(SYSTEM_ID_KEY);
    if (!sysId) {
      const randHex = Math.floor(Math.random() * 0xFFFFFF).toString(16).toUpperCase().padStart(6, '0');
      sysId = `NEXUS-NODE-${randHex}`;
      localStorage.setItem(SYSTEM_ID_KEY, sysId);
    }
    return sysId;
  }

  /**
   * Retrieve all recorded history entries.
   */
  function getAllEntries() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Could not read history from localStorage:', e);
    }

    // Default pre-seeded system memory if brand new
    const initialRecords = [
      {
        id: 'SIM-9X41',
        timestamp: new Date(Date.now() - 3600000 * 2).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        prompt: "India responds to a 30-day oil-chokepoint disruption",
        presetKey: "hormuz",
        presetTitle: "The Strait Closes",
        sector: "SECTOR 01 · GEOPOLITICS",
        winnerBranch: "Branch B (Reserve + Reroute)",
        score: "78/100",
        variables: "Closure: 30 days · Reserve Rate: 50% · Alt Suppliers: 15%",
        verdict: "Timeline B leads with 78/100. Smooths the retail spike, but depletes buffers by day 41 if extended.",
        notes: "System recommendation: High stability under 30-day window; flips to Branch C if duration exceeds 60 days."
      },
      {
        id: 'SIM-7B22',
        timestamp: new Date(Date.now() - 3600000 * 24).toLocaleString('en-US', {
          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        }),
        prompt: "A company switches to a 4-day work week",
        presetKey: "fourday",
        presetTitle: "The 4-Day Week",
        sector: "SECTOR 03 · WORKFORCE",
        winnerBranch: "Branch A (Pilot Program)",
        score: "82/100",
        variables: "Transition: 12 weeks · Coverage: 95% · Team: 150",
        verdict: "Pilot strategy preserves output while benchmarking client satisfaction before full commitment.",
        notes: "System recommendation: Implement department-by-department rotation."
      }
    ];

    saveEntries(initialRecords);
    return initialRecords;
  }

  function saveEntries(entries) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
    } catch (e) {
      console.warn('Failed to save to localStorage:', e);
    }
  }

  /**
   * Record a new chat prompt / decision run in system memory.
   */
  function recordSimulation(data) {
    const entries = getAllEntries();
    const newEntry = {
      id: 'SIM-' + Math.floor(Math.random() * 0xFFFF).toString(16).toUpperCase().padStart(4, '0'),
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
      notes: data.notes || "Logged into permanent system memory for this terminal."
    };

    // Prepend new entry
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

    window.WhatIf.state.decision = entry.prompt;
    window.WhatIf.state.currentPreset = entry.presetKey;
    
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
    if (systemCountEl) systemCountEl.textContent = `${entries.length} SESSIONS SAVED`;

    if (!container) return;

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
        <article class="history-card" data-sim-id="${entry.id}">
          <div class="history-card-header">
            <div class="history-meta-left">
              <span class="history-id-badge">${entry.id}</span>
              <span class="history-time">${entry.timestamp}</span>
              <span class="history-sector-badge">${entry.sector}</span>
            </div>
            <button class="history-delete-btn" data-delete-id="${entry.id}" title="Remove this record">✕</button>
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
            <span class="history-memory-tag">● PERSISTED ON SYSTEM TERMINAL</span>
            <button class="btn-secondary btn-sm history-reload-btn" data-reload-id="${entry.id}">
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
      .replace(/"/g, '&quot;');
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
