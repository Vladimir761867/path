/* Распознавание риска на других языках (dist/risk.js → riskIntl). Запуск: node tests/risk-intl.js */
const { riskOf } = require('../dist/risk.js');
const YES = {
  self: [
    'I want to die', 'i dont want to live anymore', 'thinking about suicide', 'I want to kill myself',
    'quiero morir', 'no quiero vivir', 'je veux mourir', 'je ne veux plus vivre', 'ich will sterben', 'ich denke an Selbstmord',
    'quero morrer', 'não quero mais viver', 'ölmek istiyorum', 'intihar etmeyi düşünüyorum', 'өлгім келеді', 'მინდა მოვკვდე',
    'أريد أن أموت', 'أفكر في الانتحار', '我想死', '我不想活了', '死にたい', '生きていたくない',
    'ina son mutuwa', 'nataka kufa', 'sitaki kuishi', 'mo fẹ́ kú', 'mo fe ku'
  ],
  others: ['I am going to kill him', 'voy a matarlo', 'je vais le tuer', 'ich werde ihn umbringen', 'vou matar ele'],
  danger: ['my husband is hitting me', 'I am not safe at home', 'mi pareja me pega', 'il me frappe tous les jours', 'er schlägt mich']
};
const NO = [
  'I am tired of my job', 'this meeting is killing me slowly', 'I could die of laughter', 'stop', 'estoy cansada',
  'je suis fatigué', 'ich bin müde', 'estou triste', 'çok yorgunum', 'шаршадым', 'დავიღალე', 'أنا متعب', '我很累', '疲れた',
  'na gaji', 'nimechoka', 'ó rẹ̀ mí', 'mo fẹ́ jẹun'
];
let fail = 0;
for (const [kind, list] of Object.entries(YES)) for (const t of list) {
  const r = riskOf(t); const ok = r === kind || (kind !== 'self' && r);
  if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + kind + ' ← ' + t + (ok ? '' : ' (got ' + r + ')'));
}
for (const t of NO) { const r = riskOf(t); if (r) fail++; console.log((r ? 'FAIL ' : 'ok   ') + 'нет риска ← ' + t + (r ? ' (got ' + r + ')' : '')); }
console.log(fail ? 'ошибок: ' + fail : 'всё совпало');
process.exit(fail ? 1 : 0);
