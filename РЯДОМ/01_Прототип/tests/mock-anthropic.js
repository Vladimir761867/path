const http=require('http');let mode='ok';
http.createServer((rq,rs)=>{if(rq.url==='/mode/bad'){mode='bad';return rs.end('x')}if(rq.url==='/mode/ok'){mode='ok';return rs.end('x')}
 let b='';rq.on('data',c=>b+=c);rq.on('end',()=>{const j=JSON.parse(b);global.last=j;
  if(mode==='bad'){rs.writeHead(500);return rs.end('{}')}
  rs.writeHead(200,{'content-type':'application/json'});
  const t=j.tools[0].name;
  const input=t==='reply_in_role'?{reply:'Ладно, слушаю. Что конкретно ты хочешь обсудить?',tone:'calm',risk:'none'}:t==='give_review'?{strengths:['Ясно назвал просьбу'],suggestions:['Добавь срок'],try_phrase:'Давай договоримся на пятницу.'}:{reply:'x',risk:'none'};
  rs.end(JSON.stringify({content:[{type:'tool_use',name:t,input}],_sys:j.system.slice(0,80)}))})}).listen(9912);
