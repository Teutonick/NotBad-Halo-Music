// Test-only File System Access handles backed by a real, dedicated directory.
// Only this HALO actor exports context/receipts. The evaluator never authors requests.
const fs=require('node:fs/promises'),path=require('node:path');
const B=require('../../src/file-bridge.js'),Agent=require('../../src/agent.js'),P=require('../../src/project.js'),S=require('../../src/sounds.js'),M=require('../../src/motion.js'),C=require('../../src/composition.js'),Song=require('../../src/song.js');
function handle(dir){return {kind:'directory',name:path.basename(dir),
 async getDirectoryHandle(name,{create=false}={}){const p=path.join(dir,name);if(create)await fs.mkdir(p,{recursive:true});else await fs.access(p);return handle(p)},
 async getFileHandle(name,{create=false}={}){const p=path.join(dir,name);if(create){try{await fs.access(p)}catch{await fs.writeFile(p,'')}}else await fs.access(p);return {kind:'file',name,
  async getFile(){const stat=await fs.stat(p),text=await fs.readFile(p,'utf8');return {size:stat.size,lastModified:stat.mtimeMs,text:async()=>text}},
  async createWritable(){let text;return {async write(v){text=v},async close(){await fs.writeFile(p,text)}}}}},
 async *entries(){for(const e of await fs.readdir(dir,{withFileTypes:true}))yield [e.name,e.isDirectory()?handle(path.join(dir,e.name)):await this.getFileHandle(e.name)]}
}}
async function createReceiver(folder){
 // Refuse existing folders: cannot accidentally connect to or overwrite user music.
 await fs.mkdir(folder,{recursive:false});
 let project=P.capture(Object.keys(S.banks).map(name=>({...S.roles.initial('ambient',name),name,setup:'ambient',on:true,level:50,density:50,character:50,duration:50,space:30,pattern:[0,4,8,12]})),4,72,1,0,S,M);
 const api=Agent.create({project:P,song:Song,sounds:S,composition:C,read:()=>project,write:async p=>{project=p}});
 const bridge=B.createBridge(api,{pollInterval:0});await bridge.connect(handle(folder));
 return {api,bridge,state:()=>api.getProjectState(),dispose:()=>bridge.dispose()};
}
module.exports={createReceiver};
