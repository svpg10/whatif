(function(window) {
'use strict';
window.WhatIf = window.WhatIf || {};
window.WhatIf.state = window.WhatIf.state || {
  currentPreset: null,
  sliderValues: {},
  simulationResults: null,
  priorities: { cost: 50, risk: 50, speed: 50, impact: 50 }
};

const W = window.WhatIf;
const KEYS = ['A', 'B', 'C'];
const SCORE_KEYS = ['costScore', 'riskScore', 'speedScore', 'impactScore'];
const plainObject = value => value && typeof value === 'object' && !Array.isArray(value);
function text(value, max = 600) {
  if (typeof value !== 'string' || !value.trim() || value.length > max || /[\x00-\x08\x0b\x0c\x0e-\x1f]/.test(value)) {
    throw new Error('Invalid scenario text');
  }
  return value.trim();
}
function list(value) {
  if (!Array.isArray(value) || value.length < 1 || value.length > 5) throw new Error('Invalid scenario list');
  return value.map(item => text(item));
}
function validateCustom(value) {
  if (!plainObject(value) || !plainObject(value.branches)) throw new Error('Invalid scenario');
  const result = { title: text(value.title, 120), problem: text(value.problem),
    stakeholders: list(value.stakeholders), assumptions: list(value.assumptions), branches: {} };
  for (const key of KEYS) {
    const branch = value.branches[key];
    if (!plainObject(branch) || !plainObject(branch.scores)) throw new Error('Invalid branch');
    const scores = {};
    for (const score of SCORE_KEYS) {
      const n = branch.scores[score];
      if (typeof n !== 'number' || !Number.isFinite(n) || n < 0 || n > 100) throw new Error('Invalid score');
      scores[score] = n;
    }
    result.branches[key] = { name: text(branch.name, 80), strategy: text(branch.strategy), scores,
      benefits: list(branch.benefits), risks: list(branch.risks), tradeoffs: list(branch.tradeoffs) };
  }
  return result;
}
function current() {
  const state = W.state;
  if (state.currentPreset === 'custom') {
    if (!state.customScenario) return null;
    const scenario = validateCustom(state.customScenario);
    return { ...scenario, id: 'custom', decision: state.decision, branches: Object.fromEntries(KEYS.map((key, i) =>
      [key, { ...scenario.branches[key], shape: ['●', '◆', '▲'][i] }])),
      sliders: [
        { id: 'resources', label: 'Resource availability', min: 0, max: 100, step: 5, default: 50, unit: '%' },
        { id: 'uncertainty', label: 'External uncertainty', min: 0, max: 100, step: 5, default: 50, unit: '%' },
        { id: 'pace', label: 'Execution pace', min: 0, max: 100, step: 5, default: 50, unit: '%' }
      ],
      kpiLabels: Object.fromEntries(['Cost efficiency', 'Safety', 'Delivery progress', 'Impact', 'Readiness', 'Resilience'].map((label, i) =>
        [['fuelPrice', 'buffer', 'fiscal', 'inflation', 'gdp', 'publicRisk'][i], { label, unit: '/100' }])),
      radarDimensions: ['Cost', 'Safety', 'Speed', 'Impact', 'Readiness', 'Resilience'] };
  }
  return Object.hasOwn(W.Presets, state.currentPreset) ? W.Presets[state.currentPreset] : null;
}
function values(preset, input = {}) {
  if (!plainObject(input)) input = {};
  const result = {};
  for (const slider of preset.sliders) {
    const value = input[slider.id];
    const n = typeof value === 'number' && Number.isFinite(value) ? value : slider.default;
    result[slider.id] = Math.max(slider.min, Math.min(slider.max,
      slider.min + Math.round((n - slider.min) / slider.step) * slider.step));
  }
  return result;
}
function start(decision, presetKey = null, customScenario = null) {
  if (presetKey !== 'custom' && !Object.hasOwn(W.Presets, presetKey)) throw new Error('Unknown scenario');
  const validatedDecision = text(decision, 2000);
  const validatedScenario = presetKey === 'custom' ? validateCustom(customScenario) : null;
  W.state.decision = validatedDecision;
  W.state.currentPreset = presetKey;
  W.state.customScenario = validatedScenario;
  W.state.sliderValues = {};
  W.state.simulationResults = null;
  W.state.priorities = { cost: 50, risk: 50, speed: 50, impact: 50 };
  W.state.activeBranch = 'A';
  W.state.runId = Date.now().toString(36) + Math.random().toString(36).slice(2);
}
const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
function priorities(input = {}) {
  if (!plainObject(input)) input = {};
  return Object.fromEntries(['cost', 'risk', 'speed', 'impact'].map(key =>
    [key, typeof input[key] === 'number' && Number.isFinite(input[key]) ? Math.max(0, Math.min(100, input[key])) : 50]));
}
W.Scenarios = { validateCustom, current, values, start, escapeHTML, priorities };
if (typeof module !== 'undefined' && module.exports) module.exports = W.Scenarios;

window.WhatIf.Presets = {
  hormuz: {
    id: 'hormuz',
    title: 'The Strait Closes',
    decision: 'India responds to a 30-day oil-chokepoint disruption',
    stakeholders: ['Households paying for fuel and LPG', 'Industry and transport', 'Government finances'],
    problem: 'Keep energy supply steady without breaking the budget or the economy.',
    branches: {
      A: { name: 'Wait & See', shape: '●', strategy: 'Buy on the spot market. Intervene later, if at all.' },
      B: { name: 'Reserve + Reroute', shape: '◆', strategy: 'Release strategic reserves in phases while shifting suppliers.' },
      C: { name: 'Demand Shield', shape: '▲', strategy: 'Cap fuel prices, push conservation, expand public transport.' }
    },
    sliders: [
      { id: 'duration', label: 'Closure duration', min: 7, max: 120, default: 30, unit: 'days', step: 1 },
      { id: 'reserveRate', label: 'Reserve release rate', min: 0, max: 100, default: 50, unit: '%', step: 5 },
      { id: 'altSuppliers', label: 'Alternative supplier share', min: 0, max: 60, default: 15, unit: '%', step: 5 },
      { id: 'priceCap', label: 'Fuel-price cap', min: 0, max: 50, default: 10, unit: '%', step: 5 },
      { id: 'globalSpike', label: 'Global price spike', min: 10, max: 80, default: 30, unit: '%', step: 5 }
    ],
    kpiLabels: {
      fuelPrice: { label: 'Fuel price change', unit: '%', tooltip: 'Retail price movement versus baseline.' },
      buffer: { label: 'Supply buffer', unit: 'days', tooltip: 'Days of demand covered before shortages begin.' },
      fiscal: { label: 'Fiscal cost', unit: '₹ Cr', tooltip: 'Government spending caused by this response.' },
      inflation: { label: 'Inflation impact', unit: '% pts', tooltip: 'Added inflation from energy costs.' },
      gdp: { label: 'GDP impact', unit: '%', tooltip: 'Estimated growth lost in this timeline.' },
      publicRisk: { label: 'Public risk', unit: '/100', tooltip: 'Combined exposure of households and services.' }
    },
    radarDimensions: ['Cost', 'Supply', 'Price stability', 'Fiscal', 'Political', 'Recovery']
  },
  ev: {
    id: 'ev',
    title: '500 EV Charging Stations',
    decision: 'Rollout strategy for 500 new EV charging stations in the city',
    stakeholders: ['EV owners', 'City budget', 'Grid operators', 'Local businesses'],
    problem: 'Maximize EV adoption without overloading the grid or exceeding the budget.',
    branches: {
      A: { name: 'Slow Rollout', shape: '●', strategy: 'Build stations gradually over 5 years based on demand.' },
      B: { name: 'Hub Strategy', shape: '◆', strategy: 'Concentrate stations in 5 mega-hubs across the city.' },
      C: { name: 'Full Coverage', shape: '▲', strategy: 'Ensure at least one station in every neighborhood within 2 years.' }
    },
    sliders: [
      { id: 'stations', label: 'Total stations', min: 100, max: 1000, default: 500, unit: '', step: 50 },
      { id: 'budget', label: 'City budget', min: 10, max: 100, default: 50, unit: 'M', step: 5 },
      { id: 'gridCapacity', label: 'Grid capacity margin', min: 5, max: 50, default: 15, unit: '%', step: 1 },
      { id: 'incentive', label: 'User incentive', min: 0, max: 100, default: 20, unit: '%', step: 5 },
      { id: 'timeline', label: 'Deployment timeline', min: 1, max: 10, default: 3, unit: 'years', step: 1 }
    ],
    kpiLabels: {
      adoption: { label: 'EV Adoption Rate', unit: '%', tooltip: 'Percentage of new vehicles that are EVs.' },
      gridLoad: { label: 'Peak Grid Load', unit: '%', tooltip: 'Maximum load on local grid capacity.' },
      cost: { label: 'Deployment Cost', unit: 'M', tooltip: 'Total cost to the city.' },
      utilization: { label: 'Station Utilization', unit: '%', tooltip: 'Average daily use of charging stations.' },
      roi: { label: 'Economic ROI', unit: '%', tooltip: 'Return on investment for local businesses.' },
      satisfaction: { label: 'Public Satisfaction', unit: '/100', tooltip: 'Overall approval rating of the rollout.' }
    },
    radarDimensions: ['Cost', 'Grid Safety', 'Adoption Speed', 'Accessibility', 'Business Impact', 'Public Approval']
  },
  fourday: {
    id: 'fourday',
    title: '4-Day Work Week',
    decision: 'Implementing a 4-day work week across the organization',
    stakeholders: ['Employees', 'Management', 'Clients/customers', 'HR & Operations'],
    problem: 'Maintain productivity and client satisfaction while reducing work hours.',
    branches: {
      A: { name: 'Pilot Program', shape: '●', strategy: 'Test with one department for 6 months before deciding.' },
      B: { name: 'Compressed Hours', shape: '◆', strategy: 'Work 40 hours over 4 days (10-hour shifts).' },
      C: { name: 'Full Transition', shape: '▲', strategy: 'Move to 32-hour week with no loss in pay for all staff.' }
    },
    sliders: [
      { id: 'teamSize', label: 'Company size', min: 50, max: 5000, default: 500, unit: 'emp', step: 50 },
      { id: 'transitionWeeks', label: 'Transition period', min: 4, max: 52, default: 12, unit: 'wks', step: 4 },
      { id: 'clientCoverage', label: 'Required client coverage', min: 5, max: 7, default: 5, unit: 'days', step: 1 },
      { id: 'salaryImpact', label: 'Salary reduction', min: 0, max: 20, default: 0, unit: '%', step: 5 },
      { id: 'hiringBudget', label: 'New hiring budget', min: 0, max: 50, default: 10, unit: '%', step: 5 }
    ],
    kpiLabels: {
      productivity: { label: 'Productivity', unit: '%', tooltip: 'Output compared to previous baseline.' },
      retention: { label: 'Employee Retention', unit: '%', tooltip: 'Expected annualized retention rate.' },
      clientSat: { label: 'Client Satisfaction', unit: '/100', tooltip: 'Feedback score from clients.' },
      payroll: { label: 'Payroll Cost', unit: '%', tooltip: 'Change in total payroll expenses.' },
      burnout: { label: 'Burnout Rate', unit: '%', tooltip: 'Percentage of employees reporting high stress.' },
      revenue: { label: 'Revenue Impact', unit: '%', tooltip: 'Expected change in company revenue.' }
    },
    radarDimensions: ['Employee Wellbeing', 'Productivity', 'Client Satisfaction', 'Cost Efficiency', 'Talent Attraction', 'Operational Risk']
  },
  carban: {
    id: 'carban',
    title: 'Downtown Car Ban',
    decision: 'Banning private cars from the downtown core',
    stakeholders: ['Commuters', 'Downtown businesses', 'Public transit', 'Emergency services'],
    problem: 'Reduce emissions and congestion without killing downtown commerce.',
    branches: {
      A: { name: 'Weekend Only', shape: '●', strategy: 'Ban cars on Saturdays and Sundays to test the waters.' },
      B: { name: 'Peak Hours Ban', shape: '◆', strategy: 'Ban cars during morning and evening rush hours.' },
      C: { name: 'Full Pedestrian Zone', shape: '▲', strategy: 'Complete ban 24/7 with exceptions only for deliveries/emergency.' }
    },
    sliders: [
      { id: 'zoneRadius', label: 'Ban zone radius', min: 1, max: 10, default: 3, unit: 'km', step: 1 },
      { id: 'transitBudget', label: 'New transit budget', min: 0, max: 500, default: 100, unit: 'M', step: 10 },
      { id: 'exemptions', label: 'Exemption rate', min: 0, max: 50, default: 10, unit: '%', step: 5 },
      { id: 'enforcementLevel', label: 'Enforcement strictness', min: 1, max: 10, default: 7, unit: '/10', step: 1 },
      { id: 'timeline', label: 'Implementation timeline', min: 6, max: 36, default: 12, unit: 'mo', step: 6 }
    ],
    kpiLabels: {
      emissions: { label: 'Emissions Change', unit: '%', tooltip: 'Reduction in downtown air pollution.' },
      footTraffic: { label: 'Retail Foot Traffic', unit: '%', tooltip: 'Change in pedestrian visitors to shops.' },
      commuteTime: { label: 'Avg Commute Time', unit: 'min', tooltip: 'Change in daily commute duration.' },
      transitLoad: { label: 'Transit Overcrowding', unit: '%', tooltip: 'Capacity utilization of public transit.' },
      revenue: { label: 'City Revenue (Fines)', unit: 'M', tooltip: 'Expected revenue from enforcement.' },
      publicApproval: { label: 'Public Approval', unit: '%', tooltip: 'Support for the policy.' }
    },
    radarDimensions: ['Environment', 'Local Business', 'Commuter Ease', 'Public Transit', 'Enforcement Cost', 'Public Support']
  }
};
})(typeof window !== 'undefined' ? window : {});
