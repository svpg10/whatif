/**
 * animations.js - Global Animation Utilities
 */
(function() {
    window.WhatIf = window.WhatIf || {};
    window.WhatIf.Animations = {};

    const EASING = 'cubic-bezier(.2,.8,.2,1)';

    function checkReducedMotion() {
        const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        return mediaQuery && mediaQuery.matches;
    }

    /**
     * Fade element in with translateY
     */
    window.WhatIf.Animations.fadeIn = function(el, duration = 400) {
        return new Promise(resolve => {
            if (!el) return resolve();
            if (checkReducedMotion()) {
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                return resolve();
            }

            el.style.transition = `opacity ${duration}ms ${EASING}, transform ${duration}ms ${EASING}`;
            el.style.opacity = '0';
            el.style.transform = 'translateY(20px)';
            
            // trigger reflow
            void el.offsetWidth;

            el.style.opacity = '1';
            el.style.transform = 'translateY(0)';

            setTimeout(resolve, duration);
        });
    };

    /**
     * Fade element out
     */
    window.WhatIf.Animations.fadeOut = function(el, duration = 300) {
        return new Promise(resolve => {
            if (!el) return resolve();
            if (checkReducedMotion()) {
                el.style.opacity = '0';
                return resolve();
            }

            el.style.transition = `opacity ${duration}ms ease-out`;
            el.style.opacity = '0';

            setTimeout(resolve, duration);
        });
    };

    /**
     * Types text character by character
     */
    window.WhatIf.Animations.typeText = function(el, text, speed = 30) {
        return new Promise(resolve => {
            if (!el) return resolve();
            if (checkReducedMotion()) {
                el.textContent = text;
                return resolve();
            }

            el.textContent = '';
            let i = 0;

            function typeChar() {
                if (i < text.length) {
                    el.textContent += text.charAt(i);
                    i++;
                    setTimeout(typeChar, speed);
                } else {
                    resolve();
                }
            }
            typeChar();
        });
    };

    /**
     * Animates a number from start to end
     */
    window.WhatIf.Animations.countUp = function(el, start, end, duration = 800, decimals = 1) {
        return new Promise(resolve => {
            if (!el) return resolve();
            if (checkReducedMotion()) {
                el.textContent = end.toFixed(decimals);
                return resolve();
            }

            let startTime = null;

            function updateCounter(currentTime) {
                if (!startTime) startTime = currentTime;
                const progress = Math.min((currentTime - startTime) / duration, 1);
                
                // Ease out quad
                const easeProgress = progress * (2 - progress);
                const currentVal = start + (end - start) * easeProgress;
                
                el.textContent = currentVal.toFixed(decimals);

                if (progress < 1) {
                    requestAnimationFrame(updateCounter);
                } else {
                    el.textContent = end.toFixed(decimals);
                    resolve();
                }
            }

            requestAnimationFrame(updateCounter);
        });
    };

    /**
     * Applies animationFn to each element with staggered delay
     */
    window.WhatIf.Animations.stagger = function(elements, animationFn, delay = 80) {
        if (!elements || elements.length === 0) return Promise.resolve([]);
        if (checkReducedMotion()) {
            return Promise.all(Array.from(elements).map(el => animationFn(el, 0))); // passing 0 for duration if needed
        }

        const promises = Array.from(elements).map((el, index) => {
            return new Promise(resolve => {
                setTimeout(() => {
                    animationFn(el).then(resolve);
                }, index * delay);
            });
        });

        return Promise.all(promises);
    };

    /**
     * Adds appropriate box-shadow glow based on color
     */
    window.WhatIf.Animations.addEnergyGlow = function(el, color = 'cyan') {
        if (!el) return;
        
        let shadow = '';
        if (color === 'cyan') shadow = '0 0 18px rgba(56, 225, 255, 0.8)';
        else if (color === 'red' || color === 'gold') shadow = '0 0 20px rgba(230, 36, 41, 0.85)';
        else if (color === 'violet') shadow = '0 0 18px rgba(167, 139, 250, 0.8)';

        if (!checkReducedMotion()) {
            el.style.transition = `box-shadow 0.3s ${EASING}`;
        }
        
        const origShadow = el.style.boxShadow;
        el.style.boxShadow = shadow;

        setTimeout(() => {
            el.style.boxShadow = origShadow;
        }, 1000);
    };

    /**
     * Applies the shake CSS class temporarily
     */
    window.WhatIf.Animations.shakeElement = function(el, duration = 150) {
        if (!el || checkReducedMotion()) return;
        
        el.classList.add('shake');
        setTimeout(() => {
            el.classList.remove('shake');
        }, duration);
    };

})();
