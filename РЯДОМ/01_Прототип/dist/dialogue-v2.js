/* Диалог v2 — «Рядом».
 *
 * Что изменилось по сравнению с воронкой «настроение → причина → шкала → практика»:
 *  1. Разговор начинается со свободного текста; кнопки — только подсказки.
 *  2. Ответ строится из сказанного: бот называет конкретную деталь и осторожно
 *     предполагает чувство («Похоже… Я правильно понимаю?»), человек может поправить.
 *  3. Сначала выясняем, что нужно (выговориться / разобраться / шаг / отдых /
 *     подготовить разговор), и только потом предлагаем практику.
 *  4. Можно отказаться от советов — бот это запоминает на весь разговор.
 *  5. Практики ранжируются по теме, чувству и личной истории («помогло / стало хуже»).
 *  6. Безопасность — отдельный слой: явные формулировки, косвенные («не вижу смысла»)
 *     через прямой вопрос, угроза другим, небезопасная обстановка. Без ложных
 *     срабатываний на «не хочу жить с родителями».
 *  7. Нейтральные формулировки: бот не говорит о себе в прошедшем времени.
 *  8. В дневник отметка попадает только по согласию, в конце разговора.
 *
 * ВАЖНО: это правила на клиенте, а не языковая модель. Они аккуратнее прежней воронки,
 * но не заменяют серверный ИИ-диалог и экспертное ревью (см. 02_Документация/03).
 * Все публичные места, где позже подключается модель, помечены «MODEL-HOOK».
 */
