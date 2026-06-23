# Tarlac Truck Pitstop Management System - Docker Helper Commands
# These aliases automatically enforce color-coding and cleaner layouts.

# Colors for terminal output
CYAN=\033[0;36m
GREEN=\033[0;32m
NC=\033[0m # No Color

.PHONY: help build up down logs lazy frontend-logs backend-logs

help:
	@echo "${CYAN}Tarlac Truck Pitstop - Docker Commands${NC}"
	@echo "  make build         - Build images with clean linear logs and enforced colors"
	@echo "  make up            - Start all containers in the background"
	@echo "  make down          - Stop and remove all containers"
	@echo "  make logs          - Tail streaming logs of all containers (Color-coded)"
	@echo "  make frontend-logs - Tail streaming logs for ONLY the frontend"
	@echo "  make backend-logs  - Tail streaming logs for ONLY the backend"
	@echo "  make lazy          - Open Lazydocker for the ultimate interactive dashboard"

# Optimized Builds: Uses linear output to prevent spinner-spam and enforces BuildKit colors
build:
	@echo "${GREEN}Building Docker Images...${NC}"
	BUILDKIT_COLORS="run=green:info=cyan:error=red:warn=yellow" docker-compose build --progress=plain --parallel

# Run cluster with clean logs (Mongo in background, Web services attached)
up:
	@echo "${GREEN}Stopping any currently running servers...${NC}"
	docker-compose down
	@echo "${GREEN}Starting MongoDB silently in the background...${NC}"
	docker-compose up -d mongo
	@echo "\n${CYAN}================================================${NC}"
	@echo "${GREEN}🚀 Web Application is spinning up!${NC}"
	@echo "🔗 ${CYAN}Frontend:${NC} http://localhost:5173\n"
	@echo "You will see live success/bug messages below."
	@echo "Press Ctrl+C to stop the servers."
	@echo "${CYAN}================================================${NC}\n"
	docker-compose --ansi always up backend frontend

down:
	@echo "${GREEN}Stopping containers...${NC}"
	docker-compose down

# Color-coded interleved logs
logs:
	docker-compose --ansi always logs -f

frontend-logs:
	docker-compose --ansi always logs -f frontend

backend-logs:
	docker-compose --ansi always logs -f backend

# Interactive Terminal Dashboard
lazy:
	lazydocker
