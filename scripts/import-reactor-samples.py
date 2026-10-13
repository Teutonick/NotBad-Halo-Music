"""Import a pinned, allowlisted CC0 subset. Developer tool; never run by the app.

Requires Python 3, ffmpeg and (for the piano archive) 7-Zip. No runtime dependency.
Rights evidence and the planned inventory are written BEFORE audio inclusion.
"""
import array,base64,concurrent.futures,hashlib,json,pathlib,re,subprocess,urllib.parse,urllib.request,wave

ROOT=pathlib.Path(__file__).resolve().parents[1]
WORK=ROOT/'.sample-work'; OUT=ROOT/'assets'/'reactor'; RIGHTS=OUT/'rights'
FFMPEG=r'C:\ComfyUI\ffmpeg\ffmpeg.exe'
REPOS={
 'drums':('sfzinstruments/karoryfer.big-rusty-drums','f07ce00df34a46b6b08375be56fe116cf15782bc','LICENSE','Karoryfer Samples / D. Smolken','https://shop.karoryfer.com/pages/free-big-rusty-drums'),
 'direct':('freepats/electric-guitar-FSBS-direct','4c1d54601836c3e1a262b0bb0f3dea0c0a881ad3','LICENSE.txt','FreePats; recording performer not named in upstream README','https://freepats.zenvoid.org/ElectricGuitar/clean-electric-guitar.html'),
 'dist':('freepats/electric-guitar-FSBS-dist1','bbae17f0ad16f5edd7ec22178d181f3e3f6696fa','LICENSE.txt','FreePats; recording performer not named in upstream README','https://freepats.zenvoid.org/ElectricGuitar/distorted-electric-guitar.html'),
 'bass':('freepats/electric-bass-YR','8dcb7ea9116f417273ef8c030d15e7b3aa654301','LICENSE.txt','Andrea Biasior; FreePats adaptation','https://freepats.zenvoid.org/ElectricGuitar/clean-electric-bass.html'),
 'synth-arp':('freepats/synth-bass-lead','426f32da700c42a4071b5061ee3bb2fc92de0680','LICENSE.txt','Elf of Happy and Love; FreePats adaptation','https://freepats.zenvoid.org/Synthesizer/synth-lead.html'),
 'synth-cut':('freepats/synth-square','6d204b085af42f023770a3add2eeea9f9dbc5f14','LICENSE.txt','FreePats / Roberto; upstream README','https://freepats.zenvoid.org/Synthesizer/synth-lead.html')}
PIANO_URL='https://freepats.zenvoid.org/Piano/UprightPianoKW/UprightPianoKW-small-SFZ-20190703.7z'
PIANO_SHA256='ffb547fceb91eeb93d78cf8d220d1d5f726dcac891afc15e517805ac48abb39d'

def fetch(url):
 with urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'HALO-CC0-importer'}),timeout=60) as response:
  data=response.read(20*1024*1024+1)
  if len(data)>20*1024*1024:raise ValueError('Unexpectedly large upstream file')
  return data
def raw(repo,sha,path):return 'https://raw.githubusercontent.com/'+repo+'/'+sha+'/'+urllib.parse.quote(path,safe='/')
def text(key,path):
 repo,sha,*_=REPOS[key];local=WORK/(repo.split('/')[-1]+'--'+path)
 if local.exists():return local.read_bytes()
 return fetch(raw(repo,sha,path))
def regions(sfz):
 """Only extract note/sample metadata; do not execute or interpret SFZ code."""
 group={};result=[]
 for kind,content in re.findall(r'<(global|group|region)>([^<]*)',sfz):
  content=re.sub(r'//[^\n]*','',content)
  fields=dict(re.findall(r'(\w+)=([^\s]+)',content))
  if kind=='group':group=fields
  elif kind=='region' and 'sample' in fields:
   value={**group,**fields};root=int(value.get('pitch_keycenter',value.get('key',0)))
   result.append((root,value['sample'],int(value.get('lovel',0))))
 return result

