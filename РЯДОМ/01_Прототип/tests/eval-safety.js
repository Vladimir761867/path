/* Измерение кризисных правил: сколько тревожных фраз распознано и сколько безобидных дали ложную тревогу.
 *   node tests/eval-safety.js [файл.json]   (по умолчанию safety-eval.json, затем safety-holdout.json, если есть)
 * Цель для публичной версии: 0 пропусков в self и danger на обоих наборах; ложные тревоги — как можно меньше. */
const fs = require('fs'), path = require('path');
const { riskOf } = require('../dist/risk.js');
const files = process.argv[2] ? [process.argv[2]] : ['safety-eval.json', 'safety-holdout.json'].map(f => path.join(__dirname, f)).filter(f => fs.existsSync(f));
let worst = 0;
for (const f of files) {
  const d = JSON.parse(fs.readFileSync(f, 'utf8'));
  console.log('\n== ' + path.basename(f));
  for (const cat of ['self', 'others', 'danger', 'check']) {
    const list = d[cat] || []; const miss = list.filter(t => !riskOf(t));
    console.log(cat.padEnd(7), 'распознано', (list.length - miss.length) + '/' + list.length);
    miss.forEach(t => console.log('   пропуск:', t));
    if (cat === 'self' || cat === 'danger') worst += miss.length;
  }
  const fp = (d.none || []).map(t => [t, riskOf(t)]).filter(x => x[1]);
  console.log('none'.padEnd(7), 'ложных тревог', fp.length + '/' + (d.none || []).length);
  fp.forEach(([t, r]) => console.log('   ложная (' + r + '):', t));
}
process.exit(worst ? 1 : 0);
