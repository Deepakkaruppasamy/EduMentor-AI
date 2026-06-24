@echo off
echo Starting EduMentor AI...
echo.

echo Starting ChromaDB (Docker required)...
docker-compose up -d
echo.

echo Starting Backend...
start "EduMentor Backend" cmd /k "cd /d C:\Chatbot\backend && npm run dev"
timeout /t 3 /nobreak >nul

echo Starting Frontend...
start "EduMentor Frontend" cmd /k "cd /d C:\Chatbot\frontend && npm run dev"

echo.
echo ✅ All services started!
echo    Backend:  http://localhost:5000
echo    Frontend: http://localhost:5173
echo.
timeout /t 5 /nobreak >nul
start http://localhost:5173
