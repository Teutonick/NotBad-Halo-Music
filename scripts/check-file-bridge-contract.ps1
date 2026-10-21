param([string]$PackageDirectory = (Join-Path $PSScriptRoot '../artifacts/file-bridge-v3-review'))

# Read-only syntax smoke check. Never launches a model or writes to a connected folder.
$ErrorActionPreference = 'Stop'
$haloCaps = Get-Content -LiteralPath (Join-Path $PackageDirectory 'capabilities.json') -Raw | ConvertFrom-Json -AsHashtable
$haloState = Get-Content -LiteralPath (Join-Path $PackageDirectory 'project-state.json') -Raw | ConvertFrom-Json -AsHashtable
$haloSchema = $haloCaps.requestSchema | ConvertTo-Json -Depth 100 -Compress
function Copy-HaloValue($Value) { $Value | ConvertTo-Json -Depth 100 -Compress | ConvertFrom-Json -AsHashtable }
function Test-HaloCase([string]$Name, $Value, [bool]$Expected) {
    $haloJson = $Value | ConvertTo-Json -Depth 100 -Compress
    $haloActual = Test-Json -Json $haloJson -Schema $haloSchema -ErrorAction SilentlyContinue
    if ($haloActual -ne $Expected) { throw "Schema mismatch: $Name; expected $Expected, observed $haloActual" }
    Write-Output "PASS $Name"
}
if (-not $haloState.scoreExport.complete) { throw 'Candidate score must be representable for this smoke check.' }
$haloPhrase = Copy-HaloValue $haloState.score
if ($haloPhrase.phrases) { throw 'This smoke fixture must be a single phrase.' }
Test-HaloCase 'normalized current phrase' $haloPhrase $true
$haloProbe = @{format='halo-score'; mode='probe'}
Test-HaloCase 'probe without musical metadata' $haloProbe $true
$haloPatch = @{format='halo-score'; mode='patch'; patches=@(@{voices=@{pulse=@{on=$false}}})}
Test-HaloCase 'parameter patch without score metadata' $haloPatch $true
$haloEdit = Copy-HaloValue $haloPhrase
$haloEdit.mode='edit'; $haloEdit.voices=@{melody=@{level=40}}
Test-HaloCase 'edit retaining live notes and timbre' $haloEdit $true
$haloSong = Copy-HaloValue $haloPhrase
$haloSong.Remove('voices') | Out-Null
$haloSong.phrases=@(@{id=1; voices=$haloPhrase.voices})
$haloSong.sections=@(@{phrase=1})
Test-HaloCase 'song without root voices' $haloSong $true
$haloSong.voices=$haloPhrase.voices
Test-HaloCase 'ambiguous song plus root voices' $haloSong $false
$haloProbe.status='ready'
Test-HaloCase 'fabricated receipt in a request' $haloProbe $false
$haloInvalid = Copy-HaloValue $haloPatch
$haloInvalid.patches[0].voices.pulse.notes=@(,@(0,60))
Test-HaloCase 'patch attempting to rewrite notes' $haloInvalid $false
$haloInvalid = Copy-HaloValue $haloPhrase
$haloInvalid.voices=@{melody=@{sound='bell'; notes=@(,@(0,128))}}
Test-HaloCase 'MIDI above hard bound' $haloInvalid $false
$haloInvalid.voices.melody.notes=@(,@(0,92))
Test-HaloCase 'MIDI outside acoustic register but inside input bound' $haloInvalid $true
$haloInvalid.voices.melody.steps=@(0)
Test-HaloCase 'mixed notes and steps' $haloInvalid $false
$haloInvalid = Copy-HaloValue $haloPhrase
$haloInvalid.meter='6/8'
Test-HaloCase 'unsupported meter' $haloInvalid $false
Write-Output '12 schema syntax checks passed. Live and musical semantics remain receiver checks.'
