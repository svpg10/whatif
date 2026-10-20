/**
 * home.js - Home Page Interactions
 */
(function() {
    window.WhatIf = window.WhatIf || {};
    window.WhatIf.state = window.WhatIf.state || {
        decision: '',
        currentPreset: null,
        sliderValues: {},
        simulationResults: null,
        priorities: { cost: 50, risk: 50, speed: 50, impact: 50 },
        activeBranch: 'A'
    };
    
    // Stub for navigate
    window.WhatIf.navigate = window.WhatIf.navigate || function(page) {
        console.log('Navigating to', page);
    };

    const PRESETS = {
        hormuz: "India responds to a 30-day oil-chokepoint disruption",
        ev: "A city scales its EV charging network to 500 stations",
        fourday: "A company switches to a 4-day work week",
        carban: "A city bans cars from the downtown core"
    };

    const SELECTORS = {
        chips: '.preset-chips .chip',
        input: '#decision-input',
        ctaBtn: '#btn-open-multiverse'
    };

    function initHome() {
        const chips = document.querySelectorAll(SELECTORS.chips);
        const input = document.querySelector(SELECTORS.input);
        const ctaBtn = document.querySelector(SELECTORS.ctaBtn);
        const form = document.getElementById('decision-form');
        const error = document.getElementById('decision-error');
        const selection = document.getElementById('decision-selection');

        if (!input || !ctaBtn) return;
        const clearError = () => {
            if (error) { error.hidden = true; error.textContent = ''; }
            input.removeAttribute('aria-invalid');
        };
        const submit = () => {
            if (input.value.trim().length < 6) {
                if (error) { error.textContent = 'Describe your decision in at least 6 characters.'; error.hidden = false; }
                input.setAttribute('aria-invalid', 'true');
                input.focus();
                return;
            }
            clearError();
            handleCTA(input.value.trim());
        };

        // Preset chip clicks
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                chips.forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
                chip.classList.add('selected');
                chip.setAttribute('aria-pressed', 'true');
                
                const presetKey = chip.getAttribute('data-preset');
                if (PRESETS[presetKey]) {
                    input.value = PRESETS[presetKey];
                    window.WhatIf.state.currentPreset = presetKey;
                    clearError();
                    if (selection) selection.textContent = 'Example selected. Edit the question or explore it as it is.';
                    updateCTAState(input, ctaBtn);
                    input.focus({ preventScroll: true });
                    document.querySelector('.decision-composer')?.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
                }
            });
        });

        // Input text changes
        input.addEventListener('input', () => {
            chips.forEach(c => { c.classList.remove('selected'); c.setAttribute('aria-pressed', 'false'); });
            window.WhatIf.state.currentPreset = null;
            clearError();
            if (selection) selection.textContent = 'Custom questions use AI. Examples use built-in models.';
            updateCTAState(input, ctaBtn);
        });

        // Enter key in input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                submit();
            }
        });

        // CTA button click
        form.addEventListener('submit', e => { e.preventDefault(); submit(); });
        chips.forEach(chip => chip.setAttribute('aria-pressed', 'false'));

        updateCTAState(input, ctaBtn);
    }

    function updateCTAState(input, btn) {
        btn.removeAttribute('disabled');
        btn.classList.toggle('active', input.value.trim().length > 5);
    }

    function handleCTA(decisionText) {
        const selected = Object.entries(PRESETS).find(([, text]) => text.toLowerCase() === decisionText.toLowerCase());
        const key = selected ? selected[0] : 'custom';
        // Show consent modal before navigating to simulation
        const proceed = () => {
            if (key === 'custom') {
                window.WhatIf.state.decision = decisionText;
                window.WhatIf.state.currentPreset = 'custom';
                window.WhatIf.state.customScenario = null;
                window.WhatIf.state.sliderValues = {};
                window.WhatIf.state.simulationResults = null;
            } else {
                window.WhatIf.Scenarios.start(decisionText, key);
            }
            window.WhatIf.navigate('analysis');
        };
        if (window.WhatIf.Consent && window.WhatIf.Consent.show) {
            window.WhatIf.Consent.show(proceed);
        } else {
            proceed();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHome);
    } else {
        initHome();
    }

})();
