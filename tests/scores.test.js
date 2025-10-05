import assert from 'node:assert/strict';
import { clamp, nssToIndex, composite, eligible } from '../js/scores.js';

(async function run(){
  assert.equal(clamp(2), 1);
  assert.equal(clamp(-2), -1);
  assert.equal(nssToIndex(0), 50);
  assert.equal(nssToIndex(1), 100);
  const score = composite({ nss: 0.5, rrs: 0.8, pbi: 0.7 });
  assert.ok(score >= 70 && score <= 100);
  assert.equal(eligible({ composite: 82, rrs: 0.7 }), true);
  assert.equal(eligible({ composite: 79, rrs: 0.7 }), false);
  console.log('scores.test.js ✓');
})().catch((err)=>{
  console.error(err);
  process.exit(1);
});
