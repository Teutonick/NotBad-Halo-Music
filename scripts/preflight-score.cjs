#!/usr/bin/env node
'use strict';
// Optional host-side draft gate. Uses HALO's receiver and native project validator.
const fs=require('node:fs'),path=require('node:path');
const Bridge=require('../src/file-bridge.js'),Agent=require('../src/agent.js'),P=require('../src/project.js'),Song=require('../src/song.js'),S=require('../src/sounds.js'),M=require('../src/motion.js'),C=require('../src/composition.js');
function read(file){if(fs.statSync(file).size>524288)throw Error('PAYLOAD_TOO_LARGE');return fs.readFileSync(file,'utf8')}
function main(args){
 const options={},positional=[];
 for(let i=0;i<args.length;i++){
  const arg=args[i];
  if(['--state','--output','--id'].includes(arg)){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('Missing value for '+arg);options[arg]=args[++i]}
  else if(arg.startsWith('--'))throw Error('Unknown option '+arg);
  else positional.push(arg);
 }
 if(positional.length!==1||!options['--state'])throw Error('Usage: node scripts/preflight-score.cjs DRAFT.json --state project-state.json [--id TASK_ID] [--output NEW_FILE.json]');
 const input=path.resolve(positional[0]),id=options['--id']||path.basename(input,'.json'),snapshot=JSON.parse(read(options['--state']));
 if(!snapshot.scoreExport?.complete||!snapshot.score)throw Error('A complete HALO project-state.json is required for preflight');
 let project=P.capture(Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,level:50,density:50,character:50,duration:50,space:30})),4,72,1,0,S,M);
 const api=Agent.create({project:P,song:Song,sounds:S,composition:C,read:()=>project});
 const baseline=Bridge.preflightScore(api,snapshot.score,'preflight-state');
 if(!baseline.ok)throw Error('Invalid snapshot: '+baseline.error);
 project=baseline.preview.after;
 const raw=Bridge.parseScoreText(read(input));
 const parent=fs.realpathSync(path.dirname(input));
 const score=Bridge.resolveRequestPayloadSync(raw,name=>{const file=fs.realpathSync(path.join(parent,name));if(path.dirname(file)!==parent)throw Error('COMPANION_PATH: use files inside the draft directory');return read(file)},id);
 const result=Bridge.preflightScore(api,score,id);
 if(!result.ok)return {ok:false,error:result.error};
 if(result.probe)throw Error('Draft preflight expects a musical score; the live folder probe is a separate exchange');
 const normalized={...result.normalizedScore};delete normalized.baseRevision;
 if(options['--output']){
  // Publish complete bytes atomically; link creation is exclusive, even under a race.
  const output=path.resolve(options['--output']),temporary=path.join(path.dirname(output),'.'+path.basename(output)+'.preflight-'+require('node:crypto').randomUUID()+'.tmp');
  let staged=false;
  try{
   fs.writeFileSync(temporary,JSON.stringify(normalized,null,2)+'\n',{encoding:'utf8',flag:'wx'});staged=true;
   fs.linkSync(temporary,output);
  }finally{if(staged)fs.unlinkSync(temporary)}
 }
 return {ok:true,scoreReport:result.scoreReport,scoreAudit:result.scoreAudit,output:options['--output']?path.resolve(options['--output']):null,meaning:'Draft checked against the supplied snapshot. Live HALO retains task freshness, conflict review and approval.'};
}
try{const result=main(process.argv.slice(2));process.stdout.write(JSON.stringify(result,null,2)+'\n');if(!result.ok)process.exitCode=1}
catch(error){process.stdout.write(JSON.stringify({ok:false,error:error.message})+'\n');process.exitCode=1}
