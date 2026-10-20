'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

test('each box owns a background glow; moving between boxes and leaving clears the previous light', () => {
  const frames = [], timers = [], events = {};
  const camel = name => name.startsWith('--') ? name : name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  const style = values => Object.assign({
    getPropertyValue(name) { return this[camel(name)] || ''; },
    getPropertyPriority() { return ''; },
    setProperty(name, value) { this[camel(name)] = value; },
    removeProperty(name) { delete this[camel(name)]; }
  }, values);
  const canvas = { style: style({ zIndex: '50', mixBlendMode: 'screen' }) };
  const classes = new Set();
  const card = { style: style({}), classList: { contains: value => classes.has(value), add: value => classes.add(value) },
    matches: () => false, children: [], appendChild(child) { this.children.push(child); }, closest: () => home,
    parentElement: { closest: () => null },
    getBoundingClientRect: () => ({ left: 20, top: 50, right: 140, bottom: 130, width: 120, height: 80 }) };
  const heroClasses = new Set();
  const hero = { ...card, style: style({}), children: [],
    classList: { contains: value => heroClasses.has(value), add: value => heroClasses.add(value) } };
  const home = { id: 'page-home', querySelectorAll: () => [card, hero] };
  const window = { WhatIf: {}, addEventListener: (name, fn) => { events[name] = fn; } };
  const document = { body: { dataset: {} }, hidden: false, addEventListener() {},
    querySelectorAll: () => [],
    createElement: () => ({ setAttribute(name, value) { this[name] = value; } }),
    getElementById: id => id === 'nexus-cursor-canvas' ? canvas : id === 'page-home' ? home : null,
    querySelector: selector => selector === '.page.active' ? home : selector === '#page-home .home-introduction' ? hero : null };
  const context = vm.createContext({ window, document, innerWidth: 320, innerHeight: 640,
    CSS: { supports: () => true }, matchMedia: () => ({ matches: false, addEventListener() {} }),
    getComputedStyle: () => ({ position: 'static', backgroundColor: 'rgba(17, 18, 25, 0.6)' }),
    ResizeObserver: class { observe() {} disconnect() {} }, MutationObserver: class { observe() {} },
    requestAnimationFrame: fn => { frames.push(fn); return frames.length; },
    setTimeout: fn => { timers.push(fn); return timers.length; }, clearTimeout() {}, encodeURIComponent });
  vm.runInContext(fs.readFileSync('js/app-ui.js', 'utf8'), context);
  timers.splice(0).forEach(fn => fn()); frames.splice(0).forEach(fn => fn());
  assert.equal(document.body.dataset.uiPage, 'home');
  assert.equal(canvas.style.zIndex, '0', 'home must not restore the above-card glow layer');
  assert.ok(classes.has('ui-glow-surface'));
  assert.ok(classes.has('ui-local-glow'));
  assert.equal(card.children.length, 1);
  assert.equal(card.children[0]['aria-hidden'], 'true');
  assert.equal(card.style.getPropertyValue('--ui-glow-backing'), 'rgb(17, 18, 25)');
  assert.equal(canvas.style.opacity, '0');
  events.mousemove({ target: { closest: () => null } });
  frames.splice(0).forEach(fn => fn());
  assert.equal(canvas.style.opacity, '0.45', 'background gaps retain the effect');
  const svg = decodeURIComponent(canvas.style.maskImage.slice(canvas.style.maskImage.indexOf(',') + 1, -2));
  assert.match(svg, /x="14" y="44" width="132" height="92" fill="black"/);
  events.mousemove({ clientX: 80, clientY: 90, target: { closest: () => card } });
  assert.equal(canvas.style.opacity, '0', 'hide immediately, before another animation frame');
  assert.equal(card.style.getPropertyValue('--box-glow-opacity'), '1');
  events.mousemove({ clientX: 80, clientY: 90, target: { closest: () => hero } });
  frames.splice(0).forEach(fn => fn());
  assert.equal(card.style.getPropertyValue('--box-glow-opacity'), '', 'the previous box stops glowing');
  assert.equal(card.children.length, 1, 'refreshing a mask must not duplicate light layers');
  assert.equal(hero.style.getPropertyValue('--box-glow-opacity'), '1', 'the requested hero box has its own light');
  assert.equal(hero.style.getPropertyValue('--box-glow-x'), '60px');
  assert.equal(hero.style.getPropertyValue('--box-glow-y'), '40px');
  assert.equal(canvas.style.opacity, '0', 'global light stays off so the hero effect cannot cross into other cards');
  events.mousemove({ clientX: 50, clientY: 75, target: { closest: () => card } });
  assert.equal(hero.style.getPropertyValue('--box-glow-opacity'), '', 'leaving the hero turns its light off');
  assert.equal(card.style.getPropertyValue('--box-glow-opacity'), '1');
  events.mousemove({ target: { closest: () => null } });
  assert.equal(card.style.getPropertyValue('--box-glow-opacity'), '', 'leaving all boxes clears the local light');
  events.mousemove({ clientX: 60, clientY: 85, target: { closest: () => card } });
  events.blur();
  assert.equal(card.style.getPropertyValue('--box-glow-opacity'), '', 'switching away clears the glow');
});
