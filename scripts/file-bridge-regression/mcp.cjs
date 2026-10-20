// Minimal stdio MCP adapter: model sees only generic relative-path file tools.
// It does not load HALO code, criteria, prior evaluation or another filesystem root.
const net=require('node:net'),readline=require('node:readline');
const pipe=process.argv[2];
const properties={path:{type:'string',description:'Path relative to the connected folder'}};
const tools=[
 {name:'list',description:'List the connected folder or its requests/responses directory.',inputSchema:{type:'object',properties,additionalProperties:false}},
 {name:'read',description:'Read one UTF-8 file in the connected folder.',inputSchema:{type:'object',properties,required:['path'],additionalProperties:false}},
 {name:'write',description:'Write a UTF-8 file in the existing requests directory.',inputSchema:{type:'object',properties:{...properties,content:{type:'string'}},required:['path','content'],additionalProperties:false}},
 {name:'wait',description:'Wait at most five seconds.',inputSchema:{type:'object',properties:{milliseconds:{type:'integer',minimum:1,maximum:5000}},required:['milliseconds'],additionalProperties:false}}
];
for(const tool of tools)tool.annotations={readOnlyHint:tool.name!=='write',destructiveHint:false,idempotentHint:true,openWorldHint:false};
function rpc(name,args){return new Promise((resolve,reject)=>{const s=net.connect(pipe),rl=readline.createInterface({input:s});s.on('connect',()=>s.write(JSON.stringify({name,args})+'\n'));s.on('error',reject);rl.once('line',line=>{s.end();const r=JSON.parse(line);r.error?reject(Error(r.error)):resolve(r.result)})})}
const input=readline.createInterface({input:process.stdin});
input.on('line',async line=>{let m;try{
 m=JSON.parse(line);if(m.id===undefined)return;let result;
 if(m.method==='initialize')result={protocolVersion:'2024-11-05',capabilities:{tools:{}},serverInfo:{name:'shared-folder',version:'1.0.0'}};
 else if(m.method==='tools/list')result={tools};
 else if(m.method==='tools/call'){try{const r=await rpc(m.params.name,m.params.arguments);result={content:[{type:'text',text:typeof r==='string'?r:JSON.stringify(r)}]}}catch(e){result={isError:true,content:[{type:'text',text:e.message}]}}}
 else if(m.method==='ping')result={};else throw Error('METHOD_NOT_FOUND');
 process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m.id,result})+'\n');
 }catch(e){process.stdout.write(JSON.stringify({jsonrpc:'2.0',id:m?.id??null,error:{code:-32601,message:e.message}})+'\n')}});
