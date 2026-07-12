@echo off
echo 🛑 Stopping any currently running servers...
docker-compose down


echo.
echo 🚀 Web Application is spinning up!
echo 🔗 Frontend: http://localhost:5173
echo.
echo 🟢 Live success/bug messages below...
echo ⏹️  Press Ctrl+C to stop the servers at any time.
echo.

docker-compose --ansi always up backend frontend
