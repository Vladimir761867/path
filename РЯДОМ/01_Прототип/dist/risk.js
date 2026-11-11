/* Проверка риска в тексте — ОДИН набор правил для страницы и сервера (UMD).
 * Возвращает 'self' | 'others' | 'danger' | 'check' | null.
 *  self    — мысли о самоповреждении или нежелании жить;   others — намерение причинить вред другим;
 *  danger  — человеку сейчас небезопасно (насилие, угрозы); check  — двусмысленно, нужен прямой вопрос.
 * Это правила, а не классификатор: они проверяются набором tests/safety-cases.json и не заменяют экспертное ревью.
 * Любое изменение — только вместе с новыми случаями в тестах. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(); else root.RyadomRisk = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const N = t => ' ' + String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').trim() + ' ';
  // «не хочу жить в этом городе / с родителями / на съёмной» — про место, а не про жизнь
  const LIVE_PLACE = /жить (здесь|тут|там|с |со |в |во |у |на |рядом|по |отдельно|вместе|за |около|возле|близко|далеко)/;
  const IDIOM_DIE = /(умереть|сдохнуть|умру|помру) (от|со) (смех|скук|стыд|усталост|голод|жар|холод|любопытств|радост|счасть|восторг|завист|лен)/;
  // «смысл» в чём-то конкретном (в этом совещании, в споре) — не про жизнь
  const MEANING_THING = /^ ?в (этом|этой|этих|этот|том|той|таком|такой|таких|данном|данной|нашем|наших|подобн|споре|разговор|совещан|встреч|проект|учеб|работ)/;

  /* Другие языки: только явные формулировки (без тонкостей русского набора). Текст сравнивается как есть
   * и без диакритики (fẹ́ → fe, não → nao). Набор проверяется tests/risk-intl.js. */
  const INTL = {
    self: [
      /kill (my ?self|me)\b|suicid|end (my|it all|my own) life|end it all|take my (own )?life|want(ed)? to die|wanna die|wish i (was|were) dead|(don'?t|do not|no longer) want to (live|be alive)|better off dead|hurt(ing)? myself|self[- ]?harm|cut(ting)? myself|no reason to live/,
      /matarme|quitarme la vida|quiero morir(me)?|ganas de morir|no quiero (seguir )?vivir|acabar con mi vida|hacerme dano|autolesi/,
      /me tuer|me suicider|en finir avec (la vie|ma vie)|(je )?veux mourir|envie de mourir|(je )?ne veux plus vivre|me faire du mal|automutil/,
      /suizid|selbstmord|mich umbringen|mich toten|(will|mochte) sterben|sterben will|nicht mehr leben|mir (etwas|was) antun|mich ritzen|selbstverletz/,
      /me matar|tirar (a )?minha (propria )?vida|quero morrer|nao quero (mais )?viver|me machucar|automutila|acabar com (a )?minha vida/,
      /intihar|kendimi oldur|olmek istiyorum|yasamak istemiyorum|can[iı]ma k[iı]y|kendime zarar/,
      /өзімді өлтір|өлгім келеді|өмір сүргім келмейді|суицид|өз-өзіме қол сал|өзіме зиян/,
      /თვითმკვლელ|თავის მოკვლა|თავი მოვიკლა|მინდა მოვკვდე|სიკვდილი მინდა|ცხოვრება აღარ მინდა|სიცოცხლე აღარ მინდა|თავს ზიანი/,
      /انتحار|انتحر|أنتحر|اقتل نفسي|أقتل نفسي|اريد ان اموت|أريد أن أموت|اريد الموت|أريد الموت|لا اريد ان اعيش|لا أريد أن أعيش|اؤذي نفسي|أؤذي نفسي|ايذاء النفس|إيذاء النفس/,
      /自杀|自殺|想死|不想活|结束(自己的)?生命|結束(自己的)?生命|伤害自己|傷害自己|自残|自殘|轻生|輕生/,
      /死にたい|消えたい|生きていたくない|生きたくない|自傷|リスカ|命を絶|自分を傷つけ/,
      /kashe kai ?na|ina (so|son) (in )?mutu|ina son mutuwa|ba na (so|son) (in yi )?rayuwa|kisan kai/,
      /kujiua|nataka kufa|sitaki kuishi|kujidhuru|kujiumiza|nijiue|kujitoa uhai/,
      /pa ara mi|mo fe ku|mo fe ki n ku|n ko fe gbe aye|ko wu mi lati wa laaye|se ara mi lese|para eni/
    ],
    others: [
      /\b(i('m| am)? (going|gonna)|i want|i will) (to )?(kill|hurt|stab|beat) (him|her|them|someone|my )/,
      /voy a matar(lo|la)|quiero matar(lo|la|le)|vou matar (ele|ela)|je vais (le|la) tuer|ich (werde|will) (ihn|sie) (umbringen|toten)/
    ],
    danger: [
      /\b(he|she|they|someone|my (husband|wife|partner|father|mother|dad|mom|boyfriend|girlfriend)) (is |keeps )?(hitting|beating|hurting|choking) me|i('m| am) being (abused|beaten)|not safe at home|locked me (in|up)/,
      /me (pega|golpea|maltrata)|me (frappe|bat) |schlagt mich|misshandelt mich|me (bate|agride)|beni dovuyor|bana siddet uyguluyor/
    ]
  };
  const plain = t => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[’`]/g, "'");
  function riskIntl(text) {
    const a = String(text || '').toLowerCase(), b = plain(text);
    const hit = list => list.some(re => re.test(a) || re.test(b));
    if (hit(INTL.self)) return 'self';
    if (hit(INTL.others)) return 'others';
    if (hit(INTL.danger)) return 'danger';
    return null;
  }

  function riskOf(text) {
    const r = riskRu(text);
    return r || riskIntl(text);
  }
  function riskRu(text) {
    const s = N(text);

    // 1. Явные формулировки о вреде себе / нежелании жить
    if (/ убить себя| убью себя| покончить с собой| покончу с собой| суицид| самоубий| хочу умереть| хочу сдохнуть| хочу чтобы меня не стало| хочу не жить| лучше бы умер| лучше бы меня не было| наложить на себя руки| повеситься| вскрыть вены| вскрою вены| порезать себя| порежу себя| причинить себе вред| навредить себе| нанести себе вред| самоповрежд| выпить все таблетки| выброситься из окна| kill myself| suicid/.test(s) && !IDIOM_DIE.test(s)) return 'self';
    if (/ всем (будет )?лучше без меня| без меня (всем|всеми) (будет )?лучше| лучше без меня всем| не вижу (причин|смысла|поводов) жить| нет (причин|смысла|поводов) жить| незачем жить| не стоит жить| не хочу существовать| не хочу больше жить| не хочу жить |хочу (исчезнуть|пропасть) навсегда| хочу уйти из жизни/.test(s) && !LIVE_PLACE.test(s)) return 'self';

    // 2. Намерение причинить вред другим
    if (/ (хочу|собираюсь|решил|решила|готов|готова) [а-я ]{0,24}(убить|убивать|избить|прибить|задушить|покалечить|придушить)/.test(s) && !/ убить (время|скуку|за )/.test(s)) return 'others';
    if (/ убью (его|ее|их|тебя|него|нее|этого|эту)| придушу | изобью (его|ее|их|тебя)| ударю (его|ее|их|ребенка)| причинить вред (ему|ей|им|ребенку|детям|человеку|людям|другому)/.test(s)) return 'others';

    // 3. Небезопасная обстановка
    if (/ (бьет|бьют|бил|избивает|избивают|избил|избила|ударил|ударила|душит|запер|заперл) (меня|мою|мне)| меня (бьет|бьют|избивают|избивает|душит|запер|заперли|бил|избил)| мне угрожа| угрожает убить| угрожают убить| боюсь за (свою )?жизнь| боюсь (идти|возвращаться) домой| не выпускает меня| (мне|нам) (сейчас )?небезопасно| небезопасно (дома|home)| насили[ея] (дома|в семье)/.test(s)) return 'danger';

    // 4. Двусмысленное — спросить прямо
    if (/ устал жить| устала жить| не хочу просыпаться| не хочу так жить| не хочу жить так| хочу все прекратить| сил жить нет| жить не хочется| зачем я живу| зачем жить | не вижу выхода| выхода нет| нет выхода| хочу чтобы все закончилось| хочу чтобы это закончилось| без меня всем лучше| лучше без меня| хочу исчезнуть| хочется исчезнуть| все бессмысленно| все бессмыслен/.test(s)) return 'check';
    const m = / (не вижу смысла|нет смысла)( .*)?$/.exec(s);
    if (m) { const rest = (m[2] || '').trim(); if (!rest || /^(дальше|ни в чем|ничего|ни в чем нет|во всем|в жизни|совсем|вообще)/.test(rest) || (/^жить/.test(rest))) return /^жить/.test(rest) ? 'self' : 'check'; if (!MEANING_THING.test(' ' + rest)) return null; }
    if (/ не хочу жить без /.test(s)) return 'check';
    return null;
  }
  return { riskOf, riskIntl, N };
});
