export function notificationCandidates(state,day){
 const items=[];
 for(const id of ['ac','humidifier','purifier']){
  const d=state.devices[id];
  if(!d.on)continue;
  const text=id==='ac'?`設定温度は${d.value}℃です。`:id==='humidifier'?`目標湿度は${d.value}%です。`:'空気をきれいにしています。';
  items.push({source:id,key:`${id}:${d.value}`,title:({ac:'エアコン',humidifier:'加湿器',purifier:'空気清浄機'})[id],text});
 }
 if(state.vacuum==='running')items.push({source:'vacuum',key:'vacuum:running',title:'掃除機',text:'いま、お掃除中です。'});
 for(const task of state.tasks.filter(t=>t.date===day&&!t.done))items.push({source:`task:${task.id}`,key:`task:${task.id}:${task.date}:${task.time}:${task.title}`,title:'今日の予定',text:`${task.time} ${task.title}`});
 return items;
}
export function restoreNotifications(raw){
 try{const data=JSON.parse(raw);return {seen:data?.seen&&typeof data.seen==='object'&&!Array.isArray(data.seen)?Object.fromEntries(Object.entries(data.seen).filter(([k,v])=>typeof v==='string'&&k.length<200&&v.length<400)): {},items:Array.isArray(data?.items)?data.items.filter(n=>n&&typeof n.id==='string'&&typeof n.title==='string'&&typeof n.text==='string'&&Number.isFinite(n.at)&&Math.abs(n.at)<=8640000000000000).slice(0,200).map(n=>({...n,title:n.title.slice(0,80),text:n.text.slice(0,400),read:n.read===true})):[]};}catch{return {seen:{},items:[]};}
}
export function collectNotifications(inbox,candidates,now=Date.now()){
 const seen={};const fresh=[];
 for(const item of candidates){seen[item.source]=item.key;if(inbox.seen[item.source]!==item.key)fresh.push({id:`${now}:${item.key}`,title:item.title,text:item.text,at:now,read:false});}
 return {seen,items:[...fresh,...inbox.items].slice(0,200)};
}
export const unreadCount=inbox=>inbox.items.filter(n=>!n.read).length;
export const notificationSpeech=(inbox,fallback)=>unreadCount(inbox)>=2?`通知が${unreadCount(inbox)}件あります。`:fallback;
export const speechDestination = message => typeof message==='string'&&message.startsWith('今日は「')?'calendar':null;
