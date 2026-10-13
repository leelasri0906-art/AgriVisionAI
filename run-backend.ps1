$ErrorActionPreference = "Stop"
if (-not (Test-Path ".venv\Scripts\Activate.ps1")) {
  py -3.11 -m venv .venv
}
. .\.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
pip install -r backend/requirements.txt
if (-not (Test-Path "backend\.env")) { Copy-Item "backend\.env.example" "backend\.env" }
uvicorn backend.app.main:app --reload
