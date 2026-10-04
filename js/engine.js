window.WhatIf = window.WhatIf || {};

window.WhatIf.Engine = {
  simulate(presetId, sliderValues) {
    if (presetId === 'hormuz' || !presetId) {
      return this.simulateHormuz(sliderValues || {});
    } else if (presetId === 'ev') {
      return this.simulateEV(sliderValues || {});
    } else if (presetId === 'fourday') {
      return this.simulateFourDay(sliderValues || {});
    } else if (presetId === 'carban') {
      return this.simulateCarBan(sliderValues || {});
    } else {
      return this.simulateHormuz(sliderValues || {});
    }
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
    const bTimeSeries = this.generateHormuzTimeSeries(days, duration, reserveRate, altSuppliers, globalSpike * 0.5);
    // Branch C: Demand Shield
    const cTimeSeries = this.generateHormuzTimeSeries(days, duration, 0, 0, priceCap, true);

    const calcScores = (series, branch) => {
      let costScore, riskScore, speedScore, impactScore;
      
      if (branch === 'A') {
        costScore = 90; // low direct fiscal cost
        riskScore = 20; // high public risk due to price spike
        speedScore = 60; // market adjustment speed
        impactScore = 30; // heavy burden on public
      } else if (branch === 'B') {
        costScore = 60; // moderate cost
        
        // Critical logic for Branch B failure at duration >= 60
        // Reserves cover: (90 * reserveRate/100) = 45 days at 50%
        const reservesRunOut = duration > 45;
        
        riskScore = reservesRunOut ? 28 : 82; 
        speedScore = reservesRunOut ? 35 : 78;
        impactScore = reservesRunOut ? 38 : 84; 
      } else {
        costScore = 15; // high fiscal cost
        riskScore = 88; // low public risk
        speedScore = 52;
        impactScore = 80;
      }
      return { costScore, riskScore, speedScore, impactScore };
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
            gdp: '-1.2',
            publicRisk: '85'
          },
          timeSeries: aTimeSeries,
          radar: [85, 20, 15, 90, 25, 55],
          narration: [
            `Prices peak sharply at +${(globalSpike * 1.2).toFixed(1)}%, triggering widespread industrial pushback.`,
            `No reserves released; fuel buffers deplete rapidly by day ${Math.min(90, Math.floor(duration * 0.7))}.`,
            `The fiscal burden is minimal, but the economy suffers a -1.2% contraction in growth.`
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
            inflation: `+${(globalSpike * 0.5 * 0.05).toFixed(1)}`,
            gdp: duration > 45 ? '-0.9' : '-0.5',
            publicRisk: bScores.riskScore > 50 ? '28' : '72'
          },
          timeSeries: bTimeSeries,
          radar: duration > 45 ? [55, 30, 45, 60, 40, 50] : [65, 80, 75, 65, 80, 85],
          narration: [
            `Strategic reserves released at ${reserveRate}%, successfully softening the initial shock.`,
            `Prices rise moderately to +${(globalSpike * 0.5).toFixed(1)}% as alternative shipments arrive.`,
            duration > 45
              ? `In this timeline, reserves run dry on day ${reservesLastDay}, leading to supply rationing.`
              : `Strategic reserves comfortably cover the ${duration}-day closure window.`
          ],
          benefits: ['Balanced fiscal expenditure', 'Immediate stabilization of retail fuel prices', 'Protects vital logistics'],
          risks: [
            duration > 45 ? 'Depletes national strategic reserves past the safety threshold' : 'Requires fast diplomatic and naval rerouting',
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
            gdp: '-0.3',
            publicRisk: '15'
          },
          timeSeries: cTimeSeries,
          radar: [25, 85, 90, 15, 92, 75],
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
      // Buffer calculation
      if (day <= duration) {
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
      if (day <= duration) {
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
      if (day <= duration) {
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

  simulateEV(v) {
    const stations = v.stations || 500;
    const budget = v.budget || 50;
    const days = Array.from({ length: 91 }, (_, i) => i);
    
    const genSeries = (growthRate, costRate) => {
      const fuelPrice = days.map(d => parseFloat((d * growthRate).toFixed(1)));
      const buffer = days.map(d => Math.max(10, 100 - d * 0.4));
      const inflation = days.map(d => parseFloat((d * 0.02).toFixed(1)));
      const fiscalCost = days.map(d => Math.round(d * costRate));
      return { days, fuelPrice, buffer, inflation, fiscalCost };
    };

    return {
      branches: {
        A: {
          rawScores: { costScore: 85, riskScore: 70, speedScore: 40, impactScore: 50 },
          kpis: { fuelPrice: '+18.5', buffer: '64', fiscal: `${Math.round(budget * 0.4 * 10)}`, inflation: '+0.4', gdp: '+0.2', publicRisk: '35' },
          timeSeries: genSeries(0.2, budget * 0.1),
          radar: [85, 75, 40, 90, 50, 60],
          narration: ['Slow organic rollout minimizes upfront strain on municipal grid.'],
          benefits: ['Lower financial risk', 'Allows iterative site learning'],
          risks: ['Delays EV adoption goals', 'Public frustration at slow speed'],
          tradeoffs: ['Safety and cost savings prioritized over speed']
        },
        B: {
          rawScores: { costScore: 65, riskScore: 80, speedScore: 75, impactScore: 80 },
          kpis: { fuelPrice: '+38.0', buffer: '78', fiscal: `${Math.round(budget * 0.8 * 10)}`, inflation: '+0.8', gdp: '+0.6', publicRisk: '22' },
          timeSeries: genSeries(0.42, budget * 0.25),
          radar: [70, 85, 75, 65, 80, 85],
          narration: ['Mega-hubs consolidate power infrastructure near major arterials.'],
          benefits: ['High charger reliability', 'Efficient grid interconnection'],
          risks: ['Uneven neighborhood access', 'Potential peak grid queues'],
          tradeoffs: ['Focuses on volume hubs rather than universal coverage']
        },
        C: {
          rawScores: { costScore: 35, riskScore: 60, speedScore: 90, impactScore: 92 },
          kpis: { fuelPrice: '+55.2', buffer: '88', fiscal: `${Math.round(budget * 1.3 * 10)}`, inflation: '+1.4', gdp: '+0.9', publicRisk: '18' },
          timeSeries: genSeries(0.61, budget * 0.45),
          radar: [35, 60, 95, 30, 90, 75],
          narration: ['Rapid full city coverage drives swift consumer adoption.'],
          benefits: ['Universal equity and access', 'Fastest EV adoption spike'],
          risks: ['High civil excavation costs', 'Substation capacity overload risk'],
          tradeoffs: ['Aggressive capital investment to achieve instant leadership']
        }
      }
    };
  },

  simulateFourDay(v) {
    const days = Array.from({ length: 91 }, (_, i) => i);
    const genSeries = (prod, satisfaction) => ({
      days,
      fuelPrice: days.map(d => parseFloat((15 + d * prod).toFixed(1))),
      buffer: days.map(d => Math.max(20, 80 + d * satisfaction)),
      inflation: days.map(d => parseFloat((d * 0.01).toFixed(1))),
      fiscalCost: days.map(d => Math.round(d * 25))
    });

    return {
      branches: {
        A: {
          rawScores: { costScore: 90, riskScore: 75, speedScore: 50, impactScore: 60 },
          kpis: { fuelPrice: '+12.0', buffer: '72', fiscal: '450', inflation: '+0.2', gdp: '+0.1', publicRisk: '25' },
          timeSeries: genSeries(0.12, 0.1),
          radar: [90, 75, 55, 90, 60, 65],
          narration: ['Departmental pilot offers safe benchmark data without company-wide shock.'],
          benefits: ['Controlled low-risk trial', 'Immediate feedback loop'],
          risks: ['Cross-team scheduling friction', 'Prolonged uncertainty'],
          tradeoffs: ['Reduces organizational disruption at the expense of unified culture']
        },
        B: {
          rawScores: { costScore: 70, riskScore: 55, speedScore: 70, impactScore: 65 },
          kpis: { fuelPrice: '+5.5', buffer: '65', fiscal: '820', inflation: '+0.4', gdp: '+0.3', publicRisk: '45' },
          timeSeries: genSeries(0.06, -0.05),
          radar: [70, 50, 70, 70, 65, 60],
          narration: ['Ten-hour days preserve weekly output, but staff report mid-week fatigue.'],
          benefits: ['Maintains 40 client hours', 'No immediate hiring expansion required'],
          risks: ['Employee fatigue on 10-hour days', 'Decreased afternoon productivity'],
          tradeoffs: ['Preserves traditional work volume with altered daily rhythm']
        },
        C: {
          rawScores: { costScore: 50, riskScore: 70, speedScore: 85, impactScore: 95 },
          kpis: { fuelPrice: '+22.4', buffer: '92', fiscal: '1450', inflation: '+0.6', gdp: '+0.7', publicRisk: '12' },
          timeSeries: genSeries(0.24, 0.2),
          radar: [55, 92, 85, 50, 95, 80],
          narration: ['32-hour standard unlocks massive retention and sharp productivity gains.'],
          benefits: ['Dramatic drop in burnout', 'Record employee retention and talent pull'],
          risks: ['Requires tighter meeting hygiene', 'Higher hiring budget for client support'],
          tradeoffs: ['Invests in wage efficiency and output density over total seated hours']
        }
      }
    };
  },

  simulateCarBan(v) {
    const days = Array.from({ length: 91 }, (_, i) => i);
    const genSeries = (emissReduction, footGain) => ({
      days,
      fuelPrice: days.map(d => parseFloat((d * footGain).toFixed(1))),
      buffer: days.map(d => Math.max(10, 100 - d * emissReduction)),
      inflation: days.map(d => parseFloat((d * 0.015).toFixed(1))),
      fiscalCost: days.map(d => Math.round(d * 40))
    });

    return {
      branches: {
        A: {
          rawScores: { costScore: 88, riskScore: 75, speedScore: 60, impactScore: 62 },
          kpis: { fuelPrice: '+14.2', buffer: '78', fiscal: '580', inflation: '+0.1', gdp: '+0.2', publicRisk: '20' },
          timeSeries: genSeries(0.22, 0.15),
          radar: [88, 75, 60, 85, 65, 70],
          narration: ['Weekend pedestrianization boosts cafe and leisure trade with minimal commute disruption.'],
          benefits: ['Instant public weekend adoption', 'Very low enforcement cost'],
          risks: ['Minimal weekday emissions change', 'Does not solve weekday gridlock'],
          tradeoffs: ['Provides lifestyle amenity without reforming primary commute corridors']
        },
        B: {
          rawScores: { costScore: 65, riskScore: 55, speedScore: 70, impactScore: 70 },
          kpis: { fuelPrice: '+6.5', buffer: '62', fiscal: '1200', inflation: '+0.3', gdp: '+0.3', publicRisk: '38' },
          timeSeries: genSeries(0.38, 0.08),
          radar: [65, 60, 70, 65, 68, 65],
          narration: ['Rush hour restrictions ease congestion peaks but create perimeter bottlenecking.'],
          benefits: ['Targeted peak traffic mitigation', 'Encourages public transit shift'],
          risks: ['Spillover traffic into residential rings', 'Confusion on exact ban windows'],
          tradeoffs: ['Targets congestion spikes but complicates enforcement rules']
        },
        C: {
          rawScores: { costScore: 40, riskScore: 80, speedScore: 85, impactScore: 92 },
          kpis: { fuelPrice: '+32.8', buffer: '35', fiscal: '2400', inflation: '+0.5', gdp: '+0.8', publicRisk: '16' },
          timeSeries: genSeries(0.65, 0.35),
          radar: [45, 90, 85, 40, 92, 85],
          narration: ['Full pedestrian zone converts downtown into a vibrant, high-value commercial corridor.'],
          benefits: ['65% drop in street-level emissions', 'Substantial retail and restaurant surge'],
          risks: ['Logistics and freight delivery hurdles', 'Requires major park-and-ride investment'],
          tradeoffs: ['Sacrifices private vehicular access for long-term urban livability']
        }
      }
    };
  }
};
