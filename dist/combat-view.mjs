import {active,part,liveActions,protection} from './combat.mjs';
import {FAMILIES,MUTATIONS,ABILITIES} from './data.mjs';

// Presentation only. Discoveries are read from the existing saved reveal count.
export function intelSnapshot(s){
 const v=s.encounter?.virus;if(!v)return null;
 const source=FAMILIES[v.family].component.id,action=v.actions.find(a=>a.source===source);
 return {source,mutation:v.revealed>0?MUTATIONS[v.mutation].name:'???',mutationDetail:v.revealed>0?MUTATIONS[v.mutation].description:'Scan to identify the mutation.',
  counter:v.revealed>1?part(s,source).name+' / Exploit':'???',counterDetail:v.revealed>1?v.facts[1]:'Scan to identify the action source.',
  behavior:action.name,interval:action.interval,target:action.target,facts:v.facts.slice(0,v.revealed)};
}
export function targetTags(s,c){
 const e=s.encounter;if(c.integrity<=0)return ['DISABLED'];
 const tags=[];
 if(liveActions(s).some(a=>a.source===c.id)&&active(s))tags.push('CASTING');
 if(!protection(s,c))tags.push('PROTECTED');
 if(c.exposedUntil>=e.cycle)tags.push('EXPOSED');
 if(c.shield)tags.push('SHIELD '+c.shield);
 const special=FAMILIES[e.virus.family].component.id;
 if(e.virus.revealed>0&&c.id===special&&e.virus.mutation==='armored')tags.push('ARMORED');
 if(e.virus.revealed>0&&c.id===special&&e.virus.mutation==='regenerative')tags.push('REGENERATIVE');
 if(e.virus.revealed>1&&c.id===special)tags.push('WEAK: EXPLOIT');
 return tags;
}
export function recentCards(logs){
 const start=logs.findLastIndex(e=>e.type==='intrusion');
 const visible=logs.slice(Math.max(0,start)).filter(e=>!['resolved','queued','replaced','wait','info'].includes(e.type));
 return visible.slice(-4).reverse().map(e=>{
  let title=e.message.split(' / ')[0],detail=e.message.split(' / ').slice(1).join(' / ');
  if(e.type==='intrusion'){title='Virus detected';detail=e.message.split(' detected.')[0];}
  if(e.type==='engage'){title='Connection engaged';detail='Combat started';}
  if(e.type==='damage'){title=(e.target||'Target')+' −'+e.amount;detail='Subsystem damage';}
  if(e.type==='corruption'){title='Server −'+e.amount+' Integrity';detail=e.source==='fragments'?'Fragments':e.source==='pulse'?'Pulse Attack':e.source==='injector'?'Packet Spike':'Server damage';}
  if(e.type==='scan'){title='Scan complete';detail='Discovery saved in INTEL';}
  if(e.type==='cancelled'){title=e.message.split('.')[0];detail='Enemy action stopped';}
  if(e.type==='destroyed'){title=(e.target||'Subsystem')+' destroyed';detail='Component disabled';}
  if(e.type==='victory'){title='Virus neutralized';detail='Connection secured';}
  if(e.type==='crashed'){title='Server crashed';detail='Combat stopped';}
  return {...e,title,detail};
 });
}
export function completionOptions(s,input){
 const text=input.toLowerCase().trimStart(),space=text.indexOf(' ');
 if(space<0)return Object.keys(ABILITIES).filter(id=>id.startsWith(text));
 const ability=text.slice(0,space),a=ABILITIES[ability];
 if(a?.target==='component'||a?.target==='action'){
  const prefix=text.slice(space+1).trim(),targets=s.encounter?.virus.components.concat(s.encounter.fragments).filter(c=>c.integrity>0)||[];
  const choices=targets.filter(c=>c.id.startsWith(prefix)&&(a.target!=='action'||liveActions(s).some(v=>v.source===c.id))).map(c=>ability+' '+c.id);if(ability==='overload'&&'all'.startsWith(prefix))choices.push('overload all');return choices;
 }
 return Object.keys(ABILITIES).filter(id=>id.startsWith(text));
}
