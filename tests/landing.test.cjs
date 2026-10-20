'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const crypto = require('node:crypto');
const protectedFiles = {
  "landing.html": "a31f4358fa045b6d247215750c5bf7c70644d107cffa56ad684b82eaacf89cf5",
  "css/styles.css": "ca6d7fc60bfaa1e98660b77991fbe3f78945d3ce45e9c1b222c6033ae2a1a988",
  "js/animations.js": "b29a8c4347289320ff3eae5c5569490065ec8080fcc65c23eba38e13c7180fe2",
  "js/cursor-dots.js": "eebfb926688f0351252d4997c8a73afafb8dd85c93c8a21be158a4220f70bb98",
  "assets/logo.png": "3a07d633277ad9be79fd3ed881af187f96b470a8260e7abc5a81ae0af2fa9a08",
  "assets/logo.svg": "c02f1bf8f3d01296e17751d162e83d1c7d3e9548848640338a5d323c755a8ec9",
  "assets/eye.svg": "f74801b6d44e2eed820ef4b8c817f6a99ba730ef2298119e916f522a22c1b0da",
  "assets/avengers_endgame.mp3": "73f60bd2183b8113cc60447e17beebf51ed77c98ae4cca84ef70a0c7df005675"
};
test('original cinematic styles, standalone landing shell and visual/audio assets remain unchanged', () => {
  for (const [name, hash] of Object.entries(protectedFiles)) {
    let content = fs.readFileSync(name);
    if (/\.(html|css|js|svg)$/.test(name)) content = Buffer.from(content.toString('utf8').replace(/\r\n/g, '\n'));
    assert.equal(crypto.createHash('sha256').update(content).digest('hex'), hash, name);
  }
});

test('semiconductor copy and gate changes preserve the complete card rendering and cinematic timeline', () => {
  const source = fs.readFileSync('js/intro.js', 'utf8').replace(/\r\n/g, '\n');
  const printing = source.slice(source.indexOf('  function buildDOM()'), source.indexOf('  function finishIntro()'));
  assert.equal(crypto.createHash('sha256').update(printing).digest('hex'), fs.readFileSync('tests/intro-printing.sha256', 'utf8').trim());
});
