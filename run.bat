@echo off
echo Stopping any currently running servers...
docker-compose down

echo.
echo Starting MongoDB silently in the background...
docker-compose up -d mongo

echo.
echo ================================================
echo 🚀 Web Application is spinning up!
echo 🔗 Frontend: http://localhost:5173
echo.
echo You will see live success/bug messages below.
echo Press Ctrl+C to stop the servers.
echo ================================================
echo.

docker-compose --ansi always up backend frontend
