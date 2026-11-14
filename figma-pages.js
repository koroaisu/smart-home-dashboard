import { dateKey } from './state.js';

const $ = id => document.getElementById(id);
const tracks = [
  { title: '夕暮れのリビング', duration: 248, notes: [261.63, 329.63, 392, 493.88] },
  { title: '窓辺のひかり', duration: 222, notes: [293.66, 369.99, 440, 554.37] },
  { title: 'あたたかいマグカップ', duration: 236, notes: [220, 277.18, 329.63, 440] },
  { title: '月と読書', duration: 260, notes: [246.94, 293.66, 369.99, 493.88] },
  { title: 'おやすみの前に', duration: 198, notes: [196, 246.94, 293.66, 392] },
];
const articles = [
  { category: 'おすすめ', title: '秋の夜を、\n心地よいお部屋で。', source: 'セクメトのおすすめ', body: '照明を少し落として、好きな音楽を。\nくつろぐシーンで照明をやさしくすると、読書や休憩の時間にもぴったりです。\n\nこの画面はデモ記事です。' },
  { category: 'くらし', title: '乾燥する季節、加湿器のお手入れ', source: 'くらしの便り / 17:30', body: 'タンクの水を入れ替え、汚れがないか確認しましょう。\nお手入れの手順は、お使いの機器の説明書に従ってください。\n\nデモ記事' },
  { category: '地域', title: '今週の横浜、おでかけガイド', source: 'まちのニュース / 16:00', body: '公園を散歩したり、近所のカフェでひと休み。\nお出かけ前には実際の天気や営業時間を確認しましょう。\n\n架空の地域記事です。イベント情報との接続はまだありません。' },
  { category: 'ニュース', title: '省エネにつながる、家電の使い方', source: 'くらしの便り / 15:00', body: '使わない部屋の照明や家電を見直してみましょう。\nデバイス画面の「おでかけ」シーンも試せます。\n\nデモ記事' },
];
const initialNotices = [
  { id: 'filter', category: '家電', time: '18:10', title: '空気清浄機のお手入れ時期です', body: 'フィルターにほこりがたまっていないか、確認しましょう。\nお手入れの前に、電源をオフにしてください。', action: 'デバイスを確認する →', target: 'devices' },
  { id: 'humidity', category: '室内環境', time: '17:45', title: '湿度が快適な状態になりました', body: '現在の湿度は48%です。お部屋は快適な状態です。', action: 'ホームで確認する →', target: 'home' },
  { id: 'music', category: '音楽', time: '17:00', title: '今日のおすすめが届きました', body: '「おうち時間」で、ひと息つきませんか。', action: '音楽を聴く →', target: 'music' },
  { id: 'vacuum', category: '家電', time: '09:30', title: '掃除が完了しました', body: '掃除機は待機中です。', read: true, action: 'デバイスを確認する →', target: 'devices' },
  { id: 'calendar', category: 'お知らせ', time: '08:00', title: 'カレンダーを確認しましょう', body: '予定の追加・完了をこのカレンダーで管理できます。外部カレンダーには接続していません。', read: true, action: 'カレンダーを開く →', target: 'calendar' },
];
function element(tag, text, className) { const node = document.createElement(tag); node.textContent = text; if (className) node.className = className; return node; }
const timeText = value => `${Math.floor(value/60)}:${String(Math.floor(value%60)).padStart(2,'0')}`;

