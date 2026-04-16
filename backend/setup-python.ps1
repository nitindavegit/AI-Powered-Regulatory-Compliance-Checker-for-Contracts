$ErrorActionPreference = "Stop"

$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$appRoot = Resolve-Path (Join-Path $scriptDir "..")
$venvPath = Join-Path $appRoot ".venv"
$requirementsPath = Join-Path $appRoot "python-requirements.txt"

if (-not (Test-Path $requirementsPath)) {
    throw "Missing python-requirements.txt in $appRoot"
}

if (-not (Test-Path $venvPath)) {
    python -m venv $venvPath
}

$pythonExe = Join-Path $venvPath "Scripts\\python.exe"
& $pythonExe -m pip install --upgrade pip
& $pythonExe -m pip install -r $requirementsPath

Write-Host "Python environment is ready at $venvPath"
