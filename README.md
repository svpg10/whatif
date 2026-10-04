# WhatIf — Future Decision Simulator

> Don't just imagine the future. **Simulate it before you build it.**

WhatIf is an AI-powered decision simulation platform that lets you explore hypothetical scenarios through structured, rule-based modelling. Submit a question, branch the timeline into three alternate futures, and compare the outcomes.

## Features

- **4 Built-In Scenarios**: The Strait Closes, 500 EV Chargers, The 4-Day Week, No Car Downtown
- **90-Day Simulation Engine**: Deterministic, rule-based models with adjustable variables
- **Multiverse Branching**: 3 alternate timelines per scenario (A / B / C)
- **Priority Sliders**: Weight Cost, Risk, Speed, and Impact — watch rankings flip in real time
- **System Recognition**: Remembers your past simulations on your local terminal
- **Cinematic Intro**: GSAP-powered Marvel-style gate screen with audio
- **Privacy-First**: Consent modal, dedicated Privacy Policy & AI Disclaimer pages

## Live Demo

Visit: [https://svpg10.github.io/whatif/](https://svpg10.github.io/whatif/)

## Tech Stack

- Vanilla HTML / CSS / JavaScript (no frameworks)
- GSAP 3.12 for animations
- Canvas 2D API for charts (no Chart.js)
- SVG for multiverse tree
- `localStorage` for persistent system memory
- `sessionStorage` for consent & intro state

## Getting Started

```bash
# Clone
git clone https://github.com/svpg10/whatif.git
cd whatif

# Serve locally (any static server)
python -m http.server 8000
# or
npx serve .
```

Open `http://localhost:8000` in your browser.

## Project Structure

```
whatif/
├── index.html              # Main SPA
├── privacy.html            # Privacy Policy (separate page)
├── ai-disclaimer.html      # AI Disclaimer (separate page)
├── landing.html            # Standalone landing page
├── assets/
│   ├── logo.png
│   ├── logo.svg
│   └── avengers_endgame.mp3
├── css/
│   ├── styles.css          # Main stylesheet
│   └── legal.css           # Legal pages stylesheet
└── js/
    ├── presets.js           # 4 scenario presets
    ├── engine.js            # Simulation engine
    ├── charts.js            # Canvas line & radar charts
    ├── animations.js        # Reusable animation utilities
    ├── multiverse.js        # SVG multiverse tree
    ├── intro.js             # Cinematic intro sequence
    ├── home.js              # Home page interactions
    ├── analysis.js          # Watcher analysis page
    ├── simulate.js          # Simulation dashboard
    ├── compare.js           # Compare & decide page
    ├── history.js           # System recognition & history
    ├── app.js               # SPA router & global controller
    ├── consent.js           # Pre-simulation consent modal
    ├── demo.js              # Demo mode automation
    └── cursor-dots.js       # Interactive cursor effects
```

## License

All rights reserved. This project is not open source.

---

*Illustrative models, not forecasts.*
