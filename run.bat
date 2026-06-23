@echo off
echo Starting MongoDB silently in the background...
docker-compose up -d mongo

echo.
echo ================================================
echo 🚀 Web Application is spinning up!
echo You will see live success/bug messages and links below.
echo Press Ctrl+C to stop the servers.
echo ================================================
echo.

docker-compose --ansi always up backend frontend
