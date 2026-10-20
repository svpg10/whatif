/**
 * consent.js — Pre-simulation mandatory consent modal
 * Shows a two-checkbox modal before any simulation begins.
 * Records consent timestamp and policy versions.
 */
(function () {
  'use strict';

  const PRIVACY_VERSION = '1.1';
  const DISCLAIMER_VERSION = '1.1';

  let pendingCallback = null;
  let previousFocus = null;

  /**
   * Show the consent modal. Calls `callback` only if both boxes are checked.
   * Stores callback so it survives the modal lifecycle.
   * @param {Function} [callback] - Function to run on successful consent
   * @param {boolean} [forceShow=false] - Force modal display even if consented this session
   */
  function showConsent(callback, forceShow) {
    // If already consented this session and not forced, proceed
    if (!forceShow) {
      let existing = null;
      try { existing = sessionStorage.getItem('whatif-consent'); } catch { /* Ask again if storage is unavailable. */ }
      if (existing) {
        try {
          const record = JSON.parse(existing);
          if (record.privacyVersion === PRIVACY_VERSION && record.disclaimerVersion === DISCLAIMER_VERSION) {
            if (typeof callback === 'function') callback();
            return;
          }
        } catch (e) { /* ignore */ }
      }
    }

    pendingCallback = callback || null;
    const modal = document.getElementById('consent-modal');
    if (!modal) {
      return;
    }

    // Reset checkboxes each time
    const privacyCb = document.getElementById('check-privacy');
    const aiCb = document.getElementById('check-ai');
    const continueBtn = document.getElementById('consent-continue');

    if (privacyCb) privacyCb.checked = false;
    if (aiCb) aiCb.checked = false;
    if (continueBtn) {
      continueBtn.disabled = true;
      continueBtn.setAttribute('aria-disabled', 'true');
    }

    previousFocus = document.activeElement;
    modal.removeAttribute('hidden');
    modal.setAttribute('tabindex', '-1');
    modal.focus();
  }

  function updateContinueBtn() {
    const privacyCb = document.getElementById('check-privacy');
    const aiCb = document.getElementById('check-ai');
    const continueBtn = document.getElementById('consent-continue');
    if (!privacyCb || !aiCb || !continueBtn) return;

    const bothChecked = privacyCb.checked && aiCb.checked;
    continueBtn.disabled = !bothChecked;
    continueBtn.setAttribute('aria-disabled', String(!bothChecked));
  }

  function recordConsent() {
    const record = {
      privacyVersion: PRIVACY_VERSION,
      disclaimerVersion: DISCLAIMER_VERSION,
      timestamp: new Date().toISOString()
    };
    try { sessionStorage.setItem('whatif-consent', JSON.stringify(record)); } catch { /* Current acknowledgement remains valid; ask again next time. */ }
  }

  function closeModal() {
    const modal = document.getElementById('consent-modal');
    if (modal) modal.setAttribute('hidden', '');
    pendingCallback = null;
    previousFocus?.focus();
  }

  function init() {
    const privacyCb = document.getElementById('check-privacy');
    const aiCb = document.getElementById('check-ai');
    const continueBtn = document.getElementById('consent-continue');
    const cancelBtn = document.getElementById('consent-cancel');
    const backdrop = document.querySelector('.consent-backdrop');

    if (privacyCb) privacyCb.addEventListener('change', updateContinueBtn);
    if (aiCb) aiCb.addEventListener('change', updateContinueBtn);

    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        const privacyCb = document.getElementById('check-privacy');
        const aiCb = document.getElementById('check-ai');
        if (!privacyCb || !aiCb || !privacyCb.checked || !aiCb.checked) return;
        recordConsent();
        const callback = pendingCallback;
        closeModal();
        if (typeof callback === 'function') callback();
      });
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', closeModal);
    }

    if (backdrop) {
      backdrop.addEventListener('click', closeModal);
    }

    // Keyboard: Escape closes
    document.addEventListener('keydown', (e) => {
      const modal = document.getElementById('consent-modal');
      if (e.key === 'Escape' && modal && !modal.hasAttribute('hidden')) {
        closeModal();
      }
      if (e.key === 'Tab' && modal && !modal.hasAttribute('hidden')) {
        const focusable = Array.from(modal.querySelectorAll('a[href], button:not([disabled]), input:not([disabled])'));
        const first = focusable[0], last = focusable[focusable.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === modal)) {
          e.preventDefault(); last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault(); first?.focus();
        }
      }
    });

    // Direct trigger button on home page
    const triggerBtn = document.getElementById('btn-trigger-consent');
    if (triggerBtn) {
      triggerBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showConsent(null, true);
      });
    }

    // Clicking privacy/AI disclaimer links in modal must NOT check the boxes
    const privacyLink = document.getElementById('privacy-link');
    if (privacyLink) {
      privacyLink.addEventListener('click', (e) => {
        e.stopPropagation(); // Don't trigger the label
      });
    }
  }

  // Expose
  window.WhatIf = window.WhatIf || {};
  window.WhatIf.Consent = { show: showConsent };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
