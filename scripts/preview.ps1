param(
    [ValidateRange(1024, 65535)]
    [int]$Port = 8766
)

$ErrorActionPreference = 'Stop'
$projectRoot = Split-Path -Parent $PSScriptRoot
Write-Host "HALO preview: http://127.0.0.1:$Port/"
Write-Host 'Stop with Ctrl+C. This server listens only on this computer.'
python -m http.server $Port --bind 127.0.0.1 --directory $projectRoot
if ($LASTEXITCODE -ne 0) { throw "Preview server exited with code $LASTEXITCODE" }
