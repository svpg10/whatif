'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function intro(gsap) {
  const handlers = {}, controls = {};
  const overlay = { style: {}, hidden: false }, app = { inert: false }, navbar = { style: {} };
  const input = { focus() { this.focused = true; } };
  for (const key of ['#intro-enter','#intro-watch']) controls[key] = { addEventListener(name, fn) { handlers[key + name] = fn; }, focus() {} };
  const gate = { style: {}, setAttribute() {}, addEventListener() {}, querySelector: key => controls[key], remove() { this.removed = true; } };
  const elements = { 'intro-overlay': overlay, app, navbar, 'decision-input': input };
  const window = { WhatIf: { navigate(page) { window.destination = page; } }, location: { pathname: '/index.html', hash: '#home' },
    matchMedia: () => ({ matches: false }), dispatchEvent() {} };
  const document = { readyState: 'complete', getElementById: id => id === 'intro-gate' ? gate : elements[id], createElement: () => gate,
    body: { appendChild() {} }, fonts: { ready: new Promise(() => {}) } };
  vm.runInNewContext(fs.readFileSync('js/intro.js','utf8'), { window, document, gsap,
    sessionStorage: { getItem() { throw Error('Storage blocked'); }, setItem() { throw Error('Storage blocked'); } },
    CustomEvent: class {}, setTimeout, Promise });
  return { handlers, overlay, app, navbar, input, gate, window };
}
test('missing animation library and blocked storage cannot trap the app behind the intro', () => {
  const c = intro(undefined);
  assert.equal(c.overlay.style.display, 'none');
  assert.equal(c.app.inert, false);
  assert.equal(c.window.destination, 'home');
  assert.equal(c.window.WhatIf.introPlayed, true);
});
test('direct app entry works immediately while fonts remain pending and storage is unavailable', () => {
  const c = intro({});
  assert.equal(c.app.inert, true);
  c.handlers['#intro-enterclick']({ stopPropagation() {} });
  assert.equal(c.overlay.hidden, true);
  assert.equal(c.app.inert, false);
  assert.equal(c.gate.removed, true);
  assert.equal(c.window.destination, 'home');
  assert.equal(c.input.focused, true);
});
