"""Pinned CC0 FreePats Hang subset. Maintainer-only, no runtime tools required."""
import pathlib,urllib.request,urllib.parse,json,hashlib,subprocess,wave,io,array,base64
ROOT=pathlib.Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/water';WORK=ROOT/'.sample-work/water-handpan'
SHA='fdeca2ec981ab374607f250bccb1452b531ac13a'
BASE='https://raw.githubusercontent.com/freepats/hang-D-minor/'+SHA+'/'
FFMPEG=r'C:\ComfyUI\ffmpeg\ffmpeg.exe'
def fetch(name):
 with urllib.request.urlopen(urllib.request.Request(BASE+urllib.parse.quote(name),headers={'User-Agent':'HALO-CC0-importer'}),timeout=60) as r:
  data=r.read(3*1024*1024)
  return data
WORK.mkdir(parents=True,exist_ok=True);(OUT/'rights').mkdir(exist_ok=True)
license=fetch('LICENSE.txt');readme=fetch('README.txt')
if b'CC0' not in license or b'CC0' not in readme:raise ValueError('Unverified CC0')
(OUT/'rights/handpan-CC0.txt').write_bytes(license);(OUT/'rights/handpan-README.txt').write_bytes(readme)
roots={'A3':57,'D4':62,'E4':64,'F4':65,'G4':67,'A4':69,'Bb4':70,'C5':72,'D5':74}
entries=[dict(id=f'water-handpan-{root}-{take-1}',bank='water-handpan',root=root,sourceFile=f'samples/{note}_{take:02d}.flac',localFile='handpan.js') for note,root in roots.items() for take in (1,2)]
manifest=dict(version=1,date='2026-10-25',rights='CC0-1.0',author='Mar (performance); Gonzalo and Roberto (recording); Roberto / FreePats (editing)',sourceURL='https://freepats.zenvoid.org/ChromaticPercussion/hang.html',repository='https://github.com/freepats/hang-D-minor',revision=SHA,rightsEvidence=BASE+'LICENSE.txt',localEvidence='rights/handpan-CC0.txt',processing='Original recorded strikes; mono 32 kHz PCM16; highpass 25 Hz; at most 3.4 seconds; peak 0.8 and 20 ms tail fade; no synthetic resynthesis',samples=entries,status='planned')
def save():(OUT/'handpan-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
save() # Evidence and exact inventory precede inclusion of audio.
regions=[]
for e in entries:
 raw=fetch(e['sourceFile']);local=WORK/pathlib.Path(e['sourceFile']).name;local.write_bytes(raw)
 result=subprocess.run([FFMPEG,'-v','error','-i',str(local),'-t','3.4','-ac','1','-ar','32000','-af','highpass=f=25','-f','wav','pipe:1'],capture_output=True,check=True)
 with wave.open(io.BytesIO(result.stdout)) as w:samples=array.array('h',w.readframes(w.getnframes()))
 peak=max(abs(v) for v in samples);gain=.8*32767/max(1,peak);count=len(samples);fade=min(640,count)
 for i,v in enumerate(samples):samples[i]=round(v*gain*min(1,(count-1-i)/fade))
 output=io.BytesIO()
 with wave.open(output,'wb') as w:w.setnchannels(1);w.setsampwidth(2);w.setframerate(32000);w.writeframes(samples.tobytes())
 wav=output.getvalue();regions.append(dict(root=e['root'],data=base64.b64encode(wav).decode()))
 e.update(sourceURL=BASE+urllib.parse.quote(e['sourceFile']),sourceSHA256=hashlib.sha256(raw).hexdigest(),wavSHA256=hashlib.sha256(wav).hexdigest(),bytes=len(wav),duration=count/32000)
(OUT/'handpan.js').write_text('/* Original FreePats CC0 recordings; see handpan-manifest.json and rights/. */\nHaloSamples.register("handpan",'+json.dumps({'water-handpan':regions},separators=(',',':'))+');\n')
manifest.update(status='included',totalPackBytes=(OUT/'handpan.js').stat().st_size);save()
p=ROOT/'src/sample-catalog.js';text=p.read_text();start=text.index('const catalog=')+len('const catalog=');catalog=json.JSONDecoder().raw_decode(text[start:].lstrip())[0];catalog=[r for r in catalog if r['bank']!='water-handpan']
catalog.extend({k:e[k] for k in ['id','bank','root','duration','localFile']} for e in entries)
p.write_text('/* Local CC0 sample metadata, no PCM. See asset manifests. */\n(function(root){const catalog='+json.dumps(catalog,separators=(',',':'))+';\nif(typeof module!=="undefined"&&module.exports)module.exports=catalog;else root.HaloSampleCatalog=catalog;})(globalThis);\n')
print('Imported',len(entries),'recorded strikes;',manifest['totalPackBytes'],'bytes')
