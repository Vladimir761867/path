// Places are explicitly recorded by the person. No background location tracking.
const PLACE_VISITS_KEY='ryadom-place-visits-v1';
const PLACE_FAVORITES_KEY='ryadom-place-favorites-v1';
function placeVisits(){try{const value=JSON.parse(localStorage.getItem(PLACE_VISITS_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function placeFavorites(){try{const value=JSON.parse(localStorage.getItem(PLACE_FAVORITES_KEY)||'[]');return Array.isArray(value)?value:[]}catch{return []}}
function placeKey(name,area){return (name.trim()+'|'+area.trim()).toLocaleLowerCase('ru-RU')}
function savePlaceVisits(rows){localStorage.setItem(PLACE_VISITS_KEY,JSON.stringify(rows.slice(-1000)));renderCalendar()}
function placeElement(tag,className,text){const node=document.createElement(tag);if(className)node.className=className;if(text!==undefined)node.textContent=text;return node}
function renderPlacesForDay(panel,day){
  const section=placeElement('section','diary-places');
  const heading=placeElement('div','diary-places-heading');heading.append(placeElement('h5','', 'Места этого дня'));
  const count=placeVisits().filter(x=>x.day===day).length;
  heading.append(placeElement('span','',count?count+' '+(count===1?'место':count<5?'места':'мест'):'Пока пусто'));
  section.append(heading);
  const rows=placeVisits().filter(x=>x.day===day).sort((a,b)=>(a.time||'').localeCompare(b.time||''));
  if(!rows.length)section.append(placeElement('p','places-empty','Добавь посещённое место. Приложение не отслеживает перемещения автоматически.'));
  rows.forEach(row=>{
    const card=placeElement('article','diary-place-card');
    const top=placeElement('div','diary-place-top');
    const icon=placeElement('span','place-kind-icon',({cafe:'☕',park:'✿',walk:'↗',culture:'◇',other:'⌖'})[row.kind]||'⌖');
    const info=placeElement('div','diary-place-info');info.append(placeElement('strong','',row.name));
    const meta=[row.time,row.area,({cafe:'Кафе',park:'Парк',walk:'Прогулка',culture:'Культура',other:'Другое'})[row.kind]].filter(Boolean).join(' · ');
    info.append(placeElement('small','',meta));top.append(icon,info);
    const favorite=placeElement('button','place-favorite'+(placeFavorites().includes(placeKey(row.name,row.area||''))?' active':''),placeFavorites().includes(placeKey(row.name,row.area||''))?'♥':'♡');
    favorite.type='button';favorite.title='Любимое место';favorite.setAttribute('aria-label',placeFavorites().includes(placeKey(row.name,row.area||''))?'Убрать из любимых':'Добавить в любимые');
    favorite.onclick=()=>{const key=placeKey(row.name,row.area||'');let all=placeFavorites();all=all.includes(key)?all.filter(x=>x!==key):[...all,key];localStorage.setItem(PLACE_FAVORITES_KEY,JSON.stringify(all));renderCalendarDetail()};top.append(favorite);card.append(top);
    if(row.feeling||row.note){const line=placeElement('p','diary-place-memory',[row.feeling,row.note].filter(Boolean).join(' · '));card.append(line)}
    const actions=placeElement('div','diary-place-actions');
    const edit=placeElement('button','', 'Изменить');edit.type='button';edit.onclick=()=>showPlaceForm(section,day,row);
    const remove=placeElement('button','', 'Удалить');remove.type='button';remove.onclick=()=>askConfirm('Удалить «'+row.name+'» из этого дня?',remove,()=>savePlaceVisits(placeVisits().filter(x=>x.id!==row.id)));
    actions.append(edit,remove);card.append(actions);section.append(card)
  });
  const add=placeElement('button','add-place-button','＋ Добавить место');add.type='button';add.onclick=()=>showPlaceForm(section,day);section.append(add);
  section.append(placeElement('p','place-privacy','Места записываешь только ты. Они остаются на этом устройстве и не привязаны к игровому прогрессу.'));
  panel.append(section)
}
function showPlaceForm(section,day,existing){
  section.querySelector('.place-entry-form')?.remove();
  const form=placeElement('form','place-entry-form');
  const title=placeElement('h6','',existing?'Изменить место':'Добавить место');form.append(title);
  const field=(caption,type,value,max)=>{const label=placeElement('label','',caption);const input=document.createElement('input');input.type=type;input.value=value||'';if(max)input.maxLength=max;label.append(input);form.append(label);return input};
  const name=field('Название *','text',existing?.name,80);name.required=true;name.placeholder='Например, любимая кофейня';
  const area=field('Район или адрес','text',existing?.area,90);area.placeholder='Необязательно';
  const time=field('Примерное время','time',existing?.time);
  const typeLabel=placeElement('label','', 'Что это за место?');const kind=document.createElement('select');[['cafe','Кафе'],['park','Парк'],['walk','Прогулка'],['culture','Культура'],['other','Другое']].forEach(([value,label])=>{const option=new Option(label,value);kind.append(option)});kind.value=existing?.kind||'other';typeLabel.append(kind);form.append(typeLabel);
  if(!existing){const favorites=placeFavorites(),seen=new Set(),past=[...placeVisits()].reverse().filter(row=>{const key=placeKey(row.name,row.area||'');if(!favorites.includes(key)||seen.has(key))return false;seen.add(key);return true}).slice(0,5);if(past.length){const quick=placeElement('div','place-quick');quick.append(placeElement('span','', 'Или выбери любимое:'));past.forEach(row=>{const button=placeElement('button','',row.name);button.type='button';button.onclick=()=>{name.value=row.name;area.value=row.area||'';kind.value=row.kind||'other';name.focus()};quick.append(button)});form.insertBefore(quick,name.parentElement)}}
  const feelingLabel=placeElement('label','', 'Как тебе там было?');const feeling=document.createElement('select');[['','Необязательно'],['Спокойно','Спокойно'],['Радостно','Радостно'],['Уютно','Уютно'],['Тревожно','Тревожно'],['Грустно','Грустно'],['По-разному','По-разному']].forEach(([value,label])=>feeling.append(new Option(label,value)));feeling.value=existing?.feeling||'';feelingLabel.append(feeling);form.append(feelingLabel);
  const noteLabel=placeElement('label','', 'Что запомнилось?');const note=document.createElement('textarea');note.maxLength=200;note.value=existing?.note||'';note.placeholder='Необязательно';noteLabel.append(note);form.append(noteLabel);
  const buttons=placeElement('div','place-form-actions');const cancel=placeElement('button','secondary','Отмена');cancel.type='button';cancel.onclick=()=>form.remove();const save=placeElement('button','primary','Сохранить место');save.type='submit';buttons.append(cancel,save);form.append(buttons);
  form.onsubmit=e=>{e.preventDefault();const value=name.value.trim().replace(/\s+/g,' ');if(!value)return;const row={id:existing?.id||'p-'+Date.now()+'-'+Math.random().toString(36).slice(2,7),day,name:value,area:area.value.trim(),time:time.value,kind:kind.value,feeling:feeling.value,note:note.value.trim()};const all=placeVisits().filter(x=>x.id!==row.id);all.push(row);savePlaceVisits(all)};
  section.querySelector('.add-place-button').before(form);name.focus();form.scrollIntoView({behavior:'smooth',block:'nearest'})
}
