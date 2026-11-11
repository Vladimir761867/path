const _tDiary=s=>(window.RyadomI18n?window.RyadomI18n.t(s):s);
// Calendar of real check-ins and conversations. Game state is never read here.
renderCalendar=function(){
  const year=calendarMonth.getFullYear(),month=calendarMonth.getMonth();
  const grid=document.querySelector('#calendarGrid');
  grid.replaceChildren();
  document.querySelector('#monthTitle').textContent=new Intl.DateTimeFormat((window.RYADOM_LOCALE||'ru-RU'),{month:'long',year:'numeric'}).format(calendarMonth);
  document.querySelector('#nextMonth').disabled=year===new Date().getFullYear()&&month===new Date().getMonth();
  const offset=(new Date(year,month,1).getDay()+6)%7;
  for(let i=0;i<offset;i++){const blank=document.createElement('span');blank.setAttribute('aria-hidden','true');grid.append(blank)}
  const entries=history(),daily=checkins(),sessions=dialogues(),visits=placeVisits();
  for(let day=1;day<=new Date(year,month+1,0).getDate();day++){
    const key=localDay(year,month,day);
    const mood=[...entries].reverse().find(x=>x.day===key&&x.mood);
    const check=daily.find(x=>x.day===key);
    const hasDialogue=sessions.some(x=>x.day===key);
    const hasPlace=visits.some(x=>x.day===key);
    const button=document.createElement('button');
    button.className='calendar-day'+(mood?' mood-'+mood.mood:'')+(check?' has-data':'')+(hasDialogue?' has-dialogue':'')+(hasPlace?' has-place':'')+(key===todayKey()?' today':'')+(key===selectedDay?' selected':'');
    button.disabled=key>todayKey();
    button.setAttribute('aria-label',new Intl.DateTimeFormat((window.RYADOM_LOCALE||'ru-RU'),{weekday:'long',day:'numeric',month:'long'}).format(new Date(year,month,day))+(mood?', '+_tDiary(moodNames[mood.mood]):'')+(hasDialogue?', '+_tDiary('есть разговор'):'')+(check?', '+_tDiary('есть отметка состояния'):'')+(hasPlace?', '+_tDiary('есть посещённые места'):''));
    const number=document.createElement('b');number.textContent=day;button.append(number);
    if(check||hasDialogue||hasPlace){
      const dots=document.createElement('span');dots.className='day-dots';
      if(hasDialogue){const dot=document.createElement('i');dot.className='chat-dot';dots.append(dot)}
      if(check){const dot=document.createElement('i');if(Number(check.anxiety)>=3||Number(check.sadness)>=3||Number(check.restlessness)>=3)dot.className='high';dots.append(dot)}
      if(hasPlace){const dot=document.createElement('i');dot.className='place-dot';dots.append(dot)}
      button.append(dots);
    }
    button.onclick=()=>{selectedDay=key;renderCalendar()};
    grid.append(button);
  }
  renderCalendarDetail();
};
renderCalendarDetail=function(){
  const panel=document.querySelector('#calendarDetail');panel.replaceChildren();
  const title=document.createElement('h4');
  title.textContent=new Intl.DateTimeFormat((window.RYADOM_LOCALE||'ru-RU'),{weekday:'long',day:'numeric',month:'long'}).format(new Date(selectedDay+'T12:00:00'));
  panel.append(title);
  const entries=history().filter(x=>x.day===selectedDay);
  const mood=[...entries].reverse().find(x=>x.mood);
  const check=checkins().find(x=>x.day===selectedDay);
  const sessions=dialogues().filter(x=>x.day===selectedDay);
  if(!mood&&!check&&!sessions.length&&!placeVisits().some(x=>x.day===selectedDay)){const empty=document.createElement('p');empty.textContent='Пока нет записей за этот день. Можно добавить место, которое тебе запомнилось.';panel.append(empty)}
  if(mood){const p=document.createElement('p');p.textContent='В диалоге: '+moodNames[mood.mood];panel.append(p)}
  if(check){
    [['Тревога','anxiety'],['Грусть','sadness'],['Беспокойство','restlessness'],['Спокойствие','calm']].forEach(([name,key])=>{
      const row=document.createElement('div');row.className='detail-metric';
      const label=document.createElement('span');label.textContent=name;
      const value=document.createElement('strong');value.textContent=check[key]+' / 4';
      row.append(label,value);panel.append(row);
    });
    if(check.note){const note=document.createElement('p');note.className='detail-note';note.textContent=check.note;panel.append(note)}
  }
  renderPlacesForDay(panel,selectedDay);
  if(sessions.length){
    const archive=document.createElement('div');archive.className='dialogue-archive';
    const heading=document.createElement('h5');heading.textContent='Разговоры за этот день';archive.append(heading);
    sessions.forEach(session=>{
      const block=document.createElement('div');block.className='archive-session';
      const time=document.createElement('div');time.className='archive-time';
      time.textContent=new Intl.DateTimeFormat((window.RYADOM_LOCALE||'ru-RU'),{hour:'2-digit',minute:'2-digit'}).format(new Date(session.startedAt));
      block.append(time);
      const messages=document.createElement('div');messages.className='archive-messages';
      (session.messages||[]).forEach(item=>{
        const bubble=document.createElement('div');bubble.className='archive-bubble'+(item.role==='me'?' me':'');
        const who=document.createElement('small');who.textContent=item.role==='me'?'Ты':'Рядом';
        const body=document.createElement('span');body.textContent=item.text;
        bubble.append(who,body);messages.append(bubble);
      });
      block.append(messages);archive.append(block);
    });
    const remove=document.createElement('button');remove.className='archive-delete';remove.textContent='Удалить разговоры за этот день';
    remove.onclick=()=>askConfirm('Удалить тексты разговоров за '+title.textContent+'? Отметки состояния останутся.',remove,()=>{
      const removed=sessions.map(x=>x.id);
      localStorage.setItem('ryadom-dialogues-v1',JSON.stringify(dialogues().filter(x=>x.day!==selectedDay)));
      if(removed.includes(activeDialogueId)){activeDialogueId=null;pendingTranscript=[]}
      renderCalendar();
    });
    archive.append(remove);panel.append(archive);
  }
  const practice=entries.filter(x=>x.practice);
  if(practice.length){const p=document.createElement('p');p.textContent='Практики: '+practice.map(x=>(practices[x.practice]?.title||x.practice)+' — '+({better:'чуть легче',same:'без изменений',worse:'стало хуже'}[x.outcome]||'без оценки')).join('; ');panel.append(p)}
};
renderCalendar();
document.querySelector('#clearData').onclick=()=>askConfirm('Удалить разговоры, отметки, места и любимые места из дневника на этом устройстве? Игровой прогресс останется.',document.querySelector('#clearData'),()=>{
  ['ryadom-history','ryadom-checkins','ryadom-dialogues-v1',PLACE_VISITS_KEY,PLACE_FAVORITES_KEY].forEach(key=>localStorage.removeItem(key));
  activeDialogueId=null;pendingTranscript=[];renderHistory();renderCalendar();
});