def main():
 WORK.mkdir(exist_ok=True);OUT.mkdir(parents=True,exist_ok=True);RIGHTS.mkdir(exist_ok=True)
 sources={}
 for key,(repo,sha,license_file,author,page) in REPOS.items():
  if key=='drums':
   license_text=subprocess.check_output(['git','-C',str(WORK/'karoryfer.big-rusty-drums'),'show',sha+':LICENSE']) if (WORK/'karoryfer.big-rusty-drums').exists() else fetch(raw(repo,sha,license_file))
  else:license_text=text(key,license_file)
  if b'CC0' not in license_text:raise ValueError('Missing CC0 evidence: '+key)
  (RIGHTS/(key+'-CC0.txt')).write_bytes(license_text)
  sources[key]={'author':author,'sourceURL':page,'repository':'https://github.com/'+repo,'revision':sha,'rights':'CC0-1.0','rightsEvidence':raw(repo,sha,license_file),'localEvidence':'rights/'+key+'-CC0.txt'}
  if key!='drums':(RIGHTS/(key+'-README.txt')).write_bytes(text(key,'README.txt'))
 # The small piano archive explicitly dedicates its recordings to CC0 in readme.txt.
 archive=WORK/'piano.7z'
 if not archive.exists():archive.write_bytes(fetch(PIANO_URL))
 if hashlib.sha256(archive.read_bytes()).hexdigest()!=PIANO_SHA256:raise ValueError('Piano archive integrity mismatch')
 piano_folder=WORK/'piano'/'UprightPianoKW-small-SFZ-20190703'
 if not piano_folder.exists():subprocess.run([r'C:\Program Files\7-Zip\7z.exe','x',str(archive),'-o'+str(WORK/'piano'),'-y'],check=True,stdout=subprocess.DEVNULL)
 evidence=(piano_folder/'readme.txt').read_bytes()
 if b'CC0' not in evidence:raise ValueError('Missing piano CC0 evidence')
 (RIGHTS/'piano-README.txt').write_bytes(evidence)
 sources['piano']={'author':'Gonzalo and Roberto / FreePats; piano provided by Inma Martinez de Miguel','sourceURL':'https://freepats.zenvoid.org/Piano/acoustic-grand-piano.html','downloadURL':PIANO_URL,'archiveSHA256':hashlib.sha256(archive.read_bytes()).hexdigest(),'version':'2019-07-03 small','rights':'CC0-1.0','rightsEvidence':PIANO_URL+'#readme.txt','localEvidence':'rights/piano-README.txt'}
 selected=[]
 def add(key,bank,root,path,seconds,variant=0):
  if '..' in pathlib.PurePosixPath(path).parts:raise ValueError('Unsafe source path')
  pack='drums' if key=='drums' else 'guitars' if key in ['direct','dist'] else 'bass' if key=='bass' else 'keys'
  entry={'id':bank+'-'+str(root)+'-'+str(variant),'bank':bank,'root':root,'source':key,'originalFile':path,'localFile':pack+'.js','secondsCap':seconds}
  if key!='piano':entry['downloadURL']=raw(REPOS[key][0],REPOS[key][1],path)
  else:entry['downloadURL']=PIANO_URL+'#'+path
  selected.append(entry)
 drum_folder=WORK/'karoryfer.big-rusty-drums'
 if not drum_folder.exists():
  subprocess.run(['git','clone','--filter=blob:none','--no-checkout','https://github.com/'+REPOS['drums'][0]+'.git',str(drum_folder)],check=True)
 drum_paths=subprocess.check_output(['git','-C',str(drum_folder),'ls-tree','-r','--name-only',REPOS['drums'][1]],text=True).splitlines()
 drum_tree=[{'path':path} for path in drum_paths]
 drum_files=[e['path'] for e in drum_tree if e['path'].endswith('.flac')]
 drum_specs=[('kick-damped','kick_24/kick/kick',1.3),('kick-open','kick_24_nodamp/kick/kick',1.6),('snare-center','snare_14/center/top',1.5),('snare-edge','snare_14/edge/top',1.5),('snare-rim','snare_14/rimshot/top',1.5),('snare-layer','snare_14/tcenter/top',1.5),('hat-tight','hihat_14/cl/cl',.6),('hat-open','hihat_14/open/cl',1.5),('ride','ride_22/bl/cl',2.5),('crash','crash_17/cr/cl',3.5),('tom-floor','tom_18/center/cl',1.8),('tom-mid','tom_15/center/cl',1.5),('tom-high','tom_14/center/cl',1.3),('tom-war','tom_22/center/cl',2)]
 for bank,prefix,seconds in drum_specs:
  candidates=[p for p in drum_files if p.startswith('Samples/'+prefix+'/') and re.search(r'_rr[12]\.flac$',p)]
  layers=sorted(set(int(re.search(r'_vl(\d+)',p)[1]) for p in candidates));layer=layers[-2] if len(layers)>1 else layers[-1]
  chosen=sorted(p for p in candidates if '_vl'+str(layer)+'_' in p)
  for variant,path in enumerate(chosen):add('drums',bank,0,path,seconds,variant)
 for key,filename in [('direct','EGuitarFSBS-direct bridge 20220911.sfz'),('dist','EGuitarFSBS-dist1 bridge 20220911.sfz')]:
  data=regions(text(key,filename).decode());roots=[36,40,45,48,52,55,59,64,67,71,74,77,80,85]
  for root in roots:
   files=sorted(set(p for n,p,vel in data if n==root and '_soft_' not in p))
   for variant,path in enumerate(files[:2] if key=='direct' else files[:1]):add(key,'guitar-'+key,root,path,30,variant)
 for articulation,filename in [('pick','PickedBassYR 20190930.sfz'),('finger','FingerBassYR 20190930.sfz')]:
  for root,path,_ in regions(text('bass',filename).decode()):add('bass','bass-'+articulation,root,path,1.8)
 for root,path,_ in regions((piano_folder/'UprightPianoKW-small-20190703.sfz').read_text()):
  if 42<=root<=81:add('piano','piano',root,path,3)
 for key,filename in [('synth-arp','SynthBassLead 20200522.sfz'),('synth-cut','SynthSquare 20200512.sfz')]:
  for root,path,_ in regions(text(key,filename).decode()):
   if 40<=root<=80:add(key,key,root,path,1.8)
 manifest={'version':1,'date':'2026-10-13','rights':'CC0-1.0','processing':'mono 32 kHz 16-bit PCM WAV; highpass 20 Hz; leading silence bounded trim; peak normalized to 0.8; 20 ms tail fade; finite excerpts without upstream sustain loops','sources':sources,'samples':selected}
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 def convert(entry):
  cache=WORK/'raw';cache.mkdir(exist_ok=True)
  source=cache/(entry['id']+pathlib.Path(entry['originalFile']).suffix)
  if not source.exists():
   payload=(piano_folder/entry['originalFile']).read_bytes() if entry['source']=='piano' else fetch(entry['downloadURL'])
   if payload.startswith(b'version https://git-lfs'):raise ValueError('LFS pointer instead of sample: '+entry['id'])
   source.write_bytes(payload)
  entry['sourceSHA256']=hashlib.sha256(source.read_bytes()).hexdigest()
  target=WORK/(entry['id']+'.wav')
  subprocess.run([FFMPEG,'-v','error','-y','-i',str(source),'-t',str(entry['secondsCap']+.12),'-ac','1','-ar','32000','-af','highpass=f=20','-c:a','pcm_s16le',str(target)],check=True)
  with wave.open(str(target)) as reader:pcm=array.array('h',reader.readframes(reader.getnframes()))
  threshold=max(12,int(max(map(abs,pcm))*.001));start=next((i for i,v in enumerate(pcm[:3840]) if abs(v)>threshold),0)
  pcm=pcm[start:start+int(32000*entry['secondsCap'])];peak=max(map(abs,pcm))
  if peak==0:raise ValueError('Silent source: '+entry['id'])
  scale=.8*32767/peak
  for i in range(len(pcm)):
   fade=min(1,(len(pcm)-1-i)/640);pcm[i]=int(pcm[i]*scale*fade)
  with wave.open(str(target),'wb') as writer:writer.setnchannels(1);writer.setsampwidth(2);writer.setframerate(32000);writer.writeframes(pcm.tobytes())
  payload=target.read_bytes();entry['wavSHA256']=hashlib.sha256(payload).hexdigest();entry['bytes']=len(payload);entry['duration']=len(pcm)/32000;entry['trimStartSeconds']=start/32000
  return entry['id'],{'root':entry['root'],'data':base64.b64encode(payload).decode()}
 with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:converted=dict(pool.map(convert,selected))
 for pack in ['drums','bass','guitars','keys']:
  banks={}
  for entry in selected:
   if entry['localFile']==pack+'.js':banks.setdefault(entry['bank'],[]).append(converted[entry['id']])
  payload='/* CC0 recordings; provenance: manifest.json and rights/. */\nHaloSamples.register('+json.dumps(pack)+','+json.dumps(banks,separators=(',',':'))+');\n'
  (OUT/(pack+'.js')).write_text(payload,encoding='ascii')
 manifest['totalWavBytes']=sum(e['bytes'] for e in selected);manifest['totalPackBytes']=sum((OUT/(p+'.js')).stat().st_size for p in ['drums','bass','guitars','keys'])
 (OUT/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'samples':len(selected),'wavMiB':manifest['totalWavBytes']/1048576,'packMiB':manifest['totalPackBytes']/1048576}))

if __name__=='__main__':main()
