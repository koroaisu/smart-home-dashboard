import { readFile, writeFile } from 'node:fs/promises';

// Reuse the existing app's secondary pages and dialogs; the Figma home is independent.
const source = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const icon = (file) => `<img src="/assets/figma-home/${file}.svg" alt="" class="figma-icon">`;
const home = `<section class="page figma-home" id="home-page" aria-label="ホーム" data-node-id="4:2">
  <div class="figma-home-grid">
    <div class="figma-left">
      <section class="figma-frame figma-outdoor" data-node-id="4:3086" aria-labelledby="outdoor-title">
        <h2 id="outdoor-title">屋外環境</h2>
        <dl class="figma-readings"><div><dt>PM2.5</dt><dd>8.4<small>µg/m³</small></dd></div><div><dt>AQI</dt><dd>32</dd></div><div><dt>花粉</dt><dd>少ない</dd></div></dl>
      </section>
      <section class="figma-frame figma-agenda" data-node-id="4:3099" aria-labelledby="agenda-title">
        <div class="figma-card-heading"><h2 id="agenda-title">予定</h2><button id="add-task" aria-label="予定を追加">＋</button></div>
        <div id="task-list" class="task-list" aria-label="今日の予定一覧" tabindex="0"></div><span id="task-count" hidden></span>
      </section>
      <section class="figma-frame figma-indoor" data-node-id="4:3107" aria-labelledby="environment-heading">
        <div class="figma-card-heading"><h2 id="environment-heading">室内環境</h2><span class="figma-badge">快適</span></div>
        <dl class="figma-readings"><div><dt>温度</dt><dd>24.6<small>℃</small></dd></div><div><dt>湿度</dt><dd>48<small>%</small></dd></div><div><dt>CO₂</dt><dd>680<small>ppm</small></dd></div></dl>
      </section>
    </div>
    <section class="figma-center" aria-label="時計とセクメト">
      <div class="figma-clock"><p id="date" data-node-id="4:3124"></p><time id="clock" data-node-id="4:3125">--:--</time><span id="seconds" hidden></span></div>
      <div class="figma-weather"><span>晴れ</span><span>気温 21℃</span><small>最高 23℃　/　最低 15℃</small></div>
      <div id="pet-speech" class="figma-speech" role="status" aria-live="polite" data-node-id="4:3128"><span class="figma-name">セクメト</span><p id="pet-speech-text"></p><img class="figma-tail" src="/assets/figma-home/b831b.svg" alt=""></div>
      <div class="figma-character" data-node-id="4:3135"><button id="pet-speak" aria-label="セクメトのひとこと"><img src="/assets/figma-home/44255.png" alt="ドット絵のエジプト猫、セクメト"></button></div>
    </section>
    <aside class="figma-frame figma-devices" data-node-id="4:3139" aria-labelledby="devices-heading"><h2 id="devices-heading">家電</h2><p id="figma-device-count"></p><div id="device-summary" class="figma-device-list" aria-label="家電一覧"></div></aside>
  </div>
</section>
`;
const header = `<header class="figma-header" data-node-id="4:3"><button id="location-button" aria-label="表示する場所を設定">${icon('c167e')}<span id="location-label">横浜市</span></button><span class="figma-header-weather">晴れ　21℃</span><div class="figma-header-right"><span id="figma-header-date"></span><time id="figma-header-time"></time><button id="fullscreen" aria-label="全画面表示" title="全画面表示">⛶</button></div></header>`;
const tabs = [['ホーム','c167e'],['デバイス','0baaf'],['音楽','1ef47'],['トピック','e375b'],['カレンダー','34563'],['通知','2e391']];
const footer = `<footer class="figma-footer" data-node-id="4:88"><nav class="figma-tabs" aria-label="画面切り替え">${tabs.map(([name,file],i)=>`<button data-page="${i}" aria-label="${name}"${i===0?' aria-current="page"':''}>${icon(file)}<span>${name}</span>${i===5?'<span id="notification-badge" hidden></span>':''}</button>`).join('')}</nav></footer>`;
let html = source.replace('<title>Smart Home Dashboard</title>', '<title>セクメト — Figmaホーム</title>')
  .replace('</head>', '<link rel="stylesheet" href="/figma-home.css"></head>')
  .replace('<body>', '<body class="figma-preview">')
  .replace(/<header[\s\S]*?<\/header>/, header);
const start = html.indexOf('<section class="page home-page"');
const end = html.indexOf('<section class="page device-page"');
if (start < 0 || end < start) throw Error('Original home page markers have changed');
html = html.slice(0, start) + home + html.slice(end);
html = html.replace(/<footer[\s\S]*?<\/footer>/, footer)
  .replace('src="/app.js"', 'src="/figma-home.js"');
await writeFile(new URL('../figma.html', import.meta.url), html);
console.log('Built figma.html from the current secondary pages and dialogs.');