(function () {
  'use strict';

  // Номера служб заполняет владелец продукта после проверки для своей страны.
  const SAFETY_LINES = [
    'Экстренный номер: 112 (Россия и страны ЕС). В других странах — местный экстренный номер.'
  ];

  const MOOD_LABEL = { good: 'Хорошо', okay: 'Нормально', anxious: 'Тревожно', angry: 'Злюсь', hard: 'Тяжело' };

  /* ---------- нормализация ---------- */
  // Пробелы по краям и между словами позволяют писать «начало слова» как ' тревож'.
  const N = t => ' ' + String(t || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9]+/g, ' ').trim() + ' ';
  const clip = (t, n = 95) => {
    t = String(t).replace(/\s+/g, ' ').trim().replace(/[.!?…]+$/, '');
    if (t.length <= n) return t;
    const cut = t.slice(0, n);
    return cut.slice(0, Math.max(cut.lastIndexOf(' '), 40)) + '…';
  };
  const lowerFirst = t => t.charAt(0).toLowerCase() + t.slice(1);

  /* ---------- лексикон ---------- */
  const EMO = [
    { k: 'fear', nom: 'тревога', gen: 'тревоги', mood: 'anxious', topic: 'anxiety', re: / тревож| тревог| страшн| страх| боюсь| бояться| пережива| паник| волную| волнуюсь| беспоко| жутк| напряж/ },
    { k: 'anger', nom: 'злость', gen: 'злости', mood: 'angry', topic: 'anger', re: / злюсь| злость| злой| злая| бесит| бесят| раздража| ярост| взбесил| достал| достала| гнев| возмущ/ },
    { k: 'hurt', nom: 'обида', gen: 'обиды', mood: 'hard', topic: 'sadness', re: / обид| задел| задело| унизил| унижен| оскорбил| несправедлив| больно / },
    { k: 'sad', nom: 'грусть', gen: 'грусти', mood: 'hard', topic: 'sadness', re: / груст| тоскл| тоск | плачу| плакать| слез| депресс| подавлен| пусто| безнадежн/ },
    { k: 'lonely', nom: 'одиночество', gen: 'одиночества', mood: 'hard', topic: 'sadness', re: / одинок| никому не нужн| некому | никто не пишет| никто не звонит| никто не понимает/ },
    { k: 'tired', nom: 'усталость', gen: 'усталости', mood: 'hard', topic: 'energy', re: / устал| нет сил| без сил| вымотал| выгор| выжат| измотан| не могу больше| сил нет/ },
    { k: 'shame', nom: 'стыд и вина', gen: 'стыда и вины', mood: 'hard', topic: 'sadness', re: / стыд| виноват| вину | вина | облажал| накосячил| зря сказал| зря сделал/ },
    { k: 'lost', nom: 'растерянность', gen: 'растерянности', mood: 'okay', topic: 'focus', re: / растерян| запутал| не знаю что (теперь |мне |дальше |с этим |с ним |с ней |с этим всем )?делать| не знаю как быть| не знаю как поступить| не понимаю что делать| не знаю как/ },
    { k: 'bored', nom: 'скука', gen: 'скуки', mood: 'okay', topic: 'focus', re: / скучно | скука | нечем заняться| не знаю чем заняться| все надоело | надоело все / },
    { k: 'good', gen: '', mood: 'good', topic: 'calm', re: / хорошо | отлично | рад | рада | рады | счастлив| доволен| довольна| получилось| горжусь| классно| здорово/ }
  ];
  const NEG_GOOD = / не (очень )?(хорошо|отлично|весело|радостно)| нехорошо| не в порядке| не нормально| совсем плохо| плохо | тяжело | тяжко | паршиво | хреново | муторно | погано | плохой день| тяжелый день| ужасный день| день не задался| паршивый день| отвратительный день| не мой день /;

  const THEMES = [
    { k: 'boss', topic: 'work', label: 'работой и начальником', re: / началь| руководител| шеф | шефа | босс| начальств/ },
    { k: 'work', topic: 'work', label: 'работой', re: / работ| коллег| проект| отчет| дедлайн| офис| заказчик| клиент| совещан| увольн| уволил| уволен| сократил| собеседован| задач[аиуе] / },
    { k: 'family', topic: 'relations', label: 'семьёй', re: / мам[аыуе] | мамой | мамы | пап[аыуе] | папой | родител| сестр| брат | брата | бабушк| дедушк| свекр| тещ| семь[яеюи] / },
    { k: 'partner', topic: 'relations', label: 'отношениями', re: / муж | мужа | мужем | жена | жену | женой | парень | парня | парнем | девушк| партнер| отношени| бывш| развод| расстал| свидани/ },
    { k: 'friend', topic: 'relations', label: 'друзьями', re: / друг | друга | другу | другом | друзь| подруг| поссор| поругал| ссор/ },
    { k: 'kids', topic: 'stress', label: 'детьми', re: / ребен| ребенк| дети | детей | сын | сына | дочь | дочк/ },
    { k: 'sleep', topic: 'sleep', label: 'сном', re: / сон | сна | спать | уснуть| не сплю| бессонн| просыпа| засыпа/ },
    { k: 'money', topic: 'stress', label: 'деньгами', re: / деньг| долг| кредит| зарплат| ипотек| платит| аренд/ },
    { k: 'health', topic: 'stress', label: 'здоровьем', re: / здоровь| болит| болею| врач| анализ| температур| диагноз/ },
    { k: 'study', topic: 'focus', label: 'учёбой', re: / экзамен| сессия| сессии| диплом| учеб| зачет| универс/ },
    { k: 'selfcrit', topic: 'sadness', label: 'самокритикой', re: / ни на что не способ| неудачник| тупой | тупая | ничтожеств| я плохой | я плохая | я бесполезн| ничего не получается| ничего не умею/ }
  ];

  // «Приметы» — конкретные детали, которые стоит назвать вслух.
  const CUES = [
    { re: / орет | орут | кричит | кричат | накричал| накричала| повысил голос| повысили голос| ругает | ругают | ругал | отчитал| отчитала| хамит | хамят | унижает | унижают | давит на меня| наехал| наехали /, say: 'то, что на тебя повысили голос или давят' },
    { re: / не могу отказать| не умею отказывать| сказать нет | не получается отказать| неудобно отказать| как отказать| отказать коллег| отказать начальник| взвалили | навесили | перегружают | перегрузили /, say: 'сложность сказать «нет»' },
    { re: / при всех | при других | при коллегах | публично | перед всеми | при людях | при посторонних /, say: 'то, что это произошло при других людях' },
    { re: / без конкретик| не объяснил| ничего не объяснил| без объяснен| не сказал почему| не сказали почему| не уточнил| без деталей /, say: 'то, что не объяснили, в чём именно дело' },
    { re: / хотя (я )?(сделал|сделала|выполнил|выполнила|успел|успела|старал|вложил|вложила|подготовил|подготовила)/, say: 'то, что сделанное и его оценка не совпали' },
    { re: / контролир| указывает как| диктует| решают за меня| решает за меня| лезут в| лезет в| вмешива| не дают мне/, say: 'то, что другие решают за тебя или вмешиваются' },
    { re: / опять | снова | каждый раз | постоянно | все время | вечно /, say: 'то, что это повторяется', weak: true },
    { re: / не слуша(ют|ет) меня| меня не слуша| меня не слыш| не слышат меня| не слышит меня| игнорир| не замечают меня| не замечает меня| не ценят | не ценит /, say: 'ощущение, что тебя не слышат' },
    { re: / уволили | уволен | уволена | сократили | потерял работу| потеряла работу| остался без работы| осталась без работы/, say: 'потеря работы' },
    { re: / все бросить| бросить все| хочу уехать| хочу сбежать| сбежать от всего| исчезнуть на время| пропасть на время/, say: 'желание всё бросить и уехать' },
    { re: / завтра | завтрашн| послезавтра | на этой неделе | предстоит | скоро /, say: 'ожидание того, что будет впереди' },
    { re: / не знаю что (теперь |мне |дальше |с этим |с ним |с ней )?делать| не знаю как быть| не знаю как поступить| не понимаю что делать| не знаю как /, say: 'неопределённость: непонятно, что делать' },
    { re: / промолч| смолчу | смолчать | проглочу | ничего не скажу | не буду ничего говорить| как всегда стерплю| стерплю /, say: 'желание промолчать, как обычно' },
    { re: / надо решить| нужно решить| выбор | выбирать| выбрать | решение | решить /, say: 'необходимость выбирать' },
    { re: / поссор| поругал| накричал| накричала| обидел| обидела| конфликт/, say: 'недавний конфликт' },
    { re: / бросил | бросила | расстал| ушел от| ушла от| развод/, say: 'расставание' },
    { re: / отказал| отказали| отказ /, say: 'отказ' },
    { re: / не могу уснуть| не сплю | бессонн| просыпаюсь ночью/, say: 'то, что не получается нормально спать' },
    { re: / совсем один | совсем одна | никого рядом | некому /, say: 'ощущение, что рядом никого нет' }
  ];

  const INTENSE = / очень | сильно | невыносим| ужасно | кошмар| не могу больше| накрыло | накрывает | паник| разваливаюсь | трясет | задыхаюсь /;

  /* ---------- безопасность ---------- */
  const NOT_SELF_HARM_LIVE = / не хочу жить (здесь|тут|там|с |в |у |на |рядом|по |без |отдельно|вместе|в одной|за городом|за границей)/;
  const riskOf = t => (window.RyadomRisk ? window.RyadomRisk.riskOf(t) : riskOfLocal(t));
  function riskOfLocal(text) {
    const s = N(text);
    if (/ убить себя| убью себя| покончить с собой| покончу с собой| суицид| самоубий| хочу умереть| хочу сдохнуть| лучше бы умер| лучше бы меня не было| наложить на себя руки| повеситься| вскрыть вены| вскрою вены| порезать себя| порежу себя| причинить себе вред| навредить себе| нанести себе вред| самоповрежд| выпить все таблетки| выброситься из окна| kill myself| suicid/.test(s)) return 'self';
    if (/ не хочу жить | не хочу больше жить| не хочу существовать| устал жить| устала жить| нет смысла жить| незачем жить| не стоит жить/.test(s) && !NOT_SELF_HARM_LIVE.test(s)) return 'self';
    if (/ хочу (его |ее |их )?убить| убью (его|ее|их|тебя)| придушу | ударю (его|ее|их)| хочу (его |ее )?избить| причинить вред (ему|ей|им|ребенку)/.test(s)) return 'others';
    if (/ бьет меня| бьют меня| избивает| избил меня| избила меня| ударил меня| ударила меня| угрожает убить| угрожает мне| боюсь за свою жизнь| боюсь идти домой| запер меня| не выпускает меня| душит меня/.test(s)) return 'danger';
    if (/ не вижу смысла| все бессмысленно| хочу исчезнуть| хочется исчезнуть| хочу чтобы все закончилось| хочу чтобы это закончилось| не хочу просыпаться| без меня всем лучше| лучше без меня| зачем я живу| зачем жить | не вижу выхода| выхода нет| нет выхода| не хочу так жить| не хочу жить так| хочу все прекратить| сил жить нет| жить не хочется/.test(s)) return 'check';
    return null;
  }

  /* ---------- состояние разговора ---------- */
  function fresh() {
    return {
      emo: new Map(), themes: new Set(), cues: [], quotes: [],
      intense: false, need: null, noAdvice: false, noPractice: false,
      listenTurns: 0, corrections: 0, worse: 0, used: new Set(), prep: {}, pendingText: null,
      mood: null, positive: false, pCand: [], know: 0, nudged: false
    };
  }
  let D = fresh();
  const setPhase = p => { checkin.phase = p; };
  const phase = () => checkin.phase;

  /* ---------- понимание текста ---------- */
  function understand(raw, weight = 1) {
    const s = N(raw);
    const found = { emo: [], themes: [], cues: [] };
    D.raw = ((D.raw || '') + s).slice(-1500); D.last = s;
    EMO.forEach(e => {
      if (e.re.test(s)) {
        if (e.k === 'good' && NEG_GOOD.test(s)) { D.emo.set('low', (D.emo.get('low') || 0) + weight); return; }
        D.emo.set(e.k, (D.emo.get(e.k) || 0) + weight); found.emo.push(e.k);
      }
    });
    if (NEG_GOOD.test(s) && !found.emo.length) { D.emo.set('low', (D.emo.get('low') || 0) + weight); found.emo.push('low'); }
    THEMES.forEach(t => { if (t.re.test(s)) { D.themes.add(t.k); found.themes.push(t.k); } });
    CUES.forEach(c => { if (c.re.test(s) && !D.cues.includes(c.say)) { D.cues.push(c.say); found.cues.push(c.say); } });
    if (INTENSE.test(s)) D.intense = true;
    // лучшая «цитата»: клауза, где больше всего значимого
    const clauses = String(raw).split(/[.!?;\n]+/).map(x => x.trim()).filter(x => x.length >= 12);
    let best = null, bestScore = 0;
    clauses.forEach(c => {
      const cs = N(c); let sc = 0;
      EMO.forEach(e => { if (e.re.test(cs)) sc += 2; });
      THEMES.forEach(t => { if (t.re.test(cs)) sc += 2; });
      CUES.forEach(q => { if (q.re.test(cs)) sc += 2; });
      sc += Math.min(c.length, 100) / 100;
      if (sc > bestScore) { bestScore = sc; best = c; }
    });
    if (best) D.quotes.push(clip(best));
    return found;
  }
  function dominant() {
    let top = null, w = 0;
    D.emo.forEach((v, k) => { if (k !== 'good' && v > w) { top = k; w = v; } });
    if (!top && D.emo.get('good')) return 'good';
    return top;
  }
  const emoNom = k => (EMO.find(e => e.k === k) || {}).nom || (k === 'low' ? 'тяжесть' : '');
  const emoGen = k => (EMO.find(e => e.k === k) || {}).gen || (k === 'low' ? 'тяжести' : '');
  function moodOf() {
    if (D.mood) return D.mood;
    const k = dominant();
    const e = EMO.find(x => x.k === k);
    return e ? e.mood : (k === 'low' ? 'hard' : 'okay');
  }
  function themeLabels() { return [...D.themes].map(k => (THEMES.find(t => t.k === k) || {}).label).filter(Boolean); }

  /* ---------- вариативность ---------- */
  function pickFresh(list, key) {
    const free = list.filter((_, i) => !D.used.has(key + i));
    const pool = free.length ? free : list;
    const idx = list.indexOf(pool[Math.floor(Math.random() * pool.length)]);
    D.used.add(key + idx);
    return list[idx];
  }
  const Q = {
    work: ['Что именно было сказано или сделано — так, как запомнилось?', 'Что в этом относится к самой задаче, а что — к тому, как это прозвучало?', 'Что было бы важно получить от этой ситуации: признание, ясность, спокойствие?'],
    relations: ['Чего не хватило в этом разговоре или в этой ситуации?', 'Что для тебя за этим стоит — что в этих отношениях по-настоящему важно?', 'Что было бы важно услышать от этого человека?'],
    sleep: ['Что обычно крутится в голове, когда не получается уснуть?', 'Что помогало раньше — даже совсем чуть-чуть?'],
    tired: ['Откуда идёт усталость: от дел, от людей, от долгого напряжения?', 'Что из ежедневного можно на время отложить или попросить подержать за тебя?'],
    generic: ['Что в этом оказалось самым тяжёлым?', 'Что из всего этого сейчас давит сильнее всего?', 'Если представить чуть более лёгкое продолжение — что в нём иначе?', 'Что из этого зависит от тебя, а что нет?', 'Что уже удавалось сделать с этим, пусть самую малость?']
  };
  function nextQuestion() {
    let pool = [];
    if (D.themes.has('boss') || D.themes.has('work')) pool = pool.concat(Q.work);
    if (D.themes.has('family') || D.themes.has('partner') || D.themes.has('friend')) pool = pool.concat(Q.relations);
    if (D.themes.has('sleep')) pool = pool.concat(Q.sleep);
    if (D.emo.has('tired')) pool = pool.concat(Q.tired);
    const themed = pool.filter((_, i) => !D.used.has('q' + i));
    if (themed.length) return pickFresh(pool, 'q');
    pool = pool.concat(Q.generic);
    return pickFresh(pool, 'q');
  }
  const ACK = ['Спасибо, что рассказываешь.', 'Слышу, что это не мелочь.', 'Хорошо, что это можно проговорить.', 'Понятно, что это непросто.', 'Это важная деталь.'];

  /* ---------- отражение сказанного ---------- */
  function reflection(found, firstTime) {
    let cues = (found && found.cues.length ? found.cues : D.cues);
    const weak = CUES.filter(c => c.weak).map(c => c.say);
    if (cues.some(c => !weak.includes(c))) cues = cues.filter(c => !weak.includes(c));
    cues = cues.slice(0, 2);
    const dom = dominant();
    const gen = dom && dom !== 'good' ? emoGen(dom) : '';
    const quote = D.quotes[D.quotes.length - 1];
    const tk = (found && found.themes && found.themes[0]) || Array.from(D.themes).pop();
    const tTheme = tk ? THEMES.find(t => t.k === tk) : null;
    const onlyWeak = cues.length && cues.every(c => weak.includes(c));
    const withPrep = l => (/^[сз][бвгджзклмнпрстфхцчшщ]/.test(l) ? 'со ' : 'с ') + l;
    let out; D.askEmo = false;
    if (cues.length && !onlyWeak) {
      out = 'Похоже, тут важно: ' + cues.join(', а ещё ') + '.';
      if (gen) out += ' Ещё слышится ' + emoNom(dom) + '.';
    } else if (quote && gen) {
      out = 'Ты пишешь: «' + quote + '». В этом слышится ' + emoNom(dom) + '.';
      if (onlyWeak) out += ' И ' + cues[0] + '.';
    } else if (gen) {
      out = ({ lonely: 'Похоже, сейчас одиноко.', tired: 'Похоже, сил сейчас совсем немного.', fear: 'Похоже, сейчас тревожно.', sad: 'Похоже, сейчас грустно.', anger: 'Похоже, сейчас много злости.', hurt: 'Похоже, это задело.', shame: 'Похоже, это сопровождается чувством вины.', lost: 'Похоже, сейчас трудно понять, что делать.', bored: 'Похоже, сейчас скучно и как-то пусто.', low: 'Похоже, сейчас тяжело.' })[dom] || ('Слышу ' + gen + '.');
      if (onlyWeak) out += ' И ' + cues[0] + '.';
    } else if (tTheme) {
      out = 'Слышу, что это связано ' + withPrep(tTheme.label) + (onlyWeak ? ', а ещё — ' + cues[0] : '') + '.';
      D.askEmo = true;
    } else if (onlyWeak) {
      out = 'Слышу, что ' + cues[0].replace(/^то, что /, '') + '.'; D.askEmo = true;
    } else if (quote) {
      out = 'Мне пока не хватает деталей, чтобы понять, что здесь главное: тревога, грусть, злость, усталость — или что-то другое?';
    } else {
      out = 'Пока мне мало деталей, чтобы понять, что здесь главное. Можно несколькими словами: что случилось или на что это похоже?';
    }
    return out;
  }

  /* ---------- действия ---------- */
  function say(t) { add(t); }
  function greet() {
    const h = history().filter(x => x.mood);
    let memo = '';
    if (h.length) {
      const last = h[h.length - 1];
      const days = Math.round((new Date(todayKey() + 'T12:00:00') - new Date(last.day + 'T12:00:00')) / 864e5);
      if (days >= 0 && days <= 7) memo = ' Последняя отметка в дневнике — «' + (MOOD_LABEL[last.mood] || last.mood).toLowerCase() + '» (' + (days === 0 ? 'сегодня' : days === 1 ? 'вчера' : days + ' дн. назад') + ').';
    }
    say('Привет. Я «Рядом» — цифровой помощник: не человек и не врач, но могу выслушать и помочь выбрать небольшой шаг.' + memo);
    say('Что сейчас происходит? Можно написать своими словами или выбрать подсказку.');
    choices([['Тревожно', 'cmd:mood:fear'], ['Грустно', 'cmd:mood:sad'], ['Злюсь', 'cmd:mood:anger'], ['Нет сил', 'cmd:mood:tired'], ['Всё хорошо', 'cmd:mood:good'], ['Не знаю, как сказать', 'cmd:cant'], ['Куда сегодня сходить?', 'cmd:need:go']]);
    setPhase('open');
  }
  function moodChips() {
    choices([['Тревожно', 'cmd:mood:fear'], ['Грустно', 'cmd:mood:sad'], ['Злюсь', 'cmd:mood:anger'], ['Нет сил', 'cmd:mood:tired'], ['Всё хорошо', 'cmd:mood:good'], ['Не знаю, как сказать', 'cmd:cant'], ['Куда сегодня сходить?', 'cmd:need:go']]);
  }
  const MENU = [['Просто поговорим', 'cmd:need:talk'], ['Небольшой шаг', 'cmd:need:step'], ['Потренировать разговор', 'cmd:need:prepare'], ['Куда сходить или что поесть', 'cmd:need:go']];
  function unclear() {
    if (phase() === 'open2') { D.unclearTwice = true; return cantFlow(); }
    setPhase('open2');
    say(pickFresh(['Хочу понять точнее, но пока не хватает слов. Можно одной-двумя фразами: что произошло или что ты чувствуешь? Или выбрать подсказку ниже.', 'Давай проще. Что ближе всего к тому, что сейчас внутри? Можно выбрать подсказку или написать своими словами.', 'Я здесь и читаю. Если сложно подобрать слова — выбери, что ближе, потом уточним.'], 'unc'));
    moodChips();
  }
  function reset(clearTranscript) {
    if (clearTranscript) { activeDialogueId = null; pendingTranscript = []; }
    D = fresh();
    checkin = { phase: 'open', mood: null, cause: '', need: '', severity: 0, practice: null };
    state.phase = 'v2';
  }

  function safety(kind) {
    setPhase('safety'); D.noPractice = true; D.noAdvice = true;
    const lines = SAFETY_LINES.join('\n');
    if (kind === 'others') {
      say('Похоже, сейчас очень много злости. Если есть риск, что ты можешь навредить другому человеку, остановись и уйди из ситуации: на воздух, в другую комнату, подальше от того, кто рядом. Если опасность реальная и прямо сейчас — позвони по экстренному номеру.\n' + lines);
      choices([['Я вне этой ситуации', 'cmd:safe'], ['Показать текст для близкого', 'cmd:helptext']]);
    } else if (kind === 'danger') {
      say('То, что ты описываешь, звучит небезопасно, и твоя безопасность важнее всего остального. Если опасность рядом прямо сейчас, постарайся уйти в безопасное место и позвони по экстренному номеру.\n' + lines);
      choices([['Мне сейчас небезопасно', 'cmd:unsafe'], ['Показать текст для близкого', 'cmd:helptext'], ['Сейчас я в безопасности', 'cmd:safe']]);
    } else {
      say('Спасибо, что ты об этом говоришь. Твоя безопасность сейчас важнее всего. Если есть риск, что ты можешь причинить себе вред, обратись за срочной помощью прямо сейчас:\n' + lines + '\nЕсли рядом есть человек, можно сказать ему: «Мне сейчас очень тяжело, не хочу оставаться с этим наедине. Побудь рядом и помоги получить помощь». Я — цифровой помощник и не заменяю живого человека.');
      choices([['Показать текст для близкого', 'cmd:helptext'], ['Мне сейчас небезопасно', 'cmd:unsafe'], ['Сейчас я в безопасности', 'cmd:safe']]);
    }
  }
  function askRisk(text) {
    D.pendingText = text; setPhase('riskcheck');
    say('Прежде чем продолжить, хочу спросить прямо, потому что это важно: ты сейчас думаешь о том, чтобы причинить себе вред или не жить?');
    choices([['Да', 'cmd:risk:yes'], ['Не знаю', 'cmd:risk:unsure'], ['Нет, это другое', 'cmd:risk:no']]);
  }

  function confirmStep(found) {
    const r = reflection(found, true);
    if (D.askEmo) {
      D.askEmo = false;
      if (phase() === 'open2') return askNeed();
      setPhase('open2');
      say(r + ' А что здесь сильнее всего?');
      choices([['Тревога', 'cmd:mood:fear'], ['Злость', 'cmd:mood:anger'], ['Обида', 'cmd:mood:hurt'], ['Усталость', 'cmd:mood:tired'], ['Грусть', 'cmd:mood:sad'], ['Что-то другое', 'cmd:need:talk']]);
      return;
    }
    setPhase('confirm');
    say(r + ' Я правильно понимаю?');
    choices([['Да, примерно так', 'cmd:yes'], ['Не совсем', 'cmd:no'], ['Хочу добавить', 'cmd:add']]);
  }

  const QUEST_NAME = { 'boss-feedback': 'разговор с начальником', 'refuse-colleague': 'отказ коллеге', 'mom-boundaries': 'разговор с мамой о границах', 'apology-friend': 'извинение', 'ask-help': 'просьбу о помощи', 'money-talk': 'разговор о деньгах', 'partner-needs': 'разговор о том, что тебе нужно', 'say-no-friend': 'отказ другу' };
  function questFor() {
    return questIn(D.last || '') || questIn(D.raw || '');
  }
  function questIn(r) {
    const th = D.themes;
    if (!r) return null;
    if (/ извин| виноват | виновата | обидел | обидела | подвел| подвела | не пришел | не пришла | забыл | забыла /.test(r) && (th.has('friend') || th.has('partner') || th.has('family') || /обидел|подвел|забыл|извин/.test(r))) return 'apology-friend';
    if (/ деньг| долг| зарплат| тратим| тратит| кредит| оплат/.test(r) && (th.has('partner') || th.has('family') || th.has('friend') || / разговор/.test(r))) return 'money-talk';
    if (/ попросить помощ| попросить о помощи| неловко просить| не умею просить| просить помощ| помощи попросить| помощь попросить/.test(r)) return 'ask-help';
    if (/ отказать| сказать нет| не могу отказать| не умею отказывать| просит выйти| взвалил| навесил| подменить| замен/.test(r)) return th.has('friend') && !th.has('work') ? 'say-no-friend' : 'refuse-colleague';
    if (th.has('family') && (/ границ| лезет | лезут | контролир| решает за| решают за| давит | давят | совет| как (мне )?жить| учит жить| указыва| лучше знает| поругал| поссор| не слуша| не слышит| звонит каждый/.test(r))) return 'mom-boundaries';
    if (th.has('partner') && / не хватает времени| мало времени| не слышит| не слышат| не понимает| хочу сказать| как сказать| поговорить/.test(r)) return 'partner-needs';
    if (th.has('boss') || (th.has('work') && / критик| замечан| обратн| оценк| отчет/.test(r))) return 'boss-feedback';
    if (/ границ /.test(r)) return th.has('family') ? 'mom-boundaries' : 'refuse-colleague';
    return null;
  }
  function offerQuest() {
    const id = questFor(); if (!id || D.noAdvice || D.questOffered === id) return false;
    D.questOffered = id;
    say('Похоже, это про ' + QUEST_NAME[id] + '. Могу предложить потренировать этот разговор на модели или собрать своё первое предложение.');
    choices([['Потренировать разговор', 'cmd:quest:' + id], ['Собрать свою фразу', 'cmd:need:prepare'], ['Продолжу рассказывать', 'cmd:more']]);
    return true;
  }
  function askNeed() {
    setPhase('need');
    const opts = [['Выговориться', 'cmd:need:talk'], ['Разобраться, что делать', 'cmd:need:clarity']];
    if (!D.noPractice && !D.noAdvice) { opts.push(['Небольшой шаг, чтобы стало легче', 'cmd:need:step']); opts.push(['Передохнуть', 'cmd:need:rest']); }
    const convo = D.themes.has('boss') || D.themes.has('family') || D.themes.has('partner') || D.themes.has('friend') || D.themes.has('work');
    if (convo) opts.push(['Подготовить разговор', 'cmd:need:prepare']);
    if (profileIdeas()) opts.push(['Куда сходить или что поесть', 'cmd:need:go']);
    D.needAsked = (D.needAsked || 0) + 1;
    let lead = D.needAsked === 1 ? 'Что сейчас нужнее?' : pickFresh(['Давай выберем направление. С чего удобнее?', 'Можно продолжить рассказ, а можно перейти к шагу. Как тебе сейчас лучше?', 'Подскажи, что сейчас было бы полезнее.'], 'needlead');
    const qid = questFor(); if (qid && !D.noAdvice) opts.splice(Math.min(2, opts.length), 0, ['Потренировать разговор', 'cmd:quest:' + qid]);
    if (D.intense && D.emo.has('fear') && !D.noPractice && D.needAsked === 1) lead = 'Если сейчас слишком накрывает, можно начать с короткого шага на успокоение. Что нужнее?';
    say(lead);
    choices(opts.slice(0, 6));
  }

  function startListen(first) {
    setPhase('listen'); D.need = 'talk';
    say(first || nextQuestion());
  }

  /* --- ранжирование практик по теме, чувству и личной истории --- */
  function rankPractices(need) {
    const topics = new Map();
    const bump = (t, w) => topics.set(t, (topics.get(t) || 0) + w);
    D.emo.forEach((v, k) => { const e = EMO.find(x => x.k === k); if (e && k !== 'good') bump(e.topic, 3 * v); });
    D.themes.forEach(k => { const t = THEMES.find(x => x.k === k); if (t) bump(t.topic, 2); });
    if (need === 'step') { bump('calm', 2); if (D.emo.has('fear')) bump('anxiety', 2); }
    if (need === 'rest') { bump('energy', 6); bump('calm', 4); }
    if (need === 'clarity') bump('focus', 6);
    const hist = history().filter(x => x.practice);
    const score = {};
    hist.forEach(x => { score[x.practice] = (score[x.practice] || 0) + (x.outcome === 'better' ? 2 : x.outcome === 'worse' ? -6 : 0); });
    const dayseed = k => { let h = 0; const s = k + todayKey(); for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return (h % 100) / 100; };
    const list = Object.entries(practices).map(([key, p]) => {
      let sc = (topics.get(p.topic) || 0) + (score[key] || 0) + dayseed(key);
      if (D.intense && D.emo.has('fear') && /^1\s*мин/.test(p.duration || '')) sc += 2;
      if (key === 'flagship' && (D.themes.has('boss') || D.cues.some(c => /при других|конфликт/.test(c)))) sc += 5;
      if (checkin.practice === key) sc -= 3;
      return [key, p, sc];
    }).sort((a, b) => b[2] - a[2]);
    return list.filter(x => x[2] > 0.99).slice(0, 3);
  }
  /* ---------- профиль «Обо мне» ---------- */
  const PR = () => window.RyadomProfile || null;
  const profileOn = () => { const p = PR(); return !!(p && p._get().use); };
  const profileIdeas = () => { const p = PR(); return p ? p.ideas() : null; };
  function collect(text) {
    const p = PR(); if (!p || !profileOn()) return;
    D.pCand = D.pCand || [];
    p.detect(text).forEach(c => { if (!D.pCand.some(x => x.cat === c.cat && x.text === c.text)) D.pCand.push(c); });
    D.pCand = D.pCand.slice(0, 4);
  }
  function nudge() {
    const p = PR(); if (!p || !p.has() || D.nudged) return;
    const h = p.list('help').slice(-2), sp = p.list('spend').slice(-1);
    const bits = h.concat(sp); if (!bits.length) return;
    D.nudged = true;
    say('В «Обо мне» записано, что тебе помогает: ' + bits.join(', ') + '. Если сейчас есть возможность, можно начать с этого.');
  }
  function goFlow() {
    const id = profileIdeas(); setPhase('listen');
    if (!id) {
      D.goAsked = true;
      say('Пока я мало знаю о твоих вкусах и не хочу угадывать. Давай познакомимся: три коротких вопроса, и подсказки станут точнее. Всё записанное видно в «Обо мне» и удаляется.');
      choices([['Познакомиться', 'cmd:know:start'], ['Открыть «Места»', 'cmd:places'], ['Не сейчас', 'cmd:more']]); return;
    }
    const parts = [];
    if (id.food.length) parts.push('поесть — ' + id.food.join(' или '));
    const be = [].concat(id.place, id.spend); if (be.length) parts.push('побыть — ' + be.join(' или '));
    let t = 'Из того, что записано в «Обо мне»: ' + parts.join('; ') + '.';
    if (id.avoid.length) t += ' Лучше без: ' + id.avoid.join(', ') + '.';
    say(t + ' Что-то из этого подходит сегодня, с учётом сил?');
    choices([['Да, подходит', 'cmd:goyes'], ['Хочу другое', 'cmd:know:start'], ['Показать места рядом', 'cmd:places'], ['Пока достаточно', 'cmd:finish']]);
  }
  const KNOW = [['food', 'Что тебе обычно нравится есть, особенно когда непросто? Одно-два блюда или вкуса.'], ['place', 'Где тебе обычно хорошо — какое место или обстановка?'], ['help', 'А что чаще всего помогает, когда тяжело? Любая мелочь.']];
  function knowAsk(i) {
    if (i >= KNOW.length) {
      setPhase('listen');
      say('Спасибо, записано. Всё видно в разделе «Обо мне»: там можно поправить или удалить. Теперь буду учитывать это в подсказках.');
      choices([['Куда сегодня сходить?', 'cmd:need:go'], ['Расскажу, что на душе', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]); return;
    }
    D.know = i; setPhase('know_' + KNOW[i][0]); say(KNOW[i][1]); choices([['Пропустить', 'cmd:know:skip']]);
  }

  function suggestSteps(need) {
    if (D.noPractice) { startListen('Практики сейчас предлагать не буду. ' + nextQuestion()); return; }
    setPhase('suggest');
    nudge();
    const ranked = rankPractices(need);
    const lab = themeLabels();
    const why = lab.length ? 'Судя по тому, что это связано с ' + lab[0] + ', подойдут такие шаги.' : 'Вот несколько небольших шагов.';
    say(why + ' Выбирай только то, что кажется посильным — можно ничего не выбирать.');
    const opts = ranked.map(([k, p]) => [p.title + ' · ' + p.duration, 'practice:' + k]);
    opts.push(['Расскажу ещё', 'cmd:more'], ['Пока достаточно', 'cmd:finish']);
    choices(opts);
  }

  const CAT_SAY = { food: 'про еду', place: 'про места', spend: 'про то, как проводить время', help: 'про то, что помогает', avoid: 'про то, чего лучше избегать', people: 'про людей рядом' };
  function wrapUp() {
    const c = D.pCand || [];
    if (c.length && profileOn()) {
      setPhase('wrap'); const x = c[0];
      say('В разговоре прозвучало ' + (CAT_SAY[x.cat] || '') + ': «' + x.text + '». Запомнить для будущих разговоров? Это можно будет посмотреть и удалить в разделе «Обо мне».');
      choices([['Запомнить', 'cmd:pm:y'], ['Не запоминать', 'cmd:pm:n']]); return;
    }
    wrapMood();
  }
  function wrapMood() {
    setPhase('wrap');
    const m = moodOf();
    say('Спасибо за разговор. Если хочешь, добавлю отметку в дневник — она останется только на этом устройстве. Какое слово ближе к состоянию сейчас?');
    const opts = [];
    const first = [m, ...Object.keys(MOOD_LABEL).filter(x => x !== m)];
    first.slice(0, 4).forEach(k => opts.push([MOOD_LABEL[k], 'cmd:save:' + k]));
    opts.push(['Не сохранять', 'cmd:nosave']);
    choices(opts);
  }
  function saveMood(m) {
    const arr = history(); arr.push({ day: todayKey(), mood: m }); save(arr.slice(-365));
  }
  function endChat(text) {
    setPhase('end');
    say(text);
    choices([['Новый разговор', 'restart']]);
  }

  /* --- подготовка разговора --- */
  function composeDraft(style) {
    const fact = clip(D.prep.fact || '', 160), goal = clip((D.prep.goal || '').replace(/^\s*(чтобы|что бы|мне важно,? чтобы|важно,? чтобы)\s*/i, ''), 160);
    if (style === 'soft') return '«Хочу спокойно поговорить о том, что случилось: ' + lowerFirst(fact) + '. Мне было бы важно, чтобы ' + lowerFirst(goal) + '. Удобно ли обсудить?»';
    if (style === 'firm') return '«Мне нужно обсудить то, что случилось: ' + lowerFirst(fact) + '. Мне важно, чтобы ' + lowerFirst(goal) + '. Давай договоримся о времени».';
    return '«Мне нужно поговорить о том, что случилось: ' + lowerFirst(fact) + '. Мне важно, чтобы ' + lowerFirst(goal) + '. Как ты это видишь?»';
  }

  /* ---------- разбор свободного текста по фазам ---------- */
  function intentOf(raw) {
    const s = N(raw);
    const sl = s.length < 60;
    if (/^ (привет|приветик|здравствуй|здравствуйте|добрый день|добрый вечер|доброе утро|хай|хей|hello|hi|hey|салют|ку) $/.test(s)) return 'hello';
    if (/^ (пока|до свидания|до встречи|всего доброго|споки|спокойной ночи|доброй ночи|бывай|bye|чао) $/.test(s)) return 'bye';
    if (/ ты (врач|психолог|терапевт|психотерапевт|психиатр|специалист|доктор|лечишь)| можешь (меня )?лечить| поставь диагноз| заменишь (психолог|врач|терапевт)/.test(s) && sl) return 'doctor';
    if (/ ты кто | кто ты | что ты такое| ты (человек|бот|робот|настоящ|живой|нейросеть|ии|программа|chatgpt|чат бот)| с кем я говорю| ты реальн/.test(s) && sl) return 'whoami';
    if (/ что ты умеешь| что умеешь| чем (ты )?можешь помочь| что ты можешь| как ты работаешь| как тобой пользоваться| что тут можно| зачем ты нужен| для чего ты/.test(s) && sl) return 'caps';
    if (/^ (помоги|помоги мне|помогите|мне нужна помощь|нужна помощь|помоги пожалуйста) $/.test(s)) return 'helpme';
    if (/ ты меня слышишь| ты здесь | ты тут | ты там | алло | ау /.test(s) && sl) return 'hear';
    if (/ бесишь| бесит ты| ты (тупой|тупая|дурак|глупый|бесполезн|идиот)| тупая программа| отстань| заткнись| иди (ты )?(нах|лесом)/.test(s) && sl) return 'rude';
    if (/ анекдот| пошути| шутк[уи] | расскажи (смешное|историю|сказку|стих)| спой /.test(s) && sl) return 'joke';
    if (/ сколько будет | погод| курс (доллар|евро|валют)| новости | реши (задач|пример)| переведи | напиши (код|реферат|сочинени|программ)| кто президент| столица | рецепт /.test(s) || /\d ?[+*] ?\d/.test(String(raw))) return 'offtopic';
    if (!/[а-яa-z0-9]/i.test(String(raw)) && String(raw).trim().length) return 'emoji';
    if (/ не хочу (про это|об этом|говорить|рассказывать|обсуждать|разговаривать)| не буду (про это|об этом|говорить)/.test(s) && sl) return 'avoid';
    if (/^ (все )?(нормально|норм|ничего|пойдет|так себе|ровно|терпимо|сойдет)( все| вроде)? $/.test(s)) return 'okayish';
    if (/^ (не знаю|хз|затрудняюсь|не уверен|не уверена|без понятия) $/.test(s)) return 'dunno';
    if (/ хватит | закончим | заканчиваем | до свидания | пока пока | на сегодня все /.test(s) && s.length < 80) return 'finish';
    if (/ спасибо /.test(s) && s.length < 40) return D.listenTurns >= 3 || ['suggest', 'followup', 'afterPractice', 'prep_done', 'wrap'].includes(phase()) ? 'finish' : 'thanks';
    if (/ не хочу (практик|упражнени|совет|дыхани)| без совет| без практик| просто послушай| просто выслушай| не надо совет| не нужны совет/.test(s)) return 'noadvice';
    if (/ (что|куда|где) (бы )?(мне )?(поесть|покушать|съесть|пойти|сходить|погулять|выйти|провести время)| куда (бы )?(пойти|сходить|выбраться)| где (бы )?(поесть|посидеть|погулять)| что поесть| хочу (куда нибудь )?выйти| хочется выйти| хочу пообщаться с людьми| куда сегодня /.test(s)) return 'go';
    if (/ что (мне )?делать | посоветуй| подскажи что| дай совет| что посоветуешь/.test(s)) return 'advice';
    if (/ расскажи (что нибудь|что то|о себе)| поболтаем| поговорим о чем нибудь| мне скучно| давай поболтаем/.test(s)) return 'chitchat';
    if (s.trim().split(' ').length <= 2 && /^ (ок|окей|ладно|ага|угу|понятно|ясно|хорошо|ну ок) $/.test(s)) return 'ack';
    if (/ бесполезно| не помогает| не работает| ерунда | глупо /.test(s) && s.length < 90) return 'doubt';
    if (/ не знаю что сказать| не знаю с чего начать| сложно сказать| не могу объяснить| трудно объяснить| не знаю как сказать/.test(s)) return 'cant';
    return null;
  }

  function onText(raw) {
    const p = phase();
    const intent = intentOf(raw);

    if (p === 'riskcheck') {
      if (/^\s*(да|ага|возможно|иногда|наверное|не уверен|не уверена)/.test(String(raw).toLowerCase())) return safety('self');
      if (/^\s*(нет|не думаю|не об этом|другое)/.test(String(raw).toLowerCase())) return afterRiskNo();
      return safety('self');
    }
    if (p === 'safety') {
      say('Я рядом в этом разговоре. Если станет хуже или появится мысль причинить себе вред, лучше сразу обратиться к человеку рядом или по экстренному номеру. Что сейчас происходит?');
      choices([['Сейчас я в безопасности', 'cmd:safe'], ['Мне сейчас небезопасно', 'cmd:unsafe']]);
      return;
    }

    const freeP = !/^(prep_|know|clarity|riskcheck|safety)/.test(p);
    if (freeP && intent === 'hello') { say('Привет. Я здесь. Что сейчас происходит? Можно написать своими словами или выбрать подсказку.'); moodChips(); return; }
    if (freeP && intent === 'bye') { if (D.quotes.length || D.emo.size) return wrapUp(); say('До встречи. Я здесь, когда захочется вернуться.'); return; }
    if (freeP && intent === 'doctor') { say('Нет, я не врач и не психолог: не ставлю диагнозов и не лечу. Я помогаю выговориться, назвать, что происходит, и сделать небольшой шаг. Если тяжёлое состояние держится долго или мешает жить, стоит обратиться к специалисту.'); choices(MENU); return; }
    if (freeP && intent === 'whoami') { say('Я «Рядом» — программа, а не человек. Отвечаю по заготовкам и правилам, поэтому могу не понять тебя с первого раза — поправляй. Я не врач и не заменяю специалиста.'); choices(MENU); return; }
    if (freeP && intent === 'caps') { say('Могу выслушать и помочь назвать, что происходит; подобрать небольшую практику; потренировать трудный разговор — с начальником, мамой, коллегой, другом; подсказать, куда сходить и что поесть, исходя из твоих предпочтений. Всё хранится только на этом устройстве.'); choices(MENU); return; }
    if (freeP && intent === 'helpme') { say('Я рядом. Начнём с самого простого: что сейчас ближе? Если опасность прямо сейчас — звони по номеру 112.'); moodChips(); return; }
    if (freeP && intent === 'hear') { say('Да, я здесь и читаю. Можно писать как получается — кусками, без порядка.'); return; }
    if (freeP && intent === 'rude') { say('Если мои ответы сейчас раздражают — это честная обратная связь, спасибо. Можно сказать, что не так, или взять паузу. Я не обижаюсь.'); choices([['Скажу, что не так', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]); return; }
    if (freeP && intent === 'joke') { say('С шутками у меня слабо. Зато могу побыть рядом, подобрать небольшой шаг или подсказать, куда сходить.'); choices(MENU); return; }
    if (freeP && intent === 'offtopic') { say('Тут я не помощник: я про состояние, трудные разговоры и места. Для такого лучше обычный поиск или другой сервис. А если на душе что-то есть — я рядом.'); choices(MENU); return; }
    if (freeP && intent === 'emoji') { say('Слышу. Эмодзи тоже считается. Хочешь рассказать словами или выбрать подсказку?'); moodChips(); return; }
    if (freeP && intent === 'avoid') { say('Хорошо, не будем. Ничего объяснять не нужно. Можно просто побыть рядом или выбрать другое.'); choices(MENU.concat([['Пока достаточно', 'cmd:finish']])); return; }
    if (freeP && intent === 'okayish' && ['open', 'open2', 'end', 'wrap'].includes(p)) { setPhase('listen'); say('«Нормально» — тоже состояние, и его не нужно ни улучшать, ни объяснять. Если хочется, можно просто отметить день, сделать что-то небольшое для себя или подсказать, куда сходить.'); choices([['Записать в дневник', 'cmd:wrapmood'], ['Небольшой шаг', 'cmd:need:step'], ['Куда сходить?', 'cmd:need:go'], ['Вообще-то есть что рассказать', 'cmd:more']]); return; }
    if (intent === 'dunno' && ['open', 'open2', 'listen', 'listen2'].includes(p)) return cantFlow();
    if (intent === 'go' && !/ не хочу куда| никуда не хочу/.test(N(raw))) { understand(raw); return goFlow(); }
    if (intent === 'chitchat') { setPhase('listen'); say('Могу просто побыть рядом и послушать, подобрать небольшой шаг или подсказать, куда сходить и что поесть. С чего начнём?'); choices([['Просто поговорим', 'cmd:need:talk'], ['Небольшой шаг', 'cmd:need:step'], ['Куда сходить или что поесть', 'cmd:need:go']]); return; }
    if (intent === 'ack' && !['open', 'open2', 'confirm', 'correct', 'positive', 'prep_fact', 'prep_goal', 'riskcheck', 'safety'].includes(p) && !p.startsWith('know')) { say(pickFresh(['Хорошо. Я рядом.', 'Понятно. Можно не торопиться.', 'Ясно. Если захочется, продолжим с того места, где остановились.'], 'ackw')); choices([['Продолжу рассказывать', 'cmd:more'], ['Небольшой шаг', 'cmd:need:step'], ['Пока достаточно', 'cmd:finish']]); return; }
    if (intent === 'thanks') { say('Пожалуйста. Я рядом. Хочешь продолжить или остановиться на этом?'); choices([['Продолжу рассказывать', 'cmd:more'], ['Подобрать небольшой шаг', 'cmd:need:step'], ['Пока достаточно', 'cmd:finish']]); return; }
    if (intent === 'finish') return wrapUp();
    if (intent === 'noadvice') { D.noAdvice = true; D.noPractice = true; return startListen('Хорошо, без советов и практик — просто слушаю. Что дальше?'); }
    if (intent === 'doubt') { say('Если это не помогает — так бывает, и это важная информация. Что именно не подошло?'); setPhase('listen'); return; }
    if (intent === 'cant') return cantFlow();
    if (intent === 'advice' && p !== 'prep_fact' && p !== 'prep_goal') { understand(raw); if (p === 'need') return onCommand('cmd:need:clarity'); if (offerQuest()) return; return askNeed(); }

    switch (p) {
      case 'open': case 'open2': case 'end': case 'wrap': {
        if (p === 'end' || p === 'wrap') { D = fresh(); setPhase('open'); }
        if (prefTurn(raw)) return;
        const found = understand(raw);
        if (found.emo.length === 1 && found.emo[0] === 'good' && !D.cues.length) { D.positive = true; return positiveFlow(); }
        if (!found.emo.length && !found.cues.length && !found.themes.length && !D.themes.size) return unclear();
        return confirmStep(found);
      }
      case 'confirm': {
        const t0 = String(raw).toLowerCase().trim();
        if (/^(да|ага|угу|верно|точно|именно|примерно|так и есть)\b/.test(t0) && t0.length < 40) return askNeed();
        if (/^(нет|не совсем|не то|не так)\b/.test(t0) && t0.length < 25) return onCommand('cmd:no');
        D.corrections++;
        const found = understand(raw, 2);
        say(found.emo.length || found.cues.length ? 'Принято, добавляю. ' + reflection(found) : 'Хорошо, это тоже учту.');
        return askNeed();
      }
      case 'correct': {
        D.corrections++; const found = understand(raw, 2);
        say('Спасибо, так точнее. ' + reflection(found));
        return askNeed();
      }
      case 'positive': {
        const found = understand(raw);
        const q = (D.quotes[D.quotes.length - 1] || '').replace(/^(да|ну|нет|наверное|думаю)[,\s]+/i, '');
        say((q ? 'Это стоит запомнить: «' + q + '». ' : '') + 'Хорошо, что есть то, на что можно опираться. Хочешь отметить это как-то — сходить куда-нибудь или просто записать день в дневник?');
        setPhase('listen');
        choices([['Куда сходить отметить?', 'cmd:need:go'], ['Записать в дневник', 'cmd:wrapmood'], ['Пока достаточно', 'cmd:finish']]); return;
      }
      case 'need': case 'suggest': case 'feedback': case 'followup': case 'afterPractice': case 'listen': case 'listen2': {
        if (prefTurn(raw)) return;
        const found = understand(raw);
        if (D.goAsked && !found.emo.filter(k => k !== 'good').length && !found.cues.length) {
          D.goAsked = false; setPhase('listen');
          say('Принято: «' + clip(raw, 60) + '». Чтобы подсказывать точнее, мне нужно немного узнать твои вкусы — или сразу открыть «Места»: там можно выбрать настроение и посмотреть, что рядом.');
          choices([['Познакомиться', 'cmd:know:start'], ['Открыть «Места»', 'cmd:places'], ['Расскажу, что на душе', 'cmd:more']]); return;
        }
        D.goAsked = false;
        D.listenTurns++;
        if (p === 'need') {
          const s2 = N(raw);
          if (/ выговорит| поговорить| послушай| выслушай/.test(s2)) return onCommand('cmd:need:talk');
          if (/ разобрат| разложить| разделить| понять что/.test(s2)) return onCommand('cmd:need:clarity');
          if (/ успоко| подыша| дыхани| шаг /.test(s2) && !D.noPractice) return onCommand('cmd:need:step');
          if (/ отдохн| передохн| пауза| пауз /.test(s2) && !D.noPractice) return onCommand('cmd:need:rest');
        }
        let reply = '';
        const weakSay = CUES.filter(c => c.weak).map(c => c.say); const newCue = found.cues.find(c => !weakSay.includes(c)) || found.cues[0];
        const newEmo = found.emo.find(k => k !== 'good');
        const q = D.quotes[D.quotes.length - 1];
        if (newCue) reply = pickFresh(['Отдельно слышу: ' + newCue + '.', 'Замечаю ещё одно: ' + newCue + '.', 'Здесь важно и это: ' + newCue + '.'], 'cuew');
        else if (newEmo && emoGen(newEmo)) reply = 'В этом тоже слышится ' + emoGen(newEmo) + '.';
        else if (q && D.listenTurns % 2 === 1 && String(raw).length > 40) reply = 'Ты пишешь: «' + q + '».';
        else reply = pickFresh(ACK, 'ack');
        if (newCue === 'желание промолчать, как обычно' && !D.noAdvice && !D.silenceOffered) {
          D.silenceOffered = true; setPhase('listen');
          say(reply + ' Промолчать — тоже выбор, и иногда он разумный. Но если есть хоть одна фраза, которую хотелось бы сказать, её можно собрать заранее — спокойно, без спора.');
          choices([['Собрать свою фразу', 'cmd:need:prepare'], ['Потренировать разговор', 'cmd:quest:' + (questFor() || 'boss-feedback')], ['Продолжу рассказывать', 'cmd:more']]); return;
        }
        say(reply + ' ' + nextQuestion());
        setPhase('listen');
        if (offerQuest()) return;
        if (D.listenTurns >= 2 && D.listenTurns % 2 === 0 && !D.noAdvice) {
          choices([['Подобрать небольшой шаг', 'cmd:need:step'], ['Продолжу рассказывать', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]);
        }
        return;
      }
      case 'pref': { D.prefBack = null; setPhase('listen'); return onText(raw); }
      case 'know_food': case 'know_place': case 'know_help': {
        const p2 = PR(); const parts = String(raw).split(/[,;\n]| и /).map(x => x.trim()).filter(x => x.length > 1).slice(0, 3);
        if (p2) parts.forEach(x => p2.add(p.slice(5), x, 'chat'));
        say(parts.length ? 'Записано: ' + parts.join(', ') + '.' : 'Хорошо.');
        return knowAsk((D.know || 0) + 1);
      }
      case 'clarity1': {
        const q = clip(raw, 110); understand(raw);
        say('Хорошо, это можно держать как факт: «' + q + '». А что здесь пока догадка или оценка — то, в чём нет полной уверенности?');
        setPhase('clarity2'); return;
      }
      case 'clarity2': {
        understand(raw);
        say('Видно, что фактов и догадок тут разное количество, и это уже ясность. Какой следующий небольшой шаг отсюда кажется посильным?');
        choices([['Уточнить у человека', 'cmd:need:prepare'], ['Записать на бумагу', 'practice:note'], ['Подождать и отдохнуть', 'cmd:need:rest'], ['Ещё поговорить', 'cmd:more']]);
        setPhase('clarity3'); return;
      }
      case 'prep_fact': {
        D.prep.fact = raw; setPhase('prep_goal');
        say('Теперь закончи фразу своими словами: «Мне важно, чтобы…»'); return;
      }
      case 'prep_goal': {
        D.prep.goal = raw.replace(/^мне важно,?\s*чтобы\s*/i, '');
        setPhase('prep_done');
        say('Вот черновик, который можно переделать под себя:\n' + composeDraft('base'));
        choices([['Сделать мягче', 'cmd:soft'], ['Сделать твёрже', 'cmd:firm'], ['Скопировать', 'cmd:copy'], ['Готово', 'cmd:finish']]);
        return;
      }
      default: {
        const found = understand(raw);
        return confirmStep(found);
      }
    }
  }

  // Сообщение о вкусах («люблю плов и тихие кафе») без эмоций: сразу предложить запомнить и вернуться.
  function prefTurn(raw) {
    const pr = PR(); if (!pr || !profileOn() || !D.pCand || !D.pCand.length) return false;
    const s = N(raw);
    if (EMO.some(e => e.k !== 'good' && e.re.test(s)) || CUES.some(c => !c.weak && c.re.test(s))) return false;
    const all = D.pCand.slice(0, 3); D.prefBack = checkin.phase;
    say('Звучит приятно: ' + all.map(c => '«' + c.text + '»').join(', ') + '. Запомнить, чтобы потом подсказывать, куда сходить и что поесть? Это видно в «Обо мне» и удаляется.');
    choices([['Запомнить', 'cmd:pm:y'], ['Не запоминать', 'cmd:pm:n']]); setPhase('pref');
    return true;
  }
  function positiveFlow() {
    setPhase('positive');
    say('Хорошо слышать. Что сегодня помогло, чтобы так было? Можно одной фразой.');
    choices([['Есть и сложная часть', 'cmd:complex'], ['Просто побуду в этом', 'cmd:finish']]);
  }
  function cantFlow() {
    setPhase('cant');
    say('Это нормально — не всегда находятся слова. Можно пойти другим путём: выбрать небольшой шаг, передохнуть или поговорить о чём-то другом.');
    const opts = [['Передохнуть', 'cmd:need:rest'], ['Небольшой шаг', 'cmd:need:step'], ['Поговорим о другом', 'cmd:need:talk']];
    choices(D.noPractice ? [opts[2]] : opts);
  }
  function afterRiskNo() {
    const t = D.pendingText; D.pendingText = null;
    say('Спасибо за ответ. Продолжим.');
    if (t) { setPhase('open'); onText(t); } else setPhase('open');
  }

  /* ---------- команды (нажатия кнопок) ---------- */
  function onCommand(value) {
    // практики
    if (value.startsWith('practice:')) {
      const key = value.slice(9);
      checkin.practice = key; state.currentPractice = key; state.phase = 'afterPractice'; setPhase('feedback');
      openPractice(key); return;
    }
    // совместимость с flagship-practice и общей модалкой практик
    if (['better', 'same', 'worse'].includes(value)) return feedback(value);
    if (value === 'talk' || value === 'cmd:more') { setPhase('listen'); say(D.listenTurns ? 'Я рядом. Что ещё важно?' : nextQuestion()); return; }
    if (value === 'finish' || value === 'cmd:finish') return wrapUp();
    if (value === 'another') return suggestSteps();
    if (value === 'restart') { reset(true); return greet(); }

    const [, a, b] = value.split(':');
    switch (a) {
      case 'mood': {
        D.emo.set(b, 2);
        if (b === 'good') return positiveFlow();
        if (D.themes.size || D.cues.length) { say('Понятно, значит, главное сейчас — ' + (emoNom(b) || 'это') + '.'); return askNeed(); }
        const leads = {
          hurt: 'Обида обычно про то, что что-то важное задели или обошли. Что именно задело?',
          fear: 'Тревога бывает про что-то конкретное, а бывает без явной причины. Что рядом с ней прямо сейчас — событие, мысль или пока просто ощущение?',
          sad: 'Грусть часто тянет за собой что-то конкретное. Что к ней привело — или она пришла сама?',
          anger: 'Злость обычно сигналит, что что-то задело или нарушено. Что произошло?',
          tired: 'Усталость бывает разной: от дел, от людей, от долгого напряжения. На что похоже у тебя?'
        };
        say(leads[b] || 'Расскажи, что происходит.');
        choices([['Пока не могу объяснить', 'cmd:cant']]);
        setPhase('open2'); return;
      }
      case 'cant': return cantFlow();
      case 'yes': if (offerQuest()) return; return askNeed();
      case 'no': setPhase('correct'); say('Спасибо, что поправляешь. Скажи, как точнее — своими словами.'); return;
      case 'add': setPhase('correct'); say('Конечно. Что ещё важно добавить?'); return;
      case 'complex': D.positive = false; return startListen('Давай коснёмся и сложного. Что рядом с хорошим не даёт покоя?');
      case 'need': {
        D.need = b;
        if (b === 'talk') return startListen();
        if (b === 'clarity') { setPhase('clarity1'); say('Давай разделим. Что из случившегося — факт, который увидел бы любой человек рядом?'); return; }
        if (b === 'go') return goFlow();
        if (b === 'step' || b === 'rest') return suggestSteps(b);
        if (b === 'prepare') { setPhase('prep_fact'); say('Соберём начало разговора из твоих слов. Сначала: что произошло — коротко и без оценок? Лучше так, как это прозвучит для самого человека: «ты попросил…», «мы договорились…».'); return; }
        return startListen();
      }
      case 'risk': {
        if (b === 'no') return afterRiskNo();
        return safety('self');
      }
      case 'helptext': say('Можно отправить: «Мне сейчас очень тяжело. Пожалуйста, позвони мне или побудь рядом. Помоги получить срочную помощь».'); choices([['Сейчас я в безопасности', 'cmd:safe']]); return;
      case 'unsafe': say('Пожалуйста, прямо сейчас позвони по экстренному номеру или позови человека рядом и не оставайся с этим наедине.\n' + SAFETY_LINES.join('\n')); choices([['Показать текст для близкого', 'cmd:helptext']]); return;
      case 'safe': D.noPractice = true; setPhase('listen'); say('Спасибо, что говоришь об этом. Если захочешь, просто поговорим о том, что происходит. Практики предлагать пока не буду. Что сейчас на первом плане?'); return;
      case 'soft': say(composeDraft('soft')); choices([['Сделать твёрже', 'cmd:firm'], ['Скопировать', 'cmd:copy'], ['Готово', 'cmd:finish']]); return;
      case 'firm': say(composeDraft('firm')); choices([['Сделать мягче', 'cmd:soft'], ['Скопировать', 'cmd:copy'], ['Готово', 'cmd:finish']]); return;
      case 'copy': {
        const text = composeDraft('base').replace(/^«|»$/g, '');
        const done = ok => { say(ok ? 'Скопировано в буфер обмена.' : 'Не получилось скопировать автоматически — текст выше можно выделить и скопировать вручную.'); choices([['Готово', 'cmd:finish']]); };
        try { navigator.clipboard.writeText(text).then(() => done(true), () => done(false)); } catch { done(false); }
        return;
      }
      case 'save': saveMood(b); return endChat('Отметка «' + (MOOD_LABEL[b] || b).toLowerCase() + '» добавлена в дневник. Можно вернуться в любой момент.');
      case 'quest': {
        say('Открываю тренажёр. Вернуться к разговору можно в любой момент.'); choices([['Вернуться к разговору', 'cmd:more']]);
        if (typeof view === 'function') view('games');
        setTimeout(() => { if (window.RyadomQuest) window.RyadomQuest.open(b); }, 60); return;
      }
      case 'know': {
        if (b === 'start') { if (!profileOn()) { say('Сейчас запись о тебе выключена. Включить её можно в разделе «Обо мне» — после этого вернёмся к знакомству.'); choices([['Расскажу, что на душе', 'cmd:more']]); setPhase('listen'); return; } return knowAsk(0); }
        return knowAsk((D.know || 0) + 1);
      }
      case 'places': { say('Открываю раздел «Места».'); choices([['Вернуться к разговору', 'cmd:more']]); if (typeof view === 'function') view('places'); return; }
      case 'goyes': {
        const p = PR(); const ppl = p ? p.list('people').slice(-1) : [];
        say('Хорошо. Небольшой план: выбери время, возьми с собой то, что помогает' + (ppl.length ? ', и подумай, не позвать ли того, с кем легко (' + ppl[0] + ')' : '') + '. Если сил станет меньше, достаточно половины задуманного.');
        choices([['Расскажу, что на душе', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]); return;
      }
      case 'pm': {
        const p = PR(); const x = (D.pCand || []).shift();
        if (D.prefBack) { const rest = (D.pCand || []).splice(0, 3); const list = [x].concat(rest).filter(Boolean); if (b === 'y' && p) list.forEach(c => p.add(c.cat, c.text, 'chat')); }
        else if (b === 'y' && x && p) p.add(x.cat, x.text, 'chat');
        if (D.prefBack) {
          D.prefBack = null; setPhase('listen');
          say(b === 'y' ? 'Записано. Хочешь, подберу идею на сегодня под это, или продолжим разговор?' : 'Хорошо, не записываю. Продолжим?');
          choices(b === 'y' ? [['Куда сходить или что поесть', 'cmd:need:go'], ['Продолжу рассказывать', 'cmd:more'], ['Пока достаточно', 'cmd:finish']] : [['Продолжу рассказывать', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]);
          return;
        }
        return wrapUp();
      }
      case 'wrapmood': return wrapMood();
      case 'nosave': return endChat('Хорошо, ничего не сохраняю в отметки. Можно вернуться в любой момент.');
    }
    // неизвестная команда — безопасный возврат
    askNeed();
  }

  function feedback(v) {
    const h = history(); h.push({ day: todayKey(), practice: checkin.practice, outcome: v }); save(h.slice(-365));
    if (v === 'better') {
      setPhase('followup');
      say('Хорошо, что стало немного легче. Что именно помогло — можно одним словом, а можно пропустить.');
      choices([['Другой шаг', 'cmd:need:step'], ['Расскажу ещё', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]);
    } else if (v === 'worse') {
      D.worse++; setPhase('followup');
      say(D.worse >= 2 ? 'Если становится тяжелее несколько раз подряд, лучше не оставаться с этим наедине: написать близкому человеку или обратиться к специалисту. Эти практики пока остановим.' : 'Спасибо, что говоришь об этом. Эту практику останавливаем — бывает, что она не подходит. Можно выбрать более мягкий вариант или просто поговорить.');
      choices(D.worse >= 2 ? [['Просто поговорим', 'cmd:need:talk'], ['Пока достаточно', 'cmd:finish']] : [['Более мягкий шаг', 'cmd:need:rest'], ['Просто поговорим', 'cmd:need:talk'], ['Пока достаточно', 'cmd:finish']]);
    } else {
      setPhase('followup');
      say('Иногда эффект приходит не сразу, а иногда шаг просто не подходит. Можно попробовать другое или остановиться.');
      choices([['Другой шаг', 'cmd:need:step'], ['Расскажу ещё', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]);
    }
  }

  /* ---------- главный вход ---------- */
  function respondV2(label, value) {
    clearChoices();
    const chip = label !== value;
    add(label, true);
    if (!chip) {
      const risk = riskOf(label);
      if (risk === 'self') return safety('self');
      if (risk === 'others') return safety('others');
      if (risk === 'danger') return safety('danger');
      if (risk === 'check' && phase() !== 'riskcheck' && phase() !== 'safety') return askRisk(label);
      collect(label);
      return viaServer(label);
    }
    return onCommand(value);
  }

  // MODEL-HOOK: серверный диалог. Включается, если страница задала window.RYADOM_API = { url: '/api/dialogue' }.
  // Контракт запроса: { messages:[{role:'user'|'assistant',text}], context:{noAdvice,noPractice,practices:[{id,title}]} }
  // Контракт ответа:  { reply, question?, suggestedPracticeId?, risk:'none'|'self'|'others'|'danger'|'check' }
  // Клиент сам проверяет risk и каталог практик; при любой ошибке, таймауте (8 с) или пустом ответе
  // работают правила выше — разговор не ломается. Фразы с риском всегда проверяются локально ДО отправки.
  const REMOTE_PHASES = ['open', 'open2', 'listen', 'listen2', 'need', 'suggest', 'followup', 'end', 'wrap', 'afterPractice'];
  let remoteQueue = Promise.resolve(), remoteNotice = false;
  function remoteUrl() { const a = window.RYADOM_API; return a && a.url && !a.disabled ? a.url : null; }
  function viaServer(text) {
    const url = remoteUrl();
    if (!url || !REMOTE_PHASES.includes(phase())) return onText(text);
    const snapshotPhase = phase();
    remoteQueue = remoteQueue.then(() => askServer(url, text, snapshotPhase)).catch(() => onText(text));
    return remoteQueue;
  }
  function recentMoods() {
    if (!profileOn()) return undefined;
    try { return history().filter(x => x.mood).slice(-6).map(x => ({ day: x.day, mood: x.mood })); } catch { return undefined; }
  }
  async function askServer(url, text, snapshotPhase) {
    D.turns = D.turns || [];
    if (!remoteNotice) { remoteNotice = true; say('Для ответа этот разговор отправляется на сервер помощника. В дневник он не попадает без твоего согласия.'); }
    const msgs = D.turns.concat([{ role: 'user', text: String(text).slice(0, 1200) }]).slice(-12);
    const ctrl = new AbortController(), timer = setTimeout(() => ctrl.abort(), 8000);
    let r;
    try {
      const res = await fetch(url, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: ctrl.signal,
        body: JSON.stringify({ messages: msgs, context: { noAdvice: !!D.noAdvice, noPractice: !!D.noPractice, practices: Object.keys(practices).map(k => ({ id: k, title: practices[k].title })), profile: (PR() && PR().forServer()) || undefined, recent: recentMoods() } })
      });
      if (!res.ok) throw new Error('http ' + res.status);
      r = await res.json();
    } finally { clearTimeout(timer); }
    if (!r || r.fallback || typeof r.reply !== 'string') throw new Error('fallback');
    const risk = ['none', 'self', 'others', 'danger', 'check'].includes(r.risk) ? r.risk : 'none';
    if (risk === 'self' || risk === 'others' || risk === 'danger') return safety(risk);
    if (risk === 'check') return askRisk(text);
    const reply = r.reply.trim().slice(0, 900);
    if (!reply) throw new Error('empty');
    understand(text);
    D.turns.push({ role: 'user', text: String(text).slice(0, 1200) }, { role: 'assistant', text: reply });
    D.listenTurns++;
    say(reply);
    if (r.question && typeof r.question === 'string') say(r.question.trim().slice(0, 300));
    setPhase('listen');
    const pid = r.suggestedPracticeId;
    if (pid && practices[pid] && !D.noPractice && !D.noAdvice) {
      choices([[practices[pid].title + ' · ' + practices[pid].duration, 'practice:' + pid], ['Продолжу рассказывать', 'cmd:more'], ['Пока достаточно', 'cmd:finish']]);
    }
  }
  window.RyadomDialogue = { riskOf, questFor: raw => { D = fresh(); understand(raw); return questFor(); }, understand: raw => { D = fresh(); return understand(raw); }, _state: () => D };

  /* ---------- подмена прежнего потока ---------- */
  respond = respondV2;
  askFeedback = function () {
    setPhase('feedback');
    say('Как ты сейчас после этого шага?');
    choices([['Чуть легче', 'better'], ['Пока так же', 'same'], ['Стало хуже', 'worse']]);
  };
  // начальный экран
  const box = document.querySelector('#messages');
  if (box) box.replaceChildren();
  reset(true);
  greet();
})();
