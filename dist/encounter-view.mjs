import {active,part,protection,virusIntegrity} from './combat.mjs';
import {FAMILIES,CONFIG} from './data.mjs';
import {intelSnapshot,targetTags} from './combat-view.mjs';

const esc=text=>String(text).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const VIEWS=['3D','Schematic','Signature'];
export const signature=s=>s.encounter.virus.family.slice(0,3).toUpperCase()+'-07'+String(s.encounter.seed).padStart(2,'0');
export function visualMarkup(s,view='3D',selected){
 const e=s.encounter,v=e.virus,intel=intelSnapshot(s),guard=v.components.find(c=>c.kind==='shell');
 // Live adaptation of the bundle's schematic/signature templates: the same
 // hierarchy and dossier fields, populated from real encounter state.
 const node=c=>`<button class="schematic-node ${selected===c.id?'selected':''} ${!c.integrity?'offline':''}" data-target="${c.id}" ${!c.integrity||!active(s)?'disabled':''} title="${esc(c.integrity?protection(s,c)?'Accessible target':'Protected by '+guard.name:'Subsystem disabled')}"><span>${esc(c.name)}</span><strong>${c.integrity} / ${c.max}</strong><small>${!c.integrity?'DISABLED':protection(s,c)?'ACCESSIBLE':'PROTECTED'}</small></button>`;
 return `<div class="art-wrap"><div class="visual-heading"><strong>VIRUS VISUAL</strong><div class="view-tabs" role="tablist" aria-label="Virus view">${VIEWS.map((name,i)=>`<button type="button" role="tab" id="view-tab-${i}" aria-controls="virus-view-${i}" aria-selected="${view===name}" tabindex="${view===name?0:-1}" data-view="${name}">${name}</button>`).join('')}</div></div>
 <div class="virus-view visual-3d" id="virus-view-0" role="tabpanel" aria-labelledby="view-tab-0" ${view==='3D'?'':'hidden'}><div class="virus-art" role="img" aria-label="Virus subsystem visualization"><canvas id="virus-canvas" width="540" height="360"></canvas></div><aside class="visual-labels"><span id="rotation-label">ROTATING</span><span>SIG: ${signature(s)}</span><span>CLASS: ${FAMILIES[v.family].name.toUpperCase()}</span><span>THREAT: ${v.threat}</span></aside></div>
 <div class="virus-view schematic-view" id="virus-view-1" role="tabpanel" aria-labelledby="view-tab-1" ${view==='Schematic'?'':'hidden'}><div class="schematic-root">${node(guard)}</div><div class="schematic-link">${guard.integrity?'GATES ACCESS':'ACCESS OPEN'}</div><div class="schematic-branches">${v.components.filter(c=>c!==guard).map(node).join('')}</div><p>${guard.id==='mask'?'Exploit Mask opens its links for two cycles.':'Break Shell to target the systems below.'}</p></div>
 <div class="virus-view signature-view" id="virus-view-2" role="tabpanel" aria-labelledby="view-tab-2" ${view==='Signature'?'':'hidden'}><dl><div><dt>SIGNATURE</dt><dd>${signature(s)}</dd></div><div><dt>FAMILY</dt><dd>${FAMILIES[v.family].name}</dd></div><div><dt>MUTATION</dt><dd>${intel.mutation}</dd></div><div><dt>WEAKNESS</dt><dd>${intel.counter}</dd></div><div><dt>BEHAVIOR</dt><dd>${v.actions.map(a=>esc(a.name)+' / '+a.interval*CONFIG.cycleMs/1000+'s').join('<br>')}</dd></div><div><dt>ORIGIN</dt><dd>Sector 07 · ${e.trace===100?'located':e.trace?'partial signal':'unresolved'}<br>${e.trace}% traced</dd></div></dl></div>
 <div class="art-caption">// ${view==='3D'?'NETWORK ENTITY PREVIEW':view==='Schematic'?'SUBSYSTEM ACCESS MAP':'FORENSIC SIGNATURE'}</div></div>`;
}
export function integrityMarkup(s){const hp=virusIntegrity(s);return `<div class="virus-integrity" title="Combined Integrity of the parent virus subsystems. Reduce every subsystem to zero to end the encounter."><strong>VIRUS INTEGRITY</strong><progress max="${hp.max}" value="${hp.current}" aria-label="Virus Integrity"></progress><span>${hp.current} / ${hp.max}</span></div>`;}
export function subsystemMarkup(s,c,selected){
 const e=s.encounter,action=e.virus.actions.find(a=>a.source===c.id),guard=part(s,c.protectedBy),protectedNow=!protection(s,c),tags=targetTags(s,c).filter(t=>!['CASTING','DISABLED'].includes(t));
 const desc=action?`${action.name} → ${action.effect==='damage'?'Server −'+action.damage:action.effect==='encrypt'?'Lock Data':action.effect==='scramble'?'Trace −10':'Spawn fragment'}`:c.kind==='fragment'?'Fragment attack → Server −1':`Protects ${e.virus.components.filter(p=>p.protectedBy===c.id).map(p=>p.name).join(', ')}`;
 const loot=c.loot?`Precision break: ${c.loot}. Broad finishing hits burn it.`:'';
 return `<button class="target subsystem-row ${action&&c.integrity?'casting-source':''} ${selected===c.id?'selected':''} ${!c.integrity?'dead':''}" data-target="${c.id}" title="${esc([protectedNow?'Protected by '+guard.name+'.':desc,loot].join(' '))}" ${!c.integrity||!active(s)?'disabled':''}>
 <span class="subsystem-icon" style="--subsystem-icon:url('ui/icons/${c.icon||'injector'}.svg')" aria-hidden="true"></span>
 <span class="subsystem-body"><span class="subsystem-health"><strong>${esc(c.name)}</strong><progress max="${c.max}" value="${c.integrity}" aria-label="${esc(c.name)} Integrity"></progress><span class="target-hp">${c.integrity} / ${c.max}</span></span>
 <span class="subsystem-detail"><span class="subsystem-behavior">${!c.integrity?c.lootState==='secured'?c.loot+' secured':c.lootState==='burned'?'Payload burned · disabled':'Access opened':esc(desc)}</span><span class="target-tags">${tags.map(t=>`<span>${t}</span>`).join(' · ')}</span></span></span>
 <span class="subsystem-timer" data-timer="${c.id}" aria-label="${esc(c.name)} attack timing"><strong>${!c.integrity?'OFFLINE':action?'—':'—'}</strong><small>${action?'NEXT ATTACK':c.kind==='fragment'?'NEXT ATTACK':'ARMOR'}</small></span></button>`;
}
