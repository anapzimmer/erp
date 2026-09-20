const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const tokens = require('../src/design/tokens.json');
const code = ts.transpileModule(fs.readFileSync(require.resolve('../src/design/companyLogos.ts'), 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const logosModule = { exports: {} };
new Function('module', 'exports', code)(logosModule, logosModule.exports);
const { resolveCompanyLogos } = logosModule.exports;
test('company logos use the correct context, single-logo fallback and official fallback', () => {
  assert.deepEqual(resolveCompanyLogos('light.png', 'dark.png'), { logoLightUrl: 'light.png', logoDarkUrl: 'dark.png' });
  for (const args of [['only.png', null], [null, 'only.png']]) assert.deepEqual(resolveCompanyLogos(...args), { logoLightUrl: 'only.png', logoDarkUrl: 'only.png' });
  assert.equal(resolveCompanyLogos().logoLightUrl, '/glasscode-light.png');
  assert.equal(resolveCompanyLogos().logoDarkUrl, '/glasscode-dark.png');
});
function luminance(hex) {
  const rgb = [1,3,5].map(i => parseInt(hex.slice(i,i+2),16)/255).map(c => c <= .04045 ? c/12.92 : ((c+.055)/1.055)**2.4);
  return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
}
test('text, actions and status tones meet 4.5:1 contrast in both themes', () => {
  for (const mode of ['light','dark']) {
    const palette=tokens[mode];
    const pairs=[['text-primary','surface'],['text-secondary','surface'],['text-secondary','background'],['on-primary','primary'],['on-primary','primary-hover'],['selection-text','selection']];
    for(const state of ['success','warning','danger','info'])pairs.push([state,state+'-soft'],['on-'+state,state]);
    for(const [fg,bg] of pairs){const a=luminance(palette[fg]),b=luminance(palette[bg]),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05);assert.ok(ratio>=4.5,`${mode} ${fg}/${bg}: ${ratio.toFixed(2)}`);}
  }
});
