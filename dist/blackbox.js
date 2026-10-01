import {fresh,restore,command,advance,active,part,liveActions,protection,suggestions,selectEncounter,virusIntegrity} from './combat.mjs';
import {CONFIG,ABILITIES,FAMILIES,MUTATIONS,FIXTURES,TICKER} from './data.mjs';
import {LESSONS,beginTutorial,submitTutorial,advanceTutorial,continueTutorial,leaveTutorial} from './tutorial.mjs';
import {castState,castPresentation,abilityReadiness} from './combat-feedback.mjs';
import {intelSnapshot,targetTags,recentCards,completionOptions} from './combat-view.mjs';
import {visualMarkup,subsystemMarkup,integrityMarkup,VIEWS} from './encounter-view.mjs';
const $=id=>document.getElementById(id),storageKey='blackbox-v5';
// Keep the live action controls intact when the workspace is re-rendered.
const actionPanel=$('player-action'),clockToggle=$('reading-toggle');
const requestedPlaytest=new URLSearchParams(location.search).get('playtest'),playtest=Object.hasOwn(FIXTURES,requestedPlaytest)?requestedPlaytest:null;
let saved;if(!playtest)try{saved=JSON.parse(localStorage.getItem(storageKey)||localStorage.getItem('blackbox-v4'));}catch{}
let state=playtest?fresh():restore(saved),module=active(state)?'combat':'home',selected='shell',history=[],historyIndex=0,completion=null,lastRender='',lastTime=performance.now(),notificationTimer,seenEvent=0,artRenderer=null,pinned=false;
let virusView='3D';
let tutorial=null,commandNotice='',intelOpen=false,scanUntil=0,scanMessage='',intelNewUntil=0;
const castFlashes=new Map();
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const escape=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const motion=()=>state.settings.motion&&!reduced.matches;
const fileLabel=()=>({accessible:'Accessible',locked:'Locked in combat',required:'Recovery required',recovering:`Recovering · ${Math.max(0,Math.ceil((state.server.recoverAt-Date.now())/1000))}s`})[state.server.files];
function save(){if(playtest)return;try{localStorage.setItem(storageKey,JSON.stringify(tutorial?tutorial.campaign:state));}catch{document.querySelector('.build-footer span').textContent='SAVING UNAVAILABLE · THIS SESSION ONLY';}}
function prepare(text){$('command-input').value=text;completion=null;syncInputTarget();$('command-input').focus();renderSuggestions();}
function syncInputTarget(){const match=$('command-input').value.trim().toLowerCase().match(/^(?:spike|exploit|overload)\s+(.+)$/);if(!match||!state.encounter)return;if(match[1]==='all'){selected='all';renderReadiness();return;}const targets=state.encounter.virus.components.concat(state.encounter.fragments).filter(c=>c.integrity>0);const matches=targets.filter(c=>c.id.startsWith(match[1]));if(matches.length===1&&selected!==matches[0].id){selected=matches[0].id;renderContext();renderReadiness();$('workspace').querySelectorAll('[data-target]').forEach(b=>b.classList.toggle('selected',b.dataset.target===selected));}}
function scrollLatest(){$('feed').scrollTop=$('feed').scrollHeight;$('new-output').hidden=true;}
function finishAnimations(){for(const animation of $('feed').getAnimations({subtree:true}))if(Number.isFinite(animation.effect?.getComputedTiming().endTime))animation.finish();}
function appendEvents(events,replay=false,previousCast=null){
 for(const event of events){
  if(event.id<=seenEvent)continue;seenEvent=event.id;
  if(!replay&&event.type==='warning')commandNotice=event.message;
  if(!replay&&event.type==='cancelled'&&event.source)castFlashes.set(event.source,{until:performance.now()+2200,progress:previousCast?.enemies.find(a=>a.source===event.source)?.progress||0,text:event.message.includes('interrupted')?'INTERRUPTED':'SOURCE DISABLED'});
  if(!replay&&event.type==='scan'){
   intelNewUntil=performance.now()+4500;scanMessage=event.message.replace(/^SCAN \/ /,'');scanUntil=intelNewUntil;
   const source=intelSnapshot(state).source;
   artRenderer?.highlight(source);document.querySelector(`[data-target="${source}"]`)?.classList.add('scan-flash');
  }
  if(!replay&&['damage','destroyed'].includes(event.type)&&event.target){
   const target=document.querySelector(`[data-target="${event.target}"]`);if(target&&motion()){target.classList.remove('damage-flash');requestAnimationFrame(()=>target.classList.add('damage-flash'));}
   artRenderer?.hit(event.target,event.amount||0);
  }
  if(!replay&&['victory','crashed'].includes(event.type))bleep(event.type==='victory'?440:220);
 }
 renderRecent();renderContext();renderFeedback();
}
function renderRecent(){
 const cards=recentCards(state.logs);
 $('recent-event-count').textContent=`(${cards.length})`;
 $('feed').innerHTML=cards.length?cards.map((e,i)=>`<article class="recent-card ${e.type} ${i===0?'latest':''}" title="${escape(e.message)}"><span class="recent-symbol" aria-hidden="true">${({damage:'↯',corruption:'◇',cancelled:'⊘',destroyed:'×',scan:'⌕',trace:'◎',hostile:'!',victory:'✓',crashed:'!'})[e.type]||'›'}</span><div><small>CYCLE ${String(e.cycle).padStart(2,'0')}</small><strong>${escape(e.title)}</strong><p>${escape(e.detail)}</p></div></article>`).join(''):'<p class="recent-empty">No recent events.</p>';
}
function notify(text,type){$('notification').textContent=text;$('notification').hidden=false;clearTimeout(notificationTimer);notificationTimer=setTimeout(()=>$('notification').hidden=true,4500);bleep(type==='intrusion'?220:440);}
let audioContext;
function renderFeedback(){
 const cast=castState(state),now=performance.now();$('cast-deck').hidden=!cast;
 $('reading-toggle').hidden=!cast||(!!tutorial&&tutorial.phase!=='running');$('reading-toggle').textContent=cast?.paused?'Resume':'Pause';
 $('cancel-action').disabled=!cast||!state.encounter.queue;
 if(cast){
  $('player-cast-name').textContent=cast.player.name;
  $('player-cast-time').textContent=state.encounter.queue?cast.remaining.toFixed(1)+'s':'—';
  $('player-cast-progress').value=state.encounter.queue?cast.player.progress*100:0;
  $('player-cast-description').textContent=tutorial?.phase==='ready'?'Clock starts with your lesson command.':cast.player.description;
  const actionIcon=Object.hasOwn(ABILITIES,state.encounter.queue?.ability)&&state.encounter.queue.ability!=='lock files'?state.encounter.queue.ability:'command';
  actionPanel.style.setProperty('--action-icon','url("ui/icons/'+actionIcon+'.svg")');
  $('cast-deck').title=cast.player.description;
  for(const c of state.encounter.virus.components.concat(state.encounter.fragments)){
   const row=document.querySelector('.subsystem-row[data-target="'+c.id+'"]');if(!row)continue;
   const action=state.encounter.virus.actions.find(a=>a.source===c.id),live=cast.enemies.find(a=>a.source===c.id),flash=castFlashes.get(c.id),interrupted=!!flash&&flash.until>now,timer=row.querySelector('.subsystem-timer');
   const remaining=live?.seconds??(c.kind==='fragment'&&c.integrity?cast.remaining:null);
   row.classList.toggle('cast-interrupted',interrupted);row.classList.toggle('cast-imminent',remaining!==null&&remaining<=5&&!cast.paused&&!interrupted);
   timer.style.setProperty('--timer-progress',((interrupted?flash.progress:live?.progress??0)*100)+'%');
   timer.querySelector('strong').textContent=interrupted?'STOPPED':!c.integrity?'OFFLINE':remaining!==null?remaining.toFixed(1)+'s':'—';
   timer.querySelector('small').textContent=interrupted?flash.text:!c.integrity?'DISABLED':remaining!==null?'NEXT ATTACK':'ARMOR';
   timer.setAttribute('aria-label',c.name+': '+(interrupted?flash.text:remaining!==null?remaining.toFixed(1)+' seconds until '+(action?.name||'fragment attack'):!c.integrity?'disabled':'armor'));
  }
 }
 if($('rotation-label'))$('rotation-label').textContent=motion()?'ROTATING':'STATIC';
 if($('scan-discovery')){$('scan-discovery').hidden=now>=scanUntil;$('scan-discovery').textContent=now<scanUntil?'SCAN COMPLETE / '+scanMessage:'';}
 if($('intel-new'))$('intel-new').hidden=now>=intelNewUntil;
 if($('intel-panel'))$('intel-panel').classList.toggle('new-intel',now<intelNewUntil);
 renderReadiness();$('command-notice').hidden=!commandNotice;$('command-notice').textContent=commandNotice;
}
function renderReadiness(){
 const host=$('ability-readiness');host.hidden=!active(state);if(!active(state))return;
 const ids=['spike','exploit','overload','interrupt','scan','trace'],labels=['Deal damage','Expose target','Heavy damage','Stop enemy action','Reveal intel','Origin progress'],icons=['╱','⬡','ϟ','◈','⌕','◎'];
 if(!host.children.length){
  host.innerHTML='<div class="readiness-heading"><span>ABILITIES</span><strong id="input-target"></strong></div><div class="readiness-buttons">'+ids.map((id,i)=>`<button type="button" data-ready="${id}" title="${escape(ABILITIES[id].description)}"><small class="ability-number">[${i+1}]</small><span class="ability-icon" aria-hidden="true">${icons[i]}</span><div><code>${ABILITIES[id].name}</code><span class="ability-purpose">${labels[i]}</span><span class="ability-state"></span></div></button>`).join('')+'</div>';
  host.querySelectorAll('[data-ready]').forEach(b=>b.onclick=()=>prepareAbility(b.dataset.ready));
 }
 $('input-target').textContent='Target / '+(selected==='all'?'All subsystems':part(state,selected)?.name||state.encounter.fragments.find(f=>f.id===selected)?.name||'—');
 host.querySelectorAll('[data-ready]').forEach(b=>{
  const status=abilityReadiness(state,b.dataset.ready,selected);b.setAttribute('aria-disabled',String(!status.ready));b.classList.toggle('recharging',status.cycles>0);
  b.querySelector('.ability-state').textContent=status.ready?'Ready':status.label;b.title=status.reason||ABILITIES[b.dataset.ready].description;
 });
}
function prepareAbility(id){
 const status=abilityReadiness(state,id,selected);
 if(status.cycles>0||['No cast','Known','Complete'].includes(status.label)){commandNotice=status.reason;renderFeedback();$('command-input').focus();return;}
 prepare(id+(ABILITIES[id].target==='component'?' ':''));
}
function tutorialMarkup(){
 const lesson=LESSONS[tutorial.index],review=tutorial.phase==='review',complete=tutorial.phase==='complete';
 return `<section class="lesson-card" aria-label="Guided combat lesson"><div class="lesson-heading"><span class="eyebrow">PRACTICE / ${complete?'COMPLETE':`${tutorial.index+1} OF ${LESSONS.length}`}</span><button id="exit-tutorial">${complete?'Return to server':'Exit practice'}</button></div><h2>${complete?'You know the combat loop.':lesson.title}</h2><p>${complete||review?tutorial.result:lesson.explain}</p>${complete?'<p>Next, try a regular encounter. Trace and File Lock are optional tools; the Tutorial module explains when they help.</p><button id="replay-tutorial">Replay practice</button>':review?'<button class="primary" id="continue-lesson">Continue lesson →</button>':tutorial.phase==='running'?'<div class="lesson-status">Watch the cast bars. This cycle will pause after it resolves.</div>':`<button class="lesson-command" id="prepare-lesson">Prepare <code>${lesson.command}</code></button><small>Then press Enter in the command line.</small>`}</section>`;
}
function resetTranscript(){seenEvent=0;commandNotice='';castFlashes.clear();scanUntil=0;intelNewUntil=0;$('feed').replaceChildren();appendEvents(state.logs.slice(-100),true);}
function startTutorial(){
 syncClock();const campaign=tutorial?leaveTutorial(tutorial):state;tutorial=beginTutorial(campaign);state=tutorial.state;module='tutorial';selected=LESSONS[0].target;lastTime=performance.now();
 toggleAbilities(false);resetTranscript();render(true);save();$('command-input').value='';$('command-input').focus();renderSuggestions();
}
function endTutorial(){
 if(!tutorial)return;state=leaveTutorial(tutorial);tutorial=null;module=active(state)?'combat':'home';selected='shell';lastTime=performance.now();resetTranscript();render(true);save();$('command-input').focus();
}
function bleep(frequency=440){if(!state.settings.sound)return;try{audioContext??=new AudioContext();if(audioContext.state==='suspended')audioContext.resume();const oscillator=audioContext.createOscillator(),gain=audioContext.createGain();oscillator.frequency.value=frequency;oscillator.type='sine';gain.gain.setValueAtTime(.025,audioContext.currentTime);gain.gain.exponentialRampToValueAtTime(.0001,audioContext.currentTime+.14);oscillator.connect(gain);gain.connect(audioContext.destination);oscillator.start();oscillator.stop(audioContext.currentTime+.15);}catch{}}
function run(input){
 const text=String(input||'').trim();if(!text)return {error:'Enter a command.'};finishAnimations();
 const nav={home:'home',combat:'combat','trace panel':'trace',files:'files',logs:'logs',tutorial:'tutorial'};
 if(nav[text.toLowerCase()]){navigate(nav[text.toLowerCase()]);return {module};}
 if(text.toLowerCase()==='start tutorial'){startTutorial();return {tutorial:'ready'};}
 if(text.toLowerCase()==='exit tutorial'){endTutorial();return {tutorial:false};}
 if(text.toLowerCase()==='continue'&&tutorial){continueTutorial(tutorial);selected=LESSONS[tutorial.index].target;render(true);return {tutorial:tutorial.phase};}
 if(['abilities','help','programs'].includes(text.toLowerCase())){toggleAbilities();return {abilitiesOpen:!$('abilities-panel').hidden};}
 if(text.toLowerCase()==='chat'){toggleChat();return {chatOpen:!$('chat-panel').hidden};}
 syncClock();commandNotice='';const events=tutorial?submitTutorial(tutorial,text):command(state,text);if(tutorial?.error)commandNotice=tutorial.error;if(text.toLowerCase()==='engage'&&active(state)&&!tutorial)module='combat';if(text.toLowerCase().startsWith('encounter ')&&!active(state)&&!tutorial){module='home';selected='shell';castFlashes.clear();}if(state.encounter?.queue?.target&&['spike','exploit','overload'].includes(state.encounter.queue.ability))selected=state.encounter.queue.target;
 render(true);appendEvents(events);save();bleep(360);
 return {phase:state.encounter?.phase,cycle:state.encounter?.cycle,queued:state.encounter?.queue?.text||null,integrity:state.server.integrity,events:events.map(e=>e.message)};
}
function commandOptions(text){
 if(tutorial){const options=tutorial.phase==='ready'?[LESSONS[tutorial.index].command]:tutorial.phase==='review'?['continue']:tutorial.phase==='running'?[state.encounter.paused?'resume':'pause']:['exit tutorial'];return options.filter(value=>value.startsWith(text.trim().toLowerCase()));}
 if(!text)return active(state)?[]:['engage','repair'];
 const options=completionOptions(state,text);return options.length?options:suggestions(state,text);
}
function renderSuggestions(){
 const input=$('command-input'),options=commandOptions(input.value).slice(0,6);
 $('suggestions').replaceChildren(...options.map((value,i)=>{const b=document.createElement('button');b.type='button';b.textContent=input.value.includes(' ')?value.slice(value.indexOf(' ')+1):value;b.title=value;b.classList.toggle('highlighted',i===0);b.onclick=()=>prepare(value+(ABILITIES[value]?.target==='component'?' ':''));return b;}));
}
function renderServer(){
 const s=state.server,e=state.encounter,trace=e?.trace||0,combat=module==='combat'||!!tutorial;
 $('integrity-value').textContent=Math.round(s.integrity/s.max*100)+'%';$('integrity').max=s.max;$('integrity').value=s.integrity;
 document.querySelector('.server-panel').classList.toggle('critical',s.integrity<=25);
 $('server-label').textContent=tutorial?'PRACTICE':'SERVER';
 if($('server-trace'))$('server-trace').textContent=trace+'%';if($('trace-progress'))$('trace-progress').value=trace;
 $('server-files').textContent=({accessible:'Accessible',locked:'Secured · locked',required:'Recovery required',recovering:'Recovering'})[s.files];
 $('server-credits').textContent=s.files==='accessible'?s.credits+' C':'Locked';$('server-research').textContent=s.research;
 $('server-alert').textContent=s.integrity<=0?'Server crashed':s.integrity<=25?'Critical integrity':active(state)?'Target: '+e.virus.target:'No active threat';
 $('online').textContent=s.integrity<=0?'SERVER OFFLINE':'LOCAL SIMULATION';
 $('server-stats').innerHTML=`<div class="stat"><span>Integrity</span><b>${s.integrity} / ${s.max}</b></div><div class="stat"><span>Files</span><b>${escape(fileLabel())}</b></div><div class="stat"><span>Archive</span><b>${s.archive}</b></div><div class="stat"><span>SCRAPER-7</span><b>${s.job}</b></div>`;
}
function artMarkup(){return visualMarkup(state,virusView,selected);}
function targetMarkup(c){return subsystemMarkup(state,c,selected);}
function renderWorkspace(){
 const e=state.encounter,s=state.server,v=e?.virus;let html='';
 if(module==='tutorial'&&!tutorial){
  html='<div class="eyebrow">LEARN BLACKBOX</div><h1>One decision at a time.</h1><p class="intro-copy">Fight a practice virus with guidance. The clock waits while you read, runs after you submit an ability, and pauses to show what changed.</p><button class="primary" id="start-tutorial">Start guided combat →</button><p class="subtle">About 2–3 minutes. Your current encounter is paused. Practice cannot spend your real Credits or damage your server.</p><div class="tutorial-reference"><details><summary>What am I trying to do?</summary><p>Reduce total Virus Integrity to zero before your server fails. Shell gates the attack systems: break it, then dismantle the dangerous parts. Every subsystem hit reduces total Integrity; a precision finishing hit secures its loot. Overload all bypasses armor but burns loot when it finishes a subsystem.</p></details><details><summary>What do the cast bars mean?</summary><p>The amber bar is your five-second decision window. Type a command to queue an ability; it lands when the bar fills. Changing your command replaces it without restarting the clock. Each subsystem has its own attack timer in seconds. Interrupt restarts one timer; destroying that system stops it permanently. Your action resolves before the virus at a shared boundary.</p></details><details><summary>Files, recovery, and repair</summary><p>In regular combat, lock files uses your turn to protect stored assets. It does not protect Server Integrity. Afterward, recover files starts 60 seconds of recovery. Then repair spends accessible Credits to restore Integrity. The Files module shows which resources and jobs were affected.</p></details><details><summary>Tracing and scanning</summary><p>Scan reveals one unknown fact. Trace gives 25% origin progress, but costs a turn while enemy systems keep attacking. Finish with 100% for a discovered location, or less for a partial lead. These are optional choices after learning basic combat.</p></details></div>';
 }else if(module==='home'){
  html='<div class="learn-banner"><div><strong>New to combat?</strong><p>Learn targeting, cast timing, and interrupts in a safe, guided encounter.</p></div><button class="primary" data-module="tutorial">Start here →</button></div>';

  html+=`<div class="eyebrow">SERVER CONSOLE</div><h1>Keep your people connected.</h1><p class="intro-copy">The archive holds names that cannot leave this server. Hostile software is at the edge of your connection.</p>`;
  if(e?.phase==='alert')html+=`<section class="intrusion" aria-label="Intrusion alert"><div class="eyebrow">INTRUSION DETECTED</div><div class="intrusion-body"><div><h2>${v.name}</h2><p class="muted">${FAMILIES[v.family].name} · Threat ${v.threat}</p><p class="subtle">TARGET / ${v.target}</p><button class="primary" data-run="engage" style="margin-top:16px">Engage →</button></div>${artMarkup()}</div></section>`;
  else if(active(state))html+=`<div class="intrusion"><h2>${v.name} · encounter active</h2><p>Cycle ${e.cycle}. ${e.paused?'Paused.':'The network is moving.'}</p><button class="primary" data-module="combat">Return to Combat →</button></div>`;
  else html+=`<div class="result-panel"><h2>${s.integrity<=0?'SERVER CRASHED':e?.phase==='victory'?'Connection secured.':'No active intrusion.'}</h2><p class="intro-copy">${s.integrity<=0?'Use developer reboot to continue testing.':'Server damage and File consequences carry into the next encounter.'}</p><button class="primary" data-run="${s.integrity<=0?'developer reboot':'repair'}">${s.integrity<=0?'Developer reboot':'Repair server · 1C / Integrity'}</button></div>`;
  html+=`<div class="encounter-options">${Object.entries(FIXTURES).map(([id,f])=>`<button data-run="encounter ${id}" ${active(state)?'disabled':''}>${f.name}</button>`).join('')}<button data-run="encounter random" ${active(state)?'disabled':''}>Seeded variant</button></div><p class="subtle">Solo test fixtures · no damage before Engage · ${s.reports?'': ''}saved on this device</p>`;
 }else if(module==='combat'||(module==='tutorial'&&tutorial)){
  if(!e||e.phase==='alert')html='<div class="eyebrow">COMBAT</div><h1>No active connection.</h1><p class="intro-copy">Engage the intrusion from Home. The clock waits until you are ready.</p><button class="primary" data-module="home">View intrusion →</button>';
  else {html=`<section class="enemy-window" aria-label="Combat workspace">
   <div class="virus-column">
    <div class="combat-top"><div class="eyebrow">${e.phase==='active'?'▶ COMBAT ENGAGED':e.phase.toUpperCase()}</div><h1>${v.name}</h1><p class="subtle">${FAMILIES[v.family].name} // Threat ${v.threat} // Sector 07</p></div>
    <div class="virus-stage bb-panel">${artMarkup()}<div id="scan-discovery" class="scan-discovery" role="status" hidden></div></div>
    <section id="intel-panel" class="virus-intel bb-panel" aria-label="Virus intelligence"><section id="target-context"></section></section>
   </div>
   <div class="combat-systems">
    <section class="encounter-vitals bb-panel" aria-label="Encounter health and trace"><div class="encounter-meters">${integrityMarkup(state)}<div class="encounter-trace"><span>ORIGIN TRACE</span><strong id="server-trace">${e.trace}%</strong><progress id="trace-progress" max="100" value="${e.trace}" aria-label="Origin Trace"></progress></div></div><aside class="encounter-meta"><span>CONNECTION STABLE // SECTOR 07</span><blockquote>“SAME DUST.<br>DIFFERENT TARGET.”<br>— BLACKBOX</blockquote><div class="cycle-clock"><div class="cycle-meta"><span id="cycle-label"></span><strong id="countdown"></strong></div><progress id="cycle-progress" max="100" value="0" aria-label="Cycle progress"></progress></div></aside></section>
    <section class="subsystems-panel bb-panel" aria-label="Virus subsystems"><div class="subsystem-heading">◇ SUBSYSTEMS</div><div class="targets">${v.components.map(targetMarkup).join('')}</div>${e.fragments.length?'<details class="fragment-details"><summary>'+e.fragments.length+' FRAGMENTS · Server −'+e.fragments.length+' / cycle</summary><div>'+e.fragments.map(targetMarkup).join('')+'</div></details>':''}</section>
    <div id="player-action-slot"></div>
   </div>
  </section>`;
   if(!active(state)&&!tutorial)html+=`<div class="result-panel"><h2>${e.phase==='victory'?'HOSTILE NEUTRALIZED':'SERVER CRASHED'}</h2><p class="intro-copy">${e.metrics.cycles} cycles · ${e.metrics.corruption} Server damage taken · ${e.trace}% Trace</p><button data-module="home" class="primary">Return to server →</button><button data-module="logs">Encounter report</button></div>`;
  }
 }else if(module==='trace'){
  html=`<div class="eyebrow">ORIGIN INTELLIGENCE</div><h1>Follow the signal.</h1><p class="intro-copy">Each combat Trace adds 25%. Finish with 100% to discover an origin; lesser progress saves a partial lead. Scramblers can erase it before victory.</p><div class="state-label">CURRENT TRACE / ${e?.trace||0}%</div><div class="module-list">${state.leads.length?state.leads.map(l=>`<div class="record"><h3>${l.name}</h3><p>${l.discovered?'LOCATION DISCOVERED':'PARTIAL LEAD'} / ${l.progress}%</p><p>${l.discovered?'Access coordinates recorded. Exploration is outside this prototype.':'Signal fragment saved; this lead does not accumulate across encounters.'}</p></div>`).join(''):'<p class="intro-copy">No origin records yet. Trace costs a combat cycle: decide whether the lead is worth more Corruption.</p>'}</div>`;
 }else if(module==='files'){
  html=`<div class="eyebrow">STORED ASSETS</div><h1>Your crew’s memory.</h1><p class="intro-copy">File Lock guarantees protection from future asset attacks, then requires ${CONFIG.recoveryMs/1000} seconds of recovery. Server Integrity remains vulnerable.</p><div class="state-label" id="files-status">${fileLabel()}</div><div class="module-list"><div class="record"><h3>Stored Credits · ${s.files==='accessible'?s.credits+' C':'inaccessible'}</h3><p>Each successful encryption attack removes up to ${CONFIG.encryptionLoss} Credits.</p></div><div class="record"><h3>Research Archive · ${s.archive}</h3><p>${s.archiveValue}C test value · Research ${s.research}. File recovery restores access, not prior damage.</p></div><div class="record"><h3>SCRAPER-7 · ${s.job}</h3><p>Simulated extraction job. File Lock or replication terminates it; restart deliberately after recovery.</p></div></div><div class="file-actions"><button class="primary" data-run="recover files" ${active(state)||s.files!=='required'?'disabled':''}>Recover files</button><button data-run="restart operation" ${active(state)||s.files!=='accessible'||s.job==='running'?'disabled':''}>Restart operation</button></div>`;
 }else{
  html=`<div class="workspace-heading"><div><div class="eyebrow">EVENT ARCHIVE</div><h1>Logs & incident reports.</h1></div></div>${state.reports.length?`<details><summary>Developer / last encounter telemetry</summary><pre class="metrics">${escape(JSON.stringify(state.reports.at(-1),null,2))}</pre><button id="export-report">Export report JSON</button></details>`:''}<div class="logs-list">${state.logs.slice(-160).reverse().map(x=>`<p><span class="muted">C${x.cycle} / ${x.type.toUpperCase()}</span><br>${escape(x.message)}</p>`).join('')}</div>`;
 }
 if(tutorial&&module==='tutorial')html=tutorialMarkup()+html;
 const previousCanvas=$('virus-canvas');
 $('workspace').innerHTML=html;
 if(previousCanvas&&$('virus-canvas'))$('virus-canvas').replaceWith(previousCanvas);
 ($('player-action-slot')||document.querySelector('.command-dock')).prepend(actionPanel);
 (document.querySelector('.cycle-clock')||document.querySelector('.action-clock')).append(clockToggle);
 $('workspace').querySelectorAll('[data-view]').forEach(b=>{b.onclick=()=>{virusView=b.dataset.view;render(true);document.querySelector('[data-view="'+virusView+'"]').focus();};b.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=VIEWS.indexOf(virusView);virusView=event.key==='Home'?VIEWS[0]:event.key==='End'?VIEWS.at(-1):VIEWS[(index+(event.key==='ArrowRight'?1:2))%3];render(true);document.querySelector('[data-view="'+virusView+'"]').focus();};});
 if($('start-tutorial'))$('start-tutorial').onclick=startTutorial;
 if($('continue-lesson'))$('continue-lesson').onclick=()=>{continueTutorial(tutorial);selected=LESSONS[tutorial.index].target;lastTime=performance.now();commandNotice='';render(true);$('command-input').focus();};
 if($('exit-tutorial'))$('exit-tutorial').onclick=()=>endTutorial();
 if($('prepare-lesson'))$('prepare-lesson').onclick=()=>prepare(LESSONS[tutorial.index].command);
 if($('replay-tutorial'))$('replay-tutorial').onclick=startTutorial;
 $('workspace').querySelectorAll('[data-run]').forEach(b=>b.onclick=()=>{run(b.dataset.run);$('command-input').focus();});
 $('workspace').querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>navigate(b.dataset.module));
 $('workspace').querySelectorAll('[data-target]').forEach(b=>b.onclick=()=>{selected=b.dataset.target;renderContext();renderReadiness();$('workspace').querySelectorAll('[data-target]').forEach(t=>t.classList.toggle('selected',t.dataset.target===selected));renderSuggestions();$('command-input').focus();});
 if($('export-report'))$('export-report').onclick=()=>{const url=URL.createObjectURL(new Blob([JSON.stringify(state.reports.at(-1),null,2)],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='blackbox-encounter.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);};
 if($('virus-canvas'))artRenderer?.attach($('virus-canvas'));
}
function renderContext(){
 const host=$('target-context');if(!host)return;
 const e=state.encounter,intel=intelSnapshot(state);

 const known=e.virus.revealed>0,knownCounter=e.virus.revealed>1,concept=e.virus.family==='ransomware'?'files':e.virus.family==='worm'?'replication':'mask';
 const tip=e.fragments.length?'Fragments attack each cycle. Neutralizing the parent clears them all.':known&&!knownCounter?'Scan again to identify a subsystem weakness.':'Interrupt delays a cast. Destroying its source stops it permanently.';
 host.innerHTML=`<div class="intel-heading"><h2>VIRUS INTEL</h2><span id="intel-new" ${performance.now()>=intelNewUntil?'hidden':''}>NEW</span>${!tutorial&&!state.tips.includes(concept)?`<details class="intel-tip"><summary>Tip</summary><aside class="tip"><p>${tip}</p><button id="dismiss-tip">Got it</button></aside></details>`:''}</div><dl class="intel-discoveries"><div><dt>Mutation</dt><dd title="${escape(intel.mutationDetail)}">${intel.mutation}</dd></div><div><dt>Weakness</dt><dd title="${escape(intel.counterDetail)}">${intel.counter}</dd></div></dl><p class="intel-behavior"><span>${intel.behavior} · every ${intel.interval} cycles</span><span>Target / <strong>${intel.target}</strong></span></p>`;
 if($('dismiss-tip'))$('dismiss-tip').onclick=()=>{state.tips.push(concept);renderContext();save();};
}
function render(force=false){
 if(state.encounter&&selected!=='all'&&!(part(state,selected)?.integrity>0)&&!state.encounter.fragments.some(f=>f.id===selected&&f.integrity>0))selected=state.encounter.virus.components.find(c=>c.integrity>0)?.id||'shell';
 document.body.classList.toggle('in-combat',active(state));document.body.classList.toggle('combat-view',module==='combat'||!!tutorial);document.body.classList.toggle('in-tutorial',!!tutorial);document.body.classList.toggle('paused',!!state.encounter?.paused);document.body.classList.toggle('no-motion',!motion());
 $('sound').textContent=state.settings.sound?'Sound on':'Sound off';$('sound').setAttribute('aria-pressed',String(state.settings.sound));$('motion').textContent=state.settings.motion?'Motion on':'Motion off';$('motion').setAttribute('aria-pressed',String(state.settings.motion));
 renderServer();const e=state.encounter;const key=JSON.stringify([module,selected,virusView,tutorial?.index,tutorial?.phase,tutorial?.error,e?.cycle,e?.phase,e?.paused,e?.virus,e?.fragments,state.server.files,state.server.archive,state.server.job,state.reports.length,state.leads.length,state.tips]);
 if(force||lastRender!==key){lastRender=key;renderWorkspace();renderContext();renderSuggestions();}
 document.querySelectorAll('.modules [data-module]').forEach(b=>{b.disabled=!!tutorial&&b.dataset.module!=='tutorial';if(b.dataset.module===module)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current');});$('combat-badge').textContent=active(state)?'•':'';
 if($('countdown'))$('countdown').textContent=active(state)?e.paused?'PAUSED':'LIVE':'CLOSED';if($('cycle-label'))$('cycle-label').textContent='CYCLE '+e.cycle;if($('cycle-progress'))$('cycle-progress').value=e.elapsedMs/CONFIG.cycleMs*100;
 $('queue').textContent=active(state)?`CYCLE ${e.cycle} / ${e.paused?'PAUSED':e.elapsedMs>=CONFIG.cycleMs-CONFIG.cutoffMs?'LOCKED':'OPEN · '+((CONFIG.cycleMs-e.elapsedMs)/1000).toFixed(1)+'s'} / ${e.queue?.text||'WAIT — no action queued'}`:'NO ACTIVE CYCLE / '+(e?.phase==='alert'?'type engage':state.server.integrity<=0?'developer reboot available':'server standing by');
 if($('files-status'))$('files-status').textContent=fileLabel();$('command-input').placeholder=active(state)?e.paused?'resume':'spike '+selected:e?.phase==='alert'?'engage':'repair';
 $('clock').textContent=new Date().toLocaleTimeString('en-GB');renderFeedback();
 if(tutorial&&tutorial.phase==='ready')$('command-input').placeholder=LESSONS[tutorial.index].command;
 document.querySelector('.build-footer span').textContent=tutorial?'PRACTICE ONLY · YOUR SERVER IS SAFE':playtest?'PLAYTEST · UNSAVED SESSION':'SOLO COMBAT TEST · SAVED ON THIS DEVICE';
}
function navigate(next){if(tutorial&&next!=='tutorial'){commandNotice='You are in practice. Use Exit practice to return to your server.';renderFeedback();return;}if(next==='tutorial'&&!tutorial){syncClock();if(active(state)){appendEvents(command(state,'pause'));save();}}module=next;render(true);$('command-input').focus();}
function syncClock(){const now=performance.now(),delta=now-lastTime,previousCast=castState(state);lastTime=now;const events=tutorial?advanceTutorial(tutorial,document.hidden?0:delta):advance(state,document.hidden?0:delta);if(events.length){render();appendEvents(events,false,previousCast);save();}}
function toggleAbilities(force){$('abilities-panel').hidden=!(force??$('abilities-panel').hidden);$('abilities-toggle').setAttribute('aria-expanded',String(!$('abilities-panel').hidden));}
function toggleChat(force){const open=force??$('chat-panel').hidden;$('chat-panel').hidden=!open;$('chat-toggle').setAttribute('aria-expanded',String(open));if(open)$('chat-input').focus();else $('command-input').focus();}
document.querySelectorAll('[data-module]').forEach(b=>b.onclick=()=>navigate(b.dataset.module));
const chat=[{name:'nova',text:'Five seconds. Read the threat, then make the call. The help window can stay open.'}];
function renderChat(){$('chat-messages').innerHTML=chat.map(c=>`<div class="chat-message"><strong>${escape(c.name)}</strong>${escape(c.text)}</div>`).join('');}
renderChat();$('chat-toggle').onclick=()=>toggleChat();$('close-chat').onclick=()=>toggleChat(false);$('chat-form').onsubmit=event=>{event.preventDefault();const value=$('chat-input').value.trim();if(!value)return;chat.push({name:'rookie',text:value},{name:'nova [NPC]',text:'Break armor, then dismantle the attack systems. Watch their timers and secure loot with precision finishing hits.'});if(chat.length>30)chat.splice(0,2);$('chat-input').value='';renderChat();};
for(const [id,a]of Object.entries(ABILITIES)){const b=document.createElement('button');b.className='ability-row';b.innerHTML=`<code>${id}${a.target==='component'?' [target]':''}</code><span>${a.description}</span>`;b.onclick=()=>{prepare(id+(a.target==='component'?' ':''));if(!pinned)toggleAbilities(false);};$('abilities-list').append(b);}
 $('abilities-toggle').onclick=()=>toggleAbilities();$('close-abilities').onclick=()=>{toggleAbilities(false);$('command-input').focus();};$('pin-abilities').onclick=()=>{pinned=!pinned;$('abilities-panel').classList.toggle('pinned',pinned);$('pin-abilities').setAttribute('aria-pressed',String(pinned));$('pin-abilities').textContent=pinned?'Unpin':'Pin';$('command-input').focus();};
 $('sound').onclick=()=>{state.settings.sound=!state.settings.sound;bleep();render();save();};$('motion').onclick=()=>{state.settings.motion=!state.settings.motion;if(!motion())finishAnimations();render();save();};reduced.addEventListener('change',()=>{finishAnimations();render();});
 $('reading-toggle').onclick=()=>run(state.encounter?.paused?'resume':'pause');
 $('command-form').onsubmit=event=>{event.preventDefault();const text=$('command-input').value.trim();if(!text)return;history.push(text);history=history.slice(-100);historyIndex=history.length;$('command-input').value='';completion=null;run(text);};
 $('command-input').addEventListener('input',()=>{completion=null;syncInputTarget();renderSuggestions();});$('command-input').onkeydown=event=>{const input=$('command-input');if(['ArrowUp','ArrowDown'].includes(event.key)){event.preventDefault();historyIndex=Math.max(0,Math.min(history.length,historyIndex+(event.key==='ArrowUp'?-1:1)));input.value=history[historyIndex]||'';syncInputTarget();renderSuggestions();}if(event.key==='Tab'&&!event.shiftKey&&input.value){if(!completion||completion.last!==input.value)completion={values:commandOptions(input.value),index:0};if(completion.values.length){event.preventDefault();input.value=completion.values[completion.index++%completion.values.length];completion.last=input.value;syncInputTarget();renderSuggestions();}}};
 $('new-output').onclick=scrollLatest;$('feed').onscroll=()=>{if($('feed').scrollHeight-$('feed').scrollTop-$('feed').clientHeight<30)$('new-output').hidden=true;};
 document.addEventListener('keydown',event=>{if(event.key==='Escape'){toggleChat(false);if(!pinned)toggleAbilities(false);}if(event.key==='?'&&document.activeElement.tagName!=='INPUT')toggleAbilities();if(active(state)&&/^[1-6]$/.test(event.key)&&!event.ctrlKey&&!event.metaKey&&!event.altKey&&(document.activeElement===$('command-input')&&!$('command-input').value||!['INPUT','TEXTAREA'].includes(document.activeElement.tagName))){event.preventDefault();prepareAbility(['spike','exploit','overload','interrupt','scan','trace'][Number(event.key)-1]);}});
 document.addEventListener('visibilitychange',()=>{lastTime=performance.now();if(document.hidden&&active(state)){state.encounter.paused=true;save();render();}});window.addEventListener('pagehide',save);
 $('ticker').textContent=TICKER.join('   //   ');
 if(playtest){selectEncounter(state,playtest,1);command(state,'engage');command(state,'pause');module='combat';}
 if(!state.encounter)selectEncounter(state,'cryptjack',1);render(true);appendEvents(state.logs.slice(-100),true);save();
 setInterval(()=>{syncClock();render();},100);
 if(document.modelContext?.registerTool)try{Promise.resolve(document.modelContext.registerTool({name:'run_game_command',title:'Run a BLACKBOX command',description:'Queue a fictional combat ability or use engage, pause, resume, repair, recover files, encounter cryptjack/splinter/ghostroot/random, and module commands. A queued ability resolves at the next five-second boundary.',inputSchema:{type:'object',properties:{command:{type:'string',minLength:1,maxLength:160}},required:['command'],additionalProperties:false},execute(input){if(!input||typeof input.command!=='string'||Object.keys(input).length!==1)throw new Error('Provide a command string.');return run(input.command);}})).catch(()=>{});}catch{}
 import('./virus-art.mjs').then(({createArt})=>{artRenderer=createArt(()=>state,()=>motion(),()=>selected);if($('virus-canvas'))artRenderer.attach($('virus-canvas'));}).catch(()=>{});


$('cancel-action').onclick=()=>{run('cancel');$('command-input').focus();};
