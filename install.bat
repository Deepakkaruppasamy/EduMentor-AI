@echo off
echo ╔═══════════════════════════════════════════════╗
echo ║       EduMentor AI — Full Setup Script        ║
echo ╚═══════════════════════════════════════════════╝
echo.

echo [Step 1/4] Installing backend dependencies...
cd /d C:\Chatbot\backend
call npm install
if %errorlevel% neq 0 (echo Backend install failed && pause && exit /b 1)
echo ✅ Backend dependencies installed
echo.

echo [Step 2/4] Installing frontend dependencies...
cd /d C:\Chatbot\frontend
call npm install
if %errorlevel% neq 0 (echo Frontend install failed && pause && exit /b 1)
echo ✅ Frontend dependencies installed
echo.

echo [Step 3/4] Setting up backend environment...
cd /d C:\Chatbot\backend
if not exist .env (
  copy .env.example .env
  echo ✅ Created backend/.env from template
  echo ⚠️  IMPORTANT: Edit backend\.env and add your API keys!
) else (
  echo ℹ️  backend/.env already exists, skipping
)
echo.

echo [Step 4/4] Setting up frontend environment...
cd /d C:\Chatbot\frontend
if not exist .env (
  copy .env.example .env
  echo ✅ Created frontend/.env
) else (
  echo ℹ️  frontend/.env already exists, skipping
)

echo.
echo ╔═══════════════════════════════════════════════╗
echo ║               Setup Complete! 🎓              ║
echo ╚═══════════════════════════════════════════════╝
echo.
echo Next steps:
echo  1. Edit C:\Chatbot\backend\.env with your keys:
echo     - GROQ_API_KEY (get at console.groq.com)
echo     - MONGODB_URI  (get at mongodb.com/atlas)
echo     - HF_API_KEY   (get at huggingface.co/settings/tokens)
echo.
echo  2. Start ChromaDB: docker-compose up -d
echo.
echo  3. Start backend:  cd C:\Chatbot\backend ^&^& npm run dev
echo.
echo  4. Start frontend: cd C:\Chatbot\frontend ^&^& npm run dev
echo.
echo  5. Open http://localhost:5173 in your browser
echo.
pause
