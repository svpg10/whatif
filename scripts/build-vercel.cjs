'use strict';

const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const output = path.resolve(root, 'public');

// Delete only this generated directory, never a computed path outside the project.
if (path.dirname(output) !== root || path.basename(output) !== 'public') throw new Error('Unsafe output directory');
fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });
for (const filename of ['index.html', 'landing.html', 'privacy.html', 'ai-disclaimer.html']) {
  fs.copyFileSync(path.join(root, filename), path.join(output, filename));
}
const extensions = { js: /\.js$/, css: /\.css$/, assets: /\.(?:svg|png|mp3)$/ };
for (const [directory, pattern] of Object.entries(extensions)) {
  fs.mkdirSync(path.join(output, directory));
  for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
    if (entry.isFile() && pattern.test(entry.name)) {
      fs.copyFileSync(path.join(root, directory, entry.name), path.join(output, directory, entry.name));
    }
  }
}
console.log('Built public frontend assets; API functions are deployed separately.');
