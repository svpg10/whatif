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

        if (!input || !ctaBtn) return;

        // Preset chip clicks
        chips.forEach(chip => {
            chip.addEventListener('click', (e) => {
                chips.forEach(c => c.classList.remove('selected'));
                chip.classList.add('selected');
                
                const presetKey = chip.getAttribute('data-preset');
                if (PRESETS[presetKey]) {
                    input.value = PRESETS[presetKey];
                    window.WhatIf.state.currentPreset = presetKey;
                    updateCTAState(input, ctaBtn);
                }
            });
        });

        // Input text changes
        input.addEventListener('input', () => {
            chips.forEach(c => c.classList.remove('selected'));
            window.WhatIf.state.currentPreset = null;
            updateCTAState(input, ctaBtn);
        });

        // Enter key in input
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && input.value.trim().length > 5) {
                e.preventDefault();
                handleCTA(input.value.trim());
            }
        });

        // CTA button click
        ctaBtn.addEventListener('click', () => {
            if (input.value.trim().length > 5) {
                handleCTA(input.value.trim());
            }
        });

        updateCTAState(input, ctaBtn);
    }

    function updateCTAState(input, btn) {
        if (input.value.trim().length > 5) {
            btn.removeAttribute('disabled');
            btn.classList.add('active');
        } else {
            btn.setAttribute('disabled', 'true');
            btn.classList.remove('active');
        }
    }

    function handleCTA(decisionText) {
        window.WhatIf.state.decision = decisionText;
        if (!window.WhatIf.state.currentPreset) {
            for (const [key, text] of Object.entries(PRESETS)) {
                if (decisionText.toLowerCase().includes(key) || text.toLowerCase() === decisionText.toLowerCase()) {
                    window.WhatIf.state.currentPreset = key;
                    break;
                }
            }
            if (!window.WhatIf.state.currentPreset) {
                window.WhatIf.state.currentPreset = 'hormuz';
            }
        }
        // Show consent modal before navigating to simulation
        if (window.WhatIf.Consent && window.WhatIf.Consent.show) {
            window.WhatIf.Consent.show(function() {
                window.WhatIf.navigate('analysis');
            });
        } else {
            window.WhatIf.navigate('analysis');
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHome);
    } else {
        initHome();
    }

})();
