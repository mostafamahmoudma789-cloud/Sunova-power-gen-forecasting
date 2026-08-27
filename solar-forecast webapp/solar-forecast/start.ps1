# ==========================================================
# Launch Complete Sunova Solar Power Forecasting System
# ==========================================================
Write-Host "==========================================================" -ForegroundColor Yellow
Write-Host "  Starting Sunova Solar Power Forecasting System" -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Yellow

$Root = "C:\Users\Administrator\Desktop\grad project\solar-forecast webapp\solar-forecast"
$FrontendDir = "$Root\frontend"
$BackendDir  = "$Root\backend"
$ModelApiDir = "C:\Users\Administrator\Desktop\grad project\the lstm model api\solar_api\solar_api"
$PythonExe   = "$BackendDir\venv\Scripts\python.exe"

# 1. Model API (Port 8000)
Write-Host "1/3 Starting LSTM Model API (Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $ModelApiDir -ArgumentList "-NoExit", "-Command", "& '$PythonExe' -m uvicorn app:app --host 127.0.0.1 --port 8000 --reload"

# 2. Backend Proxy (Port 8001)
Write-Host "2/3 Starting Weather & pvlib Backend Proxy (Port 8001)..." -ForegroundColor Cyan
Start-Process powershell -WorkingDirectory $BackendDir -ArgumentList "-NoExit", "-Command", "& '$PythonExe' -m uvicorn main:app --host 127.0.0.1 --port 8001 --reload"

# 3. React Frontend Dev Server (Port 5173)
Write-Host "3/3 Starting React Frontend (Port 5173)..." -ForegroundColor Cyan
Start-Process cmd.exe -WorkingDirectory $FrontendDir -ArgumentList "/k", "npm run dev"

Write-Host "`n[+] LSTM Model API:    http://127.0.0.1:8000" -ForegroundColor Green
Write-Host "[+] Backend Proxy:     http://127.0.0.1:8001" -ForegroundColor Green
Write-Host "[+] React Webapp:      http://localhost:5173/Sunova-project/" -ForegroundColor Green
Write-Host "`nAll 3 services launched in separate windows!" -ForegroundColor Yellow