$ErrorActionPreference = "Stop"
Set-Location frontend
if (-not (Test-Path "node_modules")) { npm install }
if (-not (Test-Path ".env")) { Copy-Item ".env.example" ".env" }
npm run dev
