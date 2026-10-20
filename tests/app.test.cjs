'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { scenario } = require('./fixtures.cjs');

function load() {
  const c = vm.createContext({ window: {}, console, performance, document: { addEventListener() {}, getElementById() { return null; } } });
  for (const name of ['presets', 'engine', 'compare', 'history']) vm.runInContext(fs.readFileSync(`js/${name}.js`, 'utf8'), c);
  return c;
}
test('custom scenarios retain the actual decision and reset prior run state', () => {
  const { window: { WhatIf: W } } = load();
  W.state.simulationResults = { stale: true }; W.state.sliderValues = { duration: 90 };
  W.Scenarios.start('What if I open a bakery?', 'custom', scenario);
  assert.equal(W.Scenarios.current().title, scenario.title);
  assert.equal(W.Scenarios.current().decision, 'What if I open a bakery?');
  assert.equal(Object.keys(W.state.sliderValues).length, 0);
  assert.equal(W.state.simulationResults, null);
  assert.throws(() => W.Engine.simulate('missing', {}));
});
test('every exposed slider changes simulation outputs; ranges are finite', () => {
  const { window: { WhatIf: W } } = load();
  for (const key of ['hormuz', 'ev', 'fourday', 'carban', 'custom']) {
    W.Scenarios.start('A test decision to explore', key, key === 'custom' ? scenario : null);
    const preset = W.Scenarios.current();
    for (const slider of preset.sliders) {
      const low = W.Engine.simulate(key, { [slider.id]: slider.min });
      const high = W.Engine.simulate(key, { [slider.id]: slider.max });
      assert.notEqual(JSON.stringify(low), JSON.stringify(high), `${key}.${slider.id} has no effect`);
      for (const b of Object.values(high.branches)) {
        for (const score of Object.values(b.rawScores)) assert.ok(Number.isFinite(score) && score >= 0 && score <= 100);
        assert.equal(b.timeSeries.days.length, 91);
        assert.ok(b.timeSeries.fuelPrice.every(Number.isFinite));
      }
    }
  }
});
test('zero priority is respected; all-zero priorities use equal weights', () => {
  const { window: { WhatIf: W } } = load();
  W.Scenarios.start('Open a local bakery?', 'custom', scenario);
  W.state.simulationResults = W.Engine.simulate('custom');
  for (const name of ['updateTable', 'updateVerdict', 'updateDetails']) W.Compare[name] = () => {};
  W.state.priorities = { cost: 100, risk: 0, speed: 0, impact: 0 };
  W.Compare.recalculate();
  assert.equal(W.Compare.lastMaxScore, 90);
  assert.equal(W.Compare.lastWinner, 'A');
  W.state.priorities = { cost: 0, risk: 0, speed: 0, impact: 0 };
  W.Compare.recalculate();
  assert.ok(Object.values(W.Compare.lastScores).every(Number.isFinite));
  assert.equal(W.Compare.lastScores.A, 70);
});
test('history recovers from corrupt storage and restores exact controls and custom model', () => {
  const c = load(); const W = c.window.WhatIf;
  let raw = '{}';
  c.localStorage = { getItem(key) { return key === 'whatif_terminal_history' ? raw : null; }, setItem(key, value) { if (key === 'whatif_terminal_history') raw = value; } };
  assert.equal(W.History.getAll().length, 0);
  raw = 'null'; assert.equal(W.History.getAll().length, 0);
  raw = '{broken'; assert.equal(W.History.getAll().length, 0);
  W.Scenarios.start('What if I open a bakery?', 'custom', scenario);
  W.state.sliderValues = { resources: 75, uncertainty: 25, pace: 60 };
  W.state.priorities = { cost: 100, risk: 0, speed: 0, impact: 0 };
  const record = W.History.record({ presetKey: 'custom', prompt: W.state.decision });
  W.History.record({ presetKey: 'custom', prompt: W.state.decision });
  assert.equal(W.History.getAll().length, 1, 'revisiting must not duplicate a run');
  W.navigate = () => {};
  W.Scenarios.start('A city bans cars downtown', 'carban');
  W.History.reload(record.id);
  assert.equal(W.Scenarios.current().title, scenario.title);
  assert.equal(W.state.sliderValues.resources, 75);
  assert.equal(W.state.priorities.risk, 0);
  c.localStorage.getItem = () => { throw new Error('Storage denied'); };
  assert.doesNotThrow(() => W.History.getSystemId());
  assert.equal(W.History.getAll().length, 1);
});
test('custom payloads reject invalid scores and markup is escaped in HTML sinks', () => {
  const { window: { WhatIf: W } } = load();
  const bad = structuredClone(scenario); bad.branches.A.scores.costScore = Infinity;
  assert.throws(() => W.Scenarios.validateCustom(bad));
  assert.equal(W.Scenarios.escapeHTML('<img src=x onerror="bad()">'), '&lt;img src=x onerror=&quot;bad()&quot;&gt;');
});
test('day zero is a baseline and custom radar agrees with the displayed resilience index', () => {
  const { window: { WhatIf: W } } = load();
  W.Scenarios.start('Respond to an oil disruption', 'hormuz');
  const oil = W.Engine.simulate('hormuz');
  for (const branch of Object.values(oil.branches)) {
    assert.equal(branch.timeSeries.fuelPrice[0], 0);
    assert.equal(branch.timeSeries.fiscalCost[0], 0);
    assert.equal(branch.timeSeries.buffer[0], 90);
  }
  W.Scenarios.start('Open a local bakery?', 'custom', scenario);
  const result = W.Engine.simulate('custom', { uncertainty: 80 });
  for (const branch of Object.values(result.branches)) assert.equal(branch.radar[5], Number(branch.kpis.publicRisk));
});
test('free-text routing never does substring matching or defaults to oil', () => {
  const c = load(); const W = c.window.WhatIf; const listeners = {};
  const input = { value: '', addEventListener(type, callback) { listeners[type] = callback; }, removeAttribute() {}, setAttribute() {}, focus() {} };
  const button = { setAttribute() {}, removeAttribute() {}, classList: { toggle() {} } };
  const form = { addEventListener(type, callback) { listeners.submit = callback; } };
  c.document.readyState = 'complete'; c.document.querySelectorAll = () => [];
  c.document.getElementById = id => id === 'decision-form' ? form : null;
  c.document.querySelector = sel => sel === '#decision-input' ? input : button;
  W.navigate = () => {};
  vm.runInContext(fs.readFileSync('js/home.js', 'utf8'), c);
  for (const text of ['What if our developer team goes remote?', 'What if I open a bakery in Pune?', 'What if we switch to a four-day week?']) {
    input.value = text; listeners.input(); listeners.submit({ preventDefault() {} });
    assert.equal(W.state.currentPreset, 'custom');
    assert.equal(W.state.decision, text);
  }
  const previous = W.state.decision;
  input.value = 'Hi'; listeners.submit({ preventDefault() {} });
  assert.equal(W.state.decision, previous, 'short inputs must not start a run');
});
