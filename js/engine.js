window.WhatIf = window.WhatIf || {};

window.WhatIf.Engine = {
  simulate(presetId, sliderValues = {}) {
    const W = window.WhatIf;
    const preset = presetId === 'custom' && W.state.currentPreset === 'custom' ? W.Scenarios.current() : Object.hasOwn(W.Presets, presetId) ? W.Presets[presetId] : null;
    if (!preset) throw new Error('Choose a valid scenario before simulating.');
    const values = W.Scenarios.values(preset, sliderValues);
    const result = presetId === 'hormuz' ? this.simulateHormuz(values) : this.simulateDecision(preset, values);
    result.radarDimensions = presetId === 'hormuz' ? preset.radarDimensions : ['Cost', 'Safety', 'Speed', 'Impact', 'Readiness', 'Resilience'];
    result.chartLabel = Object.values(preset.kpiLabels)[0].label;
    return result;
  },

  simulateHormuz(v) {
    const duration = v.duration !== undefined ? Number(v.duration) : 30;
    const reserveRate = v.reserveRate !== undefined ? Number(v.reserveRate) : 50;
    const altSuppliers = v.altSuppliers !== undefined ? Number(v.altSuppliers) : 15;
    const priceCap = v.priceCap !== undefined ? Number(v.priceCap) : 10;
    const globalSpike = v.globalSpike !== undefined ? Number(v.globalSpike) : 30;

    const days = Array.from({ length: 91 }, (_, i) => i);
    
    // Branch A: Wait & See
    const aTimeSeries = this.generateHormuzTimeSeries(days, duration, 0, 0, globalSpike * 1.2);
    // Branch B: Reserve + Reroute
    const bTimeSeries = this.generateHormuzTimeSeries(days, duration, reserveRate, altSuppliers, globalSpike * Math.max(0.15, 1 - reserveRate / 150 - altSuppliers / 100));
    // Branch C: Demand Shield
    const cTimeSeries = this.generateHormuzTimeSeries(days, duration, 0, 0, priceCap, true);

    const calcScores = (series, branch) => {
      // Scores follow the series rather than ignoring the visible controls.
      const costScore = Math.max(0, 100 - series.fiscalCost[90] / 1400);
      let riskScore = Math.max(0, 100 - Math.max(...series.fuelPrice));
      let speedScore = Math.max(0, 100 - duration * 0.5 + (branch === 'B' ? altSuppliers * 0.3 : 0));
      let impactScore = Math.max(0, 100 - Math.max(...series.inflation) * 10 - (90 - Math.min(...series.buffer)) * 0.2);
      if (branch === 'B' && duration > Math.floor(90 * reserveRate / 100)) {
        riskScore *= 0.5; speedScore *= 0.6; impactScore *= 0.6;
      }
      return Object.fromEntries(Object.entries({ costScore, riskScore, speedScore, impactScore }).map(([key, value]) => [key, Math.round(Math.min(100, value))]));
    };

    const aScores = calcScores(aTimeSeries, 'A');
    const bScores = calcScores(bTimeSeries, 'B');
    const cScores = calcScores(cTimeSeries, 'C');

    const reservesLastDay = Math.min(90, Math.floor(90 * (reserveRate / 100)));

    return {
      branches: {
        A: {
          rawScores: aScores,
          kpis: {
            fuelPrice: `+${Math.max(...aTimeSeries.fuelPrice).toFixed(1)}`,
            buffer: `${Math.min(...aTimeSeries.buffer).toFixed(0)}`,
            fiscal: `${Math.round(aTimeSeries.fiscalCost[90])}`,
            inflation: `+${(globalSpike * 1.2 * 0.05).toFixed(1)}`,
            gdp: (-Math.max(...aTimeSeries.inflation) * 0.4).toFixed(1),
            publicRisk: String(100 - aScores.riskScore)
          },
          timeSeries: aTimeSeries,
          radar: [aScores.costScore, aScores.riskScore, aScores.impactScore, aScores.costScore, aScores.riskScore, aScores.speedScore],
          narration: [
            `Prices peak sharply at +${(globalSpike * 1.2).toFixed(1)}%, triggering widespread industrial pushback.`,
            `No reserves released; fuel buffers deplete rapidly by day ${Math.min(90, Math.floor(duration * 0.7))}.`,
            `Fiscal and economic impacts here are simplified illustrations, not measured predictions.`
          ],
          benefits: ['Zero upfront treasury subsidy', 'Natural market-driven conservation'],
          risks: ['Severe inflation spike', 'Public outcry & transport strikes', 'Heavy industrial disruption'],
          tradeoffs: ['Saves government budget today at the cost of broader economic contraction']
        },
        B: {
          rawScores: bScores,
          kpis: {
            fuelPrice: `+${Math.max(...bTimeSeries.fuelPrice).toFixed(1)}`,
            buffer: `${Math.min(...bTimeSeries.buffer).toFixed(0)}`,
            fiscal: `${Math.round(bTimeSeries.fiscalCost[90])}`,
            inflation: `+${Math.max(...bTimeSeries.inflation).toFixed(1)}`,
            gdp: (-Math.max(...bTimeSeries.inflation) * 0.4).toFixed(1),
            publicRisk: String(100 - bScores.riskScore)
          },
          timeSeries: bTimeSeries,
          radar: [bScores.costScore, bScores.riskScore, bScores.impactScore, bScores.costScore, bScores.riskScore, bScores.speedScore],
          narration: [
            `Strategic reserves released at ${reserveRate}%, successfully softening the initial shock.`,
            `In this illustrative model, peak prices rise +${Math.max(...bTimeSeries.fuelPrice).toFixed(1)}% as alternative shipments arrive.`,
            duration > Math.floor(90 * (reserveRate / 100))
              ? `In this timeline, reserves run dry on day ${reservesLastDay}, leading to supply rationing.`
              : `Strategic reserves comfortably cover the ${duration}-day closure window.`
          ],
          benefits: ['Balanced fiscal expenditure', 'Immediate stabilization of retail fuel prices', 'Protects vital logistics'],
          risks: [
            duration > Math.floor(90 * (reserveRate / 100)) ? 'Depletes national strategic reserves past the safety threshold' : 'Requires fast diplomatic and naval rerouting',
            'Logistical friction at alternate ports'
          ],
          tradeoffs: ['Relies heavily on finite national stockpiles to buy diplomatic time']
        },
        C: {
          rawScores: cScores,
          kpis: {
            fuelPrice: `+${priceCap.toFixed(1)}`,
            buffer: `${Math.min(...cTimeSeries.buffer).toFixed(0)}`,
            fiscal: `${Math.round(cTimeSeries.fiscalCost[90])}`,
            inflation: `+${(priceCap * 0.05).toFixed(1)}`,
            gdp: (-Math.max(...cTimeSeries.inflation) * 0.4).toFixed(1),
            publicRisk: String(100 - cScores.riskScore)
          },
          timeSeries: cTimeSeries,
          radar: [cScores.costScore, cScores.riskScore, cScores.impactScore, cScores.costScore, cScores.riskScore, cScores.speedScore],
          narration: [
            `The fuel price cap shields consumers, but the national treasury absorbs ₹${Math.round(cTimeSeries.fiscalCost[90])} Cr in subsidies.`,
            `Consumer fuel inflation remains strictly pegged at +${priceCap}%.`,
            `Public risk is minimized, but fiscal deficit expands significantly.`
          ],
          benefits: ['Complete public price certainty', 'Prevents runaway retail inflation', 'Highest citizen approval'],
          risks: ['Severe fiscal deficit strain', 'Risk of fuel smuggling & cross-border leakage', 'Hard to lift caps once instituted'],
          tradeoffs: ['Transfers the entire market risk onto the sovereign balance sheet']
        }
      }
    };
  },

  generateHormuzTimeSeries(days, duration, reserveRate, altSuppliers, priceImpact, isCapped = false) {
    const fuelPrice = [];
    const buffer = [];
    const inflation = [];
    const fiscalCost = [];
    
    let currentBuffer = 90;
    let currentFiscal = 0;
    const reservesLastDay = Math.floor(90 * (reserveRate / 100));

    days.forEach(day => {
      if (day === 0) {
        fuelPrice.push(0); buffer.push(90); inflation.push(0); fiscalCost.push(0);
        return;
      }
      // Buffer calculation
      if (day > 0 && day <= duration) {
        let drainRate = 1.0;
        if (reserveRate > 0) {
          drainRate = Math.max(0.2, 1.0 - (reserveRate / 100) - (altSuppliers / 100));
          if (day > reservesLastDay && reserveRate > 0) {
            drainRate = 1.1; // Reserves exhausted, panic drain
          }
        }
        if (isCapped) {
          drainRate = 0.75;
        }
        currentBuffer -= drainRate;
      } else {
        // Recovery phase
        currentBuffer = Math.min(90, currentBuffer + 0.6);
      }
      currentBuffer = Math.max(0, currentBuffer);
      buffer.push(parseFloat(currentBuffer.toFixed(1)));

      // Price calculation
      let price = 0;
      if (day > 0 && day <= duration) {
        price = isCapped ? priceImpact : (priceImpact * (0.4 + 0.6 * (day / duration)));
        if (reserveRate > 0 && day > reservesLastDay) {
          price += priceImpact * 0.7; // Late spike when reserves deplete
        }
      } else {
        const recoveryProgress = Math.min(1, (day - duration) / 30);
        price = priceImpact * Math.max(0, 1 - recoveryProgress);
      }
      fuelPrice.push(parseFloat(price.toFixed(1)));

      // Inflation calculation
      inflation.push(parseFloat((price * 0.05).toFixed(2)));

      // Cumulative Fiscal Cost
      if (day > 0 && day <= duration) {
        if (isCapped) {
          currentFiscal += 1400; // Heavy daily subsidy
        } else if (reserveRate > 0) {
          currentFiscal += 220; // Rerouting & drawdown operations
        } else {
          currentFiscal += 15; // Administrative monitoring
        }
      }
      fiscalCost.push(Math.round(currentFiscal));
    });

    return { days, fuelPrice, buffer, inflation, fiscalCost };
  },

  // These are explicit teaching heuristics, not calibrated empirical forecasts.
  // Every control changes an outcome; values are clamped at the model boundary.
  simulateDecision(preset, v) {
    const clamp = n => Math.max(0, Math.min(100, n));
    const keys = ['A', 'B', 'C'];
    const days = Array.from({ length: 91 }, (_, i) => i);
    const branches = {};
    keys.forEach((key, index) => {
      const b = preset.branches[key];
      const intensity = [0.45, 0.75, 1][index];
      let metrics, scores;
      if (preset.id === 'ev') {
        const coverage = v.stations / 500;
        const spend = v.stations * 0.08 * intensity;
        const pressure = coverage * intensity * 35 / v.gridCapacity;
        const adoption = clamp((12 + v.incentive * 0.3) * intensity * coverage / Math.sqrt(v.timeline));
        const utilization = clamp(45 + adoption * 0.5 - coverage * 5);
        const safety = clamp(100 - pressure * 18);
        const cost = clamp(100 - spend / v.budget * 40);
        const speed = clamp(100 - v.timeline * 7 + intensity * 10);
        const satisfaction = clamp(adoption + safety * 0.45);
        metrics = [adoption, clamp(55 + pressure * 20), spend, utilization, adoption * 0.8 - spend * 0.1, satisfaction];
        scores = [cost, safety, speed, satisfaction];
      } else if (preset.id === 'fourday') {
        const scale = Math.log10(v.teamSize / 50 + 1);
        const preparation = Math.min(25, v.transitionWeeks * 0.5);
        const coveragePenalty = (v.clientCoverage - 5) * 12;
        const burnout = clamp(35 + [0, 20, -18][index] + scale * 5 - preparation * 0.4 - v.hiringBudget * 0.2);
        const retention = clamp(85 + intensity * 10 - v.salaryImpact * 0.8 - burnout * 0.12);
        const clientSat = clamp(90 - coveragePenalty * intensity - scale * 4 + v.hiringBudget * 0.4 + preparation * 0.2);
        const productivity = 100 + preparation * 0.3 + v.hiringBudget * 0.15 - burnout * 0.15 - coveragePenalty * 0.2;
        const payroll = v.hiringBudget * intensity - v.salaryImpact;
        metrics = [productivity, retention, clientSat, payroll, burnout, (productivity - 100) * 0.6 + (clientSat - 80) * 0.2 - payroll * 0.3];
        scores = [clamp(85 - payroll), clamp((100 - burnout + clientSat) / 2), clamp(100 - v.transitionWeeks + intensity * 10), clamp((retention + clientSat + productivity) / 3)];
      } else if (preset.id === 'carban') {
        const coverage = v.zoneRadius * intensity * (1 - v.exemptions / 100);
        const enforcement = v.enforcementLevel / 10;
        const transit = v.transitBudget / 10;
        const reduction = Math.min(95, coverage * enforcement * 12);
        const crowding = clamp(45 + coverage * 10 - transit * 0.8);
        const footfall = coverage * 7 - crowding * 0.1 + transit * 0.1;
        const commute = coverage * 2 - transit * 0.2;
        const approval = clamp(60 + reduction * 0.3 + footfall * 0.3 - crowding * 0.3 + v.timeline * 0.2);
        metrics = [-reduction, footfall, commute, crowding, coverage * enforcement * 5, approval];
        scores = [clamp(95 - v.transitBudget / 10 - v.enforcementLevel * intensity), clamp(100 - crowding), clamp(100 - v.timeline * 1.8 + enforcement * 10), approval];
      } else if (preset.id === 'custom') {
        const base = b.scores;
        const resources = (v.resources - 50) / 50;
        const uncertainty = (v.uncertainty - 50) / 50;
        const pace = (v.pace - 50) / 50;
        scores = [clamp(base.costScore + resources * 12 - pace * 8 * intensity),
          clamp(base.riskScore - uncertainty * 20 - pace * 8 * intensity),
          clamp(base.speedScore + pace * 20 + resources * 8),
          clamp(base.impactScore + resources * 15 - uncertainty * 10)];
        metrics = [...scores, clamp((scores[1] + scores[2]) / 2), clamp(60 - uncertainty * 20)];
      } else { throw new Error('Unknown scenario.'); }
      const rounded = metrics.map(n => Number(n.toFixed(1)));
      const rawScores = Object.fromEntries(['costScore', 'riskScore', 'speedScore', 'impactScore'].map((name, i) => [name, Math.round(scores[i])]));
      const baseline = preset.id === 'fourday' ? 100 : 0;
      branches[key] = {
        rawScores,
        kpis: Object.fromEntries(['fuelPrice', 'buffer', 'fiscal', 'inflation', 'gdp', 'publicRisk'].map((name, i) => [name, String(rounded[i])])),
        timeSeries: { days, fuelPrice: days.map(day => Number((baseline + (rounded[0] - baseline) * day / 90).toFixed(1))) },
        radar: [...scores.map(clamp), clamp((scores[1] + scores[2]) / 2), preset.id === 'custom' ? rounded[5] : clamp((scores[0] + scores[3]) / 2)],
        narration: [`${b.strategy} These values are illustrative model outputs, not forecasts.`],
        benefits: b.benefits || [`${b.name} provides ${Math.round(scores[3])}/100 illustrative impact under these assumptions.`],
        risks: b.risks || [`Execution and resource constraints affect ${b.name.toLowerCase()}; safety score is ${Math.round(scores[1])}/100.`],
        tradeoffs: b.tradeoffs || [`Cost efficiency ${Math.round(scores[0])}/100 versus delivery speed ${Math.round(scores[2])}/100.`]
      };
    });
    return { branches };
  }
};
