# Run ER Gemma Vision local environment
Write-Host "Starting Backend Service on Port 8000..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "python" -ArgumentList "-m uvicorn main:app --reload" -WorkingDirectory "..\apps\web\backend"

Write-Host "Waiting 3 seconds..." -ForegroundColor Yellow
Start-Sleep -Seconds 3

Write-Host "Starting Frontend Vite App on Port 5173..." -ForegroundColor Cyan
Start-Process -NoNewWindow -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "..\apps\web\frontend"

Write-Host "Both services have been signaled to start." -ForegroundColor Green
