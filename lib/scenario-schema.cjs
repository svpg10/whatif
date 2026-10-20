'use strict';

const string = { type: 'string', minLength: 1, maxLength: 600 };
const list = { type: 'array', minItems: 1, maxItems: 5, items: string };
const score = { type: 'number', minimum: 0, maximum: 100 };
const object = properties => ({ type: 'object', additionalProperties: false,
  properties, required: Object.keys(properties) });
const scores = object({ costScore: score, riskScore: score, speedScore: score, impactScore: score });
const branch = object({ name: { ...string, maxLength: 80 }, strategy: string,
  benefits: list, risks: list, tradeoffs: list, scores });
const schema = object({ title: { ...string, maxLength: 120 }, problem: string,
  stakeholders: list, assumptions: list, branches: object({ A: branch, B: branch, C: branch }) });

// The exact same validator runs in the browser via presets.js and on the server.
const { validateCustom } = require('../js/presets.js');
module.exports = { schema, validateCustom };
