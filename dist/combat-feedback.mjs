import {active,liveActions,part,protection} from './combat.mjs';
import {CONFIG,ABILITIES,FAMILIES} from './data.mjs';
export function abilityReadiness(s,id,targetId){
 const e=s.encounter,ability=ABILITIES[id];
 if(!active(s))return {ready:false,cycles:0,label:'No encounter',reason:'Engage an intrusion first.'};
 const cycles=Math.max(0,(e.readyAt[id]||0)-e.cycle);
 if(cycles){const seconds=Math.max(0,(cycles*CONFIG.cycleMs-e.elapsedMs)/1000);return {ready:false,cycles,label:`${seconds.toFixed(1)}s · ${cycles} ${cycles===1?'cycle':'cycles'}`,reason:`${ability.name} recharges in cycle ${e.readyAt[id]}.${e.paused?' Combat is paused.':''}`};}
 if(id==='scan'&&e.virus.revealed>=e.virus.facts.length)return {ready:false,cycles:0,label:'Known',reason:'All available discoveries are recorded in INTEL.'};
 if(id==='trace'&&e.trace>=100)return {ready:false,cycles:0,label:'Complete',reason:'Origin Trace is already 100%.'};
 if(id==='lock files'&&s.server.files!=='accessible')return {ready:false,cycles:0,label:'Protected',reason:'Files are already locked or awaiting recovery.'};
 const target=part(s,targetId)||e.fragments.find(f=>f.id===targetId);
 if(id==='overload'&&targetId==='all')return {ready:true,cycles:0,label:'Ready',reason:'15 broad damage per subsystem; finishing hits burn loot.'};
 if(ability.target==='component'&&(!target||target.integrity<=0))return {ready:false,cycles:0,label:'Choose target',reason:'Choose a living target in the enemy panel.'};
 if(ability.target==='component'&&target&&!protection(s,target))return {ready:false,cycles:0,label:'Protected',reason:target.name+' is protected. Break '+part(s,target.protectedBy).name+' first.'};
 if(ability.target==='action'&&!liveActions(s).some(a=>a.interruptible))return {ready:false,cycles:0,label:'No cast',reason:'No interruptible virus cast remains. Destroy the remaining subsystems to finish the encounter.'};
 return {ready:true,cycles:0,label:'Ready',reason:''};
}
export function describeIntent(s,intent){
 if(!intent)return 'Type an ability, then press Enter. No command means no attack.';
 const a=ABILITIES[intent.ability],target=part(s,intent.target)||s.encounter.fragments.find(f=>f.id===intent.target);
 if(intent.target==='all')return '15 damage to every subsystem. Finishing hits burn loot.';
 if(a?.damage&&target){const raw=Math.floor(a.damage*(s.build.modifiers.damage||1)*(target.exposedUntil>=s.encounter.cycle?CONFIG.exposedMultiplier:1)*protection(s,target));return `Up to ${raw} damage to ${target.name}${target.shield?' before its '+target.shield+' shield':''}. Precision finishing hits secure loot.`;}
 return ({exploit:`Expose ${target?.name}: +50% damage for the next two turns.`,interrupt:'Restart this subsystem’s cast; other attacks keep running.','lock files':'Protect Files; recovery will be required afterward.',trace:'Gain 25 Trace toward an origin lead.',scan:'Reveal one unknown fact about this virus.'})[intent.ability]||'One ability resolves at the next cycle boundary.';
}
export function castState(s){
 if(!active(s))return null;
 const e=s.encounter,elapsed=e.elapsedMs/CONFIG.cycleMs,remaining=Math.max(0,(CONFIG.cycleMs-e.elapsedMs)/1000);
 return {remaining,paused:e.paused,cycle:e.cycle,player:{progress:Math.min(1,elapsed),name:e.queue?ABILITIES[e.queue.ability].name+(e.queue.target?' → '+(e.queue.target==='all'?'All subsystems':(part(s,e.queue.target)||e.fragments.find(f=>f.id===e.queue.target))?.name||e.queue.target):''):'Awaiting command',description:describeIntent(s,e.queue)},enemies:liveActions(s).map(a=>{const cycles=a.due-e.cycle+1-elapsed;return {id:a.id,name:a.name,seconds:Math.max(0,cycles*CONFIG.cycleMs/1000),cycles:Math.max(1,a.due-e.cycle+1),progress:Math.max(0,Math.min(1,1-cycles/a.interval)),source:a.source,stakes:a.stakes};}),corruption:e.fragments.filter(f=>f.born<e.cycle&&f.integrity>0).length};
}
// The displayed interruption briefly holds the cancelled cast's fill. The
// simulation's replacement cast continues on its existing schedule underneath.
export function castPresentation(action,live,paused,flash,now){
 const interrupted=!!flash&&flash.until>now;
 return {interrupted,disabled:!live,urgent:!!live&&!paused&&!interrupted&&live.seconds<=5,
  title:interrupted?flash.text:live?action.name:'Action disabled',
  time:interrupted?'CANCELLED':live?`${live.cycles} ${live.cycles===1?'CYCLE':'CYCLES'}`:'STOPPED',
  seconds:live?`${live.seconds.toFixed(1)}s remaining`:'Source destroyed',
  progress:interrupted?flash.progress:live?.progress||0,
  intensity:live&&!interrupted?Math.max(0,Math.min(1,live.progress)):0};
}
export function resolutionSummary(events){
 const important=events.filter(e=>['damage','destroyed','cancelled','hostile','blocked','trace','scan','status','mutation','files','repair','victory','crashed','corruption','wait'].includes(e.type));
 return important.map(e=>e.type==='corruption'?`Server −${e.amount} Integrity.`:e.message).join(' ');
}