export function mountPages(state, save, renderHomeTasks, notify, referenceMode) {
  for (const panel of document.querySelectorAll('.interactive-page .paper-panel, .interactive-page .album-art')) {
    const style = getComputedStyle(panel), width = parseFloat(style.width), height = parseFloat(style.height);
    const fill = panel.classList.contains('album-art') ? '#e6dabc' : '#fff7e3';
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + width + '" height="' + height + '" viewBox="0 0 ' + width + ' ' + height + '"><path d="M8 2H' + (width-8) + 'V8H' + (width-2) + 'V' + (height-8) + 'H' + (width-8) + 'V' + (height-2) + 'H8V' + (height-8) + 'H2V8H8Z" fill="' + fill + '" stroke="#99804e" stroke-width="4"/></svg>';
    panel.style.setProperty('--panel-frame', 'url("data:image/svg+xml,' + encodeURIComponent(svg) + '")');
  }
  const dialog = document.createElement('dialog'); dialog.id = 'content-dialog'; dialog.setAttribute('aria-labelledby','content-dialog-title');
  dialog.innerHTML = '<div class="dialog-heading"><h2 id="content-dialog-title"></h2><button aria-label="閉じる">×</button></div><div id="content-dialog-body"></div>';
  document.body.append(dialog); dialog.querySelector('button').onclick = () => dialog.close();
  function showContent(title, text) { $('content-dialog-title').textContent = title; $('content-dialog-body').textContent = text; dialog.showModal(); }

  // Local synthesized audio makes the demo playable without remote media or accounts.
  let audio, gain, timer, playing = false, trackIndex = 0, elapsed = 0, volume = 35, muted = false, mood = 'relax', noteIndex = 0;
  const music = $('music-screen');
  function renderMusic(progressOnly = false) {
    $('demo-track-title').textContent = tracks[trackIndex].title;
    $('demo-seek').max = tracks[trackIndex].duration; $('demo-seek').value = elapsed;
    $('demo-elapsed').textContent = timeText(elapsed); $('demo-duration').textContent = timeText(tracks[trackIndex].duration);
    $('demo-seek').style.setProperty('--range-progress', (elapsed / tracks[trackIndex].duration * 100) + '%');
    $('demo-play').innerHTML = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="' + (playing ? 'M4 3h3v10H4zM9 3h3v10H9z' : 'M4 2l9 6-9 6z') + '"/></svg>'; $('demo-play').setAttribute('aria-label', playing ? '一時停止' : '再生');
    if (progressOnly) return;
    $('demo-playlist').replaceChildren(...tracks.map((track,i)=>{ const b = element('button','', 'track'); b.setAttribute('aria-pressed',String(i===trackIndex)); b.setAttribute('aria-label',track.title+'を再生'); b.innerHTML = `<span>${i===trackIndex && playing ? '▶' : String(i+1).padStart(2,'0')}</span><span>${track.title}<small>Sekhmet Radio</small></span><small>${timeText(track.duration)}</small>`; b.onclick=()=>startTrack(i); return b; }));
  }
  function soundNote() {
    if (!audio || !playing || audio.state !== 'running') return;
    const osc = audio.createOscillator(), envelope = audio.createGain(), now = audio.currentTime;
    osc.type = 'sine'; osc.frequency.value = tracks[trackIndex].notes[noteIndex++ % 4] * (mood==='focus' ? 2 : 1);
    envelope.gain.setValueAtTime(0,now); envelope.gain.linearRampToValueAtTime(.18,now+.04); envelope.gain.exponentialRampToValueAtTime(.001,now+.65);
    osc.connect(envelope); envelope.connect(gain); osc.start(now); osc.stop(now+.7); osc.onended=()=>{osc.disconnect();envelope.disconnect();};
  }
  async function play() {
    try { const Audio = window.AudioContext || window.webkitAudioContext; if (!Audio) throw Error('audio'); audio ||= new Audio(); if (!gain) {gain=audio.createGain();gain.connect(audio.destination);} await audio.resume(); gain.gain.value=muted?0:volume/100; playing=true; clearInterval(timer); soundNote(); timer=setInterval(()=>{ if(audio.state!=='running')return; elapsed++; if(elapsed>=tracks[trackIndex].duration){trackIndex=(trackIndex+1)%tracks.length;elapsed=0;renderMusic();} soundNote();renderMusic(true); },1000); renderMusic(); }
    catch { playing=false;renderMusic();notify('音声を開始できませんでした。再生ボタンをもう一度押してください。'); }
  }
  function pause() { playing=false;clearInterval(timer);audio?.suspend();renderMusic(); }
  function startTrack(i) { trackIndex=(i+tracks.length)%tracks.length;elapsed=0;noteIndex=0;play(); }
  $('demo-play').onclick=()=>playing?pause():play(); $('demo-prev').onclick=()=>startTrack(trackIndex-1); $('demo-next').onclick=()=>startTrack(trackIndex+1);
  $('demo-seek').oninput=e=>{elapsed=Number(e.target.value);$('demo-elapsed').textContent=timeText(elapsed);$('demo-seek').style.setProperty('--range-progress',(elapsed/tracks[trackIndex].duration*100)+'%');};
  $('demo-volume').oninput=e=>{volume=Number(e.target.value);if(gain)gain.gain.value=muted?0:volume/100;$('demo-volume-value').textContent=volume+'%';$('demo-volume').style.setProperty('--range-progress',volume+'%');};
  $('demo-mute').onclick=()=>{muted=!muted;if(gain)gain.gain.value=muted?0:volume/100;$('demo-mute').setAttribute('aria-pressed',String(muted));$('demo-mute').setAttribute('aria-label',muted?'ミュートを解除':'ミュート');};
  music.querySelectorAll('[data-mood]').forEach(b=>b.onclick=()=>{mood=b.dataset.mood;music.querySelectorAll('[data-mood]').forEach(v=>v.setAttribute('aria-pressed',String(v===b)));$('demo-mood-note').textContent=mood==='focus'?'軽やかな高音で、集中する時間。':'やさしい音で、くつろぐ時間。';play();});renderMusic();
  $('demo-volume').style.setProperty('--range-progress','35%');
  document.addEventListener('visibilitychange',()=>{if(document.hidden && playing)pause();});

  const topics = $('topics-screen');
  function renderTopics(category='おすすめ') {
    const featured=articles.find(a=>category==='おすすめ'||a.category===category);
    const panel=$('topic-feature');panel.replaceChildren(element('span','今日のピックアップ','tag'),element('h2',featured.title),element('p','照明を少し落として、好きな音楽を。\nセクメトと見つける、くつろぎの時間。'));
    const read=element('button','読む →');read.onclick=()=>showContent(featured.title,featured.body);panel.append(read);
    const list=articles.filter(a=>a!==featured&&(category==='おすすめ'||a.category===category));
    $('topic-list').replaceChildren(...list.map(a=>{const b=element('button','', 'topic-row');b.append(element('span',a.category,'tag'),element('p',a.title),element('small',a.source));b.onclick=()=>showContent(a.title,a.body);return b;}));
    if(!list.length)$('topic-list').append(element('p','このカテゴリの記事は、ピックアップでお読みいただけます。','empty-state'));
    topics.querySelectorAll('[data-topic-filter]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.topicFilter===category)));
  }
  topics.querySelectorAll('[data-topic-filter]').forEach(b=>b.onclick=()=>renderTopics(b.dataset.topicFilter));renderTopics();

  let selectedDate=dateKey(), month=new Date().getMonth(), year=new Date().getFullYear();
  if(referenceMode){selectedDate='2026-11-10';month=10;year=2026;}
  const calendar=$('calendar-screen');
  function addTask(){if(state.tasks.length>=100){notify('予定は100件まで追加できます。');return;}$('task-form').elements.date.value=selectedDate;$('task-dialog').showModal();$('task-form').elements.title.focus();}
  $('calendar-add').onclick=addTask;$('calendar-add-day').onclick=addTask;
  function changeMonth(delta){const d=new Date(year,month+delta,1);year=d.getFullYear();month=d.getMonth();renderCalendar();}
  $('calendar-prev').onclick=()=>changeMonth(-1);$('calendar-next').onclick=()=>changeMonth(1);$('calendar-today').onclick=()=>{const d=new Date();year=d.getFullYear();month=d.getMonth();selectedDate=dateKey();renderCalendar();};
  function renderCalendar(){
    $('calendar-month').textContent=`${year}年 ${month+1}月`;
    const grid=$('calendar-days');grid.replaceChildren(...['月','火','水','木','金','土','日'].map(s=>element('span',s,'weekday')));
    const first=new Date(year,month,1);const offset=(first.getDay()+6)%7;
    for(let i=0;i<42;i++){const d=new Date(year,month,i-offset+1), key=dateKey(d), button=element('button',String(d.getDate()));button.classList.toggle('outside',d.getMonth()!==month);button.classList.toggle('sunday',d.getDay()===0);button.classList.toggle('has-tasks',state.tasks.some(t=>t.date===key));button.setAttribute('aria-pressed',String(key===selectedDate));button.setAttribute('aria-label',new Intl.DateTimeFormat('ja-JP',{dateStyle:'full'}).format(d));if(key===dateKey())button.append(element('small','今日'));button.onclick=()=>{selectedDate=key;if(d.getMonth()!==month){year=d.getFullYear();month=d.getMonth();}renderCalendar();};grid.append(button);}
    $('calendar-selected').textContent=new Intl.DateTimeFormat('ja-JP',{month:'long',day:'numeric',weekday:'long'}).format(new Date(selectedDate+'T12:00:00'));
    $('calendar-date-tag').textContent=selectedDate===dateKey()?'今日':'選択日';
    const tasks=state.tasks.filter(t=>t.date===selectedDate).sort((a,b)=>a.time.localeCompare(b.time));
    $('calendar-agenda').replaceChildren(...tasks.map(t=>{const row=element('label','',`calendar-task${t.done?' done':''}`),check=document.createElement('input');check.type='checkbox';check.checked=t.done;check.setAttribute('aria-label',t.title+'を完了');check.onchange=()=>{t.done=check.checked;save();renderHomeTasks();renderCalendar();};row.append(check,element('span',t.time+' '+t.title));return row;}));
    if(!tasks.length){$('calendar-agenda').append(element('p',selectedDate===dateKey()?'今日は予定がありません':'この日は予定がありません'),element('small','自分のペースで過ごしましょう。','calendar-empty-note'));}
    const upcoming=state.tasks.filter(t=>!t.done&&t.date>=dateKey()).sort((a,b)=>(a.date+a.time).localeCompare(b.date+b.time)).slice(0,10);
    $('calendar-upcoming').replaceChildren(...upcoming.map(t=>{const row=element('div','','upcoming-item');row.append(element('small',t.date.slice(5).replace('-','/')+'　'+t.time),element('p',t.title));return row;}));
    if(!upcoming.length)$('calendar-upcoming').append(element('p','これからの予定はありません。','muted'));
  }
  $('task-dialog').addEventListener('close',renderCalendar);renderCalendar();

  let readIds=new Set(), noticeFilter='すべて', selectedNotice='filter', noticeEnabled=true;
  const noticeStorage='sekhmet-figma-notices-v1';
  if(!referenceMode)try{const saved=JSON.parse(localStorage.getItem(noticeStorage));if(Array.isArray(saved?.read))readIds=new Set(saved.read.filter(id=>initialNotices.some(n=>n.id===id)));if(typeof saved?.enabled==='boolean')noticeEnabled=saved.enabled;}catch{}
  const isRead=n=>n.read||readIds.has(n.id);
  function saveNotices(){if(referenceMode)return;try{localStorage.setItem(noticeStorage,JSON.stringify({read:[...readIds],enabled:noticeEnabled}));}catch{notify('通知設定を保存できませんでした。');}}
  const notices=$('notifications-screen');
  function renderNotices(){
    const unread=initialNotices.filter(n=>!isRead(n)).length;
    const dot=document.querySelector('.unread-dot');dot.hidden=unread===0||!noticeEnabled;dot.setAttribute('aria-label',`未読${unread}件`);
    notices.querySelectorAll('[data-notice-filter]').forEach(b=>{b.setAttribute('aria-pressed',String(b.dataset.noticeFilter===noticeFilter));b.textContent=b.dataset.noticeFilter==='未読'?`未読 ${unread}`:b.dataset.noticeFilter;});
    const filtered=initialNotices.filter(n=>noticeFilter==='すべて'||noticeFilter==='未読'&&!isRead(n)||n.category===noticeFilter);
    if(!selectedNotice)selectedNotice=filtered[0]?.id;
    $('notices-list').replaceChildren(...filtered.map(n=>{const b=element('button','', 'notification-row');b.setAttribute('aria-pressed',String(n.id===selectedNotice));if(!isRead(n))b.append(element('span','','unread-marker'));b.append(element('span',n.category,'tag'),element('span',n.time,'notice-time'),element('strong',n.title),element('small',n.body.split('\n')[0]));b.onclick=()=>{selectedNotice=n.id;readIds.add(n.id);saveNotices();renderNotices();};return b;}));
    const detail=$('notice-detail');detail.replaceChildren();const n=initialNotices.find(n=>n.id===selectedNotice);
    if(!n){$('notices-list').append(element('p','表示する通知はありません。','empty-state'));detail.append(element('p','通知を選ぶと詳細が表示されます。','empty-state'));return;}
    detail.append(element('span',n.category+'のお知らせ','tag'),element('p','今日 '+n.time,'notice-date'),element('h2',n.id==='filter'?'空気清浄機の\nお手入れ時期です':n.title),element('p',n.body,'body'));const action=element('button',n.action,'primary wide');action.onclick=()=>{readIds.add(n.id);saveNotices();renderNotices();location.hash='#'+n.target;};detail.append(action);
  }
  notices.querySelectorAll('[data-notice-filter]').forEach(b=>b.onclick=()=>{noticeFilter=b.dataset.noticeFilter;selectedNotice=null;renderNotices();});
  $('notices-read-all').onclick=()=>{initialNotices.forEach(n=>readIds.add(n.id));if(noticeFilter==='未読')selectedNotice=null;saveNotices();renderNotices();notify('すべての通知を既読にしました。');};
  $('notice-settings').onclick=()=>{showContent('通知設定','');const label=element('label',''),check=document.createElement('input');check.type='checkbox';check.checked=noticeEnabled;check.onchange=()=>{noticeEnabled=check.checked;saveNotices();renderNotices();};label.append(check,element('span','ナビに未読マークを表示する'));$('content-dialog-body').append(label);};renderNotices();
  return { renderCalendar };
}
