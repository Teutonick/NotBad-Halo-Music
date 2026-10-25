/* Original WATER synthesis presets. No recordings or third-party sound material. */
(function(root){
 'use strict';
 function banks(patch){
  const rows=[
   ['GLASS','pulse','kick',430,.36,[['tidal-kick','Tidal kick',1,0],['rubber-kick','Rubber kick',1.35,.08],['sub-knock','Sub knock',.72,.03],['broken-kick','Broken kick',1.7,.14]]],
   ['TIDAL','accent','snare',6000,.22,[['salt-clap','Salt clap',1,.45],['rim-crack','Rim crack',2.7,.15],['digital-snare','Digital snare',1.4,.65],['hollow-rim','Hollow rim',3.6,.08]]],
   ['ROOT','percussion','metal',8200,.12,[['foam-hat','Foam hat',7.13,.24],['glass-tick','Glass tick',4.73,.08],['shard-shaker','Shard shaker',9.17,.45],['titanium-ride','Titanium ride',6.31,.14]]],
   ['EMBER','texture','noise',4400,.55,[['grain-spray','Grain spray',1,.6],['circuit-dust','Circuit dust',3,.35],['bubble-code','Bubble code',5,.18],['broken-radio','Broken radio',7,.5]]],
   ['RAIN','bass','bass',1400,.52,[['elastic-sub','Elastic sub',1,.45],['reef-reese','Reef reese',.5,.8],['hollow-bass','Hollow bass',2,.7],['acid-current','Acid current',3,.9]]],
   ['VEIL','melody','rocksynth',4200,.55,[['prism-stab','Prism stab',2,.8],['liquid-fm','Liquid FM',3,.95],['chopped-vowel','Chopped vowel',1.5,1.25],['phase-reed','Phase reed',.5,.7]]],
   ['MOSS','arpeggio','pluck',5000,.30,[['ripple-seq','Ripple sequence',2,.9],['copper-arp','Copper arpeggio',3.5,1.2],['digital-marimba','Digital marimba',4,.65],['trance-pulse','Trance pulse',1,.45]]],
   ['AURA','harmony','pad',2800,1.5,[['lagoon-chord','Lagoon chord',1,.5],['dub-stab','Dub stab',2,.8],['spectral-organ','Spectral organ',3,.6],['tape-halo','Tape halo',.5,.3]]]
  ];
  return Object.freeze(Object.fromEntries(rows.map(([slot,role,engine,tone,decay,list])=>[slot,Object.freeze({role,sounds:Object.freeze(list.map(([id,name,ratio,index],variant)=>patch('water-'+id,name,engine,tone,decay*(variant===3?1.4:1),{setups:['water'],waterVoice:role,waterVariant:variant,fmRatio:ratio,fmIndex:index,compatibleRoles:['pulse','accent','percussion','texture',...(['bass','rocksynth','pluck','pad'].includes(engine)?['bass','melody','arpeggio','harmony']:[])],affinityRoles:[role],...(engine==='noise'?{filter:'bandpass'}:{})})))})])));
 }
 const api={banks};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.HaloWaterSounds=api;
})(globalThis);
