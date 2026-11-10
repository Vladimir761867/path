// Practical catalogue and richer check-in. This is a guided prototype, not clinical advice.
const practiceTopics={anxiety:'Тревога',sadness:'Грусть',anger:'Злость',stress:'Перегрузка',sleep:'Сон',relations:'Отношения',work:'Работа',energy:'Нет сил',focus:'Мысли',calm:'Спокойствие'};
const practiceRows=[
['Три опоры','anxiety','Оглянись и назови три устойчивых предмета рядом. Почувствуй стопы на полу. Сделай один удобный выдох.','1 мин'],
['Длинный выдох','anxiety','Вдохни естественно, затем выдохни немного медленнее. Повтори несколько раз без задержки дыхания и без усилия.','2 мин'],
['Проверка фактов','anxiety','Запиши: что я знаю точно, что предполагаю и что могу уточнить. Не требуй от себя немедленного решения.','3 мин'],
['План на ближайший час','anxiety','Выбери одно безопасное и выполнимое действие на ближайший час. Остальное пока оставь на потом.','2 мин'],
['Найди цвет','anxiety','Выбери цвет и найди вокруг пять предметов этого цвета. Верни внимание к комнате, когда мысли ускоряются.','1 мин'],
['Контакт с поверхностью','anxiety','Заметь, как кресло или пол поддерживают тело. Опиши про себя три точки контакта.','1 мин'],
['Меньше новостей','anxiety','Если поток новостей усиливает тревогу, отложи его на 15 минут и выбери конкретное время для проверки.','1 мин'],
['Кому можно написать','anxiety','Выбери человека, которому можно коротко написать: «Мне тревожно. Можешь побыть на связи?»','2 мин'],
['Назвать чувство','sadness','Скажи себе: «Мне сейчас грустно». Не объясняй и не исправляй это чувство в ту же секунду.','1 мин'],
['Мягкий день','sadness','Составь минимальный план: еда, вода, один обязательный шаг и один посильный источник тепла.','3 мин'],
['Память о хорошем','sadness','Вспомни один спокойный момент за последнюю неделю. Запиши детали: место, свет, звук.','2 мин'],
['Тёплый контакт','sadness','Напиши близкому человеку одну честную фразу о своём состоянии, если хочется быть услышанной или услышанным.','2 мин'],
['Разрешить паузу','sadness','Поставь таймер на пять минут. Можно просто посидеть, не превращая отдых в задачу.','5 мин'],
['Небольшая забота','sadness','Выбери одну бережную вещь: плед, душ, чай или прогулку. Отметь, стало ли хоть немного легче.','3 мин'],
['Без сравнения','sadness','Заметь мысль «другие справляются лучше». Замени её на конкретный факт о сегодняшней нагрузке.','2 мин'],
['Свет и воздух','sadness','Если удобно, подойди к окну или выйди на несколько минут. Заметь температуру воздуха и положение тела.','3 мин'],
['Пауза перед ответом','anger','Прежде чем отвечать, отойди от переписки на пару минут. Спроси себя, какой результат нужен от ответа.','2 мин'],
['Где злость в теле','anger','Заметь, где в теле сейчас напряжение. Расслабь челюсть или плечи, если это приятно, не подавляя чувство.','2 мин'],
['Черновик без отправки','anger','Напиши резкий ответ в заметке, которую не отправишь. Затем выдели одну просьбу, которую действительно хочешь донести.','3 мин'],
['Граница одной фразой','anger','Попробуй фразу: «Мне важно обсудить задачу, когда мы сможем говорить спокойно». Подстрой её под себя.','2 мин'],
['Отойти от экрана','anger','Положи телефон и сделай несколько шагов. Возвращайся к разговору, когда сможешь выбрать тон.','2 мин'],
['Что задело','anger','Раздели на две строки: что произошло и какую важную потребность это затронуло.','3 мин'],
['Безопасная разрядка','anger','Сильно прижми стопы к полу на несколько секунд, затем отпусти. Повтори комфортно, без боли.','1 мин'],
['Право отложить','anger','Если нет срочности, назначь время ответа позже. Тебе не обязательно решать конфликт в пике эмоций.','1 мин'],
['Одна задача','stress','Выпиши всё, что давит. Обведи одну задачу, которую можно начать за десять минут.','3 мин'],
['Пять процентов','stress','Спроси: что сделает ближайший час на пять процентов легче? Выбери один маленький шаг.','2 мин'],
['Снять лишнее','stress','Посмотри на список дел и вычеркни, перенеси или попроси помощи хотя бы с одним пунктом.','3 мин'],
['Перерыв между делами','stress','Перед новой задачей сделай паузу: вода, взгляд вдаль, несколько спокойных движений.','2 мин'],
['Проверка тела','stress','Заметь голод, жажду, усталость и напряжение. Начни с самой простой телесной потребности.','2 мин'],
['Достаточно на сегодня','stress','Сформулируй критерий «достаточно хорошо» для одной задачи. Остановись, когда он достигнут.','3 мин'],
['Попросить ясности','stress','Если запрос размытый, уточни срок, приоритет и ожидаемый результат у того, кто его дал.','2 мин'],
['Тихое окно','stress','На десять минут отключи необязательные уведомления и займись одним делом.','10 мин'],
['Переход ко сну','sleep','За некоторое время до сна снизь яркость экрана и выбери спокойное занятие без цели «уснуть немедленно».','5 мин'],
['Выгрузить мысли','sleep','Запиши незавершённые дела и один следующий шаг к каждому. Вернуться к списку можно завтра.','3 мин'],
['Комфортная поза','sleep','Устрой тело удобнее и мягко замечай точки опоры. Дыхание оставь естественным.','2 мин'],
['Тихие звуки','sleep','Прислушайся к трём звукам вокруг. Не оценивай их, просто отмечай появление и исчезновение.','2 мин'],
['Без борьбы со сном','sleep','Если не спится, напомни себе: отдых тоже ценен. Выбери спокойное занятие и вернись в постель, когда захочется.','3 мин'],
['Вечерняя граница','sleep','Назначь момент, после которого рабочие сообщения подождут до завтра, если это возможно.','2 мин'],
['Мягкое завершение','sleep','Назови одну вещь, которую удалось сделать сегодня. Даже очень маленькую.','1 мин'],
['Спокойное утро','sleep','Подготовь одну мелочь для утра: одежду, стакан воды или список первого дела.','2 мин'],
['Я-сообщение','relations','Составь фразу: «Когда произошло…, мне было… Мне хотелось бы…».','3 мин'],
['Сначала услышать','relations','Перескажи своими словами, что было услышано от другого человека, и уточни, верно ли это понято.','2 мин'],
['Право на нет','relations','Попробуй короткий ответ без длинного оправдания: «Сейчас я не могу. Давай обсудим другой вариант».','2 мин'],
['Моя часть','relations','Раздели лист: «за что отвечаю я» и «за что отвечает другой». Не бери на себя обе стороны.','3 мин'],
['Пауза в разговоре','relations','Если разговор накаляется, предложи вернуться к нему в конкретное время после паузы.','2 мин'],
['Близость и границы','relations','Запиши: как я хочу поддерживать контакт и что мне при этом важно решать самостоятельно.','3 мин'],
['Один вопрос','relations','Вместо догадки спроси: «Что именно ты имеешь в виду?» Дай другому возможность прояснить слова.','1 мин'],
['Тёплое сообщение','relations','Если хочется контакта, отправь простое сообщение без ожидания немедленного ответа.','2 мин'],
['Факты после встречи','work','После сложного разговора запиши конкретные задачи и договорённости отдельно от тона и эмоций.','3 мин'],
['Уточнить приоритет','work','Спроси, какое из двух дел важнее сегодня. Это превращает неопределённость в выбор.','2 мин'],
['Ответ начальнику','work','Составь спокойный черновик: факт, уточняющий вопрос и срок, когда вернёшься с ответом.','3 мин'],
['После критики','work','Раздели обратную связь на полезную часть, спорную часть и форму подачи. Возьми только то, что поможет задаче.','3 мин'],
['Рабочая граница','work','Назови реалистичный срок и то, что потребуется, чтобы уложиться. Не обещай невозможного.','2 мин'],
['Маленькая победа','work','Запиши одно завершённое дело за день. Даже если другие ещё ждут.','1 мин'],
['Переход домой','work','Закрой рабочий день короткой заметкой о первом шаге на завтра. Переключись на другую деятельность.','3 мин'],
['Найти союзника','work','Подумай, кто может помочь уточнить задачу, дать контекст или поддержать после трудного разговора.','2 мин'],
['Базовые нужды','energy','Проверь сон, еду, воду и паузы. Выбери самое доступное сейчас.','2 мин'],
['Минимальный шаг','energy','Сократи задачу до действия на две минуты. Можно остановиться после него.','2 мин'],
['Не объяснять усталость','energy','Скажи себе: «Сил мало, и я могу выбрать посильный темп». Определи один обязательный пункт.','2 мин'],
['Пауза без экрана','energy','На несколько минут убери экран и посмотри вдаль или закрой глаза, если комфортно.','3 мин'],
['Просьба о помощи','energy','Сформулируй конкретную небольшую просьбу человеку, который может помочь.','2 мин'],
['Список «потом»','energy','Запиши необязательные дела в список на другой день, чтобы не держать их в голове.','3 мин'],
['Тихая прогулка','energy','Если есть силы и безопасно, пройди несколько минут в удобном темпе. Отдых тоже остаётся вариантом.','5 мин'],
['Один приятный момент','energy','Выбери простую вещь, которая не требует подготовки: музыка, вода, окно или тёплый душ.','2 мин'],
['Мысль или факт','focus','Запиши тревожную мысль и рядом — факты за и против. Оставь место для неизвестного.','3 мин'],
['Название мысли','focus','Когда мысль повторяется, произнеси: «У меня появилась мысль, что…». Это создаёт небольшую дистанцию.','1 мин'],
['Круг влияния','focus','Раздели ситуацию на то, что можешь изменить, на что можешь повлиять и что сейчас вне контроля.','3 мин'],
['Один следующий шаг','focus','Вместо полного плана выбери действие, которое можно сделать сегодня.','2 мин'],
['Вернуться к ощущениям','focus','Назови три звука, две видимые детали и одно ощущение от поверхности под рукой.','1 мин'],
['Время для мысли','focus','Если мысль возвращается, запиши её и назначь короткое время позже, когда сможешь к ней вернуться.','2 мин'],
['Два объяснения','focus','Найди ещё одно возможное объяснение событию, кроме самого пугающего. Не обязательно верить в него сразу.','2 мин'],
['Спросить, а не угадать','focus','Если мысль касается намерений другого, сформулируй вопрос, который поможет прояснить ситуацию.','2 мин'],
['Что уже помогает','calm','Заметь, что сейчас поддерживает тебя: человек, место, движение или привычка. Сохрани это в памяти.','2 мин'],
['Поблагодарить себя','calm','Назови один свой шаг сегодня без оценки его масштаба.','1 мин'],
['Фото момента','calm','Опиши словами спокойный момент: цвет, звук, температуру и чувство в теле.','2 мин'],
['Забота на завтра','calm','Выбери одну маленькую вещь, которую хочется повторить завтра.','2 мин'],
['Делиться хорошим','calm','Если хочется, расскажи кому-то о приятном моменте, не превращая это в отчёт.','2 мин'],
['Просто побыть','calm','Разреши себе несколько минут ничего не улучшать. Замечай, что уже есть.','3 мин'],
['Мягкий план','calm','Пока спокойно, запиши, что обычно помогает в более сложные дни.','3 мин'],
['Свободное время','calm','Оставь в дне небольшой отрезок без обязательного результата.','5 мин']
];
practiceRows.forEach(([title,topic,text,duration],i)=>{practices['extra'+i]={symbol:{anxiety:'◌',sadness:'♡',anger:'↗',stress:'☷',sleep:'☾',relations:'♡',work:'▣',energy:'☀',focus:'✎',calm:'✳'}[topic],title,duration,desc:text,text,kind:/запиши|составь|выпиши|раздели на|сформулируй|назови два/i.test(text)?'note':'text',topic}});
Object.assign(practices,{breathe:{...practices.breathe,topic:'anxiety'},ground:{...practices.ground,topic:'anxiety'},boundary:{...practices.boundary,topic:'work'},note:{...practices.note,topic:'focus'},kindness:{...practices.kindness,topic:'sadness'},reset:{...practices.reset,topic:'energy'}});
const librarySection=document.querySelector('#library');
const libraryToolbar=document.createElement('div');libraryToolbar.className='catalog-toolbar';libraryToolbar.innerHTML='<label class="catalog-search-label" for="practiceSearch">Поиск практики</label><input id="practiceSearch" type="search" placeholder="Например: тревога, начальник, сон…" autocomplete="off"><div class="catalog-chips" id="practiceTopics"></div><p id="practiceCount" aria-live="polite"></p>';
librarySection.insertBefore(libraryToolbar,document.querySelector('#practiceGrid'));
let chosenTopic='all';const topics=document.querySelector('#practiceTopics');[['all','Все'],...Object.entries(practiceTopics)].forEach(([key,name])=>{let b=document.createElement('button');b.textContent=name;b.className=key==='all'?'active':'';b.onclick=()=>{chosenTopic=key;topics.querySelectorAll('button').forEach(x=>x.classList.toggle('active',x===b));renderCatalog()};topics.append(b)});
function renderCatalog(){let q=document.querySelector('#practiceSearch').value.trim().toLocaleLowerCase('ru'),list=Object.entries(practices).filter(([key,p])=>(chosenTopic==='all'||p.topic===chosenTopic)&&(!q||(p.title+' '+p.desc+' '+(practiceTopics[p.topic]||'')).toLocaleLowerCase('ru').includes(q)));let grid=document.querySelector('#practiceGrid');grid.replaceChildren();document.querySelector('#practiceCount').textContent='Найдено практик: '+list.length+' из '+Object.keys(practices).length;if(!list.length){let e=document.createElement('p');e.textContent='Ничего не найдено. Попробуй другое слово или состояние.';grid.append(e)}list.forEach(([key,p])=>{let c=document.createElement('div');c.className='card practice';let sym=document.createElement('span');sym.className='symbol';sym.textContent=p.symbol;let tag=document.createElement('small');tag.className='practice-topic';tag.textContent=practiceTopics[p.topic]||'Поддержка';let h=document.createElement('h3');h.textContent=p.title;let d=document.createElement('p');d.textContent=p.desc;let b=document.createElement('button');b.className='linkbtn';b.textContent=p.duration+' · Открыть →';b.onclick=()=>openPractice(key);c.append(sym,tag,h,d,b);grid.append(c)})}
document.querySelector('#practiceSearch').addEventListener('input',renderCatalog);renderCatalog();
// Check-in: clarify the moment, name the kind of support, then offer several suitable steps.
let checkin={phase:'mood',mood:null,cause:'',need:'',severity:0,practice:null};
const safetyPattern=/суицид|поконч.*собой|убить себя|не хочу жить|хочу умереть|лучше бы умер|навредить себе|самоповрежд|самоубий|suicid|kill myself/i;
function chooseSupport(mood,cause,need){let c=cause.toLowerCase(),topic=/началь|работ|коллег|офис/.test(c)?'work':/мам|пап|родител|семь|муж|жен|партн|друг|отнош/.test(c)?'relations':/сон|ноч|спал/.test(c)?'sleep':/устал|сил|выгор/.test(c)?'energy':mood==='angry'?'anger':mood==='anxious'?'anxiety':mood==='hard'?'sadness':'focus';if(need==='rest')topic='energy';if(need==='clarity')topic='focus';return Object.entries(practices).filter(([k,p])=>p.topic===topic).slice(0,4).map(([key,p])=>[p.title+' · '+p.duration,'practice:'+key])}
function checkinReply(label,value){clearChoices();add(label,true);let raw=String(value||label),v=raw.toLowerCase();if(safetyPattern.test(raw)){checkin.phase='safety';add('Мне очень жаль, что сейчас так тяжело. Если есть риск причинить себе вред прямо сейчас, позови человека рядом и обратись за срочной помощью по местному экстренному номеру. Ты можешь сказать: «Мне сейчас небезопасно оставаться одной или одному. Побудь со мной и помоги получить помощь».');choices([['Показать фразу для близкого','help'],['Я сейчас в безопасности','safe']]);return}
if(checkin.phase==='safety'){add(v==='help'?'Можно отправить: «Мне сейчас очень тяжело. Пожалуйста, позвони мне или побудь со мной. Помоги обратиться за помощью».':'Хорошо, что об этом сказано вслух. Если состояние изменится, обратись к человеку рядом или за срочной помощью.');checkin.phase='end';choices([['Начать новый разговор','restart']]);return}
if(v==='restart'){activeDialogueId=null;pendingTranscript=[];checkin={phase:'mood',mood:null,cause:'',need:'',severity:0,practice:null};state.phase='mood';add('Начнём новый разговор. Как ты сейчас?');choices([['Хорошо','good'],['Нормально','okay'],['Тревожно','anxious'],['Грустно','hard'],['Злюсь','angry'],['Очень тяжело','hard']]);return}
if(checkin.phase==='mood'){checkin.mood=classify(raw,'mood');let h=history();h.push({day:todayKey(),mood:checkin.mood});save(h.slice(-365));add(checkin.mood==='good'?'Рада это слышать. Что сегодня помогло тебе чувствовать себя так?':'Спасибо, что об этом сказано. Что произошло или когда это ощущение появилось? Можно ответить своими словами.');checkin.phase='cause';choices([['Работа или начальник','Работа или начальник'],['Близкие','Близкие'],['Усталость','Усталость'],['Не знаю, почему','Не знаю, почему']]);return}
if(checkin.phase==='cause'){checkin.cause=raw;add('Понимаю. Насколько сильно это сейчас ощущается — от 1 до 4? Если сложно оценить, можно пропустить.');checkin.phase='severity';choices([['1 · немного','1'],['2 · заметно','2'],['3 · сильно','3'],['4 · очень сильно','4'],['Пропустить','skip']]);return}
if(checkin.phase==='severity'){checkin.severity=Number(v)||0;add(checkin.mood==='good'?'Что хочется сделать с этим ощущением?':'Что сейчас было бы нужнее: немного успокоиться, разобраться в ситуации, просто выговориться или отдохнуть?');checkin.phase='need';choices([['Успокоиться','calm'],['Разобраться','clarity'],['Выговориться','talk'],['Отдохнуть','rest']]);return}
if(checkin.phase==='need'){checkin.need=v;if(v==='talk'){add('Я слушаю. Расскажи, что было самым неприятным или важным в этом моменте.');checkin.phase='listen';return}return suggestCheckin()}
if(checkin.phase==='listen'){checkin.cause+='; '+raw;add('Похоже, это действительно задело. Что хотелось бы получить сейчас? Можно выбрать маленький шаг, а можно продолжить разговор.');checkin.phase='afterListen';choices([['Подобрать практику','suggest'],['Рассказать ещё','more'],['Закончить пока','finish']]);return}
if(checkin.phase==='afterListen'){if(v==='more'){add('Я рядом. Что ещё важно сказать?');checkin.phase='listen';return}if(v==='finish'){add('Спасибо, что поделилась или поделился. Можно вернуться, когда захочешь.');checkin.phase='end';choices([['Новый разговор','restart']]);return}return suggestCheckin()}
if(checkin.phase==='suggest'&&v==='talk'){add('Я слушаю. Что хочется рассказать?');checkin.phase='listen';return}if(checkin.phase==='suggest'&&v==='finish'){add('Спасибо за разговор. Вернись, когда захочешь.');checkin.phase='end';choices([['Новый разговор','restart']]);return}
if(checkin.phase==='suggest'&&!v.startsWith('practice:')){checkin.cause+='; '+raw;add('Слышу тебя. Что из этого сейчас важнее всего? Можешь рассказать ещё или выбрать шаг.');checkin.phase='afterListen';choices([['Подобрать практику','suggest'],['Рассказать ещё','more'],['Закончить пока','finish']]);return}
if(v.startsWith('practice:')){let key=v.slice(9);checkin.practice=key;state.currentPractice=key;state.phase='afterPractice';checkin.phase='feedback';openPractice(key);return}
if(checkin.phase==='feedback'){if(['better','same','worse'].includes(v)){let h=history();h.push({day:todayKey(),practice:checkin.practice,outcome:v});save(h.slice(-365));add(v==='better'?'Рада, что стало хоть немного легче. Что именно помогло?':v==='worse'?'Жаль, что стало хуже. Остановимся с этой практикой. Сейчас лучше выбрать более мягкую поддержку или обратиться к близкому человеку.':'Хорошо, что это получилось заметить. Можно попробовать другой шаг или просто остановиться.');checkin.phase='followup';choices([['Другой способ','another'],['Расскажу ещё','talk'],['Закончить','finish']]);return}return}
if(checkin.phase==='followup'){if(v==='another')return suggestCheckin();if(v==='talk'){add('Я слушаю. Что сейчас на первом плане?');checkin.phase='listen';return}add('Спасибо за разговор. Береги свой темп.');checkin.phase='end';choices([['Новый разговор','restart']]);return}
if(checkin.phase==='end'){add('Если захочешь, начнём новый разговор.');choices([['Новый разговор','restart']])}}
function suggestCheckin(){checkin.phase='suggest';let intro=checkin.need==='rest'?'Тогда начнём с очень маленькой паузы.':checkin.need==='clarity'?'Давай отделим то, что произошло, от догадок.':'Можно попробовать один из этих шагов. Выбирай только то, что подходит.';add(intro);choices([...chooseSupport(checkin.mood,checkin.cause,checkin.need),['Хочу рассказать ещё','talk'],['Пока достаточно','finish']]);}
// Override the original branch handler while keeping its message and diary components.
respond=checkinReply;
const initialChoices=document.querySelector('#messages .choices');if(initialChoices){initialChoices.replaceChildren();choices([['Хорошо','good'],['Нормально','okay'],['Тревожно','anxious'],['Грустно','hard'],['Злюсь','angry'],['Очень тяжело','hard']])}
// Feedback from the shared practice modal returns to the new dialogue flow.
askFeedback=function(){if(checkin.practice){add('Как ты сейчас после этого шага?');choices([['Чуть легче','better'],['Пока так же','same'],['Стало хуже','worse']]);checkin.phase='feedback'}else{add('Как ты после этого шага?');choices([['Чуть легче','better'],['Пока так же','same'],['Стало хуже','worse']]);checkin.practice=state.currentPractice;checkin.phase='feedback'}};
const composer=document.querySelector('#form');const mic=document.createElement('button');mic.type='button';mic.className='mic-button';mic.setAttribute('aria-label','Продиктовать сообщение');mic.title='Продиктовать сообщение';mic.textContent='🎙';composer.insertBefore(mic,composer.querySelector('.send'));const voiceStatus=document.createElement('p');voiceStatus.className='voice-status';voiceStatus.setAttribute('role','status');composer.after(voiceStatus);
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;let recognizer=null;
if(!Recognition){mic.disabled=true;mic.title='Голосовой ввод не поддерживается этим браузером';voiceStatus.textContent='Голосовой ввод недоступен в этом браузере. Можно писать текстом.'}
else mic.onclick=()=>{if(recognizer){recognizer.stop();return}if(!sessionStorage.getItem('ryadom-voice-consent')){if(!confirm('Распознавание голоса выполняет браузер и в некоторых браузерах может передавать запись его сервису. Продолжить?'))return;sessionStorage.setItem('ryadom-voice-consent','yes')}let r=new Recognition();recognizer=r;r.lang='ru-RU';r.interimResults=false;r.maxAlternatives=1;mic.classList.add('listening');mic.setAttribute('aria-label','Остановить запись');voiceStatus.textContent='Слушаю. Фраза появится в поле ввода — проверь её перед отправкой.';r.onresult=e=>{let t=e.results[0][0].transcript;document.querySelector('#input').value=(document.querySelector('#input').value+' '+t).trim();document.querySelector('#input').focus();voiceStatus.textContent='Проверь текст и нажми отправить, когда текст устроит.'};r.onerror=e=>{voiceStatus.textContent=e.error==='not-allowed'?'Нет доступа к микрофону. Можно продолжить текстом.':'Не удалось распознать речь. Попробуй ещё раз или напиши текстом.'};r.onend=()=>{recognizer=null;mic.classList.remove('listening');mic.setAttribute('aria-label','Продиктовать сообщение')};try{r.start()}catch{r.onend();voiceStatus.textContent='Не удалось включить микрофон.'}};
