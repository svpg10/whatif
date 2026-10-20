'use strict';
const scenario = {
  title: 'Opening a neighborhood bakery', problem: 'Balance runway, demand and capacity.',
  stakeholders: ['Owner', 'Customers'], assumptions: ['Demand has not been measured.', 'No debt is assumed.'],
  branches: Object.fromEntries(['A', 'B', 'C'].map((key, i) => [key, {
    name: ['Home preorder pilot', 'Shared kitchen', 'Retail storefront'][i],
    strategy: ['Test weekend preorders.', 'Rent kitchen time.', 'Lease a small store.'][i],
    benefits: ['Validate local demand'], risks: ['Demand is uncertain'], tradeoffs: ['Capacity versus cost'],
    scores: { costScore: 90 - i * 20, riskScore: 80 - i * 15, speedScore: 60 + i * 10, impactScore: 50 + i * 20 }
  }]))
};
module.exports = { scenario };
