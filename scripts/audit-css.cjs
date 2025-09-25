// Naive CSS usage auditor: scans index.html + js files for class names and reports selectors in <style> not referenced.
// Using CommonJS (.cjs) so it runs inside a "type": "module" package.
const fs = require('fs');

const html = fs.readFileSync('index.html', 'utf8');
const styleBlock = html.match(/<style[\s\S]*?<\/style>/i)?.[0] || '';

// Collect class selectors in style block (single-class simple selectors only)
const selectorRegex = /\.(?:[a-zA-Z0-9_-]+)/g;
const defined = new Set();
let m;
while ((m = selectorRegex.exec(styleBlock))) {
  defined.add(m[0].slice(1));
}

// Gather code text for usage search
let code = html;
if (fs.existsSync('js')) {
  for (const f of fs.readdirSync('js')) {
    if (f.endsWith('.js')) code += '\n' + fs.readFileSync('js/' + f, 'utf8');
  }
}

const unused = [];
for (const cls of defined) {
  // Simple search: class attribute occurrence OR JS string with .class
  const re = new RegExp('(?:class="[^"]*\\b' + cls + '\\b|\\.' + cls + '\\b)');
  if (!re.test(code)) unused.push(cls);
}

function run() {
  console.log('Total defined classes:', defined.size);
  console.log('Possibly unused classes:', unused.length);
  console.log(unused.sort().join('\n'));
}
if (require.main === module) run();
module.exports = { run };
